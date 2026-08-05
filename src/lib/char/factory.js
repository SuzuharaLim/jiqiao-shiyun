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
  PAL, DEG, buildLeafGeometry, buildCoreGeometry, buildLimbGeometry, buildFacePatch,
} from './geometry.js'
import { makeToonMaterial, addOutline, makeToonRamp } from './material.js'
import { faceTexture, disposeFaceCache } from './face.js'
import { MeshToonMaterial } from 'three'

/** 結球白菜 —— 第一個 preset。量產角色時只允許改這裡的色票與比例。 */
export const NAPA_CABBAGE = {
  id: 'napa-cabbage',
  name: '結球白菜',
  leafBaseY: 0.19,
  layers: [
    // ① 嫩芯：比外層高，葉尖從頂端縫隙冒出來
    {
      n: 4, radius: 0.150, height: 1.22, spread: 74, flare: 0.02, crinkle: 0.016,
      crinkleFreq: 2, topWave: 0.030, topWaveFreq: 2, edgeDrop: 0.44, thickness: 0.020,
      top: PAL.leafHeart, segU: 12, segV: 16, angles: [25, 115, 205, 295],
    },
    {
      n: 5, radius: 0.280, height: 0.88, spread: 58, flare: 0.04, crinkle: 0.020,
      crinkleFreq: 2, topWave: 0.030, topWaveFreq: 2, edgeDrop: 0.26, thickness: 0.024,
      top: PAL.leafA, segU: 12, segV: 18, offset: 36,
    },
    {
      n: 7, radius: 0.345, height: 0.98, spread: 52, flare: 0.05, crinkle: 0.034,
      crinkleFreq: 3, topWave: 0.045, topWaveFreq: 2, edgeDrop: 0.30, thickness: 0.026,
      top: PAL.leafB, segU: 14, segV: 24, offset: 25.7,
    },
    // ④ offset 0 → 正前方剛好是一片葉子的中心（crinkle 在 t=0 為零），臉貼這裡
    {
      n: 9, radius: 0.400, height: 1.06, spread: 46, flare: 0.08, crinkle: 0.044,
      crinkleFreq: 3, topWave: 0.055, topWaveFreq: 2, edgeDrop: 0.34, thickness: 0.028,
      top: PAL.leafC, segU: 18, segV: 30, offset: 0, face: true, outline: true,
    },
    // ⑤ 鬆脫的外層老葉。包覆角 ±42° + 角度從 82° 起跳 → 正面 ±40° 淨空，不壓到臉
    {
      n: 4, radius: 0.428, height: 0.80, spread: 42, flare: 0.26, crinkle: 0.056,
      crinkleFreq: 3, topWave: 0.070, topWaveFreq: 2, edgeDrop: 0.48, thickness: 0.030,
      top: PAL.leafOuter, segU: 16, segV: 26, angles: [82, 148, 212, 278], outline: true,
    },
  ],
  core: { height: 0.92, radius: 0.275, segments: 44 },
  face: { y0: 0.545, y1: 0.925, half: 30, extra: 0.022, segW: 28, segH: 22 },
  blob: { radius: 0.58, opacity: 0.30, color: '#8E96D6' },
}

