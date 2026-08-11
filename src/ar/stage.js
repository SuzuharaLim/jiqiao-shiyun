// ============================================================================
// 算繪層 —— three 場景，**完全不知道相機或 MindAR 存在**
//
// 介面只有四件事：吃投影矩陣、吃姿態矩陣、從螢幕座標打回卡面 UV、算繪。
// 這個邊界是刻意的：舊版把 renderer 與 video、Controller 綁在同一個類別裡，
// 於是「畫面全黑」與「換鏡頭後模型偏掉」都是跨層的 bug，改一邊會弄壞另一邊。
//
// ── 座標系 ──
// 場景裡的物件座標＝**目標圖像素、原點左下、y 朝上、+z 離開紙面**（見 cardSpace.js
// 的推導）。所以角色放在 `uvToCard(u, v, W, H)`，尺寸寫成 `W * 比例`。
//
// ⚠️ 投影矩陣**直接用 Controller 給的那 16 個數**，不要自己從 fov 反推。
//    上游是用相機內參（fx, cx, cy）建的，反推成 PerspectiveCamera 的
//    fov/aspect/near/far 再讓 three 重算，會在非 4:3 的畫面上引入誤差
//    ——症狀是「模型浮在卡片上方或陷進桌面」。舊版 resize() 那一整段
//    fovAdjust 的算術就是為了補這個，補得對不對只能靠眼睛看。
//    直接覆寫 projectionMatrix 就沒有這個問題。
// ============================================================================

import {
  Scene, WebGLRenderer, PerspectiveCamera, Group, Matrix4, Vector2, Vector3,
  Raycaster, PlaneGeometry, MeshBasicMaterial, Mesh, Box3,
  HemisphereLight, DirectionalLight, Color, PCFShadowMap, NeutralToneMapping, SRGBColorSpace,
} from 'three'
import { cardToUv, uvToCard, rectCenter } from './cardSpace.js'

const prefersReduce = () => typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * @param canvas       React 渲染出來的 <canvas>（疊層由樣式表決定，不由 JS 決定）
 * @param targetSize   [W, H] 目標圖像素
 * @param projection   Controller.getProjectionMatrix() 的 16 個數
 */
