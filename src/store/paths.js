// ============================================================================
// 路徑表與路徑組成 —— **純 JS，沒有 React**
//
// ★ 為什麼要從 nav.jsx 抽出來：這一層是「路徑的唯一真相」，也是全站最容易
//   靜默壞掉的地方（必填參數缺值時會產出 /ar/card/ 這種 404 網址），
//   但它原本被關在一個 React 模組裡 → **build 期的檢查腳本 import 不了**。
//
//   後果不是假設：驗收兩輪都沒抓到「六個站內出口有五個壞掉」，
//   而我自己驗的時候是**在測試腳本裡重新實作一份替換邏輯**——
//   於是測到的是「我對程式的想像」，不是程式。抽成純 JS 之後
//   `scripts/check-ar.mjs` 可以 import 真的 `buildPath` 來驗。
//
// ⚠️ 這個檔案不可 import 任何 React／瀏覽器專屬的東西，否則就失去意義。
// ============================================================================

export const TAB_PATHS = ['/', '/explore', '/create', '/almanac', '/me']

export const SCREEN_PATH = {
  aiChat: '/ai', checkout: '/checkout', workDetail: '/work/:id', postDetail: '/post/:id',
  newPost: '/new', makeCalendar: '/calendar/make', calendarPreview: '/calendar/preview',
  myProjects: '/projects', deities: '/deities', zodiac: '/zodiac', dream: '/dream',
  nameFortune: '/name', matchmaking: '/match', bone: '/bone', proverbs: '/proverbs',
  festivals: '/festivals', flowers: '/flowers', ingredients: '/ingredients', solarterms: '/solarterms',
  subscription: '/subscription', wallet: '/wallet', notifications: '/notifications',
  dms: '/messages', settings: '/settings', records: '/records',
  creatorConsole: '/creator-console', store: '/store', productDetail: '/store/:slug', orders: '/orders',
  scan: '/AR', camera: '/camera', todayShots: '/today', almanacDay: '/almanac/day/:date?',
  quiz: '/quiz',
  // 徽章收藏庫與個人名片（2026-09-10）。名片帶 :handle 且**公開可索引**——
  // 它就是拿來分享的，所以 server/seo.js 的 ROUTES 不可標 noindex。
  badges: '/badges',
  nameCard: '/card/:handle',
  // 條目頁：一個節氣／一位神明／一個夢境各自一個網址（SEO 長尾）
  termDetail: '/solarterms/:slug', deityDetail: '/deities/:slug', dreamDetail: '/dream/:slug',
  arCard: '/ar/card/:slug',
  arModel: '/ar/model/:slug',
  // 擇日工具：/auspicious/moving 是總表、/auspicious/moving/2026-09 是月份頁
  auspiciousIndex: '/auspicious', auspicious: '/auspicious/:kind/:ym?',
  glossary: '/glossary', glossaryDetail: '/glossary/:slug',
  editorial: '/editorial', myths: '/myths',
  sunIndex: '/sun', sunTimes: '/sun/:spot',
  yearAlmanac: '/almanac/year', foodTaboo: '/appendix/food', units: '/appendix/units',
  ganzhiTable: '/appendix/ganzhi', challenges: '/challenges', challengesBoard: '/leaderboard',
  creatorPage: '/creator/:user', followList: '/creator/:handle/:rel', prePlan: '/preplan', editProfile: '/edit-profile',
  about: '/about', accountSecurity: '/security', admin: '/admin',
  privacy: '/privacy', terms: '/terms', contact: '/contact',
}

// 路徑樣板支援兩種參數：`:name`（必填）與 `/:name?`（選填，整段含斜線可省略）。
// 選填參數是為了「完整國民曆」這種頁面——它既要能用 /almanac/day 代表今天，
// 也要能用 /almanac/day/2026-08-15 指向特定一天並且可分享。
export const SCREEN_MATCHERS = Object.entries(SCREEN_PATH).map(([screen, tpl]) => {
  // ⚠️ 參數名稱必須依「樣板裡出現的順序」收集，不能分兩次 replace 各自 push。
  //    '/auspicious/:kind/:ym?' 若先處理選填的 :ym? 再處理 :kind，
  //    names 會變成 ['ym','kind']，但 regex 的捕獲組順序是 (kind)(ym)——
  //    對應就整個錯位，kind 拿到 undefined，畫面顯示「找不到」。
  //    改成單次掃描，同時決定名稱順序與 regex 片段。
  const names = []
  const body = tpl.replace(/\/:(\w+)\?|:(\w+)/g, (_, opt, req) => {
    names.push(opt || req)
    return opt ? '(?:/([^/]+))?' : '([^/]+)'
  })
  return { screen, rx: new RegExp('^' + body + '/?$'), names }
})

/** 某畫面的必填參數名稱（不含選填的 `:name?`）。 */
export function requiredParams(screen) {
  const tpl = SCREEN_PATH[screen]
  if (!tpl) return []
  const out = []
  // ⚠️ 先比對選填形式再比對必填，否則 `/:ym?` 的 `:ym` 會被當成必填。
  for (const m of tpl.matchAll(/\/:(\w+)\?|:(\w+)/g)) if (m[2]) out.push(m[2])
  return out
}

/**
 * 組出路徑。缺少必填參數時回傳 `{ path, missing }` 讓呼叫端知道。
 *
 * ⚠️ **必填參數缺值時會被換成空字串**，產出 `/ar/card/`（404）、`/solarterms/`、
 *    `/almanac/day` 這種「看起來是路徑、其實壞掉」的網址。而畫面上的文字仍顯示
 *    正確的值（「2027-01-05」「小寒」），所以肉眼一輪一輪都驗不出來。
 *    實測代價：六個站內出口有五個壞掉，AR 完全無法把流量導回站內內容
 *    ——而那是整個改版最重要的目的之一。
 *    所以這裡把 `missing` 一起回傳，開發模式要據此大聲喊出來。
 */
export function buildPathInfo(screen, props = {}) {
  const tpl = SCREEN_PATH[screen]
  if (!tpl) return { path: null, missing: [] }
  const missing = requiredParams(screen)
    .filter(k => props?.[k] == null || props[k] === '')
  const path = tpl
    // 選填參數沒給值時，連同前面的斜線一起拿掉（否則會產生 /almanac/day/ 這種尾巴）
    .replace(/\/:(\w+)\?/g, (_, k) => (props?.[k] ? '/' + encodeURIComponent(props[k]) : ''))
    .replace(/:(\w+)/g, (_, k) => encodeURIComponent(props?.[k] ?? ''))
  return { path, missing }
}

export function buildPath(screen, props = {}) {
  return buildPathInfo(screen, props).path
}
