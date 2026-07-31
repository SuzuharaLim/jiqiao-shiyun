import { dayFor, offsetFromDate } from '../src/data/almanac.js'
import { TERM_ARTICLES, articleBySlug } from '../src/data/termArticle.js'
import { DEITY_ARTICLES, deityBySlug } from '../src/data/deityArticle.js'
import { DREAMS } from '../src/data/dream.js'
import { PURPOSES, purposeBySlug, goodDaysInMonth } from '../src/data/auspicious.js'
import { GLOSSARY, glossaryBySlug } from '../src/data/glossary.js'
import { SPOTS, spotBySlug, sunTimes } from '../src/data/sunTimes.js'
import { termGuide } from '../src/data/termGuide.js'
import { PRODUCE_BY_MONTH } from '../src/data/produce.js'
import { monthsForTerm } from '../src/data/almanac.js'
import { termTable } from '../src/data/lunisolar.js'

// 有獨立頁的夢境：只收「有原典斷語」者。沒有原典的條目內容太薄，
// 做成獨立頁就是空殼，量一多反而拖累全站評價。
const DREAM_PAGES = DREAMS.filter(d => d.classic)

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
// ⚠️ **SERP 面的 title 一律用「農民曆」，介面文案維持「國民曆」**（品牌決定）。
//    依據不是喜好，是機制：洩露文件的 `titlematchScore` 是**站台層級**訊號——
//    「Titlematch score of the site, a signal that tells how well titles are
//     matching user queries.」一批對不上使用者實際用詞的標題會拖累整站，
//    而台灣人在搜尋框打的是「農民曆」，「國民曆」的搜尋量差一個數量級。
//    description 裡寫「國民曆（俗稱農民曆、黃曆）」是正確的同義說明，不要拿掉。
const ROUTES = [
  { path: '/', title: '機巧時運｜今日農民曆．AI 白話解讀宜忌吉時',
    desc: '今天宜什麼、忌什麼？機巧時運把國民曆（俗稱農民曆、黃曆）用 AI 讀成人話：每日宜忌、黃道吉時、沖煞生肖與歲數、建除十二神一次看懂，還有二十四節氣攝影社群與當令食材。' },
  { path: '/explore', title: '探索節氣攝影作品｜二十四節氣的台灣｜機巧時運',
    desc: '依二十四節氣瀏覽台灣各地的攝影作品，看看立春、大暑、霜降此刻長什麼樣子。可依節氣篩選、追蹤創作者，也能參加當期節氣攝影挑戰。' },
  { path: '/create', title: '節氣工作室｜拍照發布・做月曆・上架市集｜機巧時運',
    desc: '拍下屬於你的節氣：內建濾鏡與節氣標記，一鍵發布到社群，也能排成專屬月曆或上架市集販售授權。相機、拼貼、限動與動態文字全在瀏覽器完成。' },
  { path: '/almanac', title: '農民曆工具箱｜曆頁・生肖・婚配・解夢・神佛誕辰｜機巧時運',
    desc: '國民曆（農民曆）完整曆頁、十二生肖每日運勢、生肖星座婚配、袁天罡秤骨、周公解夢原典、臺灣神佛誕辰倒數、台灣諺語與二十四節氣專欄，都在這一頁。' },
  { path: '/me', title: '我的｜機巧時運', noindex: true },

  { path: '/almanac/day', title: '今日農民曆｜宜忌、黃道吉時、沖煞、建除、彭祖百忌',
    desc: '今日完整國民曆（農民曆）曆頁：宜忌白話解釋、黃道黑道十二神吉時、沖煞生肖與虛歲、建除十二神、二十八星宿、逐日胎神、彭祖百忌與財喜貴神方位。' },
  // 帶日期的完整曆頁（可分享網址）。⚠️ 沒有這一條的話，/almanac/day/2026-08-15
  // 會被判定為未知路由而回 **404 狀態碼**——畫面仍能用，但搜尋引擎完全不收錄，
  // 而「2026年8月15日 國民曆」正是這類產品最大宗的長尾搜尋。
  { path: '/almanac/day/:date', title: '農民曆查詢｜指定日期的宜忌、吉時、沖煞、建除',
    desc: '查詢任一天的完整國民曆：宜忌、黃道吉時、沖煞、建除十二神、二十八宿、胎神與彭祖百忌。' },
  { path: '/auspicious', title: '擇日工具｜搬家、結婚、開市吉日查詢｜機巧時運',
    desc: '依傳統擇日的宜忌推算搬家、入宅、結婚、開市、安床、動土、出行、祭祀、安葬等用途的吉日，附每日沖煞與白話說明，可標出沖到自己生肖的日子。' },
  { path: '/auspicious/:kind', title: '吉日查詢｜機巧時運',
    desc: '該用途全年的吉日一覽，附農曆、干支、沖煞與宜忌說明。' },
  { path: '/auspicious/:kind/:ym', title: '吉日查詢｜機巧時運',
    desc: '該用途該月份的吉日一覽，附農曆、干支、沖煞與宜忌說明。' },
  { path: '/sun', title: '台灣攝影時刻表｜日出日落、黃金時刻與藍調時刻',
    desc: '台灣 14 個熱門拍攝地點的日出、日落、黃金時刻與藍調時刻，由太陽位置實算，可查任一天，並一併顯示當天的節氣與干支。' },
  { path: '/sun/:spot', title: '日出日落時間｜機巧時運',
    desc: '該地點的日出、日落、晨昏黃金時刻與藍調時刻，附當天節氣與農曆干支。' },
  { path: '/glossary', title: '農民曆術語解釋｜建除、彭祖百忌、受死日、黃道吉時',
    desc: '曆頁上那些看不懂的名詞逐一解釋：建除十二神、彭祖百忌、受死日、三娘煞、黃道吉時、二十八星宿、沖煞、胎神、天干地支、犯太歲，每則標明典據與常見誤解。' },
  { path: '/glossary/:slug', title: '術語解釋｜機巧時運',
    desc: '傳統曆法與擇日名詞的定義、詳細說明、典據出處與常見誤解。' },
  { path: '/editorial', title: '編輯政策｜資料來源、校對流程與 AI 的角色',
    desc: '機巧時運的內容分成天文演算、傳統擇日、原典引用三層，本頁說明各層的來源與校對方式，以及 AI 只做白話翻譯、不參與曆算與原典整理的界線。' },
  { path: '/myths', title: '農民曆的常見誤解｜逐項澄清',
    desc: '傳統曆法容易被誤讀的地方逐項澄清：干支年不等於農曆年、沖煞歲數是虛歲、二十八宿差七天看不出來、午年沒有刑太歲屬雞等，包含我們自己曾經算錯又修正的部分。' },
  { path: '/solarterms/:slug', title: '節氣專頁｜機巧時運',
    desc: '單一節氣的由來釋義、七十二候原典、台灣實際氣候與物候、當令農產、俗語慶典與節氣攝影建議。' },
  { path: '/deities/:slug', title: '神明聖誕｜機巧時運',
    desc: '神明的誕辰日期與國曆換算、由來典故、信仰內涵、台灣主要廟宇與祭祀習俗。' },
  { path: '/dream/:slug', title: '解夢｜機巧時運',
    desc: '單一夢境的《周公解夢》原典斷語逐字引用、現代白話參考，並結合當日干支五行給延伸提示。' },
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
  { path: '/about', title: '關於機巧時運｜把農民曆讀成人話的文化科技團隊',
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
  // 與 nav.jsx 同一套規則：單次掃描，選填參數連同前面的斜線一起可省略
  rx: new RegExp('^' + r.path.replace(/\/:(\w+)\?|:(\w+)/g,
    (_, opt) => (opt ? '(?:/([^/]+))?' : '([^/]+)')) + '/?$'),
}))

