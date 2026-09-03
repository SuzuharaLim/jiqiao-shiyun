// 路由／捲動記憶層的回歸測試（src/store/nav.jsx）
//
// ⚠️ 這一支鎖的三個 bug 有一個共同點：**build 全綠、畫面看起來完全正常**。
//    它們的症狀都只是「返回後回到頁首」或「console 多一筆錯誤」，
//    不會有人回報成 bug，也沒有任何自動檢查會抓到——所以只能寫在這裡。
import fs from 'node:fs'

let pass = 0
const fails = []
const ok = (c, l) => { if (c) pass++; else fails.push(l) }

const src = fs.readFileSync(new URL('../src/store/nav.jsx', import.meta.url), 'utf8')
// ⚠️ 「某段文字不可出現」的檢查一律用**剝過註解**的版本。
//    這個專案已經踩過四次（check-ar ×2、check-char、check-mind）：
//    解釋「為什麼不能這樣寫」的註解本身就含那段程式，於是閘門抓到自己的說明文字。
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ── 1. 不存在的函式 scrollTop() ──
//
// popstate 處理函式裡曾經寫著 `scrollTop()`——**這個函式根本不存在**（同檔案只有
// 元素屬性 `el.scrollTop`）。於是每按一次上一頁/下一頁就丟一個 ReferenceError。
// ⚠️ 為什麼活這麼久：throw 發生在前三行 setState 之後，畫面照樣切過去，
//    使用者只看到「返回後回到頁首」——與「本來就沒做捲動記憶」無從分辨。
ok(!/(^|[^.\w])scrollTop\s*\(/.test(code),
  '★★ 不可呼叫不存在的 scrollTop()（要用 restore()／writeScroll()）')

// ── 2. remember()/restore() 不可放在 setState 的更新函式裡 ──
//
// ★ 這是三個 bug 裡最值得記住的一個。原本寫成：
//      setStack(s => { remember(tab, s.length); return [...s, x] })
//      writeScroll(0)
//   React 在 **render 階段**才執行更新函式，而 `writeScroll(0)` 是**當下就跑**的
//   ——順序是「先歸零、後記憶」，所以記下來的永遠是 0。
//   ⚠️ 也就是說捲動記憶**從來沒有生效過**（不分斷點），而整段程式碼看起來完全正常。
//   ⚠️ 另一個獨立的理由：更新函式必須是純函式。React 為了併發可能重跑它，
//      副作用會被執行不只一次。
const updaters = [...code.matchAll(/set(?:Stack|TabRaw)\(\s*\w+\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\)/g)]
for (const m of updaters) {
  ok(!/\b(remember|restore|writeScroll)\s*\(/.test(m[1]),
    '★★ setState 的更新函式裡不可有 remember/restore/writeScroll（render 階段才跑，順序會顛倒）')
}
// 正向：這三處必須在 dispatch 之前用 ref 讀深度
ok(/remember\(tab, stackRef\.current\.length\)/.test(code),
  '★ push/setTab 要在 dispatch 前用 stackRef 記住捲動位置')
ok(/remember\(tabRef\.current, stackRef\.current\.length\)/.test(code),
  '★ popstate 也要記住正要離開的那一頁（否則按「下一頁」回來一樣是頁首）')

// ── 3. scroller() 必須判斷「那個元素真的是捲動容器」 ──
//
// 捲動容器隨斷點而變：手機是 `.body`（overflow-y:auto），桌機是整份文件
// （`.stage.signed-in .body { overflow:visible }`）。原本只寫
// `document.querySelector('.device .body')`，桌機因此拿到一個**永遠捲不動**的元素
// → readScroll 一律讀到 0、writeScroll 又把 window 捲到 0。
// 實測 1280×720：`.body` 的 scrollHeight−clientHeight = 0，而 documentElement 是 2165−720。
ok(/overflowY/.test(code) && /'auto'|"auto"/.test(code),
  '★★ scroller() 要檢查 overflowY 是不是 auto/scroll，不可只判斷元素存不存在')

// ── 4. 還原的重試排程不可放在 rAF 回呼裡 ──
//
// 分頁在背景時 rAF 完全不觸發（實測 visibilityState:'hidden' 下 300ms 內一次都沒跑），
// 排程若寫在 rAF 回呼內就等於整個還原一次都不會發生。
const rafBody = code.match(/requestAnimationFrame\(([\s\S]{0,200}?)\)\s*\n/)
ok(rafBody ? !/setTimeout/.test(rafBody[1]) : true,
  '★ 還原的 setTimeout 重試不可排在 rAF 回呼裡（背景分頁的 rAF 不觸發）')
ok(/restoreTimers\.current = \[80, 200, 400\]\.map/.test(code) &&
   code.indexOf('restoreTimers.current = [80, 200, 400].map') < code.indexOf('requestAnimationFrame(attempt)'),
  '★ 計時器要先排、rAF 只當快路徑')

// ── 5. 「已到位」與「還沒長高」分辨不出來，所以要把重試排完 ──
//
// 兩者當下都是 scrollMax() <= y。把它當成成功而不再重試的話，返回時只要頁面
// 還沒 fetch 完就永遠停在頁首。
ok(!/scrollMax/.test(code), '不可用 scrollMax 提前判定成功（與「還沒長高」分辨不出來）')

// ── 6. scrollIntoContainer 要找「元素自己的」捲動容器 ──
//
// ★★★ 有堆疊畫面時頁面上**同時存在兩個** `.device .body`（根分頁那一層與堆疊
//   畫面那一層），而 `document.querySelector` 取的是**第一個**——也就是躺在
//   底下、使用者根本沒在看的那一個。
//   實測 `/ar/model/:slug` 按「考考我」：捲的是根分頁的 body（scrollTop 0→863），
//   而目標元素在另一個 body 裡，位置一點都沒變。
//   ⇒ 要捲到某個元素，必須從那個元素**往上找它自己的**捲動祖先。
ok(/export function scrollIntoContainer/.test(code),
  'nav.jsx 要匯出 scrollIntoContainer（不可讓各處自己寫一份捲動邏輯）')
{
  const fn = code.slice(code.indexOf('export function scrollIntoContainer'))
  ok(/el\.parentElement/.test(fn) && /while \(box/.test(fn),
    '★★★ scrollIntoContainer 要從元素往上找容器，不可直接用全域的 scroller()')
  ok(/scrollHeight - box\.clientHeight/.test(fn),
    '★★ 要確認那個祖先真的捲得動（只看 overflowY 會挑到捲不動的殼）')
}

// ── 5. 新增畫面必須同時登記在**三處**路由表 ──
//
// ★★★★ CLAUDE.md 早就寫著「新增畫面要同時改三處」，但 2026-08-16 加「節氣知識王」
//   時還是漏了 `server/seo.js`——因為漏掉的症狀是**畫面完全正常，只有 HTTP 狀態碼
//   是 404**：本機點得進去、按得動、玩得完，只有搜尋引擎知道那一頁「不存在」。
//   靠人記顯然靠不住，所以改成逐一比對。
{
  const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')
  const paths = read('../src/store/paths.js')
  const reg = read('../src/screens/registry.jsx')
  const app = read('../src/App.jsx')
  const seo = read('../server/seo.js')

  // SCREEN_PATH 是路徑的唯一真相：有網址的畫面都在這裡
  const from = paths.indexOf('export const SCREEN_PATH')
  const body = paths.slice(from, paths.indexOf('\n}', from))
  const entries = [...body.matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*'([^']+)'/gm)]
  ok(entries.length > 10, `★ 讀得到 SCREEN_PATH（目前 ${entries.length} 筆）`)

  for (const [, screen, tpl] of entries) {
    // ⚠️ notFound 刻意不進 seo 的 ROUTES——它就是「未知路徑」本身
    if (screen === 'notFound') continue
    ok(reg.includes(`${screen}:`) || reg.includes(`${screen} :`),
      `★★ 畫面「${screen}」要註冊在 registry.jsx 的 SCREENS`)
    ok(seo.includes(`path: '${tpl}'`),
      `★★★ 畫面「${screen}」(${tpl}) 要登記在 server/seo.js 的 ROUTES，否則伺服器回 404 狀態碼`)
    ok(app.includes(`${screen}:`) || app.includes(`${screen} :`),
      `★★ 畫面「${screen}」要在 App.jsx 的 SCREEN_TITLES 有標題`)
  }
}

if (fails.length) {
  console.error(`\n✗ 路由／捲動層檢查失敗 ${fails.length} 項：`)
  for (const f of fails) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`✓ 路由／捲動層 ${pass} 項檢查全部通過（不存在的函式、更新函式純度、捲動容器判定、背景分頁還原）`)
