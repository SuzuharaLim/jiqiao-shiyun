// ============================================================================
// 桌曆設計器閘門（掛在 npm run build 上，2026-10-04）
//
// 這裡鎖的全是「平常永遠通過、壞掉也不會有任何錯誤訊息」的東西：
//   A) 日期排版：印出去的日期錯一天就整批作廢——用已知正確的日子對答案
//   B) normalizeDesign：設計 JSON 是使用者可控的輸入，存檔前一定要洗乾淨
//   C) 原圖只有後台拿得到：「使用者不能把設計存回自己的電腦」靠的就是這一條
//   D) 大檔上傳要排除在全域 32kb 之外：漏了就**永遠送不出洽詢**，而本機測小圖不會發現
//
// ⚠️ 只 import src/data 與讀原始碼文字。絕不可 import server/db.js 之類的執行期模組
//   （站規：建置閘門一碰資料層就有能力擋掉正式部署）。
// ⚠️ 負向檢查（「原始碼不可出現 X」）都先對一個應該被抓到的樣本自我驗證——
//   一個永遠通過的檢查比沒有檢查更糟。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPages, dayInfo } from '../src/data/calendarLayout.js'
import { normalizeDesign, defaultDesign, CADENCES, CAL_LIMITS, designFlags, designSurfaces, designImageIds, isSlot, slotLabel, SLOT } from '../src/data/calendarRules.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const SERVER = read('server/index.js')

let fail = 0, n = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error('  ✗ ' + msg) } }

// ── A) 日期排版 ────────────────────────────────────────────────
const base = defaultDesign(new Date(2026, 9, 4))
const mk = (cadence, start) => buildPages({ ...base, cadence, start: { ...base.start, ...start } })
for (const [c, cfg] of Object.entries(CADENCES)) {
  ok(mk(c, { year: 2027 }).length === cfg.pages, `A ${c} 應有 ${cfg.pages} 頁`)
}
{
  const m = mk('month', { year: 2027, month: 1 })
  const days = m.flatMap(p => p.weeks.flat()).filter(Boolean)
  const at = (mo, d) => days.find(x => x.m === mo && x.d === d)
  ok(days.length === 365, 'A 2027 月曆應剛好 365 天')
  ok(at(2, 6)?.fest === '春節', 'A 2027 春節應在 2/6')
  ok(at(2, 5)?.fest === '除夕', 'A 2027 除夕應在 2/5（十二月是小月時要靠「隔天是初一」判斷）')
  ok(at(9, 15)?.fest === '中秋', 'A 2027 中秋應在 9/15')
  ok(at(1, 5)?.term === '小寒' && at(2, 4)?.term === '立春', 'A 2027 小寒 1/5、立春 2/4')
  ok(days.filter(x => x.term).length === 24, 'A 一整年應剛好有 24 個節氣日')
  ok(m[0].weeks[0].findIndex(Boolean) === 5, 'A 2027/1/1 是星期五（週日起算時前面空 5 格）')
  const mon = buildPages({ ...base, cadence: 'month', start: { ...base.start, year: 2027, month: 1 }, style: { ...base.style, weekStart: 1 } })
  ok(mon[0].weeks[0].findIndex(Boolean) === 4, 'A 週一起算時 2027/1/1 前面空 4 格')
  // 跨年：從 11 月開始的 12 頁要接到隔年 10 月
  const nov = mk('month', { year: 2026, month: 11 })
  ok(nov[0].from.y === 2026 && nov[11].from.y === 2027 && nov[11].from.m === 10, 'A 從 11 月開始的月曆要正確跨年')
}
{
  // ★ 小寒／大寒的立春年要退一年：「2027 年、從小寒開始」＝ 2027/1/5（跟 2027 小寒卡同一天）
  const t = mk('term', { year: 2027, termIndex: 22 })
  ok(t[0].label === '小寒' && t[0].from.y === 2027 && t[0].from.m === 1 && t[0].from.d === 5,
    `A 2027 從小寒開始應是 2027/1/5（實際 ${t[0].from.y}/${t[0].from.m}/${t[0].from.d}）`)
  const contiguous = t.every((p, i) => i === 0 || Date.UTC(p.from.y, p.from.m - 1, p.from.d) - Date.UTC(t[i - 1].to.y, t[i - 1].to.m - 1, t[i - 1].to.d) === 86400000)
  ok(contiguous, 'A 節氣頁必須首尾相接（不可漏一天或重疊一天）')
  const total = t.reduce((a, p) => a + p.weeks.flat().filter(Boolean).length, 0)
  ok(total >= 365 && total <= 366, `A 24 個節氣頁合起來應是一整年（實際 ${total} 天）`)
}
{
  const w = mk('week', { year: 2027, date: '2027-01-04' })
  ok(w.every(p => p.weeks.length === 1 && p.weeks[0].every(Boolean)), 'A 週曆每頁剛好 7 天、沒有空格')
  ok(w[0].from.wd === base.style.weekStart, 'A 週曆第一頁要對齊到一週的第一天')
}
// 用語跟著 lunisolar.js（全站一致寫「十二月」不寫「臘月」）
ok(dayInfo({ y: 2027, m: 1, d: 8 }).lunar === '十二月', 'A 農曆初一要顯示月名（2027/1/8＝十二月初一）')
ok(dayInfo({ y: 2027, m: 2, d: 6 }).lunar === '正月', 'A 正月初一要顯示「正月」')

