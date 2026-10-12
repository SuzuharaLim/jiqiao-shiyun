import { dayFor, offsetFromDate, todayOffset, taipeiToday } from '../src/data/almanac.js'
import { TERM_ARTICLES, articleBySlug } from '../src/data/termArticle.js'
import { DEITY_ARTICLES, deityBySlug } from '../src/data/deityArticle.js'
import { DREAMS } from '../src/data/dream.js'
import { PURPOSES, purposeBySlug, goodDaysInMonth } from '../src/data/auspicious.js'
import { GLOSSARY, glossaryBySlug } from '../src/data/glossary.js'
import { SPOTS, spotBySlug, sunTimes } from '../src/data/sunTimes.js'
import { PRODUCTS, productBySlug, SHIPPING_NOTE } from '../src/data/products.js'
import { termGuide } from '../src/data/termGuide.js'
import { PRODUCE_BY_MONTH } from '../src/data/produce.js'
import { monthsForTerm } from '../src/data/almanac.js'
import { termTable } from '../src/data/lunisolar.js'
import { OFFICIAL_CARDS, arPageBySlug, characterOf } from '../src/data/arCards.js'
// ★ 路由表是 App 的邏輯路徑；實際網址多一層 /app（/AR、/ar/* 例外）。見 appBase.js 檔頭。
import { toPublic, toLogical } from '../src/data/appBase.js'

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
  { path: '/create', title: '節氣工作室｜發布照片與文章・做月曆・上架市集｜機巧時運',
    desc: '記下屬於你的節氣：發布照片或文章，標記節氣與地點，一鍵分享到社群，也能排成專屬月曆或上架市集販售授權。相機、拼貼、限動與動態文字全在瀏覽器完成。' },
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
  // ★★★ 新增畫面要**同時**改三處路由表（registry.jsx / paths.js / 這裡）。
  //   漏了這一處，新頁會被伺服器判定為未知路由而回 **404 狀態碼**——
  //   畫面照樣能用，所以本機完全看不出來，但搜尋引擎不會收錄。
  { path: '/quiz', title: '節氣知識王｜二十四節氣、干支曆法與擇日民俗問答｜機巧時運',
    desc: '三分鐘計時問答：二十四節氣、天干地支、擇日宜忌與歲時民俗。闖關生存比穩，兩人對戰比快，答錯扣血、連對加倍，附題目解說與積分榜。' },
  // 徽章收藏庫是「我的」東西 ⇒ noindex（同個人頁的處理）。
  { path: '/badges', title: '徽章收藏庫 · 機巧時運',
    desc: '節氣知識王與節氣卡片的徽章收藏：已取得的、還沒拿到的怎麼拿，以及全站唯一徽章目前在誰手上。', noindex: true },
  // ★ 名片**刻意可索引**：它的用途就是分享出去給別人看，標 noindex 等於
  //   把使用者貼到社群的連結從搜尋結果裡刪掉。內容也全是公開欄位。
  { path: '/card/:handle', title: '名片 · 機巧時運',
    desc: '機巧時運的個人名片：作品數、粉絲數與裝上的節氣徽章。' },
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
  // 單一商品頁。⚠️ 沒有這一條的話 /store/planner 會被判成未知路由而回 404 狀態碼，
  //    「節氣手帳」「客製化企業月曆」這類高意圖查詢就沒有落地頁可以排。
  { path: '/store/:slug', title: '商品｜機巧時運選物',
    desc: '機巧時運選物的商品說明、規格與購買方式。' },
  // ⚠️ 這條**允許索引**（`/AR` 是 noindex）：沒有實體卡片的人從搜尋進來就是靠這頁。
  { path: '/ar/card/:slug', title: '節氣卡片｜機巧時運',
    desc: '節氣明信片的互動內容：點卡面上的物件看當令農產、身體保健與曆頁。' },
  // ⚠️ 模型頁 **noindex**：它是「掃到卡片之後跳來的去處」，內容與 /ar/card/:slug
  //    高度重疊。兩頁都放給搜尋引擎就是同一份內容用兩個網址參賽，而卡片頁才是
  //    刻意做給「沒有實體卡、從搜尋進來的人」看的那一版。
  { path: '/ar/model/:slug', title: '節氣 3D 模型｜機巧時運', noindex: true,
    desc: '掃到節氣卡片之後的 3D 模型展示。' },
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
  { path: '/new', title: '發布貼文｜機巧時運', noindex: true },
  { path: '/camera', title: '相機工作室｜機巧時運', noindex: true },
  { path: '/AR', title: '掃描明信片｜機巧時運', noindex: true },
  // 桌曆設計器（2026-10-04）：清單頁是公開的工具頁 → 可索引；個人設計與分享頁 noindex
  { path: '/calendar/make', title: '客製桌曆設計｜自己的照片做成節氣桌曆，3D 預覽翻頁｜機巧時運',
    desc: '線上設計專屬桌曆：一頁一個月、一個節氣、一週或一季任選，放上自己的照片與一句話，標上農曆與二十四節氣，用 3D 立體預覽翻頁。滿意後送出洽詢，由專人聯絡印製，企業與學校客製也適用。' },
  { path: '/calendar/design/:id', title: '桌曆設計｜機巧時運', noindex: true },
  { path: '/calendar/view/:token', title: '桌曆 3D 預覽｜機巧時運', noindex: true },
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
  // ⚠️ 傳進來的是**實際網址**（/app/post/1），路由表是邏輯路徑（/post/:id）。
  //    不屬於 App 的路徑（官網 `/`、舊網址）回 null，由 index.js 決定官網／轉址／404。
  const logical = toLogical(pathname)
  if (logical == null) return null
  return MATCHERS.find(m => m.rx.test(logical)) || null
}

// 靜態頁內容的最後實質更新日。⚠️ 手動維護——改了頁面內容才更新這個值。
// 不可用 new Date()：那會讓爬蟲每次來都看到「全站今天剛更新」，
// Google 認定 lastmod 不可信之後會整份忽略，連日期頁的真實 lastmod 一起賠掉。
// ★ 2026-10-04：App 整個搬到 /app/ ⇒ sitemap 裡**每一個網址都在那天換了**。
//   這個值原本一直停在 07-31，於是 sitemap-index 對 Google 宣稱「五份都沒變過」，
//   而 GSC 從 10/6 起冒出三百多頁「Google 選了不同的標準網址」——它手上還是舊網址。
//   ⚠️ 之後改了頁面內容照樣手動往後推；搬家日另存在 APP_MOVED_AT（那個不會再變）。
const APP_MOVED_AT = '2026-10-04'
const SITE_LASTMOD = '2026-10-04'

