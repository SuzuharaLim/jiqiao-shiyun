// ============================================================================
// 角色幾何 —— 全部手刻，零外部 3D 資產
//
// 移植自《大白菜擬人 · 動作展示 _6》。原本每一段都包在 AFRAME.registerGeometry
// 裡，A-Frame 只是幫忙把 schema 的預設值填進來；這裡改成普通函式，React 與
// A-Frame 都能吃，Node 也能直接跑測試（BufferGeometry 不需要 WebGL context）。
//
// ⚠️ 剝離時最容易踩的坑：**A-Frame 的 schema 預設值消失了**。
//    少了預設值就是 `Math.sin(undefined)` = NaN，整份 position 變 NaN、
//    computeVertexNormals 也跟著 NaN，畫面上是**模型整個不見**而不會拋錯。
//    所以這裡自己保留 LEAF_DEFAULTS，check-char.mjs 有一項專測 NaN。
//
// ── 這一層最重要的三個設計決策（改壞了畫面會爛掉但不會報錯）──────────
//
// ① **皺褶的方位角頻率必須是葉片數的整數倍**（`kAz = n`、`kRib = 2n`）。
//    這樣 sin(k·(th − i·2π/n)) = sin(k·th)，同一層每片葉子落在**同一個曲面**上，
//    只差 rAdd 一階，永遠不會互相穿插。頻率隨便取的話葉片會彼此穿模。
//
// ② **半徑要用「世界高度 pu」取樣，不是這片葉子自己的 u**。
//    同層有 3 種高度變體，用自己的 u 會讓矮葉在同一個世界高度鼓到高葉前面，
//    把臉遮掉。
//
// ③ **葉尖用 |t|³ 不是 t²**。t² 會拉出尖峰，一圈葉尖讀起來像鬱金香花瓣；
//    |t|³ 才是圓頂。
// ============================================================================
import {
  BufferGeometry, Float32BufferAttribute, Color,
  LatheGeometry, SphereGeometry, Vector2,
} from 'three'

export const DEG = Math.PI / 180
const TAU = Math.PI * 2

/** 色票 —— 量產角色時只允許改這裡與比例，材質參數鎖在 material.js。 */
export const PAL = {
  white: '#FFFDF0',      // 葉柄最白處
  cream: '#F2F6D8',
  greenMid: '#C8E58C',
  green: '#95CA42',
  greenHi: '#8FCB45',
  vein: '#FFFFFF',
  core: '#F8FBE8',
  limb: '#E4EBBE',
  oLeaf: '#4A6E1E',
  oLimb: '#7E9450',
  rim: '#FFFFE8',
  blob: '#94A6CC',
  eye: '#3A2A18',
  eyeLo: '#4A3320',
  mouth: '#7E4B52',
}

// ── 小工具 ────────────────────────────────────────────────────────────
const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v))
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
/** Catmull-Rom 取樣一張表 */
function tbl(a, u) {
  const n = a.length - 1
  const x = clamp(u, 0, 1) * n
  const i = Math.min(n - 1, x | 0), f = x - i
  const p0 = a[Math.max(0, i - 1)], p1 = a[i], p2 = a[i + 1], p3 = a[Math.min(n, i + 2)]
  const v = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f
    + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f)
  return v < 0 ? 0 : v
}

// ⚠️ 大白菜是**直筒**：u=0.22~0.79 幾乎等寬（0.97），底部 20% 才快速收圓、
//    頂部 76% 以上才收頂。一路線性收窄的版本怎麼調都像竹筍。
const BULGE = [
  0.360, 0.690, 0.858, 0.932, 0.962, 0.972, 0.978, 0.982, 0.986, 0.990, 0.994,
  0.998, 1.000, 1.000, 0.998, 0.994, 0.988, 0.980, 0.970, 0.958, 0.944,
]
const DOME_U = 0.60, DOME_N = 2.55
export function bulge(u) {
  let r = tbl(BULGE, u)
  if (u > DOME_U) {
    const t = (u - DOME_U) / (1 - DOME_U)
    r *= Math.pow(Math.max(0, 1 - Math.pow(t, DOME_N)), 1 / DOME_N)
  }
  return r
}
/** 「散開」只作用在上緣。線性 flare（半徑隨高度線性外擴）會變成青江菜。 */
export function tipFlare(u) {
  const t = Math.max(0, (u - 0.52) / 0.30)
  return t * t * (1 - smoothstep(0.70, 0.95, u))
}
export const leafR = (u, radius, flare) => radius * (bulge(u) + flare * tipFlare(u))
/** 包覆半角「下寬上窄」：反過來會讓底部露縫、頂端擠成一團。 */
const halfAngle = (u, half) =>
  half * DEG * (1.18 - 0.36 * u) * (1 - 0.48 * smoothstep(0.72, 1.0, u))
