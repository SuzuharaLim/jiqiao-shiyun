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
/**
 * ★★★ Android 的 label 常常是「camera2 2, facing back」這種**完全沒有語意**的字串
 *    ——沒有 ultra／廣角／0.5x 可以比對，所以純關鍵字的排除法會**整個失效**。
 *    2026-08-11 實測使用者的 Samsung：診斷面板顯示正在用 `camera 2, facing back`。
 *
 * Android 的慣例是**編號越小越接近主鏡頭**（0 通常是主鏡頭，較大的編號是
 * 超廣角／望遠／深度）。所以在沒有語意可用時，改用「取編號最小的後鏡頭」。
 * ⚠️ 這仍然是**啟發式**：沒有標準 API 能問「哪一顆是主鏡頭」。猜錯不會比
 *    現況更糟（現況等於隨便拿第一顆），而且呼叫端有 fallback。
 */
function labelIndex(label) {
  // 「camera2 2, facing back」「camera 0, facing back」→ 2 / 0
  const m = /camera\d*\s+(\d+)/i.exec(label || '')
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY
}

export function pickMainCameraId(devices) {
  const cams = (devices || []).filter(d => d?.kind === 'videoinput' && d.label)
  // 只有一顆就沒得挑；沒有 label 代表還沒授權，這時猜不了
  if (cams.length < 2) return null
  const back = cams.filter(d => BACK_RE.test(d.label))
  const pool = back.length ? back : cams
  // ① 先排掉 label 上看得出來是超廣角的
  //    ⚠️ 全部都被排掉時要回 **null**，不可硬選一顆——那等於指定一顆已知不好的鏡頭。
  //       回 null 讓呼叫端退回 facingMode，至少由瀏覽器決定（有東西總比沒有好）。
  const candidates = pool.filter(d => !ULTRA_RE.test(d.label))
  if (!candidates.length) return null
  // ② 剩下的取「編號最小」那一顆（Android 慣例＝主鏡頭）
  //    ⚠️ 用穩定排序：編號相同時維持列舉順序，不要引入不可預期的挑選。
  const sorted = candidates
    .map((d, i) => ({ d, i, n: labelIndex(d.label) }))
    .sort((a, b) => (a.n - b.n) || (a.i - b.i))
  return sorted[0]?.d.deviceId ?? null
}

/** 給診斷面板列出可選的後鏡頭（讓使用者自己換一顆試）。 */
export function listBackCameras(devices) {
  return (devices || [])
    .filter(d => d?.kind === 'videoinput' && d.label)
    .filter(d => BACK_RE.test(d.label) || !/front|user|前/i.test(d.label))
    .map(d => ({ deviceId: d.deviceId, label: d.label, index: labelIndex(d.label) }))
    .sort((a, b) => a.index - b.index)
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