// ⚠️ ……但「每天真的都在變」的那兩頁是例外，不可沿用上面那個固定值。
//    首頁與 /almanac/day 顯示的是**今天**的宜忌，內容天天不同；宣告成三天前更新，
//    等於自己壓抑爬取頻率——而「今日」正是這個站要賣的東西。
//    這與上面那條規則不衝突：上面反對的是「全站一律填今天」（那會讓整份 lastmod
//    失去可信度而被整份忽略），這裡是「內容確實每天變的頁面才填今天」。
const DAILY_PATHS = new Set(['/', '/almanac/day'])
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// ⚠️「今天」一律取台北的日曆日（taipeiToday），不可用 new Date()：Cloud Run 是 UTC，
//    台灣時間 00:00–08:00 會算成前一天（正式容器有設 TZ，但不該靠那個巧合）。
const todayIso = () => isoOf(taipeiToday())
const lastmodFor = (path, fallback) => (DAILY_PATHS.has(path) ? todayIso() : fallback)

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
  if (p === '/ar/card/:slug') {
    const c = OFFICIAL_CARDS.find(x => x.slug === slugOf(pathname))
    if (!c) return null
    const spots = c.hotspots.map(h => h.label).join('、')
    return {
      title: `${c.title} 節氣卡片｜${c.term}｜機巧時運`,
      desc: `${c.title}（${c.subtitle}）節氣明信片的互動內容。點卡面上的${spots}，`
        + `看當令農產的品種與產地、節氣養生重點與當天的曆頁。沒有實體卡片也能看。`,
    }
  }
  if (p === '/ar/model/:slug') {
    const c = arPageBySlug(slugOf(pathname))
    if (!c) return null
    const hero = characterOf(c)
    if (hero?.model?.cat) {
      return {
        title: `${hero.title || c.title} 3D 模型｜${c.term}節氣貓｜機巧時運`,
        desc: `2027 二十四節氣貓的${c.term}：${hero.name}。可以轉動、縮放觀察 3D 模型，也可以直接問它扮演的角色、服飾與道具的設計。不需要實體卡片。`,
      }
    }
    return {
      title: `${c.title} 3D 模型｜${c.term}｜機巧時運`,
      // ⚠️ 不可預設對方「已經掃過卡片」——這一頁**不需要實體卡也能用**，
      //    直接開網址就進得來（外部稽核就是全程沒掃卡片走完的）。
      desc: `${c.title}（${c.subtitle}）的節氣 3D 角色：可以轉動觀察，也可以直接問它品種、產地與這個節氣的事。不需要實體卡片。`,

    }
  }
  if (p === '/store/:slug') {
    const pr = productBySlug(slugOf(pathname)); if (!pr) return null
    return {
      title: `${pr.title}｜機巧時運選物`,
      // 價格寫進 description：商品類查詢的使用者在 SERP 上就是在比價，
      // 看得到價格的那一筆點擊率明顯較高。洽詢報價的就誠實寫洽詢報價。
      desc: `${pr.lead.slice(0, 78)} ${pr.price != null ? `售價 NT$${pr.price}。` : '企業客製，洽詢報價。'}`,
    }
  }
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
    const parts = (toLogical(pathname) ?? pathname).split('/').filter(Boolean)   // ['auspicious', kind, ym?]
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
  // ⚠️ 開頭這一段是「直接回答」：40–60 字給完整答案、不鋪陳。AI 摘要／AI Overviews
  //    與 Perplexity 抽的就是這一段。實查台灣 Google「農民曆的宜忌怎麼算出來」，
  //    AI 摘要引用的是 Threads 貼文與一家婚宴會館的部落格——排名前段的命理大站
  //    一個都沒被引用。也就是說這個利基的引用位幾乎空著，而門檻不是網域權重，
  //    是「有沒有把問題直接回答清楚」。
  // ⚠️ 小標一律用問句：使用者是這樣問的，AI 也是照問題找段落。
  // ⚠️ 對照資料用真的 <table>／<ol>，不要用 div 排版或圖片——AI 抽不出圖裡的字，
  //    也抽不出沒有語意的 div。
  const hourRows = a.hours12.map(h =>
    `<tr><td>${esc(h.zhi)}時</td><td>${esc(h.range)}</td><td>${esc(h.shen)}</td><td>${esc(h.luck)}</td></tr>`).join('')
  return `
      <h1>${esc(a.solar.replace(/\s/g, ''))} ${esc(a.weekday)}　今日國民曆（農民曆）宜忌吉時</h1>
      <p>${esc(a.solar.replace(/\s/g, ''))}是${esc(a.lunar)}、${esc(a.ganzhi)}，${esc(a.term)}第 ${a.termDay} 天。
      今日宜${esc(a.yi.slice(0, 3).join('、') || '諸事不宜')}，忌${esc(a.ji.filter(t => !t.startsWith('大事勿用')).slice(0, 3).join('、') || '無')}；
      黃道吉時${esc(hours || '無')}，${esc(a.zheng)}。</p>
      <p>${esc(a.lunar)}・${esc(a.ganzhi)}・${esc(a.term)}第 ${a.termDay} 天（${esc(a.termRange || '')}）・納音${esc(a.wuxing)}</p>
      ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
      <h2>今天適合做什麼？（宜）</h2><ul>${li(a.yi)}</ul>
      <h2>今天不適合做什麼？（忌）</h2><ul>${li(a.ji)}</ul>
      <h2>今天幾點是吉時？</h2>
      <p>吉時：${esc(hours || '無特別吉時')}。十二時辰的吉凶依黃道黑道十二神推算，起神位置由當日地支決定：</p>
      <table>
        <thead><tr><th>時辰</th><th>時間</th><th>值神</th><th>吉凶</th></tr></thead>
        <tbody>${hourRows}</tbody>
      </table>
      <h2>今天沖到誰？（沖煞）</h2><p>${esc(a.zheng)}，沖煞歲數（虛歲）${esc(a.chong.ages.join('、'))} 歲。
      沖煞是指當日地支與某生肖相沖，傳統認為該生肖者當天不宜參與重要儀式；本站只標出來，不代為刪除該日。</p>
      <h2>今天的值日神煞是什麼？</h2><p>建除十二神：${esc(a.jianchu)}日。${esc(a.jianchuYi)}</p>
      <p>二十八星宿：${esc(a.xiu)}宿・${esc(a.xiuAnimal)}（${esc(a.xiuLuck)}）／每日胎神：${esc(a.taishen)}</p>
      <p>彭祖百忌：${esc(a.pengzu[0])}　${esc(a.pengzu[1])}</p>
      <h2>今天的吉神在哪個方位？</h2>
      <table>
        <thead><tr><th>吉神</th><th>方位</th></tr></thead>
        <tbody>
          <tr><td>喜神</td><td>${esc(a.xishen)}</td></tr>
          <tr><td>財神</td><td>${esc(a.caishen)}</td></tr>
          <tr><td>陽貴神</td><td>${esc(a.yanggui)}</td></tr>
          <tr><td>陰貴神</td><td>${esc(a.yingui)}</td></tr>
        </tbody>
      </table>
      <p>天乙貴人生肖：${esc(a.guiren)}（這一項給的是生肖，不是方位）。</p>
      <p>吉日星等 ${a.stars} / 5，${esc(a.rating)}。今日一諺：「${esc(a.proverb)}」</p>
      <h2>這些數字是怎麼算出來的？</h2>
      <p>農曆月日、二十四節氣交節與年月日干支以 Meeus 演算法實算（朔望月與太陽視黃經，UTC+8 為日界），
      屬確定性計算、可與中央氣象署的天文資料交叉驗證。建除十二神、二十八星宿、黃道黑道十二神、
      宜忌、沖煞、胎神、彭祖百忌與吉神方位屬傳統擇日，規則有典據且可逐步推導，
      但不同通書流派的判定可能相異——凡有流派差異之處本站都在頁面標明採用的版本。
      詳細來源與校對流程見<a href="/app/editorial">編輯政策</a>，名詞解釋見<a href="/app/glossary">術語解釋</a>。</p>
      <h2>今天是什麼節氣？</h2>
      <p>${esc(a.term)}（${esc(a.termRange || '')}）第 ${a.termDay} 天。
      ${termSlug ? `<a href="/app/solarterms/${termSlug}">看${esc(a.term)}的完整介紹</a>——七十二候、台灣氣候、當令農產。` : ''}
      ${a.festival ? `今天也是${esc(a.festival)}。` : ''}</p>
      <h2>想挑日子做某件事？</h2>
      <p>今天的宜忌只回答「今天適不適合」。如果你要挑的是未來某一天，可以直接看
      <a href="/app/auspicious/moving">搬家吉日</a>、<a href="/app/auspicious/wedding">結婚好日子</a>、
      <a href="/app/auspicious/opening">開市吉日</a>、<a href="/app/auspicious/bed">安床吉日</a>的整年一覽，
      每一天都附沖煞與宜忌說明。看不懂上面的名詞可以查
      <a href="/app/glossary/jianchu">建除十二神</a>、<a href="/app/glossary/chongsha">沖煞</a>、
      <a href="/app/glossary/huangdao">黃道吉時</a>的解釋。</p>`
}

