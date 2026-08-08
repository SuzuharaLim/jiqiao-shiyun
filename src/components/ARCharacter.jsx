import { useEffect, useRef } from 'react'
import {
  Scene, PerspectiveCamera, WebGLRenderer, Matrix4, Group,
  HemisphereLight, DirectionalLight, NeutralToneMapping, Color,
} from 'three'
import { cvToThree, verticalFov } from '../lib/arPoseBridge.js'
import { buildCharacter, NAPA_CABBAGE } from '../lib/char/factory.js'
import { createActor } from '../lib/char/actor.js'

// ============================================================================
// AR 角色層 —— 讓角色「站在」被追蹤到的卡片上
//
// 這一層與追蹤層是**解耦**的：只吃 `track.pose`（column-major 4×4）。
// 追蹤器（arTracker.js）一行都不用改。
//
// ⚠️ **fov 的定義不一樣，不可直接把同一個數字餵給兩邊**。
//    `poseFromHomography` 用 `f = (width/2)/tan(fov/2)`＝把 fov 當**水平**視角；
//    three 的 `PerspectiveCamera.fov` 是**垂直**視角。直接都填 60 的話
//    重投影誤差 8.17px（160px 寬的取樣畫面上約 5%）——模型會浮在卡片上方
//    或陷進桌面，而且看起來很像「對齊誤差」，會讓人去調落點而不是去查 fov。
//    換算過（46.83°）之後實測誤差 **0.0057px**。見 lib/arPoseBridge.js。
//
// ⚠️ 相機**不要動**：姿態全部寫進物件的 matrix。相機一動就要同時維護兩套
//    座標系，追丟重抓時很容易變成模型飛出去。
//
// ⚠️ 這一層與 three 都不可進主 bundle——呼叫端用 React.lazy。
// ============================================================================

const prefersReduce = () => typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ARCharacter({
  track, grabW = 160, grabH = 120, action = 'present',
  preset = NAPA_CABBAGE, fovDeg = 60,
  // 角色在卡面上的落點（卡面正規化座標 0..1，原點左上）
  anchorUV = [0.5, 0.5],
  // 角色高度佔卡片邊長的幾倍
  scale = 0.55,
}) {
  const hostRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch { return }   // WebGL 不可用 → 什麼都不畫，呼叫端的 CSS-3D 內容層照舊

    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    renderer.toneMapping = NeutralToneMapping
    renderer.toneMappingExposure = 0.95
    // ⚠️ 不開陰影：AR 模式沒有地板可以接陰影，開了只是白付一次 shadow pass。
    //    接地感靠角色自帶的 blob shadow。
    renderer.shadowMap.enabled = false
    host.appendChild(renderer.domElement)
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'

    const scene = new Scene()
    // ⚠️ 相機參數要與 poseFromHomography 的假設一致（見檔頭）
    const camera = new PerspectiveCamera(verticalFov(fovDeg, grabW / grabH), grabW / grabH, 0.01, 100)

    scene.add(new HemisphereLight(new Color('#FFF6EC'), new Color('#8E96D6'), 1.45))
    const key = new DirectionalLight(new Color('#FFF6EA'), 1.9)
    key.position.set(-1.2, 2.4, 1.8)
    scene.add(key)

    // pose 直接寫進這個節點；角色掛在它底下再做落點與縮放的偏移。
    const anchor = new Group()
    anchor.matrixAutoUpdate = false
    scene.add(anchor)
    const fit = new Group()      // 卡面座標 → 角色座標的橋接
    anchor.add(fit)

    // AR 用低規：draw call 87、三角形 75k（策畫書 §6.1 的 ≤90 / ≤110k）
    const char = buildCharacter(preset, { lod: 0.6, outlineLayers: 1 })
    fit.add(char.root)
    const actor = createActor(char, { action, reduceMotion: prefersReduce() })
    apiRef.current = { actor, char }

    // ⚠️ 卡面座標 → 模型座標：`(u, v * pose.vScale, 0)`。
    //    ① 原點在卡片**角落**不是中心（pose 的 t 就是 (0,0) 那一角）
    //    ② 平面是 **XY** 不是 XZ
    //    ③ 非正方形卡片要乘 `pose.vScale`（見 homography.js 的 aspect）
    //    我第一版寫成 `(u-0.5, 0, -(v-0.5))`（以為是置中的 XZ 平面），
    //    誤差 29~113px——角色跑到卡片外面去。
    //
    // ⚠️ 角色自己是 Y 軸朝上，而卡面的「離開紙面」方向是模型的 −Z，
    //    所以要繞 X 轉 −90°。轉成 +90° 的話角色會**插進桌子裡**
    //    （實測頭頂的深度比腳底大，也就是頭比腳遠離相機）。
    const applyFit = (vScale = 1) => {
      const [u, v] = anchorUV
      fit.position.set(u, v * vScale, 0)
      fit.rotation.set(-Math.PI / 2, 0, 0)
      fit.scale.setScalar(scale)
      fit.updateMatrix()
    }
    applyFit()

    const resize = () => {
      const r = host.getBoundingClientRect()
      if (!r.width || !r.height) return
      renderer.setSize(r.width, r.height, false)
      // ⚠️ aspect 用**取樣畫面**的比例，不是顯示框的：pose 是在取樣座標系裡解出來的。
      //    用顯示框的比例會讓模型隨著版面寬高比而歪掉。
      camera.aspect = grabW / grabH
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(host)

    const m = new Matrix4()
    let raf = 0, last = performance.now(), alive = true
    const loop = (now) => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      const t = apiRef.current?.track
      if (!t?.pose) {
        // 追丟：不要立刻消失（閃爍很難看），交給 CSS 的 opacity 過場
        renderer.domElement.style.opacity = '0'
        last = now
        return
      }
      renderer.domElement.style.opacity = '1'
      // ⚠️ CV → three 的手性轉換（diag(1,-1,-1)）：CV 是 y 往下、z 往前，
      //    three 是 y 往上、相機看 −z。少了這一步深度會是負的（物件在相機背後）
      //    而且 x 會鏡像——症狀是「角色出現在卡片對稱的另一邊」。
      cvToThree(t.pose.matrix, m)
      anchor.matrix.copy(m)
      // 非正方形卡片的 v 軸縮放每幀可能不同（換了另一張卡）
      if (t.pose.vScale !== undefined) applyFit(t.pose.vScale)
      actor.update(now - last)
      last = now
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro?.disconnect()
      apiRef.current = null
      char.dispose()
      key.dispose?.()
      renderer.dispose()
      renderer.forceContextLoss?.()
      renderer.domElement.remove()
    }
    // ⚠️ track 不在相依裡：它每秒變 15 次，放進來會讓整個場景每秒重建 15 次
    //    （每次都要重編 shader）。改由下面的 effect 寫進 ref。
  }, [preset, grabW, grabH, fovDeg, anchorUV, scale, action])

  // 高頻更新走 ref，不觸發重繪
  useEffect(() => { if (apiRef.current) apiRef.current.track = track }, [track])

  return <div ref={hostRef} className="ar-char" aria-hidden="true" />
}
