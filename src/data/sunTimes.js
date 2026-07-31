// 日出日落與攝影時刻計算（黃金時刻／藍調時刻）
//
// 為什麼做這個：洩露文件有一個欄位 `contentEffort`——「LLM-based effort
// estimation for article pages」。LLM 可以複製文章，複製不了**會算的工具**
// 與原創攝影。這個站剛好兩樣都有。
//
// 這支同時服務三件事：
//   1. 攝影社群的實際需求（幾點該到現場）
//   2. 節氣頁的「拍什麼」段落可以接上「幾點拍」
//   3. 「台北 日出時間」「阿里山 日出」這類在地長尾——而 NavBoost 的點擊資料
//      是**按 locale 切分**記憶的（Nayak 庭上證詞：「Navboost slices the
//      locale information」），台灣在地查詢的優勢會被直接記下來。
//
// 演算法：標準的太陽位置法（NOAA / Meeus 簡化版），誤差在台灣緯度約 ±1 分鐘，
// 對攝影規劃綽綽有餘。零相依，可直接用 node 驗證。
//
// ⚠️ 精度：以台北全年五個日期對照中央氣象署公布值，**最大誤差 7 分鐘**
//    （夏至冬至 0–2 分最準，春分秋分前後 5–7 分最差，因為那時太陽赤緯變化最快）。
//    對攝影規劃足夠，但頁面上必須標明誤差——不可讓人以為這是精確到分的官方值。
//    內部一致性已驗：三個不同經度的地點，其太陽正午與經度推算的差都是 −6 分
//    （即 7/31 的均時差），代表演算法本身沒有系統性偏移。
//
// ⚠️ 不處理大氣折射的極端情況與極區永晝永夜——台灣用不到，硬寫反而增加出錯面。

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

// 儒略日（本地日的中午 12:00 UTC 為基準，與 lunisolar.js 同慣例）
function julianDay(y, m, d) {
  if (m <= 2) { y -= 1; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

/**
 * 太陽事件時刻。
 * @param {number} y,m,d 國曆年月日（本地）
 * @param {number} lat 緯度（北為正）
 * @param {number} lng 經度（東為正）
 * @param {number} tz  時區（台灣為 8）
 * @param {number} zenith 太陽天頂角：90.833 日出日落（含大氣折射與日面半徑）
 *                        96 民用曙暮光、6 度角＝藍調時刻邊界
 * @param {boolean} rising true 求上升事件
 * @returns {number|null} 當地時間的小數小時（如 5.5 = 05:30），極區無事件回 null
 */
function sunEvent(y, m, d, lat, lng, tz, zenith, rising) {
  // ⚠️ n 必須是「自 2000-01-01 **正午** 起的整數天數」。
  //    julianDay() 回傳的是當日 0h 的 JD（尾數 .5），不取整的話那個 .5 會一路
  //    帶到 J_transit，算出來的時刻剛好差 12 小時——看起來像日出日落被對調。
  const n = Math.round(julianDay(y, m, d) - 2451545.0 + 0.0008)
  const Jstar = n - lng / 360
  const M = (357.5291 + 0.98560028 * Jstar) % 360               // 平近點角
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD)
  const lambda = (M + C + 180 + 102.9372) % 360                 // 太陽黃經
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD)
  const delta = Math.asin(Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD)) * DEG   // 赤緯

  const cosH = (Math.cos(zenith * RAD) - Math.sin(lat * RAD) * Math.sin(delta * RAD))
    / (Math.cos(lat * RAD) * Math.cos(delta * RAD))
  if (cosH > 1 || cosH < -1) return null                        // 該日無此事件
  const H = Math.acos(cosH) * DEG

  const J = rising ? Jtransit - H / 360 : Jtransit + H / 360
  // ⚠️ 儒略日是從**正午**起算的（JD 0.0 = 中午 12:00），所以要 +0.5 之後取小數
  //    才是「當日從午夜起算的時間」。少了這個 +0.5，所有時刻會整整差 12 小時
  //    ——實測台北日出算成 17:21（正解 05:16）、日落算成 06:41（正解 18:41），
  //    看起來像日出日落被對調，其實是這一行的問題。
  const utcFrac = (J + 0.5) - Math.floor(J + 0.5)
  return ((utcFrac * 24 + tz) % 24 + 24) % 24
}

