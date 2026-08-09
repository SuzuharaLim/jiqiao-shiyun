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
import { makeSignature, serializeSig, deserializeSig, toGray } from './scanner.js'
import { extractFeatures } from './features.js'
import { OFFICIAL_CARDS } from '../data/arCards.js'

// ⚠️ 換 key：makeSignature 加了亮度正規化，舊簽名與新的不在同一個座標系。
//    不換的話舊使用者會永遠對不上，而且是靜默的（只覺得「以前可以現在不行」）。
// ⚠️ 換 key：RECT 從 48 改成 64，舊簽名與新的不在同一個座標系。
//    不換的話舊使用者會永遠對不上，而且是靜默的（只覺得「以前可以現在不行」）。
const CACHE_KEY = 'jq-ar-official-v2'
const HIST_LEN = 24

/** 快取：卡片 id → 簽名。目標圖換了就要換 target 路徑（或清這個 key）。 */
function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const out = {}
    for (const [id, e] of Object.entries(raw)) {
      const okSig = typeof e?.sig?.hash === 'string' && /^[0-9a-fA-F]{16}$/.test(e.sig.hash)
        && Array.isArray(e.sig.hist) && e.sig.hist.length === HIST_LEN && e.sig.hist.every(Number.isFinite)
      if (okSig && typeof e.target === 'string') out[id] = e   // 含 source/fileName
    }
    return out
  } catch { return {} }
}
function writeCache(map) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); return true } catch { return false }
}
/** 寫不進去就丟掉該筆的縮圖再試——簽名不可以因為縮圖太大而一起存不進去。 */
function writeCacheSafe(map, id) {
  if (writeCache(map)) return true
  if (map[id]?.poster) { delete map[id].poster; if (writeCache(map)) return true }
  return false
}

/**
 * ★ 多視角簽名 —— 同一張目標圖，額外存幾個「從斜角看」的版本。
 *
 * 為什麼需要：dHash 對**透視縮短**很敏感。rectify() 會把偵測到的四邊形拉正，
 * 但斜看時卡片遠端在影像上被壓縮，拉正之後那半邊的有效解析度低很多 → 模糊 →
 * dHash 不同。實測（合成手持晃動，yaw ±17°／pitch ±13°）：只存正面簽名時
 * 四邊形每一幀都找得到，但比對分數 37~57 全數低於門檻 58，**追蹤成功率只有 33%**。
 *
 * ⚠️ 絕對不可以改成「調低 minScore」。那會讓正式站開始把別的東西認成卡片，
 *    而且是最難發現的那種壞法（使用者只會覺得「有時候會跳出錯的內容」）。
 *    多存幾個視角是零風險的做法：門檻不動，只是讓正確的目標多幾次機會被認出來。
 *
 * 成本：登錄時多算幾次（一次性），追蹤時每張卡多比幾次（純陣列運算，48×48）。
 */
const VIEWS = [
  { yaw: 0, pitch: 0 },
  { yaw: 0.30, pitch: 0 }, { yaw: -0.30, pitch: 0 },
  { yaw: 0, pitch: 0.24 }, { yaw: 0, pitch: -0.24 },
  { yaw: 0.22, pitch: 0.18 }, { yaw: -0.22, pitch: -0.18 },
]

/**
 * 把 bitmap 從某個視角投影到 size×size（等同「斜看之後再拉正」的結果）。
 * ⚠️ 要走真的透視投影：用剪切近似的話產生的不是矩形的合法投影，
 *    算出來的簽名對追蹤器毫無意義（這個坑在 arSimFrame.js 踩過一次）。
 */
