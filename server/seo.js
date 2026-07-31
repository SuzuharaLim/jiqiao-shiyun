import { dayFor, offsetFromDate } from '../src/data/almanac.js'

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
  { path: '/', title: '機巧時運｜今日國民曆．AI 白話解讀宜忌吉時',
    desc: '今天宜什麼、忌什麼？機巧時運把國民曆（俗稱農民曆、黃曆）用 AI 讀成人話：每日宜忌、黃道吉時、沖煞生肖與歲數、建除十二神一次看懂，還有二十四節氣攝影社群與當令食材。' },
  { path: '/explore', title: '探索節氣攝影作品｜二十四節氣的台灣｜機巧時運',
    desc: '依二十四節氣瀏覽台灣各地的攝影作品，看看立春、大暑、霜降此刻長什麼樣子。可依節氣篩選、追蹤創作者，也能參加當期節氣攝影挑戰。' },
  { path: '/create', title: '節氣工作室｜拍照發布・做月曆・上架市集｜機巧時運',
    desc: '拍下屬於你的節氣：內建濾鏡與節氣標記，一鍵發布到社群，也能排成專屬月曆或上架市集販售授權。相機、拼貼、限動與動態文字全在瀏覽器完成。' },
  { path: '/almanac', title: '國民曆工具箱｜曆頁・生肖・婚配・解夢・神佛誕辰｜機巧時運',
    desc: '國民曆（農民曆）完整曆頁、十二生肖每日運勢、生肖星座婚配、袁天罡秤骨、周公解夢原典、臺灣神佛誕辰倒數、台灣諺語與二十四節氣專欄，都在這一頁。' },
  { path: '/me', title: '我的｜機巧時運', noindex: true },

  { path: '/almanac/day', title: '今日國民曆｜宜忌、黃道吉時、沖煞、建除、彭祖百忌',
    desc: '今日完整國民曆（農民曆）曆頁：宜忌白話解釋、黃道黑道十二神吉時、沖煞生肖與虛歲、建除十二神、二十八星宿、逐日胎神、彭祖百忌與財喜貴神方位。' },
  // 帶日期的完整曆頁（可分享網址）。⚠️ 沒有這一條的話，/almanac/day/2026-08-15
  // 會被判定為未知路由而回 **404 狀態碼**——畫面仍能用，但搜尋引擎完全不收錄，
  // 而「2026年8月15日 國民曆」正是這類產品最大宗的長尾搜尋。
  { path: '/almanac/day/:date', title: '國民曆查詢｜指定日期的宜忌、吉時、沖煞、建除',
    desc: '查詢任一天的完整國民曆：宜忌、黃道吉時、沖煞、建除十二神、二十八宿、胎神與彭祖百忌。' },
  { path: '/almanac/year', title: '丙午年年度總覽｜值年太歲・春牛芒神・犯太歲生肖・年凶方',
    desc: '當年值年太歲與地母經、春牛圖芒神逐項推算、犯太歲的生肖（值／沖／害／破）與化解建議，以及太歲方、歲破方、三煞方、大將軍方與年五黃等動土該避開的方位。' },
  { path: '/solarterms', title: '二十四節氣專欄｜由來、三候物候、養生與開運色',
    desc: '立春到大寒逐節介紹：節氣由來與典故、三候物候、生活小叮嚀、養生要顧的臟腑、開運色，以及該節氣的當令農產、俗語與慶典，適合節氣攝影取材。' },
  { path: '/ingredients', title: '當令食材 陸・海｜二十四節氣農產漁獲與產地',
    desc: '依節氣涵蓋的月份，列出台灣當令農產與漁獲及主要產地，資料取自農業部農糧署「每月盛產農產品產地」開放資料，每個節氣可看到數十項品項與品種。' },
  { path: '/festivals', title: '臺灣特色慶典｜農曆日期實算的慶典行事曆',
    desc: '鹽水蜂炮、大甲媽祖遶境、頭城搶孤、東港迎王等台灣特色慶典。綁農曆日的慶典逐年實算成國曆日期並標出所屬節氣，附地點、簡介與倒數天數。' },
  { path: '/flowers', title: '臺灣賞花景點與花期｜櫻花、荷花、金針、杭菊',
    desc: '各月花期與台灣賞花景點一覽：陽明山櫻花、台北植物園荷花、六十石山金針、銅鑼杭菊等，搭配節氣時序安排拍攝行程，也能看看別人在那裡拍了什麼。' },
  { path: '/proverbs', title: '台灣諺語｜每日一句與二十四節氣俗語',
    desc: '台灣俗諺與台語諺語的白話解釋，以及二十四節氣各自的當令俗語與時令蔬菜歌。每日一句與首頁曆頁的「今日一諺」同步，不會出現兩套說法。' },
  { path: '/deities', title: '臺灣神佛誕辰一覽｜農曆換算國曆與倒數天數',
    desc: '媽祖、土地公、關聖帝君、觀世音菩薩、玄天上帝等神明誕辰。以真實農曆演算換算成當年國曆日期並顯示倒數天數，可設誕辰提醒，不必自己翻曆書。' },
  { path: '/zodiac', title: '十二生肖運勢｜由當日干支推算的今日／本週／本月',
    desc: '十二生肖每日運勢，分數直接由當日干支與生肖的三合、六合、六沖、六害、相刑關係推導，並計入流年犯太歲，與站內國民曆曆頁的沖煞完全一致，不是隨機分數。' },
  { path: '/match', title: '生肖・星座婚配｜三合六合沖害刑與星座元素',
    desc: '依傳統地支關係推算生肖配對：三合、六合、六沖、六害，以及完整的三刑（寅巳申、丑戌未）、子卯無禮之刑與辰午酉亥自刑，可再加上星座元素關係一起計分。' },
  { path: '/bone', title: '袁天罡秤骨神術｜農曆年月日時四柱骨重',
    desc: '以袁天罡秤骨法的真實骨重表，取農曆年、月、日、時四柱骨重相加秤骨。輸入國曆會自動換算農曆（跨年也算得對），並誠實說明未收錄的《稱骨歌》批語。' },
  { path: '/dream', title: '解夢｜《周公解夢》原典斷語與現代白話參考',
    desc: '常見夢境查詢：有原典斷語的逐字引用《周公解夢》，沒有的只給現代白話參考，兩者分開標示、絕不拿現代說法冒充古籍。並依原典的反夢原則區分「夢得」與「夢失」。' },
  { path: '/name', title: '姓名・商店命名吉凶｜康熙筆畫五格剖象與 81 數理',
    desc: '以真正的康熙筆畫（部首還原為本字，如氵作水四畫）計算天格、人格、地格、外格、總格與三才五行，並對照 81 數理吉凶。非中文字會直接告訴你算不了，不給猜測值。' },
  { path: '/appendix/food', title: '食物相剋對照表｜含已被推翻的常見誤傳',
    desc: '傳統食物相剋說法對照表，並標出哪些是已被科學推翻的誤傳（例如海鮮配維他命 C 會生成砒霜的說法），讓你知道哪些該注意、哪些只是以訛傳訛。' },
  { path: '/appendix/units', title: '度量衡換算｜台斤台尺坪甲與公制對照表',
    desc: '台制與公制對照：台斤與公斤、兩與公克、台尺與公分、坪與平方公尺、甲與公頃、斗石升等容量單位，買地、買房、買菜、看老地契時都用得到。' },
  { path: '/appendix/ganzhi', title: '六十甲子與三合六合對照表｜天干地支查詢',
    desc: '天干地支、六十甲子順序與納音五行，以及生肖的三合、六合、六沖、六害、三刑與自刑完整對照，是看懂國民曆宜忌與沖煞的基礎工具表。' },
  { path: '/today', title: '今日大家拍的節氣作品｜機巧時運',
    desc: '看看今天大家拍下的節氣。依當前節氣彙整社群最新作品，適合出門前找拍攝靈感，也能看到同一個節氣在台灣南北、山海不同地方各自長成什麼樣子。' },
  { path: '/challenges', title: '節氣攝影挑戰｜每期節氣主題徵件｜機巧時運',
    desc: '參加當期節氣攝影挑戰，用一張照片記錄這個節氣的台灣。優選作品可收錄官方植物月曆，也會出現在當期排行榜上，讓更多人看見你拍的節氣。' },
  { path: '/leaderboard', title: '節氣攝影排行榜｜依真實按讚數即時計算',
    desc: '依真實按讚數即時計算的作品排行榜，看看這個節氣最受歡迎的照片是哪幾張、誰是目前最活躍的節氣攝影創作者，排名隨社群互動即時更新。' },
  { path: '/store', title: '商店｜植物月曆手帳・訂閱方案・企業版｜機巧時運',
    desc: '機巧時運的實體商品與方案：會說話的植物月曆手帳、掃描即可看到當日曆頁的節氣明信片，以及個人訂閱方案與企業客製合作，把國民曆帶回桌上。' },
  { path: '/subscription', title: '訂閱方案比較｜Free 與 Premium｜機巧時運',
    desc: '機巧時運的方案比較：免費版可看每日國民曆與節氣社群，Premium 另有 AI 時光顧問額度、月曆匯出與市集授權等功能。' },
  { path: '/about', title: '關於機巧時運｜把國民曆讀成人話的文化科技團隊',
    desc: '機巧時運由承氣有限公司打造，把國民曆（又稱農民曆、黃曆、老皇曆）的曆算與宜忌用現代語言重寫，結合二十四節氣攝影社群與 AI 顧問，做成一本會說話的文化手帳。' },
  { path: '/privacy', title: '隱私權政策｜機巧時運',
    desc: '機巧時運如何蒐集、使用與保護你的個人資料：帳號資訊、上傳作品、瀏覽紀錄的處理方式，以及你可以行使的查閱、更正、匯出與刪除帳號等權利。' },
  { path: '/terms', title: '服務條款｜機巧時運',
    desc: '使用機巧時運的服務條款：帳號規範、使用者上傳內容的權利歸屬與授權範圍、市集交易與訂閱方案規則，以及命理民俗內容僅供參考的免責說明。' },
  { path: '/contact', title: '聯絡機巧時運｜合作提案與問題回報',
    desc: '對機巧時運有任何問題、建議或錯誤回報，都可以從這裡與我們聯繫。企業客製月曆、節氣內容授權、媒體採訪與通路合作提案，也歡迎直接來信洽談。' },

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

