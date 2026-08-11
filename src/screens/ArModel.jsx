import { useEffect, useRef, useState } from 'react'
import { TopBar, Link } from '../components/ui.jsx'
import { cardBySlug, objectForHotspot } from '../data/arCards.js'
import SpeakButton from '../components/SpeakButton.jsx'

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
        this.actor = createActor(char, {
          action: 'present',
          reduceMotion: matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        })
        this.last = performance.now()
      },
      tick(t) {
        if (!this.actor) return
        // 分頁回前景時不讓動作一次跳好幾秒
        this.actor.update(Math.min(t - this.last, 100))
        this.last = t
      },
      remove() {
        this.disposed = true
        // ⚠️ 對應上面的 `object3D.add()`：A-Frame 的 removeObject3D 找不到它
        //    （它不在 object3DMap 裡），一定要自己移除，否則反覆進出這一頁
        //    會一直往場景裡疊角色。
        try { if (this.char) this.el.object3D.remove(this.char.root) } catch { /* ignore */ }
        try { this.char?.dispose?.() } catch { /* ignore */ }
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
  const card = cardBySlug(slug) || null
  const hostRef = useRef(null)
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
        scene.setAttribute('vr-mode-ui', 'enabled: false')
        scene.setAttribute('device-orientation-permission-ui', 'enabled: false')
        // ⚠️ `antialias` 與 `colorManagement` 要明講：A-Frame 的預設值與本站
        //    其他 3D（ProduceStage／AR 舞台）不同，不設會兩邊看起來不一樣。
        scene.setAttribute('renderer', 'colorManagement: true; antialias: true; alpha: true')
        scene.setAttribute('background', 'transparent: true')
        scene.innerHTML = `
          <a-entity light="type: hemisphere; color: #FFF6EC; groundColor: #8E96D6; intensity: 1.55"></a-entity>
          <a-entity light="type: directional; color: #FFF6EA; intensity: 2.30" position="-2.4 3.4 2.6"></a-entity>
          <a-entity light="type: directional; color: #CFE0FF; intensity: 0.30" position="2.8 1.2 2.2"></a-entity>
          <a-entity light="type: directional; color: #FFE6F0; intensity: 0.45" position="0.6 3.0 -3.4"></a-entity>
          <a-entity id="jq-rig" jq-drag-rotate>
            <a-entity jq-character="lod: 0.85; outline: 2" position="0 -0.55 0"></a-entity>
          </a-entity>
          <a-entity camera="fov: 40" position="0 0.15 3.2" look-controls="enabled: false" wasd-controls="enabled: false"></a-entity>
        `
        hostRef.current.appendChild(scene)
        const done = () => { if (!cancelled) setPhase('ready') }
        if (scene.hasLoaded) done()
        else scene.addEventListener('loaded', done, { once: true })
      } catch (e) {
        console.error('[AR] A-Frame 場景建立失敗', e)
        if (!cancelled) { setErr(e?.message || String(e)); setPhase('failed') }
      }
    })()
    return () => {
      cancelled = true
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
