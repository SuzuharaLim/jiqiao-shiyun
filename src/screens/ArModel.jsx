import { useEffect, useRef, useState } from 'react'
import { TopBar, Link } from '../components/ui.jsx'
import { cardBySlug, objectForHotspot } from '../data/arCards.js'
import { useNav, scrollIntoContainer } from '../store/nav.jsx'
import SpeakButton from '../components/SpeakButton.jsx'
// 小挑戰與卡片頁共用同一支元件——同一段動線不該有兩套實作
import ArQuiz from '../components/ArQuiz.jsx'
// 跟角色說話：點選提問 → 角色回答並開口（腳本化，理由見該檔檔頭）
import ArTalk from '../components/ArTalk.jsx'

// ============================================================================
// `/ar/model/:slug` —— 掃到卡片之後跳來的 **A-Frame 模型頁**
//
// 動線：`/AR` 用 MindAR 認出卡片 → **跳轉到這裡** → A-Frame 全螢幕展示 3D 角色。
//
// ★ 為什麼是「掃到就跳轉」而不是把角色貼在卡片上：
//   貼在卡片上需要**持續追蹤**，而追蹤一斷內容就消失——使用者得一直維持
//   手、卡片、光線三者都對。認出來之後就跳走的話，辨識只需要成功**一次**，
//   之後看模型不再依賴相機，可以放下卡片、雙手轉動觀察。
//
// ⚠️⚠️ **A-Frame 自己帶一份 three（super-three 0.184），與本專案的 three 0.185
//    是兩份不同的副本。** 這一頁的角色是用**本專案的 three** 建的，再交給
//    A-Frame 的算繪器畫出來——跨副本。
//    這件事之所以可行，是因為 three 的算繪器判斷型別用的是 `isMesh`／
//    `isBufferGeometry`／`isMaterial` 這一類**布林旗標**（duck typing），
//    而不是 `instanceof`。那些旗標存在的理由正是為了讓這種情境能運作。
//    ⚠️ 但這是**實測確認**的，不是照文件推的——見 `scripts/check-aframe.mjs`
//       與本檔底下的 `MOUNT_KEY` 註解。升級 A-Frame 或 three 之後要重驗：
//       失效方式是**模型不出現而沒有任何錯誤訊息**。
// ============================================================================

/**
 * A-Frame 元件只能註冊一次（重複註冊會 throw）。
 * ⚠️ React 的 StrictMode 與 SPA 反覆進出這一頁都會讓 effect 跑很多次，
 *    所以一定要有這個旗標，否則第二次進來整頁就掛了。
 */
let registered = false

/**
 * ★★★ A-Frame 走**自帶的預編譯檔**（`public/vendor/`），不從 npm 安裝。
 *
 * ⚠️ 這不是偏好，是**部署會失敗**：`aframe` 的相依裡有一個 **git 來源**套件
 *      "three-bmfont-text": "github:dmarcos/three-bmfont-text#c3eec235…"
 *    而 GCP 的建置環境禁止 git 來源（`npm error code EALLOWGIT：Fetching
 *    packages of type "git" have been disabled`）⇒ `npm ci` 直接失敗 ⇒
 *    **整個服務部署不上去**。2026-08-11 實際炸過一次。
 *    自帶預編譯檔之後 `package.json` 完全沒有 aframe，任何環境都不會再解析它。
 *
 * ⚠️ 順帶好處：這一份是**自足的 UMD bundle**（含它自己的 super-three），
 *    不進 Vite 的模組圖 ⇒ 主 bundle 一個位元組都不受影響。
 * ⚠️ 檔名帶版號：升級時換檔名，瀏覽器與 CDN 的舊快取自然失效。
 *    升級之後**一定要重驗跨副本算繪**（見檔頭），失效方式是靜默的。
 * ⚠️ 同源載入，所以 CSP `script-src 'self'` 本來就允許——不需要放寬任何設定。
 */
const AFRAME_SRC = '/vendor/aframe-1.8.0.min.js'

