// ============================================================================
// 角色幾何 —— 全部手刻，零外部 3D 資產
//
// 從《白菜擬人 · 動作展示》剝離出來的純 three 版本：原本每一段都包在
// AFRAME.registerGeometry 裡，A-Frame 只是幫忙把 schema 的預設值填進來。
// 這裡改成普通函式，React 與 A-Frame 都能吃，Node 也能直接跑測試
// （BufferGeometry 不需要 WebGL context）。
//
// ⚠️ 剝離時最容易踩的坑：**A-Frame 的 schema 預設值消失了**。
//    buildLeafGeometry 會讀 d.topWaveFreq，但 LAYERS 那五筆設定裡根本沒有這個欄位——
//    原本是靠 registerGeometry 的 schema 補上 2。直接把 LAYERS 丟進來的話
//    `Math.sin(undefined * ...)` 得到 NaN，整份 position 變 NaN，
//    computeVertexNormals 也跟著 NaN，畫面上是**模型整個不見**而不會拋錯。
//    所以這裡自己保留一份 DEFAULTS，check-char.mjs 有一項專測 NaN。
// ============================================================================
import {
  BufferGeometry, BufferAttribute, Float32BufferAttribute, Color,
  LatheGeometry, CapsuleGeometry, Vector2,
} from 'three'

export const DEG = Math.PI / 180

/** 色票 —— 量產角色時只允許改這裡與比例，材質參數鎖在 core（策畫書 R12）。 */
export const PAL = {
  cream: '#FDF8E6', creamWarm: '#F8EFCE',
  leafHeart: '#F1F3B8', leafA: '#DCE7A0', leafB: '#B7D47B',
  leafC: '#99C561', leafOuter: '#7DAE4A',
  eye: '#2B2436', mouth: '#7E4B52',
  inkLeaf: '#54683B', inkCream: '#7C6A44', inkDark: '#3B3348',
}

// 大白菜側輪廓（修長）：中段最鼓、頂端收攏
const BULGE = [0.62, 0.89, 0.97, 1.00, 1.01, 1.00, 0.98, 0.93, 0.84, 0.68, 0.44]
export function bulge(u) {
  const x = Math.min(0.9999, Math.max(0, u)) * 10, i = x | 0
  return BULGE[i] + (BULGE[i + 1] - BULGE[i]) * (x - i)
}
/** flare 只作用在上緣 40%：桶身維持直，只有葉尖散開 */
export function tipFlare(u) { const t = Math.max(0, (u - 0.60) / 0.40); return t * t }

const LEAF_DEFAULTS = {
  height: 1.02, radius: 0.345, spread: 46, flare: 0.08,
  crinkle: 0.044, crinkleFreq: 3, topWave: 0.055, topWaveFreq: 2,
  edgeDrop: 0.34, thickness: 0.028,
  colorBottom: PAL.cream, colorTop: PAL.leafC, segU: 18, segV: 30,
}

/**
 * 一片葉子。頂點色帶中肋（大白菜最好認的特徵）、雙面厚度、皺褶。
 * ⚠️ 一律 indexed + computeVertexNormals()——inverted-hull 描邊要靠平滑法線，
 *    非 indexed 的幾何法線在接縫處不連續，描邊會裂開。
 */