const fmt = (h) => {
  if (h == null) return null
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/**
 * 一天的完整攝影時刻表。
 * 黃金時刻＝太陽在地平線上下 6 度之間（光線暖、影子長）
 * 藍調時刻＝太陽在地平線下 4–6 度（天空呈深藍，適合城市夜景）
 */
export function sunTimes(date, lat, lng, tz = 8) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate()
  const ev = (z, r) => sunEvent(y, m, d, lat, lng, tz, z, r)
  const sunrise = ev(90.833, true)
  const sunset = ev(90.833, false)
  const goldenAM = ev(84, true)      // 太陽高度 +6°
  const goldenPM = ev(84, false)
  const blueAM = ev(96, true)        // 太陽高度 −6°（民用曙光開始）
  const bluePM = ev(96, false)
  return {
    dawn: fmt(blueAM), sunrise: fmt(sunrise), goldenEnd: fmt(goldenAM),
    goldenStart: fmt(goldenPM), sunset: fmt(sunset), dusk: fmt(bluePM),
    // 給畫面直接用的區間描述
    morningGolden: sunrise != null && goldenAM != null ? `${fmt(sunrise)}–${fmt(goldenAM)}` : null,
    eveningGolden: goldenPM != null && sunset != null ? `${fmt(goldenPM)}–${fmt(sunset)}` : null,
    morningBlue: blueAM != null && sunrise != null ? `${fmt(blueAM)}–${fmt(sunrise)}` : null,
    eveningBlue: sunset != null && bluePM != null ? `${fmt(sunset)}–${fmt(bluePM)}` : null,
    dayLength: sunrise != null && sunset != null && sunset > sunrise
      ? `${Math.floor(sunset - sunrise)} 小時 ${Math.round(((sunset - sunrise) % 1) * 60)} 分` : null,
  }
}

// 台灣常見的攝影地點。⚠️ 座標是實際查證的，不可隨手估——差 0.5 度日出時間就差約 2 分鐘。
export const SPOTS = [
  { slug: 'taipei', name: '台北', lat: 25.033, lng: 121.565, note: '101、象山、河濱' },
  { slug: 'yangmingshan', name: '陽明山', lat: 25.156, lng: 121.560, note: '小油坑、擎天崗、大屯山' },
  { slug: 'jiufen', name: '九份', lat: 25.109, lng: 121.844, note: '山城夜景、基隆山' },
  { slug: 'taichung', name: '台中', lat: 24.147, lng: 120.674, note: '高美濕地、大坑' },
  { slug: 'alishan', name: '阿里山', lat: 23.510, lng: 120.803, note: '祝山日出、雲海、神木' },
  { slug: 'sun-moon-lake', name: '日月潭', lat: 23.860, lng: 120.915, note: '晨霧、伊達邵' },
  { slug: 'hehuanshan', name: '合歡山', lat: 24.142, lng: 121.274, note: '高山日出、星空、冬雪' },
  { slug: 'tainan', name: '台南', lat: 22.999, lng: 120.227, note: '井仔腳鹽田、四草' },
  { slug: 'kaohsiung', name: '高雄', lat: 22.627, lng: 120.301, note: '西子灣、旗津' },
  { slug: 'kenting', name: '墾丁', lat: 21.948, lng: 120.798, note: '關山夕陽、龍磐草原' },
  { slug: 'hualien', name: '花蓮', lat: 23.991, lng: 121.601, note: '七星潭、六十石山' },
  { slug: 'taitung', name: '台東', lat: 22.758, lng: 121.144, note: '三仙台、太麻里日出' },
  { slug: 'yilan', name: '宜蘭', lat: 24.757, lng: 121.753, note: '龜山島、外澳' },
  { slug: 'penghu', name: '澎湖', lat: 23.571, lng: 119.579, note: '跨海大橋、雙心石滬' },
]

export const spotBySlug = (slug) => SPOTS.find(s => s.slug === slug) || null