export function createStage({ canvas, targetSize, projection }) {
  const [W, H] = targetSize

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.outputColorSpace = SRGBColorSpace
  // ⚠️ 裝置像素比上限 1.25（不是 2）：3x 螢幕在 2 的上限下等於算 4 倍像素，
  //    而算繪要與追蹤搶同一顆 GPU——掉幀對追蹤的傷害遠大於畫面銳利度的差異。
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap        // PCFSoftShadowMap 在 three 0.185 已棄用
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = 0.95

  const scene = new Scene()
  const camera = new PerspectiveCamera()
  // ★ 相機固定在原點看向 −z（worldMatrix 已經是 model-view）。
  //   關掉 matrixAutoUpdate：它永遠是單位矩陣，不需要每幀重算。
  camera.matrixAutoUpdate = false
  // 基準投影矩陣（涵蓋**整張**輸入影像）。實際使用的那份要再套裁切修正，見 setViewport。
  const baseProj = Float64Array.from(projection)
  setViewport(1, 1, 1, 1)

  // 賽璐璐怕多光源疊出多重明暗交界 → 主光獨大、補光壓很低
  // ⚠️ **不可用 `Object.assign(light, { position: ... })`**：`Object3D.position`
  //    是唯讀屬性（只有 getter），指派會丟
  //    `TypeError: Cannot assign to read only property 'position'`。
  //    我在這一版真的寫成那樣，而症狀正是這一整層要消滅的那一種——
  //    createStage 整個拋錯、stage 是 null，但追蹤器是獨立跑的，它的 onFound
  //    照樣把狀態推成「已對準」⇒ **畫面說追到了，其實什麼都沒有算繪**。
  //    一律用 `.position.set(...)`。
  const dir = (hex, intensity, x, y, z) => {
    const l = new DirectionalLight(new Color(hex), intensity)
    l.position.set(x, y, z)
    return l
  }
  const lights = [
    new HemisphereLight(new Color('#FFF6EC'), new Color('#8E96D6'), 1.55),
    dir('#FFF6EA', 2.30, -2.4, 3.4, 2.6),     // 主光
    dir('#CFE0FF', 0.30, 2.8, 1.2, 2.2),      // 補光（壓很低，賽璐璐怕多重明暗交界）
    dir('#FFE6F0', 0.45, 0.6, 3.0, -3.4),     // 輪廓光
  ]
  scene.add(...lights)

  // ── 卡片節點：worldMatrix 直接當它的變換 ──
  // ⚠️ matrixAutoUpdate 必須關掉：開著的話 three 每幀會用 position/rotation/scale
  //    重算 matrix，把我們寫進去的姿態蓋掉（模型會固定在原點不動）。
  const card = new Group()
  card.matrixAutoUpdate = false
  card.visible = false
  scene.add(card)

  // ── 卡面代理平面：只用來 raycast 取 UV，不畫出來 ──
  // ⚠️ 用 three 自己的 Raycaster，**不要**手寫 homography：函式庫已經把變換算好，
  //    再算一次就是「貼歪但不報錯」的來源。
  // 平面預設中心在原點，而卡面座標的原點在左下 ⇒ 平移半張卡。
  const planeGeo = new PlaneGeometry(W, H)
  const planeMat = new MeshBasicMaterial({ visible: false })
  const plane = new Mesh(planeGeo, planeMat)
  plane.position.set(W / 2, H / 2, 0)
  card.add(plane)

  const ray = new Raycaster()
  const ndc = new Vector2()

  /**
   * ★★★ 裁切修正 —— 取代舊版那一整段 `fovAdjust` 算術。
   *
   * 問題：Controller 的投影矩陣涵蓋**整張輸入影像**（inputWidth × inputHeight），
   * 但畫面上的 <video> 是 `object-fit: cover`——容器與影像長寬比不同時，
   * 影像會被**裁掉**一部分。3D 若照抄原投影矩陣，就會與看得見的影像對不上，
   * 症狀是「模型浮在卡片上方」或「靠邊時偏移特別明顯」。
   *
   * 解法（精確，不是近似）：
   *   cover 的縮放 s = max(cw/iw, ch/ih)，可見的影像區域是 (cw/s) × (ch/s)。
   *   影像像素 px 在整張影像裡的 NDC 是            X = 2·px/iw − 1
   *   在可見區域裡的 NDC 是                        X' = X · iw/(cw/s)
   *   ⇒ 把投影矩陣的第 0 列整列乘 kx = iw·s/cw、第 1 列整列乘 ky = ih·s/ch。
   *   （cover 的定義保證兩者其中一個恰好是 1，另一個 ≥ 1。）
   *
   * ⚠️ 這裡改的是**列**不是行。three 的矩陣陣列是 column-major，所以第 0 列是
   *    索引 0,4,8,12、第 1 列是 1,5,9,13。搞混的話橫向與縱向的修正會互換，
   *    在正方形畫面上完全看不出來——又是一個「只在某些裝置上歪掉」的坑。
   * ⚠️ 這一版**不用** `camera.fov`／`aspect`／`updateProjectionMatrix()`：
   *    只要有人呼叫 updateProjectionMatrix，我們寫進去的值就被覆蓋掉了。
   */
  function setViewport(containerW, containerH, videoW, videoH) {
    const m = Array.from(baseProj)
    if (containerW > 0 && containerH > 0 && videoW > 0 && videoH > 0) {
      const s = Math.max(containerW / videoW, containerH / videoH)
      const kx = (videoW * s) / containerW
      const ky = (videoH * s) / containerH
      for (const i of [0, 4, 8, 12]) m[i] *= kx
      for (const i of [1, 5, 9, 13]) m[i] *= ky
    }
    camera.projectionMatrix.fromArray(m)
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  }

  /** 姿態：null＝追丟（整個節點藏起來）。 */
  function setPose(m16) {
    if (!m16) { card.visible = false; return }
    card.visible = true
    card.matrix.fromArray(m16)
    // ⚠️ 關了 matrixAutoUpdate 之後，子節點的世界矩陣要自己更新，
    //    否則 raycast 打到的是上一幀的位置（內容面板會慢一拍、且會誤判熱區）。
    card.updateMatrixWorld(true)
  }

  /**
   * 螢幕座標 → 卡面 UV。打不到卡面回 null。
   * @param nx,ny NDC（−1..1，y 朝上）
   */
  function uvAt(nx, ny) {
    if (!card.visible) return null
    ndc.set(nx, ny)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObject(plane, false)[0]
    if (!hit?.point) return null
    // ⚠️ 走「世界座標 → 卡片節點的區域座標」，**不要**直接吃 `hit.uv`：
    //    PlaneGeometry 的 uv 原點在左下、v 朝上，與卡面 UV（左上、v 朝下）
    //    差一個翻轉，兩層符號疊起來最容易寫反。走 cardToUv 只有一個已驗證的換算。
    const local = card.worldToLocal(hit.point.clone())
    return cardToUv(local.x, local.y, W, H)
  }

  let disposeChar = null
  let actor = null

  /**
   * 掛上 3D 角色，並讓它站在某個熱區上。
   * @param hotspot 站位（用它的中心），沒有就站卡片中央
   */
  async function mountCharacter(hotspot) {
    // ⚠️ three ＋ 角色層一律懶載入：實測那一包 gzip 後 137.5 KB。
    const [{ buildCharacter, NAPA_CABBAGE }, { createActor }] = await Promise.all([
      import('../lib/char/factory.js'),
      import('../lib/char/actor.js'),
    ])
    // AR 要與追蹤共用 GPU：lod 0.6 ＋ 只描一層邊 ＝ draw call 87、三角形 75,274
    const char = buildCharacter(NAPA_CABBAGE, { lod: 0.6, outlineLayers: 1 })
    const pivot = new Group()
    // 角色是 Y 軸朝上建的；卡面是 z=0 平面、離開紙面是 +z ⇒ 繞 X 轉 +90°。
    // ⚠️ 轉 −90° 角色會插進桌子裡（頭頂比腳底更遠離觀看者），而正面看幾乎一樣。
    char.root.rotation.x = Math.PI / 2
    pivot.add(char.root)

    // 依包圍盒縮到「卡片寬度的 32%」高。
    // ⚠️ 不可寫死縮放值：角色幾何改版（葉片層數／高度）時寫死的值會讓它突然變兩倍大。
    const box = new Box3().setFromObject(char.root)
    const size = new Vector3(); box.getSize(size)
    const tall = Math.max(size.x, size.y, size.z) || 1
    pivot.scale.setScalar((W * 0.32) / tall)

    const [cu, cv] = hotspot ? rectCenter(hotspot.rect) : [0.5, 0.5]
    const [x, y, z] = uvToCard(cu, cv, W, H)
    pivot.position.set(x, y, z)

    card.add(pivot)
    actor = createActor(char, { action: 'present', reduceMotion: prefersReduce() })
    disposeChar = () => {
      card.remove(pivot)
      try { char.dispose?.() } catch { /* ignore */ }
    }
    return { setAction: (a) => actor?.setAction(a) }
  }

  /**
   * 容器大小或影像解析度變了（轉向、換鏡頭）就要呼叫。
   * ⚠️ 換鏡頭後**一定**要重新呼叫：解析度變了而投影矩陣沒跟著換，模型會整個偏掉。
   *    舊版就是漏了這一步（換完只改 srcObject），所以手動換鏡頭之後反而更歪。
   */
  function resize(containerW, containerH, videoW, videoH) {
    if (!containerW || !containerH) return
    renderer.setSize(containerW, containerH, false)
    setViewport(containerW, containerH, videoW, videoH)
  }

  let last = performance.now()
  function render(now) {
    const t = now ?? performance.now()
    // 分頁回前景時不讓動作一次跳好幾秒
    actor?.update(Math.min(t - last, 100))
    last = t
    renderer.render(scene, camera)
  }

  function dispose() {
    try { disposeChar?.() } catch { /* ignore */ }
    planeGeo.dispose(); planeMat.dispose()
    for (const l of lights) l.dispose?.()
    // ⚠️ forceContextLoss 不可省：行動裝置能同時存在的 WebGL context 常見上限
    //    8–16，SPA 反覆進出這一頁不釋放的症狀是「第 N 次打開變成空白」，
    //    而前面幾次都正常。
    try { renderer.dispose(); renderer.forceContextLoss?.() } catch { /* ignore */ }
  }

  /** 診斷用：一張截圖就能看出關鍵環境。 */
  function deviceInfo() {
    const gl = renderer.getContext()
    let vendor = '—', model = '—'
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info')
      if (dbg) {
        vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '—'
        model = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '—'
      }
    } catch { /* 部分瀏覽器擋這個擴充 */ }
    return {
      gpu: `${vendor} / ${model}`,
      webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? '是' : '否',
      dpr: (devicePixelRatio || 1).toFixed(2),
    }
  }

  return { setPose, setViewport, uvAt, mountCharacter, resize, render, dispose, deviceInfo, targetSize: [W, H] }
}