// 首頁的首屏內容。
//
// ⚠️ 首頁與 /almanac/day 原本共用 almanacFallback，兩頁的靜態文字**字元重疊率 96%**
//    （583 字 vs 594 字），而且兩頁都自我 canonical——等於同一份內容用兩個網址參賽，
//    Google 只會挑一個，另一個被稀釋。更糟的是首頁是全站權重最高的頁，卻長得跟一個
//    每天輪替的曆頁一樣。
//
//    現在分工：首頁＝「農民曆入口」，只給今日摘要（宜忌／吉時／星等）＋各工具的導覽，
//    打「農民曆」「農民曆查詢」這種大詞；完整的神煞、胎神、彭祖、方位、星宿只留在
//    /almanac/day，打日期型查詢。兩頁不再重疊。
//
// ⚠️ 這裡列出的每一個連結，Feed.jsx 都要真的渲染得出來（`.home-portal`）——
//    靜態層放畫面上沒有的東西就是 cloaking。改這一段時務必同步改 Feed.jsx。
function homeFallback() {
  let a
  try { a = dayFor(todayOffset()) } catch { return '' }
  const hours = a.hours12.filter(h => h.luck === '吉').map(h => `${h.zhi}時（${h.range}）`).join('、')
  const termSlug = TERM_ARTICLES.find(t => t.term === a.term)?.slug || ''
  return `
      <h1>機巧時運｜農民曆查詢．今日宜忌與黃道吉時</h1>
      <p>機巧時運是把國民曆（俗稱農民曆、黃曆）讀成人話的線上工具。
      農曆、二十四節氣與干支由天文演算實算，擇日的宜忌與神煞依傳統規則推導，
      每一項都標明依據與流派。</p>
      <h2>今天（${esc(a.solar.replace(/\s/g, ''))} ${esc(a.weekday)}）宜什麼？</h2>
      <p>${esc(a.lunar)}・${esc(a.ganzhi)}・${esc(a.term)}第 ${a.termDay} 天。
      宜${esc(a.yi.join('、') || '諸事不宜')}；忌${esc(a.ji.join('、') || '無')}。
      黃道吉時${esc(hours || '無')}。吉日星等 ${a.stars} / 5，${esc(a.rating)}。</p>
      ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
      <p><a href="/app/almanac/day">看今日完整曆頁</a>——沖煞生肖與虛歲、建除十二神、二十八星宿、
      逐日胎神、彭祖百忌、財喜貴神方位與十二時辰吉凶。</p>
      <h2>要挑未來某一天怎麼查？</h2>
      <p>今天的宜忌只回答「今天適不適合」。挑日子請用擇日工具：
      <a href="/app/auspicious/moving">搬家吉日</a>、<a href="/app/auspicious/wedding">結婚好日子</a>、
      <a href="/app/auspicious/opening">開市吉日</a>、<a href="/app/auspicious/bed">安床吉日</a>，
      或看<a href="/app/auspicious">全部用途</a>的整年一覽。
      指定日期也可以直接查：<a href="/app/almanac/day">農民曆查詢</a>。</p>
      <h2>看不懂曆頁上的名詞？</h2>
      <p>建除、彭祖百忌、受死日、黃道吉時、沖煞這些名詞在
      <a href="/app/glossary">術語解釋</a>都有逐條說明，每則標明典據，
      沒有明確出處的就誠實說沒有，並附上該項最常見的誤解（見<a href="/app/myths">常見誤解</a>）。
      資料怎麼來、怎麼校對，寫在<a href="/app/editorial">編輯政策</a>。</p>
      <h2>二十四節氣與節氣攝影</h2>
      <p>現在是${esc(a.term)}${a.termRange ? `（${esc(a.termRange)}）` : ''}。
      ${termSlug ? `<a href="/app/solarterms/${termSlug}">${esc(a.term)}專頁</a>有七十二候、台灣氣候實況與當令農產；` : ''}
      <a href="/app/solarterms">二十四節氣專欄</a>是完整年表。
      機巧時運同時是節氣攝影社群——到<a href="/app/explore">探索</a>看大家拍下的此刻，
      或用<a href="/app/sun">攝影時刻表</a>查各地的日出日落與黃金時刻。</p>
      <h2>還有什麼可以查？</h2>
      <p><a href="/app/almanac">農民曆工具箱</a>收了生肖每日運勢、生肖星座婚配、袁天罡秤骨、
      周公解夢原典、臺灣神佛誕辰倒數與台灣諺語；
      <a href="/app/almanac/year">年度總覽</a>則是當年的太歲、犯太歲生肖與地母經。</p>`
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
      前一個節氣是 <a href="/app/solarterms/${prev.slug}">${esc(prev.term)}</a>，
      後一個是 <a href="/app/solarterms/${next.slug}">${esc(next.term)}</a>。
      也可以回<a href="/app/solarterms">二十四節氣專欄</a>看完整年表，
      或看<a href="/app/almanac/day">今日完整國民曆</a>的宜忌與吉時。</p>`
}

// 商品頁的首屏內容。⚠️ 每一段都對得上 ProductDetail.jsx 實際渲染的區塊。
function productFallback(slug) {
  const p = productBySlug(slug)
  if (!p) return ''
  const rows = (arr) => `<ul>${arr.map(([k, v]) => `<li>${esc(k)}——${esc(v)}</li>`).join('')}</ul>`
  return `
      <h1>${esc(p.name)}</h1>
      <p>${esc(p.tagline)}　${p.price != null ? `售價 NT$${p.price}` : '企業客製，洽詢報價'}</p>
      <p>${esc(p.lead)}</p>
      ${p.b2b ? `
      <h2>適合什麼場合？</h2>${rows(p.scenes)}
      <h2>可以客製哪些部分？</h2>${rows(p.custom)}
      <h2>怎麼詢價？</h2><p>${esc(p.ask)}</p>
      <p>最低訂量、單價與交期依客製項目與數量而定，回覆詢價時一併提供。</p>` : `
      <h2>規格</h2>${rows(p.specs)}
      <h2>購買說明</h2><p>${esc(p.digital
        ? '本商品為數位下載，購買後於「我的訂單」取得下載連結。數位內容一經提供即完成交付，依《消費者保護法》第 19 條之合理例外情形，不適用七日猶豫期解除契約。'
        : SHIPPING_NOTE)}</p>`}
      <h2>為什麼做這個</h2><p>${esc(p.why)}</p>
      <h2>其他商品</h2>
      <ul>${PRODUCTS.filter(x => x.slug !== p.slug).map(o =>
        `<li><a href="/app/store/${o.slug}">${esc(o.name)}</a></li>`).join('')}</ul>`
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
        `<li><a href="/app/dream/${encodeURIComponent(r.k[0])}">夢見${esc(r.k[0])}</a></li>`).join('')}</ul>` : ''}`
}

// 哪些路由要注入首屏靜態內容。
// ⚠️ 只放「畫面上真的會出現」的內容——放使用者看不到的字就是 cloaking。
//    每一段都對得上對應畫面實際渲染的區塊。
function fallbackFor(pathname, route) {
  const p = route?.path
  const slug = decodeURIComponent(pathname.split('/').pop() || '')
  if (p === '/') return homeFallback()
  if (p === '/almanac/day') return almanacFallback(null)
  if (p === '/almanac/day/:date') return almanacFallback(slug)
  if (p === '/store/:slug') return productFallback(slug)
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
        `<li><a href="/app/sun/${x.slug}">${esc(x.name)}</a>——${esc(x.note)}</li>`).join('')}</ul>`
  }
  if (p === '/sun') {
    const today = new Date()
    return `
      <h1>台灣攝影時刻表｜日出日落、黃金時刻與藍調時刻</h1>
      <ul>${SPOTS.map(x => {
        const t = sunTimes(today, x.lat, x.lng)
        return `<li><a href="/app/sun/${x.slug}">${esc(x.name)}</a>　日出 ${esc(t.sunrise)}　日落 ${esc(t.sunset)}——${esc(x.note)}</li>`
      }).join('')}</ul>`
  }
  // 商店總覽：列出商品的真連結，爬蟲才走得到四個商品頁
  if (p === '/store') {
    return `
      <h1>機巧時運選物｜節氣手帳、企業客製月曆與數位素材</h1>
      <ul>${PRODUCTS.map(x =>
        `<li><a href="/app/store/${x.slug}">${esc(x.name)}</a>——${esc(x.tagline)}　${x.price != null ? `NT$${x.price}` : '洽詢報價'}</li>`).join('')}</ul>`
  }
  if (p === '/glossary') {
    return `
      <h1>農民曆術語解釋｜建除、彭祖百忌、受死日、黃道吉時</h1>
      <ul>${GLOSSARY.map(g =>
        `<li><a href="/app/glossary/${g.slug}">${esc(g.term)}</a>——${esc(g.answer.slice(0, 40))}…</li>`).join('')}</ul>`
  }
  if (p === '/auspicious') {
    return `
      <h1>擇日工具｜搬家、結婚、開市吉日查詢</h1>
      <p>依傳統擇日的宜忌推算各用途的吉日。判準來自曆頁的宜欄與當日神煞，不另外發明規則。</p>
      <ul>${PURPOSES.map(x =>
        `<li><a href="/app/auspicious/${x.slug}">${esc(x.title)}</a>——${esc(x.intro.slice(0, 36))}…</li>`).join('')}</ul>`
  }
  if (p === '/auspicious/:kind' || p === '/auspicious/:kind/:ym') {
    const parts = (toLogical(pathname) ?? pathname).split('/').filter(Boolean)
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
        `<li><a href="/app/solarterms/${a.slug}">${esc(a.term)}</a>——${esc(a.meaning.slice(0, 30))}…</li>`).join('')}</ul>`
  }
  // 神佛總覽同理
  if (p === '/deities') {
    return `
      <h1>臺灣神佛誕辰一覽｜農曆換算國曆與倒數天數</h1>
      <ul>${DEITY_ARTICLES.map(d =>
        `<li><a href="/app/deities/${d.slug}">${esc(d.name)}</a>——農曆 ${d.lunarMonth} 月 ${d.lunarDay} 日</li>`).join('')}</ul>`
  }
  // 解夢總覽：列出有原典的詞條
  if (p === '/dream') {
    return `
      <h1>解夢｜《周公解夢》原典斷語與現代參考</h1>
      <ul>${DREAM_PAGES.map(d =>
        `<li><a href="/app/dream/${encodeURIComponent(d.k[0])}">夢見${esc(d.k[0])}</a>——${esc(d.classic.slice(0, 20))}</li>`).join('')}</ul>`
  }
  return ''
}


// 把逐頁的 title/description/og/canonical 換進 index.html。
// ⚠️ 用字串取代而非樣板重組——index.html 由 Vite 產生（含 hash 過的資產路徑），
//    不能在這裡重寫整份 HTML。
// 分析工具的標記。⚠️ 三個 ID 都是選填，沒設就回空字串——一行 script 都不注入。
//    也刻意用 async 載入並放在 </head> 之前：追蹤碼不該擋 LCP，而 Core Web Vitals
//    是排名訊號。GA4 設 `anonymize_ip`（GDPR 的最低要求，站上有歐盟可見的隱私權政策）。
export function analyticsTags({ ga4 = '', clarity = '', verify = '' } = {}) {
  const out = []
  if (verify) out.push(`<meta name="google-site-verification" content="${esc(verify)}" />`)
  if (ga4) {
    out.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}"></script>`)
    out.push(`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(ga4)}',{anonymize_ip:true});</script>`)
  }
  if (clarity) {
    out.push(`<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${esc(clarity)}");</script>`)
  }
  return out.join(String.fromCharCode(10))
}

