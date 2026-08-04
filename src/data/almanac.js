// 為任意日期產生一張國民曆日頁。確定性、無亂數。
// off 是相對錨點 6/6 的天數偏移（UI 的翻日單位），但所有曆算都以「該日的真實西曆日期」為輸入。
//
// ★ 分層說明（改動前務必分清）：
//   ① 天文層（真實演算，見 lunisolar.js）：農曆月日與閏月、二十四節氣、年/月/日干支。
//      已用朔望月與太陽視黃經實算並比對過公開資料（2020–2030 春節 11/11、節氣日期、
//      2026-07-28＝農曆六月十五・丙午年乙未月癸卯日）。**這一層不是示範值，不要再標「示範演算」。**
//   ② 擇日神煞層（民俗）：建除、二十八星宿、宜忌、沖煞、胎神、彭祖百忌、特殊日。
//      規則定義正確，但各家流派本就歧異，且宜忌選詞仍為演算取樣——文案要誠實標示民俗性質。
import { almanacDays, proverbs } from './mock.js'
// 天文層（真實農曆／節氣／日干支）——取代原本的近似演算
import {
  lunarFromDate, termFromDate, termLocalDay, termTable,
  dayGanzhiIndex, jdFromDate, dateFromJd, TERM_NAMES,
} from './lunisolar.js'

const G = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const Z = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ZODIAC = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬']
const WD = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
// 六十甲子納音（三十組，**兩兩一組**：甲子與乙丑同為海中金）。
// ⚠️ 這張表原本只有 12 筆，索引還寫成 `(2*天干序 + 地支序) % 12`——
//    那個公式與納音的定義毫無關係，六十干支裡只有甲子（海中金）與丙午（天河水）
//    碰巧對，其餘 58 個全錯。而丙午正好是 2026 年，所以今年看起來沒事，
//    2027 丁未年一到就會顯示「爐中火」（正解天河水），錯誤直接浮上首屏。
// ⚠️ 順序不可調換，索引一律用「六十甲子序號整除 2」。
const NAYIN = [
  '海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火',
  '澗下水', '城頭土', '白蠟金', '楊柳木', '泉中水', '屋上土',
  '霹靂火', '松柏木', '長流水', '沙中金', '山下火', '平地木',
  '壁上土', '金箔金', '覆燈火', '天河水', '大驛土', '釵釧金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
]
// 天干序＋地支序 → 六十甲子序（甲子=0 … 癸亥=59）
const sexagenary = (ganIdx, zhiIdx) => {
  for (let n = 0; n < 60; n++) if (n % 10 === ganIdx && n % 12 === zhiIdx) return n
  return -1
}
export const nayinOf = (ganIdx, zhiIdx) => NAYIN[Math.floor(sexagenary(ganIdx, zhiIdx) / 2)]
const YI_POOL = ['祈福', '開市', '納財', '出行', '嫁娶', '祭祀', '安床', '入宅', '交易', '立券', '沐浴', '會親友', '裁衣', '栽種', '解除', '求嗣']
const JI_POOL = ['動土', '安葬', '出火', '開倉', '伐木', '作樑', '行喪', '破土', '針灸', '掘井']
const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const MON = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘']

// 二十四節氣的年度順序（供 UI 排序節氣清單用）——立春起算，與 lunisolar 同源。
// ⚠️ 原本這裡有一張「固定國曆日期」的節氣表（立春固定 2/4 等），交節日期每年
// 會差 1~2 天，已改由 lunisolar.js 的太陽視黃經實算，這張表不再存在。
export const TERM_ORDER = TERM_NAMES
// 節氣日期表（某西曆年）——供年曆與節氣年表使用
export { termTable }

