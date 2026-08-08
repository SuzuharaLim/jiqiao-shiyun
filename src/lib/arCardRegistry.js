// ============================================================================
// 官方卡包載入 —— 進 /AR 就有東西可掃
//
// 簽名（dHash + 色彩直方圖）不寫進原始碼，而是**載入時從目標圖算出來**：
//
//   fetch('/ar/targets/2027-xiaohan.png') → 壓成 RECT×RECT → makeSignature → 快取
//
// 為什麼不在建置期算好塞進 JS：
//   ① 建置期要算就得在 Node 裡解 PNG／JPEG。PNG 還能用內建 zlib 硬幹，
//      JPEG 就得整套 baseline 解碼器——為了省一次 fetch 引入幾百行解碼程式碼不值得。
//   ② 美術改稿只要換 public/ 底下那張圖就好，不必重跑腳本、不必動程式。
//   ③ 算完存 localStorage，第二次進頁是零成本。
//
// ⚠️ 正規化必須與追蹤時**完全一致**：rectify() 是把偵測到的四邊形壓成
//    RECT×RECT 的正方形（不管卡片本身幾比幾），所以這裡也把整張圖壓成
//    RECT×RECT。任何一邊改成「保持比例」，兩邊的 dHash 就不在同一個座標系、
//    永遠對不上——而且是靜默失敗，畫面只會顯示「看到卡片了，但不是登錄過的」。
// ============================================================================
import { makeSignature, serializeSig, deserializeSig } from './scanner.js'
import { OFFICIAL_CARDS } from '../data/arCards.js'

const CACHE_KEY = 'jq-ar-official-v1'
const HIST_LEN = 24

/** 快取：卡片 id → 簽名。目標圖換了就要換 target 路徑（或清這個 key）。 */
function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const out = {}
    for (const [id, e] of Object.entries(raw)) {
      const okSig = typeof e?.sig?.hash === 'string' && /^[0-9a-fA-F]{16}$/.test(e.sig.hash)
        && Array.isArray(e.sig.hist) && e.sig.hist.length === HIST_LEN && e.sig.hist.every(Number.isFinite)
      if (okSig && typeof e.target === 'string') out[id] = e
    }
    return out
  } catch { return {} }
}
function writeCache(map) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)) } catch { /* 空間不足就算了，下次重算 */ }
}

/** 把一張圖壓成 size×size 並算簽名。與 Scan.jsx 的 registerFromFile 同一條路。 */
export async function signatureFromImage(src, size) {
  let bmp
  if (typeof createImageBitmap === 'function') {
    // ⚠️ 不可用 `cache: 'force-cache'`。目標圖不存在時，SPA fallback 會回傳
    //    **200 + index.html**（非 /api 的路徑一律回 index.html），force-cache 把
    //    那份 HTML 存下來之後，就算美術把圖補上了也永遠拿到舊的那份 HTML。
    //    實測症狀是「The source image could not be decoded.」——
    //    「檔案不存在」偽裝成「圖片壞掉」，會讓人去查圖片格式而不是查路徑。
    const res = await fetch(src)
    if (!res.ok) throw new Error(`目標圖載入失敗（HTTP ${res.status}）`)
    // ⚠️ 只看 res.ok 不夠，理由同上：SPA fallback 的 200 也是 ok。
    //    必須確認回來的真的是圖片，錯誤訊息才指得出真正的原因。
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) {
      throw new Error(`${src} 找不到（伺服器回的是 ${ct.split(';')[0] || '未知型別'}，不是圖片）`)
    }
    bmp = await createImageBitmap(await res.blob())
  } else {
    bmp = await new Promise((ok, no) => {
      const img = new Image()
      img.onload = () => ok(img); img.onerror = () => no(new Error('目標圖載入失敗'))
      img.src = src
    })
  }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight
  if (!w || !h) throw new Error('目標圖尺寸為 0')
  const cv = document.createElement('canvas')
  cv.width = size; cv.height = size
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, size, size)
  const sig = makeSignature(ctx.getImageData(0, 0, size, size).data, size, size)
  bmp.close?.()
  return { ...sig, aspect: w / h }
}

/**
 * 載入官方卡包，回傳可以直接餵給 createTracker 的 refs。
 *
 * ⚠️ 單張失敗只跳過那一張，不可讓整個卡包掛掉——美術漏上傳一張圖不該讓
 *    使用者連別的卡都掃不到。失敗的卡片會列在回傳的 `errors` 裡。
 */
export async function loadOfficialRefs(rectifySize) {
  const cache = readCache()
  const refs = [], errors = []
  let dirty = false

  for (const card of OFFICIAL_CARDS) {
    const hit = cache[card.id]
    if (hit && hit.target === card.target) {
      refs.push({
        id: card.id, name: card.title, official: true, card,
        aspect: hit.aspect || 1, ...deserializeSig(hit.sig),
      })
      continue
    }
    try {
      const sig = await signatureFromImage(card.target, rectifySize)
      cache[card.id] = { target: card.target, aspect: sig.aspect, sig: serializeSig(sig) }
      dirty = true
      refs.push({
        id: card.id, name: card.title, official: true, card,
        aspect: sig.aspect, hash: sig.hash, hist: sig.hist,
      })
    } catch (err) {
      errors.push({ card: card.title, message: err?.message || String(err) })
    }
  }
  if (dirty) writeCache(cache)
  return { refs, errors }
}

/** 清掉快取（美術換稿但沿用同一個檔名時用）。 */
export function clearOfficialCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}
