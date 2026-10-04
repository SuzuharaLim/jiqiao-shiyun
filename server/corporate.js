// ============================================================================
// 承氣有限公司官網（chengqi.tw 根目錄，2026-10-04）
//
// 機巧時運是承氣有限公司的產品，整個 App 搬到 /app/；`/AR` 與 `/ar/*` 留在根目錄
// （實體卡片已經印出去了，見 src/data/appBase.js 的檔頭）。
//
// ★★★ 為什麼是伺服器直接吐的獨立 HTML，而不是 SPA 裡的一個畫面：
//   ① 官網必須**不需登入**、而且是全站最常被打開的一頁——不該為了它下載 475 KB
//     的 App bundle；② 爬蟲與 LINE／FB 預覽抓取器不執行 JS，這裡的每個字都是真 HTML；
//   ③ 與 App 完全脫鉤，改官網不會碰到 App 的任何一條雷區。
//
// ★★★ 公司資料一律寫在下面的 COMPANY，**還沒提供的欄位留 null，畫面直接不顯示**。
//   ⚠️ 絕不可以先填一個看起來合理的值（統編、地址、電話、成立年份）——官網上的
//     公司資料會被當成正式聲明，填錯就是對外陳述不實。也不可以顯示「待填」字樣：
//     這一頁一部署就是公開的。
//
// ⚠️ CSP 的 scriptSrc 是 'self'，所以**不可有 inline script**；這一頁本來也不需要 JS。
//   styleSrc 有 'unsafe-inline'，樣式寫在 <style> 裡即可。
// ⚠️ 全站禁用 emoji（CLAUDE.md），這一頁同樣適用。
// ============================================================================

export const COMPANY = {
  name: '承氣有限公司',
  nameEn: null,        // 英文名稱（待公司提供）
  taxId: null,         // 統一編號
  address: null,       // 公司地址
  phone: null,         // 聯絡電話
  email: null,         // 聯絡信箱
  founded: null,       // 成立年份
  intro: null,         // 公司簡介（一段）；null 時用下面的 DEFAULT_INTRO
}

// 只寫確定成立的事：機巧時運是我們的產品、它做什麼（與站內 /about 一致）。
const DEFAULT_INTRO = '我們把傳統曆法與二十四節氣，做成今天的人用得上的產品。'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function corporateHtml({ origin = 'https://chengqi.tw' } = {}) {
  const c = COMPANY
  const year = new Date().getFullYear()
  const intro = c.intro || DEFAULT_INTRO
  const facts = [
    ['公司名稱', c.name],
    ['英文名稱', c.nameEn],
    ['統一編號', c.taxId],
    ['成立', c.founded],
    ['地址', c.address],
    ['電話', c.phone],
    ['信箱', c.email && `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`],
  ].filter(([, v]) => v)
  const raw = new Set(['信箱'])
  const desc = `${c.name}——${intro} 旗下產品「機巧時運」：智慧互動國民曆、二十四節氣攝影社群與 AI 時光顧問。`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    // 與 App 頁面 index.html 的 @graph 用同一個 @id，搜尋引擎才會認成同一家公司
    '@id': origin + '/#org',
    name: c.name,
    ...(c.nameEn ? { alternateName: c.nameEn } : {}),
    url: origin + '/',
    logo: origin + '/logo.svg',
    ...(c.email ? { email: c.email } : {}),
    ...(c.phone ? { telephone: c.phone } : {}),
    ...(c.taxId ? { taxID: c.taxId } : {}),
    ...(c.address ? { address: c.address } : {}),
    ...(c.founded ? { foundingDate: String(c.founded) } : {}),
    brand: { '@type': 'Brand', name: '機巧時運', url: origin + '/app' },
  }

  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(c.name)}｜機巧時運</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(origin)}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#FDFBF7">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(c.name)}">
<meta property="og:title" content="${esc(c.name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(origin)}/">
<meta property="og:image" content="${esc(origin)}/og-default.jpg">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
:root{--bg:#FDFBF7;--shell:#F4EFE6;--card:#FFFFFF;--ink:#2B2118;--muted:#6F6259;--line:rgba(43,33,24,.08);
  --shadow:0 2px 4px rgba(43,33,24,.04),0 22px 44px -22px rgba(43,33,24,.22);--e:cubic-bezier(.32,.72,0,1);
  --serif:"Noto Serif TC","Source Han Serif TC","PMingLiU",Georgia,serif;
  --sans:system-ui,-apple-system,"Segoe UI","PingFang TC","Microsoft JhengHei",sans-serif}
@media (prefers-color-scheme:dark){:root{--bg:#1C1612;--shell:#2A221C;--card:#241D18;--ink:#F3ECE2;--muted:#B8AA9C;
  --line:rgba(243,236,226,.10);--shadow:0 2px 4px rgba(0,0,0,.2),0 22px 44px -22px rgba(0,0,0,.5)}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:18px;line-height:1.75}