// 靜態頁內容的最後實質更新日。⚠️ 手動維護——改了頁面內容才更新這個值。
// 不可用 new Date()：那會讓爬蟲每次來都看到「全站今天剛更新」，
// Google 認定 lastmod 不可信之後會整份忽略，連日期頁的真實 lastmod 一起賠掉。
const SITE_LASTMOD = '2026-07-31'

const DEFAULT_DESC = ROUTES[0].desc

// ── 日期頁：逐日產生真正不同的 title / description ────────────────
// 「2026年8月1日農民曆」「8月1日宜忌」「今天可以搬家嗎」這類查詢一年 365 天
// 每天都有人搜，是這類產品最大宗的流量來源。每一天必須是獨立網址 ＋ 獨立標題，
// 否則 730 個頁面共用一句話，Google 會判成重複內容而只留一頁。
const WD = ['日', '一', '二', '三', '四', '五', '六']
export function dateMeta(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return null
  const y = +m[1], mo = +m[2], d = +m[3]
  const dt = new Date(y, mo - 1, d)
  if (Number.isNaN(dt.getTime()) || dt.getMonth() !== mo - 1) return null   // 擋 2026-02-31
  let a
  try { a = dayFor(offsetFromDate(dt)) } catch { return null }
  const yi = a.yi.slice(0, 3).join('、')
  const ji = a.ji.filter(t => !t.startsWith('大事勿用')).slice(0, 3).join('、')
  return {
    title: `${y}年${mo}月${d}日（週${WD[dt.getDay()]}）國民曆｜${a.lunar} ${a.ganzhi}宜忌吉時沖煞`,
    desc: `${y}年${mo}月${d}日國民曆（農民曆）：宜${yi || '諸事不宜'}，忌${ji || '無'}。${a.lunar}、${a.ganzhi}、${a.term}第${a.termDay}天，${a.zheng}。附黃道吉時、財喜貴神方位、建除十二神與彭祖百忌。`,
  }
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── 首屏靜態內容（治「CSR 空白頁」）──────────────────────────────
// 實測 GET / 的 <body> 可見文字長度 = 0：所有內容都要跑完 475KB 的 JS 才出現。
// Google 會二次渲染但要排隊且有配額；Bing 對 JS 渲染更差，而台灣的 Yahoo 奇摩
// 吃的就是 Bing 的結果。LINE／FB／Threads 的預覽抓取器更是完全不執行 JS。
//
// 這裡把「曆頁首屏真正會顯示的那些字」以靜態 HTML 寫進 <body>，React 掛載後移除。
// ⚠️ 只能放**畫面上真的會出現**的內容。放使用者看不到的字就是 cloaking，會被判作弊。
//    下面每一項都對得上 Feed／AlmanacDay 實際渲染的區塊。
// ⚠️ 這不是 SSR 的替代品，只是成本最低的一步；真正的解法仍是預渲染／SSG。
function almanacFallback(iso) {
  let a
  try {
    const m = iso && /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
    const dt = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date()
    if (Number.isNaN(dt.getTime())) return ''
    a = dayFor(offsetFromDate(dt))
  } catch { return '' }
  const li = (arr) => arr.map(t => `<li>${esc(t)}</li>`).join('')
  const hours = a.hours12.filter(h => h.luck === '吉').map(h => `${h.zhi}時（${h.range}）`).join('、')
  return `
      <h1>${esc(a.solar.replace(/\s/g, ''))} ${esc(a.weekday)}　今日國民曆（農民曆）宜忌吉時</h1>
      <p>${esc(a.lunar)}・${esc(a.ganzhi)}・${esc(a.term)}第 ${a.termDay} 天（${esc(a.termRange || '')}）・納音${esc(a.wuxing)}</p>
      ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
      <h2>今日宜</h2><ul>${li(a.yi)}</ul>
      <h2>今日忌</h2><ul>${li(a.ji)}</ul>
      <h2>今日吉時</h2><p>${esc(hours || '無特別吉時')}</p>
      <h2>今日沖煞</h2><p>${esc(a.zheng)}，沖煞歲數（虛歲）${esc(a.chong.ages.join('、'))} 歲</p>
      <h2>值日神煞</h2><p>建除十二神：${esc(a.jianchu)}日。${esc(a.jianchuYi)}</p>
      <p>二十八星宿：${esc(a.xiu)}宿・${esc(a.xiuAnimal)}（${esc(a.xiuLuck)}）／每日胎神：${esc(a.taishen)}</p>
      <p>彭祖百忌：${esc(a.pengzu[0])}　${esc(a.pengzu[1])}</p>
      <h2>今日吉神方位</h2>
      <p>喜神${esc(a.xishen)}／財神${esc(a.caishen)}／陽貴神${esc(a.yanggui)}／陰貴神${esc(a.yingui)}；天乙貴人生肖：${esc(a.guiren)}</p>
      <p>吉日星等 ${a.stars} / 5，${esc(a.rating)}。今日一諺：「${esc(a.proverb)}」</p>`
}

// 哪些路由要注入首屏靜態內容（只做內容確定、且 SEO 價值最高的曆頁）
function fallbackFor(pathname, route) {
  if (route?.path === '/' || route?.path === '/almanac/day') return almanacFallback(null)
  if (route?.path === '/almanac/day/:date') {
    return almanacFallback(decodeURIComponent(pathname.split('/').pop() || ''))
  }
  return ''
}


// 把逐頁的 title/description/og/canonical 換進 index.html。
// ⚠️ 用字串取代而非樣板重組——index.html 由 Vite 產生（含 hash 過的資產路徑），
//    不能在這裡重寫整份 HTML。
export function injectMeta(html, { origin, pathname, route }) {
  const url = origin + (pathname === '/' ? '/' : pathname)
  // 日期頁的 meta 由該日的真實曆算產生，不用路由表那句通用的
  const dm = route?.path === '/almanac/day/:date'
    ? dateMeta(decodeURIComponent(pathname.split('/').pop() || ''))
    : null
  const title = dm?.title || route?.title || ROUTES[0].title
  const desc = dm?.desc || route?.desc || DEFAULT_DESC
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
  // 首屏靜態內容：放在 #root 之後，React 掛載時由 main.jsx 移除
  const fb = fallbackFor(pathname, route)
  if (fb) {
    out = out.replace('<div id="root"></div>',
      `<div id="root"></div>
    <div id="seo-fallback">${fb}
    </div>`)
  }
  return out
}

// sitemap：只收可索引的靜態路由（動態頁的 id 由前端資料決定，
// 之後要收錄作品頁再從 DB 產生第二份 sitemap）。
export function buildSitemap(origin, lastmod = SITE_LASTMOD) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const item = (loc, mod) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${mod}</lastmod>\n  </url>`

  // 靜態路由。⚠️ lastmod 不可一律填「今天」——29 個網址每天都宣稱自己更新過，
  //    Google 判定這份 lastmod 不可信之後會**整份忽略**。用內容真正的版本日期。
  const statics = ROUTES
    .filter(r => !r.noindex && !r.path.includes(':'))
    .map(r => item(origin + r.path, r.lastmod || lastmod))

  // 日期頁：過去一年 + 未來一年，每天一個網址。
  // 這是這類產品最大的單一流量來源——「2026年8月1日農民曆」一年 365 天都有人搜，
  // 而原本 730 天全部擠在同一個網址上，等於一個都吃不到。
  // lastmod 用該日期本身：那一頁的內容就是那一天的曆訊，不會再變動。
  const days = []
  const now = new Date()
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let i = -365; i <= 365; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const ds = iso(d)
    days.push(item(`${origin}/almanac/day/${ds}`, ds))
  }

  const body = [...statics, ...days].join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

export const SEO_ROUTES = ROUTES
