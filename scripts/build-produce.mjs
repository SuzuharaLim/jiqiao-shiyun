// 由農業部「每月盛產農產品產地」開放資料產生 src/data/produce.js
//
// 為什麼要有這支腳本，而不是人工維護一張表：
//   原本每個節氣只人工列了 3–7 項當令農產，而官方 7 月盛產有 41 項、10 月 39 項，
//   覆蓋率只有一到兩成——台灣人一講到大暑就想到的芒果、鳳梨、荔枝、龍眼、綠竹筍
//   全部漏掉。既然官方已經把這件事做成開放資料（政府資料開放授權條款第 1 版，
//   標示來源即可自由使用），就沒有理由自己維護一張永遠追不上的表。
//
// 用法：node scripts/build-produce.mjs
//   會抓最新資料重新產生 src/data/produce.js。改完記得 npm run build。
//   （產出檔已進版控，所以一般開發／部署不需要連外網。）
//
// 資料來源：https://data.gov.tw/dataset/8120
import { writeFileSync } from 'node:fs'

const SRC_URL = 'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=061&IsTransData=1'

// ⚠️ 官方資料裡有尚未更新的舊制行政區名，直接顯示會是錯的。
//    桃園 2014 升格直轄市、彰化員林 2015 升格為市。
const COUNTY_FIX = { 桃園縣: '桃園市', 台北縣: '新北市', 臺北縣: '新北市' }
const TOWN_FIX = {
  '桃園市/復興鄉': '復興區', '桃園市/大溪鎮': '大溪區', '桃園市/龍潭鄉': '龍潭區',
  '桃園市/楊梅鎮': '楊梅區', '桃園市/平鎮市': '平鎮區', '桃園市/八德市': '八德區',
  '桃園市/蘆竹鄉': '蘆竹區', '桃園市/大園鄉': '大園區', '桃園市/觀音鄉': '觀音區',
  '桃園市/新屋鄉': '新屋區', '桃園市/龜山鄉': '龜山區', '桃園市/中壢市': '中壢區',
  '桃園市/桃園市': '桃園區', '彰化縣/員林鎮': '員林市',
}
const norm = (s) => (s || '').replace(/[\s　]+/g, '').replace(/^臺/, '台')

const data = await fetch(SRC_URL).then(r => r.json())

// crop → { type, variety, origins: Map<縣市, Set<鄉鎮>> }，逐月分組
const byMonth = {}
for (const row of data) {
  const m = String(Number(row.month))
  if (!m || m === 'NaN') continue
  const crop = norm(row.crop)
  if (!crop) continue
  const bucket = (byMonth[m] ||= new Map())
  const rec = bucket.get(crop) || { crop, type: row.type, variety: new Set(), origins: new Map() }
  if (norm(row.variety)) rec.variety.add(norm(row.variety))

  let county = norm(row.county)
  county = COUNTY_FIX[county] || county
  if (county) {
    // ⚠️ 有些列的 town 是一個全形空白（例如綠竹筍的「高雄市　」），
    //    直接串接會produce「高雄市 」這種帶尾巴的產地。norm() 已清掉，
    //    這裡再判空——空的就只記縣市，不要記一個空字串進去。
    let town = norm(row.town)
    town = TOWN_FIX[`${county}/${town}`] || town
    const set = rec.origins.get(county) || new Set()
    if (town) set.add(town)
    rec.origins.set(county, set)
  }
  bucket.set(crop, rec)
}

const TYPE_ORDER = ['水果', '蔬菜', '雜糧特作', '花卉']
const out = {}
for (const [m, bucket] of Object.entries(byMonth)) {
  out[m] = [...bucket.values()]
    .sort((a, b) => (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) || a.crop.localeCompare(b.crop, 'zh-Hant'))
    .map(r => ({
      name: r.crop,
      type: r.type,
      variety: [...r.variety].join('、') || undefined,
      // 產地：縣市＋鄉鎮；該縣市沒有鄉鎮資料時只寫縣市（不要留下懸空的頓號）
      origin: [...r.origins.entries()]
        .map(([c, towns]) => (towns.size ? `${c}${[...towns].join('、')}` : `${c}（多區）`))
        .join('，'),
    }))
}

const total = Object.values(out).reduce((n, a) => n + a.length, 0)
const header = `// ⚠️ 這個檔案由 scripts/build-produce.mjs 自動產生，不要手改——下次重跑就會被覆蓋。
// 資料來源：農業部（農糧署）「每月盛產農產品產地」開放資料
//   https://data.gov.tw/dataset/8120（政府資料開放授權條款第 1 版）
// 產生時共 ${data.length} 筆原始資料、${total} 筆逐月品項。
// 結構：{ "月份": [{ name, type, variety?, origin }] }
export const PRODUCE_BY_MONTH = `

writeFileSync(new URL('../src/data/produce.js', import.meta.url),
  header + JSON.stringify(out, null, 0) + '\n', 'utf8')
console.log(`produce.js 已產生：${Object.keys(out).length} 個月份、${total} 筆品項`)
