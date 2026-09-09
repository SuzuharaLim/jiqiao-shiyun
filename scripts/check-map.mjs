// ============================================================================
// check-map.mjs —— 驗證 docs/檢修地圖.md 沒有過期
//
// ★ 為什麼要有這支：檢修地圖的用途是「不用掃全站就能找到東西」，
//   而一份**過期的地圖會把人帶到錯的地方**——那比沒有地圖更糟，
//   因為讀的人會相信它。地圖失效又是完全靜默的（改了程式，文件不會有任何反應）。
//   本站的原則是「能寫成檢查的就寫成檢查」，這支就是那個檢查。
//
// 驗四件事：
//   A) 地圖提到的每個檔案路徑都存在
//   B) 畫面對照表的每個代號都在 SCREEN_PATH 裡，而且網址一致
//   C) CSS 前綴表的每個前綴在 styles.css 裡真的有規則
//   D) API 端點表的每支路由在 server/index.js 裡真的有註冊
//
// ⚠️ **刻意不驗行號**：行號本來就會隨每次改動漂移，驗了只會逼人為了過閘門
//    去改一堆無意義的數字，最後大家會把這支檢查關掉。行號是估算值，
//    錨點（檔名／代號／前綴／路由）才是契約。
//
// ⚠️ 每一條負向檢查都先用「應該被抓到的樣本」自我驗證（見檔尾 selfTest）——
//    本站踩過「regex 寫錯導致閘門恆為通過」的坑，一個永遠通過的檢查比沒有更糟。
// ============================================================================
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAP = 'docs/檢修地圖.md'
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')

let pass = 0
const fails = []
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ★★★★ 容器建置裡沒有 docs/，這支必須「大聲跳過」而不是崩掉。
// ⚠️ 2026-09-09 事故：把這支加進 `npm run build` 時沒想到 `.dockerignore` 與
//    `.gcloudignore` **兩層都排除了 docs**（文件不需要進映像檔）。於是
//    `docs/檢修地圖.md` 讀不到 → ENOENT → 退出碼 1 → `npm run build` 失敗
//    → `docker build` 失敗 → **Cloud Run 部署整個失敗**。本機一切正常，
//    使用者連續數次部署都沒上去才發現。
//    ⇒ **文件型的閘門絕不可以有能力擋掉正式部署。**
// ⚠️ 但也不能無腦「檔案不在就跳過」——那樣地圖被改名／刪掉時本機也會靜默放行，
//    正好是這支存在的意義所在。用「docs/ 這個目錄在不在」區分兩種情境：
//      docs/ 不存在        ⇒ 容器建置（文件被刻意排除）⇒ 跳過並印出原因
//      docs/ 在、地圖檔不在 ⇒ 真的被改名或刪掉         ⇒ 照常失敗
const HAS_DOCS_DIR = fs.existsSync(path.join(ROOT, 'docs'))
if (!HAS_DOCS_DIR) {
  console.log('  · 檢修地圖：略過（此建置環境沒有 docs/，見 .dockerignore／.gcloudignore）')
  process.exit(0)
}
if (!fs.existsSync(path.join(ROOT, MAP))) {
  console.error(`\n✗ 找不到 ${MAP}，但 docs/ 是存在的——地圖被改名或刪掉了嗎？`)
  console.error('  這支檢查的用途就是擋住「地圖與程式對不上」，所以不會靜默略過。\n')
  process.exit(1)
}

const md = read(MAP)
// 只看某一節的內容（從標題到下一個 ## 標題）
const section = (h) => {
  const i = md.indexOf(h)
  if (i < 0) return ''
  const j = md.indexOf('\n## ', i + h.length)
  return md.slice(i, j < 0 ? md.length : j)
}

// ── A) 檔案路徑都存在 ───────────────────────────────────────────
// 抓反引號裡看起來像 repo 路徑的字串。結尾可以是副檔名或 /（目錄）。
// ⚠️ 字元類要含中日韓：本專案有中文檔名（docs/檢修地圖.md、docs/架構.md…），
//    只寫 [\w./-] 會**整個漏掉它們**，而漏掉的檢查是靜默的（看起來照樣通過）。
const PATH_RE = /`((?:src|server|scripts|docs|public)\/[\w./一-鿿-]*?(?:\.(?:jsx?|mjs|css|sql|md|html)|\/))`/g
const paths = new Set()
for (const m of md.matchAll(PATH_RE)) paths.add(m[1])
for (const p of [...paths].sort()) {
  ok(fs.existsSync(path.join(ROOT, p)), `A 檔案不存在：${p}（檢修地圖提到它，但它已被搬走或改名）`)
}