function warpToSquare(bmp, size, { yaw, pitch }, aspect) {
  const cv = document.createElement('canvas')
  cv.width = size; cv.height = size
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  if (!yaw && !pitch) {
    ctx.drawImage(bmp, 0, 0, size, size)
    return ctx.getImageData(0, 0, size, size).data
  }
  // 先算「斜看時卡面四角落在哪」，再用與 rectify 相同的逆映射取樣回正方形。
  const k = 1 / (aspect || 1)
  const f = 2.2
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const proj = (x, y) => {
    let px = x - 0.5, py = (y * k) - k / 2, pz = 0
    ;[py, pz] = [py * cp - pz * sp, py * sp + pz * cp]
    ;[px, pz] = [px * cy + pz * sy, -px * sy + pz * cy]
    const Z = pz + f
    return [px / Z, py / Z]
  }
  // 四角在「斜看畫面」上的位置，正規化到 0..1 的取樣格
  const c = [proj(0, 0), proj(1, 0), proj(1, 1), proj(0, 1)]
  const xs = c.map(p => p[0]), ys = c.map(p => p[1])
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys), y1 = Math.max(...ys)
  // 把來源圖畫進「斜看」的四邊形（條帶近似，與 arSimFrame 同一招）
  const N = 160
  const map = (p) => [(p[0] - x0) / (x1 - x0) * size, (p[1] - y0) / (y1 - y0) * size]
  const [tl, tr, br, bl] = c.map(map)
  for (let i = 0; i < N; i++) {
    const v0 = i / N, v1 = (i + 1) / N
    const lx0 = tl[0] + (bl[0] - tl[0]) * v0, ly0 = tl[1] + (bl[1] - tl[1]) * v0
    const rx0 = tr[0] + (br[0] - tr[0]) * v0, ry0 = tr[1] + (br[1] - tr[1]) * v0
    const lx1 = tl[0] + (bl[0] - tl[0]) * v1, ly1 = tl[1] + (bl[1] - tl[1]) * v1
    ctx.save()
    ctx.translate(lx0, ly0)
    ctx.rotate(Math.atan2(ry0 - ly0, rx0 - lx0))
    ctx.drawImage(bmp, 0, v0 * bmp.height, bmp.width, bmp.height / N,
      0, 0, Math.hypot(rx0 - lx0, ry0 - ly0), Math.hypot(lx1 - lx0, ly1 - ly0) + 1.2)
    ctx.restore()
  }
  return ctx.getImageData(0, 0, size, size).data
}

/**
 * 取一張圖並回傳 bitmap（或 <img>）。
 *
 * ★ 抽出來共用是**必要的**，不是整理：這裡面藏著一個會誤導人的坑（見下方註解），
 *   而現在有兩個呼叫端（簽名與特徵點參考）。各寫一份的話遲早只有一邊有防護。
 */
export async function fetchImageBitmap(src) {
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
    //    （blob: URL 是本機檔案，型別由 File 決定，呼叫端已經驗過。）
    const ct = res.headers.get('content-type') || ''
    if (!src.startsWith('blob:') && !ct.startsWith('image/')) {
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
  return bmp
}

/** 把一張圖壓成 size×size 並算簽名。與 Scan.jsx 的 registerFromFile 同一條路。 */
export async function signatureFromImage(src, size) {
  const bmp = await fetchImageBitmap(src)
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight
  if (!w || !h) throw new Error('目標圖尺寸為 0')
  const cv = document.createElement('canvas')
  cv.width = size; cv.height = size
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, size, size)
  const sig = makeSignature(ctx.getImageData(0, 0, size, size).data, size, size)
  // ★ 多視角簽名（見上）。第一筆就是正面，所以 sigs[0] 與 sig 等價。
  const aspect0 = w / h
  const sigs = VIEWS.map(view => {
    const px = warpToSquare(bmp, size, view, aspect0)
    return makeSignature(px, size, size)
  })
  // 縮圖：給 /ar/card/:slug 的熱區校對用。
  // ⚠️ 一定要縮小再存——原尺寸的設計稿動輒好幾 MB，localStorage 只有 5MB 左右，
  //    塞不進去時 setItem 會丟 QuotaExceededError，而那會連簽名一起存不進去。
  let poster = null
  try {
    const pw = 900, ph = Math.max(1, Math.round(900 * h / w))
    const pv = document.createElement('canvas')
    pv.width = pw; pv.height = ph
    pv.getContext('2d').drawImage(bmp, 0, 0, pw, ph)
    poster = pv.toDataURL('image/jpeg', 0.72)
  } catch { /* 縮圖失敗不影響簽名 */ }
  bmp.close?.()
  return { ...sig, sigs, aspect: w / h, poster }
}

