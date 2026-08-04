// ============================================================================
// 平面單應性（homography）與姿態估計 —— 純陣列運算、零第三方相依
//
// 這一層負責的是 AR 的「幾何」：知道卡片的四個角落在畫面上的哪裡之後，
// 算出一個把「模型平面」映射到「畫面上那個四邊形」的變換，讓疊加的內容
// 真的貼在卡片上、跟著卡片傾斜。
//
// 兩種輸出，對應兩條渲染路線：
//   · cssMatrix3d(H)          → CSS 3D 的 matrix3d()，不需要 WebGL
//   · poseFromHomography(H)   → 3D 的 model-view 矩陣，給 A-Frame／three.js 用
//
// 刻意不碰 DOM／Canvas：可直接在 node 跑單元測試（與 scanner.js 同一個原則）。
// ============================================================================

/**
 * 解 n×n 線性方程組（高斯消去 + 部分主元）。
 * A 會被就地修改；回傳解向量，奇異矩陣回 null。
 */
export function solve(A, b) {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    // 部分主元：挑該行絕對值最大的當主元，避免除以極小數造成數值爆炸
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (Math.abs(M[piv][col]) < 1e-12) return null      // 奇異：四點共線或重合
    if (piv !== col) { const t = M[piv]; M[piv] = M[col]; M[col] = t }
    const p = M[col][col]
    for (let c = col; c <= n; c++) M[col][c] /= p
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col]
      if (!f) continue
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c]
    }
  }
  return M.map(row => row[n])
}

/**
 * 四點直接線性變換（DLT）求 homography：src[i] → dst[i]。
 * src/dst 皆為 [[x,y] ×4]，順序必須一一對應。
 * 回傳 3×3 陣列（h33 固定為 1），無解回 null。
 *
 * 每組對應點給兩條方程式：
 *   u = (h11x + h12y + h13) / (h31x + h32y + 1)
 *   v = (h21x + h22y + h23) / (h31x + h32y + 1)
 * 整理成線性式後湊成 8×8 解 h11..h32。
 */
export function homography(src, dst) {
  if (src.length !== 4 || dst.length !== 4) return null
  const A = [], b = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v)
  }
  const h = solve(A, b)
  if (!h || h.some(v => !Number.isFinite(v))) return null
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]]
}

/** 用 H 把一個點投影過去（齊次除法）。 */
export function applyH(H, x, y) {
  const w = H[2][0] * x + H[2][1] * y + H[2][2]
  if (!w) return [NaN, NaN]
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w]
}

/** 3×3 反矩陣（求 dst → src 用）。 */
export function invert3(H) {
  const [a, b, c] = H[0], [d, e, f] = H[1], [g, h, i] = H[2]
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  if (Math.abs(det) < 1e-12) return null
  const s = 1 / det
  return [
    [(e * i - f * h) * s, (c * h - b * i) * s, (b * f - c * e) * s],
    [(f * g - d * i) * s, (a * i - c * g) * s, (c * d - a * f) * s],
    [(d * h - e * g) * s, (b * g - a * h) * s, (a * e - b * d) * s],
  ]
}

/**
 * 把 3×3 homography 轉成 CSS 的 matrix3d（column-major，16 個值）。
 *
 * ⚠️ CSS 的 matrix3d 是**行主序（column-major）**：前四個數是第一「欄」不是第一「列」。
 *    寫成列主序的話畫面會出現看起來很像、但角度全錯的變換——而且靜態畫面下
 *    不容易看出來，一旋轉才會發現。
 * 平面只需要 x/y 兩軸，z 那一欄保持單位向量即可。
 */
export function cssMatrix3d(H) {
  const [[a, b, c], [d, e, f], [g, h, i]] = H
  return [
    a, d, 0, g,
    b, e, 0, h,
    0, 0, 1, 0,
    c, f, 0, i,
  ]
}

/** 產生 CSS transform 字串（含 3D 情境所需的 perspective 由外層容器設定）。 */
export const cssMatrix3dString = (H) => `matrix3d(${cssMatrix3d(H).map(n => Number(n.toFixed(6))).join(',')})`