const IS_JIE = new Set(['立春', '驚蟄', '清明', '立夏', '芒種', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒']) // 十二節（月之始）

// 建除十二神（值日）+ 各自宜事
const JIANCHU = ['建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉']
// 建除十二神的宜忌。⚠️ 這裡原本是一句散文（'宜出行、赴任；忌動土、開倉'），
// 只能拿來顯示、不能拿來運算，於是宜忌欄與這段註解各走各的路：
//   ・閉日註解寫「宜造葬」，宜欄卻從沒出現過造葬（建除的宜項根本沒被採用）
//   ・除日註解只有「宜療病、除服、掃舍、解除」，宜欄卻冒出開市、嫁娶
//     （多數通書的除日是忌嫁娶的）
// 改成結構化陣列當**單一真相**，下方 reconcile 直接拿它運算，
// 顯示用的句子則由它自動生成——兩者就不可能再對不起來。
const JIANCHU_YI = {
  建: { yi: ['出行', '赴任', '上書'], ji: ['動土', '開倉'] },
  除: { yi: ['療病', '除服', '掃舍', '解除'], ji: ['嫁娶', '開市'] },
  滿: { yi: ['嫁娶', '開市', '祈福'], ji: ['安葬'] },
  平: { yi: ['修飾垣牆', '平治道塗'], ji: [] },
  定: { yi: ['冠帶', '納采', '安床', '修造'], ji: ['訴訟'] },
  執: { yi: ['捕捉', '造葬', '結網'], ji: ['開市'] },
  破: { yi: ['求醫', '破屋壞垣'], ji: [], allBad: true },
  危: { yi: ['安床', '祭祀'], ji: ['登高', '行船'] },
  成: { yi: ['開市', '入學', '嫁娶', '修造'], ji: [] },
  收: { yi: ['納財', '進人口', '捕捉'], ji: ['安葬'] },
  開: { yi: ['開市', '動土', '上樑', '入學'], ji: ['安葬'] },
  閉: { yi: ['築堤', '埋穴', '造葬'], ji: ['開市', '出行'] },
}
// 顯示用句子由結構自動生成，不再另外手寫一份（手寫的那份就是矛盾的來源）
const jianchuText = (k) => {
  const v = JIANCHU_YI[k]; if (!v) return ''
  return [v.yi.length ? `宜${v.yi.join('、')}` : '', v.ji.length ? `忌${v.ji.join('、')}` : '',
    v.allBad ? '諸事不宜' : ''].filter(Boolean).join('；')
}
// 節氣 → 月建地支索引（十二節與其中氣同一月支）
const TERM_ZHI = {
  立春: 2, 雨水: 2, 驚蟄: 3, 春分: 3, 清明: 4, 穀雨: 4, 立夏: 5, 小滿: 5, 芒種: 6, 夏至: 6, 小暑: 7, 大暑: 7,
  立秋: 8, 處暑: 8, 白露: 9, 秋分: 9, 寒露: 10, 霜降: 10, 立冬: 11, 小雪: 11, 大雪: 0, 冬至: 0, 小寒: 1, 大寒: 1,
}

// 二十八星宿（連續值日）+ 值日禽 + 吉凶
const XIU = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虛', '危', '室', '壁', '奎', '婁', '胃', '昴', '畢', '觜', '參', '井', '鬼', '柳', '星', '張', '翼', '軫']
const XIU_ANIMAL = ['蛟', '龍', '貉', '兔', '狐', '虎', '豹', '獬', '牛', '蝠', '鼠', '燕', '豬', '貐', '狼', '狗', '雉', '雞', '烏', '猴', '猿', '犴', '羊', '獐', '馬', '鹿', '蛇', '蚓']
// 二十八宿吉凶。凶宿十三：亢、氐、心、牛、女、虛、危、昴、觜、鬼、柳、星、翼；其餘十五宿為吉。
// ⚠️ 這張表曾把「牛」標成吉、「參」標成凶，剛好兩格都反了。牛宿是凶宿——
//    「牛星築室主悲哀」，值日不宜起造、嫁娶；參宿（參水猿）則在通行版本裡屬吉。
//    改動這張表前先數一遍：凶必須剛好 13 個、吉 15 個，且與上方 XIU 的順序對齊。
const XIU_LUCK = ['吉', '凶', '凶', '吉', '凶', '吉', '吉', '吉', '凶', '凶', '凶', '凶', '吉', '吉', '吉', '吉', '吉', '凶', '吉', '凶', '吉', '吉', '凶', '凶', '凶', '吉', '凶', '吉']

// 彭祖百忌（以日干支起）
const PENGZU_GAN = ['甲不開倉財物耗散', '乙不栽植千株不長', '丙不修灶必見災殃', '丁不剃頭頭必生瘡', '戊不受田田主不祥', '己不破券二比並亡', '庚不經絡織機虛張', '辛不合醬主人不嘗', '壬不決水更難提防', '癸不詞訟理弱敵強']
const PENGZU_ZHI = ['子不問卜自惹禍殃', '丑不冠帶主不還鄉', '寅不祭祀神鬼不嘗', '卯不穿井水泉不香', '辰不哭泣必主重喪', '巳不遠行財物伏藏', '午不苫蓋屋主更張', '未不服藥毒氣入腸', '申不安床鬼祟入房', '酉不會客醉坐顛狂', '戌不吃犬作怪上床', '亥不嫁娶不利新郎']

// 逐日胎神占方（六十甲子；甲子=0 … 癸亥=59）
const TAISHEN = [
  '占門碓外東南', '碓磨廁外東南', '廚灶爐外正南', '倉庫門外正南', '房床栖外正南', '占門床外正南', '占碓磨外正南', '廚灶廁外西南', '倉庫爐外西南', '房床門外西南',
  '門雞栖外西南', '碓磨床外西南', '廚灶碓外西南', '倉庫廁外正西', '房床爐外正西', '占大門外正西', '碓磨栖外正西', '廚灶床外正西', '倉庫碓外西北', '房床廁外西北',
  '占門爐外西北', '碓磨門外西北', '廚灶栖外西北', '倉庫床外西北', '房床碓外正北', '占門廁外正北', '碓磨爐外正北', '廚灶門外正北', '倉庫栖外正北', '占房床房內北',
  '占門碓房內北', '碓磨廁房內北', '廚灶爐房內北', '倉庫門房內北', '房床栖房內南', '占門床房內南', '占碓磨房內南', '廚灶廁房內南', '倉庫爐房內南', '房床門房內南',
  '門雞栖房內東', '碓磨床房內東', '廚灶碓房內東', '倉庫廁房內東', '房床爐房內東', '占大門外東北', '碓磨栖外東北', '廚灶床外東北', '倉庫碓外東北', '房床廁外東北',
  '占門爐外東北', '碓磨門外正東', '廚灶栖外正東', '倉庫床外正東', '房床碓外正東', '占門廁外正東', '碓磨爐外東南', '廚灶門外東南', '倉庫栖外東南', '占房床外東南',
]

// 吉神方位（以日干）
const XISHEN = { 甲: '東北', 乙: '西北', 丙: '西南', 丁: '正南', 戊: '東南', 己: '東北', 庚: '西北', 辛: '西南', 壬: '正南', 癸: '東南' }   // 喜神
// 財神方位（依日干）。⚠️ 丙丁曾寫「正西」，那其實是**陽貴神**的位置（丙日陽貴在酉＝正西），
// 兩個欄位剛好對錯位了——而且這個巧合正是它被抓到的原因。
// 台灣通書通行版為丙丁西南；另有一派作正西（由「財＝我剋者」推：火剋金→西）。
// 兩說並存，此處採通書通行版並在頁面標明流派。
const CAISHEN = { 甲: '東北', 乙: '東北', 丙: '西南', 丁: '西南', 戊: '正北', 己: '正北', 庚: '正東', 辛: '正東', 壬: '正南', 癸: '正南' }
// 天乙貴人「方位」——與下方 GUIREN 的「生肖」是兩回事，不可混為一談。
// 舊版「今日吉神方位」區塊裡，喜神／財神給的是方位、貴神卻給生肖，性質不一致。
// 貴人歌：甲戊庚牛羊、乙己鼠猴鄉、丙丁豬雞位、壬癸兔蛇藏、六辛逢馬虎；陽貴陰貴分列。
const GUI_YANG = { 甲: '未', 乙: '申', 丙: '酉', 丁: '亥', 戊: '丑', 己: '子', 庚: '丑', 辛: '寅', 壬: '卯', 癸: '巳' }
const GUI_YIN = { 甲: '丑', 乙: '子', 丙: '亥', 丁: '酉', 戊: '未', 己: '申', 庚: '未', 辛: '午', 壬: '巳', 癸: '卯' }
const ZHI_DIR = { 子: '正北', 丑: '東北', 寅: '東北', 卯: '正東', 辰: '東南', 巳: '東南', 午: '正南', 未: '西南', 申: '西南', 酉: '正西', 戌: '西北', 亥: '西北' }
const GUIREN = { 甲: '牛、羊', 戊: '牛、羊', 庚: '牛、羊', 乙: '鼠、猴', 己: '鼠、猴', 丙: '豬、雞', 丁: '豬、雞', 壬: '兔、蛇', 癸: '兔、蛇', 辛: '馬、虎' } // 天乙貴人（生肖）

// 農曆節日／神明聖誕（示範，農曆月-日）
const LUNAR_FEST = {
  '1-1': '春節', '1-9': '天公生', '1-15': '元宵節', '2-2': '土地公聖誕', '2-19': '觀音佛祖聖誕', '3-3': '玄天上帝聖誕',
  '3-15': '保生大帝聖誕', '3-23': '媽祖聖誕', '4-8': '浴佛節', '5-5': '端午節', '5-13': '關聖帝君飛昇', '6-24': '關聖帝君聖誕',
  '6-15': '半年節（吃半年圓）', '7-7': '七夕', '7-15': '中元節', '8-15': '中秋節', '9-9': '重陽節', '10-15': '下元節', '12-16': '尾牙', '12-24': '送神', '12-30': '除夕',
}
// 受死日（每月忌用之日支）
const SHOUSI = { 1: 10, 2: 4, 3: 11, 4: 5, 5: 0, 6: 6, 7: 1, 8: 7, 9: 2, 10: 8, 11: 3, 12: 9 } // 正月戌…（值為地支索引）
// 楊公忌日（農曆 月→日）
const YANGGONG = { 1: 13, 2: 11, 3: 9, 4: 7, 5: 5, 6: 3, 7: 1, 8: 27, 9: 25, 10: 23, 11: 21, 12: 19 }
// 天赦日（季節 → 日干支）：春戊寅、夏甲午、秋戊申、冬甲子
const TIANSHE = { 春: '戊寅', 夏: '甲午', 秋: '戊申', 冬: '甲子' }


// 宜忌詞 → 白話短語。⚠️ 這是「一句話總結」用的極短別名，與 DB 裡 almanacTerms 的
// 完整解釋是兩回事：那邊是點下去看的詳解，這邊是要能串成一句話的口語詞。
// 新手看到「宜：祭祀 交易 會親友 解除」是看不懂的——「解除」解除什麼？「作樑」是什麼？
const PLAIN = {
  祈福: '拜拜祈福', 開市: '開張做生意', 納財: '收錢入帳', 出行: '出遠門', 嫁娶: '結婚',
  祭祀: '拜拜', 安床: '搬床位', 入宅: '搬新家', 交易: '談生意', 立券: '簽約',
  沐浴: '淨身', 會親友: '見親友', 裁衣: '裁製衣物', 栽種: '種東西', 解除: '除穢消災',
  求嗣: '求子', 動土: '開工動土', 安葬: '下葬', 出火: '遷移神位', 開倉: '開倉出貨',
  伐木: '砍樹', 作樑: '上樑裝修', 行喪: '辦喪事', 破土: '破土', 針灸: '針灸',
  掘井: '挖井', 入殮: '入殮',
}
const toPlain = (list) => list.map(t => PLAIN[t]).filter(Boolean)

export const ANCHOR = new Date(2026, 5, 6) // 6/6

const mod = (n, m) => ((n % m) + m) % m
export function dateFromOffset(off) { const d = new Date(ANCHOR); d.setDate(d.getDate() + off); return d }
export function offsetFromDate(d) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((a - ANCHOR) / 86400000)
}
// 「今天」一律以**台北時間**的日曆日為準。
//
// ⚠️ 原本是 `offsetFromDate(new Date())`，也就是跟著執行環境的時區走。這在兩邊都錯：
//   · **伺服器**：Cloud Run 的預設時區是 **UTC**，比台北慢 8 小時。於是每天台灣時間
//     00:00–08:00 這八個小時，伺服器注入的首屏靜態層、sitemap 的 lastmod、RSS、
//     逐頁 og:image 取的節氣、以及 AI 的曆訊 context，**全部是前一天的**。
//     一個賣「今日宜忌」的網站，每天有三分之一的時間在講昨天。
//   · **瀏覽器**：跟著使用者所在時區。人在美國／歐洲的華人使用者會看到前一天
//     （或後一天）的宜忌——而農民曆的使用情境幾乎都是「台灣的今天」。
//
// 作法：用 Intl 取台北的日曆日（en-CA 直接給 YYYY-MM-DD），再以本地時間建構
// 一個「只當日曆日用」的 Date。這樣不論執行環境的 TZ 設成什麼都得到同一天。
// ⚠️ 不可用 `new Date(Date.now() + 8*3600e3)` 這種手動加時差的寫法——那在
//    本身就是 UTC+8 的環境會多加八小時。要交給 Intl 判斷。
const TZ = 'Asia/Taipei'
let _tzFmt = null
export function taipeiToday() {
  try {
    if (!_tzFmt) _tzFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    const [y, m, d] = _tzFmt.format(new Date()).split('-').map(Number)
    if (y && m && d) return new Date(y, m - 1, d)
  } catch { /* 極少數環境沒有完整 Intl 資料 → 退回本地時間 */ }
  return new Date()
}
// 可翻閱／可查詢的範圍：今日前後約三年。
// ⚠️ 這是**唯一真相**，UI 的箭頭停用、網址參數驗證、AI 的曆訊 context 都要用同一個常數。
//    先前 UI 寫死在 Feed.jsx、網址參數完全沒驗，於是日期選擇器明明寫著
//    「可查詢範圍 2023–2029」、2028 之後箭頭也 disabled，但直接改網址打
//    `?date=9999-12-31` 照樣算出一整頁煞有介事的宜忌神煞——同一個限制在
//    兩條路徑上不一致，而使用者（與 AI 爬蟲）沒辦法分辨哪些是真的。
export const BROWSE_RANGE_DAYS = 1095

// 真實「今日」相對錨點的偏移（讓 App 一開就停在當前日期，而非錨點 6/6）
export function todayOffset() { return offsetFromDate(taipeiToday()) }

/**
 * 解析網址／使用者輸入的日期字串，並夾在可查詢範圍內。
 * 回傳 { iso, off } 或 null（無效）。
 *
 * ⚠️ **一定要檢查 JS 的自動進位**。`new Date(2026, 1, 30)` 不會報錯，它會滾成 3/2；
 *    `new Date(2026, 98, 98)` 會滾到 2034 年。原本直接把字串丟進去，於是：
 *      ?date=2026-02-30 → 顯示 3/2      ?date=2026-99-99 → 顯示 2034/6/7
 *    而網址列還留著原本那個不存在的日期，使用者不會知道自己看的是別天。
 * ⚠️ **兩位數年份不可交給 Date 補**：`new Date(50, 5, 15)` 會被當成 1950 年。
 *    這裡要求四位數年份，`0001-01-01` 直接判為無效而不是變成 1901。
 * ⚠️ 月／日接受一到兩位（`2026-8-4` 是合理輸入，不該被當成無效）。
 */
export function parseDateParam(input) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(input ?? '').trim())
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  // 被自動進位就代表那一天不存在（2 月 30 日、13 月、第 32 日…）
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  const off = offsetFromDate(dt)
  if (Math.abs(off - todayOffset()) > BROWSE_RANGE_DAYS) return null
  const pad = (n) => String(n).padStart(2, '0')
  return { iso: `${y}-${pad(mo)}-${pad(d)}`, off }
}