export function injectMeta(html, { origin, pathname, route, analytics, image, imageAlt }) {
  // canonical／og:url 一律不帶尾斜線（路由 regex 結尾是 `/?$`，`/x/` 與 `/x` 都會回 200）。
  // /app 底下的尾斜線已在 index.js 301 掉；這一層補的是 `/ar/card/:slug/` 這類根目錄路徑
  // （那裡不能做去斜線轉址：Windows 本機 static 會把 `/AR` 轉成 `/AR/`，兩邊會繞成迴圈）。
  const url = origin + (pathname === '/' ? '/' : (pathname.replace(/\/+$/, '') || '/'))
  // 條目頁的 meta 由該條目的真實內容產生，不用路由表那句通用的。
  // ⚠️ 沒有這一層的話，24 個節氣頁會共用同一句 description，
  //    Google 會判成重複內容而只留一頁——條目化的努力就白費了。
  const dm = entryMeta(pathname, route)
  // ⚠️ route === null 代表這是未知路徑（伺服器已回 404 狀態碼）。標題不可沿用首頁的
  //    ——實測亂打 /divination，畫面正確顯示「找不到這個頁面」，瀏覽器分頁標題卻仍是
  //    「機巧時運｜今日農民曆．AI 白話解讀宜忌吉時」，使用者在一堆分頁裡分不出
  //    哪個是壞掉的。404 也一律 noindex（下面的 route?.noindex 碰不到 null）。
  const notFound = !route
  const title = notFound ? '找不到頁面 · 機巧時運' : (dm?.title || route.title || ROUTES[0].title)
  const desc = notFound ? '這個網址在機巧時運上不存在，可能是連結過期或打錯了。' : (dm?.desc || route.desc || DEFAULT_DESC)
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`)
  if (notFound || route?.noindex) {
    out = out.replace('</title>', '</title>\n    <meta name="robots" content="noindex, follow" />')
  }
  // 逐頁 og:image。
  // ⚠️ 原本全站共用 og-default.jpg——分享到 LINE／FB／Threads 每一頁長得一模一樣，
  //    而這個站最大的視覺資產（使用者拍的節氣攝影）完全沒被用到。
  // ⚠️ Google Discover 的門檻是**寬度至少 1200px、總像素超過 30 萬**。
  //    上傳流程已把照片壓到 ≤1600px，所以真實作品都過得了門檻，og-default 也是 1200×630。
  // ⚠️ 只放「這一頁真的在講的那張照片」——貼文放該貼文的圖、節氣頁放該節氣的作品。
  //    隨便配一張不相干的圖是把預覽卡當廣告版位用，點進來會落差。
  if (image) {
    const abs = image.startsWith('http') ? image : origin + image
    out = out
      .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(abs)}$2`)
      .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(abs)}$2`)
    if (imageAlt) out = out.replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${esc(imageAlt)}$2`)
    // 使用者上傳的圖不是固定的 1200×630，寫死的尺寸會讓 FB 裁錯——直接移除尺寸宣告。
    out = out
      .replace(/\s*<meta property="og:image:width" content="[^"]*" \/>/, '')
      .replace(/\s*<meta property="og:image:height" content="[^"]*" \/>/, '')
  }

  // 分析工具（未設 ID 就完全不注入，見 analyticsTags 的說明）
  const an = analytics ? analyticsTags(analytics) : ''
  if (an) out = out.replace('</head>', `  ${an}\n  </head>`)

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
// ★ 'legacy' 是**暫時的**（2026-10-12 加，見下方 legacyRows 的說明與移除條件）。
export const SITEMAP_KINDS = ['core', 'daily', 'solarterms', 'auspicious', 'entries', 'legacy']