/** 見檔頭 ③：|t|³ 才是圓頂 */
const tipShape = (t, drop) => 1 - drop * Math.abs(t) * t * t
/** 白菜葉柄是一根根飽滿的圓管並排，不是對稱正弦 */
const ribProfile = x => (x > 0 ? Math.pow(x, 0.55) : -Math.pow(-x, 1.9))
/** 綠色區遮罩 —— 細皺褶只長在綠葉上，白葉柄要平滑 */
const gpZone = (t, pu, green) => {
  const w = 1.00 - 0.42 * smoothstep(0.10, 0.55, pu) - 0.62 * smoothstep(0.58, 0.76, pu)
  return clamp(smoothstep(w, w + 0.13, Math.abs(t)) * green * smoothstep(0.26, 0.52, pu), 0, 1)
}
/** 見檔頭 ①：頻率鎖成葉片數的整數倍，整層共用同一個曲面 */
const crinkleAt = (th, u, amp, k) => {
  const w1 = Math.sin(k * th + u * 2.2), w2 = Math.sin(2 * k * th - u * 3.4)
  return { v: amp * Math.pow(u, 1.55) * (0.72 * w1 + 0.28 * w2), w1, w2 }
}

/**
 * Newell 法線決定封蓋的環繞方向。
 * ⚠️ 不判方向就有一半機率蓋反，那一面會變成黑洞（背面剔除）。
 */
function fanCap(pos, idx, rowStart, ringN, wantY) {
  let cx = 0, cy = 0, cz = 0
  for (let q = 0; q < ringN; q++) {
    cx += pos[(rowStart + q) * 3]
    cy += pos[(rowStart + q) * 3 + 1]
    cz += pos[(rowStart + q) * 3 + 2]
  }
  cx /= ringN; cy /= ringN; cz /= ringN
  let ny = 0
  for (let q = 0; q < ringN; q++) {
    const A = rowStart + q, B = rowStart + ((q + 1) % ringN)
    ny += (pos[A * 3 + 2] - pos[B * 3 + 2]) * (pos[A * 3] + pos[B * 3])
  }
  const flip = (ny * wantY) < 0
  const ci = pos.length / 3
  pos.push(cx, cy, cz)
  for (let q = 0; q < ringN; q++) {
    const a = rowStart + q, b = rowStart + ((q + 1) % ringN)
    if (flip) idx.push(ci, b, a); else idx.push(ci, a, b)
  }
  return ci
}

const LEAF_DEFAULTS = {
  radius: 0.462, height: 1.18, hRef: 1.18, flare: 0.20, half: 52,
  thickness: 0.020, crinkle: 0.021, rAdd: 0, segU: 40, segV: 9,
  edgeDrop: 0.30, ruffle: 0.085, kAz: 9, fine: 0.011, ribAmp: 0.014, kRib: 18,
  faceClear: 0, fcT: 0.64, fcLo: 0.19, fcHi: 0.74, gLift: 0,
  tsh: 0.42, green: 0.95, tone: 1.0,
}

/**
 * 一片帶厚度的封閉菜葉（繞著軸包覆）。
 * ⚠️ 一律 indexed + computeVertexNormals()——inverted-hull 描邊要靠平滑法線，
 *    非 indexed 的幾何在接縫處法線不連續，描邊會裂開。
 */