/**
 * 由 homography 反推 3D 姿態（model-view 矩陣），給 A-Frame／three.js 用。
 *
 * 需要相機內參。手機廣角鏡頭的水平視角多在 60°–70°，這裡預設 60°，
 * 由畫面寬度換算焦距（像素）。⚠️ 這是**估計值**——沒有做鏡頭校正，
 * 所以深度會有系統性誤差；貼在平面上的內容看不太出來，但別拿它做量測。
 *
 * 演算法（標準做法）：
 *   H' = K⁻¹ · H → 前兩欄是旋轉矩陣的前兩軸（差一個尺度），第三欄是平移
 *   λ = 1/‖H'第一欄‖ 正規化，r3 = r1 × r2
 *   最後對 R 做正交化（SVD 的廉價替代：Gram-Schmidt），避免累積誤差
 *
 * @param {number[][]} H  模型平面（單位正方形 0..1）→ 影像像素座標
 * @param {object} o      { width, height, fovDeg }
 * @returns {{ matrix:number[], position:number[], scale:number }|null}
 *          matrix 為 column-major 的 4×4（three.js 的 Matrix4.fromArray 可直接吃）
 */
export function poseFromHomography(H, { width, height, fovDeg = 60 } = {}) {
  if (!H || !width || !height) return null
  const f = (width / 2) / Math.tan((fovDeg * Math.PI / 180) / 2)
  const cx = width / 2, cy = height / 2
  // K⁻¹ · H（K 是上三角，直接展開比通用反矩陣穩）
  const h = [
    [(H[0][0] - cx * H[2][0]) / f, (H[0][1] - cx * H[2][1]) / f, (H[0][2] - cx * H[2][2]) / f],
    [(H[1][0] - cy * H[2][0]) / f, (H[1][1] - cy * H[2][1]) / f, (H[1][2] - cy * H[2][2]) / f],
    [H[2][0], H[2][1], H[2][2]],
  ]
  const col = (j) => [h[0][j], h[1][j], h[2][j]]
  const norm = (v) => Math.hypot(v[0], v[1], v[2])
  let r1 = col(0), r2 = col(1), t = col(2)
  const n1 = norm(r1), n2 = norm(r2)
  if (!n1 || !n2) return null
  // 兩個軸的長度理論上相同，取平均可稍微吸收雜訊
  const lambda = 2 / (n1 + n2)
  r1 = r1.map(v => v * lambda)
  r2 = r2.map(v => v * lambda)
  t = t.map(v => v * lambda)
  // ⚠️ 卡片必須在相機前方。t[2] 為負代表解出了「鏡像在後方」的那一組，
  //    整組取負號即為正確解——少了這一步，模型會在某些角度突然翻到背面。
  if (t[2] < 0) { r1 = r1.map(v => -v); r2 = r2.map(v => -v); t = t.map(v => -v) }
  // Gram-Schmidt 正交化：r2 減去它在 r1 上的投影
  const dot = r1[0] * r2[0] + r1[1] * r2[1] + r1[2] * r2[2]
  r2 = r2.map((v, i) => v - dot * r1[i])
  const n2b = norm(r2)
  if (!n2b) return null
  r2 = r2.map(v => v / n2b)
  const r1n = norm(r1)
  r1 = r1.map(v => v / r1n)
  const r3 = [
    r1[1] * r2[2] - r1[2] * r2[1],
    r1[2] * r2[0] - r1[0] * r2[2],
    r1[0] * r2[1] - r1[1] * r2[0],
  ]
  // column-major 4×4
  return {
    matrix: [
      r1[0], r1[1], r1[2], 0,
      r2[0], r2[1], r2[2], 0,
      r3[0], r3[1], r3[2], 0,
      t[0], t[1], t[2], 1,
    ],
    position: t,
    scale: 1 / lambda,
  }
}

/**
 * 姿態平滑：相機雜訊會讓四個角每幀抖動幾個像素，直接套用會讓模型「發抖」。
 * 對角點座標做指數移動平均（EMA）。alpha 越大越跟手、越小越穩。
 *
 * ⚠️ 追丟之後再找回來時**必須重置**，否則會從舊位置慢慢飄過去
 *    （看起來像模型自己飛過去，比瞬間跳過去更怪）。
 */
export function makeSmoother(alpha = 0.35, resetDistance = 120) {
  let prev = null
  return {
    reset() { prev = null },
    push(corners) {
      if (!corners) { prev = null; return null }
      if (!prev) { prev = corners.map(p => [...p]); return prev }
      // 位移過大 → 視為換了目標／追丟重抓，直接跳過去不做平滑
      const jump = corners.some((p, i) => Math.hypot(p[0] - prev[i][0], p[1] - prev[i][1]) > resetDistance)
      if (jump) { prev = corners.map(p => [...p]); return prev }
      prev = prev.map((p, i) => [
        p[0] + (corners[i][0] - p[0]) * alpha,
        p[1] + (corners[i][1] - p[1]) * alpha,
      ])
      return prev
    },
  }
}