function seasonOf(term) {
  if (['立春', '雨水', '驚蟄', '春分', '清明', '穀雨'].includes(term)) return '春'
  if (['立夏', '小滿', '芒種', '夏至', '小暑', '大暑'].includes(term)) return '夏'
  if (['立秋', '處暑', '白露', '秋分', '寒露', '霜降'].includes(term)) return '秋'
  return '冬'
}
const pick = (arr, start, n) => {
  const out = []
  for (let i = 0; out.length < n && i < arr.length; i++) {
    const v = arr[mod(start + i * 3, arr.length)]
    if (!out.includes(v)) out.push(v)
  }
  return out
}

export function dayFor(off) {
  const d = dateFromOffset(off)
  const Y = d.getFullYear(), M = d.getMonth() + 1, D = d.getDate()

  // ── 日柱：由儒略日直接推六十甲子（真實值，非錨點推演）──
  const gz60 = dayGanzhiIndex(Y, M, D)
  const gi = gz60 % 10, zi = gz60 % 12

  // ── 年柱：以「立春」為歲首（傳統擇日用），非國曆 1/1 ──
  // 立春前仍屬前一年的干支，這是原本「用 getFullYear() 直接推」會錯的地方。
  const lichun = termLocalDay(Y, 0)                       // 該西曆年的立春（當地日 JD）
  const ganzhiYear = jdFromDate(Y, M, D) < lichun ? Y - 1 : Y
  const yearGan = mod(ganzhiYear - 4, 10)
  const yearZhi = mod(ganzhiYear - 4, 12)

  // ── 節氣與農曆：天文演算（見 lunisolar.js）──
  const termInfo = termFromDate(Y, M, D)
  const term = termInfo.term
  const lun = lunarFromDate(Y, M, D)
  const lmon = lun?.month ?? 1, lday = lun?.day ?? 1

  // ±1 用精寫樣本提供較好的宜忌/諺語，其餘演算
  const sample = (off >= -1 && off <= 1) ? almanacDays[off + 1] : null
  // ⚠️ 這裡只產出「候選」宜忌，最終值要等下方神煞算完才定案（見 reconcile 區塊）。
  //    先前這兩行的結果就是最終顯示值，與建除、受死日完全無關，於是同一頁會出現
  //    「閉日：忌開市」與「今日宜：交易」並存——交易就是開市，行家一眼看穿。
  let yi = sample ? sample.yi : pick(YI_POOL, mod(off * 3, YI_POOL.length), 4)
  let ji = sample ? sample.ji : pick(JI_POOL, mod(off * 2 + 5, JI_POOL.length), 2).filter(x => !yi.includes(x))
  // ── 十二時辰吉凶：黃道黑道十二神 ──
  // ⚠️ 這裡曾用「日支三合(寅午戌)＋六合為吉、六沖為凶」的簡化法。那套民間確實存在，
  //    但與台灣市售通書幾乎相反——丙午日它判寅未戌為吉，通書那三個時辰分別是
  //    白虎、勾陳、天刑，全是凶時；它判子時為凶，通書卻是金匱吉時。
  //    更糟的是它與本站自己的「干支・三合六合」頁矛盾：午午是自刑，
  //    卻被算成吉時。使用者拿去跟市面上的國民曆一對照就會認定我們算錯。
  //
  //    改用通書的標準做法：黃道黑道十二神。起神位置依日支決定——
  //    子午日起申、丑未日起戌、寅申日起子、卯酉日起寅、辰戌日起辰、巳亥日起午，
  //    自該時辰起依序排：青龍→明堂→天刑→朱雀→金匱→天德→白虎→玉堂→天牢→玄武→司命→勾陳。
  //    黃道六神（青龍、明堂、金匱、天德、玉堂、司命）為吉，黑道六神為凶。
  //    驗證：丙午日吉時＝子丑卯午申酉（金匱・天德・玉堂・司命・青龍・明堂），與通書一致。
  const SHEN12 = ['青龍', '明堂', '天刑', '朱雀', '金匱', '天德', '白虎', '玉堂', '天牢', '玄武', '司命', '勾陳']
  const HUANGDAO = new Set(['青龍', '明堂', '金匱', '天德', '玉堂', '司命'])
  // 日支 → 青龍所在的時支（子午→申、丑未→戌、寅申→子、卯酉→寅、辰戌→辰、巳亥→午）
  const QINGLONG_START = [8, 10, 0, 2, 4, 6, 8, 10, 0, 2, 4, 6]
  const hours12 = Z.map((zn, t) => {
    const start = mod(t * 2 - 1, 24)
    const range = `${String(start).padStart(2, '0')}–${String((start + 2) % 24).padStart(2, '0')}`
    const shen = SHEN12[mod(t - QINGLONG_START[zi], 12)]
    return { zhi: zn, range, shen, luck: HUANGDAO.has(shen) ? '吉' : '凶' }
  })

  // ⚠️ 吉時「只有一個來源」：由 hours12 推導，不可再另外查表。
  //    先前 luckyHours 來自一張與日支無關的 HOURS 常數（按 off 輪替），
  //    而完整曆頁顯示的是 hours12——實測連續 60 天 **100% 互相矛盾**
  //    （例：AI 說吉時「寅時・申時」，曆頁把申時標成「平」）。
  //    使用者只要點開曆頁對照就會發現在說謊，這是自己打自己的臉。
  const luckyHours = hours12.filter(h => h.luck === '吉').map(h => h.zhi + '時').join('・') || '無特別吉時'
  // 諺語連同白話解釋一起回傳（樣本日只存諺語本身，回查 proverbs 取得 mean）
  const proverb = sample ? sample.proverb : proverbs[mod(off, proverbs.length)].tw
  const proverbMean = (proverbs.find(p => p.tw === proverb) || {}).mean || ''

  // ---- 傳統擇日項目 ----
  const jc = mod(zi - TERM_ZHI[term], 12)          // 建除十二神
  // 二十八星宿（連續值日，28 天一輪）
  // ⚠️ 起算基準（epoch）曾差整整 7 天——一個「七曜」週期。
  //    28 宿依序配 木金土日月火水，每 7 宿一循環，所以同一曜的宿一定落在同一個星期幾：
  //    亢金龍與牛金牛都固定在星期五。差 7 天時星期仍然對得上，**肉眼與星期檢查都抓不到**。
  //    校正錨點（外部兩來源一致）：2026-07-17（壬辰日）＝鬼宿（第 22 位）。
  //    由此推 2026-07-24＝亢、2026-07-31＝牛。改動此處務必重跑下方錨點檢查。
  const xiuIdx = mod(Math.floor(jdFromDate(Y, M, D) + 0.5) + 11, 28)
  // ⚠️ 日沖：天干進「四」位、地支進六位（丙+4=庚、午+6=子 → 丙午日沖庚子）。
  //    這裡原本天干也寫 +6，於是丙午日算出「壬子」——錯兩位。
  //    這個 bug 藏得很深：地支 ±6 在 mod 12 之下同值，所以「沖鼠」「沖虎」永遠對，
  //    連帶煞方與沖煞歲數（都只看地支）也全對，畫面上只有天干那兩個字是錯的。
  //    以六十甲子序數看，正解是 (n − 6 + 60) % 60 而不是 (n + 6) % 60。
  const chongZodiac = mod(zi + 6, 12)
  const chongGZ = G[mod(gi + 4, 10)] + Z[chongZodiac]
  // 煞方：依日支三合組固定對應（寅午戌煞北／申子辰煞南／巳酉丑煞東／亥卯未煞西），
  // 原本用 off % 4 輪替＝與日支無關的假值。
  const SHA_DIR = { 2: '北', 6: '北', 10: '北', 8: '南', 0: '南', 4: '南', 5: '東', 9: '東', 1: '東', 11: '西', 3: '西', 7: '西' }
  const dir = SHA_DIR[zi]
  // 沖煞歲數（虛歲，非實歲——出生即一歲）：所沖生肖近三個世代
  const curZodiac = mod(ganzhiYear - 4, 12)
  const baseAge = mod(curZodiac - chongZodiac, 12) + 1
  const chongAges = [baseAge, baseAge + 12, baseAge + 24]
  // 月柱（五虎遁：丙年正月起庚寅）
  const monthZhi = TERM_ZHI[term]
  const monthGan = mod(2 * yearGan + 2 + mod(monthZhi - 2, 12), 10)   // 五虎遁：年干推正月天干
  const monthGZ = G[monthGan] + Z[monthZhi]

  // 特殊日提示
  const flags = []
  if (G[gi] + Z[zi] === TIANSHE[seasonOf(term)]) flags.push({ t: '天赦日', d: '百無禁忌，最宜祈福、赦罪、解冤', good: true })
  if (SHOUSI[lmon] === zi) flags.push({ t: '受死日', d: '諸事凶，惟入殮、安葬、畋獵可用', good: false })
  const nd = dateFromOffset(off + 1)
  const nextInfo = termFromDate(nd.getFullYear(), nd.getMonth() + 1, nd.getDate())
  const nextTerm = nextInfo.startsToday ? nextInfo.term : null
  if (nextTerm && ['立春', '立夏', '立秋', '立冬'].includes(nextTerm)) flags.push({ t: '四絕日', d: `${nextTerm}前一日，大事勿用`, good: false })
  if (nextTerm && ['春分', '夏至', '秋分', '冬至'].includes(nextTerm)) flags.push({ t: '四離日', d: `${nextTerm}前一日，大事勿用`, good: false })
  if (YANGGONG[lmon] === lday) flags.push({ t: '楊公忌', d: '楊公十三忌之一，諸事不宜', good: false })
  if ([3, 7, 13, 18, 22, 27].includes(lday)) flags.push({ t: '三娘煞', d: '民俗忌嫁娶', good: false })
  if ([5, 14, 23].includes(lday)) flags.push({ t: '月忌日', d: '五黃入中宮，忌大事', good: false })

  // 節日／神明聖誕
  // 閏月不算節慶（閏六月十五不是中秋）
  const festival = (!lun?.leap && LUNAR_FEST[`${lmon}-${lday}`])
    || (termInfo.startsToday ? `${term}（交節）` : null)

  // ── 宜忌與神煞對帳（reconcile）──
  // 這一段存在的理由：宜忌候選、建除註解、特殊日三者原本各算各的，同一天可以
  // 一邊寫「閉日：忌開市」一邊把「交易」列進宜，一邊寫「受死日：諸事凶」一邊
  // 說宜會親友。使用者不需要懂擇日也看得出前後不一致，而懂的人會直接判定整站不可信。
  // 作法：神煞有否決權——建除的「忌」與大凶日可以把宜項刷掉，反之不行。
  //
  // ⚠️ 同義詞必須成組處理：「交易」「立券」「納財」在擇日裡都屬開市（財貨交易）一類，
  //    只比對「開市」兩個字會漏掉另外三個，那正是原本沒被發現的原因。
  const SYN = {
    開市: ['開市', '交易', '立券', '納財'],
    動土: ['動土', '破土', '掘井', '出火'],
    嫁娶: ['嫁娶', '求嗣'],
    安葬: ['安葬', '行喪'],
    出行: ['出行'],
    開倉: ['開倉'],
  }
  const jcKey = JIANCHU[jc]
  const jcDef = JIANCHU_YI[jcKey] || { yi: [], ji: [] }
  // 建除的「忌」展開成同義詞集合
  const jcBan = new Set()
  for (const w of jcDef.ji) {
    jcBan.add(w)
    for (const words of Object.values(SYN)) if (words.includes(w)) words.forEach(x => jcBan.add(x))
  }
  // 「諸事不宜」型的大凶日：受死日、楊公忌、破日、四絕/四離
  const bigBad = flags.filter(f => !f.good && ['受死日', '楊公忌', '四絕日', '四離日'].includes(f.t))
  const allBad = bigBad.length > 0 || jcDef.allBad

  // ⚠️ 神煞標籤必須真的參與宜忌合成，不能只是掛在上面的一張貼紙。
  //    實測 2026-07-31：頂部標籤寫「三娘煞　民俗忌嫁娶」，但下面的忌欄裡
  //    **沒有嫁娶**——細心的使用者看到這個就會開始懷疑整站的資料。
  //    凡是說明文字裡明講「忌 ◯◯」的神煞，那個項目就要進忌欄。
  const flagBan = new Set()
  for (const fl of flags) {
    if (fl.good) continue
    const m = /忌([一-龥、]+)/.exec(fl.d || '')
    if (!m) continue
    for (const w of m[1].split('、').map(x => x.trim()).filter(Boolean)) {
      flagBan.add(w)
      // 同義詞一併處理，理由與 SYN 那段相同
      for (const words of Object.values(SYN)) if (words.includes(w)) words.forEach(x => flagBan.add(x))
    }
  }

  if (allBad) {
    // ⚠️ 可用清單要從神煞「自己的說明文字」推導，不可另外寫死一份。
    //    先前寫死成 ['祭祀','安葬','入殮']，但受死日的說明是「惟入殮、安葬、畋獵可用」
    //    ——祭祀不在裡面，於是同一屏又出現「宜：祭祀」對上「諸事凶，惟入殮、安葬、
    //    畋獵可用」。只要清單和說明是兩份資料，它們遲早會分岔。
    const note = bigBad[0]?.d || ''
    // ⚠️ 建除的忌仍然有否決權。受死日說「安葬可用」而滿日說「忌安葬」時，
    //    兩個來源是真的衝突——此時取交集（都不反對才留），寧可顯示「諸事不宜」，
    //    也不要讓宜欄的「安葬」對上建除註解的「忌安葬」。
    const allow = ['入殮', '安葬', '畋獵', '祭祀', '破屋壞垣', '求醫']
      .filter(w => note.includes(w) && !jcBan.has(w))
    yi = yi.filter(t => allow.includes(t))
    // 大凶日仍可用的項目，即使原本不在候選裡也要補上（否則宜欄整個空掉）
    for (const w of allow) if (!yi.includes(w)) yi.push(w)
    if (!yi.length) yi = ['諸事不宜']
    // ⚠️ 大凶日的忌欄不要列一份「不完整的清單」——受死日的說明是
    //    「諸事凶，惟入殮、安葬、畋獵可用」，那是**除三項外全部都忌**的意思，
    //    列七項出來反而看起來像「只忌這七項」，與上方的標籤自相矛盾。
    //    直接講清楚範圍。
    const reason = bigBad[0]?.t || `${jcKey}日`
    ji = allow.length
      ? [`除${allow.join('、')}外，諸事不宜（${reason}）`]
      : [`諸事不宜（${reason}）`]
  } else {
    // ⚠️ 神煞有否決權，而且要在「宜」與「忌」兩邊同時生效——
    //    只加進忌欄的話，最後那條「已進宜欄的詞從忌欄剔除」會把它刷掉，
    //    結果又變回「標籤說忌嫁娶、忌欄沒有嫁娶」（實測 8/4 庚戌日就是這樣）。
    yi = yi.filter(t => !jcBan.has(t) && !flagBan.has(t))
    // ⚠️ 建除的「宜」也要回填。原本只做減法不做加法，於是閉日註解寫著
    //    「宜築堤、埋穴、造葬」，宜欄裡卻從來沒有造葬——使用者同屏看到兩段打架的字。
    // ⚠️ 回填也要檢查 flagBan。少了這個條件，滿日（宜嫁娶）碰上三娘煞時，
    //    嫁娶會在被 flagBan 濾掉之後又從建除那邊補回宜欄，
    //    最後再被「已進宜欄的詞從忌欄剔除」刷掉——繞一圈又回到
    //    「標籤說忌嫁娶、忌欄沒有嫁娶」（實測 2/5、2/23 就是這樣）。
    for (const w of jcDef.yi) if (!yi.includes(w) && !jcBan.has(w) && !flagBan.has(w)) yi.push(w)
    if (!yi.length) yi = ['平常日，無特別宜忌']
  }
  // 大凶日的忌欄已經是一句完整的範圍描述，不要再往後面接零散項目——
  // 接上去會讓「除三項外諸事不宜」看起來像「只忌後面這幾項」。
  if (!allBad) {
    // 建除與神煞明令禁止的項目，補進忌欄（使用者才知道為什麼那項不見了）
    for (const w of jcBan) if (!ji.includes(w) && !yi.includes(w)) ji.push(w)
    for (const w of flagBan) if (!ji.includes(w)) ji.push(w)
  }
  // ⚠️ 最後一定要把「已經進了宜欄」的詞從忌欄剔除。宜的候選來自隨機池、
  //    忌的候選也來自隨機池，而建除的宜與神煞的可用清單又會往宜欄補詞——
  //    三個來源交會時同一個詞可以同時出現在兩欄（實測 400 天有 21 筆，
  //    例如開日「宜動土」卻同時「忌動土」）。宜欄的補詞來自建除與神煞這兩個
  //    權威來源，衝突時以宜為準。
  ji = allBad ? ji : ji.filter(t => !yi.includes(t))
  if (!ji.length) ji = ['諸事不宜']

  // ── 吉日星等：由神煞推導，不可再用亂數 ──
  // 原本是 `1 + mod(off*3+2, 5)`，與當天任何一項神煞都無關，所以會出現
  // 受死日＋三娘煞＋閉日卻拿三顆星這種明顯對不上的情況。
  // 基準 3 星，吉神加分、凶神扣分，並以黃道吉時數量與星宿吉凶微調。
  let score = 3
  for (const f of flags) score += f.good ? 1 : -1
  if (allBad) score -= 1
  if (XIU_LUCK[xiuIdx] === '吉') score += 0.5; else score -= 0.5
  score += (hours12.filter(h => h.luck === '吉').length - 6) * 0.25   // 六吉六凶為常態，偏離才調整
  // ⚠️ 大凶日一律壓到 2 星以下。否則會出現「★★★」配「凶勝於吉」自相矛盾——
  //    星等是使用者唯一會掃到的視覺訊號，它必須和評等講同一件事。
  const starMax = allBad ? 2 : 5
  // ⚠️ 上限也要套用在精寫樣本上——樣本是人工寫的固定星等，若那天剛好是大凶日，
  //    不套上限就會漏出「★★★★★ 凶勝於吉」（實測 400 天中就有這麼一天）。
  const stars = Math.max(1, Math.min(starMax, sample?.stars ?? Math.round(score)))

  // ── 節氣區間與第幾天 ──
  // 「大暑」單獨出現會被讀成「今天就是大暑」，但節氣是一段約 15 天的區間，
  // 7/31 其實是大暑的第 9 天。標出區間與天數，語意才不會誤導。
  const todayJd = jdFromDate(Y, M, D)
  const termDay = termInfo.termJd ? Math.round(todayJd - termInfo.termJd) + 1 : null
  const fmtJd = (j) => { const t = dateFromJd(j + 0.5); return `${t.m}/${t.d}` }
  // 下一個節氣的前一天＝本節氣最後一天
  let nextTermJd = null
  for (let i = 1; i <= 20; i++) {
    const nn = dateFromOffset(off + i)
    if (termFromDate(nn.getFullYear(), nn.getMonth() + 1, nn.getDate()).startsToday) { nextTermJd = todayJd + i; break }
  }
  const termRange = termInfo.termJd && nextTermJd ? `${fmtJd(termInfo.termJd)}–${fmtJd(nextTermJd - 1)}` : null

  // ── 一句話白話總結 ──
  const yiPlain = toPlain(yi), jiPlain = toPlain(ji)
  // yi 可能是「諸事不宜」「平常日…」這類佔位字串（不在 PLAIN 表裡），
  // 直接串就會變成只講忌、不講宜的半句話，要另外處理。
  const summary = yi[0] === '諸事不宜'
    ? '今天諸事不宜，重要的事建議改天'
    : (yiPlain.length || jiPlain.length)
      ? [yiPlain.length ? `今天適合${yiPlain.join('、')}` : '', jiPlain.length ? `不適合${jiPlain.join('、')}` : '']
          .filter(Boolean).join('；')
      : null
  // 一句話評等，讓使用者不必自己解讀星等
  const rating = allBad ? '凶勝於吉' : stars >= 4 ? '吉勝於凶' : stars <= 2 ? '凶勝於吉' : '吉凶參半'

  return {
    off,
    solar: `${d.getMonth() + 1} / ${d.getDate()}`,
    weekday: WD[d.getDay()],
    term,
    ganzhi: G[gi] + Z[zi] + '日',
    yearGZ: G[yearGan] + Z[yearZhi], monthGZ,
    lunar: lun?.text || '',
    lunarMon: lmon, lunarDay: lday, lunarLeap: !!lun?.leap,
    zheng: `沖${ZODIAC[chongZodiac]}(${chongGZ})煞${dir}`,
    chong: { zodiac: ZODIAC[chongZodiac], gz: chongGZ, dir, ages: chongAges },
    wuxing: nayinOf(gi, zi),
    luckyHours, stars, rating, yi, ji, summary, termDay, termRange, proverb, proverbMean,
    // 傳統項目
    jianchu: JIANCHU[jc], jianchuYi: jianchuText(JIANCHU[jc]),
    xiu: XIU[xiuIdx], xiuAnimal: XIU_ANIMAL[xiuIdx], xiuLuck: XIU_LUCK[xiuIdx],
    pengzu: [PENGZU_GAN[gi], PENGZU_ZHI[zi]],
    taishen: TAISHEN[gz60],
    xishen: XISHEN[G[gi]], caishen: CAISHEN[G[gi]], guiren: GUIREN[G[gi]],
    yanggui: ZHI_DIR[GUI_YANG[G[gi]]], yingui: ZHI_DIR[GUI_YIN[G[gi]]],
    hours12, flags, festival,
  }
}