export function matchRoute(pathname) {
  return MATCHERS.find(m => m.rx.test(pathname)) || null
}

// 靜態頁內容的最後實質更新日。⚠️ 手動維護——改了頁面內容才更新這個值。
// 不可用 new Date()：那會讓爬蟲每次來都看到「全站今天剛更新」，
// Google 認定 lastmod 不可信之後會整份忽略，連日期頁的真實 lastmod 一起賠掉。
const SITE_LASTMOD = '2026-07-31'

// ── 日期頁的滾動視窗 ────────────────────────────────────────────
// ⚠️ 原本一次送出前後各一年共 731 頁。改成滾動視窗的理由有三，都是機制層面的：
//   1. 洩露文件的 `hostAge` 逐字說明：「used in twiddler to sandbox fresh spam
//      at serving time」——用途是隔離「新出現的大量內容」。一個新網域一次噴出
//      731 個程式產生的頁面，在訊號上與 fresh spam 難以區分。
//   2. `siteQualityStddev`：站內品質的**離散程度**會被量測。少數好頁 ＋ 大量薄頁
//      會拉大離散度，反而拖累整站。
//   3. helpful content 自評的反面清單第一條就是「Are you using extensive
//      automation to produce content on many topics?」
// 也符合真實需求——沒有人在查 2025 年 3 月的宜忌。
// 擴充規則：看 GSC 的「已建立索引 ÷ 已提交」，高於 70% 才往外擴，
// 低於 50% 表示品質訊號有問題，要先修內容而不是加量。
const DAILY_PAST = 30
const DAILY_FUTURE = 60

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
    title: `${y}年${mo}月${d}日（週${WD[dt.getDay()]}）農民曆｜${a.lunar} ${a.ganzhi}宜忌吉時沖煞`,
    desc: `${y}年${mo}月${d}日國民曆（農民曆）：宜${yi || '諸事不宜'}，忌${ji || '無'}。${a.lunar}、${a.ganzhi}、${a.term}第${a.termDay}天，${a.zheng}。附黃道吉時、財喜貴神方位、建除十二神與彭祖百忌。`,
  }
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── 條目頁：逐條產生真正不同的 title / description ──────────────
const slugOf = (pathname) => decodeURIComponent(pathname.split('/').pop() || '')
function entryMeta(pathname, route) {
  const p = route?.path
  if (p === '/almanac/day/:date') return dateMeta(slugOf(pathname))
  if (p === '/solarterms/:slug') {
    const a = articleBySlug(slugOf(pathname)); if (!a) return null
    return {
      title: `${a.term}｜由來、七十二候、台灣氣候與當令食材｜二十四節氣`,
      desc: `${a.term}是什麼？${a.meaning.replace(/「[^」]*」——?/, '').slice(0, 40)}。本頁收錄七十二候原典（${a.hou.map(h => h.name).join('、')}）、${a.term}在台灣的實際氣候與物候、當令農產、節氣俗語與攝影建議。`,
    }
  }
  if (p === '/deities/:slug') {
    const d = deityBySlug(slugOf(pathname)); if (!d) return null
    return {
      title: `${d.name}聖誕｜農曆${d.lunarMonth}月${d.lunarDay}日｜由來與台灣主要廟宇`,
      desc: `${d.name}${d.alias?.length ? `（又稱${d.alias.join('、')}）` : ''}誕辰為農曆${d.lunarMonth}月${d.lunarDay}日。本頁附國曆換算與倒數天數、由來典故、信仰內涵、常見祈求，以及${d.temples[0].split('（')[0]}等台灣主要廟宇與祭祀習俗。`,
    }
  }
  if (p === '/auspicious/:kind' || p === '/auspicious/:kind/:ym') {
    const parts = pathname.split('/').filter(Boolean)   // ['auspicious', kind, ym?]
    const kd = purposeBySlug(decodeURIComponent(parts[1] || ''))
    if (!kd) return null
    const ym = /^(\d{4})-(\d{2})$/.exec(parts[2] || '')
    const y = ym ? Number(ym[1]) : new Date().getFullYear()
    if (ym) {
      const mo = Number(ym[2])
      if (mo < 1 || mo > 12) return null
      const n = goodDaysInMonth(kd.slug, y, mo).length
      return {
        title: `${y}年${mo}月${kd.title}｜共 ${n} 天，附農曆干支與沖煞`,
        desc: `${y} 年 ${mo} 月適合${kd.name}的日子共 ${n} 天。${kd.intro}每一天都附農曆、干支、當日沖煞與宜忌說明，可標出沖到自己生肖的日子。`,
      }
    }
    const total = Array.from({ length: 12 }, (_, i) => goodDaysInMonth(kd.slug, y, i + 1).length)
      .reduce((x, z) => x + z, 0)
    return {
      title: `${y}年${kd.title}一覽｜全年 ${total} 天，附沖煞與宜忌說明`,
      desc: `${y} 年適合${kd.name}的日子全年共 ${total} 天，依月份列出。${kd.intro}每一天都附農曆、干支、當日沖煞與宜忌，並可標出沖到自己生肖的日子。`,
    }
  }
  if (p === '/sun/:spot') {
    const sp = spotBySlug(slugOf(pathname)); if (!sp) return null
    const t = sunTimes(new Date(), sp.lat, sp.lng)
    return {
      title: `${sp.name}日出日落時間｜黃金時刻與藍調時刻查詢`,
      desc: `${sp.name}今日日出 ${t.sunrise}、日落 ${t.sunset}，晨黃金時刻 ${t.morningGolden}、昏黃金時刻 ${t.eveningGolden}。可查任一天，並顯示當天節氣與干支。${sp.note}。`,
    }
  }
  if (p === '/glossary/:slug') {
    const g = glossaryBySlug(slugOf(pathname)); if (!g) return null
    return {
      title: `${g.term}是什麼意思？定義、典據與常見誤解｜農民曆術語`,
      desc: `${g.answer.slice(0, 62)}${g.source ? `　典據：${g.source.slice(0, 24)}` : ''}`,
    }
  }
  if (p === '/dream/:slug') {
    const k = slugOf(pathname)
    const d = DREAMS.find(x => x.k[0] === k); if (!d) return null
    return {
      title: `夢見${d.k[0]}是什麼意思？《周公解夢》原典斷語與現代參考`,
      desc: `夢見${d.k[0]}${d.classic ? `，《周公解夢》原典斷語：「${d.classic.slice(0, 24)}」。` : '。'}本頁將原典逐字引用與現代白話參考分開標示，並結合當日干支五行給出延伸提示，不拿現代說法冒充古籍。`,
    }
  }
  return null
}

