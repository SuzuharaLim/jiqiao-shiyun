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
export function drawSimFrame(ctx, bitmap, { w, h, quad, quadAt, desk = '#2A2A2E' }) {
  ctx.fillStyle = desk
  ctx.fillRect(0, 0, w, h)
  const N = 240
  for (let i = 0; i < N; i++) {
    const v0 = i / N, v1 = (i + 1) / N
    // ★ 捲簾快門：每一列的曝光時間不同，所以每一條帶要用**那一列的時間**的四角。
    //    quadAt(v) 由呼叫端提供（見 rollingShutterQuadAt）。沒給就退回靜態四角。
    const [tl, tr, br, bl] = quadAt ? quadAt(v0) : quad
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
 * 模擬真實相機的三種劣化 —— 這是實體測試前唯一還沒被量過的東西。
 *
 * 為什麼要模擬而不是「等印出來再說」：如果實測不如預期，要調的參數
 * （多視角的角度、RECT 大小）都不便宜——RECT 從 48 提到 64 是 1.78 倍的
 * 運算量，而那是每秒 15 次跑在手機上。與其猜，先量出「劣化到什麼程度會掛」，
 * 才知道要不要付那個成本。
 *
 * ⚠️ **雜訊要套在「感測器解析度」上，不是套在取樣畫面上**。
 *    追蹤器是從 1280×960 的視訊縮到 200×150 才做運算，那個縮放本身就把
 *    每個取樣點平均了約 41 個像素 → 雜訊標準差降低 √41 ≈ 6.4 倍。
 *    直接把 σ=6 套在 200×150 上，等於模擬一台雜訊 σ≈38 的感測器——
 *    那不是手機，那是壞掉的相機。我第一版就是這樣量的，於是得到
 *    「室內一般只有 20%」這種過度悲觀的結論。
 *    `sensorScale` 就是這個縮放比（預設 6，約等於 1280→200）。
 *
 * @param opts.noise    **感測器上**的雜訊標準差（灰階值）。手機日光 1~3、室內 3~6、暗處 8~15
 * @param opts.sensorScale 感測器解析度 ÷ 取樣解析度（雜訊會被這個倍率開根號地平均掉）
 * @param opts.blur     動態模糊的半徑（像素）。手持輕微晃動 0.5~1.5
 * @param opts.exposure 曝光倍率。1 = 正常，0.7 = 偏暗，1.3 = 過曝
 * @param opts.seed     固定亂數種子，讓同一組設定每次跑出同樣結果（可比較）
 */
export function degrade(frame, { noise = 0, blur = 0, exposure = 1, seed = 1, sensorScale = 6 } = {}) {
  const { w, h } = frame
  let d = frame.data
  // ── 動態模糊：水平方向的方框模糊（手持晃動主要是橫向）──
  // ⚠️ 要對**原始資料**做，不可就地累加：就地做的話後面的像素會吃到
  //    已經模糊過的值，等於做了一次指數衰減的拖影而不是均勻模糊。
  if (blur > 0) {
    const r = Math.max(1, Math.round(blur))
    const out = new Uint8ClampedArray(d.length)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let a = 0, b = 0, c = 0, n = 0
        for (let k = -r; k <= r; k++) {
          const xx = Math.min(w - 1, Math.max(0, x + k))
          const i = (y * w + xx) * 4
          a += d[i]; b += d[i + 1]; c += d[i + 2]; n++
        }
        const o = (y * w + x) * 4
        out[o] = a / n; out[o + 1] = b / n; out[o + 2] = c / n; out[o + 3] = 255
      }
    }
    d = out
  } else {
    d = new Uint8ClampedArray(d)
  }
  // ── 曝光與雜訊 ──
  // 固定種子的 LCG：同一組設定每次結果相同，不然沒辦法比較兩種參數
  let st = (seed * 2654435761) >>> 0
  const rnd = () => ((st = (st * 1103515245 + 12345) >>> 0) / 4294967296)
  for (let i = 0; i < d.length; i += 4) {
    // Box-Muller 取一個常態分佈的樣本（雜訊是常態的，不是均勻的——
    // 用均勻分佈會低估極端值，而極端值才是讓二值化出錯的那些）
    // 縮放時 N 個像素被平均 → σ 降低 √N（N ≈ sensorScale²）
    const eff = noise / Math.max(1, sensorScale)
    const n = eff > 0
      ? Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd()) * eff
      : 0
    d[i] = d[i] * exposure + n
    d[i + 1] = d[i + 1] * exposure + n
    d[i + 2] = d[i + 2] * exposure + n
  }
  return { data: d, w, h, quad: frame.quad }
}

