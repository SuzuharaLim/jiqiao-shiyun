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
// ⚠️ 只列「每台裝置都有對應字體」的三種：網頁字型下載會拖慢、也違反站上零外部資源的原則；
//   而系統字在不同裝置上長得略有不同 ⇒ 畫面與後台都註明「字體以打樣為準」。
export const FONTS = [
  { id: 'serif', name: '明體', hint: '典雅' },
  { id: 'sans',  name: '黑體', hint: '俐落' },
  { id: 'kai',   name: '楷體', hint: '手寫感' },
]

// ── 配色 ──────────────────────────────────────────────────────
// 六個顏色欄位。先選「配色組合」一次換整本，再到細項微調任一格。
// ★ 組合都是先調好對比的：選哪一組都不會做出看不清楚的日曆。
export const COLOR_SLOTS = [
  { key: 'base',    name: '底座' },
  { key: 'paper',   name: '紙張' },
  { key: 'accent',  name: '標題與節氣' },
  { key: 'ink',     name: '日期數字' },
  { key: 'weekend', name: '週末' },
  { key: 'grid',    name: '格線' },
]
export const PALETTES = [
  { id: 'sage',  name: '鼠尾草', colors: { base: '#6E7F5C', paper: '#FBF7EE', accent: '#5B6B49', ink: '#2B2118', weekend: '#A8553F', grid: '#D9D3C4' } },
  { id: 'ink',   name: '墨韻',   colors: { base: '#22201E', paper: '#F7F5F0', accent: '#22201E', ink: '#22201E', weekend: '#9A3B2E', grid: '#D6D2CA' } },
  { id: 'sea',   name: '海霧',   colors: { base: '#4E6E80', paper: '#F4F6F6', accent: '#34617A', ink: '#1F2E36', weekend: '#B0563E', grid: '#CFD8DC' } },
  { id: 'terra', name: '陶土',   colors: { base: '#A8553F', paper: '#FBF4EC', accent: '#8E4430', ink: '#3A2418', weekend: '#8E4430', grid: '#E2D2C2' } },
  { id: 'honey', name: '蜂蜜',   colors: { base: '#B98A2E', paper: '#FFFBF0', accent: '#8A6414', ink: '#33270F', weekend: '#B0563E', grid: '#E8DCBC' } },
  { id: 'sakura',name: '櫻粉',   colors: { base: '#C98A92', paper: '#FFF8F7', accent: '#A4535F', ink: '#3A2427', weekend: '#A4535F', grid: '#EBD5D5' } },
  { id: 'night', name: '夜幕',   colors: { base: '#2E3440', paper: '#FAFAF7', accent: '#3B4A6B', ink: '#1E2430', weekend: '#B04A4A', grid: '#D5D8DE' } },
]
const HEX = /^#[0-9a-f]{6}$/i

/** 這份設計最後實際用的六個顏色（組合 ＋ 個別覆寫）。渲染端只吃這一份。 */
export function resolveColors(design) {
  const st = design?.style || {}
  const pal = PALETTES.find(p => p.id === st.palette)
  const base = pal ? pal.colors : {
    // 沒選組合（舊設計）：沿用舊的底座／紙張欄位推出一組
    ...PALETTES[0].colors,
    base: (BASE_COLORS.find(c => c.id === st.base) || BASE_COLORS[0]).hex,
    paper: (PAPER_COLORS.find(c => c.id === st.paper) || PAPER_COLORS[0]).hex,
  }
  const out = { ...base }
  for (const { key } of COLOR_SLOTS) if (HEX.test(st.colors?.[key] || '')) out[key] = st.colors[key]
  return out
}

