// ============================================================================
// 特徵點比對 —— 不需要看到卡片的四個角就能認出目標
//
// ★ 為什麼要有這一層（使用者的問題：「.mind 都可以很容易掃到，為何你做不到？」）
//
//   原本的路線是「找紙的四個角 → 透視拉正 → 整張圖 dHash」。那條路有三個
//   結構性的限制，都不是調參數能解決的：
//     ① **四個角都要看得到**——卡片被手指遮到一角、或只拍到一半就完全失敗
//     ② **需要紙與桌面的邊界**——白紙放在白桌上實測 0/24（那裡真的沒有資訊）
//     ③ 整張圖的雜湊對「畫面裡卡片很小」很敏感（實測佔畫面 30% 時 10/24）
//
//   MindAR 那類函式庫走的是**特徵點**：在圖上找幾百個角點、各算一個描述子，
//   拍到的畫面也算一次，然後配對 → RANSAC 解 homography。它不需要輪廓，
//   所以上面三個限制全部消失。這一支就是那條路，同樣零第三方相依。
//
// ★ 關鍵設計：**輸出與舊路線完全一樣**（`{H, corners}`）。
//   參考點存的是**卡面正規化座標 0..1**，所以 RANSAC 直接解出「單位正方形 → 畫面」
//   的 H——與 `homography(UNIT_SQUARE, corners)` 得到的東西同一個意思。
//   於是姿態分解、熱區命中、3D 貼合、CSS matrix3d 全部不用改一行。
//
// ⚠️ 這一層是純數學，**寫錯不會拋錯**，只會讓比對率變差或貼歪。
//   `scripts/check-features.mjs` 逐項驗（含合成的旋轉／縮放／透視真值）。
// ============================================================================

// ── FAST-9 的 16 鄰域圓（順時針，從正上方開始）──
// ⚠️ 順序必須是沿圓周連續的，因為「連續 N 個都更亮／更暗」這個判準靠的就是相鄰性。
const FAST_CIRCLE = [
  [0, -3], [1, -3], [2, -2], [3, -1], [3, 0], [3, 1], [2, 2], [1, 3],
  [0, 3], [-1, 3], [-2, 2], [-3, 1], [-3, 0], [-3, -1], [-2, -2], [-1, -3],
]

/**
 * FAST-9 角點偵測。
 *
 * @param gray Uint8Array/Uint8ClampedArray（w*h，單通道）
 * @returns {{x:Int32Array,y:Int32Array,score:Int32Array,n:number}}
 *
 * ⚠️ 先做「4 點快篩」再做完整 16 點檢查：絕大多數像素不是角點，
 *    少了快篩會慢好幾倍——而這一步是每幀都要跑的。
 */
export function fastCorners(gray, w, h, { threshold = 20, border = 16 } = {}) {
  const cap = Math.max(64, ((w * h) / 40) | 0)
  const xs = new Int32Array(cap), ys = new Int32Array(cap), sc = new Int32Array(cap)
  let n = 0
  const off = FAST_CIRCLE.map(([dx, dy]) => dy * w + dx)
  // 快篩用圓上的 0/4/8/12（正上、右、下、左）——真角點至少要有 3 個同向
  const q = [off[0], off[4], off[8], off[12]]
  for (let y = border; y < h - border; y++) {
    for (let x = border; x < w - border; x++) {
      const i = y * w + x
      const p = gray[i]
      const hi = p + threshold, lo = p - threshold
      let bright = 0, dark = 0
      for (let k = 0; k < 4; k++) {
        const v = gray[i + q[k]]
        if (v > hi) bright++; else if (v < lo) dark++
      }
      if (bright < 3 && dark < 3) continue
      // 完整檢查：圓周上要有**連續 9 個**都更亮或都更暗
      let runB = 0, maxB = 0, runD = 0, maxD = 0
      for (let k = 0; k < 24; k++) {          // 繞 1.5 圈以處理跨越接縫的連續段
        const v = gray[i + off[k % 16]]
        if (v > hi) { runB++; if (runB > maxB) maxB = runB } else runB = 0
        if (v < lo) { runD++; if (runD > maxD) maxD = runD } else runD = 0
      }
      if (maxB < 9 && maxD < 9) continue
      // 分數＝圓周上與中心的絕對差總和（給非極大值抑制排序用）
      let s = 0
      for (let k = 0; k < 16; k++) s += Math.abs(gray[i + off[k]] - p)
      if (n < cap) { xs[n] = x; ys[n] = y; sc[n] = s; n++ }
    }
  }
  return { x: xs, y: ys, score: sc, n }
}