// ── B) 畫面對照表 ───────────────────────────────────────────────
const { SCREEN_PATH } = await import('../src/store/paths.js')
const secB = section('## 二、畫面對照表')
// | `key` | `/path` | `File.jsx` |
const ROW_RE = /^\|\s*`(\w+)`\s*\|\s*`([^`]+)`\s*\|\s*`([\w.]+\.jsx)`\s*\|/gm
const listed = new Map()
for (const m of secB.matchAll(ROW_RE)) {
  const [, key, url, file] = m
  listed.set(key, url)
  ok(SCREEN_PATH[key] !== undefined,
    `B 畫面代號「${key}」已不在 SCREEN_PATH 裡（畫面被刪了？檢修地圖〈二〉要移除該列）`)
  if (SCREEN_PATH[key] !== undefined) {
    ok(SCREEN_PATH[key] === url,
      `B 畫面「${key}」網址對不上：地圖寫 ${url}、SCREEN_PATH 是 ${SCREEN_PATH[key]}`)
  }
  ok(fs.existsSync(path.join(ROOT, 'src/screens', file)),
    `B 畫面「${key}」的檔案不存在：src/screens/${file}`)
}
ok(listed.size > 0, 'B 畫面對照表一列都沒解析到——表格格式被改壞了，這支檢查已失效')
// 反向：程式裡有、地圖沒有 → 新增畫面時忘了更新地圖
for (const key of Object.keys(SCREEN_PATH)) {
  ok(listed.has(key),
    `B 新畫面「${key}」(${SCREEN_PATH[key]}) 還沒寫進檢修地圖〈二〉的對照表`)
}

// ── C) CSS 前綴都還在 ───────────────────────────────────────────
const css = read('src/styles.css')
const secC = section('## 三、CSS 前綴表')
const prefixes = new Set()
// 只取「前綴」欄（每列開頭那一格）裡的 .xxx
for (const line of secC.split(/\r?\n/)) {
  if (!/^\|\s*`\./.test(line)) continue
  const cell = line.split('|')[1] || ''
  for (const m of cell.matchAll(/`(\.[\w-]+)`/g)) prefixes.add(m[1])
}
for (const p of [...prefixes].sort()) {
  // 前綴以 - 結尾代表族群（.ad- → 找 .ad-任何字）；否則要完整比對到單字邊界
  const re = p.endsWith('-')
    ? new RegExp('\\' + p + '[\\w-]+')
    : new RegExp('\\' + p + '(?![\\w-])')
  ok(re.test(css), `C CSS 前綴「${p}」在 styles.css 裡已經沒有任何規則（改名或刪掉了？）`)
}
ok(prefixes.size > 10, 'C CSS 前綴表解析到的太少——表格格式被改壞了，這支檢查已失效')

// ── D) API 路由都還在 ───────────────────────────────────────────
const srv = read('server/index.js')
const secD = section('## 四、API 端點表')
// ⚠★ 地圖用了兩種壓縮寫法（為了讀起來不要一頁全是重複的路徑前綴）：
//      `GET｜POST /api/orders`            → 同一路徑、多個方法
//      `POST /api/quiz/queue｜answer｜leave` → 同一目錄、多個末段
//    這裡**一定要把它們展開**。第一版只認「單一方法＋單一路徑」，於是 90 幾條
//    路由**只抽到 32 條**，其餘全部沒被檢查——而畫面上看起來一切正常（「通過」）。
//    這正是站規說的「一個永遠通過的檢查比沒有檢查更糟」，變異測試當場抓到它。
//    ⇒ 改了地圖的寫法，這裡也要跟著改，否則檢查會再一次靜默地縮水。
const routes = new Set()
const SEP = '\uFF5C'   // ｜ 全形直線
for (const m of secD.matchAll(new RegExp(
  '`((?:GET|POST|PATCH|PUT|DELETE)(?:' + SEP + '(?:GET|POST|PATCH|PUT|DELETE))*)\\s+(/api/[\\w:/-]+(?:' + SEP + '[\\w:-]+)*)`', 'g'))) {
  const methods = m[1].split(SEP)
  const segs = m[2].split(SEP)
  const base = segs[0]
  // 末段替換：/api/quiz/queue｜answer｜leave → queue / answer / leave
  const dir = base.slice(0, base.lastIndexOf('/') + 1)
  const urls = [base, ...segs.slice(1).map(s => dir + s)]
  for (const method of methods) for (const url of urls) routes.add(method.toLowerCase() + ' ' + url)
}
for (const r of [...routes].sort()) {
  const [method, url] = r.split(' ')
  // server 端可能寫成 '/api/x' 或帶 regex 的 '/api/x/:a(...)'；比對到路徑前綴即可
  const re = new RegExp(`app\\.${method}\\(\\s*'${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^']*'`)
  ok(re.test(srv), `D 端點「${method.toUpperCase()} ${url}」在 server/index.js 裡找不到（改路徑或刪掉了？）`)
}
ok(routes.size > 20, 'D API 端點表解析到的太少——表格格式被改壞了，這支檢查已失效')