// 月曆格子（含每格對應 offset），供跳日期選擇器使用
// 某個節氣涵蓋哪些國曆月份（回傳如 [7, 8]）。
// ⚠️ 節氣是一段約 15 天的區間，常常橫跨兩個月——大暑是 7/23–8/6。
//    當令食材原本只取節氣「開始那個月」，於是 8 月才進入盛產的文旦柚、金針、
//    柿子全被漏掉，而金針正好是大暑到立秋最有畫面、最適合節氣攝影的品項。
//    要取「聯集」而不是「起始月」。
export function monthsForTerm(termName, year = new Date().getFullYear()) {
  const table = termTable(year)
  const i = table.findIndex(t => t.name === termName)
  if (i < 0) return []
  const start = table[i]
  // 下一個節氣：可能落在隔年（大寒之後是次年立春）
  const next = table[i + 1] || termTable(year + 1)[0]
  const endJd = next.jd - 1
  const months = new Set([start.m])
  for (let jd = start.jd; jd <= endJd; jd++) months.add(dateFromJd(jd + 0.5).m)
  return [...months]
}

export function monthCells(year, month) {
  const startWd = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWd; i++) cells.push(null)
  for (let day = 1; day <= days; day++) cells.push({ day, off: offsetFromDate(new Date(year, month, day)) })
  return cells
}