/**
 * 非極大值抑制 ＋ 取分數最高的前 N 個。
 *
 * ⚠️ 一定要做：FAST 在一個真實角落周圍會吐出一整團點，不抑制的話
 *    描述子會有大量重複，配對時互相搶（ratio test 會把它們全部否決掉）。
 */
export function suppress(kp, w, h, { radius = 4, maxCount = 300 } = {}) {
  const idx = Array.from({ length: kp.n }, (_, i) => i)
  idx.sort((a, b) => kp.score[b] - kp.score[a])
  // 空間格點加速的半徑抑制。
  // ⚠️ 格子裡要存**點**並做真正的距離判斷，不可只用「這格有沒有被佔」——
  //    後者的實際排除半徑會變成 radius~3×radius（跨格時），實測在 480×360 上
  //    只留下 68 個點（真正的半徑 4 抑制留 150+）。特徵點少一半，配對率就跟著掉。
  const cell = Math.max(1, radius)
  const gw = Math.ceil(w / cell) + 1, gh = Math.ceil(h / cell) + 1
  const bins = new Array(gw * gh)
  const out = []
  const r2 = radius * radius
  for (const i of idx) {
    if (out.length >= maxCount) break
    const px = kp.x[i], py = kp.y[i]
    const cx = (px / cell) | 0, cy = (py / cell) | 0
    let clash = false
    for (let dy = -1; dy <= 1 && !clash; dy++) {
      for (let dx = -1; dx <= 1 && !clash; dx++) {
        const gx = cx + dx, gy = cy + dy
        if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue
        const b = bins[gy * gw + gx]
        if (!b) continue
        for (const p of b) {
          const ex = p.x - px, ey = p.y - py
          if (ex * ex + ey * ey < r2) { clash = true; break }
        }
      }
    }
    if (clash) continue
    const pt = { x: px, y: py, score: kp.score[i] }
    const key = cy * gw + cx
    ;(bins[key] || (bins[key] = [])).push(pt)
    out.push(pt)
  }
  return out
}

/**
 * 角點方向（強度重心法，ORB 用的那個）。
 *
 * ⚠️ 沒有方向就沒有旋轉不變性——卡片轉 30° 描述子就全部對不上。
 *    重心法夠用而且極便宜（一次加權和），不需要梯度直方圖。
 */
export function cornerAngle(gray, w, h, x, y, radius = 7) {
  let m01 = 0, m10 = 0
  const r2 = radius * radius
  for (let dy = -radius; dy <= radius; dy++) {
    const yy = y + dy
    if (yy < 0 || yy >= h) continue
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const xx = x + dx
      if (xx < 0 || xx >= w) continue
      const v = gray[yy * w + xx]
      m10 += dx * v; m01 += dy * v
    }
  }
  return Math.atan2(m01, m10)
}

// ── BRIEF-256 的取樣對 ──
// ⚠️ 這張表必須是**固定的**（參考圖與畫面要用同一組取樣位置），所以用
//    確定性的方式產生而不是 Math.random——否則每次載入的描述子都不一樣，
//    而且不會有任何錯誤訊息，只會永遠配不到。
const BRIEF_PATTERN = (() => {
  // 簡單的 LCG，種子固定；取樣點落在 ±12 的視窗內（高斯狀分布：兩個均勻相加）
  let s = 0x2545f491
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const g = () => Math.round((rnd() + rnd() - 1) * 12)
  const p = new Int8Array(256 * 4)
  for (let i = 0; i < 256; i++) {
    p[i * 4] = g(); p[i * 4 + 1] = g(); p[i * 4 + 2] = g(); p[i * 4 + 3] = g()
  }
  return p
})()

export const DESC_WORDS = 8      // 256 bit = 8 × Uint32

/**
 * 算描述子（旋轉過的 BRIEF＝rBRIEF）。
 *
 * @param blurred **必須是模糊過的**灰階圖。
 *   ⚠️ BRIEF 比的是「兩個點誰比較亮」，直接用原圖時單一像素的雜訊就會翻轉那一個 bit。
 *      實測不模糊時配對率大約掉一半。
 */