// ── B) normalizeDesign ─────────────────────────────────────────
{
  const dirty = normalizeDesign({
    cadence: 'evil', evil: 1, title: 'x'.repeat(200),
    start: { year: 9999, month: 99, termIndex: -3, date: '1900-01-01' },
    style: { base: 'neon', font: 'comic', weekStart: 7, marks: { yiji: 'yes' } },
    pages: { 0: { title: 'a'.repeat(99), text: 'b'.repeat(999), img: { id: '../../etc', w: 1e9 } },
      60: { title: 'x' }, '-1': { title: 'x' }, 3: { img: { id: 'abcdef12-3456', w: 3000, h: 2000, src: 'hack' } } },
  })
  ok(!('evil' in dirty), 'B 未知欄位要丟掉')
  ok(dirty.cadence === 'month' && dirty.title.length <= 40, 'B 週期白名單、標題截斷')
  ok(dirty.start.year >= 2025 && dirty.start.year <= 2035 && dirty.start.month <= 12 && dirty.start.termIndex >= 0, 'B 起始值要夾在範圍內')
  ok(dirty.start.date !== '1900-01-01', 'B 範圍外的日期不可照收')
  ok(dirty.style.base === 'sage' && dirty.style.font === 'serif' && dirty.style.weekStart === 0, 'B 樣式白名單')
  ok(dirty.style.marks.yiji === false, 'B 宜忌必須是明確的 true 才開（民俗內容預設關）')
  ok(!dirty.pages[0].img && dirty.pages[0].title.length <= 30, 'B 不合法的圖片 id 丟掉、標題截斷')
  // 舊版「一句話」→ 文字框：內容要完整搬過去（上限 140），不可以默默切掉
  const legacy = normalizeDesign({ pages: { 0: { text: '字'.repeat(140) } } })
  ok(legacy.pages[0].texts?.[0]?.text.length === 140 && !('text' in legacy.pages[0]), 'B 舊版「一句話」要完整轉成文字框（140 字不可被切掉）')
  ok(dirty.pages[0].texts?.[0]?.text.length <= 140, 'B 文字框內容截在 140 字')
  ok(!dirty.pages[60] && !dirty.pages[-1], 'B 頁碼超出 0–51 要丟掉')
  ok(dirty.pages[3].img.src === 'upload', 'B 圖片來源只有 upload／site 兩種')
  const flags = designFlags(normalizeDesign({ cadence: 'month', pages: { 2: { img: { id: 'abcdef12-1', w: 1600, h: 1200 } } } }))
  ok(flags.lowres.includes(2), `B 長邊 < ${CAL_LIMITS.LOWRES_LONG_EDGE} 要被標成低解析`)
}

// ── B2) 照片縮放／位置（crop）──
{
  const d = normalizeDesign({ pages: { 0: { img: { id: 'abcdef12-1', w: 3000, h: 2000, crop: { z: 9, x: -5, y: 0.3, evil: 1 } } },
    1: { img: { id: 'abcdef12-2', w: 3000, h: 2000, crop: { z: 1, x: 0, y: 0 } } } } })
  const c = d.pages[0].img.crop
  ok(c && c.z === 4 && c.x === -1 && c.y === 0.3 && !('evil' in c), 'B2 crop 要夾在範圍內（z 1–4、x/y −1–1）並丟掉未知欄位')
  ok(!d.pages[1].img.crop, 'B2 沒調過（置中、不放大）的 crop 不存，維持預設')
  const { cropRect } = await import('../src/lib/calRender.js').catch(() => ({}))
  if (cropRect) {
    // 取景窗不可超出原圖：任何 crop 都要落在 [0, iw]×[0, ih] 內
    let outside = 0
    for (const z of [1, 1.7, 3]) for (const x of [-1, 0, 1]) for (const y of [-1, 0.5, 1]) {
      const r = cropRect(3000, 2000, 900, 300, { z, x, y })
      if (r.sx < -1e-6 || r.sy < -1e-6 || r.sx + r.sw > 3000 + 1e-6 || r.sy + r.sh > 2000 + 1e-6) outside++
    }
    ok(outside === 0, `B2 cropRect 有 ${outside} 種組合取景超出原圖（會畫出空白邊）`)
  }
}

