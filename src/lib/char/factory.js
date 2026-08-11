// ============================================================================
// 角色工廠 —— 吃 preset，吐一棵可以直接 add 進 scene 的 THREE.Group
//
// 節點結構（★ 與原 demo 不同，理由見下）：
//
//   root            不動。掛進場景的就是它，接觸陰影也掛在這裡
//    ├─ blob        接觸陰影（永遠貼地）
//    └─ body        ★ 動作驅動作用在這一層：位移／縮放／旋轉
//        ├─ core    菜芯
//        ├─ leafRoot × 5   每層葉子（葉子擺動作用在這裡）
//        │   └─ holder × n → leaf mesh（+ 描邊子節點）
//        ├─ hip × 2 → 腿
//        ├─ arm × 2 → 手臂
//        └─ face    臉部貼片（掛在第 4 層葉子底下）
//
// ⚠️ 原 demo 把接觸陰影放在**場景層級**並用 getElementById('blob') 抓，
//    註解寫著「掛在角色底下會跟著跳起來」——這個觀察是對的，但解法讓角色
//    無法多實例（策畫書 §6.2 #7）。正解是多一層：root 不動、body 才動，
//    陰影掛 root。這樣既是角色的子節點（可以有很多隻），又不會跟著跳。
//    ⚠️ 別「照字面」把陰影改成 body 的子節點——那會讓陰影跟著跳躍飛起來，
//    看起來像角色黏著一塊地板。
// ============================================================================
import {
  Group, Object3D, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry,
  CanvasTexture, Color, SRGBColorSpace,
} from 'three'
import {
  PAL, DEG, buildLeafGeometry, buildCoreGeometry, buildLimbGeometry,
  buildFacePatch, buildRootBall,
} from './geometry.js'
import { makeToonMaterial, addOutline, makeToonRamp, FACE_TOON } from './material.js'
import { faceTexture, disposeFaceCache } from './face.js'
import { MeshToonMaterial } from 'three'

/**
 * 結球白菜 —— 第一個 preset（移植自 demo _6）。
 * 量產角色時只允許改這裡的色票與比例，材質參數鎖在 material.js。
 *
 * ⚠️ `kAz` 必須等於該層的葉片數 `n`、`kRib` 等於 `2n`（factory 自動推導，
 *    不要在 preset 裡手動覆寫）。理由見 geometry.js 檔頭 ①：
 *    頻率不是葉片數的整數倍時，同層葉片會互相穿模。
 */
export const NAPA_CABBAGE = {
  id: 'napa-cabbage',
  name: '結球白菜',
  // 葉片從 y=0 往上長，整組往下移半個身高，角色中心才在原點附近
  baseY: -0.595,
  layers: [
    { r: 0.246, h: 1.100, flare: 0.01, half: 82, n: 6, green: 0.55, crinkle: 0.010, tone: 0.93, drop: 0.30, ruf: 0.016, rib: 0.008, segU: 28, segV: 12, out: false },
    { r: 0.298, h: 1.140, flare: 0.01, half: 66, n: 9, green: 0.72, crinkle: 0.014, tone: 0.95, drop: 0.36, ruf: 0.020, rib: 0.010, segU: 28, segV: 12, out: false },
    { r: 0.346, h: 1.165, flare: 0.01, half: 54, n: 12, green: 0.86, crinkle: 0.020, tone: 0.97, drop: 0.44, ruf: 0.026, rib: 0.013, segU: 30, segV: 20, out: false },
    { r: 0.386, h: 1.180, flare: 0.01, half: 44, n: 15, green: 0.95, crinkle: 0.026, tone: 0.99, drop: 0.50, ruf: 0.030, rib: 0.015, segU: 28, segV: 20, out: false },
    { r: 0.436, h: 1.190, flare: 0.01, half: 52, n: 12, green: 1.00, crinkle: 0.032, tone: 1.00, drop: 0.54, ruf: 0.030, rib: 0.017, segU: 30, segV: 24, out: true },
  ],
  // 最外層（臉在上面那層）的擺幅要單獨壓小，臉才不會晃得歪來歪去
  layerAmp: [0.45, 0.80, 1.20, 1.55, 0.42],
  core: { radius: 0.238, height: 1.185 },
  rootBall: { radius: 0.168, squashY: 0.60, lift: 0.020 },
  face: { azHalf: 44, uLo: 0.14, uHi: 0.62, extra: 0.011, segX: 44, segY: 40 },
  // demo `_6` 的 blob-shadow：plane 1.30×1.30（半徑 0.65）、opacity 0.26。
  // groundY ＝ 腳底高度（demo：blob 世界 y 0.005 − bodyRoot 0.790 ＝ −0.785）。
  blob: { radius: 0.65, opacity: 0.26, color: PAL.blob, groundY: -0.785 },
}