export function buildLeafGeometry(opts = {}) {
  const d = { ...LEAF_DEFAULTS, ...opts }
  const segU = Math.max(2, d.segU | 0), segV = Math.max(3, d.segV | 0)
  const half = d.spread * DEG, ringN = (segV + 1) * 2, rings = segU + 1
  const vCount = ringN * rings + 2
  const pos = new Float32Array(vCount * 3), uvs = new Float32Array(vCount * 2)
  const col = new Float32Array(vCount * 3)
  const cBot = new Color(d.colorBottom), cTop = new Color(d.colorTop)
  const tmp = new Color()
  let o = 0
  const cx = [0, 0], cy = [0, 0], cz = [0, 0]

  for (let i = 0; i < rings; i++) {
    const u = i / segU
    const R = d.radius * (bulge(u) + d.flare * tipFlare(u))
    const ha = half * (1.18 - 0.36 * u)          // 下寬上窄：底部包緊、頂端散開
    const g = Math.pow(Math.max(0, (u - 0.06) / 0.94), 1.15)
    const ao = 0.72 + 0.28 * Math.pow(u, 0.55)

    for (let k = 0; k < ringN; k++) {
      const outer = (k <= segV)
      const j = outer ? k : (ringN - 1 - k)
      const t = (j / segV) * 2 - 1, at = Math.abs(t)
      const th = d.thickness * (0.28 + 0.72 * Math.sin(Math.PI * j / segV))
      const w1 = Math.sin(d.crinkleFreq * Math.PI * t)       // 主皺褶
      const w2 = Math.sin(d.crinkleFreq * 3 * Math.PI * t)   // 高頻細褶
      const r = R + d.crinkle * u * (w1 + 0.32 * w2) + (outer ? th * 0.5 : -th * 0.5)
      const ang = t * ha
      const y = d.height * u * (1 - d.edgeDrop * at * t * t)
        + d.topWave * u * u * Math.sin(d.topWaveFreq * Math.PI * t)
      const px = r * Math.sin(ang), pz = r * Math.cos(ang)
      pos[o * 3] = px; pos[o * 3 + 1] = y; pos[o * 3 + 2] = pz
      uvs[o * 2] = j / segV; uvs[o * 2 + 1] = u

      // 中肋：每片葉子中央一條寬白脈往上延伸
      let rib = Math.max(0, 1 - at / 0.32); rib = rib * rib * (3 - 2 * rib)
      tmp.copy(cBot).lerp(cTop, g * (1 - 0.62 * rib))
      const shade = 1 + 0.10 * w1 + 0.045 * w2 - 0.12 * at * at * at
      const f = ao * (outer ? 1.0 : 0.80) * shade * (1 + 0.08 * rib)
      col[o * 3] = tmp.r * f; col[o * 3 + 1] = tmp.g * f; col[o * 3 + 2] = tmp.b * f

      if (i === 0) { cx[0] += px; cy[0] += y; cz[0] += pz }
      if (i === rings - 1) { cx[1] += px; cy[1] += y; cz[1] += pz }
      o++
    }
  }
  const capBot = o, capTop = o + 1
  for (let n = 0; n < 2; n++) {
    const ix = o + n, ri = n === 0 ? 0 : rings - 1, uu = ri / segU
    pos[ix * 3] = cx[n] / ringN; pos[ix * 3 + 1] = cy[n] / ringN; pos[ix * 3 + 2] = cz[n] / ringN
    uvs[ix * 2] = 0.5; uvs[ix * 2 + 1] = uu
    tmp.copy(cBot).lerp(cTop, Math.pow(Math.max(0, (uu - 0.06) / 0.94), 1.15))
    const f = (0.72 + 0.28 * Math.pow(uu, 0.55)) * 0.9
    col[ix * 3] = tmp.r * f; col[ix * 3 + 1] = tmp.g * f; col[ix * 3 + 2] = tmp.b * f
  }

  const idx = []
  for (let i = 0; i < segU; i++) {
    for (let k = 0; k < ringN; k++) {
      const k2 = (k + 1) % ringN
      const a = i * ringN + k, b = i * ringN + k2
      const c = (i + 1) * ringN + k2, e = (i + 1) * ringN + k
      idx.push(a, b, e, b, c, e)
    }
  }
  const topBase = (rings - 1) * ringN
  for (let k = 0; k < ringN; k++) {
    const kb = (k + 1) % ringN
    idx.push(capTop, topBase + k, topBase + kb)
    idx.push(capBot, kb, k)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('uv', new BufferAttribute(uvs, 2))
  geo.setAttribute('color', new BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

const CORE_PROFILE = [
  [0.03, 0.00], [0.17, 0.012], [0.27, 0.06], [0.34, 0.18], [0.385, 0.36],
  [0.40, 0.55], [0.385, 0.74], [0.335, 0.90], [0.24, 1.02], [0.13, 1.10], [0.03, 1.14],
]
/** 菜芯（Lathe 旋轉體） */
export function buildCoreGeometry({ height = 0.92, radius = 0.275, segments = 44 } = {}) {
  return new LatheGeometry(
    CORE_PROFILE.map(p => new Vector2(p[0] / 0.40 * radius, p[1] / 1.14 * height)), segments)
}

/** 四肢（膠囊）。r176+ 的新簽章：radius, length, capSegments, radialSegments, heightSegments */
export function buildLimbGeometry({ radius = 0.06, length = 0.14, capSegments = 10, radialSegments = 28 } = {}) {
  return new CapsuleGeometry(radius, length, capSegments, radialSegments, 1)
}

/**
 * 臉部貼片：完全貼合葉層外緣的曲面。
 * 五官畫在貼圖上，所以永遠不會歪也不會穿模——這比把眼睛做成獨立幾何穩得多。
 */
export function buildFacePatch(L, y0, y1, halfDeg, extra, segW, segH, baseY) {
  const half = halfDeg * DEG
  const pos = [], uvs = [], idx = []
  for (let i = 0; i <= segH; i++) {
    const v = i / segH, y = y0 + (y1 - y0) * v, u = (y - baseY) / L.height
    const r = L.radius * (bulge(u) + L.flare * tipFlare(u))
      + L.thickness * 0.5 + L.crinkle * u * 1.35 + extra
    for (let j = 0; j <= segW; j++) {
      const sx = j / segW, a = -half + 2 * half * sx
      pos.push(r * Math.sin(a), y, r * Math.cos(a)); uvs.push(sx, v)
    }
  }
  for (let i = 0; i < segH; i++) {
    for (let j = 0; j < segW; j++) {
      const a0 = i * (segW + 1) + j, b0 = a0 + 1, c0 = a0 + segW + 1, d0 = c0 + 1
      idx.push(a0, b0, c0, b0, d0, c0)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere()
  return g
}
