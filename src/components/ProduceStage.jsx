import { useEffect, useRef, useState } from 'react'
import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Vector3,
  HemisphereLight, DirectionalLight, NeutralToneMapping, Color,
} from 'three'
import { buildCharacter, NAPA_CABBAGE } from '../lib/char/factory.js'
import { createActor, ACTIONS } from '../lib/char/actor.js'

// ============================================================================
// 農產角色舞台 —— 網頁 3D（不含 AR）
//
// ⚠️ 這個檔案與 three 都**不可以進主 bundle**。呼叫端一律用
//    React.lazy(() => import('./ProduceStage.jsx'))，只在使用者真的要看 3D
//    時才載入。three tree-shake 後仍有 ~150KB gzip，主 bundle 現在是 442KB，
//    無條件塞進去等於首頁多背三分之一的重量給一個多數人不會點的功能。
//
// ⚠️ 反覆進出這個元件是 SPA 最典型的 GPU 記憶體洩漏點（策畫書 §6.2 #12）：
//    renderer／幾何／材質／紋理都在 GPU 上，React 卸載元件不會回收它們。
//    unmount 時必須逐項 dispose，並 forceContextLoss()——行動裝置能同時存在的
//    WebGL context 數量有限（常見上限 8–16），開關幾次抽屜就會拿不到新的 context，
//    症狀是「第 N 次點開變成空白」而前面幾次都正常。
// ============================================================================