/**
 * ★★ 算「特徵點參考」——給 arTracker 的備援路線用。
 *
 * ⚠️ **刻意不進 localStorage 快取**：900 個點 × 32 bytes 描述子 ≈ 29 KB／張，
 *    序列化成 base64 之後更大，而 localStorage 全站配額通常只有 5 MB。
 *    重算只要約 40ms（實測真卡片 640px 寬、6 層金字塔、782 個特徵 = 37ms），
 *    一個 session 一次，不值得為此吃掉配額並增加一種會過期的快取格式。
 *
 * ⚠️ 座標是**兩軸各自正規化**（x/w、y/h），所以卡角在 UV 是 (0,0)(1,0)(1,1)(0,1)。
 *    下游解出 H 之後要用 `cornersFromH(H, 1)`——傳 1/aspect 會讓四角誤差
 *    從 13px 變成 55px（實測）。這是這一層最容易搞錯的約定。
 *
 * @param refs `loadOfficialRefs()` 的回傳（要有 poster 或 card.target 可以取圖）
 */
export async function loadFeatureRefs(refs) {
  const out = []
  for (const r of refs || []) {
    const src = r.poster || r.card?.target
    if (!src) continue
    try {
      // ⚠️ 一定要走 fetchImageBitmap（與 signatureFromImage 同一條路）：它已經處理了
      //    「檔案不存在時 SPA fallback 回 200 + index.html」那個坑——直接 new Image()
      //    會讓「找不到檔案」偽裝成「圖片壞掉」。
      const img = await fetchImageBitmap(src)
      const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight
      if (!iw || !ih) continue
      const w = 640, h = Math.max(1, Math.round(640 * ih / iw))
      const cv = document.createElement('canvas')
      cv.width = w; cv.height = h
      const ctx = cv.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, w, h)
      const gray = toGray(ctx.getImageData(0, 0, w, h).data, w, h)
      // ⚠️ 參考圖要用**更多層**金字塔（6 層 ≈ 覆蓋 5.4 倍尺度）：卡片在畫面裡
      //    可能從佔 62% 縮到 20%，跨度 3 倍以上。層數不夠時「小卡片」對不上任何一層
      //    ——實測 4 層時真卡片是 0/16，而且症狀看起來像「描述子不夠好」。
      const f = extractFeatures(gray, w, h, {
        levels: 6, factor: 1.4, maxTotal: 900, maxPerLevel: 180,
      })
      if (f.n < 60) continue
      out.push({
        id: r.id, ref: r, n: f.n, desc: f.desc,
        uv: f.pts.map(p => [p.x / w, p.y / h]),
      })
    } catch { /* 單張失敗只跳過那一張，不影響別的卡 */ }
  }
  return out
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
        local: hit.source === 'local', fileName: hit.fileName, poster: hit.poster,
        aspect: hit.aspect || 1, ...deserializeSig(hit.sig),
        sigs: Array.isArray(hit.sigs) ? hit.sigs.map(deserializeSig) : null,
      })
      continue
    }
    try {
      const sig = await signatureFromImage(card.target, rectifySize)
      cache[card.id] = { target: card.target, aspect: sig.aspect, poster: sig.poster,
        sig: serializeSig(sig), sigs: sig.sigs.map(serializeSig) }
      dirty = true
      refs.push({
        id: card.id, name: card.title, official: true, card,
        aspect: sig.aspect, poster: sig.poster, hash: sig.hash, hist: sig.hist, sigs: sig.sigs, sigs: sig.sigs,
      })
    } catch (err) {
      errors.push({ card: card.title, message: err?.message || String(err) })
    }
  }
  if (dirty) for (const c of OFFICIAL_CARDS) writeCacheSafe(cache, c.id)
  return { refs, errors }
}

// ⚠️ `bindLocalTarget()`（用本機檔案臨時補上某張官方卡的目標圖）已於
//    2026-08-10 依需求移除。那是美術改稿期間的工具：簽名只存這台裝置的
//    localStorage，**別人打開網站還是掃不到**，卻在介面上看起來像一個功能。
//    現在目標圖一律走 `npm run card:install`／`card:mind` 進 repo。
//    快取的 `source:'local'` 分支也一併沒有用了，但**讀取端刻意保留寬容**
//    ——舊裝置上可能還有那種快取，讓它安靜地被當成一般快取用掉就好。

/** 清掉快取（美術換稿但沿用同一個檔名時用）。 */
export function clearOfficialCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}

/** 讀某張官方卡已快取的縮圖（給 /ar/card/:slug 的熱區校對用）。 */
export function cachedPoster(cardId) {
  return readCache()[cardId]?.poster || null
}