a{color:inherit}
.wrap{width:min(100% - 32px,1000px);margin:0 auto}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 0}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--serif);font-weight:800;font-size:20px;text-decoration:none}
.brand img{width:32px;height:32px}
nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;text-decoration:none;color:var(--muted);font-size:15px}
nav a:focus-visible,.btn:focus-visible,.brand:focus-visible{outline:2px solid var(--ink);outline-offset:2px;border-radius:10px}
.hero{padding:clamp(48px,10vw,120px) 0 clamp(40px,8vw,88px)}
.eyebrow{display:inline-block;font-size:13px;letter-spacing:.18em;color:var(--muted);margin-bottom:16px}
h1{font-family:var(--serif);font-weight:800;font-size:clamp(36px,7vw,64px);line-height:1.2;margin:0 0 20px;letter-spacing:.02em}
.lead{font-size:clamp(17px,2.2vw,20px);color:var(--muted);max-width:34em;margin:0}
h2{font-family:var(--serif);font-size:clamp(24px,3.6vw,32px);margin:0 0 20px}
section{padding:0 0 clamp(48px,8vw,88px)}
.card{background:var(--card);border:6px solid var(--shell);background-clip:padding-box;border-radius:26px;
  box-shadow:0 0 0 1px var(--line),var(--shadow);padding:clamp(24px,4vw,40px)}
.prod{display:grid;gap:24px;grid-template-columns:auto 1fr;align-items:start}
.prod img{width:72px;height:72px}
.prod h3{font-family:var(--serif);font-size:26px;margin:0 0 6px}
.prod p{margin:0 0 20px;color:var(--muted)}
.prod ul{margin:0 0 24px;padding-left:1.2em}
.acts{display:flex;flex-wrap:wrap;gap:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 24px;border-radius:999px;
  text-decoration:none;font-weight:700;font-size:16px;transition:transform .26s var(--e),box-shadow .26s var(--e)}
.btn.primary{background:var(--ink);color:var(--bg)}
.btn.ghost{border:1px solid var(--line);background:var(--card);box-shadow:0 0 0 1px var(--line)}
@media (hover:hover) and (pointer:fine){.btn:hover{transform:translateY(-2px);box-shadow:var(--shadow)}}
.btn:active{transform:scale(.985)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:10px 24px;margin:0}
dt{color:var(--muted)} dd{margin:0}
footer{border-top:1px solid var(--line);padding:24px 0 40px;color:var(--muted);font-size:14px;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
footer a{display:inline-flex;align-items:center;min-height:24px}
@media (max-width:560px){.prod{grid-template-columns:1fr}.prod img{width:56px;height:56px}nav a{padding:0 8px}dl{grid-template-columns:1fr;gap:2px}dd{margin-bottom:10px}}
@media (prefers-reduced-motion:reduce){.btn{transition:none}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="/"><img src="/favicon.svg" alt="" width="32" height="32">${esc(c.name)}</a>
    <nav aria-label="主要導覽"><a href="#product">產品</a><a href="#company">公司資訊</a><a href="/app/contact">聯絡我們</a></nav>
  </header>

  <main>
    <section class="hero">
      ${c.nameEn ? `<span class="eyebrow">${esc(c.nameEn)}</span>` : ''}
      <h1>${esc(c.name)}</h1>
      <p class="lead">${esc(intro)}</p>
    </section>

    <section id="product" aria-labelledby="h-product">
      <h2 id="h-product">產品</h2>
      <article class="card prod">
        <img src="/logo.svg" alt="" width="72" height="72">
        <div>
          <h3>機巧時運</h3>
          <p>智慧互動國民曆 × 二十四節氣攝影社群 × AI 時光顧問</p>
          <ul>
            <li>每日國民曆：宜忌、黃道吉時、沖煞、建除，用白話讀懂</li>
            <li>二十四節氣攝影社群：記錄每個節氣的台灣</li>
            <li>節氣卡片：掃描實體卡片，看 3D 角色與當令知識</li>
          </ul>
          <div class="acts">
            <a class="btn primary" href="/app">開啟機巧時運</a>
            <a class="btn ghost" href="/AR">掃描節氣卡片</a>
          </div>
        </div>
      </article>
    </section>

    <section id="company" aria-labelledby="h-company">
      <h2 id="h-company">公司資訊</h2>
      <div class="card">
        <dl>${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${raw.has(k) ? v : esc(v)}</dd>`).join('')}</dl>
      </div>
    </section>
  </main>

  <footer>
    <span>&copy; ${year} ${esc(c.name)}</span>
    <span><a href="/app/privacy">隱私權政策</a>　<a href="/app/terms">服務條款</a>　<a href="/app/contact">聯絡我們</a></span>
  </footer>
</div>
</body>
</html>
`
}