// ⚠️ 同層每片往外推一階（3 階循環，葉數都取 3 的倍數，接縫才不會兩片同高）。
//    臉那片 i=0 最外，鄰葉依序內縮——不做這件事，同層葉片會互相穿插把臉蓋掉。
const R_STEP = 0.0200
// 3 種高度輪替（打散「頂端排成一圈尖刺」的規律性），每層只多 2 份 geometry。
const HV = [1.00, 0.958, 0.983]

/**
 * 接觸陰影。**每個數字都對齊 demo `_6` 的 `blob-shadow` 元件**：
 * 128px 貼圖、漸層 0→1／0.42→0.72／1→0、plane 1.30×1.30、opacity 0.26。
 *
 * ⚠️ 顏色走 `color` 而不是烘進 canvas：demo 是「白色漸層貼圖 × material.color」，
 *    烘進去的話 `PAL.blob` 就沒有作用了。
 * ⚠️ `groundY` 是**角色腳底的高度**，不是 0。demo 的 blob 在世界 y=0.005 而
 *    bodyRoot 在 0.790 ⇒ 相對角色 −0.785。移植時誤用了另一支 demo 的
 *    「腳踩 y=0」座標系而寫成 +0.006，結果是一圈半透明圓盤從白菜**腰部**
 *    橫向突出（實測該高度葉外緣 0.434、陰影半寬 0.58，凸出 0.15 一整圈）。
 */
function makeBlobShadow({ radius, opacity, color, groundY }) {
  let map = null
  if (typeof document !== 'undefined') {
    const size = 128, cv = document.createElement('canvas'); cv.width = cv.height = size
    const ctx = cv.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0.00, 'rgba(255,255,255,1)')
    g.addColorStop(0.42, 'rgba(255,255,255,0.72)')
    g.addColorStop(1.00, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
    map = new CanvasTexture(cv); map.colorSpace = SRGBColorSpace
  }
  const m = new Mesh(
    new PlaneGeometry(radius * 2, radius * 2),
    new MeshBasicMaterial({
      map, color: new Color(color), transparent: true, opacity,
      depthWrite: false, toneMapped: false,
    }))
  m.rotation.x = -Math.PI / 2; m.position.y = groundY; m.renderOrder = -50
  m.name = 'blob'
  return m
}

/**
 * 組出一隻角色。
 * @returns {{ root, body, blob, leafRoots, arms, hips, faceMesh, setExpression, dispose, stats }}
 */