// ---- 年度總論（丙午年 2026，示範） ----
// 地母經的卜曰首句必定點出該年生肖。這條規則存在的理由見 dimu 欄位的註解——
// 放錯年份的條目是這類資料最常見的錯誤，而且肉眼很難發現（除非剛好認得那個生肖字）。
export function dimuOk(ganzhi, div) {
  const Zc = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龍', 巳: '蛇',
    午: '馬', 未: '羊', 申: '猴', 酉: '雞', 戌: '狗', 亥: '豬' }
  const zodiac = Zc[ganzhi[1]]
  return !!zodiac && String(div).includes(zodiac)
}

export const yearOverview = {
  year: '西元 2026 年・民國 115 年',
  ganzhi: '丙午年', zodiac: '馬', nayin: '天河水',
  taisui: { name: '文哲大將軍', note: '六十甲子太歲之丙午年值年太歲，可安太歲祈平安' },
  // 春牛圖／芒神 —— 每一項都有明確的推法，不可憑印象寫。
  // 2026 丙午年，立春 2/4（己酉日，納音「大驛土」），農曆正月初一 2/17。
  //   牛頭＝年干色（丙丁火→紅）        牛身＝年支色（巳午火→紅）
  //   牛尾／耳角＝立春日干色（己土→黃） 牛蹄＝立春日納音色（大驛土→黃）
  //   牛腹＝年納音色（天河水→黑）       牛脛＝立春日支色（酉金→白）
  //   芒神身高＝三尺六寸五分（象徵一年 365 日，此為定數，不可寫成三尺六寸）
  //   芒神面貌＝子午卯酉年少壯像（辰戌丑未年才是童子像）
  //   芒神衣帶＝申酉日紅衣黑腰帶
  //   芒神站位＝立春距正月初一「前五日外」者立於牛前（2/4 早於 2/17 共 13 天）
  //   陽年芒神立於牛左（丙為陽干）
  // ⚠️ 舊值幾乎每項都錯，且「行於牛後」與註解「農事宜早」自相矛盾
  //    （芒神在牛後代表晚春、農事宜遲）。芒神在牛前才對應「農事宜早」。
  // ⚠️ 芒神的站位規則不是看「立春距正月初一幾天」，而是看**立春落在哪個望之間**
  //    （《協紀辨方書》）：
  //      立春在十二月望（十五）**之前** → 芒神在牛**前**（農事早）
  //      立春在正月望**之後**           → 芒神在牛**後**（農事晚）
  //      立春落在十二月望後～正月望前   → 芒神**與牛並行**
  //    2026 立春是 2/4＝農曆十二月十七（十二月望後兩天），所以是「與牛並行」，
  //    不是先前寫的「立於牛前」。左右側才是看陰陽年（丙為陽干 → 左側）。
  chunniu: '春牛頭紅、身紅、腹黑、蹄黃、尾黃、脛白；芒神身高三尺六寸五分，面如少壯、赤衣黑腰帶，與牛並行、立於牛左——立春在十二月望後、正月望前，故農事不早不遲。',
  // 《黃帝地母經》丙午年（對應 1966 / 2026）。
  // ⚠️ 這裡原本放的是**別的年份**的條目：卜曰開頭寫「鼠耗一空虛」——
  //    「鼠耗」是子年（鼠年）的卜辭，放在午年（馬年）的頁面上自相矛盾，
  //    是讀者一眼就會抓到的錯誤。地母經的卜曰首句一定會點出該年的生肖，
  //    所以下面加了 dimuOk() 這條校驗規則。
  dimu: {
    poem: '詩曰：太歲丙午年，春夏多洪水。魯魏多疫災，穀熟益江東。種植宜高地，低源遭水沖。天蟲見少絲，桑柘賤成籠。六畜多瘟疫，人民少卒終。',
    div: '卜曰：馬首值歲裡，豐稔好田桑。春夏須防備，種植怕流蕩。豆麥並麻粟，偏好宜高岡。',
  },
  // 犯太歲對應（丙午年＝午）。每一項都要在十二支關係中找得到依據：
  //   值太歲 午（本命，且午午自刑）／沖太歲 子（子午六沖）
  //   害太歲 丑（丑午六害）／破太歲 卯（卯午六破）
  // ⚠️ 這裡曾把「雞（酉）」列為刑太歲，是錯的——**午與酉在十二支中沒有任何刑的關係**。
  //    三刑只有：子卯（無禮）、寅巳申（無恩）、丑戌未（恃勢）、辰午酉亥（各自自刑）。
  //    午年的刑就是「午午自刑」，也就是屬馬本人；酉的自刑對象是酉，與午無關。
  //    而且本站自己的「干支・三合六合」頁就寫著「辰午酉亥（自刑）」，
  //    同一頁「馬・值太歲」也已寫明午年自刑——三處自相矛盾，行家一眼就會抓到。
  fanTaisui: [
    { z: '馬', k: '值太歲', d: '本命年（午年自刑），起伏較大，宜安太歲、行善積福' },
    { z: '鼠', k: '沖太歲', d: '正沖（午子相沖），變動最大，凡事忍讓、注意交通' },
    { z: '牛', k: '害太歲', d: '丑午相害，易犯小人、口舌，慎防人際是非' },
    { z: '兔', k: '破太歲', d: '卯午相破，易破財、計畫生變，理財保守' },
  ],
  fangwei: [
    { k: '太歲方', v: '南方（午）', d: '本年太歲所在，不宜動土、修造' },
    { k: '歲破方', v: '北方（子）', d: '太歲對沖方，最忌動土、嫁娶' },
    { k: '三煞方', v: '北方（亥子丑）', d: '寅午戌年三煞在北，忌動土、安床、開挖' },
    { k: '大將軍方', v: '東方（卯）', d: '巳午未年大將軍居東，忌興工動土' },
    // ⚠️ 年五黃是全年最該避開的動土方位，只寫「逐月飛移」等於把最關鍵的一項留白。
    //    2026 丙午年一白入中，五黃廉貞飛臨離宮＝正南，與太歲方同一邊。
    { k: '五黃方', v: '南方（離宮）', d: '丙午年一白入中，五黃廉貞飛臨離宮；與太歲方同邊，全年最忌動土、修造' },
  ],
  // ⚠️ 這行原本寫「以上為示範，正式版依…為準」——但這一頁的值現在都是查證過的真資料
  //    （太歲方南、歲破北、三煞北、大將軍東、年五黃離宮，逐項核對通過）。
  //    網站已經上線，還掛著「示範」等於叫使用者不要相信自己看到的東西，
  //    而且他也無從分辨哪些欄位才是真的。留下「逐年變動」的提醒即可。
  note: '年神方位逐年變動，本頁為丙午年（2026）的值，切勿沿用到其他年份。宜忌神煞屬傳統民俗，各流派或有差異。',
}