function loadAframeScript() {
  return new Promise((resolve, reject) => {
    if (window.AFRAME) { resolve(window.AFRAME); return }
    // 已經有人在載了就共用同一個 <script>，不要重複插入
    let el = document.querySelector(`script[src="${AFRAME_SRC}"]`)
    if (!el) {
      el = document.createElement('script')
      el.src = AFRAME_SRC
      el.async = true
      document.head.appendChild(el)
    }
    el.addEventListener('load', () => {
      // ⚠️ load 事件不代表 window.AFRAME 一定就緒（檔案有可能是被代理改寫過的
      //    HTML＝SPA fallback 回的 index.html，那也會觸發 load）。要實際檢查。
      window.AFRAME ? resolve(window.AFRAME) : reject(new Error('A-Frame 載入了但沒有註冊 window.AFRAME'))
    }, { once: true })
    el.addEventListener('error', () => reject(new Error(`載不到 ${AFRAME_SRC}`)), { once: true })
  })
}

async function ensureAframe() {
  if (typeof window === 'undefined') return null
  const AFRAME = await loadAframeScript()
  if (!AFRAME) throw new Error('A-Frame 載入失敗')

  if (!registered) {
    registered = true

    // ── 角色元件：把本專案 three 建出來的模型掛進 A-Frame 的場景圖 ──
    AFRAME.registerComponent('jq-character', {
      // ⚠️ lod 0.85 與 ProduceStage 同一個值：全解析度是 230,310 個三角形，
      //    超出策畫書 §6.1 的 180k 預算，而實測畫面看不出差別（0.85 ＝ 170,456）。
      //    這一頁雖然沒有相機／追蹤在搶 GPU，102 個 draw call 在中階手機仍然不輕。
      schema: { lod: { default: 0.85 }, outline: { default: 2 } },
      async init() {
        const [{ buildCharacter, NAPA_CABBAGE }, { createActor }] = await Promise.all([
          import('../lib/char/factory.js'),
          import('../lib/char/actor.js'),
        ])
        if (this.disposed) return
        const char = buildCharacter(NAPA_CABBAGE, {
          lod: this.data.lod, outlineLayers: this.data.outline,
        })
        this.char = char
        // ★★★ **一定要用 `el.object3D.add()`，不可以用 `el.setObject3D()`。**
        //
        // A-Frame 的 `setObject3D` 第一件事就是
        //     if (!(obj instanceof THREE.Object3D)) throw ...
        // 而那個 `THREE` 是 **A-Frame 自己的 super-three**。我們的角色是用本專案
        // 的 three 建的，跨副本的 `instanceof` **必定為 false** ⇒ 直接拋
        //   「`Entity.setObject3D` was called with an object that was not an
        //     instance of THREE.Object3D.」
        // （這是實測拿到的錯誤，不是推論。）
        //
        // ⚠️ 繞過那個檢查是安全的：真正在畫東西的 `WebGLRenderer` 判斷型別用的是
        //    `isMesh`／`isBufferGeometry`／`isMaterial` 這一類**布林旗標**
        //    （three 就是為了跨副本互通才設計成這樣），不是 `instanceof`。
        //    也就是說 A-Frame 擋的是它自己的 API 契約，不是算繪能力。
        // ⚠️ 代價：這個物件不在 A-Frame 的 object3DMap 裡，所以 `removeObject3D`
        //    找不到它——卸載要自己 `remove()`（見下方 remove()）。
        //    我們沒有用到 A-Frame 的 raycaster／animation 系統，所以沒有其他影響。
        this.el.object3D.add(char.root)

        // ★★★ 量出實際尺寸，並把**包圍盒中心對到 rig 的旋轉原點**。
        //
        // ⚠️ 原本是寫死 `position="0 -0.55 0"`（那個數字是從 AR 舞台搬來的，
        //    在那裡角色是「站在卡片平面上」）。放到這一頁就變成整個模型沉在
        //    畫面下半部——實測**上方留白 52.6%、下緣被裁掉**，而且自轉是繞著
        //    重心以外的一點轉，看起來會晃。
        // ⚠️ 中心對到旋轉原點還有第二個好處：自轉與俯仰都繞著重心，
        //    框景才不會隨著使用者拖動而飄移。
        const THREE = AFRAME.THREE
        char.root.updateWorldMatrix(true, true)
        const box = new THREE.Box3().setFromObject(char.root)
        const c = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        char.root.position.sub(c)

        // 交給相機去算距離。這裡只回報**與旋轉無關**的兩個尺寸：
        //   radiusXZ：繞 Y 自轉時的水平上界（與 yaw 無關）
        //   halfHeight：半高（俯仰的影響由相機那邊用最大俯仰角算）
        this.el.sceneEl.emit('jq-character-ready', {
          halfHeight: size.y / 2,
          radiusXZ: Math.hypot(size.x / 2, size.z / 2),
        }, false)

        this.actor = createActor(char, {
          action: 'present',
          reduceMotion: matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        })
        this.last = performance.now()
        // ★ 把 actor 交給 React：對話面板要能驅動它（換動作、開說話疊加通道）。
        //   ⚠️ 走事件不走「把它掛在 window 上」——後者在同頁有兩隻角色時會互相蓋掉，
        //      而且卸載後那個參考還活著（actor 內部抓著整棵 three 場景）。
        this.el.sceneEl.emit('jq-actor-ready', { actor: this.actor }, false)
      },
      tick(t) {
        if (!this.actor) return
        // 分頁回前景時不讓動作一次跳好幾秒
        this.actor.update(Math.min(t - this.last, 100))
        this.last = t
      },
      remove() {
        this.disposed = true
        // ⚠️ 一定要通知：React 那邊留著已卸載角色的 actor 的話，
        //    使用者離開再回來時對話面板會對著一棵已經 dispose 的場景下指令。
        try { this.el.sceneEl.emit('jq-actor-ready', { actor: null }, false) } catch { /* ignore */ }
        // ⚠️ 對應上面的 `object3D.add()`：A-Frame 的 removeObject3D 找不到它
        //    （它不在 object3DMap 裡），一定要自己移除，否則反覆進出這一頁
        //    會一直往場景裡疊角色。
        try { if (this.char) this.el.object3D.remove(this.char.root) } catch { /* ignore */ }
        try { this.char?.dispose?.() } catch { /* ignore */ }
      },
    })

    // ── 相機自動框景 ──
    //
    // ★★★ 為什麼不能寫死相機位置：three 的 `fov` 是**垂直**視角，所以
    //   **水平**能看到多少完全取決於畫布長寬比。手機直立時 `.armodel-stage`
    //   是 411×551（0.75），桌機是 680×560（1.21）——同一組數字在兩邊差很多。
    //   寫死一組就等於「在我這台看起來剛好」，換一台就爆版或縮成一小球。
    //   ⚠️ 這與 `stage.js` 的裁切修正是同一類問題：**畫面比例是輸入，不是常數。**
    AFRAME.registerComponent('jq-fit', {
      // margin：留白倍率。1.0 ＝ 剛好貼邊（自轉到某個角度就會擦到邊）。
      // maxPitch：與 jq-drag-rotate 的夾角上限一致。
      // ⚠️ fov 要與 ProduceStage／demo 一致（44）。描邊 shader 的位移量投影後
      //    ∝ 焦距 ∝ 1/tan(fov/2)**與距離無關**，所以 fov 40 會讓這一頁的描邊
      //    比卡片頁粗 11%——同一隻角色兩頁看起來線條不一樣粗。
      schema: { margin: { default: 1.1 }, maxPitch: { default: 35 } },
      init() {
        this.metrics = null
        this.onReady = (e) => { this.metrics = e.detail; this.fit() }
        this.onResize = () => this.fit()
        const sc = this.el.sceneEl
        sc.addEventListener('jq-character-ready', this.onReady)
        // A-Frame 自己在視窗 resize 時會發這個事件（相機的 aspect 已經更新過了）
        sc.addEventListener('rendererresize', this.onResize)
      },
      fit() {
        const m = this.metrics
        const cam = this.el.getObject3D('camera')
        if (!m || !cam) return
        const tanV = Math.tan((cam.fov * Math.PI) / 360)
        const tanH = tanV * (cam.aspect || 1)
        // ⚠️ 俯仰會讓縱向輪廓變高。這裡用**最大俯仰角**當靜態上界，
        //    而不是用當下的角度——否則使用者一拖動，框景就會忽大忽小。
        const p = (this.data.maxPitch * Math.PI) / 180
        const needV = m.halfHeight * Math.cos(p) + m.radiusXZ * Math.sin(p)
        const needH = m.radiusXZ
        const d = Math.max(needV / tanV, needH / tanH) * this.data.margin
        // ⚠️ 用 setAttribute 不要直接改 object3D.position：position 元件會在
        //    屬性變動時把 object3D 寫回去，直接改會被默默蓋掉。
        // 模型重心已經被移到原點，相機擺在 +z 看向 -z（預設朝向）就正對它，
        // 不需要 lookAt——那反而會與 A-Frame 的 rotation 元件打架。
        this.el.setAttribute('position', { x: 0, y: 0, z: d })
      },
      remove() {
        const sc = this.el.sceneEl
        sc.removeEventListener('jq-character-ready', this.onReady)
        sc.removeEventListener('rendererresize', this.onResize)
      },
    })

    // ── 拖曳轉動 ──
    // ⚠️ A-Frame 內建沒有 orbit-controls（那是社群元件）。這一頁是「看模型」
    //    不是「在場景裡走動」，所以 look-controls／wasd-controls 都不對：
    //    前者會讓相機跟著手機陀螺儀轉（放在桌上看模型時畫面會自己飄），
    //    後者在手機上根本沒有鍵盤。自己寫 20 行轉模型最單純。
    AFRAME.registerComponent('jq-drag-rotate', {
      schema: { speed: { default: 0.4 }, spin: { default: 6 } },
      init() {
        this.dragging = false
        this.lastX = 0; this.lastY = 0
        this.yaw = 0; this.pitch = 0
        this.auto = true
        const el = this.el.sceneEl
        this.onDown = (e) => {
          const p = e.touches?.[0] ?? e
          this.dragging = true; this.auto = false
          this.lastX = p.clientX; this.lastY = p.clientY
        }
        this.onMove = (e) => {
          if (!this.dragging) return
          const p = e.touches?.[0] ?? e
          this.yaw += (p.clientX - this.lastX) * this.data.speed
          // ⚠️ 上下角度要夾住：不夾的話可以轉到模型底下再翻過去，
          //    使用者會迷失方向而且看到穿模的內裡。
          this.pitch = Math.max(-35, Math.min(35, this.pitch - (p.clientY - this.lastY) * this.data.speed))
          this.lastX = p.clientX; this.lastY = p.clientY
        }
        this.onUp = () => { this.dragging = false }
        const c = el.canvas ?? el
        for (const [n, f] of [['mousedown', this.onDown], ['touchstart', this.onDown]]) c.addEventListener(n, f, { passive: true })
        for (const [n, f] of [['mousemove', this.onMove], ['touchmove', this.onMove]]) window.addEventListener(n, f, { passive: true })
        for (const [n, f] of [['mouseup', this.onUp], ['touchend', this.onUp], ['touchcancel', this.onUp]]) window.addEventListener(n, f, { passive: true })
        this._c = c
      },
      tick(t, dt) {
        // 沒人碰的時候慢慢自轉——靜止的 3D 看起來像一張圖片，轉起來才讀得出立體
        if (this.auto) this.yaw += (this.data.spin * (dt || 16)) / 1000
        this.el.object3D.rotation.set(
          (this.pitch * Math.PI) / 180,
          (this.yaw * Math.PI) / 180,
          0,
        )
      },
      remove() {
        for (const [n, f] of [['mousedown', this.onDown], ['touchstart', this.onDown]]) this._c?.removeEventListener(n, f)
        for (const [n, f] of [['mousemove', this.onMove], ['touchmove', this.onMove]]) window.removeEventListener(n, f)
        for (const [n, f] of [['mouseup', this.onUp], ['touchend', this.onUp], ['touchcancel', this.onUp]]) window.removeEventListener(n, f)
      },
    })
  }
  return AFRAME
}

