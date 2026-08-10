// 檢查**正式站**（不是本機）AR 需要的東西有沒有真的上線。
//
// 為什麼需要這支：
//  ① 「push 到 GitHub」**不等於**已部署（實測記錄在案：檔案 push 一小時後
//     正式站仍是舊版建置）。所以部署後一定要另外確認。
//  ② AR 最關鍵的一項是 **CSP 回應標頭**，那是伺服器送的——**改程式碼不重新部署
//     不會生效**，而本機 `npm run dev` 完全驗不出來（Vite dev server 不送 CSP）。
//     2026-08-10 的事故就是這樣：正式站 CSP 少了 `worker-src blob:`，
//     MindAR 的 Web Worker 被擋 → 永遠掃不到，而畫面完全正常。
//
// 用法：npm run check:live            （預設 https://chengqi.tw）
//       npm run check:live -- https://其他網址
//
// ⚠️ 這支**不掛在 build 上**：它會打外部網路，而 build 必須能離線跑。
const BASE = (process.argv[2] || 'https://chengqi.tw').replace(/\/$/, '')

const rows = []
const add = (ok, what, detail) => rows.push({ ok, what, detail })

async function head(path) {
  try {
    const res = await fetch(BASE + path, { method: 'GET', redirect: 'follow' })
    return res
  } catch (e) { return { ok: false, status: 0, headers: new Headers(), _err: e.message } }
}

const res = await head('/AR')
const csp = res.headers.get('content-security-policy') || ''

// ── ★★★ 最關鍵的一項 ──
// worker-src 沒設時瀏覽器會退回 child-src，再退回 script-src。
// 所以「有 worker-src blob:」或「有 child-src blob:」都能動，但兩個都沒有就是壞的。
const hasWorker = /worker-src[^;]*blob:/.test(csp)
const hasChild = /child-src[^;]*blob:/.test(csp)
add(hasWorker || hasChild,
  'CSP 允許 blob: 的 Web Worker',
  hasWorker && hasChild ? 'worker-src ＋ child-src 都有（最穩）'
    : hasWorker ? '只有 worker-src（可動）'
      : hasChild ? '只有 child-src（可動，但建議補 worker-src）'
        : '★ 兩個都沒有 → AR 永遠掃不到，而且畫面看起來完全正常')

// WASM 退路：不致命（TFJS 會退回 WebGL），但沒有就少一條路
add(/'wasm-unsafe-eval'/.test(csp), "CSP 允許 WebAssembly（'wasm-unsafe-eval'）",
  /'wasm-unsafe-eval'/.test(csp) ? 'TFJS 可用 WASM 後端'
    : '非致命：TFJS 會退回 WebGL，但 WebGL 弱的裝置就沒得退')

add(res.status === 200, '/AR 可以打開', 'HTTP ' + res.status)

// 目標檔：缺了就永遠不會命中（症狀同樣與「沒對準」難分辨）
const mind = await head('/ar/targets/2027-xiaohan.mind')
const ct = mind.headers.get('content-type') || ''
const len = Number(mind.headers.get('content-length') || 0)
// ⚠️ 只看 200 不夠：檔案不存在時 SPA fallback 會回 200 + index.html
add(mind.status === 200 && !ct.includes('text/html') && len > 100_000,
  '.mind 目標檔已上線',
  `HTTP ${mind.status}　${ct}　${len ? (len / 1024).toFixed(0) + ' KB' : '長度未知'}` +
  (ct.includes('text/html') ? '　★ 回的是 HTML＝檔案不存在（被 SPA fallback 接走）' : ''))

const card = await head('/ar/card/2027-xiaohan')
add(card.status === 200, '無相機時的替代頁可以打開', 'HTTP ' + card.status)

// ── ★★★ 線上跑的是不是「本機這一版」 ──
//
// ⚠️ 這一項是 2026-08-10 補的，因為缺了它讓我**連續兩次判斷錯誤**：
//    只驗標頭與檔案存在，會看到「CSP 對了、.mind 在、頁面開得起來」就以為沒事，
//    但線上其實跑著一個**較舊的建置**——標頭是伺服器送的（新的），
//    前端 bundle 卻是舊的，兩者可以不同步。
//    比對 bundle 檔名是最直接的判準（Vite 的檔名含內容雜湊）。
try {
  const localHtml = await import('node:fs').then(fs => fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'))
  const localJs = localHtml.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
  const liveHtml = await (await fetch(BASE + '/AR')).text()
  const liveJs = liveHtml.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
  add(!!localJs && !!liveJs && localJs === liveJs,
    '線上跑的是本機這一版',
    localJs === liveJs ? `同版 ${liveJs}` : `線上 ${liveJs ?? '?'}　本機 ${localJs ?? '?'}　★ 尚未部署最新版`)
} catch (e) {
  add(false, '線上跑的是本機這一版', '無法比對（先跑 npm run build）：' + e.message)
}

// ⚠️ 不要用 padEnd 對齊：中文是全形，字元數與顯示寬度不一樣，補出來一定歪。
console.log(`\n正式站檢查：${BASE}\n`)
for (const r of rows) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.what}\n      ${r.detail}`)
}

const critical = rows.filter((r, i) => i !== 1)   // WASM 那項是非致命的
if (critical.some(r => !r.ok)) {
  console.error(`
✗ 正式站還沒準備好。
  最常見的原因是**改了程式碼但還沒重新部署**——CSP 是伺服器送的標頭，
  只改 server/index.js 不會影響已經在跑的服務。
  在 Cloud Shell：
      cd ~/chengqi-main && git pull && gcloud run deploy jiqiao --source . --region=asia-east1
  部署完再跑一次這支。`)
  process.exit(1)
}
console.log('\n✓ 正式站的 AR 前置條件都到位了（實機掃描仍需相機與實體卡驗證）。')