const prefersReduce = () => typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ProduceStage({
  // ⚠️ 預設 lod 不是 1。移植 demo _6 之後角色是 5 層 54 片葉子，
  //    全解析度 230,310 個三角形，超出策畫書 §6.1 的 180k 預算（那份預算是按
  //    舊版 29 片葉子估的）。實測 0.85 = 170,456 剛好進預算而畫面看不出差別；
  //    AR 疊加要與追蹤共用 CPU/GPU，呼叫端請給 0.6（89,314）。
  preset = NAPA_CABBAGE, action = 'idle', lod = 0.85, outlineLayers = 2, height = 320, onReady,
  // 標籤：[{ key, label }]。每一顆掛在角色身上的一個 3D 錨點，跟著它動。
  // ⚠️ **一律 DOM 不用 3D 文字**：中文 MSDF 字集動輒好幾 MB，而這裡只要幾個詞。
  labels = [],
}) {
  const hostRef = useRef(null)
  const labelRefs = useRef([])
  const actorRef = useRef(null)
  const [failed, setFailed] = useState(false)

  // 動作切換不重建場景——重建等於每次換動作都重新編譯 shader
  useEffect(() => { actorRef.current?.setAction(action) }, [action])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer, raf = 0, char = null
    const reduce = prefersReduce()

    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      setFailed(true)          // WebGL 不可用 → 由呼叫端顯示純圖文知識卡
      return
    }
    // 裝置像素比上限 2：3x 的螢幕算 9 倍像素，中階手機直接掉到 20fps
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    // ★★★ **不要開真實陰影貼圖**：demo `_6` 完全沒有（實測 shadowMap.enabled=false）。
    //   MeshToonMaterial 的 gradientMap 是套在「已經乘過陰影衰減」的光照上 ⇒
    //   被遮蔽的區域會直接掉進最暗那一階，畫面上是白菜表面出現大塊、硬邊、
    //   不隨曲面走的深色斑（手臂下方、葉片重疊處、腿與菜身之間）。
    //   賽璐璐的立體感是靠頂點色畫出來的假 AO，真陰影只會把它蓋掉。
    renderer.shadowMap.enabled = false
    renderer.toneMapping = NeutralToneMapping
    renderer.toneMappingExposure = 1.00        // demo：exposure 1.00（先前 0.95）
    host.appendChild(renderer.domElement)
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'

    const scene = new Scene()
    const camera = new PerspectiveCamera(44, 1, 0.1, 40)

    // ★★★ 四盞燈的顏色、強度、位置逐項對齊 demo `_6:62-65`。
    //   賽璐璐怕多光源疊出多重明暗交界 → 主光獨大，補光壓很低。
    // ⚠️ 移植時四盞全部漂掉了，方向一致地讓角色變暗、變粉：
    //     半球的地面色 #AFC3DE（淡藍灰）→ #8E96D6（飽和藍紫）⇒ 下半身染紫
    //     背光 #EEFFD2（淡黃綠，模擬「陽光透過菜葉」）→ #FFE6F0（粉紅）且弱 36%
    //     補光強度砍到 55%、主光 z 從 3.6 縮到 2.6（入射角變成接近正上方 ⇒ 臉變暗）
    //   再乘上 ramp 暗部從 0.58 掉到 0.46，整隻明顯暗一階。
    scene.add(new HemisphereLight(new Color('#FFFDF0'), new Color('#AFC3DE'), 1.45))
    const key = new DirectionalLight(new Color('#FFFDF4'), 2.15)
    key.position.set(-2.4, 3.4, 3.6)
    scene.add(key)
    const fill = new DirectionalLight(new Color('#DDE9FF'), 0.55); fill.position.set(3.4, 1.0, 1.6)
    const rim = new DirectionalLight(new Color('#EEFFD2'), 0.70); rim.position.set(1.6, 2.6, -3.2)
    scene.add(fill, rim)

    const pivot = new Group(); scene.add(pivot)
    char = buildCharacter(preset, { lod, outlineLayers })
    pivot.add(char.root)
    const actor = createActor(char, { action, reduceMotion: reduce })
    actorRef.current = actor

    const fit = () => {
      const r = host.getBoundingClientRect()
      const w = Math.max(1, r.width), h = Math.max(1, r.height)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // ★★★ 注視點 −0.09，不是 +0.66。
      //   demo `_6` 的軌道中心在世界 y=0.70、hero 在 0.79 ⇒ 相對角色 **−0.09**
      //   （略低於菜身中央）。先前的 0.66 來自另一支 demo（cel-demo_4 的
      //   `cam: { y: 0.62 }`），那支的角色是**腳踩 y=0**，座標系整組差 0.785。
      //   實測後果：角色 bbox 中心在 −0.008，注視點卻在 +0.66 ⇒ 高出一個半身高，
      //   角色掉到畫面下半部、上半張畫面全空。與 /ar/model 先前的框景 bug 同源。
      const dist = 3.05 * Math.max(1, 1.35 / Math.max(0.35, camera.aspect))
      camera.position.set(0, 0.12, dist)
      camera.lookAt(0, -0.09, 0)
      camera.updateProjectionMatrix()
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(host)

    let last = performance.now()
    let hidden = false
    const onVis = () => { hidden = document.hidden }
    document.addEventListener('visibilitychange', onVis)

    // ★ 捲出視野時也要停。
    //
    // ⚠️ `visibilitychange` 只涵蓋「分頁切到背景」，**不涵蓋「分頁還開著但
    //    3D 已經捲出畫面」**——而後者在卡片頁很常發生（那頁很長，看完 3D 往下
    //    讀知識卡、小挑戰時舞台早就在畫面外了），迴圈卻還在每秒算 60 次。
    //    驗收報告 M5 觀察到「截圖 3 次逾時（renderer 忙碌）」，這是其中一個成因。
    // ⚠️ 初值必須是 `true`（先假設看得見）：IntersectionObserver 的第一次回呼是
    //    非同步的，初值給 false 會讓第一幀之前完全不算——3D 進場動畫的開頭
    //    會被吃掉，看起來像「一載入就已經站好了」。
    let onScreen = true
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting) }, { threshold: 0 })
      : null
    io?.observe(host)

    // ── 標籤定位：每幀把 3D 錨點投影到螢幕座標 ──
    // ⚠️ 直接寫 DOM 的 style，不走 React state：這是每秒 60 次的更新，
    //    每次 setState 會讓整棵樹重繪，中階手機直接掉幀。
    const tmp = new Vector3()
    const placeLabels = () => {
      const els = labelRefs.current
      if (!els.length) return
      const r = host.getBoundingClientRect()
      const w = r.width, h = r.height
      for (let i = 0; i < els.length; i++) {
        const el = els[i], node = char.anchors[i % char.anchors.length]
        if (!el || !node) continue
        node.getWorldPosition(tmp).project(camera)
        // ⚠️ project() 之後 z > 1 代表在遠裁面之外或在相機背後——要藏起來，
        //    否則會出現「標籤浮在模型正中央」這種看起來像 bug 的畫面。
        const behind = tmp.z > 1 || tmp.z < -1
        el.style.opacity = behind ? '0' : '1'
        el.style.transform =
          `translate3d(${((tmp.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * h).toFixed(1)}px, 0) translate(-50%, -50%)`
      }
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      // 分頁在背景、或舞台已捲出畫面時不算不畫——否則手機還在燒電。
      // ⚠️ 一定要更新 `last`，否則回到畫面時 `now - last` 會是整段離開的時間，
      //    actor 會一次前進好幾秒——動作瞬間跳到未來，看起來像壞掉。
      if (hidden || !onScreen) { last = now; return }
      actor.update(now - last)
      last = now
      renderer.render(scene, camera)
      placeLabels()
    }
    raf = requestAnimationFrame(loop)
    onReady?.({ actor, char })

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      actorRef.current = null
      char?.dispose()
      for (const l of [key, fill, rim]) l.dispose?.()
      renderer.dispose()
      renderer.forceContextLoss?.()
      renderer.domElement.remove()
    }
  }, [preset, lod, outlineLayers, onReady])   // ⚠️ action 不在相依裡：換動作不該重建整個場景

  if (failed) return null      // 呼叫端負責降級（策畫書 §5.4：3D 是體驗，知識卡是內容）
  return (
    <div
      ref={hostRef}
      className="produce-stage"
      style={{ height, width: '100%' }}
      role="img"
      aria-label={`${preset.name}的立體角色動畫`}
    >
      {/* ⚠️ 標籤層 aria-hidden：這些字在知識卡裡已經有一份可讀的版本，
          讓讀屏唸兩次只是噪音。整個舞台的 aria-label 已經說明它是什麼。
          ⚠️ pointer-events:none 由 CSS 給——蓋在 canvas 上會吃掉手勢。 */}
      {labels.map((l, i) => (
        <span
          key={l.key ?? i}
          ref={(el) => { labelRefs.current[i] = el }}
          className="ps-label"
          aria-hidden="true"
          // 依序淡入（策畫書 §5.2 stagger 120ms）
          style={{ animationDelay: `${i * 0.12}s` }}
        >
          {l.label}
        </span>
      ))}
    </div>
  )
}

export { ACTIONS, NAPA_CABBAGE }