// ── B3) 自由文字框與配色 ──
{
  const { resolveColors, contrast, TEXT_LIMITS: TL, PALETTES } = await import('../src/data/calendarRules.js')
  const d = normalizeDesign({
    texts: Array(9).fill({ text: '王家', x: 5, y: -2, size: 99, font: 'comic', color: 'blue', bg: 'neon', align: 'up' }),
    pages: { 0: { texts: Array(20).fill({ text: 'a' }).concat([{ text: '   ' }]) } },
    style: { palette: 'sea', colors: { ink: '#FFFFFF', evil: '#000000', grid: 'red' } },
  })
  const t = d.texts[0]
  ok(d.texts.length === TL.GLOBAL && d.pages[0].texts.length === TL.PER_PAGE, 'B3 文字框數量要有上限（每一頁都放／單頁）')
  ok(t.x === 1 && t.y === 0 && t.size === TL.SIZE_MAX, 'B3 位置與大小要夾在範圍內')
  // ★ 迴歸（2026-10-04 使用者回報）：把字刪光準備重打時，框不可以消失——清空的框要留著，離開時才由設計器清掉
  const emptied = normalizeDesign({ pages: { 0: { texts: [{ id: 'keep1234', text: '', x: 0.3, y: 0.4 }] } } })
  ok(emptied.pages[0]?.texts?.[0]?.id === 'keep1234', 'B3 文字被刪光時框不可以消失（normalizeDesign 不可丟掉空文字框）')
  ok(t.font === 'serif' && t.color === '#2B2118' && t.bg === 'none' && t.align === 'center', 'B3 字體／顏色／底色／對齊走白名單')
  ok(JSON.stringify(d.style.colors) === '{"ink":"#FFFFFF"}', 'B3 未知的顏色欄位與不合法的色碼要丟掉')
  ok(resolveColors(d).ink === '#FFFFFF' && resolveColors(d).grid === PALETTES.find(p => p.id === 'sea').colors.grid, 'B3 覆寫只蓋那一格，其他沿用組合')
  // 舊設計（沒有 palette 欄位）要維持原本的底座／紙張顏色，不可以突然變成預設組合
  const old = normalizeDesign({ style: { base: 'slate', paper: 'white' } })
  ok(old.style.palette === null && resolveColors(old).base === '#4E6E80' && resolveColors(old).paper === '#FFFFFF', 'B3 舊設計的顏色不可在升級後改變')
  // 每一組配色的「日期 vs 紙張」都要能讀（組合是我們挑的，不可以挑出看不清楚的）
  ok(PALETTES.every(p => contrast(p.colors.ink, p.colors.paper) >= 7), 'B3 每一組配色的日期與紙張對比都要 ≥ 7')
}

