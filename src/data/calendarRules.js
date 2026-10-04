// ============================================================================
// 桌曆設計器的規則與資料形狀（2026-10-04）——前後端共用
//
// ⚠️ 放 src/data/：Dockerfile 只把 src/data 帶進正式容器，伺服器 import 得到。
//   限制寫兩份的話遲早不一致（前端說能存 4 份、後端擋在 3 份，使用者只看到「發生錯誤」）。
// ⚠️ normalizeDesign 是**伺服器存檔前的唯一入口**：設計 JSON 是使用者可控的輸入，
//   不可整包信任後寫進資料庫、再原樣吐給分享頁的訪客。
// ============================================================================

export const CAL_LIMITS = {
  DRAFTS_PER_USER: 3,          // 每人同時最多 3 份「草稿」（已送出洽詢的不算）
  INQUIRIES_PER_DAY: 3,        // 每人每天最多送出 3 筆洽詢
  SOURCE_MAX_BYTES: 15 * 1024 * 1024,   // 使用者選的原始照片上限（轉檔前）
  PRINT_LONG_EDGE: 3200,       // 印刷用版本的長邊（約 A5 滿版 300dpi 還有餘裕）
  PRINT_MAX_BYTES: 6 * 1024 * 1024,     // 轉檔後的印刷檔上限（伺服器端再擋一次）
  PREVIEW_LONG_EDGE: 1400,     // 設計與 3D 預覽用的小圖
  LOWRES_LONG_EDGE: 2000,      // 長邊低於這個值就警告「印出來可能模糊」
  DRAFT_KEEP_DAYS: 90,         // 草稿多久沒動就刪（刪前 7 天寄信提醒）
  DRAFT_REMIND_DAYS: 83,
  LOST_KEEP_DAYS: 60,          // 未成交的洽詢，原圖保留天數
  REPLY_WORKDAYS: 3,           // 承諾幾個工作天內聯絡（畫面與確認信共用）
}

// 頁面週期
export const CADENCES = {
  month:   { label: '一頁一個月',   pages: 12, hint: '最熟悉的月曆格式' },
  term:    { label: '一頁一個節氣', pages: 24, hint: '每頁約兩週，跟著節氣過日子' },
  week:    { label: '一頁一週',     pages: 52, hint: '寫得下每天的安排' },
  quarter: { label: '一頁一季',     pages: 4,  hint: '一季三個月一次看完' },
}

// 底座與點綴色（桌曆的「殼」）
export const BASE_COLORS = [
  { id: 'sage',     name: '鼠尾草綠', hex: '#6E7F5C' },
  { id: 'espresso', name: '濃縮咖啡', hex: '#3A2C21' },
  { id: 'slate',    name: '灰藍',     hex: '#4E6E80' },
  { id: 'terra',    name: '陶土',     hex: '#A8553F' },
  { id: 'honey',    name: '蜂蜜',     hex: '#B98A2E' },
  { id: 'cream',    name: '奶油',     hex: '#E5DCCB' },
  { id: 'ink',      name: '墨黑',     hex: '#22201E' },
]
export const PAPER_COLORS = [
  { id: 'cream', name: '米白', hex: '#FBF7EE' },
  { id: 'white', name: '純白', hex: '#FFFFFF' },
  { id: 'mist',  name: '霧灰', hex: '#F1F0EC' },
]
export const FONTS = [
  { id: 'serif', name: '明體（典雅）' },
  { id: 'sans',  name: '黑體（俐落）' },
]

const YEAR_MIN = 2025, YEAR_MAX = 2035
const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
const pick = (v, list, d) => (list.some(x => x.id === v) ? v : d)
const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
const strML = (v, max) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').slice(0, max)

export function defaultDesign(now = new Date()) {
  const y = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear()   // 10 月以後預設做明年的
  return {
    v: 1,
    title: `${y} 我的桌曆`,
    cadence: 'month',
    start: { year: y, month: 1, termIndex: 0, date: `${y}-01-04` },
    style: {
      base: 'sage', paper: 'cream', font: 'serif', weekStart: 0,
      marks: { lunar: true, term: true, fest: true, yiji: false },
    },
    pages: {},
  }
}

