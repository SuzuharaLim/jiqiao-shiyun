// 伺服器端 SEO：逐頁 meta 注入、真 404、sitemap。
//
// 為什麼需要這支：前端是純客戶端渲染（CSR），HTML 只有 <head>。
// Google 雖然會執行 JS，但 **LINE／Facebook／Threads 的預覽抓取器完全不執行 JS**，
// Bing 與各家 AI 搜尋爬蟲的支援也差很多。所以：
//   - 每頁的 title/description/og 必須「在伺服器端就寫進 HTML」，不能等 React 設。
//   - 未知路由必須回真正的 404，不能一律回 index.html（否則等於宣告網站上有
//     無限多個內容重複的有效頁面＝soft 404，會稀釋權重、浪費爬取配額）。
//
// ⚠️ 這裡的路由表必須與 src/store/nav.jsx 的 SCREEN_PATH 對齊。
//    新增畫面時兩邊都要加，否則新頁會被判成 404。

// ── 路由表：路徑樣板 → 該頁的 SEO 文案 ─────────────────────────
// desc 省略時沿用首頁描述。noindex 的頁面不進 sitemap 也會加 robots meta。
const ROUTES = [
  { path: '/', title: '機巧時運｜AI 國民曆．今日宜忌白話解讀',
    desc: '今天宜什麼？機巧時運用 AI 把國民曆讀成人話——每日宜忌、吉時、沖煞白話解釋，加上二十四節氣與節氣攝影社群。' },
  { path: '/explore', title: '探索節氣作品｜機巧時運', desc: '依二十四節氣瀏覽攝影作品，看看此刻的台灣長什麼樣子。' },
  { path: '/create', title: '節氣工作室｜拍照發布・做月曆｜機巧時運', desc: '拍下你的節氣，做成月曆或上架市集。' },
  { path: '/almanac', title: '占卜與文化工具｜機巧時運', desc: '國民曆完整曆頁、生肖運勢、婚配、神佛誕辰、台灣諺語與節氣專欄。' },
  { path: '/me', title: '我的｜機巧時運', noindex: true },

  { path: '/almanac/day', title: '今日完整國民曆｜宜忌、吉時、沖煞、建除、彭祖百忌',
    desc: '完整傳統曆頁：建除十二神、二十八星宿、彭祖百忌、逐日胎神、沖煞歲數、財喜貴方位與十二時辰吉凶。' },
  // 帶日期的完整曆頁（可分享網址）。⚠️ 沒有這一條的話，/almanac/day/2026-08-15
  // 會被判定為未知路由而回 **404 狀態碼**——畫面仍能用，但搜尋引擎完全不收錄，
  // 而「2026年8月15日 國民曆」正是這類產品最大宗的長尾搜尋。
  { path: '/almanac/day/:date', title: '國民曆查詢｜指定日期的宜忌、吉時、沖煞、建除',
    desc: '查詢任一天的完整國民曆：宜忌、黃道吉時、沖煞、建除十二神、二十八宿、胎神與彭祖百忌。' },
  { path: '/almanac/year', title: '年度總覽｜太歲、地母經、犯太歲生肖｜機巧時運',
    desc: '當年值年太歲、春牛芒神、地母經與犯太歲生肖一覽。' },
  { path: '/solarterms', title: '二十四節氣專欄｜由來、物候、養生｜機巧時運',
    desc: '二十四節氣逐節介紹：由來、物候、生活小叮嚀、節氣養生與開運色。' },
  { path: '/ingredients', title: '當令食材 陸・海｜二十四節氣農產漁獲與產地',
    desc: '逐節氣列出台灣當令的農產與漁獲，附主要產地與應景食物。' },
  { path: '/festivals', title: '臺灣特色慶典活動｜節氣慶典年表', desc: '依節氣排列的台灣慶典年表，含地點與簡介。' },
  { path: '/flowers', title: '臺灣賞花景點｜花期一覽', desc: '各節氣花期與台灣賞花景點。' },
  { path: '/proverbs', title: '台灣諺語｜每日一句與節氣俗語', desc: '台灣諺語白話解釋，以及二十四節氣的當令俗語。' },
  { path: '/deities', title: '臺灣神佛誕辰一覽｜可設提醒', desc: '媽祖、土地公、關聖帝君等神明誕辰（農曆）與國曆換算、倒數天數。' },
  { path: '/zodiac', title: '十二生肖運勢｜今日／本週／本月', desc: '十二生肖運勢分數與建議。' },
  { path: '/match', title: '生肖・星座婚配｜三合六合與星座元素', desc: '依傳統地支三合六合沖害刑與星座元素關係推算配對，附理由。' },
  { path: '/bone', title: '袁天罡秤骨神術｜農曆四柱骨重', desc: '以農曆年月日時四柱骨重相加秤骨，可輸入國曆自動換算。' },
  { path: '/dream', title: '解夢｜《周公解夢》原典斷語與現代參考', desc: '常見夢境的原典斷語逐字引用，並附白話說明；兩者分開標示。' },
  { path: '/name', title: '姓名・商店命名吉凶｜筆畫查詢', desc: '姓名與店名筆畫吉凶參考。' },
  { path: '/appendix/food', title: '食物相剋對照表｜機巧時運', desc: '傳統食物相剋說法對照。' },
  { path: '/appendix/units', title: '度量衡換算｜台制與公制對照', desc: '台斤、台尺、坪等台制與公制換算。' },
  { path: '/appendix/ganzhi', title: '六十甲子與三合六合對照表', desc: '天干地支、六十甲子與生肖三合六合對照。' },
  { path: '/today', title: '今日大家拍的節氣作品｜機巧時運', desc: '看看今天大家拍下的節氣。' },
  { path: '/challenges', title: '節氣攝影挑戰｜機巧時運', desc: '參加當期節氣攝影挑戰。' },
  { path: '/leaderboard', title: '節氣攝影排行榜｜機巧時運', desc: '依真實按讚數即時計算的作品排行。' },
  { path: '/store', title: '商店｜手帳・方案・企業版｜機巧時運', desc: '機巧時運的實體手帳與訂閱方案。' },
  { path: '/subscription', title: '訂閱方案｜機巧時運', desc: 'Free 與 Premium 方案比較。' },
  { path: '/about', title: '關於機巧時運｜承氣有限公司', desc: '機巧時運的品牌故事與團隊。' },
  { path: '/privacy', title: '隱私權政策｜機巧時運' },
  { path: '/terms', title: '服務條款｜機巧時運' },
  { path: '/contact', title: '聯絡我們｜機巧時運', desc: '有問題或合作提案，從這裡與我們聯繫。' },

  // 動態頁：仍要能被抓到（不回 404），但內容因人而異，交給前端渲染
  { path: '/post/:id', title: '節氣作品｜機巧時運' },
  { path: '/work/:id', title: '市集作品｜機巧時運' },
  { path: '/creator/:user', title: '創作者｜機巧時運' },
  { path: '/creator/:user/:rel', title: '創作者｜機巧時運', noindex: true },

  // 需登入或屬個人資料的頁：可存取但不收錄
  { path: '/ai', title: 'AI 時光顧問｜機巧時運', noindex: true },
  { path: '/new', title: '發布作品｜機巧時運', noindex: true },
  { path: '/camera', title: '相機工作室｜機巧時運', noindex: true },
  { path: '/AR', title: '掃描明信片｜機巧時運', noindex: true },
  { path: '/calendar/make', title: '做月曆｜機巧時運', noindex: true },
  { path: '/calendar/preview', title: '月曆預覽｜機巧時運', noindex: true },
  { path: '/projects', title: '我的專案｜機巧時運', noindex: true },
  { path: '/records', title: '占卜紀錄｜機巧時運', noindex: true },
  { path: '/notifications', title: '通知｜機巧時運', noindex: true },
  { path: '/messages', title: '聯絡我們｜機巧時運', noindex: true },
  { path: '/orders', title: '我的訂單｜機巧時運', noindex: true },
  { path: '/wallet', title: '錢包／收益｜機巧時運', noindex: true },
  { path: '/creator-console', title: '創作者後台｜機巧時運', noindex: true },
  { path: '/settings', title: '設定｜機巧時運', noindex: true },
  { path: '/security', title: '帳號安全｜機巧時運', noindex: true },
  { path: '/edit-profile', title: '編輯個人檔案｜機巧時運', noindex: true },
  { path: '/checkout', title: '結帳｜機巧時運', noindex: true },
  { path: '/preplan', title: '明年預拍｜機巧時運', noindex: true },
  { path: '/admin', title: '管理後台｜機巧時運', noindex: true },
]