// ⚠️ llms.txt 已於 2026-08 移除，不要再加回來。
//    Ahrefs 分析 137,000 個網域的 server log：97% 的 llms.txt 收到「零」次請求，
//    有請求的來源中 AI 檢索 bot 合計僅 1.1%（其餘是 SEO 稽核工具與不明 bot）；
//    Google 2026-06-15 也明確澄清它對 Search 曝光「no positive or negative effect」。
//    常見的混淆是：OpenAI/Anthropic 確實在自家「開發者文件站」放 llms.txt，
//    但那是給 coding agent 讀 API 文件用的，與「引導 AI 搜尋爬蟲」是兩回事。
//    要讓 AI 讀到你，唯一有效的是把內容放進靜態 HTML（AI 爬蟲不執行 JS）
//    ——也就是下面這一段在做的事。資料可信度的說明改放在 /editorial 這個真頁面。

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
  // ⚠️ 日期頁不能只是資料表格——那是薄頁（洩露文件的 originalContentScore：
  //    「Only pages with little content have this field」）。補上節氣脈絡與
  //    情境化的內部連結，讓每一頁都有非模板的實質內容，也把使用者的下一個問題接住
  //    （NavBoost 的 lastLongestClicks：目標是成為那個查詢序列的最後一次點擊）。
  const termSlug = TERM_ARTICLES.find(t => t.term === a.term)?.slug || ''
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
      <p>吉日星等 ${a.stars} / 5，${esc(a.rating)}。今日一諺：「${esc(a.proverb)}」</p>
      <h2>今天是什麼節氣？</h2>
      <p>${esc(a.term)}（${esc(a.termRange || '')}）第 ${a.termDay} 天。
      ${termSlug ? `<a href="/solarterms/${termSlug}">看${esc(a.term)}的完整介紹</a>——七十二候、台灣氣候、當令農產。` : ''}
      ${a.festival ? `今天也是${esc(a.festival)}。` : ''}</p>
      <h2>想挑日子做某件事？</h2>
      <p>今天的宜忌只回答「今天適不適合」。如果你要挑的是未來某一天，可以直接看
      <a href="/auspicious/moving">搬家吉日</a>、<a href="/auspicious/wedding">結婚好日子</a>、
      <a href="/auspicious/opening">開市吉日</a>、<a href="/auspicious/bed">安床吉日</a>的整年一覽，
      每一天都附沖煞與宜忌說明。看不懂上面的名詞可以查
      <a href="/glossary/jianchu">建除十二神</a>、<a href="/glossary/chongsha">沖煞</a>、
      <a href="/glossary/huangdao">黃道吉時</a>的解釋。</p>`
}

// 節氣專頁的首屏內容——這是「預渲染」真正要解決的：24 個節氣頁若沒有這一層，
// 爬蟲拿到的仍然是空白，條目化就只有網址沒有內容。
function termFallback(slug) {
  const a = articleBySlug(slug)
  if (!a) return ''
  // 當令農產與節氣生活資料也要進靜態層——不然爬蟲看到的只有典據那一半，
  // 而畫面上明明就有這些（放畫面沒有的才是 cloaking，這裡是相反的情況）。
  const g = termGuide.find(x => x.term === a.term)
  const months = monthsForTerm(a.term)
  const seen = new Set()
  for (const m of months) for (const it of (PRODUCE_BY_MONTH[String(m)] || [])) seen.add(it.name)
  const crops = [...seen]
  // 前後節氣：24 頁串成一圈，爬蟲可以從任一頁走完全部
  const idx = TERM_ARTICLES.indexOf(a)
  const prev = TERM_ARTICLES[(idx - 1 + 24) % 24]
  const next = TERM_ARTICLES[(idx + 1) % 24]
  // 「大暑是幾號」是這類頁面最常見的查詢之一。逐年實算，每一頁的內容都不同。
  const thisYear = new Date().getFullYear()
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2]
    .map(y => { const t = termTable(y).find(x => x.name === a.term); return t && { y, m: t.m, d: t.d } })
    .filter(Boolean)
  return `
      <h1>${esc(a.term)}｜由來、七十二候、台灣氣候與當令</h1>
      <h2>節氣釋義</h2><p>${esc(a.meaning)}</p>
      <h2>七十二候（《月令七十二候集解》）</h2>
      <ul>${a.hou.map((h, i) => `<li>${['初候', '二候', '三候'][i]}　${esc(h.name)}——${esc(h.say)}</li>`).join('')}</ul>
      <h2>${esc(a.term)}在台灣</h2><p>${esc(a.taiwan)}</p>
      <h2>農事</h2><p>${esc(a.farm)}</p>
      ${g?.tips?.length ? `<h2>生活小叮嚀</h2><ul>${g.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${crops.length ? `<h2>當令農產</h2><p>${esc(months.map(m => `${m} 月`).join('・'))}盛產共 ${crops.length} 項：${esc(crops.slice(0, 24).join('、'))}${crops.length > 24 ? ' 等' : ''}。資料來源：農業部（農糧署）「每月盛產農產品產地」開放資料。</p>` : ''}
      ${g?.sayings?.length ? `<h2>節氣俗語</h2><ul>${g.sayings.map(x => `<li>「${esc(x)}」</li>`).join('')}</ul>` : ''}
      ${(g?.foods?.length || g?.festivals?.length || g?.flowers?.length) ? `<h2>應景與活動</h2><p>${[
        g.foods?.length ? `應景食物：${esc(g.foods.join('、'))}` : '',
        g.festivals?.length ? `節慶活動：${esc(g.festivals.join('、'))}` : '',
        g.flowers?.length ? `當季花期：${esc(g.flowers.join('、'))}` : '',
      ].filter(Boolean).join('；')}</p>` : ''}
      ${(g?.organ || g?.luckyColor) ? `<h2>節氣養生與開運色</h2><p>${g.organ ? `養生重點：${esc(g.organ)}。` : ''}${g.luckyColor ? `開運色：${esc(g.luckyColor)}。` : ''}</p>` : ''}
      <h2>${esc(a.term)}拍什麼</h2><p>${esc(a.photo)}</p>
      <h2>${esc(a.term)}是幾號？近年交節日期</h2>
      <p>節氣的交節時刻由太陽視黃經實算，每年略有不同（本站以 UTC+8 為日界）。
      ${esc(a.term)}近年的國曆日期：${years.map(y => `${y.y} 年 ${y.m} 月 ${y.d} 日`).join('、')}。
      交節當天起算，到下一個節氣前一天為止，都算在${esc(a.term)}的區間內。</p>
      <h2>前後節氣</h2>
      <p>${esc(a.term)}是二十四節氣的第 ${idx + 1} 個，屬${esc(a.season)}季${g?.date ? `，${esc(g.date)}` : ''}。
      前一個節氣是 <a href="/solarterms/${prev.slug}">${esc(prev.term)}</a>，
      後一個是 <a href="/solarterms/${next.slug}">${esc(next.term)}</a>。
      也可以回<a href="/solarterms">二十四節氣專欄</a>看完整年表，
      或看<a href="/almanac/day">今日完整國民曆</a>的宜忌與吉時。</p>`
}