export function describeKeypoints(blurred, w, h, kps) {
  const desc = new Uint32Array(kps.length * DESC_WORDS)
  for (let k = 0; k < kps.length; k++) {
    const { x, y, angle } = kps[k]
    const ca = Math.cos(angle), sa = Math.sin(angle)
    const base = k * DESC_WORDS
    for (let i = 0; i < 256; i++) {
      const ax = BRIEF_PATTERN[i * 4], ay = BRIEF_PATTERN[i * 4 + 1]
      const bx = BRIEF_PATTERN[i * 4 + 2], by = BRIEF_PATTERN[i * 4 + 3]
      // 依角點方向旋轉取樣對
      let x1 = x + Math.round(ca * ax - sa * ay), y1 = y + Math.round(sa * ax + ca * ay)
      let x2 = x + Math.round(ca * bx - sa * by), y2 = y + Math.round(sa * bx + ca * by)
      // 夾在邊界內（比丟掉整個角點好：邊緣的點仍有一半的 bit 有意義）
      if (x1 < 0) x1 = 0; else if (x1 >= w) x1 = w - 1
      if (y1 < 0) y1 = 0; else if (y1 >= h) y1 = h - 1
      if (x2 < 0) x2 = 0; else if (x2 >= w) x2 = w - 1
      if (y2 < 0) y2 = 0; else if (y2 >= h) y2 = h - 1
      if (blurred[y1 * w + x1] < blurred[y2 * w + x2]) {
        desc[base + (i >> 5)] |= (1 << (i & 31))
      }
    }
  }
  return desc
}

/** popcount（Hamming weight），32 bit。 */
function popcount(v) {
  v = v - ((v >> 1) & 0x55555555)
  v = (v & 0x33333333) + ((v >> 2) & 0x33333333)
  v = (v + (v >> 4)) & 0x0f0f0f0f
  return (v * 0x01010101) >> 24
}

/** 兩個描述子的 Hamming 距離（0..256）。 */
export function hamming(a, ai, b, bi) {
  let d = 0
  for (let k = 0; k < DESC_WORDS; k++) d += popcount((a[ai + k] ^ b[bi + k]) | 0)
  return d
}

/**
 * 描述子配對（暴力法 ＋ ratio test）。
 *
 * @param ratio 最近／次近的距離比上限。0.8 是 Lowe 的經典值。
 *   ⚠️ **不可只取最近鄰**：卡面上重複的紋樣（格線、文字）會產生大量看起來一樣的
 *      描述子，只取最近鄰時錯誤配對比正確的還多，RANSAC 也救不回來。
 *      ratio test 的作用是「這個配對夠獨特嗎」，不是「夠像嗎」。
 */
export function matchDescriptors(descQ, nQ, descR, nR, { ratio = 0.8, maxDist = 90 } = {}) {
  const out = []
  const r2 = ratio * ratio
  for (let i = 0; i < nQ; i++) {
    const qi = i * DESC_WORDS
    let d1 = 1e9, d2 = 1e9, j1 = -1
    for (let j = 0; j < nR; j++) {
      const d = hamming(descQ, qi, descR, j * DESC_WORDS)
      if (d < d1) { d2 = d1; d1 = d; j1 = j } else if (d < d2) d2 = d
    }
    if (j1 < 0 || d1 > maxDist) continue
    // ratio test（用平方避免除法；d2 可能是 1e9，這時一定通過）
    if (d1 * d1 <= r2 * d2 * d2) out.push({ q: i, r: j1, dist: d1 })
  }
  return out
}

// ── 影像金字塔 ────────────────────────────────────────────────────────────
/**
 * 建金字塔（面積平均降採樣）。
 *
 * ⚠️ 這是**尺度不變性**的來源，也是「卡片在畫面裡很小也認得到」的關鍵：
 *    參考圖在多個尺度上都存了特徵點，畫面上的小卡片會對上參考圖較小的那一層。
 * ⚠️ 不可用最近鄰降採樣：會產生鋸齒，而 FAST 對鋸齒非常敏感——
 *    整個金字塔會長出一堆假角點，配對率反而下降。
 */
