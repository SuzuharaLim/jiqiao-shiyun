// ============================================================================
// 自研影像掃描工具（機巧時運）—— 純 JavaScript、零第三方相依、全裝置端運算
//
// 影像簽名 = 感知雜湊（dHash，對亮度變化穩健）＋ RGB 色彩直方圖（對構圖穩健）
// 另備清晰度偵測（拉普拉斯變異數）過濾模糊畫面，與多視窗比對容忍手持偏移。
//
// 刻意設計為「純陣列運算」：不觸碰 DOM / Canvas，因此可直接在 Node 做單元測試；
// 取像（video → ImageData）由呼叫端（Scan.jsx）以 canvas 完成。
// 影像資料一律不上傳——辨識完全在使用者裝置上進行。
// ============================================================================

/** RGBA（Uint8ClampedArray，長度 w*h*4）→ 灰階 Uint8Array（w*h），Rec.601 加權 */
export function toGray(rgba, w, h) {
  const g = new Uint8Array(w * h)
  for (let i = 0, p = 0; i < g.length; i++, p += 4) {
    g[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000
  }
  return g
}

/** 灰階盒狀平均縮放（box sampling，抗噪比最近鄰穩） */
export function resizeGray(src, w, h, tw, th) {
  const out = new Uint8Array(tw * th)
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor(ty * h / th)
    const y1 = Math.max(y0 + 1, Math.floor((ty + 1) * h / th))
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor(tx * w / tw)
      const x1 = Math.max(x0 + 1, Math.floor((tx + 1) * w / tw))
      let sum = 0, n = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += src[y * w + x]; n++ }
      out[ty * tw + tx] = sum / n
    }
  }
  return out
}

/**
 * dHash（差異雜湊）：縮到 (hw+1)×hh 後逐列比較相鄰像素亮度 → hw*hh bits。
 * 對亮度/對比變化穩健（只看梯度方向），預設 8×8 = 64 bits（8 bytes）。
 */
export function dhash(gray, w, h, hw = 8, hh = 8) {
  const small = resizeGray(gray, w, h, hw + 1, hh)
  const bits = new Uint8Array(Math.ceil((hw * hh) / 8))
  let bi = 0
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++, bi++) {
      if (small[y * (hw + 1) + x] > small[y * (hw + 1) + x + 1]) bits[bi >> 3] |= 1 << (bi & 7)
    }
  }
  return bits
}

/** 漢明距離（兩個 Uint8Array 位元差異數） */
export function hamming(a, b) {
  let d = 0
  for (let i = 0; i < a.length; i++) { let v = a[i] ^ b[i]; while (v) { v &= v - 1; d++ } }
  return d
}

/** RGB 直方圖（每通道 nBins，需為 2 的次方）→ Float32Array(3*nBins)，每通道正規化為 1 */
export function rgbHistogram(rgba, nBins = 8) {
  const hist = new Float32Array(nBins * 3)
  const shift = 31 - Math.clz32(256 / nBins)   // 256/nBins 的 log2（nBins=8 → 5）
  const n = rgba.length / 4
  for (let p = 0; p < rgba.length; p += 4) {
    hist[rgba[p] >> shift]++
    hist[nBins + (rgba[p + 1] >> shift)]++
    hist[2 * nBins + (rgba[p + 2] >> shift)]++
  }
  for (let i = 0; i < hist.length; i++) hist[i] /= n
  return hist
}

/** 直方圖交集相似度 0..1（Σmin ÷ 通道數） */
export function histIntersection(h1, h2) {
  let s = 0
  for (let i = 0; i < h1.length; i++) s += Math.min(h1[i], h2[i])
  return s / 3
}

/** 清晰度：拉普拉斯變異數（過低＝模糊或沒有對準內容） */
export function sharpness(gray, w, h) {
  let sum = 0, sum2 = 0, n = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w]
      sum += lap; sum2 += lap * lap; n++
    }
  }
  const mean = sum / n
  return sum2 / n - mean * mean
}

/** 從大張 RGBA 裁出子視窗（供多視窗比對，容忍手持偏移） */
export function cropRgba(rgba, w, h, x, y, cw, ch) {
  const out = new Uint8ClampedArray(cw * ch * 4)
  for (let row = 0; row < ch; row++) {
    const srcStart = ((y + row) * w + x) * 4
    out.set(rgba.subarray(srcStart, srcStart + cw * 4), row * cw * 4)
  }
  return out
}

/** 建立影像簽名：{ hash, hist, sharp } */
export function makeSignature(rgba, w, h) {
  const gray = toGray(rgba, w, h)
  return { hash: dhash(gray, w, h), hist: rgbHistogram(rgba), sharp: sharpness(gray, w, h) }
}

/**
 * 比對分數 0–100：dHash 佔 70%（漢明 0→滿分、≥24 bits→0 分）＋ 直方圖佔 30%。
 * 64-bit dHash 隨機影像期望漢明 ≈ 32，同影像輕微位移/亮度變化通常 ≤ 10。
 */
export function matchScore(sig, ref) {
  const hashScore = Math.max(0, 1 - hamming(sig.hash, ref.hash) / 24)
  const histScore = histIntersection(sig.hist, ref.hist)
  return Math.round((hashScore * 0.7 + histScore * 0.3) * 100)
}

/** 對一組已登錄簽名找最佳匹配：回傳 { ref|null, score, ok }（refs 為空回 null） */
export function bestMatch(sig, refs, minScore = 60) {
  if (!refs.length) return null
  let best = refs[0], bestScore = -1
  for (const r of refs) {
    const s = matchScore(sig, r)
    if (s > bestScore) { bestScore = s; best = r }
  }
  const ok = bestScore >= minScore
  return { ref: ok ? best : null, name: best.name, score: bestScore, ok }
}

/**
 * 多視窗比對：在較大的取樣畫面上取 5 個子視窗（中央＋四角偏移）各自簽名，
 * 取最高分 → 容忍約 ±12% 的手持偏移。回傳同 bestMatch 形狀。
 */
export function bestMatchMultiWindow(rgba, w, h, cw, ch, refs, minScore = 60) {
  if (!refs.length) return null
  const ox = w - cw, oy = h - ch
  const offsets = [
    [ox >> 1, oy >> 1],            // 中央
    [0, 0], [ox, 0], [0, oy], [ox, oy],  // 四角
  ]
  let best = null
  for (const [x, y] of offsets) {
    const sig = makeSignature(cropRgba(rgba, w, h, x, y, cw, ch), cw, ch)
    const m = bestMatch(sig, refs, minScore)
    if (m && (!best || m.score > best.score)) best = m
  }
  return best
}

// ---------- 簽名序列化（localStorage 持久化用） ----------

export function serializeSig(sig) {
  return {
    hash: Array.from(sig.hash, b => b.toString(16).padStart(2, '0')).join(''),
    hist: Array.from(sig.hist, v => Math.round(v * 10000) / 10000),
  }
}

export function deserializeSig(o) {
  const bytes = new Uint8Array(o.hash.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(o.hash.slice(i * 2, i * 2 + 2), 16)
  return { hash: bytes, hist: Float32Array.from(o.hist) }
}