// sitemap-index 對每一份回報「那份檔案最後一次真的變動」的日子：
//   core       ——今天：裡面的 /app 與 /app/almanac/day 是「今天」的曆頁（lastmodFor）
//   daily      ——今天：滾動視窗，每天前後各移一格
//   auspicious ——月份頁是「今年＋明年」，每年 1/1（台北日）換一批 ⇒ max(SITE_LASTMOD, 今年 1/1)
//   legacy     ——凍結的快照，回報 LEGACY_LIST_UPDATED（清單最後一次補網址的日子）
//   其餘       ——SITE_LASTMOD
// ⚠️ 不可整份 index 一律填今天——理由同 SITE_LASTMOD 的註解：說謊的 lastmod 會讓 Google 整份不信。
const SITEMAP_DAILY_KINDS = new Set(['core', 'daily'])
function indexLastmod(kind, lastmod) {
  if (SITEMAP_DAILY_KINDS.has(kind)) return todayIso()
  if (kind === 'legacy') return LEGACY_LIST_UPDATED
  if (kind === 'auspicious') {
    const jan1 = `${taipeiToday().getFullYear()}-01-01`
    return jan1 > lastmod ? jan1 : lastmod
  }
  return lastmod
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>'
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'

export function buildSitemapIndex(origin, lastmod = SITE_LASTMOD) {
  const items = SITEMAP_KINDS.map(k =>
    `  <sitemap><loc>${origin}/sitemap-${k}.xml</loc><lastmod>${indexLastmod(k, lastmod)}</lastmod></sitemap>`)
  return [XML_HEAD, `<sitemapindex xmlns="${NS}">`, ...items, '</sitemapindex>', ''].join(String.fromCharCode(10))
}

// 各分類的 [網址, lastmod]（現行網址）。legacy 是另一份凍結的清單，見 legacyRows。
function sitemapRows(origin, kind, lastmod) {
  const item = (loc, mod) => [loc, mod]

  if (kind === 'core') {
    // ★ 根目錄是承氣有限公司官網（server/corporate.js），不在 App 的路由表裡，要另外列。
    return [item(origin + '/', lastmod), ...ROUTES.filter(r => !r.noindex && !r.path.includes(':'))
      .map(r => item(origin + toPublic(r.path), lastmodFor(r.path, r.lastmod || lastmod)))]
  }
  if (kind === 'daily') {
    const rows = []
    const base = taipeiToday()
    for (let i = -DAILY_PAST; i <= DAILY_FUTURE; i++) {
      const d = new Date(base); d.setDate(d.getDate() + i)
      const ds = isoOf(d)
      rows.push(item(`${origin}/app/almanac/day/${ds}`, ds))
    }
    return rows
  }
  if (kind === 'solarterms') {
    return TERM_ARTICLES.map(a => item(`${origin}/app/solarterms/${a.slug}`, lastmod))
  }
  if (kind === 'auspicious') {
    // 總表 + 當年與明年的月份頁（吃「9月搬家吉日」這種查詢）
    // 「今年」取台北的年份（同 todayIso）：1/1 00:00–08:00 在 UTC 還是去年。
    const y = taipeiToday().getFullYear()
    const rows = []
    for (const p of PURPOSES) {
      rows.push(item(`${origin}/app/auspicious/${p.slug}`, lastmod))
      for (const yy of [y, y + 1]) {
        for (let m = 1; m <= 12; m++) {
          rows.push(item(`${origin}/app/auspicious/${p.slug}/${yy}-${String(m).padStart(2, '0')}`, lastmod))
        }
      }
    }
    return rows
  }
  if (kind === 'entries') {
    return [
      ...DEITY_ARTICLES.map(d => item(`${origin}/app/deities/${d.slug}`, lastmod)),
      ...DREAM_PAGES.map(d => item(`${origin}/app/dream/${encodeURIComponent(d.k[0])}`, lastmod)),
      ...GLOSSARY.map(g => item(`${origin}/app/glossary/${g.slug}`, lastmod)),
      ...SPOTS.map(x => item(`${origin}/app/sun/${x.slug}`, lastmod)),
      ...PRODUCTS.map(x => item(`${origin}/app/store/${x.slug}`, lastmod)),
      ...OFFICIAL_CARDS.map(c => item(`${origin}/ar/card/${c.slug}`, lastmod)),
    ]
  }
  if (kind === 'legacy') return legacyRows(origin)
  return []
}

// ── 搬家用的舊網址 sitemap（暫時）──────────────────────────────────
// ★★★ 為什麼要把「已經 301 走了的舊網址」放進 sitemap：
//   2026-10-04 App 從 / 搬到 /app/，舊網址全部 301。但 Google 只有在**重新爬到**
//   舊網址時才看得到那個 301；它手上那一批舊網址不會因為新 sitemap 換了就自己去重爬。
//   結果是 GSC 從 10/6 起冒出 362 頁「重複網頁，Google 選了不同的標準網址」
//   （它仍把舊網址當標準網址），「頁面會重新導向」卻只有 7 頁——絕大多數還沒被重爬。
//   ⇒ Google 的網站搬遷指引就是這樣做：**暫時**保留一份列出舊網址的 sitemap，
//     讓爬蟲回去抓、看到 301、把訊號轉到新網址。
// ⚠️ GSC 會把這份裡的每一筆報成「頁面會重新導向」／「已提交的網址會重新導向」。
//    **那是正確的、預期中的結果，不是錯誤**，不要去「修」它。
// ★★★ 收錄範圍是**凍結的快照**，不是「現行路由表去掉 /app」：
//    Google 搬遷指引要的是「搬家前存下來的舊網址對照」。從現行清單推導會隨時間漂移——
//    擇日月份頁的年份跟著今年走（2027-01-01 起會丟掉 96 個真的舊網址、混進 96 個從沒
//    提交過的），搬家後才開放索引的路由也會被冒充成舊網址（實測 /calendar/make 搬家前是
//    noindex，從現行清單推導就混進來了）。
//    下面的值逐字取自搬家前最後一版 sitemap（4ce4808 的前一版，以 2026-10-03 產生的
//    core／solarterms／auspicious／entries 四份，325 個非日期網址）。**排除**：
//      `/`        ——現在是官網，不是轉址（列進來就是叫 Google 把官網當成舊 App 首頁）
//      `/AR`、`/ar/*` ——從來沒搬過家，舊網址＝新網址
//    每一筆都必須真的 301 到 /app 的雙胞胎（index.js 的 matchRoute('/app' + 舊路徑)）。
// ⚠️ 不放進扁平的 /sitemap.xml：那份是「現行網址」的相容版，混進轉址網址只會讓它變髒。
// ⚠️★ **移除條件**：GSC「重複網頁，Google 選了不同的標準網址」降到接近 0，
//    或 2027-01-31 之後（以先到者為準）——屆時從 SITEMAP_KINDS 拿掉 'legacy'、
//    刪掉這一段即可。301 本身**永久保留**，不要一起刪。
const LEGACY_STATIC = [
  '/explore', '/create', '/almanac', '/almanac/day', '/auspicious', '/sun', '/quiz', '/glossary',
  '/editorial', '/myths', '/almanac/year', '/solarterms', '/ingredients', '/festivals', '/flowers',
  '/proverbs', '/deities', '/zodiac', '/match', '/bone', '/dream', '/name', '/appendix/food',
  '/appendix/units', '/appendix/ganzhi', '/today', '/challenges', '/leaderboard', '/store',
  '/subscription', '/about', '/privacy', '/terms', '/contact',
]
const LEGACY_ENTRIES = {
  solarterms: 'lichun yushui jingzhe chunfen qingming guyu lixia xiaoman mangzhong xiazhi xiaoshu dashu liqiu chushu bailu qiufen hanlu shuangjiang lidong xiaoxue daxue dongzhi xiaohan dahan',
  deities: 'mazu tudigong guansheng guanyin xuantian baosheng wenchang chenghuang yuelao zhusheng wangye dizang',
  dream: '水 下雨 落水 沐浴 火 太陽 掉牙 頭髮 流血 死人 棺材 蛇 龍 狗 魚 飛 撿到錢 掉錢 金 結婚 懷孕 哭 房子 鏡子 山 樹 門',
  glossary: 'jianchu pengzu shousiri sanniangsha huangdao ershiba-xiu chongsha taishen ganzhi taisui',
  sun: 'taipei yangmingshan jiufen taichung alishan sun-moon-lake hehuanshan tainan kaohsiung kenting hualien taitung yilan penghu',
  store: 'planner collection-set digital-stickers enterprise',
}
const LEGACY_AUSPICIOUS = { purposes: 'moving wedding opening bed groundbreaking travel worship burial', years: [2026, 2027] }
// 日期頁：搬家前的 sitemap 自 2026-07-31（6d0a3b7）起是滾動視窗「過去 30／未來 60」，
//   最早可能提交的是 07-31 −30 ＝ 07-01；最晚是搬家當天（舊站仍在線到部署為止）10-04 +60 ＝ 12-03。
//   ⚠️ 從來沒有「前後各一年」在線過幾個月：±365 那版在 git 裡只活了約 80 分鐘
//      （005f6a8 21:58 → 6d0a3b7 23:18，同一晚）。
//   ⚠️ 範圍外的舊日期頁若真的在 Google 索引裡（例如經由前後日連結爬到），要拿 GSC 匯出的
//      實際網址來補，**不可把範圍改成開放式**（例如到「今天＋365」）——那等於把站規否決過的
//      「日期頁全量 sitemap」偷渡回來（見 DAILY_PAST 的註解），而且清單會每天變。
const LEGACY_DAYS = ['2026-07-01', '2026-12-03']
// ★ 依 GSC 證據補的舊網址（2026-10-12，取自「成效 → 網頁」匯出 2026-07-14～10-12）：
//   這些網址在搬家前的 sitemap 裡**不存在**，但 Google 有給它們曝光 ⇒ 它手上確實有這些舊網址
//   （多半是沿著曆頁的前後日連結、解夢頁的相關詞連結爬到的），一樣要讓它回去看到 301。
//   ⚠️ 只收「GSC 實際出現過」的，不可為了湊齊而補推導出來的網址（理由同 LEGACY_DAYS）。
//   ⚠️ 每一筆都已實測 301 → /app 的雙胞胎 → 200。
const LEGACY_FROM_GSC = {
  dream: '喪事 墜落 被追 貓 迷路 鳥',
  days: [
  '2025-08-02', '2025-08-07', '2025-08-09', '2025-08-14', '2025-08-25', '2025-08-27', '2025-08-28', '2025-08-30',
  '2025-08-31', '2025-09-04', '2025-09-09', '2025-09-15', '2025-09-16', '2025-09-21', '2025-09-22', '2025-09-24',
  '2025-09-28', '2025-09-30', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07',
  '2025-10-10', '2025-10-11', '2025-10-30', '2025-11-01', '2025-11-05', '2025-11-06', '2025-11-09', '2025-11-10',
  '2025-11-11', '2025-11-16', '2025-11-19', '2025-12-03', '2025-12-04', '2025-12-06', '2025-12-15', '2025-12-31',
  '2026-01-01', '2026-01-04', '2026-01-08', '2026-01-10', '2026-01-12', '2026-01-15', '2026-01-19', '2026-01-20',
  '2026-01-22', '2026-01-24', '2026-01-28', '2026-02-02', '2026-02-05', '2026-02-07', '2026-02-10', '2026-02-11',
  '2026-02-13', '2026-02-28', '2026-03-21', '2026-03-26', '2026-04-02', '2026-04-06', '2026-04-11', '2026-04-21',
  '2026-04-23', '2026-04-26', '2026-04-27', '2026-04-30', '2026-05-03', '2026-05-04', '2026-05-10', '2026-05-16',
  '2026-05-31', '2026-06-02', '2026-06-05', '2026-06-06', '2026-06-14', '2026-06-15', '2026-06-16', '2026-06-18',
  '2026-06-20', '2026-06-21', '2026-06-27', '2026-12-04', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12',
  '2026-12-14', '2026-12-15', '2026-12-17', '2026-12-20', '2026-12-22', '2026-12-23', '2026-12-26', '2026-12-29',
  '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07',
  '2027-01-09', '2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-17', '2027-01-19', '2027-01-20',
  '2027-01-22', '2027-01-23', '2027-01-27', '2027-01-29', '2027-02-07', '2027-02-11', '2027-02-14', '2027-02-17',
  '2027-02-23', '2027-02-26', '2027-03-04', '2027-03-11', '2027-03-16', '2027-03-22', '2027-03-23', '2027-03-27',
  '2027-03-29', '2027-04-05', '2027-04-06', '2027-04-08', '2027-04-11', '2027-04-17', '2027-04-18', '2027-04-26',
  '2027-05-01', '2027-05-13', '2027-05-14', '2027-06-05', '2027-06-13', '2027-06-16', '2027-06-21', '2027-06-27',
  '2027-07-05', '2027-07-12', '2027-07-21', '2027-07-22',
  ],
}
// lastmod ＝ 搬家日：這些網址就是在那一天從「內容頁」變成「轉址」的。
// ⚠️ 之後若依 GSC 證據補了網址，**這個值不動**，要推的是下面的 LEGACY_LIST_UPDATED。
const LEGACY_LASTMOD = APP_MOVED_AT
// 這份清單最後一次被改動的日子（sitemap-index 用它回報 legacy 這一份的 lastmod）。
// ⚠️ 與上面那個不同：每一筆網址的 lastmod 仍是搬家日（它們是那天變成轉址的），
//    但「清單本身」在補 GSC 證據那天變了，index 要誠實說這份檔案哪天變過。補網址時要推這個值。
const LEGACY_LIST_UPDATED = '2026-10-12'
function legacyRows(origin) {
  const month = (m) => String(m).padStart(2, '0')
  const paths = [
    ...LEGACY_STATIC,
    ...Object.entries(LEGACY_ENTRIES).flatMap(([sec, slugs]) =>
      slugs.split(' ').map(s => `/${sec}/${encodeURIComponent(s)}`)),
    ...LEGACY_AUSPICIOUS.purposes.split(' ').flatMap(p => [`/auspicious/${p}`,
      ...LEGACY_AUSPICIOUS.years.flatMap(y => Array.from({ length: 12 }, (_, i) => `/auspicious/${p}/${y}-${month(i + 1)}`))]),
  ]
  const [from, to] = LEGACY_DAYS.map(s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) })
  for (const d = from; d <= to; d.setDate(d.getDate() + 1)) paths.push(`/almanac/day/${isoOf(d)}`)
  paths.push(...LEGACY_FROM_GSC.dream.split(' ').map(s => `/dream/${encodeURIComponent(s)}`),
    ...LEGACY_FROM_GSC.days.map(d => `/almanac/day/${d}`))
  return paths.map(p => [origin + p, LEGACY_LASTMOD])
}