export function buildPyramid(gray, w, h, { levels = 4, factor = 1.4 } = {}) {
  const out = [{ gray, w, h, scale: 1 }]
  let cur = gray, cw = w, ch = h, s = 1
  for (let l = 1; l < levels; l++) {
    const nw = Math.max(24, Math.round(cw / factor)), nh = Math.max(24, Math.round(ch / factor))
    if (nw < 40 || nh < 40) break
    const dst = new Uint8Array(nw * nh)
    const sx = cw / nw, sy = ch / nh
    for (let y = 0; y < nh; y++) {
      const y0 = (y * sy) | 0, y1 = Math.min(ch, Math.max(y0 + 1, ((y + 1) * sy) | 0))
      for (let x = 0; x < nw; x++) {
        const x0 = (x * sx) | 0, x1 = Math.min(cw, Math.max(x0 + 1, ((x + 1) * sx) | 0))
        let acc = 0, n = 0
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { acc += cur[yy * cw + xx]; n++ }
        dst[y * nw + x] = acc / n
      }
    }
    s *= cw / nw
    out.push({ gray: dst, w: nw, h: nh, scale: s })
    cur = dst; cw = nw; ch = nh
  }
  return out
}

/** 3×3 方框模糊（給 BRIEF 用，見 describeKeypoints 的說明）。 */
export function blur3(gray, w, h) {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0, y1 = y < h - 1 ? y + 1 : h - 1
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0, x1 = x < w - 1 ? x + 1 : w - 1
      let s = 0
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) s += gray[yy * w + xx]
      out[y * w + x] = s / ((y1 - y0 + 1) * (x1 - x0 + 1))
    }
  }
  return out
}

/**
 * 在整座金字塔上擷取特徵。
 * @returns {{pts:{x:number,y:number}[], desc:Uint32Array, n:number}}
 *   pts 的座標**已換算回第 0 層**（也就是傳進來的原尺寸），呼叫端不必再管尺度。
 */
export function extractFeatures(gray, w, h, {
  levels = 4, factor = 1.4, threshold = 20, maxPerLevel = 120, maxTotal = 400,
} = {}) {
  const pyr = buildPyramid(gray, w, h, { levels, factor })
  const pts = []
  const descs = []
  // ★★ 每一層都要有配額，**不可先到先滿**。
  //
  // ⚠️ 第一版寫成「點數到 maxTotal 就 break」，於是 600 個名額全被第 0~2 層吃掉，
  //    **最粗的那一層一個點都沒收進去**——而那一層正是「畫面上的小卡片」要對上的。
  //    症狀：合成真值測試（參考與畫面尺度接近）通過，但拿真卡片測**全部 0/16**，
  //    配對數只有 8~9。看起來像「描述子不夠好」，實際是尺度覆蓋有洞。
  //    這是這一層最容易寫壞、又最難從單一測試看出來的地方。
  const quota = Math.max(40, Math.floor(maxTotal / Math.max(1, pyr.length)))
  for (const lv of pyr) {
    const raw = fastCorners(lv.gray, lv.w, lv.h, { threshold, border: 16 })
    const kept = suppress(raw, lv.w, lv.h, { radius: 4, maxCount: Math.min(maxPerLevel, quota) })
    if (!kept.length) continue
    const bl = blur3(lv.gray, lv.w, lv.h)
    for (const k of kept) k.angle = cornerAngle(lv.gray, lv.w, lv.h, k.x, k.y, 7)
    const d = describeKeypoints(bl, lv.w, lv.h, kept)
    for (let i = 0; i < kept.length; i++) {
      pts.push({ x: kept[i].x * lv.scale, y: kept[i].y * lv.scale, scale: lv.scale })
      descs.push(d.subarray(i * DESC_WORDS, (i + 1) * DESC_WORDS))
    }
  }
  const desc = new Uint32Array(descs.length * DESC_WORDS)
  descs.forEach((d, i) => desc.set(d, i * DESC_WORDS))
  return { pts, desc, n: pts.length }
}

// ── RANSAC ───────────────────────────────────────────────────────────────
function applyH(H, x, y) {
  const d = H[2][0] * x + H[2][1] * y + H[2][2]
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / d, (H[1][0] * x + H[1][1] * y + H[1][2]) / d]
}

