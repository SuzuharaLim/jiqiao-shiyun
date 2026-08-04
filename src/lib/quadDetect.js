// ============================================================================
// 四邊形偵測 —— 在相機畫面裡找出「一張卡片」的四個角落
//
// 為什麼是四邊形而不是自然特徵點：本站的 AR 目標是**印刷品**（明信片、手帳頁），
// 它們都有明確的矩形輪廓。找輪廓比找自然特徵（ORB/SIFT）簡單一個數量級，
// 在純 JS 裡也跑得動，而且對「紙上印的圖」特別穩。
// 代價：貼在雜亂背景上、沒有清楚邊界的圖會找不到——這是這條路線的已知邊界。
//
// 管線：灰階 → 盒狀模糊 → Otsu 二值化 → 最大連通元件 → 邊界像素
//        → 凸包 → 縮成四頂點 → 凸性/面積/實心度檢查 → 角點排序
//
// 與 scanner.js 同一個原則：純陣列運算、不碰 DOM，可直接在 node 測試。
// ============================================================================

/** 3×3 盒狀模糊（分離式，兩趟）——降低感測器雜訊，避免二值化出現碎點。 */
export function boxBlur3(src, w, h) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const a = src[i - (x > 0 ? 1 : 0)], b = src[i], c = src[i + (x < w - 1 ? 1 : 0)]
      tmp[i] = (a + b + c) / 3
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const a = tmp[i - (y > 0 ? w : 0)], b = tmp[i], c = tmp[i + (y < h - 1 ? w : 0)]
      out[i] = (a + b + c) / 3
    }
  }
  return out
}

/**
 * Otsu 自動門檻：找一個讓「前景／背景兩群的類間變異數最大」的灰階值。
 * 比固定門檻穩得多——室內外光線差很多，固定值一定會在某一種光線下失效。
 */
export function otsuThreshold(gray) {
  const hist = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const total = gray.length
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]
  let sumB = 0, wB = 0, best = 0, bestT = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const mB = sumB / wB, mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > best) { best = between; bestT = t }
  }
  return bestT
}

/**
 * 最大連通元件（4-連通，迭代式 flood fill）。
 * @returns {{ mask:Uint8Array, size:number, seed:[number,number] }|null}
 *
 * ⚠️ 一定要用**迭代**不可用遞迴：160×120 的區塊最多兩萬個像素，
 *    遞迴版在手機瀏覽器上會直接爆 call stack（而且是整頁掛掉不是回 null）。
 */
export function largestComponent(bin, w, h) {
  const seen = new Uint8Array(w * h)
  let best = null
  const stack = new Int32Array(w * h)
  for (let s = 0; s < bin.length; s++) {
    if (seen[s] || !bin[s]) continue
    let sp = 0, size = 0
    stack[sp++] = s
    seen[s] = 1
    const cells = []
    while (sp) {
      const i = stack[--sp]
      cells.push(i)
      size++
      const x = i % w, y = (i / w) | 0
      if (x > 0 && !seen[i - 1] && bin[i - 1]) { seen[i - 1] = 1; stack[sp++] = i - 1 }
      if (x < w - 1 && !seen[i + 1] && bin[i + 1]) { seen[i + 1] = 1; stack[sp++] = i + 1 }
      if (y > 0 && !seen[i - w] && bin[i - w]) { seen[i - w] = 1; stack[sp++] = i - w }
      if (y < h - 1 && !seen[i + w] && bin[i + w]) { seen[i + w] = 1; stack[sp++] = i + w }
    }
    if (!best || size > best.size) best = { size, cells }
  }
  if (!best) return null
  const mask = new Uint8Array(w * h)
  for (const i of best.cells) mask[i] = 1
  return { mask, size: best.size }
}