/** 把任意輸入整理成合法的設計。未知欄位一律丟掉。 */
export function normalizeDesign(raw) {
  const d = defaultDesign()
  const r = raw && typeof raw === 'object' ? raw : {}
  const cadence = CADENCES[r.cadence] ? r.cadence : d.cadence
  const s = r.start || {}
  const year = clampInt(s.year, YEAR_MIN, YEAR_MAX, d.start.year)
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s.date || ''))
  const date = iso && +iso[1] >= YEAR_MIN && +iso[1] <= YEAR_MAX ? `${iso[1]}-${iso[2]}-${iso[3]}` : `${year}-01-04`
  const st = r.style || {}
  const mk = st.marks || {}
  // 超出目前週期頁數的內容先保留（使用者可能只是暫時切換週期），上限 52 頁
  const pages = {}
  for (const [k, p] of Object.entries(r.pages || {})) {
    const i = Number(k)
    if (!Number.isInteger(i) || i < 0 || i >= 52 || !p || typeof p !== 'object') continue
    const out = {}
    const t = str(p.title, 30); if (t) out.title = t
    const x = strML(p.text, 140); if (x.trim()) out.text = x
    const img = p.img
    if (img && typeof img === 'object' && /^[a-f0-9-]{8,60}$/i.test(String(img.id || ''))) {
      out.img = {
        id: String(img.id),
        w: clampInt(img.w, 0, 20000, 0), h: clampInt(img.h, 0, 20000, 0),
        src: img.src === 'site' ? 'site' : 'upload',     // site＝從自己的作品選（只有站上的壓縮版）
      }
      // 使用者調整過的縮放與位置（見 calRender.js 的 cropRect）。沒調過就不存，維持置中填滿。
      const c = img.crop
      if (c && typeof c === 'object') {
        const z = Math.min(4, Math.max(1, Number(c.z) || 1))
        const cx = Math.min(1, Math.max(-1, Number(c.x) || 0))
        const cy = Math.min(1, Math.max(-1, Number(c.y) || 0))
        if (z !== 1 || cx !== 0 || cy !== 0) out.img.crop = { z: +z.toFixed(3), x: +cx.toFixed(3), y: +cy.toFixed(3) }
      }
    }
    if (Object.keys(out).length) pages[i] = out
  }
  return {
    v: 1,
    title: str(r.title, 40) || d.title,
    cadence,
    start: {
      year,
      month: clampInt(s.month, 1, 12, 1),
      termIndex: clampInt(s.termIndex, 0, 23, 0),
      date,
    },
    style: {
      base: pick(st.base, BASE_COLORS, d.style.base),
      paper: pick(st.paper, PAPER_COLORS, d.style.paper),
      font: pick(st.font, FONTS, d.style.font),
      weekStart: st.weekStart === 1 ? 1 : 0,
      marks: { lunar: mk.lunar !== false, term: mk.term !== false, fest: mk.fest !== false, yiji: mk.yiji === true },
    },
    pages,
  }
}

/** 這份設計用到的預覽圖 id（清理孤兒圖、後台列出原圖時用）。 */
export const designImageIds = (d) =>
  Object.values(d?.pages || {}).map(p => p?.img?.id).filter(Boolean)

/** 送出前的檢查：低解析頁、是否含民俗內容。 */
export function designFlags(d) {
  const n = CADENCES[d.cadence]?.pages || 12
  const lowres = []
  for (let i = 0; i < n; i++) {
    const img = d.pages?.[i]?.img
    if (img && Math.max(img.w || 0, img.h || 0) < CAL_LIMITS.LOWRES_LONG_EDGE) lowres.push(i)
  }
  return { lowres, folk: !!d.style?.marks?.yiji }
}
