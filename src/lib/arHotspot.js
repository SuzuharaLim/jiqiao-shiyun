// ============================================================================
// 卡面熱區 —— 「使用者點到卡片上的哪個東西」
//
// 這是改版文件「決策 A」的實作：不做物件偵測模型，改用卡片座標系熱區。
// 追蹤器解出 homography 之後就等同拿到卡面的座標系，命中判定只是一次座標換算：
//
//     螢幕點 →（換算成取樣畫面座標）→ H⁻¹ → 卡面正規化 (u,v) ∈ [0,1]² → 落在哪個 rect
//
// 零額外模型體積、零推論延遲、維持「裝置端運算不上傳」，新增一張卡只是加一筆 JSON。
// 而且在低解析度手機影像上，這比跑物件偵測準得多。
//
// ⚠️ 座標系有三層，混用是這一層唯一會出錯的地方：
//      ① 螢幕／CSS 像素（使用者手指的位置，含 object-fit: cover 的裁切）
//      ② 取樣畫面（追蹤器的座標系，例如 95×160）
//      ③ 卡面正規化 0..1（熱區 rect 的座標系）
//    ARScene 已經踩過一次②↔①：取樣是 4:3 而顯示框是 375×601 時，
//    非等比縮放讓內容飛到畫面外三萬 px。所以這裡的換算一律經過 grab 尺寸，
//    不直接拿螢幕座標套 H⁻¹。
// ============================================================================
import { invert3, applyH } from './homography.js'

/**
 * 螢幕座標 → 卡面正規化座標。
 *
 * @param H        追蹤器回傳的 homography（卡面單位正方形 → 取樣畫面）
 * @param pt       {x, y} CSS 像素，相對於顯示框左上角
 * @param layout   {dispW, dispH, grabW, grabH} 顯示框與取樣畫面的尺寸
 * @returns {[u, v]} 卡面正規化座標；可能落在 0..1 之外（代表點在卡片外）
 */
export function screenToCard(H, pt, layout) {
  const { dispW, dispH, grabW, grabH } = layout
  if (!H || !dispW || !dispH || !grabW || !grabH) return null
  // 取樣時已把裁切比例對齊顯示框，所以是等比縮放（見 ARScene 的說明）
  const s = grabW / dispW
  const gx = pt.x * s
  const gy = pt.y * (grabH / dispH)
  const inv = invert3(H)
  if (!inv) return null
  const [u, v] = applyH(inv, gx, gy)
  return Number.isFinite(u) && Number.isFinite(v) ? [u, v] : null
}

/** 點是否落在 rect（rect 為卡面正規化座標，原點左上）。 */
export function inRect(u, v, rect) {
  return u >= rect.x && u <= rect.x + rect.w && v >= rect.y && v <= rect.y + rect.h
}

/**
 * 找出被點到的熱區。多個重疊時取**面積最小**的那個——
 * 小熱區通常是大熱區裡的細節，使用者點小的意圖比較明確。
 */
export function hitTest(hotspots, u, v) {
  if (!Array.isArray(hotspots)) return null
  let best = null, bestArea = Infinity
  for (const hs of hotspots) {
    if (!hs?.rect || !inRect(u, v, hs.rect)) continue
    const area = hs.rect.w * hs.rect.h
    if (area < bestArea) { best = hs; bestArea = area }
  }
  return best
}

/**
 * 自動命中：鏡頭對準卡片時，不需要使用者點，看哪個熱區最靠畫面中心就跳它。
 * 用在「找到了！小寒 → 點一下圖上的大白菜」之後的引導，以及無觸控的情境。
 */
export function hotspotAtCenter(H, hotspots, layout) {
  const uv = screenToCard(H, { x: layout.dispW / 2, y: layout.dispH / 2 }, layout)
  return uv ? hitTest(hotspots, uv[0], uv[1]) : null
}

/**
 * 防手震：連續 N 幀命中同一個熱區才算真的命中；中斷就重新計數。
 *
 * ⚠️ 為什麼一定要有這層：追蹤是每秒 15 次，四角偵測本身有 1px 上下的抖動，
 *    熱區邊界附近會在「命中／沒命中」之間高頻跳動。沒有防抖的話畫面會
 *    瘋狂開關 3D 舞台——而那是最貴的操作（建 WebGL 場景、編譯 shader）。
 *
 * ⚠️ 同時也要有**離開**的門檻，而且要比進入的門檻寬（hysteresis）。
 *    進入與離開用同一個門檻時，站在邊界上會等頻率地一直開一直關；
 *    離開門檻放寬就變成「要真的移開才收起來」。改版文件 §6.3 提到
 *    「追丟 > 500ms 才收起內容」是同一個道理，這裡是熱區層級的版本。
 */
export function makeHotspotLatch({ enterFrames = 3, leaveFrames = 8 } = {}) {
  let armedId = null, armedCount = 0     // 正在累積的候選
  let heldId = null, missCount = 0       // 已經命中、正在維持的

  return {
    get current() { return heldId },
    reset() { armedId = null; armedCount = 0; heldId = null; missCount = 0 },
    /**
     * @param id 這一幀命中的熱區 id（沒命中傳 null）
     * @returns {{ id, changed }} id 為目前應該顯示的熱區
     */
    push(id) {
      if (heldId) {
        // 維持階段：只有連續沒命中夠多幀才放掉
        if (id === heldId) { missCount = 0 } else if (++missCount >= leaveFrames) {
          heldId = null; missCount = 0; armedId = id; armedCount = id ? 1 : 0
          return { id: null, changed: true }
        }
        return { id: heldId, changed: false }
      }
      // 累積階段
      if (!id) { armedId = null; armedCount = 0; return { id: null, changed: false } }
      if (id === armedId) armedCount++
      else { armedId = id; armedCount = 1 }
      if (armedCount >= enterFrames) {
        heldId = id; missCount = 0; armedId = null; armedCount = 0
        return { id, changed: true }
      }
      return { id: null, changed: false }
    },
  }
}

/**
 * 驗證一筆卡片設定。
 * ⚠️ 熱區資料是人工標註的 JSON，寫錯不會拋錯——只會讓使用者點不到東西，
 *    或點到卡片另一邊。所以載入時就檢查，錯的直接剔除並回報。
 */
export function validateCard(card) {
  const errs = []
  if (!card?.id) errs.push('缺少 id')
  if (!Array.isArray(card?.hotspots) || !card.hotspots.length) errs.push('沒有任何熱區')
  for (const hs of card?.hotspots ?? []) {
    const r = hs?.rect
    if (!hs?.id) { errs.push('熱區缺少 id'); continue }
    if (!r || ![r.x, r.y, r.w, r.h].every(Number.isFinite)) { errs.push(`${hs.id}: rect 不完整`); continue }
    if (r.w <= 0 || r.h <= 0) errs.push(`${hs.id}: rect 寬高必須為正`)
    if (r.x < 0 || r.y < 0 || r.x + r.w > 1 || r.y + r.h > 1) errs.push(`${hs.id}: rect 超出卡面 0..1`)
    // 改版文件 §4.1 的標註規則：手機上單邊不要小於畫面 12%
    if (r.w < 0.12 || r.h < 0.12) errs.push(`${hs.id}: rect 單邊 <12%，手機上太小點不到`)
    if (!hs.objectId) errs.push(`${hs.id}: 缺少 objectId（要顯示哪個物件）`)
  }
  return { ok: errs.length === 0, errors: errs }
}