/**
 * 補洞：把「從畫面邊界連得到的背景」以外的所有像素都算成前景。
 *
 * ⚠️ 這一步是能不能認得**真實印刷品**的關鍵。第一版直接取「最大的亮色連通元件」，
 *    在純色測試卡上完美，但拿真的月曆頁一試就整個失效——真實版面裡有深色標題、
 *    色塊、照片，Otsu 二值化會把這些算成背景，於是頁面內部被切得零零落落，
 *    最大元件只剩其中一小塊白底，四個角自然完全對不上（實測直接回 null）。
 *    改成「先找出真正的背景（與畫面邊界相連的那一團），其餘都是紙」之後，
 *    頁面內的深色內容自動被包進來，因為它們跟外面的背景不相連。
 */
export function fillFromBorder(bin, w, h) {
  const outside = new Uint8Array(w * h)
  const stack = new Int32Array(w * h)
  let sp = 0
  const push = (i) => { if (!outside[i] && !bin[i]) { outside[i] = 1; stack[sp++] = i } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (sp) {
    const i = stack[--sp]
    const x = i % w, y = (i / w) | 0
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (y > 0) push(i - w)
    if (y < h - 1) push(i + w)
  }
  const filled = new Uint8Array(w * h)
  for (let i = 0; i < filled.length; i++) filled[i] = outside[i] ? 0 : 1
  return filled
}

/**
 * 取出元件的邊界像素（至少有一個 4-鄰居是背景的前景像素）。
 *
 * ⚠️ 這裡刻意**不做 Moore 邊界追蹤**。第一版寫了追蹤器，結果它在起點附近繞
 *    2×2 的小圈就回到起點（160×120 的矩形只吐出 4 個點，周長應該是 360），
 *    因為起始搜尋方向沒有正確地從「回溯點」開始。邊界追蹤要寫對得處理
 *    起始方向、內孔、單像素細頸等一堆邊界情況，而我們真正需要的只有
 *    「這團東西的外框四個角」——凸包可以直接給，而且沒有那些陷阱。
 */
export function boundaryPoints(mask, w, h) {
  const pts = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!mask[i]) continue
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1
        || !mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w]) pts.push([x, y])
    }
  }
  return pts
}

/** 凸包（Andrew monotone chain），回傳逆時針且不含重複端點。 */
export function convexHull(points) {
  if (points.length < 3) return points.slice()
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  lower.pop(); upper.pop()
  return lower.concat(upper)
}

/**
 * 把凸包縮到剛好 4 個頂點：每次移除「拿掉之後面積損失最小」的那個頂點。
 * 對本來就接近四邊形的凸包來說，被移掉的都是邊上的鋸齒點，角不會被動到。
 */
export function reduceHullToQuad(hull) {
  if (hull.length < 4) return null
  const pts = hull.map(p => [...p])
  while (pts.length > 4) {
    let bestI = 0, bestLoss = Infinity
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length]
      // 移除 b 之後損失的面積 = 三角形 abc 的面積
      const loss = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2
      if (loss < bestLoss) { bestLoss = loss; bestI = i }
    }
    pts.splice(bestI, 1)
  }
  return pts
}

/**
 * 角點精修：把四條邊各自用「離它最近的那些邊界點」擬合成直線，再取相鄰兩線的交點。
 *
 * 為什麼需要：凸包縮頂點得到的角只會落在**某個實際像素上**，而真正的角往往在
 * 兩條邊延伸線的交點（尤其角被輕微磨圓、或有一兩個雜訊點時）。實測透視梯形
 * 用凸包直接取角有約 5px 誤差，精修後降到 1px 以內——5px 在 160 寬的畫面上
 * 是 3%，模型會明顯偏出卡片邊緣。
 *
 * 用總體最小平方（TLS／PCA）擬合，不是一般最小平方：邊接近垂直時
 * y = ax + b 的斜率會發散，TLS 沒有這個問題。
 */
