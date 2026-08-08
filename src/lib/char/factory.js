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
  Group, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry,
  CanvasTexture, Color, SRGBColorSpace,
} from 'three'
import {
  PAL, DEG, buildLeafGeometry, buildCoreGeometry, buildLimbGeometry,
  buildFacePatch, buildRootBall,
} from './geometry.js'
import { makeToonMaterial, addOutline, makeToonRamp } from './material.js'
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
  blob: { radius: 0.58, opacity: 0.30, color: PAL.blob },
}

// ⚠️ 同層每片往外推一階（3 階循環，葉數都取 3 的倍數，接縫才不會兩片同高）。
//    臉那片 i=0 最外，鄰葉依序內縮——不做這件事，同層葉片會互相穿插把臉蓋掉。
const R_STEP = 0.0200
// 3 種高度輪替（打散「頂端排成一圈尖刺」的規律性），每層只多 2 份 geometry。
const HV = [1.00, 0.958, 0.983]

function makeBlobShadow({ radius, opacity, color }) {
  let map = null
  if (typeof document !== 'undefined') {
    const size = 128, cv = document.createElement('canvas'); cv.width = cv.height = size
    const ctx = cv.getContext('2d')
    const c = new Color(color).convertLinearToSRGB()
    const rgb = [c.r * 255 | 0, c.g * 255 | 0, c.b * 255 | 0].join(',')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0.0, `rgba(${rgb},1)`)
    g.addColorStop(0.5, `rgba(${rgb},0.75)`)
    g.addColorStop(1.0, `rgba(${rgb},0)`)
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
    map = new CanvasTexture(cv); map.colorSpace = SRGBColorSpace
  }
  const m = new Mesh(
    new PlaneGeometry(radius * 2, radius * 2),
    new MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, toneMapped: false }))
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006; m.renderOrder = -1
  m.name = 'blob'
  return m
}

/**
 * 組出一隻角色。
 * @returns {{ root, body, blob, leafRoots, arms, hips, faceMesh, setExpression, dispose, stats }}
 */
export function buildCharacter(preset = NAPA_CABBAGE, { lod = 1 } = {}) {
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
    leafRoots.push({ node: layerRoot, phase: li * 1.1, amp: P.layerAmp[li] })

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
      // ⚠️ 54 片葉子每片都描邊會讀成芹菜稈：只描最外兩層（li >= 3）。
      if (li >= 3) owned.materials.push(addOutline(mesh, oLeaf).material)
      tiltNode.add(mesh)
      if (isFace) leafRoots[li].faceNode = tiltNode
    }
  })

  // ── 菜根：葉片底端是平的開口，要有東西蓋住 ──
  const rb = mkMesh(buildRootBall({ radius: P.rootBall.radius, segW: seg(30), segH: seg(20) }),
    makeToonMaterial({ color: PAL.cream, rimAmount: 0.14 }), oLimb)
  rb.position.y = baseY + P.rootBall.lift
  rb.scale.set(1, P.rootBall.squashY, 1)
  body.add(rb)

  // 四肢的幾何左右同形（鏡像靠位置與旋轉做），建一次共用即可——
  // 與葉片快取同一個道理，各建一份等於白白多四份幾何。
  const limbGeo = {
    leg: buildLimbGeometry({ rBot: 0.048, rTop: 0.056, len: 0.10, segR: seg(26) }),
    foot: new SphereGeometry(0.080, seg(26), seg(18)),
    arm: buildLimbGeometry({ rBot: 0.042, rTop: 0.053, len: 0.135, segR: seg(26) }),
    hand: new SphereGeometry(0.072, seg(26), seg(18)),
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

  // ── 腿（包一層髖關節，動作才能繞著髖部擺動）──
  const hips = []
  for (const s of [-1, 1]) {
    const hip = new Group()
    hip.position.set(s * 0.112, 0.218, 0.02)
    body.add(hip); hips.push(hip)
    const leg = mkShared(limbGeo.leg, makeToonMaterial({ color: PAL.limb }), oLimb)
    leg.position.y = -0.106; leg.rotation.z = -s * 7 * DEG
    hip.add(leg)
    const foot = mkShared(limbGeo.foot, makeToonMaterial({ color: PAL.limb }), oLimb)
    foot.scale.set(1, 0.60, 1.35); foot.position.set(0, -0.173, 0.038)
    hip.add(foot)
  }

  // ── 手臂 ──
  const arms = []
  for (const s of [-1, 1]) {
    const holder = new Group()
    holder.position.set(s * 0.382, 0.600, 0.06)
    holder.rotation.z = s * 44 * DEG
    body.add(holder); arms.push(holder)
    const upper = mkShared(limbGeo.arm, makeToonMaterial({ color: PAL.limb }), oLimb)
    upper.position.y = -0.10
    holder.add(upper)
    const hand = mkShared(limbGeo.hand, makeToonMaterial({ color: PAL.limb }), oLimb)
    hand.position.y = -0.222
    holder.add(hand)
  }

  // ── 臉：掛在有 face 旗標的葉層底下（layerRoot 的位移先扣回去）──
  // ── 臉部貼片：貼在最外層那片「臉葉」的曲面上 ──
  // ⚠️ 掛在 faceNode（那片葉子的 tilt 節點）而不是 layerRoot：
  //    臉必須跟著那片葉子動，否則葉子擺動時五官會滑出去。
  const faceLayerIdx = P.layers.findIndex(L => L.out)
  const FL = P.layers[faceLayerIdx]
  const faceMat = new MeshToonMaterial({
    map: faceTexture(P.id, 'normal'), transparent: true, depthWrite: false,
    gradientMap: makeToonRamp(3, 0.46),
  })
  const faceGeo = buildFacePatch({
    radius: FL.r, height: FL.h, flare: FL.flare, thickness: 0.020,
    crinkle: FL.crinkle, fine: FL.crinkle * 0.40, ribAmp: FL.rib,
    azHalf: P.face.azHalf, uLo: P.face.uLo, uHi: P.face.uHi,
    extra: P.face.extra, segX: seg(P.face.segX), segY: seg(P.face.segY),
  })
  const faceMesh = new Mesh(faceGeo, faceMat)
  faceMesh.renderOrder = 2
  owned.geometries.push(faceGeo); owned.materials.push(faceMat)
  ;(leafRoots[faceLayerIdx].faceNode ?? leafRoots[faceLayerIdx].node).add(faceMesh)

  // ── 接觸陰影：掛 root 不掛 body（見檔頭）──
  const blob = makeBlobShadow(P.blob)
  owned.geometries.push(blob.geometry); owned.materials.push(blob.material)
  root.add(blob)

  let expr = 'normal'
  return {
    root, body, blob, leafRoots, arms, hips, faceMesh, preset: P,
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