export function buildLeafGeometry(opts = {}) {
  const d = { ...LEAF_DEFAULTS, ...opts }
  const segU = d.segU | 0, segV = d.segV | 0, ringN = (segV + 1) * 2
  const pos = [], col = [], uvs = [], idx = []
  const cW = new Color(PAL.white), cC = new Color(PAL.cream)
  const cM = new Color(PAL.greenMid), cG = new Color(PAL.green)
  const cV = new Color(PAL.vein)
  const tmp = new Color(), base = new Color()

  for (let i = 0; i <= segU; i++) {
    const u = i / segU
    for (let k = 0; k < ringN; k++) {
      const outer = (k <= segV)
      const j = outer ? k : (ringN - 1 - k)   // 內側索引反向遞減，法線自動朝內
      const t = (j / segV) * 2 - 1
      const y0 = d.height * u * tipShape(t, d.edgeDrop)
      const pu = clamp(y0 / d.hRef, 0, 1)      // ★ 世界高度，見檔頭 ②
      const ha = halfAngle(pu, d.half)
      const th = t * ha
      const R = leafR(pu, d.radius, d.flare)
      const cr = crinkleAt(th, pu, d.crinkle, d.kAz)
      // 厚度在兩側不可歸零：留 28% 最小厚度，邊緣才接得到高光
      const thk = d.thickness * (0.28 + 0.72 * Math.sin(Math.PI * j / segV))
      const fz = gpZone(t, pu, d.green)
      const fine = 0.62 * Math.sin(pu * 9.0 + d.kAz * th) + 0.38 * Math.sin(pu * 14.0 - 2 * d.kAz * th)
      // 圓肋做成真正的幾何位移（不只是明暗），葉柄才立體。
      // 振幅只吃 th 與 pu、不吃葉片局部的 t——否則又會破壞整層共用曲面。
      const ribG = ribProfile(Math.cos(d.kRib * th))
        * smoothstep(0.03, 0.20, pu) * (1 - smoothstep(0.48, 0.82, pu))
      // 臉那一片：五官所在的區域抹平成乾淨白面。
      // ⚠️ 半徑不能因此凹下去（會被鄰葉蓋住），要墊到「肋的最高點」再多一點。
      let fw = 0
      if (d.faceClear) {
        fw = (1 - smoothstep(d.fcT, d.fcT + 0.24, Math.abs(t)))
          * smoothstep(d.fcLo - 0.10, d.fcLo + 0.10, pu)
          * (1 - smoothstep(d.fcHi - 0.12, d.fcHi + 0.10, pu))
      }
      const ribE = ribG * (1 - fw) + 1.18 * fw
      const r = R + d.rAdd + cr.v * (1 - fw) + d.fine * fz * fine * (1 - fw)
        + d.ribAmp * ribE + (outer ? 0.5 : -0.5) * thk
      // 荷葉邊：上緣波浪。沒有這個，一圈葉尖會讀成鬱金香花瓣。
      // 只當成高度偏移、不回饋到半徑，整層才共用同一個曲面。
      const y = y0 + d.hRef * d.ruffle * pu * pu
        * (0.62 * Math.sin(d.kAz * th * 2) + 0.38 * Math.sin(d.kAz * th))

      pos.push(r * Math.sin(th), y, r * Math.cos(th))
      uvs.push((t + 1) * 0.5, pu)

      // ★ 中央白色葉柄的半寬。量參考圖：pu=0.3 時白帶佔全寬 72%、0.5 佔 46%、
      //   >0.7 幾乎沒有白。綠色只長在這條白帶之外——這是大白菜最關鍵的一件事。
      const wRib = 1.00 - 0.42 * smoothstep(0.10, 0.55, pu) - 0.62 * smoothstep(0.58, 0.76, pu)
      const gp = clamp(smoothstep(wRib, wRib + 0.13, Math.abs(t)) * d.green
        * smoothstep(0.26 + d.gLift, 0.52 + d.gLift, pu), 0, 1) * (1 - fw)
      base.copy(cW).lerp(cC, smoothstep(0.05, 0.50, pu))
      if (gp < 0.55) tmp.copy(base).lerp(cM, gp / 0.55)
      else tmp.copy(cM).lerp(cG, (gp - 0.55) / 0.45)
      // 羽狀葉脈：從中肋往外上方斜出（|t| 前面是負號才會往上斜）
      const vf = (pu * 8.0 - Math.abs(t) * 0.85 + 8) % 1
      tmp.lerp(cV, 0.34 * Math.exp(-Math.pow((vf - 0.5) / 0.11, 2)) * gp)
      tmp.lerp(cV, 0.36 * smoothstep(0.12, 0.0, Math.abs(t)) * (1 - 0.72 * gp) * (1 - fw))
      tmp.multiplyScalar(1 + (0.118 * ribG + 0.040 * Math.cos(t * 5.5))
        * (1 - 0.45 * gp) * (1 - 0.88 * fw))
      if (fw > 0) tmp.lerp(cW, 0.80 * fw)     // 臉區收成乾淨白面
      // 皺褶明暗——位移只影響輪廓，明暗才是讓皺褶被看見的關鍵
      tmp.multiplyScalar(1 + (0.105 * cr.w1 + 0.045 * cr.w2 + 0.20 * fz * fine) * (1 - fw))
      // ★ 層次感的關鍵：鄰葉邊緣壓在本片上的「陰影溝」＋溝外側的受光亮帶。
      //   位置 tsh = 1 − (360/n)/half，純顏色、吃葉片局部 t，不影響共用曲面。
      //   12 片葉 × 每片兩側 = 一圈 24 條溝，比再加葉片有效得多。
      const at = Math.abs(t)
      const dLine = (at - d.tsh) / 0.075, dSoft = (at - d.tsh) / 0.26
      const dLed = (at - d.tsh - 0.30) / 0.19
      const boost = 1 + 0.55 * gp
      tmp.multiplyScalar(1
        - 0.30 * boost * Math.exp(-dLine * dLine)   // 細暗線＝鄰葉的邊
        - 0.15 * boost * Math.exp(-dSoft * dSoft)   // 寬柔溝＝那道邊的陰影
        + 0.13 * Math.exp(-dLed * dLed))            // 溝外的受光亮帶
      tmp.multiplyScalar(1 - 0.28 * Math.pow(at, 2.6))     // 葉緣本身再壓暗
      tmp.multiplyScalar(0.89 + 0.11 * Math.pow(pu, 0.55)) // 假 AO
      if (!outer) tmp.multiplyScalar(0.82)                 // 葉背暗一階
      tmp.multiplyScalar(d.tone)
      col.push(tmp.r, tmp.g, tmp.b)
    }
  }

  for (let i = 0; i < segU; i++) {
    for (let k = 0; k < ringN; k++) {
      const k2 = (k + 1) % ringN
      const a = i * ringN + k, b = i * ringN + k2
      const c = (i + 1) * ringN + k, e = (i + 1) * ringN + k2
      idx.push(a, b, e, a, e, c)
    }
  }
  fanCap(pos, idx, 0, ringN, -1)
  fanCap(pos, idx, segU * ringN, ringN, 1)
  while (col.length / 3 < pos.length / 3) col.push(0.72, 0.78, 0.55)
  while (uvs.length / 2 < pos.length / 3) uvs.push(0.5, 0.5)

  const geo = new BufferGeometry()
  geo.setIndex(idx)
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/**
 * 菜心 —— 把中間堵住，不然從上面看得到空心。
 * ⚠️ 最後一圈刻意不補第二個三角形（頂端收成一點），補了會出現退化面。
 */
export function buildCoreGeometry({
  radius = 0.238, height = 1.185, segH = 56, segR = 40, capTop = 0.10,
} = {}) {
  const pos = [], col = [], uvs = [], idx = []
  const cA = new Color(PAL.core), cB = new Color(PAL.greenHi), tmp = new Color()
  for (let i = 0; i <= segH; i++) {
    const u = i / segH
    let r = radius * bulge(u)
    if (u > 1 - capTop) {
      const s = (u - (1 - capTop)) / capTop
      r *= Math.sqrt(Math.max(0, 1 - s * s))
    }
    const y = height * u
    for (let j = 0; j <= segR; j++) {
      const th = j / segR * TAU
      pos.push(r * Math.sin(th), y, r * Math.cos(th))
      uvs.push(j / segR, u)
      tmp.copy(cA).lerp(cB, smoothstep(0.55, 1.0, u))
      tmp.multiplyScalar((0.80 + 0.20 * Math.pow(u, 0.5)) * (1 + 0.05 * Math.cos(th * 9)))
      col.push(tmp.r, tmp.g, tmp.b)
    }
  }
  for (let i = 0; i < segH; i++) {
    for (let j = 0; j < segR; j++) {
      const a = i * (segR + 1) + j, b = a + 1, c = a + segR + 1, e = c + 1
      idx.push(a, b, e)
      if (i !== segH - 1) idx.push(a, e, c)
    }
  }
  const geo = new BufferGeometry()
  geo.setIndex(idx)
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/**
 * 臉部貼片 —— 貼合最外層前葉的曲面。
 *
 * 半徑吃**與葉片同一條公式**，再加上厚度一半、皺褶最大值、肋的最高點與 extra
 * → 保證落在整層之外，絕不穿模。五官畫在貼圖上，所以永遠不會歪。
 * ⚠️ 同樣以世界高度 pu 取樣（見檔頭 ②）。
 */
export function buildFacePatch({
  radius = 0.462, height = 1.18, flare = 0.20, thickness = 0.020, crinkle = 0.021,
  fine = 0.011, ribAmp = 0.014, azHalf = 44, uLo = 0.14, uHi = 0.62,
  extra = 0.011, segX = 44, segY = 40,
} = {}) {
  const pos = [], uvs = [], idx = []
  for (let i = 0; i <= segY; i++) {
    const v = i / segY
    const pu = uLo + (uHi - uLo) * v
    const y = height * pu
    const R = leafR(pu, radius, flare)
    const r = R + crinkle * Math.pow(pu, 1.55) + fine + ribAmp * 1.18 + thickness * 0.5 + extra
    for (let j = 0; j <= segX; j++) {
      const f = j / segX
      const th = (-azHalf + 2 * azHalf * f) * DEG
      pos.push(r * Math.sin(th), y, r * Math.cos(th))
      uvs.push(f, v)
    }
  }
  for (let i = 0; i < segY; i++) {
    for (let j = 0; j < segX; j++) {
      const a = i * (segX + 1) + j, b = a + 1, c = a + segX + 1, e = c + 1
      idx.push(a, b, e, a, e, c)
    }
  }
  const geo = new BufferGeometry()
  geo.setIndex(idx)
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/**
 * 軟膠囊（手腳）—— 兩端半球 ＋ 中段錐形，上下半徑可不同。
 * ⚠️ 半徑要夾 1e-4 不可為 0：Lathe 在半徑 0 會產生退化三角形，
 *    computeVertexNormals 得到 NaN 法線，那一圈會全黑。
 */
export function buildLimbGeometry({
  rBot = 0.042, rTop = 0.050, len = 0.12, segV = 12, segR = 26,
} = {}) {
  const pts = []
  const h = len * 0.5
  for (let i = 0; i <= segV; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / segV)
    pts.push(new Vector2(Math.max(1e-4, rBot * Math.cos(a)), -h + rBot * Math.sin(a)))
  }
  for (let i = 1; i < 4; i++) {
    const t = i / 4
    pts.push(new Vector2(rBot + (rTop - rBot) * t, -h + len * t))
  }
  for (let i = 0; i <= segV; i++) {
    const b = (Math.PI / 2) * (i / segV)
    pts.push(new Vector2(Math.max(1e-4, rTop * Math.cos(b)), h + rTop * Math.sin(b)))
  }
  return new LatheGeometry(pts, segR)
}

/** 菜根 —— 葉片底端是平的開口，要有東西蓋住。 */
export function buildRootBall({ radius = 0.168, segW = 30, segH = 20 } = {}) {
  return new SphereGeometry(radius, segW, segH)
}