export function buildCharacter(preset = NAPA_CABBAGE, { lod = 1, outlineLayers = 2 } = {}) {
  const P = preset
  const baseY = P.baseY
  const root = new Group(); root.name = `char-${P.id}`
  const body = new Group(); body.name = 'body'
  root.add(body)

  const owned = { geometries: [], materials: [] }
  const track = (g, m) => { if (g) owned.geometries.push(g); if (m) owned.materials.push(m) }
  // AR 模式把細分降 40%（策畫書 §6.2 #13）——追蹤與算繪共用 CPU/GPU
  const seg = (v) => Math.max(3, Math.round(v * lod))

  const mkMesh = (geo, mat, outline) => {
    const mesh = new Mesh(geo, mat)
    mesh.castShadow = true; mesh.receiveShadow = true
    track(geo, mat)
    if (outline) track(null, addOutline(mesh, outline).material)
    return mesh
  }

  const oLeaf = { thickness: 0.0030, color: PAL.oLeaf }
  const oLimb = { thickness: 0.0032, color: PAL.oLimb }

  // ── 菜心：把中間堵住，不然從上面看得到空心 ──
  const core = mkMesh(
    buildCoreGeometry({ ...P.core, segH: seg(56), segR: seg(40) }),
    makeToonMaterial({ vertexColors: true, rimAmount: 0.14 }))
  core.position.y = baseY
  body.add(core)

  // ── 葉子（5 層共 54 片）──
  const leafRoots = []
  const leafGeoCache = new Map()
  P.layers.forEach((L, li) => {
    const layerRoot = new Group()
    layerRoot.position.y = baseY
    body.add(layerRoot)
    // ⚠️ `index` 是**層序號**，demo 的擺動相位直接用它（x 軸 L*0.9、z 軸 L*1.4），
    //    兩軸的相位偏移不一樣。先前存的 `phase = li * 1.1` 是移植時自己編的
    //    單一相位，兩軸只好共用 ⇒ 五層變成同步擺動而不是依序traveling。
    leafRoots.push({ node: layerRoot, index: li, amp: P.layerAmp[li] })

    for (let i = 0; i < L.n; i++) {
      const isFace = L.out && i === 0
      // 方位角：外層對齊 0（臉那片），內層錯開半格避免縫對縫
      const az = (i / L.n) * 360 + (L.out ? 0 : (li % 2 ? 180 / L.n : 0))
      const vi = isFace ? 0 : (i % 3)
      // ⚠️ 幾何 key 必須含 face 旗標：臉那片的 faceClear/gLift 不同，
      //    共用到別片會讓其他葉子中間出現一塊莫名的白色平面。
      const key = `${li}|${i % 3}|${isFace ? 'f' : ''}`
      let geo = leafGeoCache.get(key)
      if (!geo) {
        geo = buildLeafGeometry({
          faceClear: isFace ? 1 : 0,
          gLift: isFace ? 0.20 : 0,
          rAdd: -(i % 3) * R_STEP,
          radius: L.r, hRef: L.h, height: L.h * HV[vi],
          flare: L.flare, half: L.half, thickness: 0.020,
          crinkle: L.crinkle, green: L.green, tone: L.tone,
          edgeDrop: L.drop, ruffle: L.ruf,
          // ★ 頻率鎖成葉片數的整數倍（見 geometry.js 檔頭 ①）
          kAz: L.n, kRib: 2 * L.n,
          fine: L.crinkle * 0.40, ribAmp: L.rib,
          // 鄰葉邊緣落在本片上的位置
          tsh: 1 - (360 / L.n) / L.half,
          segU: seg(L.segU), segV: seg(L.segV),
        })
        leafGeoCache.set(key, geo)
        owned.geometries.push(geo)
      }
      const azNode = new Group()
      azNode.rotation.y = az * DEG
      layerRoot.add(azNode)
      const tiltNode = new Group()
      // 打散規律性：每片微幅前後／左右傾（臉那片不動，五官才不會歪）
      tiltNode.rotation.x = (isFace ? 0 : (-2.5 + (i % 3) * 2.5)) * DEG
      tiltNode.rotation.z = (isFace ? 0 : ((i % 2) ? 3.0 : -3.0)) * DEG
      azNode.add(tiltNode)

      const mat = makeToonMaterial({
        vertexColors: true, rimAmount: L.out ? 0.11 : 0.06,
      })
      owned.materials.push(mat)
      const mesh = new Mesh(geo, mat)   // 幾何共用，不進 owned（上面已記一次）
      mesh.castShadow = true; mesh.receiveShadow = true
      // ⚠️ 54 片葉子每片都描邊會讀成芹菜稈：預設只描最外兩層。
      //    AR 模式傳 outlineLayers: 1 只描最外層——draw call 從 102 降到 87，
      //    符合策畫書 §6.1 給 AR 的 ≤90（LOD 只降細分，不會減少 draw call）。
      if (li >= P.layers.length - outlineLayers) {
        owned.materials.push(addOutline(mesh, oLeaf).material)
      }
      tiltNode.add(mesh)
      if (isFace) leafRoots[li].faceNode = tiltNode
    }
  })

  // ── 菜根：葉片底端是平的開口，要有東西蓋住 ──
  // ⚠️ **不描邊**：demo 的 outline 是 `enabled: false`（建了殼但隱藏，只有 UI 勾
  //    「內層也描邊」才會亮）。無條件描邊的話，菜根只從葉子底下露出約 0.03 的
  //    一小圈，那一圈幾乎整條變成 #7E9450 深綠線，底部看起來像有一道髒接縫。
  const rb = mkMesh(buildRootBall({ radius: P.rootBall.radius, segW: seg(30), segH: seg(20) }),
    makeToonMaterial({ color: PAL.cream, rimAmount: 0.14 }))
  rb.position.y = baseY + P.rootBall.lift
  rb.scale.set(1, P.rootBall.squashY, 1)
  body.add(rb)

  // ★★★ 四肢的每一個數字都來自 demo `_6`（2026-08-11 從跑起來的 demo 實測，
  //   不是從原始碼讀的）。**不要憑感覺調**——見下方 ARM/HIP 的長註解。
  //
  // 四肢的幾何左右同形（鏡像靠位置與旋轉做），建一次共用即可——
  // 與葉片快取同一個道理，各建一份等於白白多四份幾何。
  const limbGeo = {
    leg: buildLimbGeometry({ rBot: 0.050, rTop: 0.058, len: 0.130, segR: seg(24), segV: seg(10) }),
    foot: new SphereGeometry(0.068, seg(26), seg(18)),
    arm: buildLimbGeometry({ rBot: 0.042, rTop: 0.051, len: 0.120, segR: seg(26), segV: seg(12) }),
    hand: new SphereGeometry(0.060, seg(26), seg(18)),
  }
  owned.geometries.push(...Object.values(limbGeo))

  /** 共用幾何版的 mkMesh：幾何不進 owned（上面已記一次） */
  const mkShared = (geo, mat, outline) => {
    const mesh = new Mesh(geo, mat)
    mesh.castShadow = true; mesh.receiveShadow = true
    owned.materials.push(mat)
    if (outline) owned.materials.push(addOutline(mesh, outline).material)
    return mesh
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ★★★★ 四肢的座標系：**只能來自 `大白菜擬人-動作展示_6.html`**
  //
  // 2026-08-11 使用者回報「手的位置不對」，追出來的原因是：
  // 菜身（菜心／5 層葉／菜根／臉貼片）逐字取自 `_6`，**四肢、接觸陰影、相機
  // 卻是從另一支 demo `白菜擬人-cel-demo_4.html` 抄來的**（該檔第 1107–1111 行
  // 的 `limbs` preset：armX 0.382／armY 0.600／armR 0.053／armL 0.135／
  // handR 0.072／handY −0.222／legR 0.056／legL 0.100／legX 0.112／
  // footR 0.080／footSc '1 0.60 1.35'／cam.y 0.62 —— 一個不差，全部對得上）。
  //
  // ⚠️ 那支 demo 的**原點完全不同**：它的菜身基準是 `baseY = +0.19`、角色腳踩
  //    在 y = 0；`_6` 的菜身基準是 −0.595、地面在 bodyRoot 空間的 y = −0.785。
  //    兩套座標系混在一起的後果（實測）：
  //      手臂樞紐 y = +0.600 ⇒ 落在身高 1.19 的 **100%** 處
  //                          ⇒ 兩隻手從菜頂兩側戳出來，就是使用者說的「天線」
  //      髖關節   y = +0.218 ⇒ 身高的 68% ⇒ 兩條腿整個包在菜心與內層葉之間，
  //                          從外面一根都看不到（白菜看起來沒有腿）
  //      接觸陰影 y = +0.006 ⇒ 一圈半透明圓盤從腰部橫向突出（呼拉圈）
  //    這**不是三個獨立的 typo，是同一個成因**。
  //
  // ⚠️ 所以：改這一段之前，先確認你手上的數字是從 `_6` 來的。
  //    驗證方式（不必開瀏覽器）：`scripts/check-char.mjs` 有一張 DEMO6 對照表，
  //    那些值是把 `_6` 跑起來之後從 `object3D` 直接讀出來的，不是抄原始碼。
  // ══════════════════════════════════════════════════════════════════════════

  // ── 腿（包一層髖關節，動作才能繞著髖部擺動）──
  const hips = []
  for (const s of [-1, 1]) {
    const hip = new Group()
    hip.position.set(s * 0.116, -0.512, 0.044)
    // ★ 外八是靠**髖的 y 軸**旋轉做的（demo 建立時寫死 ∓10°，actor 只寫
    //   rotation.x，所以這個值永遠留著）。先前移植成「小腿自己 rotation.z 傾 7°」
    //   ——那是 cel-demo_4 的做法，而且腳掌不會跟著轉，膠囊下端會偏離腳掌中心。
    hip.rotation.y = s * 10 * DEG
    body.add(hip); hips.push(hip)
    const leg = mkShared(limbGeo.leg, makeToonMaterial({ color: PAL.limb, rimAmount: 0.16 }), oLimb)
    leg.position.y = -0.100
    hip.add(leg)
    const foot = mkShared(limbGeo.foot, makeToonMaterial({ color: PAL.limb, rimAmount: 0.18 }), oLimb)
    foot.scale.set(1.02, 0.80, 1.58); foot.position.set(0, -0.208, 0.036)
    hip.add(foot)
  }

  // ── 手臂 ──
  const arms = []
  for (const s of [-1, 1]) {
    const holder = new Group()
    // ⚠️ z = 0.118 不是隨便的：demo 的註解寫「樞紐要貼著表面，不然一抬手就沒入菜身」。
    holder.position.set(s * 0.398, -0.307, 0.118)
    // actor 每幀會覆寫成 s*(44 + armA)；這裡先給 44 只是為了「actor 還沒跑第一幀
    // 之前手臂不會直挺挺垂著」，兩者是指派不是相加，不會打架。
    holder.rotation.z = s * 44 * DEG
    body.add(holder); arms.push(holder)
    const upper = mkShared(limbGeo.arm, makeToonMaterial({ color: PAL.limb, rimAmount: 0.18 }), oLimb)
    upper.position.y = -0.098
    holder.add(upper)
    const hand = mkShared(limbGeo.hand, makeToonMaterial({ color: PAL.limb, rimAmount: 0.20 }), oLimb)
    hand.position.y = -0.212
    hand.scale.set(1, 0.96, 0.98)
    holder.add(hand)
  }

  // ── 頂芽 ──
  // ★ demo 的註解逐字寫了理由：「葉尖在頂點收攏處會留下小縫，塞一顆小球擋住」。
  //   這一顆在移植時**整個漏掉了**，而 check-char 的「幾何份數 24」還把這個
  //   缺件鎖了起來（24 剛好是「有陰影、沒頂芽」的數字）。實測 y=1.18 處菜心
  //   已收到半徑 0.0156、最近的葉面還在 0.0578 ⇒ 頭頂正中央有一圈寬 0.042 的凹坑。
  const bud = mkMesh(
    new SphereGeometry(0.098, seg(24), seg(16)),
    makeToonMaterial({ color: PAL.greenHi, rimAmount: 0.16 }))
  bud.position.y = baseY + 1.118
  bud.scale.set(1, 0.80, 1)
  bud.name = 'bud'
  body.add(bud)

  // ── 臉：掛在有 face 旗標的葉層底下（layerRoot 的位移先扣回去）──
  // ── 臉部貼片：貼在最外層那片「臉葉」的曲面上 ──
  // ⚠️ 掛在 faceNode（那片葉子的 tilt 節點）而不是 layerRoot：
  //    臉必須跟著那片葉子動，否則葉子擺動時五官會滑出去。
  const faceLayerIdx = P.layers.findIndex(L => L.out)
  const FL = P.layers[faceLayerIdx]
  // ⚠️ 臉用**自己的** ramp（3 階、暗部 0.66），不可與身體共用。
  //    demo 特地把臉的 lo 反向調高就是為了讓五官永遠亮著（見 FACE_TOON 的註解）。
  const faceMat = new MeshToonMaterial({
    map: faceTexture(P.id, 'normal'), transparent: true, depthWrite: false,
    gradientMap: makeToonRamp(FACE_TOON.steps, FACE_TOON.shadowFloor),
  })
  const faceGeo = buildFacePatch({
    radius: FL.r, height: FL.h, flare: FL.flare, thickness: 0.020,
    crinkle: FL.crinkle, fine: FL.crinkle * 0.40, ribAmp: FL.rib,
    azHalf: P.face.azHalf, uLo: P.face.uLo, uHi: P.face.uHi,
    extra: P.face.extra, segX: seg(P.face.segX), segY: seg(P.face.segY),
  })
  const faceMesh = new Mesh(faceGeo, faceMat)
  // demo 是 5。目前場景裡只有臉與接觸陰影兩個透明物，2 也排得對，
  // 但 5 留的餘裕大得多——日後再加任何透明疊層（特效、標籤、AR 疊加），
  // 2 很容易被蓋過去。
  faceMesh.renderOrder = 5
  owned.geometries.push(faceGeo); owned.materials.push(faceMat)
  ;(leafRoots[faceLayerIdx].faceNode ?? leafRoots[faceLayerIdx].node).add(faceMesh)

  // ── 標籤錨點 ──
  // 給 DOM 標籤（品種／產地／俗語那些膠囊）用的 3D 掛點。
  // ⚠️ 掛在**葉層**上而不是 root：這樣標籤會跟著角色呼吸、跳躍、擺葉一起動，
  //    看起來是「長在它身上」而不是「浮在旁邊的 UI」。
  // ⚠️ 一律用 Object3D 不要用 Mesh——這些點不需要被畫出來，
  //    做成 Mesh 會白白多幾個 draw call（而 draw call 是 AR 的瓶頸）。
  const anchors = []
  {
    // 環繞一圈：角度錯開、高度錯開，標籤才不會擠在一起
    // ⚠️ 角度一律留在**前半球（|az| < 90）**：cos(az) 為負就跑到模型背面，
    //    標籤會被白菜整個擋住。第一版用了 ±118 度，實測 z 是 −0.21（在背後）。
    //    螢幕上的水平位置 ∝ r·sin(az)，所以 −70/−44/0/50/66 已經夠散開。
    const spec = [
      { layer: 4, az: -70, h: 0.80 },
      { layer: 4, az: 66, h: 0.66 },
      { layer: 3, az: -44, h: 0.44 },
      { layer: 3, az: 50, h: 0.30 },
      { layer: 4, az: 0, h: 0.96 },
    ]
    for (const a of spec) {
      const li = Math.min(a.layer, P.layers.length - 1)
      const L = P.layers[li]
      const node = new Object3D()
      const rad = a.az * DEG
      // 半徑取該層的外緣再往外一點，標籤才不會壓在葉子上
      const r = L.r * 1.18
      node.position.set(r * Math.sin(rad), L.h * a.h, r * Math.cos(rad))
      leafRoots[li].node.add(node)
      anchors.push(node)
    }
  }

  // ── 接觸陰影：掛 root 不掛 body（見檔頭）──
  const blob = makeBlobShadow(P.blob)
  owned.geometries.push(blob.geometry); owned.materials.push(blob.material)
  root.add(blob)

  let expr = 'normal'
  return {
    root, body, blob, leafRoots, arms, hips, faceMesh, anchors, preset: P,
    get expression() { return expr },
    setExpression(name) {
      if (expr === name) return
      expr = name
      const t = faceTexture(P.id, name)
      if (t && faceMat.map !== t) { faceMat.map = t; faceMat.needsUpdate = true }
    },
    // ⚠️ SPA 反覆進出抽屜必爆的洩漏點（策畫書 §6.2 #12）：
    //    幾何／材質／紋理都在 GPU 上，React unmount 不會自動回收。
    //    ramp cache 是跨角色共用的，**不在這裡 dispose**。
    dispose() {
      for (const g of owned.geometries) g.dispose()
      for (const m of owned.materials) { m.map?.dispose(); m.dispose() }
      disposeFaceCache(P.id)
      owned.geometries.length = 0; owned.materials.length = 0
    },
    stats() {
      let meshes = 0, triangles = 0
      const geos = new Set()
      root.traverse((o) => {
        if (!o.isMesh) return
        meshes++
        geos.add(o.geometry)
        const idx = o.geometry.getIndex()
        triangles += (idx ? idx.count : o.geometry.attributes.position.count) / 3
      })
      return { meshes, triangles: Math.round(triangles), geometries: geos.size }
    },
  }
}