export function refineCorners(pts, quad) {
  const lines = []
  for (let e = 0; e < 4; e++) {
    const a = quad[e], b = quad[(e + 1) % 4]
    const ex = b[0] - a[0], ey = b[1] - a[1]
    const elen = Math.hypot(ex, ey)
    if (elen < 4) return quad
    // 收集「投影落在這條邊中段、且離邊夠近」的點（避開角落，角落屬於兩條邊）
    const inl = []
    for (const p of pts) {
      const t = ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (elen * elen)
      if (t < 0.15 || t > 0.85) continue
      const d = Math.abs(ey * p[0] - ex * p[1] + b[0] * a[1] - b[1] * a[0]) / elen
      if (d <= 2.5) inl.push(p)
    }
    if (inl.length < 5) return quad
    // TLS：主成分方向即為線的方向
    let mx = 0, my = 0
    for (const p of inl) { mx += p[0]; my += p[1] }
    mx /= inl.length; my /= inl.length
    let sxx = 0, syy = 0, sxy = 0
    for (const p of inl) {
      const dx = p[0] - mx, dy = p[1] - my
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy
    }
    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy)
    const dx = Math.cos(theta), dy = Math.sin(theta)
    // 線：通過 (mx,my)、方向 (dx,dy) → 法式 nx*x + ny*y = c
    lines.push({ nx: -dy, ny: dx, c: -dy * mx + dx * my })
  }
  const out = []
  for (let i = 0; i < 4; i++) {
    // 第 i 個角 = 第 (i-1) 條邊與第 i 條邊的交點
    const l1 = lines[(i + 3) % 4], l2 = lines[i]
    const det = l1.nx * l2.ny - l2.nx * l1.ny
    if (Math.abs(det) < 1e-9) return quad          // 兩邊平行 → 放棄精修用原值
    out.push([
      (l1.c * l2.ny - l2.c * l1.ny) / det,
      (l1.nx * l2.c - l2.nx * l1.c) / det,
    ])
  }
  // 精修結果不該離原角太遠，離太遠代表擬合到錯的點群
  for (let i = 0; i < 4; i++) {
    if (Math.hypot(out[i][0] - quad[i][0], out[i][1] - quad[i][1]) > 8) return quad
  }
  return out
}

/** 多邊形面積（帶正負號，可用來判斷繞行方向）。 */
export function polyArea(p) {
  let s = 0
  for (let i = 0, n = p.length; i < n; i++) {
    const j = (i + 1) % n
    s += p[i][0] * p[j][1] - p[j][0] * p[i][1]
  }
  return s / 2
}

/** 凸性檢查：所有相鄰邊的外積同號。 */
export function isConvex(p) {
  let sign = 0
  for (let i = 0, n = p.length; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], c = p[(i + 2) % n]
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
    if (Math.abs(cross) < 1e-9) continue
    const s = Math.sign(cross)
    if (!sign) sign = s
    else if (s !== sign) return false
  }
  return true
}

/**
 * 角點排序為 [左上, 右上, 右下, 左下]。
 *
 * ⚠️ 這一步是整條管線最容易被忽略、但錯了最明顯的地方：如果每一幀的角點順序
 *    不一致，homography 每幀都會解出不同的旋轉，模型看起來會**瘋狂亂轉**。
 *    先依質心角度排成逆時針（螢幕座標 y 向下，所以視覺上是順時針），
 *    再旋轉陣列讓「離原點最近」的角當第一個。
 */
export function orderCorners(pts) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const sorted = [...pts].sort((a, b) =>
    Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx))
  let start = 0, bestScore = Infinity
  sorted.forEach((p, i) => {
    const s = p[0] + p[1]          // 左上角的 x+y 最小
    if (s < bestScore) { bestScore = s; start = i }
  })
  return [0, 1, 2, 3].map(i => sorted[(start + i) % 4])
}

