// ============================================================================
// QR 備援辨識 —— 完全不經過 TFJS 與 GPU 的第二條路
//
// ★ 為什麼需要（2026-08-11 實測）：
//   使用者的 Samsung Xclipse 540（ANGLE on Vulkan）上，特徵點抓得到、比對迴圈
//   健康，但**比對成功 0 次**，連「自我測試餵網站內建卡面圖」也失敗。
//   已逐項排除卡片版本（用他實際的付印檔測，全 4/4）、目標圖尺寸、距離、傾斜、
//   過曝、模糊、摩爾紋、CSP、mind-ar 版本——唯一剩下的解釋是**這台裝置算出來的
//   特徵描述子是壞的**，而那是 MindAR／TFJS 在該驅動上的問題，我們改不動。
//
//   但卡面上本來就印了 QR code（實測解出 `https://chengqi.tw/`），而
//   `BarcodeDetector` 是**瀏覽器原生 API**：不碰 TFJS、不碰 WebGL、不碰 worker。
//   這條路正好繞開壞掉的那一段。
//
// ★ 為什麼 QR 對這條動線「夠用」：現在的設計是**認出一次就跳到模型頁**，
//   不需要姿態、不需要持續追蹤。QR 提供的正是「認出一次」。
//
// ⚠️ 這是**並行**跑的第二條路，不是取代 MindAR：
//   - MindAR 認得出來時仍然由它先命中（通常更快，而且不必對到 QR 那一小塊）
//   - 只有 MindAR 失敗的裝置才會靠這條路救回來
//
// ⚠️ 支援度：Android Chrome 有原生 `BarcodeDetector`（正是出問題的那個平台）；
//   iOS Safari 目前沒有。所以**一定要 feature-detect 且失敗不可影響主路徑**——
//   拿不到就當作沒有這條路，靜靜跳過。
//
// ⚠️ 目前卡面的 QR 只編了站台首頁，**認不出是哪一張卡**。只有一張官方卡時
//   這樣就夠；未來要出第二張卡之前，**印刷稿的 QR 必須改成帶 slug 的網址**
//   （例如 `https://chengqi.tw/ar/model/2027-xiaohan`），否則這條備援會分不出
//   掃到的是哪一張。`matchCardFromQr` 已經先支援帶 slug 的形式。
// ============================================================================

/** 這個瀏覽器有沒有原生 QR 偵測。 */
export async function qrSupported() {
  try {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return false
    const formats = await window.BarcodeDetector.getSupportedFormats()
    return Array.isArray(formats) && formats.includes('qr_code')
  } catch { return false }
}

/**
 * 從 QR 內容找出對應的卡片。
 *
 * @param raw    QR 解出來的字串
 * @param cards  官方卡清單
 * @returns 卡片或 null
 */
export function matchCardFromQr(raw, cards) {
  if (!raw || !cards?.length) return null
  let url
  try { url = new URL(raw) } catch { return null }
  // ⚠️ 只認**本站**的網址。不限定 host 的話，路上任何一張 QR 都會觸發跳轉，
  //    使用者會覺得「隨便拍個東西就亂跳」。
  // ⚠️ `location` 要防呆：這支是純函式，閘門會在 **node** 裡直接測它
  //    （這一層的設計原則就是「純邏輯可以離線驗證」），而 node 沒有 location。
  const self = typeof location !== 'undefined' ? location.hostname : null
  if (!/(^|\.)chengqi\.tw$/i.test(url.hostname) && url.hostname !== self) return null

  // ① 網址裡直接帶 slug（未來的卡片應該這樣印）
  const bySlug = cards.find(c => url.pathname.includes(c.slug))
  if (bySlug) return bySlug

  // ② 舊卡的 QR 只編了站台首頁，認不出是哪一張。
  //    ⚠️ 只有在「官方卡剛好只有一張」時才能這樣推斷——多張時無從分辨，
  //       寧可不猜（猜錯會把人帶到別張卡的內容，比沒反應更糟）。
  if (cards.length === 1) return cards[0]
  return null
}

/**
 * 開一條 QR 偵測迴圈。回傳停止函式。
 *
 * @param video     正在播的 <video>
 * @param cards     官方卡清單
 * @param onCard    偵測到並對應到卡片時呼叫（只會呼叫一次）
 * @param intervalMs 偵測間隔
 */
export async function startQrScan({ video, cards, onCard, intervalMs = 600 } = {}) {
  if (!(await qrSupported())) return null
  let detector
  try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }) } catch { return null }

  let stopped = false
  let fired = false
  let busy = false
  const timer = setInterval(async () => {
    // ⚠️ 不可讓上一次還沒跑完就再送一次：偵測是非同步的，重疊呼叫在部分實作上
    //    會拋 InvalidStateError，而那會讓整條備援靜默死掉。
    if (stopped || fired || busy || !video?.videoWidth) return
    busy = true
    try {
      const codes = await detector.detect(video)
      for (const c of codes || []) {
        const card = matchCardFromQr(c.rawValue, cards)
        if (card) { fired = true; onCard?.(card, c.rawValue); break }
      }
    } catch { /* 偵測失敗不可影響主路徑（MindAR 仍在跑） */ }
    finally { busy = false }
  }, intervalMs)

  return () => { stopped = true; clearInterval(timer) }
}
