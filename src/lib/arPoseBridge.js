// ============================================================================
// 姿態橋接 —— 追蹤器（CV 慣例）→ three.js（OpenGL 慣例）
//
// 這兩個換算都是「寫錯不會拋錯、只會讓模型貼歪」的類型，而且症狀都很誤導：
// 看起來像對齊誤差，會讓人去調落點座標而不是去查換算。所以獨立成一支並上閘門。
//
// 實測（合成已知姿態，重投影誤差）：
//   兩邊都填 60 度             8.17px   ← 錯（160px 寬的取樣畫面上約 5%）
//   換算成垂直 fov（46.83 度） 0.0057px ← 對
// ============================================================================

/**
 * 把「水平 fov」換算成 three 的 `PerspectiveCamera.fov`（垂直）。
 *
 * ⚠️ `poseFromHomography` 用 `f = (width/2)/tan(fov/2)`——它的 fov 是**水平**的。
 *    three 的 fov 是**垂直**的。要讓兩邊的像素尺度一致：
 *      (height/2)/tan(fovY/2) = (width/2)/tan(fovX/2)
 *    → tan(fovY/2) = tan(fovX/2) / aspect
 */
export function verticalFov(horizontalFovDeg, aspect) {
  const t = Math.tan((horizontalFovDeg * Math.PI) / 360)
  return (2 * Math.atan(t / (aspect || 1)) * 180) / Math.PI
}

/**
 * CV 姿態矩陣 → three 的物件矩陣。
 *
 * CV：x 右、y **下**、z **往前**（看向 +z）
 * three：x 右、y **上**、相機看向 **−z**
 * 所以左乘 diag(1, −1, −1)。
 *
 * ⚠️ 少了這一步的症狀有兩個，而且都不是「消失」：
 *    ① 深度變負（物件在相機背後，可能整個不畫）
 *    ② x 鏡像——角色出現在卡片**對稱的另一邊**
 *
 * @param {number[]} m16 column-major 4×4（`pose.matrix`）
 * @param {{elements:number[]}} out 目標 THREE.Matrix4（可省略，自己配一個物件）
 */
export function cvToThree(m16, out) {
  const e = out?.elements ?? new Array(16)
  // 左乘 diag(1,-1,-1,1) ＝ 把第 2、3 「列」取負。column-major 下
  // 第 r 列的元素是 index c*4 + r。
  for (let c = 0; c < 4; c++) {
    e[c * 4] = m16[c * 4]
    e[c * 4 + 1] = -m16[c * 4 + 1]
    e[c * 4 + 2] = -m16[c * 4 + 2]
    e[c * 4 + 3] = m16[c * 4 + 3]
  }
  return out ?? { elements: e }
}