/**
 * 背景模型：用畫面**外framing一圈**的像素當「桌面顏色」，凡是與它差很多的都算紙。
 *
 * ⚠️ 這一招是為了真實印刷品加的。只用 Otsu＋補洞在「紙比桌面亮、且紙上的深色內容
 *    不碰到紙邊」時很好用，但真實版面常有**滿版出血**的深色元素（月曆頁頂端的
 *    色帶、邊緣的插圖）——那些一路連到紙的邊緣，於是跟外面的桌面連成一片，
 *    補洞時被當成背景挖掉，最大元件小一圈、四邊形度也過不了關（實測直接回 null）。
 *    改用「與桌面顏色的差異」當前景判準之後，不論紙上印的是深是淺都會被包進來，
 *    只要桌面本身夠均勻——而那正是使用者會做的事（把卡片放在桌上拍）。
 */
export function backgroundMask(gray, w, h, tol = 26) {
  const ring = []
  const step = Math.max(1, Math.floor(Math.min(w, h) / 40))
  for (let x = 0; x < w; x += step) { ring.push(gray[x], gray[(h - 1) * w + x]) }
  for (let y = 0; y < h; y += step) { ring.push(gray[y * w], gray[y * w + w - 1]) }
  if (!ring.length) return null
  ring.sort((a, b) => a - b)
  const med = ring[ring.length >> 1]
  // 邊框自己的離散程度：桌面有紋理時要放寬，否則整片桌面都被當成紙
  const mad = ring.map(v => Math.abs(v - med)).sort((a, b) => a - b)[ring.length >> 1]
  const th = Math.max(tol, mad * 3)
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = Math.abs(gray[i] - med) > th ? 1 : 0
  return out
}

/**
 * 主入口：在灰階畫面裡找出最像卡片的四邊形。
 *
 * @param {Uint8Array} gray 灰階像素（w*h）
 * @param {object} o  minAreaRatio 最小面積佔比（濾掉太小的雜訊）
 *                    maxAreaRatio 最大面積佔比（濾掉「整個畫面都是牆」的情況）
 * @returns {{ corners:number[][], areaRatio:number }|null}
 */
export function detectQuad(gray, w, h, { minAreaRatio = 0.06, maxAreaRatio = 0.92 } = {}) {
  const blurred = boxBlur3(gray, w, h)
  const t = otsuThreshold(blurred)
  const total = w * h

  // 三種前景假設都試，取「最像一張卡片」的那個：
  //   1/0  Otsu 的兩種極性（紙比桌面亮／暗）
  //   'bg' 與桌面顏色的差異（處理滿版出血的深色元素，見 backgroundMask）
  let best = null
  const bgMask = backgroundMask(blurred, w, h)
  for (const strategy of [1, 0, 'bg']) {
    let raw
    if (strategy === 'bg') {
      if (!bgMask) continue
      raw = bgMask
    } else {
      raw = new Uint8Array(total)
      for (let i = 0; i < total; i++) raw[i] = (strategy ? blurred[i] > t : blurred[i] <= t) ? 1 : 0
    }
    // 補洞：紙上的深色內容不該被當成背景（見 fillFromBorder 的說明）
    const bin = fillFromBorder(raw, w, h)
    const comp = largestComponent(bin, w, h)
    if (!comp) continue
    const ratio = comp.size / total
    if (ratio < minAreaRatio || ratio > maxAreaRatio) continue
    const bpts = boundaryPoints(comp.mask, w, h)
    if (bpts.length < 8) continue
    const hull = convexHull(bpts)
    const rough = reduceHullToQuad(hull)
    if (!rough || rough.length !== 4) continue
    if (!isConvex(rough)) continue
    // ⚠️ 凸包縮成四邊形時**損失了多少面積**，才是「這團東西是不是四邊形」的判準。
    //    只看實心度不夠：實測一個 L 形，貪婪縮頂點會收斂成一個貼著 L 外緣的梯形，
    //    L 佔那個梯形的 94%——實心度完全過關，但它根本不是卡片。
    //    真的四邊形其凸包本來就只有四個頂點，縮減幾乎不損失面積。
    const hullArea = Math.abs(polyArea(hull))
    const roughArea = Math.abs(polyArea(rough))
    if (hullArea > 0 && roughArea / hullArea < 0.92) continue
    const poly = refineCorners(bpts, rough)
    const area = Math.abs(polyArea(poly))
    // 實心度：元件面積 ÷ 外接四邊形面積。真的卡片幾乎是 1（只差像素化），
    // 明顯低於 1 代表這團東西不是矩形（手指、L 形物件、兩張卡片黏在一起）。
    // ⚠️ 門檻不可放太鬆——實測 0.72 會讓一個 L 形通過，那正是「看起來會動、
    //    但貼歪」的來源。0.85 對真卡片仍有充足餘裕。
    if (area > 0 && comp.size / area < 0.85) continue
    const aRatio = area / total
    if (aRatio < minAreaRatio || aRatio > maxAreaRatio) continue
    if (!best || aRatio > best.areaRatio) best = { corners: orderCorners(poly), areaRatio: aRatio }
  }
  return best
}

