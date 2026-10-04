// ============================================================================
// App 的網址前綴（2026-10-04）
//
// chengqi.tw 的根目錄改成**承氣有限公司官網**，機巧時運整個搬到 `/app/` 底下。
//
// ★★★ 路由表（src/store/paths.js 的 SCREEN_PATH、server/seo.js 的 ROUTES）
//   **刻意維持「App 內部的邏輯路徑」不變**（`/post/:id`、`/almanac/day/:date?`），
//   前綴只在**網址進出的那一層**加減：
//     產生網址 → toPublic()（/post/1 → /app/post/1）
//     解析網址 → toLogical()（/app/post/1 → /post/1）
//   這樣兩張路由表、伺服器裡所有 `p === '/post/:id'` 的判斷、check-nav 的三方比對
//   一行都不必改。若把前綴寫進路由表，就得同時改上百處字串，漏一處就是一個 404。
//
// ★★★★ `/AR` 與 `/ar/*` **永遠留在根目錄**（使用者指定 `/AR` 不可動）：
//   實體卡片已經印出去了，上面的 QR 與文宣寫的就是 chengqi.tw/AR；
//   `/ar/model/:slug`、`/ar/card/:slug` 是同一條掃描動線的下一步，
//   `qrFallback.js` 也認這兩種網址。搬走任何一個，印出去的東西就失效。
//
// ⚠️ 這支要放在 src/data/ 而不是 src/store/：Dockerfile 只把 `src/data`
//   複製進正式容器，伺服器 import 不到 src/store。（`maxScoreFor` 住在
//   quiz.js 是同一個理由。）純 JS、零相依，build 期閘門也能 import。
// ============================================================================

export const APP_BASE = '/app'

/** 留在根目錄、不加前綴的路徑（AR 掃描動線）。 */
export const isRootAnchored = (p) => p === '/AR' || p.startsWith('/AR/') || p.startsWith('/ar/')

/** 邏輯路徑 → 實際網址。`/` → `/app`、`/post/1` → `/app/post/1`、`/AR` → `/AR`。 */
export function toPublic(p) {
  if (p == null) return p
  const [path, ...rest] = String(p).split('?')
  const q = rest.length ? '?' + rest.join('?') : ''
  if (isRootAnchored(path)) return path + q
  return (path === '/' || path === '' ? APP_BASE : APP_BASE + path) + q
}

/**
 * 實際網址的 pathname → 邏輯路徑。不屬於 App 的路徑回 `null`
 * （例如 `/` 是官網、`/about-us` 這種官網以外的東西）。
 */
export function toLogical(pathname) {
  const p = String(pathname || '/')
  if (p === APP_BASE || p === APP_BASE + '/') return '/'
  if (p.startsWith(APP_BASE + '/')) return p.slice(APP_BASE.length)
  if (isRootAnchored(p)) return p
  return null
}