function deityFallback(slug) {
  const d = deityBySlug(slug)
  if (!d) return ''
  return `
      <h1>${esc(d.name)}聖誕｜農曆 ${d.lunarMonth} 月 ${d.lunarDay} 日</h1>
      ${d.alias?.length ? `<p>又稱${esc(d.alias.join('、'))}</p>` : ''}
      <h2>由來</h2><p>${esc(d.origin)}</p>
      <h2>信仰內涵</h2><p>${esc(d.belief)}</p>
      ${d.bless?.length ? `<p>常見祈求：${esc(d.bless.join('、'))}</p>` : ''}
      <h2>台灣主要廟宇</h2><ul>${d.temples.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      ${d.custom ? `<h2>祭祀與習俗</h2><p>${esc(d.custom)}</p>` : ''}`
}

function dreamFallback(slug) {
  const d = DREAMS.find(x => x.k[0] === slug)
  if (!d) return ''
  const related = DREAMS.filter(x => x !== d && x.wx === d.wx).slice(0, 6)
  return `
      <h1>夢見${esc(d.k[0])}是什麼意思？</h1>
      ${d.classic ? `<h2>《周公解夢》原典斷語</h2><blockquote>${esc(d.classic)}</blockquote>` : ''}
      <h2>現代參考${d.classic ? '' : '（本條無原典斷語）'}</h2><p>${esc(d.modern)}</p>
      <h2>怎麼讀原典</h2>
      <p>《周公解夢》原典是斷語體、直接給吉凶，與現代心理學式的解讀是兩套不同的系統，
      本站分開標示、不混為一談。原典另有一個容易誤解的地方：大量使用「反夢」原則——
      夢中「得」反而主失、夢中「失」反而主得（例如「拾得錢財，主失財」），
      不可望文生義。${d.k.length > 1 ? `這一條也涵蓋「${esc(d.k.slice(1).join('、'))}」等說法。` : ''}</p>
      <h2>夢象五行與今日曆象</h2>
      <p>夢見${esc(d.k[0])}的夢象屬${esc(d.wx)}。本站會把它與當日日柱的納音五行做生剋比對，
      給出「順勢而為」或「宜守不宜攻」這類提示——同一個夢在不同的日子，延伸提示並不相同。</p>
      ${related.length ? `<h2>其他屬${esc(d.wx)}的夢境</h2><ul>${related.map(r =>
        `<li><a href="/dream/${encodeURIComponent(r.k[0])}">夢見${esc(r.k[0])}</a></li>`).join('')}</ul>` : ''}`
}