/**
 * RANSAC 解 homography。
 *
 * @param src 參考點（**卡面正規化 0..1**）
 * @param dst 畫面點（取樣座標）
 * @returns {{H, inliers:number[], error:number}|null}
 *
 * ⚠️ 隨機取樣要**可重現**（帶種子），否則同一組輸入每次跑出不同結果，
 *    測試會時好時壞而你會以為是演算法不穩。
 * ⚠️ 四點不可共線或太靠近：那樣解出的 H 幾乎是退化的，重投影誤差看起來很小
 *    （因為只有那四點）但套到別的點就爆掉。所以取樣後要檢查面積。
 */
export function ransacHomography(src, dst, homographyFn, {
  iters = 600, thresh = 4, seed = 12345, minInliers = 10,
} = {}) {
  const n = src.length
  if (n < 4) return null
  let s = seed >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const pick = () => (rnd() * n) | 0
  let best = null
  const t2 = thresh * thresh
  for (let it = 0; it < iters; it++) {
    const a = pick(), b = pick(), c = pick(), d = pick()
    if (a === b || a === c || a === d || b === c || b === d || c === d) continue
    const q = [src[a], src[b], src[c], src[d]]
    // 退化檢查：四點圍出的面積太小就跳過（共線／重疊）
    const area = Math.abs(
      (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1])
    ) + Math.abs(
      (q[2][0] - q[0][0]) * (q[3][1] - q[0][1]) - (q[3][0] - q[0][0]) * (q[2][1] - q[0][1])
    )
    if (area < 0.02) continue          // 卡面正規化座標，0.02 約等於 14%×14% 的方形
    const H = homographyFn(q, [dst[a], dst[b], dst[c], dst[d]])
    if (!H) continue
    let cnt = 0, err = 0
    const inl = []
    for (let i = 0; i < n; i++) {
      const [px, py] = applyH(H, src[i][0], src[i][1])
      const dx = px - dst[i][0], dy = py - dst[i][1]
      const e = dx * dx + dy * dy
      if (e <= t2) { cnt++; err += e; inl.push(i) }
    }
    if (cnt >= 4 && (!best || cnt > best.inliers.length)) best = { H, inliers: inl, error: Math.sqrt(err / cnt) }
  }
  if (!best || best.inliers.length < minInliers) return null

  // ── ★★ refit：用**全部 inlier** 做最小平方，並反覆重估 inlier（IRLS 風格）──
  //
  // ⚠️ 只用當初那四點的 H 會偏：那四點的誤差是 0（它們決定了 H），其餘 inlier
  //    完全沒有被最小化。而金字塔粗層的點座標量化誤差本身就有 ±5px。
  //    實測（真卡片、佔畫面 62%）四點擬合的四角誤差 16~35px、偶發 72px；
  //    換成全 inlier 最小平方之後降到個位數。
  // ⚠️ 要**迭代**：第一次 refit 之後 inlier 集合會變（原本邊緣的點進來、
  //    原本勉強的點出去），只做一次會停在次佳解。三輪就收斂了。
  let cur = best
  for (let pass = 0; pass < 3; pass++) {
    const inl = cur.inliers
    if (inl.length < 4) break
    const H2 = homographyLS(inl.map(i => src[i]), inl.map(i => dst[i]))
    if (!H2) break
    // 用新的 H 重新算 inlier 與誤差
    const inl2 = []
    let err = 0
    for (let i = 0; i < n; i++) {
      const [px, py] = applyH(H2, src[i][0], src[i][1])
      const dx = px - dst[i][0], dy = py - dst[i][1]
      const e = dx * dx + dy * dy
      if (e <= t2) { inl2.push(i); err += e }
    }
    if (inl2.length < 4) break
    const e2 = Math.sqrt(err / inl2.length)
    // 只在「inlier 沒變少、而且誤差有改善」時接受——避免越 refit 越差
    if (inl2.length >= cur.inliers.length * 0.9 && (e2 < cur.error || inl2.length > cur.inliers.length)) {
      cur = { H: H2, inliers: inl2, error: e2 }
    } else break
  }
  return cur
}