// 每片葉子只有 3 種高度變體（打散「頂端排成一圈尖刺」的規律性），
// 原本每片各建一份 geometry ＝ 29 份；快取後只剩 15 份（策畫書 §6.2 #11）。
const HEIGHT_VARIANTS = [1.00, 0.90, 0.955]

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
  const baseY = P.leafBaseY
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

  const oLeaf = { thickness: 0.0032, color: PAL.inkLeaf }
  const oCream = { thickness: 0.0032, color: PAL.inkCream }

  // ── 菜芯 ──
  const core = mkMesh(
    buildCoreGeometry({ ...P.core, segments: seg(P.core.segments) }),
    makeToonMaterial({ color: PAL.cream }), oCream)
  core.position.y = baseY
  body.add(core)

  // ── 葉子 ──
  const leafRoots = []
  const leafGeoCache = new Map()
  P.layers.forEach((L, li) => {
    const layerRoot = new Group()
    layerRoot.position.y = baseY
    body.add(layerRoot)
    // 臉掛在這一層上，擺動幅度要壓小，否則五官會跟著晃
    leafRoots.push({ node: layerRoot, phase: li * 1.1, amp: L.face ? 0.35 : (0.5 + li * 0.28) })

    for (let i = 0; i < L.n; i++) {
      const ang = L.angles ? L.angles[i] : (L.offset + i * (360 / L.n))
      const hv = HEIGHT_VARIANTS[i % 3]
      const key = `${li}|${i % 3}`
      let geo = leafGeoCache.get(key)
      if (!geo) {
        geo = buildLeafGeometry({
          height: L.height * hv, radius: L.radius, spread: L.spread, flare: L.flare,
          crinkle: L.crinkle, crinkleFreq: L.crinkleFreq,
          topWave: L.topWave, topWaveFreq: L.topWaveFreq, edgeDrop: L.edgeDrop,
          thickness: L.thickness, colorBottom: PAL.cream, colorTop: L.top,
          segU: seg(L.segU), segV: seg(L.segV),
        })
        leafGeoCache.set(key, geo)
        owned.geometries.push(geo)
      }
      const holder = new Group()
      holder.rotation.y = ang * DEG
      layerRoot.add(holder)
      const mat = makeToonMaterial({ color: '#FFFFFF', vertexColors: true })
      owned.materials.push(mat)
      const mesh = new Mesh(geo, mat)   // 幾何共用，不進 owned（上面已記一次）
      mesh.castShadow = true; mesh.receiveShadow = true
      if (L.outline) owned.materials.push(addOutline(mesh, oLeaf).material)
      // 每片微幅傾斜，打散規律性
      mesh.rotation.x = (i === 0 ? 0 : (-2.5 + (i % 3) * 2.5)) * DEG
      mesh.rotation.z = (i === 0 ? 0 : ((i % 2) ? 3.0 : -3.0)) * DEG
      holder.add(mesh)
    }
  })

  // 四肢的幾何左右同形（鏡像靠位置與旋轉做），建一次共用即可——
  // 與葉片快取同一個道理，各建一份等於白白多四份幾何。
  const limbGeo = {
    leg: buildLimbGeometry({ radius: 0.056, length: 0.10 }),
    foot: new SphereGeometry(0.080, seg(26), seg(18)),
    arm: buildLimbGeometry({ radius: 0.053, length: 0.135 }),
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
    const leg = mkShared(limbGeo.leg, makeToonMaterial({ color: PAL.creamWarm }), oCream)
    leg.position.y = -0.106; leg.rotation.z = -s * 7 * DEG
    hip.add(leg)
    const foot = mkShared(limbGeo.foot, makeToonMaterial({ color: PAL.creamWarm }), oCream)
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
    const upper = mkShared(limbGeo.arm, makeToonMaterial({ color: PAL.creamWarm }), oCream)
    upper.position.y = -0.10
    holder.add(upper)
    const hand = mkShared(limbGeo.hand, makeToonMaterial({ color: PAL.creamWarm }), oCream)
    hand.position.y = -0.222
    holder.add(hand)
  }

  // ── 臉：掛在有 face 旗標的葉層底下（layerRoot 的位移先扣回去）──
  const faceLayerIdx = P.layers.findIndex(L => L.face)
  const FL = P.layers[faceLayerIdx]
  const faceMat = new MeshToonMaterial({
    map: faceTexture(P.id, 'normal'), transparent: true, depthWrite: false,
    gradientMap: makeToonRamp(3, 0.46),
  })
  const faceGeo = buildFacePatch(
    FL, P.face.y0, P.face.y1, P.face.half, P.face.extra, P.face.segW, P.face.segH, baseY)
  const faceMesh = new Mesh(faceGeo, faceMat)
  faceMesh.renderOrder = 2
  faceMesh.position.y = -baseY
  owned.geometries.push(faceGeo); owned.materials.push(faceMat)
  leafRoots[faceLayerIdx].node.add(faceMesh)

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
