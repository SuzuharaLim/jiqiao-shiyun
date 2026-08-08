// ============================================================================
// 鏡頭挑選 —— 避開超廣角
//
// 為什麼：手機**主鏡頭**的 ISP 會先做畸變校正、殘留很小，但**超廣角不會**，
// 而 `facingMode: 'environment'` 在多鏡頭手機上有機會選到它。
//
// 實測桶狀畸變對這個追蹤器的容忍上限只有 k1 ≈ −0.04：
//
//   k1  0 ~ −0.03  → 71~86%（四邊形找得到，分數在邊緣）
//   k1  −0.04      → 62%（開始找不到四邊形）
//   k1  −0.05      → 33%
//   k1  −0.07 以上 → **0%**（四邊形全部找得到，但分數崩到 17~34）
//
// ⚠️ 注意 −0.07 之後的失效模式：**四邊形照樣找得到**，只是拉正後的影像
//    被畸變扭曲，分數崩掉。症狀是「對著卡片卻一直說沒認出來」，
//    很容易被誤診為「比對太嚴格」而去調低門檻——那會讓正式站亂認。
//
// 超廣角的 k1 常在 −0.25 ~ −0.4，遠超過這條線 → 完全掃不到。
//
// ⚠️ 沒有標準的「不要超廣角」constraint，只能靠 label 猜，所以這是**盡力而為**：
//    拿不到 label（未授權前 label 是空字串）或猜不出來時回 null，
//    呼叫端退回 facingMode，**不可因此開不了相機**。
// ============================================================================

const BACK_RE = /back|rear|environment|後|背/i
const ULTRA_RE = /ultra|超廣|廣角|wide.?angle|0\.5/i

/**
 * 從 enumerateDevices() 的結果挑一顆「不是超廣角的後置鏡頭」。
 * @param devices MediaDeviceInfo[]（或任何有 kind/label/deviceId 的物件）
 * @returns {string|null} deviceId，挑不出來回 null
 */
export function pickMainCameraId(devices) {
  const cams = (devices || []).filter(d => d?.kind === 'videoinput' && d.label)
  // 只有一顆就沒得挑；沒有 label 代表還沒授權，這時猜不了
  if (cams.length < 2) return null
  const back = cams.filter(d => BACK_RE.test(d.label))
  const pool = back.length ? back : cams
  const main = pool.find(d => !ULTRA_RE.test(d.label))
  return main?.deviceId ?? null
}

/**
 * 開相機：先試「主鏡頭」，失敗就退回 facingMode，再失敗就退回任意視訊。
 * ⚠️ 三層 fallback 缺一不可——deviceId 的 exact 約束在裝置被別的程式佔用時會
 *    直接 reject，那時仍然要開得起來。
 */
export async function openBackCamera() {
  const md = navigator.mediaDevices
  let mainId = null
  try { mainId = pickMainCameraId(await md.enumerateDevices()) } catch { /* 猜不到就算了 */ }
  const attempts = [
    mainId ? { video: { deviceId: { exact: mainId } }, audio: false } : null,
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    { video: true, audio: false },
  ].filter(Boolean)
  let lastErr
  for (const c of attempts) {
    try { return await md.getUserMedia(c) } catch (e) { lastErr = e }
  }
  throw lastErr
}