// 哪些路由要注入首屏靜態內容。
// ⚠️ 只放「畫面上真的會出現」的內容——放使用者看不到的字就是 cloaking。
//    每一段都對得上對應畫面實際渲染的區塊。
function fallbackFor(pathname, route) {
  const p = route?.path
  const slug = decodeURIComponent(pathname.split('/').pop() || '')
  if (p === '/' || p === '/almanac/day') return almanacFallback(null)
  if (p === '/almanac/day/:date') return almanacFallback(slug)
  if (p === '/solarterms/:slug') return termFallback(slug)
  if (p === '/deities/:slug') return deityFallback(slug)
  if (p === '/dream/:slug') return dreamFallback(slug)
  if (p === '/glossary/:slug') {
    const g = glossaryBySlug(slug)
    if (!g) return ''
    return `
      <h1>${esc(g.term)}是什麼意思？</h1>
      ${g.aka?.length ? `<p>又稱${esc(g.aka.join('、'))}</p>` : ''}
      <p>${esc(g.answer)}</p>
      <h2>詳細說明</h2><p>${esc(g.detail)}</p>
      ${g.source ? `<h2>典據</h2><p>${esc(g.source)}</p>` : ''}
      ${g.caveat ? `<h2>常見誤解</h2><p>${esc(g.caveat)}</p>` : ''}`
  }
  if (p === '/sun/:spot') {
    const sp = spotBySlug(slug)
    if (!sp) return ''
    const t = sunTimes(new Date(), sp.lat, sp.lng)
    return `
      <h1>${esc(sp.name)}日出日落時間與攝影黃金時刻</h1>
      <p>${esc(sp.name)}（北緯 ${sp.lat}°、東經 ${sp.lng}°）常見拍攝點：${esc(sp.note)}。</p>
      <h2>今日時刻</h2>
      <ul>
        <li>晨藍調　${esc(t.morningBlue || '—')}</li>
        <li>日出　　${esc(t.sunrise || '—')}</li>
        <li>晨黃金　${esc(t.morningGolden || '—')}</li>
        <li>昏黃金　${esc(t.eveningGolden || '—')}</li>
        <li>日落　　${esc(t.sunset || '—')}</li>
        <li>昏藍調　${esc(t.eveningBlue || '—')}</li>
        <li>白晝長度${esc(t.dayLength || '—')}</li>
      </ul>
      <h2>黃金時刻與藍調時刻是什麼</h2>
      <p>黃金時刻是太陽高度 0–6 度的那段時間，光線偏暖、影子長、反差低，是人像與風景最好拍的時候；
      藍調時刻是太陽落到地平線下 0–6 度，天空呈飽和的深藍，適合拍城市夜景與有燈光的建築。
      時刻由太陽位置實算，誤差約 ±7 分鐘（春分秋分前後最大、夏至冬至最準），建議提早到現場。</p>
      <h2>其他拍攝地點</h2>
      <ul>${SPOTS.filter(x => x.slug !== sp.slug).map(x =>
        `<li><a href="/sun/${x.slug}">${esc(x.name)}</a>——${esc(x.note)}</li>`).join('')}</ul>`
  }
  if (p === '/sun') {
    const today = new Date()
    return `
      <h1>台灣攝影時刻表｜日出日落、黃金時刻與藍調時刻</h1>
      <ul>${SPOTS.map(x => {
        const t = sunTimes(today, x.lat, x.lng)
        return `<li><a href="/sun/${x.slug}">${esc(x.name)}</a>　日出 ${esc(t.sunrise)}　日落 ${esc(t.sunset)}——${esc(x.note)}</li>`
      }).join('')}</ul>`
  }
  if (p === '/glossary') {
    return `
      <h1>農民曆術語解釋｜建除、彭祖百忌、受死日、黃道吉時</h1>
      <ul>${GLOSSARY.map(g =>
        `<li><a href="/glossary/${g.slug}">${esc(g.term)}</a>——${esc(g.answer.slice(0, 40))}…</li>`).join('')}</ul>`
  }
  if (p === '/auspicious') {
    return `
      <h1>擇日工具｜搬家、結婚、開市吉日查詢</h1>
      <p>依傳統擇日的宜忌推算各用途的吉日。判準來自曆頁的宜欄與當日神煞，不另外發明規則。</p>
      <ul>${PURPOSES.map(x =>
        `<li><a href="/auspicious/${x.slug}">${esc(x.title)}</a>——${esc(x.intro.slice(0, 36))}…</li>`).join('')}</ul>`
  }
  if (p === '/auspicious/:kind' || p === '/auspicious/:kind/:ym') {
    const parts = pathname.split('/').filter(Boolean)
    const kd = purposeBySlug(decodeURIComponent(parts[1] || ''))
    if (!kd) return ''
    const ym = /^(\d{4})-(\d{2})$/.exec(parts[2] || '')
    const y = ym ? Number(ym[1]) : new Date().getFullYear()
    const mos = ym ? [Number(ym[2])] : Array.from({ length: 12 }, (_, i) => i + 1)
    const rows = mos.map(mo => {
      const ds = goodDaysInMonth(kd.slug, y, mo)
      return `<h2>${y} 年 ${mo} 月（${ds.length} 天）</h2>${ds.length
        ? `<ul>${ds.map(x => `<li>${esc(x.d.solar.replace(/\s/g, ''))}（${esc(x.d.weekday)}）　${esc(x.d.lunar)}・${esc(x.d.ganzhi)}　宜${esc(x.matched.join('、'))}　${esc(x.d.zheng)}</li>`).join('')}</ul>`
        : '<p>這個月沒有適合的日子。這是實算結果，不是資料缺漏。</p>'}`
    }).join('')
    return `
      <h1>${y} 年${esc(kd.title)}${ym ? `　${Number(ym[2])} 月` : ''}</h1>
      <p>${esc(kd.intro)}</p>
      ${rows}
      <h2>${esc(kd.name)}的傳統講究</h2><p>${esc(kd.tips)}</p>`
  }
  if (p === '/editorial' || p === '/myths') return ''   // 這兩頁由 React 渲染，內容本來就長
  // 節氣總覽：列出 24 個節氣的真連結，爬蟲才走得到 24 個條目頁
  if (p === '/solarterms') {
    return `
      <h1>二十四節氣專欄｜由來、七十二候、台灣氣候與當令</h1>
      <ul>${TERM_ARTICLES.map(a =>
        `<li><a href="/solarterms/${a.slug}">${esc(a.term)}</a>——${esc(a.meaning.slice(0, 30))}…</li>`).join('')}</ul>`
  }
  // 神佛總覽同理
  if (p === '/deities') {
    return `
      <h1>臺灣神佛誕辰一覽｜農曆換算國曆與倒數天數</h1>
      <ul>${DEITY_ARTICLES.map(d =>
        `<li><a href="/deities/${d.slug}">${esc(d.name)}</a>——農曆 ${d.lunarMonth} 月 ${d.lunarDay} 日</li>`).join('')}</ul>`
  }
  // 解夢總覽：列出有原典的詞條
  if (p === '/dream') {
    return `
      <h1>解夢｜《周公解夢》原典斷語與現代參考</h1>
      <ul>${DREAM_PAGES.map(d =>
        `<li><a href="/dream/${encodeURIComponent(d.k[0])}">夢見${esc(d.k[0])}</a>——${esc(d.classic.slice(0, 20))}</li>`).join('')}</ul>`
  }
  return ''
}