/**
 * ★★ 用**全部**對應點做最小平方擬合 homography（正規化 DLT）。
 *
 * ⚠️ 為什麼一定要有這一支：RANSAC 最後若仍只用四點擬合，那四點的誤差是 0
 *    （它們決定了 H），其餘 inlier 的誤差完全沒有被最小化。而金字塔粗層的
 *    點座標量化誤差本身就有 ±5px（scale 5.38 那一層），四點擬合會把那個誤差
 *    直接放大到整張卡。
 *    實測（真卡片、佔畫面 62%）：四點擬合的四角誤差 16~35px（偶發 72px），
 *    改成全 inlier 最小平方之後降到個位數。
 *
 * ⚠️ **必須先做 Hartley 正規化**（平移到重心、平均距離縮到 √2）。
 *    不正規化時 A^T A 的條件數極差——像素座標的量級是 10²、卡面座標是 10⁰，
 *    兩者混在同一個矩陣裡，解出來的 H 會對雜訊極度敏感。
 */
export function homographyLS(src, dst) {
  const n = src.length
  if (n < 4 || dst.length !== n) return null
  const norm = (pts) => {
    let cx = 0, cy = 0
    for (const [x, y] of pts) { cx += x; cy += y }
    cx /= n; cy /= n
    let d = 0
    for (const [x, y] of pts) d += Math.hypot(x - cx, y - cy)
    d /= n
    const s = d > 1e-9 ? Math.SQRT2 / d : 1
    return { s, cx, cy, out: pts.map(([x, y]) => [(x - cx) * s, (y - cy) * s]) }
  }
  const A = norm(src), B = norm(dst)
  // 正規方程式 M h = r（8 個未知數）
  const M = Array.from({ length: 8 }, () => new Float64Array(8))
  const r = new Float64Array(8)
  const row = new Float64Array(8)
  for (let i = 0; i < n; i++) {
    const [x, y] = A.out[i], [u, v] = B.out[i]
    // u 那一列
    row[0] = x; row[1] = y; row[2] = 1; row[3] = 0; row[4] = 0; row[5] = 0; row[6] = -u * x; row[7] = -u * y
    for (let a = 0; a < 8; a++) { r[a] += row[a] * u; for (let b = 0; b < 8; b++) M[a][b] += row[a] * row[b] }
    // v 那一列
    row[0] = 0; row[1] = 0; row[2] = 0; row[3] = x; row[4] = y; row[5] = 1; row[6] = -v * x; row[7] = -v * y
    for (let a = 0; a < 8; a++) { r[a] += row[a] * v; for (let b = 0; b < 8; b++) M[a][b] += row[a] * row[b] }
  }
  // 高斯消去（部分樞軸）
  const h = new Float64Array(8)
  for (let c = 0; c < 8; c++) {
    let piv = c
    for (let k = c + 1; k < 8; k++) if (Math.abs(M[k][c]) > Math.abs(M[piv][c])) piv = k
    if (Math.abs(M[piv][c]) < 1e-12) return null
    if (piv !== c) { const t = M[piv]; M[piv] = M[c]; M[c] = t; const tr = r[piv]; r[piv] = r[c]; r[c] = tr }
    for (let k = c + 1; k < 8; k++) {
      const f = M[k][c] / M[c][c]
      if (!f) continue
      for (let j = c; j < 8; j++) M[k][j] -= f * M[c][j]
      r[k] -= f * r[c]
    }
  }
  for (let c = 7; c >= 0; c--) {
    let s = r[c]
    for (let j = c + 1; j < 8; j++) s -= M[c][j] * h[j]
    h[c] = s / M[c][c]
  }
  if (!h.every(Number.isFinite)) return null
  const Hn = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]]
  // 反正規化：H = T_dst⁻¹ · Hn · T_src
  const Ts = [[A.s, 0, -A.s * A.cx], [0, A.s, -A.s * A.cy], [0, 0, 1]]
  const TdInv = [[1 / B.s, 0, B.cx], [0, 1 / B.s, B.cy], [0, 0, 1]]
  const mul = (P, Q) => P.map((pr, i) => Q[0].map((_, j) => pr.reduce((s, v, k) => s + v * Q[k][j], 0)))
  const H = mul(mul(TdInv, Hn), Ts)
  const d = H[2][2]
  if (!Number.isFinite(d) || Math.abs(d) < 1e-12) return null
  return H.map(rw => rw.map(v => v / d))
}

/** 由 H 推出卡片四角在畫面上的位置（單位正方形的四角投影）。 */
export function cornersFromH(H, aspect = 1) {
  const k = 1 / (aspect || 1)
  return [[0, 0], [1, 0], [1, k], [0, k]].map(([u, v]) => applyH(H, u, v))
}