const MATCHERS = ROUTES.map(r => ({
  ...r,
  rx: new RegExp('^' + r.path
    .replace(/\/:(\w+)\?/g, '(?:/([^/]+))?')
    .replace(/:(\w+)/g, '([^/]+)') + '/?$'),
}))

export function matchRoute(pathname) {
  return MATCHERS.find(m => m.rx.test(pathname)) || null
}

const DEFAULT_DESC = ROUTES[0].desc
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 把逐頁的 title/description/og/canonical 換進 index.html。
// ⚠️ 用字串取代而非樣板重組——index.html 由 Vite 產生（含 hash 過的資產路徑），
//    不能在這裡重寫整份 HTML。
export function injectMeta(html, { origin, pathname, route }) {
  const url = origin + (pathname === '/' ? '/' : pathname)
  const title = route?.title || ROUTES[0].title
  const desc = route?.desc || DEFAULT_DESC
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
  if (route?.noindex) {
    out = out.replace('</title>', '</title>\n    <meta name="robots" content="noindex, follow" />')
  }
  return out
}

// sitemap：只收可索引的靜態路由（動態頁的 id 由前端資料決定，
// 之後要收錄作品頁再從 DB 產生第二份 sitemap）。
export function buildSitemap(origin, lastmod = new Date().toISOString().slice(0, 10)) {
  const urls = ROUTES
    .filter(r => !r.noindex && !r.path.includes(':'))
    .map(r => `  <url>\n    <loc>${origin}${r.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    .replace('www.sitemap.org', 'www.sitemaps.org')
}

export const SEO_ROUTES = ROUTES