/** WCAG 對比值。用來在「日期數字 vs 紙張」太接近時提醒（印出來看不清楚）。 */
export function contrast(a, b) {
  const L = (hex) => {
    const n = parseInt(String(hex).slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
  }
  const x = L(a), y = L(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// ── 自由文字 ──────────────────────────────────────────────────
// 每頁可以放幾個文字框；「每一頁都放」的放在 design.texts（例如家族名、公司名）。
// x、y＝文字框**中心**在頁面上的位置（0–1，相對頁寬／頁高）；size＝字高佔頁寬的百分比。
// ⚠️ MAX_CHARS 不可小於舊版「一句話」的 140：舊設計會被轉成文字框，上限較小的話超出的字會被默默切掉。
export const TEXT_LIMITS = { PER_PAGE: 8, GLOBAL: 4, MAX_CHARS: 140, SIZE_MIN: 1.4, SIZE_MAX: 16 }
const TEXT_BG = ['none', 'paper', 'ink', 'accent']
function normText(t) {
  if (!t || typeof t !== 'object') return null
  const text = strML(t.text, TEXT_LIMITS.MAX_CHARS).split('\n').slice(0, 4).join('\n')   // 最多 4 行
  // ⚠️ 空字串**不可**在這裡丟掉：每一次編輯都會經過這支，使用者把字刪光準備重打的那一瞬間，
  //    整個文字框就跟著消失了（2026-10-04 使用者回報）。空的框照常保留、印出來什麼都沒有；
  //    設計器在「離開這個框」時才清掉還是空的那些。
  const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
  return {
    id: /^[a-z0-9]{4,16}$/i.test(String(t.id || '')) ? String(t.id) : Math.random().toString(36).slice(2, 10),
    text,
    x: +num(t.x, 0, 1, 0.5).toFixed(4), y: +num(t.y, 0, 1, 0.5).toFixed(4),
    size: +num(t.size, TEXT_LIMITS.SIZE_MIN, TEXT_LIMITS.SIZE_MAX, 4).toFixed(2),
    font: pick(t.font, FONTS, 'serif'),
    color: HEX.test(t.color || '') ? t.color : '#2B2118',
    bold: t.bold !== false,
    align: ['left', 'center', 'right'].includes(t.align) ? t.align : 'center',
    bg: TEXT_BG.includes(t.bg) ? t.bg : 'none',
  }
}
const normTexts = (arr, max) => (Array.isArray(arr) ? arr : []).map(normText).filter(Boolean).slice(0, max)

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
      palette: 'sage', colors: {},
      base: 'sage', paper: 'cream', font: 'serif', weekStart: 0,
      marks: { lunar: true, term: true, fest: true, yiji: false },
    },
    pages: {},
    texts: [],
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
  const st0 = { font: pick(st.font, FONTS, 'serif') }
  const mk = st.marks || {}
  // 超出目前週期頁數的內容先保留（使用者可能只是暫時切換週期），上限 52 頁
  const pages = {}
  for (const [k, p] of Object.entries(r.pages || {})) {
    const i = Number(k)
    if (!Number.isInteger(i) || i < 0 || i >= 52 || !p || typeof p !== 'object') continue
    const out = {}
    const t = str(p.title, 30); if (t) out.title = t
    const texts = normTexts(p.texts, TEXT_LIMITS.PER_PAGE)
    // 舊版的「一句話」（固定印在照片左下）→ 轉成一個可以自由移動的文字框，原本的設計不會不見
    const legacy = strML(p.text, 140)
    if (!texts.length && legacy.trim()) {
      const t = normText({ text: legacy, x: 0.24, y: 0.35, size: 2.3, align: 'left', bg: 'paper', bold: false, font: st0.font })
      if (t) texts.push(t)
    }
    if (texts.length) out.texts = texts
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
      // 有效的組合 id → 用它；其他（舊設計沒有這個欄位、或使用者明確清掉）→ null，
      // resolveColors 會改用舊的底座／紙張欄位推一組，舊設計的顏色不會突然變掉。
      // 全新設計由 defaultDesign 給預設組合，不經過這裡的 null。
      palette: PALETTES.some(p => p.id === st.palette) ? st.palette : (raw?.style ? null : d.style.palette),
      colors: Object.fromEntries(COLOR_SLOTS.map(({ key }) => [key, st.colors?.[key]]).filter(([, v]) => HEX.test(v || ''))),
      base: pick(st.base, BASE_COLORS, d.style.base),
      paper: pick(st.paper, PAPER_COLORS, d.style.paper),
      font: pick(st.font, FONTS, d.style.font),
      weekStart: st.weekStart === 1 ? 1 : 0,
      marks: { lunar: mk.lunar !== false, term: mk.term !== false, fest: mk.fest !== false, yiji: mk.yiji === true },
    },
    pages,
    texts: normTexts(r.texts, TEXT_LIMITS.GLOBAL),
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
