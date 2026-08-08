// ============================================================================
// 模擬掃描畫面 —— 不用實體卡、不用相機，就能跑完整條追蹤鏈
//
// 為什麼需要：AR 疊加最後一個問題是「角色是不是真的站在卡片上」。那看起來
// 只能印出來拿手機看，但其實可以把它拆成兩件事：
//   ① 姿態數學對不對 → 重投影誤差（已驗，<0.05px）
//   ② 算繪出來的像素對不對 → **需要一張有卡片的畫面**，而那張畫面可以合成
//
// 所以這支把目標圖畫到一個已知的透視四邊形上，並**回傳那個四邊形的真值**。
// 於是整條鏈（偵測四角 → 拉正 → 比對 → 解姿態 → 貼角色 → 熱區命中）都跑真的，
// 只有「相機」是假的。剩下真正需要實體卡的只有鏡頭畫質與現場光線。
//
// ⚠️ 這是開發／回歸測試用，不可出現在正式流程裡：`/AR?simulate=1` 只在
//    `import.meta.env.DEV` 為真時生效（見 Scan.jsx）。否則使用者會在沒有卡片
//    的情況下看到「掃到了」，那是最糟的假象。
// ============================================================================

/**
 * 把一張目標圖畫到畫面上的一個透視四邊形裡。
 *
 * ⚠️ 用「橫向細條帶」近似透視，不是單一 drawImage：canvas 2D 沒有透視變換，
 *    setTransform 只能做仿射（平行線保持平行），拿來當透視會讓對邊等長，
 *    偵測出來的四邊形永遠是平行四邊形——那正好繞過了 homography 要解的東西。
 *
 * @returns {{ data: Uint8ClampedArray, w: number, h: number, quad: number[][] }}
 *          quad 是真值四角（順序：左上、右上、右下、左下）
 */
export function drawSimFrame(ctx, bitmap, { w, h, quad, desk = '#2A2A2E' }) {
  ctx.fillStyle = desk
  ctx.fillRect(0, 0, w, h)
  const [tl, tr, br, bl] = quad
  const N = 240
  for (let i = 0; i < N; i++) {
    const v0 = i / N, v1 = (i + 1) / N
    const lx0 = tl[0] + (bl[0] - tl[0]) * v0, ly0 = tl[1] + (bl[1] - tl[1]) * v0
    const rx0 = tr[0] + (br[0] - tr[0]) * v0, ry0 = tr[1] + (br[1] - tr[1]) * v0
    const lx1 = tl[0] + (bl[0] - tl[0]) * v1, ly1 = tl[1] + (bl[1] - tl[1]) * v1
    const sh = bitmap.height / N
    ctx.save()
    ctx.translate(lx0, ly0)
    ctx.rotate(Math.atan2(ry0 - ly0, rx0 - lx0))
    // +1.2 是條帶之間的重疊，不加會出現一條條白色縫隙（那些縫隙會被
    // 偵測器當成紙上的深色內容，影響四角判定）
    ctx.drawImage(bitmap, 0, v0 * bitmap.height, bitmap.width, sh,
      0, 0, Math.hypot(rx0 - lx0, ry0 - ly0), Math.hypot(lx1 - lx0, ly1 - ly0) + 1.2)
    ctx.restore()
  }
  return { data: ctx.getImageData(0, 0, w, h).data, w, h, quad }
}

/**
 * 產生一組會緩慢移動的四角，模擬「手持著卡片」。
 *
 * ⚠️ 必須是**真正的透視投影**（把 3D 矩形投影下來），不可用
 *    「四角各自乘一個係數」那種近似。第一版寫成 `kx = 1 - sx*yaw` ——
 *    那是剪切／縮放不是投影，產生的四邊形**不是矩形的合法投影**，
 *    於是 rectify() 拉正之後影像是歪的，比對分數掉到 37~57（門檻 58），
 *    追蹤成功率只有 50%。
 *
 *    這個坑很危險：它讓模擬器**看起來像在測追蹤器**，實際上是在測一個
 *    追蹤器本來就不該接受的輸入。診斷數字會指向「比對太嚴格」，
 *    於是很容易去調低門檻——那才是真正的災難（正式站會開始亂認）。
 *
 * @param t 秒
 */
export function wobbleQuad(t, { w, h, aspect = 148 / 105, cover = 0.62, fovDeg = 60 }) {
  const k = 1 / aspect
  const f = (w / 2) / Math.tan((fovDeg * Math.PI) / 360)
  // 讓卡片在畫面裡大約佔 cover 的寬度 → 反推距離
  const dist = f / (w * cover)
  const yaw = Math.sin(t * 0.41) * 0.30
  const pitch = Math.cos(t * 0.33) * 0.22
  const roll = Math.sin(t * 0.23) * 0.14
  const ox = Math.sin(t * 0.35) * 0.06
  const oy = Math.cos(t * 0.27) * 0.05
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const cr = Math.cos(roll), sr = Math.sin(roll)
  return [[0, 0], [1, 0], [1, k], [0, k]].map(([x, y]) => {
    // 模型座標（以中心為原點）→ roll → pitch → yaw → 平移 → 投影
    let px = x - 0.5, py = y - k / 2, pz = 0
    ;[px, py] = [px * cr - py * sr, px * sr + py * cr]
    ;[py, pz] = [py * cp - pz * sp, py * sp + pz * cp]
    ;[px, pz] = [px * cy + pz * sy, -px * sy + pz * cy]
    const X = px + ox, Y = py + oy, Z = pz + dist
    return [w / 2 + f * X / Z, h / 2 + f * Y / Z]
  })
}