// ── C) 原圖只有後台拿得到 ──────────────────────────────────────
{
  // 自我驗證：這支 regex 必須抓得到「一支沒有 requireRole 卻讀原圖」的路由
  const routeRe = /app\.(get|post|put|patch|delete)\(\s*'([^']+)'([\s\S]*?)\n\}\)\)/g
  const sample = "app.get('/api/leak', requireAuth, ah(async (req, res) => {\n  const b = await getPrint(k)\n}))"
  const leaks = (src) => [...src.matchAll(routeRe)].filter(m => /getPrint\(/.test(m[3]) && !/requireRole\('(moderator|admin)'\)/.test(m[3]))
  ok(leaks(sample).length === 1, 'C 自我驗證失敗：偵測「沒有權限檢查卻讀原圖」的 regex 抓不到樣本')
  ok(leaks(SERVER).length === 0, `C 有路由在沒有 requireRole 的情況下讀了原圖：${leaks(SERVER).map(m => m[2]).join('、')}`)
  ok([...SERVER.matchAll(routeRe)].filter(m => /getPrint\(/.test(m[3])).length === 1, 'C 讀原圖的路由應該只有一支（後台那支）')
  ok(!/upload\/storage\/v1[^`]*predefinedAcl=public/.test(read('server/printStore.js')), 'C 原圖不可上傳成公開物件')
}

// ── D) 大檔上傳要排除在全域 32kb 之外 ───────────────────────────
{
  const m = /const bigBody = \(req\) =>([\s\S]*?)\napp\.use\(/.exec(SERVER)
  ok(!!m, 'D 找不到 bigBody（全域 body 上限的排除清單）')
  if (m) {
    // 實際跑一次那個判斷式，不要只比對字串
    const bigBody = new Function('req', 'return ' + m[1].trim())
    ok(bigBody({ method: 'POST', path: '/api/calinquiries/abc/print/3' }), 'D 原圖上傳（約 3 MB）必須排除在 32kb 之外——否則洽詢永遠送不出去')
    ok(bigBody({ method: 'PATCH', path: '/api/caldesigns/abc' }) && bigBody({ method: 'POST', path: '/api/caldesigns' }), 'D 設計存檔（最多 160kb）必須排除在 32kb 之外')
    ok(!bigBody({ method: 'POST', path: '/api/login' }) && !bigBody({ method: 'POST', path: '/api/caldesigns/abc/inquiry' }), 'D 其他路由不可被放寬')
  }
  ok(/jsonPrint = express\.json\(\{ limit: '9mb' \}\)/.test(SERVER), 'D 原圖路由自己要有較大的 parser')
}

// ── E. 封面與雙面（2026-10-04）──
{
  const id = 'abcdef1234'
  const d = normalizeDesign({ cover: { title: '家', img: { id, w: 4000, h: 3000 }, back: { img: { id: 'abcdef5678', w: 900, h: 900 } } },
    pages: { 2: { back: { img: { id: 'abcdef9999', w: 4000, h: 3000 } } } } })
  ok(d.cover?.title === '家' && d.cover?.back?.img, 'E 封面與封面背面要保留')
  ok(d.pages[2]?.back?.img?.id === 'abcdef9999', 'E 日曆頁背面要保留')
  ok(designSurfaces(d).map(x => x.slot).join() === '200,201,102', 'E 每一面的編號：封面 200、封面背面 201、第 3 頁背面 102')
  ok(designImageIds(d).length === 3, 'E 封面與背面的照片也要算進「這份設計用到的圖」（否則清理時會被當成孤兒刪掉）')
  ok(designFlags(d).lowres.join() === '201', 'E 低解析標記要涵蓋背面')
  // ⚠️ 正面沿用 0–51：舊洽詢的 print_json／flags 都是這個編號
  ok(isSlot(0) && isSlot(51) && isSlot(100) && isSlot(151) && isSlot(200) && isSlot(201), 'E 合法編號')
  ok(!isSlot(52) && !isSlot(99) && !isSlot(152) && !isSlot(202) && !isSlot(-1) && !isSlot(1.5), 'E 不合法編號要擋')
  ok(slotLabel(3) === '第 4 頁' && slotLabel(SLOT.COVER) === '封面' && slotLabel(SLOT.BACK + 3) === '第 4 頁背面', 'E 編號的中文名稱')
  const old = normalizeDesign({ pages: { 0: { title: 'a' } } })
  ok(!('cover' in old) && !old.pages[0].back, 'E 舊設計沒有封面／背面時不可憑空長出來（否則後台會顯示一堆空白面）')
}

// ── F. 預設文字可改、可隱藏（2026-10-04）──
{
  const d = normalizeDesign({ pages: { 0: { label: '一月', en: '', sub: 5 } }, cover: { sub: '', glyph: '家' } })
  ok(d.pages[0].label === '一月', 'F 自訂的月份文字要保留')
  ok(d.pages[0].en === '', 'F 空字串＝隱藏，不可被當成沒填丟掉（否則按了隱藏又冒出來）')
  ok(!('sub' in d.pages[0]), 'F 非字串＝用預設，不可存進去')
  ok(d.cover.sub === '' && d.cover.glyph === '家', 'F 封面的預設文字也能改與隱藏')
}

if (fail) {
  console.error(`\n✗ 桌曆設計器 ${fail} / ${n} 項檢查沒過。`)
  process.exit(1)
}
console.log(`  ✓ 桌曆設計器 ${n} 項檢查全部通過（日期排版、設計資料清洗、原圖權限、上傳上限）`)