export default function ArModel({ slug, hotspot }) {
  const { user } = useNav()
  const card = cardBySlug(slug) || null
  const hostRef = useRef(null)
  // 對話面板用它驅動角色（換動作、開／關說話疊加通道）
  const actorRef = useRef(null)
  const quizRef = useRef(null)
  const [phase, setPhase] = useState('loading')   // loading | ready | failed
  const [err, setErr] = useState(null)

  // 掃描時瞄到的熱區（有的話），沒有就用 primary
  const spot = card?.hotspots?.find(h => h.id === hotspot)
    ?? card?.hotspots?.find(h => h.primary)
    ?? card?.hotspots?.[0] ?? null
  const obj = spot ? objectForHotspot(spot) : null

  useEffect(() => {
    let cancelled = false
    let scene = null
    let ro = null
    let onActor = null
    ;(async () => {
      try {
        await ensureAframe()
        if (cancelled || !hostRef.current) return
        // ⚠️ 用 innerHTML 建 <a-scene>：A-Frame 是**自訂元素**，靠 DOM 掛載時
        //    的 connectedCallback 初始化。交給 React 渲染的話，React 的
        //    重新調度會與 A-Frame 自己的生命週期打架（實測會出現
        //    「場景初始化到一半被卸載」而留下一個黑畫面）。
        //    這一塊 DOM 由我們自己管，React 只負責那個容器。
        scene = document.createElement('a-scene')
        scene.setAttribute('embedded', '')
        // ★★★ A-Frame 1.8 這個元件叫 **`xr-mode-ui`**，不是 `vr-mode-ui`。
        //   舊名字在 1.8 裡**根本不存在**，所以 `vr-mode-ui="enabled: false"`
        //   會被**靜默忽略**——實測使用者的 Android Chrome 上就冒出一顆「VR」
        //   按鈕（桌機因為偵測不到 XR 裝置而自動隱藏，所以本機完全看不出來）。
        //   ⚠️ A-Frame 對不認識的元件不會警告，這一類錯誤只會在支援 WebXR 的
        //      裝置上現形。`check-ar.mjs` 已鎖「自帶的那份 A-Frame 有這個元件」。
        scene.setAttribute('xr-mode-ui', 'enabled: false')
        scene.setAttribute('device-orientation-permission-ui', 'enabled: false')
        // ⚠️ `antialias`／`colorManagement`／**`toneMapping`** 都要明講。
        //    A-Frame 1.8 的 renderer 預設**不做 tone mapping**，而主光 2.15 ＋
        //    半球 1.45 打在 #FFFDF0 的葉柄上會超過 1.0 被直接裁掉 ⇒ 受光面削平
        //    成純白、皺褶與圓肋的層次全部消失。先前這一頁漏了，於是同一隻白菜在
        //    `/ar/card/:slug`（有 Neutral）與這裡看起來是兩種材質。
        scene.setAttribute('renderer',
          'colorManagement: true; antialias: true; alpha: true; toneMapping: neutral; exposure: 1.00')
        scene.setAttribute('background', 'transparent: true')
        // ★★★ 四盞燈逐項對齊 demo `_6:62-65`（先前四盞全部漂掉，見 ProduceStage 的註解）
        scene.innerHTML = `
          <a-entity light="type: hemisphere; color: #FFFDF0; groundColor: #AFC3DE; intensity: 1.45"></a-entity>
          <a-entity light="type: directional; color: #FFFDF4; intensity: 2.15" position="-2.4 3.4 3.6"></a-entity>
          <a-entity light="type: directional; color: #DDE9FF; intensity: 0.55" position="3.4 1.0 1.6"></a-entity>
          <a-entity light="type: directional; color: #EEFFD2; intensity: 0.70" position="1.6 2.6 -3.2"></a-entity>
          <a-entity id="jq-rig" jq-drag-rotate>
            <a-entity jq-character="lod: 0.85; outline: 2"></a-entity>
          </a-entity>
          <a-entity camera="fov: 44" jq-fit look-controls="enabled: false" wasd-controls="enabled: false"></a-entity>
        `
        // ⚠️ 監聽要在 appendChild **之前**掛：A-Frame 的元件在 DOM 掛載時就會
        //    初始化，晚一步掛就收不到第一次的 jq-actor-ready。
        onActor = (e) => { actorRef.current = e.detail?.actor ?? null }
        scene.addEventListener('jq-actor-ready', onActor)
        hostRef.current.appendChild(scene)
        const done = () => { if (!cancelled) setPhase('ready') }
        if (scene.hasLoaded) done()
        else scene.addEventListener('loaded', done, { once: true })

        // ★★ 盯**容器**的大小，不能只靠 A-Frame 監聽 window 的 resize。
        //
        // ⚠️ 容器變大變小不一定伴隨 window resize：手機捲動時網址列收合會改變
        //    dvh、上方內容載入把版面推開、轉向……而 `<a-scene embedded>` 只在
        //    window resize 時重算畫布 ⇒ 畫布會停在舊尺寸，模型被拉扁或只畫在
        //    一角。這與 `src/ar/stage.js` 用 ResizeObserver 是同一個理由。
        // ⚠️ `sceneEl.resize()` 會一併更新相機 aspect 並發出 `rendererresize`，
        //    所以 `jq-fit` 也會跟著重新框景。
        if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
          ro = new ResizeObserver(() => { try { scene?.resize?.() } catch { /* 場景還沒好 */ } })
          ro.observe(hostRef.current)
        }
      } catch (e) {
        console.error('[AR] A-Frame 場景建立失敗', e)
        if (!cancelled) { setErr(e?.message || String(e)); setPhase('failed') }
      }
    })()
    return () => {
      cancelled = true
      try { ro?.disconnect() } catch { /* ignore */ }
      try { if (onActor) scene?.removeEventListener('jq-actor-ready', onActor) } catch { /* ignore */ }
      actorRef.current = null
      // ⚠️ 一定要呼叫 A-Frame 自己的清理：`scene.remove()` 只是把節點拿掉，
      //    算繪迴圈與 WebGL context 還在跑。行動裝置的 context 數有上限，
      //    反覆進出這一頁的症狀會是「第 N 次打開變成空白」。
      try { scene?.parentNode?.removeChild(scene) } catch { /* ignore */ }
      try { scene?.renderer?.dispose?.(); scene?.renderer?.forceContextLoss?.() } catch { /* ignore */ }
    }
  }, [slug])

  if (!card) {
    return (
      <>
        <TopBar title="節氣模型" onBack />
        <div className="body">
          <div className="empty"><p>找不到這張卡片。</p></div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title={`${card.title}｜3D 模型`} onBack />
      <div className="body armodel-body">
        <div className="armodel-stage" ref={hostRef}>
          {phase !== 'ready' && (
            <div className="armodel-cover">
              {phase === 'loading' && <p className="muted">正在載入 3D 模型…</p>}
              {phase === 'failed' && (
                <>
                  <p><b>3D 模型載不起來</b></p>
                  <p className="muted">{err}</p>
                  {/* 不要變成死路：這頁的內容在卡片頁也有 */}
                  <Link screen="arCard" params={{ slug: card.slug }} className="btn-primary tap">
                    改看卡片頁 ›
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <p className="armodel-hint muted">拖曳可以轉動，放開後會自己慢慢轉。</p>

        {/* ★ 對話面板放在 3D 舞台**正下方**、知識卡之上：
            使用者剛看到角色動起來，這時候給他「可以跟它說話」最自然。
            擺到頁尾的話多數人捲不到那裡就離開了。 */}
        <ArTalk obj={obj} card={card} actorRef={actorRef}
          // ⚠️ 不可用 `scrollIntoView`：手機捲的是 `.device .body` 不是 window，
          //    對那個容器實測完全沒有作用而且是靜默的（實測小挑戰停在 top 1409
          //    完全沒動）。走 nav.jsx 匯出的共用工具，它會判斷斷點。
          onQuiz={() => scrollIntoContainer(quizRef.current)} />

        {obj && (
          <div className="scan-hit">
            <div className="scan-hit-hd">
              <b>{obj.name}</b>
              <span className="muted">{card.title}</span>
            </div>
            {obj.line && <p className="scan-hit-line">{obj.line}</p>}
            {obj.facts?.length > 0 && (
              <dl className="scan-hit-facts">
                {obj.facts.map(f => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}{f.source && <i className="muted">（{f.source}）</i>}</dd>
                  </div>
                ))}
              </dl>
            )}
            {obj.warn && <p className="scan-hit-warn">{obj.warn}</p>}
            <SpeakButton obj={obj} className="scan-hit-speak" />

            {/* ★ 小挑戰 —— 這條動線的「成了！」時刻。
                掃到卡片 → 看 3D 角色 → 讀知識卡 → 答題 → 拿徽章，
                先前這一段只存在於不用相機的 `/ar/card/:slug`，
                真的拿卡片掃到的人反而走不到獎勵。
                ⚠️ 用 `.cardp-quiz`（它自己帶 border-top 分隔線），所以放在
                   知識卡**裡面**、語音按鈕之後——與卡片頁的結構一致。 */}
            {obj.quiz && (
              <div ref={quizRef}><ArQuiz quiz={obj.quiz} loggedIn={!!user && !user.guest}
                term={card.term}
                // 圖卡上那句話用**有出處**的 fact，不用 quiz 的解說
                fact={obj.facts?.find(f => f.source) ?? obj.facts?.[0]} /></div>
            )}
          </div>
        )}

        <div className="armodel-acts">
          <Link screen="arCard" params={{ slug: card.slug }} className="btn-primary tap">
            看這張卡的完整內容 ›
          </Link>
          <Link screen="scan" className="btn-ghost tap">再掃一次</Link>
        </div>
      </div>
    </>
  )
}