// 把逐頁的 title/description/og/canonical 換進 index.html。
// ⚠️ 用字串取代而非樣板重組——index.html 由 Vite 產生（含 hash 過的資產路徑），
//    不能在這裡重寫整份 HTML。
export function injectMeta(html, { origin, pathname, route }) {
  const url = origin + (pathname === '/' ? '/' : pathname)
  // 條目頁的 meta 由該條目的真實內容產生，不用路由表那句通用的。
  // ⚠️ 沒有這一層的話，24 個節氣頁會共用同一句 description，
  //    Google 會判成重複內容而只留一頁——條目化的努力就白費了。
  const dm = entryMeta(pathname, route)
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
// ── sitemap 分拆 ────────────────────────────────────────────────
// ⚠️ 全部塞在一份裡的話，GSC 只會給你一個總數，出問題時不知道是哪一類沒被收。
//    拆開之後可以逐類看「已建立索引 ÷ 提交數」，低於 60% 就代表那一類有品質問題。
export const SITEMAP_KINDS = ['core', 'daily', 'solarterms', 'auspicious', 'entries']

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>'
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'

export function buildSitemapIndex(origin, lastmod = SITE_LASTMOD) {
  const items = SITEMAP_KINDS.map(k =>
    `  <sitemap><loc>${origin}/sitemap-${k}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`)
  return [XML_HEAD, `<sitemapindex xmlns="${NS}">`, ...items, '</sitemapindex>', ''].join(String.fromCharCode(10))
}

export function buildSitemapKind(origin, kind, lastmod = SITE_LASTMOD) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const item = (loc, mod) => `  <url><loc>${loc}</loc><lastmod>${mod}</lastmod></url>`
  const wrap = (rows) => [XML_HEAD, `<urlset xmlns="${NS}">`, ...rows, '</urlset>', ''].join(String.fromCharCode(10))

  if (kind === 'core') {
    return wrap(ROUTES.filter(r => !r.noindex && !r.path.includes(':'))
      .map(r => item(origin + r.path, r.lastmod || lastmod)))
  }
  if (kind === 'daily') {
    const rows = []
    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    for (let i = -DAILY_PAST; i <= DAILY_FUTURE; i++) {
      const d = new Date(base); d.setDate(d.getDate() + i)
      const ds = iso(d)
      rows.push(item(`${origin}/almanac/day/${ds}`, ds))
    }
    return wrap(rows)
  }
  if (kind === 'solarterms') {
    return wrap(TERM_ARTICLES.map(a => item(`${origin}/solarterms/${a.slug}`, lastmod)))
  }
  if (kind === 'auspicious') {
    // 總表 + 當年與明年的月份頁（吃「9月搬家吉日」這種查詢）
    const y = new Date().getFullYear()
    const rows = []
    for (const p of PURPOSES) {
      rows.push(item(`${origin}/auspicious/${p.slug}`, lastmod))
      for (const yy of [y, y + 1]) {
        for (let m = 1; m <= 12; m++) {
          rows.push(item(`${origin}/auspicious/${p.slug}/${yy}-${String(m).padStart(2, '0')}`, lastmod))
        }
      }
    }
    return wrap(rows)
  }
  if (kind === 'entries') {
    return wrap([
      ...DEITY_ARTICLES.map(d => item(`${origin}/deities/${d.slug}`, lastmod)),
      ...DREAM_PAGES.map(d => item(`${origin}/dream/${encodeURIComponent(d.k[0])}`, lastmod)),
      ...GLOSSARY.map(g => item(`${origin}/glossary/${g.slug}`, lastmod)),
      ...SPOTS.map(x => item(`${origin}/sun/${x.slug}`, lastmod)),
    ])
  }
  return wrap([])
}

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
  for (let i = -DAILY_PAST; i <= DAILY_FUTURE; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const ds = iso(d)
    days.push(item(`${origin}/almanac/day/${ds}`, ds))
  }

  // 條目頁：節氣 24、神佛 12、解夢（有原典者）——每一頁都有實質內容才收錄。
  // ⚠️ 沒有原典斷語的夢境不進 sitemap：內容太薄的頁面量一多會拖累全站評價，
  //    寧可少幾十頁，也不要生一批空殼。
  const entries = [
    ...TERM_ARTICLES.map(a => item(`${origin}/solarterms/${a.slug}`, lastmod)),
    ...DEITY_ARTICLES.map(d => item(`${origin}/deities/${d.slug}`, lastmod)),
    ...DREAM_PAGES.map(d => item(`${origin}/dream/${encodeURIComponent(d.k[0])}`, lastmod)),
    ...GLOSSARY.map(g => item(`${origin}/glossary/${g.slug}`, lastmod)),
    ...SPOTS.map(x => item(`${origin}/sun/${x.slug}`, lastmod)),
    ...PURPOSES.flatMap(p => [
      item(`${origin}/auspicious/${p.slug}`, lastmod),
      ...[new Date().getFullYear(), new Date().getFullYear() + 1].flatMap(yy =>
        Array.from({ length: 12 }, (_, m) =>
          item(`${origin}/auspicious/${p.slug}/${yy}-${String(m + 1).padStart(2, '0')}`, lastmod))),
    ]),
  ]

  const body = [...statics, ...entries, ...days].join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

// 條目路由的 slug 是否真的存在。
// ⚠️ 沒有這一層的話，/solarterms/nope、/deities/nope、/dream/nope 全部回 200，
//    而畫面顯示「找不到」——那就是 soft 404，等於告訴搜尋引擎本站有無限多個
//    內容重複的有效頁面。條目化之後這個風險比以前大得多（三種路由 × 任意字串）。
export function entryExists(pathname, route) {
  const p = route?.path
  const ENTRY = ['/solarterms/:slug', '/deities/:slug', '/dream/:slug', '/almanac/day/:date',
    '/glossary/:slug', '/auspicious/:kind', '/auspicious/:kind/:ym', '/sun/:spot']
  if (!ENTRY.includes(p)) return true
  return entryMeta(pathname, route) !== null
}

export const SEO_ROUTES = ROUTES