export function buildSitemapKind(origin, kind, lastmod = SITE_LASTMOD) {
  const item = ([loc, mod]) => `  <url><loc>${loc}</loc><lastmod>${mod}</lastmod></url>`
  return [XML_HEAD, `<urlset xmlns="${NS}">`, ...sitemapRows(origin, kind, lastmod).map(item), '</urlset>', '']
    .join(String.fromCharCode(10))
}

export function buildSitemap(origin, lastmod = SITE_LASTMOD) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const item = (loc, mod) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${mod}</lastmod>\n  </url>`

  // 靜態路由。⚠️ lastmod 不可一律填「今天」——29 個網址每天都宣稱自己更新過，
  //    Google 判定這份 lastmod 不可信之後會**整份忽略**。用內容真正的版本日期。
  const statics = [item(origin + '/', lastmod), ...ROUTES
    .filter(r => !r.noindex && !r.path.includes(':'))
    .map(r => item(origin + toPublic(r.path), lastmodFor(r.path, r.lastmod || lastmod)))]

  // 日期頁：過去一年 + 未來一年，每天一個網址。
  // 這是這類產品最大的單一流量來源——「2026年8月1日農民曆」一年 365 天都有人搜，
  // 而原本 730 天全部擠在同一個網址上，等於一個都吃不到。
  // lastmod 用該日期本身：那一頁的內容就是那一天的曆訊，不會再變動。
  const days = []
  const base = taipeiToday()   // 台北的今天（同 todayIso 的理由）
  for (let i = -DAILY_PAST; i <= DAILY_FUTURE; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const ds = iso(d)
    days.push(item(`${origin}/app/almanac/day/${ds}`, ds))
  }

  // 條目頁：節氣 24、神佛 12、解夢（有原典者）——每一頁都有實質內容才收錄。
  // ⚠️ 沒有原典斷語的夢境不進 sitemap：內容太薄的頁面量一多會拖累全站評價，
  //    寧可少幾十頁，也不要生一批空殼。
  const entries = [
    ...TERM_ARTICLES.map(a => item(`${origin}/app/solarterms/${a.slug}`, lastmod)),
    ...DEITY_ARTICLES.map(d => item(`${origin}/app/deities/${d.slug}`, lastmod)),
    ...DREAM_PAGES.map(d => item(`${origin}/app/dream/${encodeURIComponent(d.k[0])}`, lastmod)),
    ...GLOSSARY.map(g => item(`${origin}/app/glossary/${g.slug}`, lastmod)),
    ...SPOTS.map(x => item(`${origin}/app/sun/${x.slug}`, lastmod)),
    ...PRODUCTS.map(x => item(`${origin}/app/store/${x.slug}`, lastmod)),
    ...OFFICIAL_CARDS.map(c => item(`${origin}/ar/card/${c.slug}`, lastmod)),
    ...PURPOSES.flatMap(p => [
      item(`${origin}/app/auspicious/${p.slug}`, lastmod),
      ...[taipeiToday().getFullYear(), taipeiToday().getFullYear() + 1].flatMap(yy =>
        Array.from({ length: 12 }, (_, m) =>
          item(`${origin}/app/auspicious/${p.slug}/${yy}-${String(m + 1).padStart(2, '0')}`, lastmod))),
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
    '/glossary/:slug', '/auspicious/:kind', '/auspicious/:kind/:ym', '/sun/:spot',
    '/store/:slug', '/ar/card/:slug', '/ar/model/:slug']
  if (!ENTRY.includes(p)) return true
  return entryMeta(pathname, route) !== null
}

export const SEO_ROUTES = ROUTES
