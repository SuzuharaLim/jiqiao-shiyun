import { useCallback, useEffect, useRef, useState } from 'react'
import { TopBar, Link, SheetMask } from '../components/ui.jsx'
import { cardBySlug, objectForHotspot } from '../data/arCards.js'
import { cardTimeContext, cardTimeLabel } from '../data/cardTime.js'
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
      // visible：畫布**沒有被控制項蓋住**的縱向比例（由 React 量完傳進來）。
      // visible：畫布**沒有被控制項蓋住**的縱向比例（由 React 量完傳進來）。
      // offset：那段可見區從畫布頂端往下多少才開始（泡泡移到角色上方之後，
      //         可見區不再貼著畫布頂端，只給比例是不夠的——還要知道它在哪裡）。
      // zoom：使用者捏合／滾輪縮放。>1 ＝ 拉近（角色變大）。
      // ⚠️ maxPitch 必須與 `jq-drag-rotate` 的夾角上限一致：這裡是用它當
      //    **靜態上界**去算「縱向最多會佔多高」。用當下角度的話使用者一拖動
      //    框景就忽大忽小；兩邊數字不一致則會在極端角度被裁掉。
      schema: { margin: { default: 1.0 }, maxPitch: { default: 35 },
        visible: { default: 1 }, offset: { default: 0 }, zoom: { default: 1 } },
      init() {
        this.metrics = null
        this.onReady = (e) => { this.metrics = e.detail; this.fit() }
        this.onResize = () => this.fit()
        const sc = this.el.sceneEl
        sc.addEventListener('jq-character-ready', this.onReady)
        // A-Frame 自己在視窗 resize 時會發這個事件（相機的 aspect 已經更新過了）
        sc.addEventListener('rendererresize', this.onResize)
      },
      // ★★★ 沒有這個 `update()`，`setAttribute('jq-fit', …)` 就只是改了資料而
      //   **不會重新框景**——縮放與可見區都寫得進去卻一點反應都沒有，而且
      //   完全不會報錯。實測：捏合到 2 倍，相機 z 仍停在 5.88。
      //   （先前只有 `jq-character-ready` 與 `rendererresize` 兩個事件會呼叫 fit，
      //    可見區剛好都在那之後才寫入，所以一直沒被發現。）
      update() { this.fit() },
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
        // ★★★ 只框「沒有被控制項蓋住」的那一段。
        //
        // 對話泡泡、選項格、輸入列是疊在畫布**下半**的，如果照整張畫布置中，
        // 角色的臉會正好被泡泡遮掉——而那是這一頁唯一要看的東西。
        // 作法：先按可見比例 `vis` 縮小可用的縱向空間，再把相機往下移，
        // 讓模型中心落在可見區的正中央（也就是整張畫布的 `vis/2` 處）。
        // ⚠️ 高度用**量到的**而不是寫死比例：控制項的高度會隨字級、
        //    答案長短、有沒有小挑戰而變（實測 411×889 上是 0.52~0.58）。
        const vis = Math.max(0.28, Math.min(1, this.data.visible))
        const off = Math.max(0, Math.min(1 - vis, this.data.offset))
        const zoom = Math.max(0.6, Math.min(3, this.data.zoom))
        const d = Math.max(needV / (tanV * vis), needH / tanH) * this.data.margin / zoom
        // ★★★ 可見區**不一定貼著畫布頂端**（泡泡在角色上方時，它從 off 才開始），
        //   所以不能再用「1 - vis」那個只對 top-anchored 成立的簡化式。
        //   通式：可見區中心距畫布頂端的比例 f = off + vis/2；畫布正中是 0.5；
        //   在距離 d 處畫布的世界高度 H = 2·d·tanV ⇒ 相機要往「相反方向」
        //   移 (0.5 − f)·H，模型才會落在可見區正中央。
        //   ⚠️ 驗算舊行為：off=0 ⇒ f=vis/2 ⇒ −(0.5−vis/2)·2·d·tanV
        //      ＝ −(1−vis)·d·tanV，與舊式完全一致。
        const f = off + vis / 2
        const shift = (0.5 - f) * 2 * d * tanV
        // ⚠️ 用 setAttribute 不要直接改 object3D.position：position 元件會在
        //    屬性變動時把 object3D 寫回去，直接改會被默默蓋掉。
        // 模型重心已經被移到原點，相機擺在 +z 看向 -z（預設朝向）就正對它，
        // 不需要 lookAt——那反而會與 A-Frame 的 rotation 元件打架。
        this.el.setAttribute('position', { x: 0, y: -shift, z: d })
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
        this.pinch = 0            // 兩指起始距離，0 ＝ 目前不是捏合
        this.zoom = 1
        const el = this.el.sceneEl
        const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
        /** 縮放交給 React（它才知道要寫回哪一個 jq-fit）。 */
        this.emitZoom = () => el.emit('jq-zoom', { zoom: this.zoom }, false)

        this.onDown = (e) => {
          if (e.touches?.length >= 2) {           // 兩指：捏合縮放，不轉動
            this.dragging = false
            this.pinch = dist(e.touches); this.pinch0 = this.zoom
            return
          }
          const p = e.touches?.[0] ?? e
          this.dragging = true; this.auto = false
          this.lastX = p.clientX; this.lastY = p.clientY
          this.downYaw = this.yaw; this.downPitch = this.pitch
        }
        this.onMove = (e) => {
          if (this.pinch && e.touches?.length >= 2) {
            const k = dist(e.touches) / this.pinch
            this.zoom = Math.max(0.6, Math.min(3, this.pinch0 * k))
            this.emitZoom()
            return
          }
          if (!this.dragging) return
          const p = e.touches?.[0] ?? e
          this.yaw += (p.clientX - this.lastX) * this.data.speed
          // ★ 上下滑動＝改變俯仰角度（看它的頭頂或下巴）。
          // ⚠️ 角度要夾住：不夾的話可以轉到模型底下再翻過去，
          //    使用者會迷失方向而且看到穿模的內裡。
          //    這個上限必須與 `jq-fit` 的 `maxPitch` 一致——那邊是用它當靜態
          //    上界去算「縱向最多會佔多高」，兩邊不一致就會在極端角度被裁掉。
          this.pitch = Math.max(-35, Math.min(35, this.pitch - (p.clientY - this.lastY) * this.data.speed))
          this.lastX = p.clientX; this.lastY = p.clientY
        }
        // ★ 「點一下角色」＝做個動作給你看（原本那顆按鈕已依要求砍掉）。
        //   ⚠️ 一定要與拖曳分開：只有「幾乎沒有移動」才算點，否則轉一轉放手
        //      就會冒出一個動作，看起來像亂跳。
        this.onUp = (e) => {
          if (this.dragging && Math.abs(this.yaw - this.downYaw) < 2
            && Math.abs(this.pitch - this.downPitch) < 2) el.emit('jq-poke', null, false)
          this.dragging = false; this.pinch = 0
        }
        // 桌機沒有捏合，用滾輪。⚠️ 必須是**非 passive** 才能 preventDefault，
        //    否則在模型上滾動會把整頁捲走（而使用者以為自己在縮放）。
        this.onWheel = (e) => {
          e.preventDefault()
          this.zoom = Math.max(0.6, Math.min(3, this.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
          this.emitZoom()
        }
        const c = el.canvas ?? el
        for (const [n, f] of [['mousedown', this.onDown], ['touchstart', this.onDown]]) c.addEventListener(n, f, { passive: true })
        for (const [n, f] of [['mousemove', this.onMove], ['touchmove', this.onMove]]) window.addEventListener(n, f, { passive: true })
        for (const [n, f] of [['mouseup', this.onUp], ['touchend', this.onUp], ['touchcancel', this.onUp]]) window.addEventListener(n, f, { passive: true })
        c.addEventListener('wheel', this.onWheel, { passive: false })
        // ★★★ 鍵盤操作：方向鍵轉動。⚠️ 手勢是唯一操作方式時，鍵盤與讀屏
        //   使用者連「轉到背面看看」都做不到——那是這一頁的核心互動。
        this.onKey = (e) => {
          const step = e.shiftKey ? 15 : 5
          if (e.key === 'ArrowLeft') this.yaw -= step
          else if (e.key === 'ArrowRight') this.yaw += step
          else if (e.key === 'ArrowUp') this.pitch = Math.max(-35, Math.min(35, this.pitch + step))
          else if (e.key === 'ArrowDown') this.pitch = Math.max(-35, Math.min(35, this.pitch - step))
          else return
          e.preventDefault()
          this.auto = false
        }
        c.addEventListener('keydown', this.onKey)
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
        this._c?.removeEventListener('wheel', this.onWheel)
        this._c?.removeEventListener('keydown', this.onKey)
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
  // ★ 資料卡預設收起來。這一頁的主角是「跟角色說話」，一整塊條列資料攤在
  //   下面會把它變成「3D 檢視器 ＋ 說明書」。要看的人按一下就有。
  //   ⚠️ hook 一律寫在所有提早 return 之前（站上踩過兩次：PostDetail 的
  //      hook 順序、Scan.jsx 的 TDZ），下面 `if (!card) return` 就是那個 return。
  const [showCard, setShowCard] = useState(false)
  // 今天 vs 這張卡的時間關係（狀態帶與開場白的語態都靠它）
  const tctx = cardTimeContext(card)
  // ★★★★ 對話泡泡的高度會變（開場白 2 行、長答案 4 行、思考中 1 行），
  //   而 `jq-fit` 的可見區是量出來的 ⇒ **泡泡一變就要重量一次**。
  //   先前只在 ResizeObserver／window resize 時量，所以答案一長，泡泡往下長，
  //   角色卻還停在原本的框景 ⇒ 泡泡壓在它頭上。
  //   （這個窗格的 RO 不觸發，正式環境的 RO 也只盯容器、不盯泡泡。）
  const syncRef = useRef(null)
  const relayout = useCallback(() => { syncRef.current?.() }, [])

  // ★ 這張卡上「有內容可以聊」的主題。上下滑動就在這個清單裡換。
  //   ⚠️ 只收 `objectForHotspot` 拿得到東西的熱區——空的一格會讓人以為壞了。
  const spots = (card?.hotspots ?? []).filter(h => objectForHotspot(h))
  // 掃描時瞄到的熱區（有的話），沒有就用 primary
  const initial = Math.max(0, spots.findIndex(h => h.id === hotspot)) ||
    Math.max(0, spots.findIndex(h => h.primary))
  const [spotIdx, setSpotIdx] = useState(initial)
  const idx = Math.min(Math.max(0, spotIdx), Math.max(0, spots.length - 1))
  const spot = spots[idx] ?? null
  const obj = spot ? objectForHotspot(spot) : null
  // ★★★ 3D 角色**永遠是卡片的主角**（這張卡只有結球白菜有 model），
  //   換主題只換內容不換模型。所以說話的人一直是它——問句的稱謂要用它，
  //   不可用 `obj.name`，否則會變成「問問小寒 · 身體保健…」。
  const speaker = objectForHotspot(card?.hotspots?.find(h => h.primary) ?? card?.hotspots?.[0])?.name
    ?? obj?.name ?? ''

  /** 換主題。⚠️ 用取模繞回去：到底了就回到第一個，不做「到底了沒反應」——
   *  那與「手勢沒被辨識到」在畫面上完全無從分辨。 */
  const swap = (dir) => {
    if (spots.length < 2) return
    setSpotIdx(i => (((i + dir) % spots.length) + spots.length) % spots.length)
  }
  // ⚠️ 場景只建一次（effect 的相依是 [slug]），所以事件處理函式會**閉包住第一次
  //    render 的 swap**。用 ref 讓它永遠拿到最新的——這與站上「remember() 不可
  //    放進 setState 更新函式」是同一類的陳舊閉包問題。
  const swapRef = useRef(swap)
  swapRef.current = swap

  useEffect(() => {
    let cancelled = false
    let scene = null
    let ro = null
    let ro2 = null
    let onActor = null
    let syncVisible = null
    let onZoom = null
    let onPoke = null
    let pokeTimer = 0
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
        // ★★★ 3D 角色是這一頁的主角，但 `<canvas>` 對輔助技術**完全不存在**
        //   （沒有 role、沒有 aria-label）。A-Frame 的 canvas 是它自己建的，
        //   所以要等它出現才掛。⚠️ 純圖形內容用 `role="img"` ＋ 一句敘述即可，
        //   不要試著把 3D 內容做成可讀的樹狀結構。
        scene.addEventListener('renderstart', () => {
          const cv = scene.canvas
          if (!cv) return
          cv.setAttribute('role', 'img')
          cv.setAttribute('aria-label', `${card.title}的 3D 角色，可拖曳或用方向鍵轉動觀察`)
          // ★★ 鍵盤也要能轉：只有滑鼠拖曳的話，鍵盤使用者連「看另一面」都做不到。
          cv.setAttribute('tabindex', '0')
        }, { once: true })
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

        // ★★ 把「控制項蓋住了畫布多少」量出來餵給 jq-fit。
        //
        // ⚠️ **不可以寫死比例**：對話面板的高度會隨字級、答案長短、有沒有小挑戰
        //    而變（實測 411×889 上落在 0.52~0.58 之間）。寫死就會在某些狀態下
        //    把臉遮掉，而那是這一頁唯一要看的東西。
        // ⚠️ 這個窗格的 ResizeObserver 不會觸發（frame-driven），所以除了 RO
        //    也要在轉向／resize 時算一次——兩條路都留著。
        // ★★★ 泡泡移到角色**上方**之後，可見區不再貼著畫布頂端 ⇒ 只給比例不夠，
        //   還要給它從哪裡開始（`offset`）。少了 offset 的話角色會被往上頂，
        //   臉正好躲進泡泡後面——與先前那個 bug 同樣的症狀、不同的成因。
        syncVisible = () => {
          const sceneBox = hostRef.current?.parentElement
          const panel = sceneBox?.querySelector('.artalk')
          const say = sceneBox?.querySelector('.artalk-say')
          const cam = scene?.querySelector('[jq-fit]')
          if (!sceneBox || !panel || !cam) return
          const box = sceneBox.getBoundingClientRect()
          const h = box.height
          if (!h) return
          const top = say ? Math.max(0, say.getBoundingClientRect().bottom - box.top) : 0
          const covered = panel.getBoundingClientRect().height
          const off = Math.max(0, Math.min(0.6, top / h))
          const vis = Math.max(0.28, Math.min(1 - off, 1 - off - covered / h))
          cam.setAttribute('jq-fit', `visible: ${vis.toFixed(3)}; offset: ${off.toFixed(3)}`)
        }
        // 捏合／滾輪縮放（手勢在 jq-drag-rotate 裡判定，這裡只接結果）
        onPoke = () => {
          const a = actorRef.current
          if (!a) return
          const moves = ['wave', 'nod', 'jump', 'spin', 'dance', 'happy']
          try { a.setAction(moves[Math.floor(Math.random() * moves.length)]) } catch { /* ignore */ }
          // ⚠️ 動作是循環的，不收回去它會一直跳
          clearTimeout(pokeTimer)
          pokeTimer = setTimeout(() => { try { a.setAction('present') } catch { /* ignore */ } }, 4200)
        }
        scene.addEventListener('jq-poke', onPoke)
        onZoom = (e) => {
          const cam = scene?.querySelector('[jq-fit]')
          if (cam) cam.setAttribute('jq-fit', `zoom: ${Number(e.detail?.zoom ?? 1).toFixed(3)}`)
        }
        scene.addEventListener('jq-zoom', onZoom)
        // 版面穩定之後量一次；之後交給 RO 與 window resize
        syncRef.current = syncVisible
        setTimeout(syncVisible, 0)
        if (typeof ResizeObserver !== 'undefined' && hostRef.current?.parentElement) {
          ro2 = new ResizeObserver(() => syncVisible())
          ro2.observe(hostRef.current.parentElement)
        }
        window.addEventListener('resize', syncVisible)
      } catch (e) {
        console.error('[AR] A-Frame 場景建立失敗', e)
        if (!cancelled) { setErr(e?.message || String(e)); setPhase('failed') }
      }
    })()
    return () => {
      cancelled = true
      try { ro?.disconnect() } catch { /* ignore */ }
      try { ro2?.disconnect() } catch { /* ignore */ }
      try { if (syncVisible) window.removeEventListener('resize', syncVisible) } catch { /* ignore */ }
      syncRef.current = null
      try { if (onActor) scene?.removeEventListener('jq-actor-ready', onActor) } catch { /* ignore */ }
      try { if (onZoom) scene?.removeEventListener('jq-zoom', onZoom) } catch { /* ignore */ }
      try { if (onPoke) scene?.removeEventListener('jq-poke', onPoke) } catch { /* ignore */ }
      clearTimeout(pokeTimer)
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
        {/* ★★ 一整片連續的場景：角色、對話泡泡、選項、輸入列**共用同一個背景**，
            而不是「3D 方塊 ＋ 底下一堆控制項」。這是參考圖最主要的特徵——
            它讓人覺得是「站在角色面前跟它說話」，而不是「在操作一個 3D 檢視器」。
            ⚠️ 舞台是絕對定位鋪滿整個場景，控制項疊在下半；角色的框景要把
               被蓋住的那一段扣掉（見 jq-fit 的 `bias`），否則臉會被泡泡遮住。 */}
        {/* ★★★ 時間狀態帶：讓使用者一眼看出「我在看的是今天，還是一張未來的卡」。
            導覽列的「今日曆頁」是 highlight 狀態，而這一頁的內容是 2027 小寒——
            沒有這一條，使用者無從判斷兩者的關係。
            ⚠️ 這條做好之後，就算 AI 講錯話，傷害也小很多：他至少知道自己在看什麼。 */}
        <p className={`armodel-when armodel-when-${tctx.phase.toLowerCase()}`}>
          <b>{cardTimeLabel(tctx)}</b>
          <span>今天：{tctx.currentTerm} {tctx.todayISO.slice(5).replace('-', '/')}</span>
        </p>

        <div className="armodel-scene">
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

          {/* ★★ 「詳細」做成選項格裡的一顆 chip，不再是場景頂端的一列。
              ⚠️ 那一列原本佔掉畫布 56px，而**每一格高度都會直接換算成角色變小**
                 （`jq-fit` 是按可見區算距離的）。放進選項格是免費的——原本
                 5 顆就已經是 3 列，加到 6 顆還是 3 列。 */}
          <ArTalk obj={obj} card={card} actorRef={actorRef} speaker={speaker}
            // ⚠️ persona 只送 id，系統提示由伺服器產生（白名單）。
            //    ★ 不再看有沒有登入——訪客走 /api/ar/talk，那支不需要 session。
            objectId={spot?.objectId} onLayout={relayout}
            detailOpen={showCard} onDetail={() => setShowCard(v => !v)}
            // ⚠️ 不可用 `scrollIntoView`：手機捲的是 `.device .body` 不是 window，
            //    對那個容器實測完全沒有作用而且是靜默的（實測小挑戰停在 top 1409
            //    完全沒動）。走 nav.jsx 匯出的共用工具，它會判斷斷點。
            // ★★★ 小挑戰在資料卡**裡面**，而資料卡預設是收起來的 ⇒ 一定要先展開
            //   再捲。少了 `setShowCard(true)`，按「考考我」會捲向一個還沒被渲染的
            //   節點（`quizRef.current` 是 null）＝**畫面上什麼都不會發生**，
            //   而角色剛剛才說「好啊，往下看——我出一題」。
            // ⚠️ 展開之後 DOM 還沒長出來，同一輪捲動一定捲不到 ⇒ 要等下一幀。
            //    這裡用 setTimeout 而不是 rAF：分頁在背景時 rAF 完全不觸發
            //    （站上已踩過，見 CLAUDE.md 的捲動還原那一段）。
            onQuiz={() => {
              setShowCard(true)
              setTimeout(() => scrollIntoContainer(quizRef.current), 60)
            }} />
        </div>


        {/* ★★★ 詳細資料改成**彈窗**（使用者要求）。
            ⚠️ 一定要走 `SheetMask`：站上所有浮層的 Esc、焦點鎖、`role="dialog"`、
               離場動畫都做在那裡（CLAUDE.md）。自己刻一個 div 會少掉這四件事，
               而少掉的每一件在畫面上都看不出來。
            ⚠️ 底下原本那兩顆（「看這張卡的完整內容」「再掃一次」）已依使用者要求
               移除，**改放進這個彈窗的最後**——直接刪掉的話，從相機跳進來的人
               就沒有路回去再掃一張，而那是這條動線唯一的重來方式。 */}
        {obj && showCard && (
          <SheetMask onClose={() => setShowCard(false)} label={`${obj.name}的詳細資料`}>
            {/* ⚠️ `.sheet` 自己就是捲動容器（max-height ＋ overflow-y:auto），
                高度上限與底部安全區都由它管——**絕不可**用 inline style 覆寫
                maxHeight／paddingBottom（站上踩過 Scan.jsx 與 AuthWall.jsx 兩次）。
                ⚠️ 點面板內部不要冒泡到遮罩，否則點一下文字就把彈窗關掉。
                ⚠️ 這個註解必須在 `{(close) => (` **之前**：那個括號裡是
                   JS 的運算式位置不是 JSX，JSX 註解放進去會直接語法錯誤。
                ⚠️ 也**不可以在註解裡寫出 JSX 註解的結束符號**——它會提前收掉
                   這個註解，剩下的字就變成畫面上的文字。實測踩過：整個彈窗
                   內容被換成半句註解，而且建置一個字都不會報。 */}
            {(close) => (
              <div className="sheet armodel-sheet" onClick={e => e.stopPropagation()}>
                <div className="sheet-grip" />
                <div className="armodel-sheet-hd">
                  <b>{obj.name}</b>
                  <button className="armodel-sheet-x tap" type="button" onClick={close} aria-label="關閉詳細資料">✕</button>
                </div>
                <div>
                  <div className="scan-hit" id="armodel-card">
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
                        掃到卡片 → 看 3D 角色 → 讀知識卡 → 答題 → 拿徽章。
                        ⚠️ 用 `.cardp-quiz`（它自己帶 border-top 分隔線），所以放在
                           知識卡**裡面**、語音按鈕之後——與卡片頁的結構一致。 */}
                    {obj.quiz && (
                      <div ref={quizRef}><ArQuiz quiz={obj.quiz} loggedIn={!!user && !user.guest}
                        term={card.term}
                        // 圖卡上那句話用**有出處**的 fact，不用 quiz 的解說
                        fact={obj.facts?.find(f => f.source) ?? obj.facts?.[0]} /></div>
                    )}
                  </div>

                  <div className="armodel-acts">
                    <Link screen="arCard" params={{ slug: card.slug }} className="btn-primary tap">
                      看這張卡的完整內容 ›
                    </Link>
                    <Link screen="scan" className="btn-ghost tap">再掃一次</Link>
                  </div>
                </div>
              </div>
            )}
          </SheetMask>
        )}

      </div>
    </>
  )
}