// ── 自我驗證：每一類檢查都要證明自己抓得到 ──────────────────────
// ⚠️ 不做這一段的話，regex 寫錯會讓整支閘門「恆為通過」而沒人發現。
function selfTest() {
  const bad = []
  // A：不存在的路徑要被 PATH_RE 抓出來
  const fakeA = [...'`src/screens/絕對不存在的檔案.jsx`'.matchAll(PATH_RE)]
  if (fakeA.length !== 1) bad.push('自我驗證失敗：A 的路徑 regex 抓不到樣本')
  // B：表格列 regex 要抓得到標準格式
  const fakeB = [...'| `quiz` | `/quiz` | `QuizGame.jsx` |'.matchAll(ROW_RE)]
  if (fakeB.length !== 1) bad.push('自我驗證失敗：B 的表格列 regex 抓不到樣本')
  // C：不存在的前綴要被判為不存在
  if (new RegExp('\\.zzz-nonexistent[\\w-]+').test(css)) bad.push('自我驗證失敗：C 竟然比對到不存在的前綴')
  // D：不存在的路由要被判為不存在
  if (/app\.get\(\s*'\/api\/zzz-nonexistent[^']*'/.test(srv)) bad.push('自我驗證失敗：D 竟然比對到不存在的路由')
  // D2：★ 壓縮寫法一定要能展開。第一版沒展開，90 幾條路由只抽到 32 條而閘門照樣「通過」。
  //     這兩個樣本鎖住兩種寫法，改壞了會在這裡當場紅掉，不會再靜默縮水。
  const probe = (text) => {
    const s = new Set()
    for (const m of text.matchAll(new RegExp(
      '`((?:GET|POST|PATCH|PUT|DELETE)(?:' + SEP + '(?:GET|POST|PATCH|PUT|DELETE))*)\\s+(/api/[\\w:/-]+(?:' + SEP + '[\\w:-]+)*)`', 'g'))) {
      const segs = m[2].split(SEP), base = segs[0]
      const dir = base.slice(0, base.lastIndexOf('/') + 1)
      for (const mm of m[1].split(SEP)) for (const u of [base, ...segs.slice(1).map(x => dir + x)]) s.add(mm.toLowerCase() + ' ' + u)
    }
    return s
  }
  const a = probe('`GET' + SEP + 'POST /api/orders`')
  if (a.size !== 2 || !a.has('get /api/orders') || !a.has('post /api/orders'))
    bad.push('自我驗證失敗：D 的「多方法」壓縮寫法沒展開（會讓檢查靜默縮水）')
  const b = probe('`POST /api/quiz/queue' + SEP + 'answer' + SEP + 'leave`')
  if (b.size !== 3 || !b.has('post /api/quiz/answer') || !b.has('post /api/quiz/leave'))
    bad.push('自我驗證失敗：D 的「多末段」壓縮寫法沒展開（會讓檢查靜默縮水）')
  return bad
}
const selfBad = selfTest()
selfBad.forEach(m => fails.push(m))
if (selfBad.length === 0) pass++

// ── 結果 ────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ 檢修地圖（${MAP}）已過期，${fails.length} 項對不上：\n`)
  fails.filter(Boolean).forEach(m => console.error('  ' + m))
  console.error(`\n  → 改完程式請一併更新 ${MAP}。它的用途是讓人不必掃全站就找得到東西，`)
  console.error('    過期的地圖會把人帶到錯的地方，比沒有地圖更糟。\n')
  process.exit(1)
}
console.log(`✓ 檢修地圖 ${pass} 項檢查全部通過（檔案 ${paths.size}、畫面 ${listed.size}、CSS 前綴 ${prefixes.size}、端點 ${routes.size}）`)