/**
 * ★ 捲簾快門 —— 產生一個「逐列取不同時間」的四角函式。
 *
 * ⚠️ 這是三個鏡頭效應裡最危險的一個：移動中的矩形被逐列取樣之後，
 *    投影出來的四邊形**不再是任何平面矩形的合法投影**。也就是說它與我之前
 *    在模擬器裡踩過的「剪切近似」是同一類的輸入——homography 無解、
 *    rectify 拉正後影像是歪的。
 *    偵測器仍然會「找到」一個四邊形（實心度與四邊形度都過得了），
 *    所以症狀是**分數莫名偏低**而不是追不到，很容易被誤診為「比對太嚴格」。
 *
 * @param readoutMs 整個畫面從第一列讀到最後一列的時間。手機常見 15~30ms
 *                  （高階機有些做到 5ms 以下，那幾乎沒有捲簾效應）
 */
export function rollingShutterQuadAt(quadFn, t, readoutMs) {
  const tau = readoutMs / 1000
  return (v) => quadFn(t + v * tau)
}

/**
 * ★ 鏡頭徑向畸變（Brown-Conrady 的一階／二階項）。
 *
 * 手機廣角鏡頭多是**桶狀**畸變（k1 < 0）：畫面邊緣被往外推，直線變成弧線。
 * ⚠️ 對四角偵測的影響不是「整體縮放」而是「**角落偏移比中央多**」——
 *    卡片放在畫面正中央幾乎沒事，靠邊就開始歪。所以測試一定要包含
 *    「卡片不在畫面中央」的情形，只測置中會完全漏掉這一項。
 *
 * @param k1 一階係數。手機主鏡頭約 -0.05~-0.15，超廣角 -0.25~-0.4
 */
export function applyDistortion(frame, { k1 = 0, k2 = 0 } = {}) {
  if (!k1 && !k2) return frame
  const { w, h, data } = frame
  const out = new Uint8ClampedArray(data.length)
  const cx = w / 2, cy = h / 2
  const norm = Math.hypot(cx, cy)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 逆向映射：對輸出的每個像素，找它在原始（無畸變）畫面的位置
      const dx = (x - cx) / norm, dy = (y - cy) / norm
      const r2 = dx * dx + dy * dy
      const f = 1 + k1 * r2 + k2 * r2 * r2
      const sx = Math.round(cx + dx * norm / f)
      const sy = Math.round(cy + dy * norm / f)
      const o = (y * w + x) * 4
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) { out[o + 3] = 255; continue }
      const i = (sy * w + sx) * 4
      out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; out[o + 3] = 255
    }
  }
  return { data: out, w, h, quad: frame.quad }
}

/**
 * ★ 對焦呼吸 —— 自動對焦時有效焦距會微幅改變，畫面看起來像在輕微縮放。
 * 幅度小（1~2%），但它是**持續**的，所以每一幀的卡片大小都在變。
 * 對這個追蹤器影響不大（四角偵測本來就每幀重算），列進來是為了確認「不影響」
 * 而不是假設它不影響。
 */
export function focusBreath(t, { amount = 0.015, hz = 0.7 } = {}) {
  return 1 + Math.sin(t * hz * Math.PI * 2) * amount
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
export function wobbleQuad(t, { w, h, aspect = 148 / 105, cover = 0.62, fovDeg = 60, zoom = 1, offx = 0, offy = 0 }) {
  const k = 1 / aspect
  const f = (w / 2) / Math.tan((fovDeg * Math.PI) / 360)
  // 讓卡片在畫面裡大約佔 cover 的寬度 → 反推距離
  const dist = f / (w * cover * zoom)
  const yaw = Math.sin(t * 0.41) * 0.30
  const pitch = Math.cos(t * 0.33) * 0.22
  const roll = Math.sin(t * 0.23) * 0.14
  const ox = Math.sin(t * 0.35) * 0.06 + offx
  const oy = Math.cos(t * 0.27) * 0.05 + offy
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
