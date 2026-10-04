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

// 來源：《機巧時運＿U-start 第二階段營運計畫簡報》（2026-10-04 使用者提供）。
// ⚠️ 簡報 PDF 的文字是用康熙部首相容字（⼀⼤⾏⾀…）排的，抄出來一定要 NFKC 正規化，
//   否則執行長的名字會變成「蕭⾀程」（⾀＝KANGXI RADICAL BRUSH），正解是「蕭聿程」。
// ⚠️ 簡報裡的財務預估、定價、募資策略、競品分析是**內部資料**，刻意不放上官網。
export const COMPANY = {
  name: '承氣有限公司',
  nameEn: null,        // 英文名稱（簡報未載，待公司提供）
  taxId: '62046190',
  address: '臺中市西區臺灣大道二段 186 號 24 樓',
  phone: null,         // 簡報未載
  email: 'chengqi1943@gmail.com',
  founded: '2026 年 8 月',
  foundedIso: '2026-08',
  incubator: '大葉大學創新育成中心',
  slogan: '承時代之氣，掌機巧之運',
  intro: '我們把在地的節氣內容，轉譯成可以掃描互動、每年可以更換的年曆，並以模組化的流程，承接校園、企業與宮廟的客製版本。',
  team: [
    { name: '蕭聿程', role: '執行長', duty: 'WebAR 網站開發測試、對外聯繫' },
    { name: '王柏安', role: '資訊長', duty: 'AR 3D 建模、資料庫與平台建置' },
    { name: '黃品鈞', role: '財務長', duty: '經費控管、資料彙整與圖像生成' },
  ],
  advisor: { name: '陳縣綉', role: '指導老師', duty: '大葉大學資訊工程學系助理教授' },
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
    ['進駐', c.incubator],
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
    ...(c.foundedIso ? { foundingDate: c.foundedIso } : {}),
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
.sub{color:var(--muted);margin:-8px 0 20px}
.grid3{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr))}
.mini{padding:24px}.mini h3{font-family:var(--serif);font-size:20px;margin:0 0 8px}.mini p{margin:0;color:var(--muted);font-size:16px}
.role{display:inline-block;font-size:13px;color:var(--muted);letter-spacing:.1em;margin-bottom:4px}
@media (max-width:760px){.grid3{grid-template-columns:1fr}}
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
dd a{display:inline-flex;align-items:center;min-height:24px}
footer{border-top:1px solid var(--line);padding:24px 0 40px;color:var(--muted);font-size:14px;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
footer a{display:inline-flex;align-items:center;min-height:24px}
/* 手機：品牌獨佔一列不換行，導覽在下一列、放不下就橫向捲（不可換成兩行擠在一起） */
@media (max-width:560px){header{flex-wrap:wrap;gap:4px;padding:16px 0 8px}.brand{white-space:nowrap}
  nav{width:100%;display:flex;overflow-x:auto;margin:0 -12px;scrollbar-width:none}nav a{padding:0 12px;white-space:nowrap}
  .prod{grid-template-columns:1fr}.prod img{width:56px;height:56px}dl{grid-template-columns:1fr;gap:2px}dd{margin-bottom:10px}}
@media (prefers-reduced-motion:reduce){.btn{transition:none}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="/"><img src="/favicon.svg" alt="" width="32" height="32">${esc(c.name)}</a>
    <nav aria-label="主要導覽"><a href="#product">產品</a><a href="#custom">客製合作</a><a href="#team">團隊</a><a href="#company">公司資訊</a></nav>
  </header>

  <main>
    <section class="hero">
      ${c.slogan ? `<span class="eyebrow">${esc(c.slogan)}</span>` : ''}
      <h1>${esc(c.name)}</h1>
      <p class="lead">${esc(intro)}</p>
    </section>

    <section id="product" aria-labelledby="h-product">
      <h2 id="h-product">產品</h2>
      <article class="card prod">
        <img src="/logo.svg" alt="" width="72" height="72">
        <div>
          <h3>機巧時運 · 2027 二十四節氣曆</h3>
          <p>一本掃得動、每年換的節氣曆</p>
          <ul>
            <li>24 張節氣主視覺，每張約兩週；桌曆本體即文具收納盒，曆芯每年可換</li>
            <li>掃描節氣圖案：3D 動畫與語音導覽，接著是知識卡與互動問答</li>
            <li>線上國民曆與節氣知識庫：每日宜忌、二十四節氣、當令食材</li>
          </ul>
          <div class="acts">
            <a class="btn primary" href="/app">開啟機巧時運</a>
            <a class="btn ghost" href="/AR">掃描節氣卡片</a>
          </div>
        </div>
      </article>
    </section>

    <section id="custom" aria-labelledby="h-custom">
      <h2 id="h-custom">客製合作</h2>
      <p class="sub">AR 與視覺流程都是模組化的——換一組內容，就是另一個版本。</p>
      <div class="grid3">
        <article class="card mini"><h3>校園版</h3><p>二十四節氣是國中小既有教學單元。以學校的植物與在地內容做成可掃描互動的節氣教材。</p></article>
        <article class="card mini"><h3>企業禮贈</h3><p>年節贈禮與 ESG 專案，可加印企業標誌。</p></article>
        <article class="card mini"><h3>宮廟民俗</h3><p>換成宮廟的神祇、文物與祭典，做成信眾與參訪者帶得走的年度商品。</p></article>
      </div>
      <div class="acts" style="margin-top:20px">${c.email ? `<a class="btn primary" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('客製合作洽詢')}">洽詢客製</a>` : ''}</div>
    </section>

    ${c.team?.length ? `<section id="team" aria-labelledby="h-team">
      <h2 id="h-team">團隊</h2>
      <div class="grid3">
        ${c.team.map(m => `<article class="card mini"><span class="role">${esc(m.role)}</span><h3>${esc(m.name)}</h3><p>${esc(m.duty)}</p></article>`).join('')}
      </div>
      ${c.advisor ? `<p class="sub" style="margin-top:20px">${esc(c.advisor.role)}：${esc(c.advisor.name)}（${esc(c.advisor.duty)}）</p>` : ''}
    </section>` : ''}

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