/**
 * 依偵測到的四邊形把畫面「拉正」成正方形（perspective unwarp）。
 * 拉正之後才做辨識——比直接拿歪斜的畫面比對準得多，因為參考簽名本來就是正的。
 *
 * 用反向映射（對輸出的每個像素反算來源座標）＋雙線性取樣，避免輸出有破洞。
 *
 * @param {Uint8ClampedArray} rgba 來源畫面
 * @param {number[][]} corners 四角（左上順時針）
 * @param {number} size 輸出邊長
 * @returns {Uint8ClampedArray} size*size*4
 */
export function rectify(rgba, w, h, corners, size) {
  // 單位正方形 → 畫面四角，取反即為「輸出座標 → 來源座標」
  const out = new Uint8ClampedArray(size * size * 4)
  const [tl, tr, br, bl] = corners
  for (let y = 0; y < size; y++) {
    const v = y / (size - 1)
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1)
      // 雙線性插值四個角（對平面而言與 homography 近似，且不需解方程組）
      // ⚠️ 這是刻意的近似：強透視下會有幾個像素的偏差，但辨識用的 dHash
      //    是 8×8 的粗粒度雜湊，這點偏差影響不到結果，換來的是省一次矩陣求解。
      const sx = (1 - v) * ((1 - u) * tl[0] + u * tr[0]) + v * ((1 - u) * bl[0] + u * br[0])
      const sy = (1 - v) * ((1 - u) * tl[1] + u * tr[1]) + v * ((1 - u) * bl[1] + u * br[1])
      const x0 = Math.max(0, Math.min(w - 1, Math.floor(sx)))
      const y0 = Math.max(0, Math.min(h - 1, Math.floor(sy)))
      const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1)
      const fx = sx - x0, fy = sy - y0
      const o = (y * size + x) * 4
      for (let c = 0; c < 4; c++) {
        const p00 = rgba[(y0 * w + x0) * 4 + c], p10 = rgba[(y0 * w + x1) * 4 + c]
        const p01 = rgba[(y1 * w + x0) * 4 + c], p11 = rgba[(y1 * w + x1) * 4 + c]
        out[o + c] = (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy
      }
    }
  }
  return out
}

/** 把 RGBA 旋轉 90° × n（辨識時要試四個方向，卡片可能被倒著放）。 */
export function rotateRgba(rgba, size, times) {
  const t = ((times % 4) + 4) % 4
  if (!t) return rgba
  let cur = rgba
  for (let r = 0; r < t; r++) {
    const out = new Uint8ClampedArray(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // 順時針 90°：(x,y) ← (y, size-1-x)
        const s = ((size - 1 - x) * size + y) * 4
        const o = (y * size + x) * 4
        out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = cur[s + 3]
      }
    }
    cur = out
  }
  return cur
}
