# CLAUDE.md — 機巧時運 專案導覽（先讀這份，通常不必逐檔掃描）

> 「機巧時運」是**智慧互動國民曆 × 節氣攝影社群 × AI 時光顧問**的虛實整合原型。
> 本檔是給 AI 代理／開發者的**單一入口**：架構、指令、慣例、雷區都在這；細節見 `docs/`。
>
> **★ 要改東西時，先開 [docs/檢修地圖.md](docs/檢修地圖.md)**——那份是「**東西在哪裡**」（畫面／CSS 前綴／API 端點／全域狀態的座標表），
> 可以直接跳到那個檔案的那一段，不必把全站 34,704 行掃一遍。**本檔則是「改的時候會踩到什麼」**（雷區）。
> 順序：**檢修地圖找位置 → 在本檔搜同一個關鍵字看雷區 → 改 → 回去更新檢修地圖**。
> 檢修地圖有閘門（`scripts/check-map.mjs`，450 項）掛在 `npm run build` 上，過期會讓建置失敗。
> 最後更新：2026-07。若你改動了架構，請一併更新本檔與對應的 `docs/*`。

---

## 這是什麼

- **前端**：Vite 5 + React 18 SPA（`src/`），純 ESM（`package.json` 有 `"type":"module"`）。
- **後端**：Node/Express + better-sqlite3 + bcryptjs（`server/`），真實帳號認證（非 mock）。
- **狀態**：單一 React Context（`src/store/nav.jsx`），無 Redux、無 react-router。
- **後端 DB**：正式＝**Cloud SQL PostgreSQL**（`pg`）；本機無雲端時自動退回 **SQLite**（`better-sqlite3`，optional dep）。同一套 async 介面＋同份 `server/schema.sql`（見 `server/db.js`）。
- **資料**：**社群內容已資料庫化**——貼文/作品/留言/按讚/追蹤/通知/訂單皆真實存 DB、可持久化（`mock.js` 降為**種子來源**＋離線 fallback）。**曆算為確定性演算**（`almanac.js`）。仍模擬：金流。（社群登入 Google/LINE/Apple 的假按鈕已於 2026-07 移除——只有 Email 註冊登入。）
- 目標用途：募資／提案／使用者測試展示，並已備妥 Cloud Run + Cloud SQL 全端部署（見 `docs/部署-CloudRun-PostgreSQL.md`）。

---

## 如何執行

需求：Node 18+（建議 20）。首次先 `npm install`。

| 指令 | 作用 | Port |
| --- | --- | --- |
| `npm run dev` | 前端開發（Vite，HMR） | 5173 |
| `npm run dev:lan` | 同上但綁到區網（手機可連）。⚠️ **`/AR` 在區網 IP 下開不了相機**——`getUserMedia` 只在安全內容（HTTPS／localhost）可用，症狀是「相機打不開」不是「掃不到」。要在手機上用相機測 AR，Android 走 `chrome://inspect` 的 USB 埠轉發讓手機看到 `localhost:5173`（那才是安全內容），iPhone 只能部署。見 [docs/指令集.md](docs/指令集.md) §3.4 | 5173 |
| `npm run dev:server` | 後端開發（`node --watch`） | 8080 |
| `npm run build` | 打包前端到 `dist/` | — |
| `npm run preview` | 預覽打包結果 | 4173 |
| `npm run start` / `npm run server` | 正式：node 同時 serve `dist/` + `/api` | 8080（`PORT`） |
| `npm run seed` | 把 `mock.js` 內容灌入資料庫（可重入） | — |

- 開發時 `vite.config.js` 把 `/api` proxy 到 `http://localhost:8080`（同源 → Cookie 正常）。要測登入需**同時**跑 `dev` 與 `dev:server`；首次跑 `npm run seed` 灌內容。
- 正式環境只跑 node：`server/index.js` 偵測到 `dist/` 存在就 serve 靜態檔 + SPA fallback（非 `/api` 一律回 `index.html`）。
- **DB 選擇**：設了 `DATABASE_URL` 或 `INSTANCE_CONNECTION_NAME` 或 `DB_HOST` → PostgreSQL；否則本機 SQLite（`server/data/auth.db`）。`GET /api/health` 會回目前驅動 `{db:"pg"|"sqlite"}`。
- **測試帳號（僅限本機開發）**：`newuser@example.com` / `secret12345`（一般使用者）；`admin@jiqiao.local` / `admin12345`（管理者，可進「設定→管理後台」改角色/內容）。皆由 `seed.js` 建立。
  ⚠️ **正式環境（`NODE_ENV=production`）不會用這些固定密碼**：admin 密碼改由 `ADMIN_PASSWORD` 環境變數指定；未指定時 `seed.js` 隨機產生並**只在部署 log 印出一次**（務必當場抄下）。`ADMIN_EMAIL` 亦可覆寫。這是避免「文件寫死的密碼」變成正式站後門。
- 預覽驗證：`.claude/launch.json` 已設定 `dev`(5173)/`preview`(4173)。桌機視覺驗證因內建截圖畫布上限，建議用 claude-in-chrome 連真 Chrome 或 `preview_eval` 量測 DOM。

---

## 目錄地圖（重點檔）

```
chengqi-main/
├─ index.html              進入點：favicon/OG/theme-color/apple-touch-icon、外部 theme-init.js
├─ vite.config.js          base './'、/api → 8080 proxy
├─ Dockerfile              全端：node build → node runtime（serve dist + /api）
├─ public/
│  ├─ favicon.svg          印章 logo（SVG）
│  ├─ theme-init.js        掛載前套用記住的主題（避免 FOUC，符合 CSP）
│  └─ _redirects           Netlify 用（Cloud Run 無效）
├─ src/
│  ├─ main.jsx             掛載：<ErrorBoundary><NavProvider><App/>
│  ├─ App.jsx              主框架：主題 fab、WebNav/WebFooter(桌機)、device、root/stack 路由、AuthWall
│  ├─ styles.css           全站樣式（token 驅動；改 token 即全站換裝）★大檔
│  ├─ api.js               API 用戶端（credentials + x-csrf-token）：認證＋內容（posts/works/comments/like/follow/content）
│  ├─ hooks/useApi.js      ★內容 fetch hooks：useContent(kind,fallback)/usePosts/useWorks（DB 為源，fallback 防破版）
│  ├─ components/AnimatedText.jsx  動態文字：打字機/卡拉OK/霓虹彈跳/經典（純 CSS/JS）
│  ├─ components/VerifyBanner.jsx  未驗證 Email 橫幅（重寄＋就地驗證）
│  ├─ components/LocationPicker.jsx ★地點：OSM 搜尋(代理)＋目前位置(Geolocation)＋地圖預覽(代理圖磚)＋常用位置
│  ├─ screens/Camera.jsx   ★相機工作室：拍攝(單點照/長按錄)/版面拼貼/建立限動/滑動濾鏡/經典濾鏡+強度/特效庫/搖晃顯影/動態文字（純瀏覽器 API）
│  ├─ screens/Admin.jsx    ★管理後台：使用者角色(admin)＋內容 CMS(moderator+，改 ref_items JSON)
│  ├─ store/nav.jsx        ★全域 Context：主題/使用者/路由/所有互動狀態 → 見 docs/狀態與資料.md
│  ├─ data/
│  │  ├─ mock.js           ★種子來源＋離線 fallback（原「所有示範資料」；DB 內容由此灌入）→ 見 docs/狀態與資料.md
│  │  ├─ lunisolar.js      ★真實農曆／節氣／日干支（Meeus 朔望月＋太陽視黃經，零相依）
│  │  ├─ bone.js           袁天罡秤骨骨重表（年/月/日/時四柱，農曆）
│  │  ├─ match.js          生肖三合六合沖害刑＋星座元素配對
│  │  ├─ termGuide.js      ★24 節氣生活資料庫（當令農產/漁獲+產地、俗語、應景食物、慶典、花期、養生、開運色）
│  │  └─ almanac.js        任意日期生國民曆日頁（dayFor/monthCells，錨點 6/6，示範演算）
│  │                        ★todayOffset() 讓 App 開在真實今日；dayFor 回傳完整傳統項目（三柱干支動態年份/建除/星宿/彭祖/胎神/沖煞歲數/財喜貴方位/十二時辰/特殊日）；另 export yearOverview
│  ├─ lib/
│  │  ├─ speak.js          ★語音導覽（Web Speech API 零相依）：切短句避開 Chrome 15 秒看門狗、挑中文語音、離開必 cancel
│  │  └─ shareCard.js      ★成果圖卡（純 canvas 1080×1080 零素材）＋ Web Share／下載三段 fallback
│  ├─ components/
│  │  ├─ ui.jsx            共用：TopBar / TabBar / ToolRow / Switch / SectionHead / Disclaimer / Toast
│  │  ├─ Icon.jsx          內嵌 SVG 線條圖示系統（P 物件查表）
│  │  ├─ WebNav.jsx        桌機頂部導覽列（≥900px）
│  │  ├─ WebFooter.jsx     桌機頁尾（≥900px）
│  │  ├─ AuthWall.jsx      登入牆（訪客下單/上傳時彈出）
│  │  └─ ErrorBoundary.jsx 全站錯誤邊界（單元件崩不整頁白屏）
│  └─ screens/
│     ├─ registry.jsx      ★ ROOTS[5] + SCREENS{} 畫面對照表 → 見 docs/畫面地圖.md
│     ├─ AlmanacDay.jsx    完整國民曆日頁（dayFor → 全部傳統項目）
│     ├─ YearAlmanac.jsx   年度總覽卷首（yearOverview → 太歲/地母經/犯太歲/凶方）
│     ├─ AppendixScreens.jsx 附錄工具：食物相剋/度量衡/干支對照
│     └─ *.jsx             40+ 個畫面
├─ server/
│  ├─ index.js             ★Express：所有 /api 路由（認證＋社群內容＋參考內容）+ 安全中介層 + serve dist（全 async）
│  ├─ seo.js               ★逐頁 meta 注入／真 404 路由表／sitemap（CSR 的爬蟲補救）
│  ├─ db.js                ★資料層抽象：pg(Cloud SQL) / better-sqlite3 後備；async get/all/run/exec，`?`→`$n`
│  ├─ schema.sql           ★可移植 DDL（pg/sqlite 皆可）：users/sessions/tokens/audit_log/orders/posts/comments/post_likes/works/follows/notifications/ref_items
│  ├─ seed.js              ★種子：把 mock.js 灌入 DB（作者/貼文/作品/留言/通知/ref_items），冪等
│  ├─ mailer.js            dev 只 log 連結（無真 SMTP）
│  └─ data/auth.db         本機 SQLite 檔（DATA_DIR 可覆蓋；正式用 Cloud SQL 不產生此檔）
├─ deploy/deploy.sh        ★Cloud Shell 一鍵：建 Cloud SQL → 種子 → 部署 Cloud Run（見 docs/部署-CloudRun-PostgreSQL.md）
└─ docs/                   ★詳細文件（見下方索引）
```

---

## 渲染與路由模型（自製路由，無 react-router）

- 路由 = **分頁（tab）+ 畫面堆疊（stack）**，都在 `nav.jsx`。**每個畫面有自己的網址**：`nav.jsx` 內 `TAB_PATHS`／`SCREEN_PATH` 把畫面對應到路徑（如 `scan`→`/AR`、`postDetail`→`/post/:id`、`explore`→`/explore`），用 History API 雙向同步：導覽時 `pushState`、上一頁/下一頁 `popstate` 還原、直接輸入網址（deep-link）由 `routeFromPath` 解析成 tab+stack。**改畫面路徑改 `SCREEN_PATH` 即可**；`:param` 由 `push(screen,{param})` 的 props 帶入。**`vite.config.js` 的 `base` 必須是 `'/'`**（相對 `'./'` 會讓 `/post/p1` 這種深層路徑載不到 assets）。server 已對非 `/api` 路徑回 `index.html`（SPA fallback），deep-link 才不會 404。
- `App.jsx`：
  - 未登入 → 只渲染 `<Auth/>`（全站守門）。
  - 已登入 → `ROOTS[tab]`（5 大分頁根畫面）+ 若 `stack` 有值則疊上 `SCREENS[top.screen]`。
  - 桌機（≥900px 且登入）額外渲染 `<WebNav/>`（頂部列）與 `<WebFooter/>`。
  - 根畫面包在 `.rootpane`（`display:contents`，對版面透明）；有堆疊畫面時 device 加 `has-stack` class。
- **導航方法**（`nav.jsx`）：`setTab(i)`、`push(screen, props)`、`pop()`、`popAll()`；四者都會 `window.scrollTo(0,0)`（桌機整頁捲動需回頂端）。
- 新增畫面：在 `src/screens/` 建檔 → `registry.jsx` 的 `SCREENS` 註冊 key → 用 `push('key', props)` 進入。

---

## 全域狀態（`src/store/nav.jsx`）

唯一的 Context provider（`useNav()`）。涵蓋：主題(localStorage)、使用者(後端 session)、tab+stack 路由、以及所有互動狀態（liked/saved/cart/orders/following/comments/balance/prefs/…）與 Toast、登入牆。**改全域行為先看這支**。完整清單見 [docs/狀態與資料.md](docs/狀態與資料.md)。

登入牆：`requireAccount(reason)` — 訪客/未登入回 `false` 並彈 `AuthWall`；已在結帳、發佈、購買、下單、加入購物車、按讚、留言、追蹤、檢舉、刪除、編輯個人檔案前呼叫。

**訪客模式（2026-07 全面稽核）**：`loginGuest()` 是**純前端狀態**（無 session cookie、`setCsrf(null)`），
所以後端天然安全——所有寫入 API 都有 `requireAuth`，訪客一律 401。已驗證會被擋下的操作：
按讚／留言／追蹤／檢舉／發佈／購買授權／編輯個人檔案／管理後台 API。
特性與刻意保留的行為：
- **重新整理即失效**（無 cookie），會回到登入頁——這是無 session 的必然結果。
- **AI 顧問**：訪客提問時 API 回 401，前端 fallback 到 `mock.js` 的 `aiReply` 示範腳本，
  **不會消耗 OpenAI 額度**。屬刻意設計（讓訪客能體驗介面）。
- **加入月曆（收藏）**：只存前端 localStorage，未擋（不寫後端，無副作用）。
- 直接輸入 `/admin` 網址：`Admin.jsx` 以 `canManage` 擋下顯示「僅限版主與管理者」
  （後端本來就 401，此為避免介面外露造成誤解）。

---

## 樣式與 RWD（`src/styles.css`）

Token 驅動；淺/深色以 `[data-theme]` 44 個 CSS 變數切換。三斷點：

| 斷點 | 版面 |
| --- | --- |
| **未登入 ≥560px** | 手機外框置中（`.stage:not(.signed-in)`，420px 框）——**只有登入牆那一頁** |
| **登入後 <600px** | App 滿版無框、底部分頁列 `.tabbar`、內部捲動 |
| **登入後 ≥600px** | **網站式**：`WebNav` 頂部列 + 整頁捲動 + `WebFooter`，`.tabbar` 隱藏 |
| **≥900px** | 在網站式的基礎上再開**多欄版面**（600–899 維持單欄，那個寬度排兩欄會太擠） |

⚠️ **登入後的網站版面斷點是 600px 不是 900px**（`styles.css` 那條 media query 的註解記著原因）：原本是 900，於是**平板直式全部落進「手機外框」那一層**——實測 820×1180 只用到 51% 寬度，中間一個 420px 的框、左右各 200px 死白。iPad 直式 810–834、Android 平板 800、iPad mini 744 全部中彈。所以**「560–899 是平板外框」這個說法對登入後的畫面已經不成立**，不要照著它改版面。

**⚠️ 斷點同時看寬度與高度**：平板/桌機的兩個斷點都是 `and (min-height:600px)`。只看寬度的話，橫向手機（844×390）寬度也 ≥560，會被當成平板而套用「手機外框」——實測變成中間 420×334 的小框、左右各 212px 灰邊，只用到 43% 螢幕。矮視窗（橫向手機）一律走滿版手機版面，另有 `@media (max-height:599px) and (min-width:431px)` 解除 `.device` 的 430px 上限讓它填滿。

桌機是**整頁捲動的網站**（非 App 內捲）：sticky navbar、內容直接坐在單一頁面上（無外框卡片＝避免頁中頁）、footer 落最後；各分頁多欄化（曆頁雙欄、探索/作品集 4 欄相簿、占卜/建立/我的工具列雙欄卡片、作品詳情雙欄商品頁）。細節、class 詞彙表、雷區見 [docs/樣式與RWD.md](docs/樣式與RWD.md)。

---

## 後端與認證（`server/`）

真實認證：伺服器端 session 存 SQLite、HttpOnly+SameSite=Strict Cookie、CSRF header、bcrypt cost12、速率限制、帳號鎖定、防列舉、helmet CSP/HSTS、GDPR 刪帳/匯出、RBAC。
**密碼規則**：至少 8 碼且需同時含大小寫英文（`server/index.js` 的 `passwordError()`，前端鏡像在 `src/lib/password.js`，兩邊文案必須一致）。**只在設定新密碼時檢查**（註冊／重設／變更）——登入僅比對雜湊，因此收緊規則不會把既有帳號鎖在門外；`seed.js` 的測試密碼不符新規則但仍可登入。端點表、schema、安全設計、限制見 [docs/後端-認證.md](docs/後端-認證.md)。

---

## ★★★★ 2026-10-04 根目錄改為承氣有限公司官網，App 整個搬到 `/app/`（`/AR` 不動）

使用者指定：chengqi.tw 變成**承氣有限公司**官網，機巧時運是公司的產品；`/AR` 必須保持原樣。

| 網址 | 內容 |
| --- | --- |
| `/` | 官網（`server/corporate.js`，伺服器直接吐的獨立 HTML，不載 App） |
| `/app`、`/app/…` | 機巧時運（原本所有頁面） |
| `/AR`、`/ar/model/:slug`、`/ar/card/:slug` | **留在根目錄**（實體卡片已印出、`qrFallback` 認這些網址） |
| 舊網址 `/almanac/day/…`、`/post/1`、`/verify-email`、`/?date=…` | **301** 到 `/app/…`（保住 Google 排名與已寄出的信） |

- **★★★★ 路由表維持「App 內部的邏輯路徑」，不可把 `/app` 寫進去。** `SCREEN_PATH`（paths.js）與 `ROUTES`（seo.js）仍是 `/post/:id`；前綴只在**網址進出那一層**加減：產生網址走 `toPublic()`、解析網址走 `toLogical()`（`src/data/appBase.js`）。這樣伺服器裡上百處 `p === '/post/:id'` 與 check-nav 的三方比對一行都不用改。
  - 前端進出口：`nav.jsx` 的 `buildPath`／`hrefForTab`／`pathFromState`／`routeFromPath`。後端進出口：`seo.js` 的 `matchRoute`（先 `toLogical` 再比對）。
  - ⚠️ **按位置取網址片段的地方要先 `toLogical`**：`pathname.split('/')[1]` 加了前綴會整個錯位（seo.js 擇日頁的 kind 就是這樣，已修）。
  - ⚠️ **手寫的絕對網址要自己加 `/app`**：信件連結（`${APP_URL}/app/verify-email`）、RSS、IndexNow、widget、`seo.js` 首屏靜態層的 `href`、sitemap 的 loc、`manifest` 的 start_url／shortcuts、`robots.txt`、各畫面 JSON-LD 的 `https://chengqi.tw/app/…`。新加這種網址時一律用 `hrefForScreen`（前端）或 `toPublic`（後端）。
- **`appBase.js` 必須住在 `src/data/`**：Dockerfile 只把 `src/data` 帶進正式容器，放 `src/store` 伺服器會 import 失敗、整個服務起不來。
- **官網的公司資料（`server/corporate.js` 的 `COMPANY`）沒給的欄位一律 `null`，畫面直接不顯示**。絕不可先填「看起來合理」的統編、地址、英文名——官網上的公司資料是對外正式聲明。也不可顯示「待填」（一部署就公開）。
- 官網不可有 inline script（CSP `scriptSrc 'self'`），本來也不需要 JS。
- 開發模式（vite 5173）打開 `/` 會直接進 App 首頁——官網只由 node 伺服器提供（`npm run build && npm start` 才看得到）。
- Windows 本機 `/AR` 會被轉成 `/AR/`（檔案系統不分大小寫，撞到 `dist/ar/`），是既有行為；正式站 Linux 不會。

## ★★★ 2026-09-09 全站視覺推翻：「宣紙／墨／朱紅印章」→「編輯奢華」（soft-skill）＋ 全站禁用 emoji

使用者指定：推翻原有 UI 風格、只動 UI/UX 不動功能；方向是**高端代理商感（陰影、動效豐富）**，
不要極簡扁平、也不要任何軍規終端味；**嚴令去除 emoji**。做法是換掉設計系統本身，兩層：

| 層 | 檔案 | 做什麼 |
| --- | --- | --- |
| Token | `src/styles/tokens.css` | **變數名全留、值全換**：奶油畫布 `#FDFBF7`、濃縮咖啡 `#2B2118` 文字與實心主鈕、髮絲線 `rgba(43,33,24,.08)`、四組粉彩（底）＋墨色（字）：鼠尾草綠／陶土紅／灰藍／蜂蜜黃、圓角 10/14/20/26、**雙層擴散環境陰影**、彈簧曲線 `cubic-bezier(.32,.72,0,1)` |
| 元件重塑 | `src/styles/theme-luxe.css` | **最後載入**的覆蓋層：雙層嵌套卡片（奶油外殼 6px ＋ 白內核 ＋ 上緣高光）、膠囊主鈕、列項尾端箭頭裝進圓形托盤、浮起的玻璃膠囊頂列（桌機）、眉標式 `.sech`、5% 紙紋顆粒固定層、hover 浮起 4px、捲動進場 800ms 上浮 |
| 文字 | `src/lib/text.js` | `stripEmoji()`／`hasEmoji()`／`glyphOf()`：執行期防線 |

**新規則（取代下方 2026-07 那一節的色票與 2px 直角；字級／間距／觸控／焦點／reduce-motion 沿用）**：
- **★★★★ 全站禁用 emoji，三道防線缺一不可**：① 原始碼 codemod 已清空（`src/**` 與 `server/index.js` 的字串字面值，733 個字元）；② **執行期** `stripEmoji()` 用在所有印出資料庫或模型字串的地方（`ToolRow` 標題／副標、通知文字、AI 回覆 `stripMd`）——正式站 DB 的 ref_items／posts／users.avatar 仍是帶 emoji 的舊資料；③ `Avatar` 元件：真圖片 → 線條圖示名稱（新版頭像選項是 `user/branch/wave/…`）→ 名字首字 `.av-glyph` → 人像圖示，**任何 emoji 字串一律不印**。縮圖沒圖時一律 `<Icon name="image" className="ph-ic">`；生肖／神明／花期／節氣的圖示改成**字形磚**（`.glyph`：該字本身的襯線字）。★☆✓✕ 這類排版符號不算 emoji，星等仍用它們。
  - ⚠️ codemod 的教訓：字串掃描器遇到**未終止的引號**（regex 裡的 `'`）會把開頭引號重複寫到檔尾，`AIChat.jsx` 因此多出一個反引號、build 只報「matching.js 沒套用到」這種完全無關的錯（因為主建置早在第 41 個模組就停了）。**codemod 跑完一定要用 esbuild 對全部檔案做語法檢查**，不要相信 vite 報的第一個錯。
  - ⚠️ codemod 順手做的「連續空白收斂」把 694 行註解縮排與對齊空白改掉了——已用「與 HEAD 逐行比對、只差空白就還原」補回。**改字串內容的 codemod 不要順手動空白。**
- **顏色是稀缺資源**：主色＝濃縮咖啡，靠字重、膠囊、陰影建立層級；粉彩只給語意（宜綠／忌紅／資訊藍／提醒黃）。品牌三色整套作廢；`--cinnabar` 名字留著但值是咖啡色。
- **雙層嵌套（double-bezel）是卡片的標準寫法**：`border:6px solid var(--color-shell)` ＋ `background-clip:padding-box` ＋ `box-shadow: 0 0 0 1px var(--line), var(--shadow-md), var(--inset-hi)`。它**不改任何盒尺寸邏輯**（只是 border 變厚），所以站規裡的版面雷區全部不受影響。
- **陰影是環境光不是投影**：一律 `--shadow-sm/md/lg`（-14~-28px 內縮、≤28% 不透明、雙層）。不可寫 `rgba(0,0,0,.3)` 這種硬影。
- **主鈕膠囊、標籤膠囊、卡片 26px、元件 14px**。不再寫 `2px`。
- **動效曲線一律 `--e-out`（.32,.72,0,1）**，不用 linear／ease-in-out；hover 浮起 4px、按下 .985（站規既有）。
- **效能**：紙紋顆粒是 `position:fixed; pointer-events:none` 的 `body::after`，**不可加 `mix-blend-mode`**（整頁混色每幀重算，實測截圖直接逾時）；`.reveal` **不可加 `filter:blur`**（多元素同時模糊是最貴的 paint）。`backdrop-filter` 只在 sticky／fixed 元素（`.wn-inner`、`.tabbar`、`.sheet-mask`）。
- **實心底＋白字一律 `--primary`／`--pfg`**（深色模式反轉為奶油底＋咖啡字）。
- ⚠️ **theme-luxe.css 只改外觀，絕不改版面尺寸邏輯**。要改版面仍去 `styles.css`。
- **★★★ 深底變體的按鈕配色，兩個主題都要量——這個坑 2026-09-09 又從相反方向踩了一次**：`styles.css` 的 `.coverbig.oracle .cta`（權重 **0,3,0**）把文字色鎖成 `--oracle-fg`，比 `theme-luxe.css` 的 `.coverbig .cta`（0,2,0）高，**後載入也蓋不掉**。而新版把 `.cta` 改成「實心 `--primary` 底」之後，深色模式的 `--oracle-fg` 與 `--primary` **剛好是同一個奶油色** ⇒ 對比 **1.00**、按鈕變成一片空白膠囊。⚠️ **淺色模式碰巧沒事**（奶油字在深咖啡底上 15.5），所以只驗淺色完全看不出來。修法是在 theme 層補一條同權重的 `.coverbig.oracle .cta`，不要去跟權重硬碰。（那條規則上方的註解早就警告過同一件事，只是上次是「深藍字在深藍底」，這次是「奶油字在奶油底」。）
- **★★★ 「文字太靠邊」＝權重打架打了一半：一半被覆寫、一半沒有（2026-09-09 使用者回報）**：桌機（≥900）的 `.yiji` 是**刻意做成透明包裝層**的（`.stage.signed-in .yiji { border:none; background:transparent; padding:0 }`，真正的卡片是裡面宜／忌兩欄）。而 `theme-luxe.css` 把 `.yiji`（0,1,0）一起列進雙層嵌套清單時，**`border`／`background`／`padding` 被那條 (0,2,0) 打回透明，`border-radius` 與 `box-shadow` 卻沒有被覆寫** ⇒ 畫面上是「一個有陰影的圓角空盒，裡面的文字只縮排 2px、幾乎貼著圓角」。
  - ⇒ **把一個 class 加進共用的外觀清單之前，先 grep 它有沒有更高權重的既有規則。** 只覆寫一半的結果不是「沒生效」（那還好查），而是**兩套設計混在一起的畸形**。
  - 修法：桌機把 `.yiji` 的卡片外觀收乾淨（`box-shadow:none; border-radius:0`），改把雙層嵌套給真正的兩欄；手機的 `.yiji` 本來就是真卡片，所以這一段只寫在 ≥900。
- **★★★ 宜忌 chip 的**字級**也不可以看「有沒有詞條」——`font: inherit` 是簡寫，會連字級一起換掉**（2026-09-09）：`styles.css:2424` 的 `button.ty.glossable { font: inherit }` 原意只是「按鈕要繼承字體家族」（按鈕預設不繼承），但 `font` 簡寫會把 **`font-size` 一併重設成繼承自父層＝18px**，而它的權重 (0,2,1) 蓋過 `.ty` (0,1,0) ⇒ **有詞條的 chip 18px、沒詞條的 13px**，實測手機 38 vs 29px。
  - ⚠️ **桌機碰巧看不出來**：≥900 的 `.stage.signed-in .yiji .ty`(0,3,0) 又把兩者壓回 15px。**只驗桌機完全發現不了**——與 oracle 那顆按鈕（只驗淺色發現不了）是同一種「單一情境驗不出來」。⇒ **改共用元件的配色或字級，桌機／手機、淺色／深色四個象限都要量。**
  - 收斂到 `--text-xs`(15px)：宜忌是必讀內容，不該用 `--text-2xs` 那階（token 註解寫明「僅限非必讀資訊」）。
- **★★ 宜忌 chip 的高度不可以看「這個詞有沒有詞條」**（2026-09-09）：`GlossTerm` 在有詞條時渲染 `<button>`、沒有時渲染 `<span>`，於是只有 button 吃到全域 `min-height:44px` ⇒ **同一列出現 44px 與 34px 兩種高度**（實測「安床(44) 療病(34) 除服(34) 求嗣(44)」擠在同一行），看起來像排壞了——而「有沒有詞條」對使用者是完全隨機的。`.ty`／`.tn` 本來就屬於 reset.css 豁免名單裡那種緊湊 chip（`.chip`／`.tm`／`.lp-chip` 都已豁免），只是漏掉了。豁免後 49×34（桌機）／29（手機），仍遠高於 AA 的 24×24。
- **★★★★ 加進 `npm run build` 的任何腳本，都必須能在「容器建置情境」下活下來——否則會擋掉正式部署（2026-09-09 實際事故）**：`check-map.mjs` 要讀 `docs/檢修地圖.md`，但 **`.dockerignore` 與 `.gcloudignore` 兩層都排除了 `docs`**（文件不需要進映像檔）。於是本機一切正常、`npm run build` 六道全過，而 Cloud Run 上：讀不到檔 → ENOENT → 退出碼 1 → `npm run build` 失敗 → `docker build` 失敗 → **部署整個失敗**。使用者連續數次部署都沒上去，而且**症狀只有「正式站沒更新」**，本機完全重現不出來。
  - ⇒ **文件型／開發輔助型的閘門，絕不可以有能力擋掉正式部署。**
  - ⇒ 但也**不能無腦「檔案不在就跳過」**——那樣地圖被改名或刪掉時本機也會靜默放行，正好毀掉這支檢查存在的意義。用「**目錄在不在**」區分兩種情境：`docs/` 整個不存在 ⇒ 容器建置（刻意排除）⇒ 印一行原因後跳過；`docs/` 在、地圖檔不在 ⇒ 真的被改名刪掉 ⇒ 照常失敗。三個分支都要實測過。
  - **新增建置閘門時的自我檢查**：它讀的每一個路徑，是否都不在 `.dockerignore`／`.gcloudignore` 裡？（目前六道閘門讀的是 `src/`、`server/`、`public/`、`package*.json`、`node_modules`——`npm ci` 在 `COPY . .` 之前跑，所以容器裡有 node_modules。只有 `docs/` 是被排除的。）
  - **驗法（不必真的 build docker）**：`tar` 一份套用 ignore 規則的複本到暫存目錄，在裡面跑 `npm run build`。這次就是這樣在三分鐘內定位並證明的。
- **★★★★ 全域 44px 觸控規則會「撐高元素」但不會「把內容擺到中間」——這個坑已經現形三次（2026-09-09 第三次）**：`reset.css` 的 `button, a[href] { min-height:44px }` 是為了達到觸控目標，但它對純文字連結會製造兩種**視覺上完全不同、量盒子都驗不出來**的錯位：
  1. **元素是 inline ⇒ `min-height` 直接無效**。麵包屑 `.crumb a`（26×17）、商店標題 `.st-name`（21px 高）都是這一種。⇒ 補觸控大小時**一定要同時改 `display`**。
  2. **元素是 block／inline-block ⇒ 高度有了，但文字只佔頂端一個行框**，下面空一截 ⇒ 文字比同一列的其他東西**高 9~11px**。頁尾 `.wf-links a`（−8.8px，使用者回報「不水平」）、`.td-more`、`.st-more`、`.ad-daylinks a` 都是。⇒ 要 `display:inline-flex; align-items:center`。
  - ⚠️★ **量盒子驗不出第 2 種**：實測頁尾品牌與每一顆連結的 rect **全部置中於 cy=44**，看起來完美對齊；錯位的是「盒子裡的文字」。**一定要用 `Range.selectNodeContents(textNode)` 量文字節點本身**，不是量元素的 `getBoundingClientRect()`。
  - 重跑這個掃描的方法：對每個 `a[href]`／`button`，若 `display` 是 block/inline-block、且有直接的文字節點，就比對「文字節點中心」與「元素中心」，差 >4px 即為受害者。實測 12 頁一次抓出 4 個。
  - ⚠️ `.td-more` 另有一個**獨立的靜默失效**：它寫了 `min-height:24px` 想縮小，但 `a[href]`（0,1,1）的權重比 `.td-more`（0,1,0）高 ⇒ 那一行從來沒生效過。**想覆寫全域觸控規則的話，選擇器權重要先算過。**
- **★★ `.ic` 是 `display:block`，所以「文字旁邊的行內圖示」一定要自己補 `display:'inline-block'`**（2026-09-09）：`styles.css` 的 `.ic{display:block}` ＋ `reset.css` 的 `svg{display:block}` 會讓圖示**自己佔一行**，把旁邊的文字擠到下一行——首頁「問 AI 時光顧問」那顆按鈕因此高 67px（正常 52px），而畫面上只看得出「按鈕怪怪的很高」。站上有 7 處寫了 `verticalAlign` 表示想當行內用，先前只有 `LocationPicker` 補了 `display:'inline-block'` 才是對的，其餘 5 處都在換行。⚠️ **不可把 `.ic` 全域改成 inline-block**：多數圖示在 flex 容器裡（`.tool`／`.tabbar`／`.wn-icon`），改了會多出行內基線的空隙。
- **★★★ 頁面過長／一直要捲（2026-09-09 使用者回報）——先量「頁高 ÷ 視窗高」再改，三個槓桿依序用**：
  1. **垂直節奏**：奢華感來自層次與陰影，不是把每一格撐高。`theme-luxe.css` §8 把上一版撐出來的收回：區塊標題 74→40、工具列卡片 108→~74、封面卡 211→~150、底部呼吸 48→20。
  2. **桌機橫向空間**（`theme-luxe.css` §9，`≥1200px`）：工具列改**三欄**（6 欄格、每顆 span 2；餘 1 佔 6、餘 2 各佔 3，不留洞——⚠️ 有／沒有 `.sech` 標題時 `nth-child` 的餘數判斷不同，且必須**先把 styles.css 的雙欄奇偶補滿規則原樣列出來歸零**，否則權重較高的舊規則會殘留「第 4 顆被撐滿」）；曆書頁的今日宜忌卡與 AI 占卜卡並排；**首頁改真雙欄**（曆頁 600px 在左、作品與三組入口在右）。
  3. **內容搬家**（JSX）：首頁三組入口（擇日／術語／節氣）從 `.feed-main` 移到 `.feed-side`——原本左欄 1,222px、右欄 289px，雙欄根本不平衡。手機端兩層都是 `display:contents`，只是順序變成「曆頁 → 作品 → 挑戰 → 入口」；連結一個都沒變（`homeFallback()` 仍一致）。
  - 實測 1440×900：首頁 2.0→**1.1** 倍、曆書 2.1→**1.3**、`/me` `/settings` 1.4、`/quiz` 1.3、探索／建立／神佛 1.0；手機 375 各頁降 10–20%（首頁 2.9→2.6、曆書 2.8→2.3）。**閱讀型頁（節氣專文 2.5 倍）與完整曆頁（1.7）刻意不再壓**——那是內容本身的長度，壓字級或藏內容只會傷可讀性。

## 樣式系統（2026-07 整修後的規則）

> ⚠️ 下面這一節的**色票（品牌三色）、2px 直角、「不可用 emoji 當圖示」**已於 2026-09-09 被上面那一節取代（emoji 現在是全站禁用，不只圖示）；字級／間距等其餘規則仍有效。

> **2026-07-28 換色與去紋**：底色從宣紙米改**純白**（`--paper-100:#FFFFFF`），並移除全站紙紋（1px 週期的 repeating-gradient 在白底會摩爾紋化成方格紙）。品牌色改為使用者指定三色，角色依 WCAG 對比分派，**不可互換**：
>
> | 色 | 白底當文字 | 白字在其上 | 墨字在其上 | 角色 |
> | --- | --- | --- | --- | --- |
> | `#123962` 深藍 | 11.75 ✓ | 11.75 ✓ | 1.22 ✗ | **主色**：按鈕實心底、連結、焦點、印章 |
> | `#39C5BB` 青綠 | 2.13 ✗ | 2.13 ✗ | 6.76 ✓ | 點綴填色（宜、chip）；當文字要用 `--teal-ink #17756F` 5.51 |
> | `#E07227` 橙 | 3.18 ✗ | 3.18 ✗ | 4.52 ✓ | 點綴填色（忌、讚、星等底）；當文字要用 `--orange-ink #A85513` 5.28 |
>
> - **`--cinnabar` 這個名字留著但值已是深藍**（styles.css 有上百處引用）。它是「文字色」用途；深色模式會提亮成淺藍 `#6E9CD2`。
> - **「實心底＋白字」一律用 `--primary`（=`--color-brand-solid`）不可用 `--cinnabar`**：深色模式的 `--cinnabar` 是淺藍，白字只有 2.86。這個坑一次踩了 14 處（`.chip.on`/`.go`/`.calpage .hd`/`.seg.on`/`.ct-opt.on`/各種 seal）。
> - **`--gold`／`--go`／`--heart` 是填色用的原色橙**；當文字用會掉到 3.18。文字要用 `--gold`（已指向加深版）——`.stars`/`.feat .dot`/`.luck .s`/生肖分數/挑戰剩餘天數都曾中彈。
> - **`--yi`/`--ji` 當底時的字色用 `--on-yi`/`--on-ji`**：淺色模式那兩個變數是加深版（配白字），深色模式是提亮版（配墨字），**方向相反不可寫死 `#fff`**。
> - **深底變體要單獨檢查文字色**：`.coverbig.oracle` 底是深藍，而通用的 `.coverbig .cta{color:var(--cinnabar)}` 也是深藍 → 實測對比 1.00 完全看不見。`.bt/.bd` 有 oracle 覆寫，只有 `.cta` 漏了。
> - favicon 用**橙底＋深藍鏤空標誌**：深藍底在深色分頁列只有 1.37（幾乎看不見），橙底 5.06／2.42 是三色裡唯一兩種瀏覽器色系都可辨的。

| 項目 | 規則 |
| --- | --- |
| **字級** | **一律用 token**（`--text-2xs` ~ `--text-4xl` 共 9 階），**JSX 的 inline `fontSize` 也要用 `'var(--text-*)'` 不可寫數字**——寫死 px 的地方不會隨 token 縮放，放大字級時會被留在原地（2026-07-28 一次改掉 110 處）。整修前 273 處寫死 px、34 種數值、同屏達 20 種字號。2026-07-28 全階放大一級：**內文 18px、輔助 15px、最小 13px**（`--text-2xs` 僅限徽章／角標）。`--text-4xl`(72px) 刻意不放大——那級是 emoji 佔位與裝飾字，再放會撐破固定高容器。 |
| **圖示** | **不可用彩色 emoji 當 UI 圖示**（Windows 上是 Segoe UI 卡通圖，與紙感氣質斷層）。用 `Icon.jsx` 的 45 個線條圖示，`<ToolRow iconName="…">`／`Empty` 元件皆支援。DB 的 `ref_items` 工具列也改存 `iconName`。使用者內容的 emoji（作品縮圖佔位、頭像選項）不在此限。 |
| **間距** | 用 `--space-*`（4px 基準）。整修前散落 36 處 `13px` 這種奇數值。 |
| **色票** | `--tone-1~6` 是紙感淡染（宣紙／竹青／黛藍／藕紫／蜜柑／赭石），**不可放回 IG 粉彩**（`#DCFCE7` 薄荷綠、`#DBEAFE` 嬰兒藍等——紙上不會出現螢光色）。 |
| **朱紅配額** | 朱紅是「印章色」，力量來自稀少。**主要行動**（發佈／購買／確認）用朱紅；**節氣相關的次要元素**用 `--season-hue`。整修前首頁有 11 個朱紅元素互搶焦點、占卜頁只有 1 個。 |
| **節氣換裝** | `nav.jsx` 依真實節氣在 `<html>` 掛 `data-season`（春柳綠／夏朱／秋金／冬黛，以傳統四立為分界），`--season-hue` 全站自動輪替。**只換第二點綴色，朱紅主色全年不動**（品牌識別必須一致）。 |
| **深色紙紋** | 只留**單向**細紋且透明度更低。雙向 `repeating-linear-gradient` 在深色會呈現「方格紙」狀。 |
| **漸層** | 紙感語言中**印刷不會有漸層**。整修後全站已無 UI 漸層（靛青占卜卡改黛藍紙底＋金線雙框）；僅存霓虹特效那類刻意的創作特效。 |

## 動效（2026-07-29 依動效銳評整批補上）

整修前：1,237 行 CSS 只有 7 個 transition，其中 5 個是開關／進度條／快門這種功能件；
主要瀏覽動線（翻日、切分頁、開詳情、按讚、切主題）**全部瞬間硬切**。現在的規則：

| 項目 | 規則 |
| --- | --- |
| **時長** | 一律用 `--m-fast`(.13s 按壓/hover/開關)／`--m-base`(.26s 進場/分頁)／`--m-slow`(.44s 撕曆/印章/揭曉)。**不要每支各寫各的秒數**——同畫面出現 4 種速度，體感會「散」。 |
| **曲線** | `--e-out`(進場收斂)／`--e-spring`(回彈：指示條、開關)／`--e-in`(離場加速)。 |
| **按壓分級** | `.tap` 預設 `scale(.92)`；**大面積元素（`.tool`/`.coverbig`/`.railcard`/按鈕）改「輕縮 .985 ＋ 換底／壓亮度」**。340px 寬的 ToolRow 縮 10% 等於整條塌 34px，看起來像壞掉不像回饋。 |
| **招牌動作** | 翻日＝**撕曆**（`.calpage.tear-next/prev`，rotateX 在 38%→39% 翻面）；成功＝**蓋印章**（`setStamp()` → `StampMark`，用在註冊/發佈/下單/掃描辨識）。**⚠️ 翻日只能由上方 ‹ › 與日期選擇器觸發，切勿再加「曆頁上下滑翻日」**——實測手指稍微碰一下或想捲頁面就換日期；曆頁佔滿整個版心又位在頁面中段，垂直滑動本來就是「捲動」的意思，綁成翻日等於跟瀏覽器預設手勢搶輸入，調高門檻只會讓誤觸更難預測。 |
| **reduce-motion** | 全域 `*` 覆蓋已涵蓋所有新動畫，不必逐支處理。**但功能性指示要給靜態替代**：`.typing` 三點改顯示「思考中…」、`.scan-line` 直接隱藏（全域 `animation-iteration-count:1` 會讓它們凍結在某一格，看起來像壞掉）。 |

**動效雷區（每一條都是實測踩到的）**：

- **動畫只負責「怎麼出現」，不可負責「是否存在」**：絕不可寫成「基礎樣式 `opacity:0` ＋ keyframes 只定義 `to`」——動畫一旦沒執行（列印、UA 停用動畫、在 `display:none` 容器內掛載、某些 WebView），內容就**永久隱形**，而且是靜默的（版面在、文字在、就是看不見）。要寫成 `animation: x .34s both` ＋ keyframes 同時定義 `from`/`to`，讓基礎樣式保持可見。實測舊寫法在動畫停用時有 15 個元素消失（宜忌 chip、三柱干支、吉日星等、AI 回覆本文）。
  - **元素越大，可見性越不該依賴動畫**：`.rootpane > .body` 與 `.screen` 裝著整頁內容，它們的進場**只動 `transform` 不動 `opacity`**——最壞情況只是偏移 8px，永遠看得見。小元件（chip／星等／訊息）才可以用淡入，因為失效只影響那一個。
  - **`animation-play-state:paused` 絕不可用 `*` 全站套**：一次性的進場動畫被暫停在 0% 就等於內容消失（實測整個內容區變 opacity 0）。只列出真正無限循環的那幾支（seasonGlow／sealBreath／ui-pulse／scanmove／blink…）。暫停一次性動畫本來也沒有省電意義。
  - 例外是 **transition 驅動**的 `.reveal`：它的基礎必須隱形才有東西可過場，但 class 由 JS 加上，所以「JS 沒跑 ⇒ 沒有 class ⇒ 內容正常顯示」，失效方向是安全的。**切勿把 `.reveal` 寫進 JSX 的靜態 className**，那就變成「JS 沒跑就永久隱形」。
- **載入中不可顯示空狀態**：`usePagedList` 的 `loading` 初值必須是 `true`（元件掛載後一定會發首次請求）。若從 `false` 開始，第一幀是「loading=false 且 items=[]」，呼叫端會判成「沒有資料」而顯示「找不到任何作品」——在資料還在路上時就跟使用者說這裡是空的，對剛起步的社群是最糟的第一印象。載入中請用 `.ui-skeleton` 骨架（同時預留版面）。
- **每一條 `:hover` 都要包 `@media (hover:hover) and (pointer:fine)`**：觸控裝置沒有真正的 hover，點一下之後狀態會**黏住**直到點別處——使用者會看到某張卡莫名一直亮著。全站 27 條（含 `styles/components.css` 的 9 條）都已包好，新增時別漏。
- **捲動位置：`push` 歸零、`pop`/`setTab`/`popstate` 還原**（`scripts/check-nav.mjs`，7 項，掛在 build 上）。底部分頁列的心智模型是「五個並排的房間」，不是五條瀏覽紀錄，每次回來被丟回門口很惱人。**2026-08-10 實測發現這個功能其實從來沒生效過**，五個獨立的 bug 疊在一起，而且每一個的症狀都只是「返回後回到頁首」——與「本來就沒做這個功能」無從分辨，所以沒有人會回報：
  - **★★ `remember()` 絕不可放進 `setState` 的更新函式裡**。原本寫成 `setStack(s => { remember(tab, s.length); return [...] })` 後面接 `writeScroll(0)`。**React 在 render 階段才執行更新函式**，而 `writeScroll(0)` 是當下就跑的——順序是「先歸零、後記憶」，記下來的**永遠是 0**。要在 dispatch 之前用 ref 讀堆疊深度。（另一個獨立理由：更新函式必須是純函式，React 可能為了併發重跑它，副作用會執行不只一次。）
  - **★★ `scroller()` 不可只判斷「元素存不存在」**：捲動容器隨斷點而變——手機是 `.body`（`overflow-y:auto`），桌機是**整份文件**（`.stage.signed-in .body { overflow:visible }`）。只寫 `querySelector('.device .body')` 的話桌機拿到一個**永遠捲不動**的元素，讀永遠是 0、寫又順手把 window 捲到 0。要檢查 `getComputedStyle(el).overflowY`。實測 1280×720：`.body` 的 `scrollHeight − clientHeight = 0`，而 `documentElement` 是 2165 − 720。
  - **★ popstate 處理函式裡曾經呼叫 `scrollTop()`——一個根本不存在的函式**，每按一次上一頁/下一頁就丟 ReferenceError。它活這麼久是因為 throw 發生在三行 `setState` 之後，畫面照樣切過去。
  - **重試的 `setTimeout` 排程不可放在 rAF 回呼裡**：分頁在背景時 rAF **完全不觸發**（實測 `visibilityState:'hidden'` 下 300ms 內一次都沒跑），排在裡面等於整個還原一次都不會發生。計時器先排、rAF 只當快路徑。
  - **不可用「容器沒那麼長」提前判定成功**：那與「頁面還沒 fetch 完、還沒長高」當下分辨不出來，一提前收工就永遠停在頁首。一律把 80/200/400ms 三次重試排完，真的量到位才提前清掉。
  - 另兩個既有的雷仍然成立：**手機捲的是 `.device .body` 不是 `window`**（`window.scrollTo` 對它完全沒作用）；**還原不能只做一次**（切分頁時 `.body` 整個重掛，貼文/作品是 fetch 回來才長高）。
  - 驗證方式：捲到 600 → 點站內連結進子頁（應為 0）→ 上一頁（**應回到 600**）→ 下一頁（應為 0）。`check-nav.mjs` 已做過變異測試，三個主要檢查各自都抓得到對應的錯誤寫法。
- **浮層退場中一律 `pointer-events:none`**：遮罩淡到看不見但節點還在時，它照樣蓋住全畫面吃掉點擊——使用者會覺得「有時候按不動」，而畫面看起來完全正常，不會被回報成 bug。另外 `animationend` 在**分頁切到背景時不保證觸發**，`SheetMask` 另有 300ms 硬性 fallback。
- **`will-change` 不可常駐**：只掛在 `.calpage.tear-next/prev` 這種「正在動」的狀態上；常駐會讓該元素永久佔一張合成圖層白吃記憶體。大角度 3D 翻轉另需 `backface-visibility:hidden`（中低階 Android 會閃現反轉文字）。
- **JS 驅動的動畫要自己讀 reduce-motion**：CSS 的全域覆寫碰不到 `setInterval`。`AnimatedText` 的打字機就漏過——使用者開了「減少動態」文字還是一個字一個字跳。（karaoke/neon 走 CSS animation，會被全域覆寫接住。）

- **新增 CSS 變數前先 grep 有沒有撞名**：動效 token 原本叫 `--t-fast/--t-base/--t-slow`，但 `tokens.css` 後面有一整排 `--t-*` 是**字級**的舊別名，`--t-base: var(--text-base)` 定義在後面直接覆蓋掉 → 所有 260ms 的動畫讀到 `1.125rem`（無效值）而**完全沒有過場**。撞名不會有任何錯誤訊息，只會安靜地失效。現已改名 `--m-*`。
- **`.rootpane` 是 `display:contents`，動畫掛上去完全無效**（不產生盒子）。分頁進場動畫要掛在真正有盒子的 `.rootpane > .body`。
- **`translateX(百分比)` 是相對「元素自己的寬度」不是父層**：底部分頁指示條若做成 24px 寬再 `translateX(100%/6)`，位移只有 4px（24÷6），看起來像原地抖一下。作法是把指示條做成**一格寬**（`100%/6`），`translateX(100% × 序號)` 剛好一格，那條 24px 短線用 `background-position:center` 畫在格子裡。
- **CSS transition 做不出「從 0 揭曉」**，三種寫法都失敗（詳見 `ui.jsx` 的 `Meter`）：(1) `useState`+`rAF`——effect 在 commit 後 paint 前跑，rAF 也在同一幀被吃掉，瀏覽器沒畫出 0 那一格，結果是從「上一個分數」滑過去；(2) 寫 0% ＋ reflow——transition 還開著時寫 0% 是「開始一段往 0 的過場」，下一行寫真值時起點還在舊值；(3) 關 transition→寫 0→reflow→開 transition→寫真值——起點對了但瀏覽器仍以 `transition:none` 當變更前樣式，寬度直接跳到終點。**正解是改用 `animation` ＋ React `key` 重掛載**：keyframes 自己定義起訖，沒有「變更前樣式」這回事。
- **曲線太前傾等於白做**：`cubic-bezier(.22,1,.3,1)` 在 1s 動畫裡 **80ms 就跑到終點**，動畫確實有跑但看起來仍是瞬間就位。揭曉類要用 easeOutCubic `cubic-bezier(.33,1,.68,1)`。
- **捲動進場只掃一次會掃到空 DOM**：作品／貼文是 fetch 回來才渲染的，切頁當下 `querySelectorAll` 找不到任何卡片（實測探索頁 12 張一個都沒被觀察到，整頁進場失效）。要配 `MutationObserver` 補掃後來出現的節點。
- **「有進場沒離場」是最常見的半套動畫**：使用者記住它是滑上來的，就預期它滑下去。Toast／Sheet 都改成「播完離場動畫才卸載」——Toast 自己保留最後一則內容，6 個 sheet 統一走 `SheetMask`（render prop 把 `close()` 交給內容，內部的 ✕ 鈕才能一起播）。**遮罩與面板的離場時長必須一致**，遮罩先結束會把面板攔腰卸載。
- **`onAnimationEnd` 要濾 `e.target === e.currentTarget`**：子元素的動畫會冒泡上來，不濾就會提早卸載。
- **無限循環動畫要能暫停**：`.atx.karaoke`/`.atx.neon` 是「每個字一條無限動畫」，一行 20 字＝20 條，`neonpop` 還在動 `text-shadow`（純 paint 最貴）。預設 `animation-play-state:paused`，由 `IntersectionObserver` 在進入視野時才加 `.atx-play`。
- **動 `left`/`top` 每幀都要重算版面**，`transform` 只需 GPU 合成。掃描線是無限循環又疊在即時 `<video>` 上，最不該浪費主執行緒——已改 `translateY(100cqh)`（`.scan-frame` 設 `container-type:size`），並用 `@supports` 對舊瀏覽器保留動 `top` 的退路。
- **主題切換用 View Transition API 圓形擴散**：`toggleTheme(ev)` **要把事件物件傳進去**（圓心＝按鈕被按到的位置）；不支援的瀏覽器（Firefox）與 reduce-motion 自動退回瞬切。CSS 必須關掉 `::view-transition-old/new(root)` 的預設交叉淡入，否則圓形遮罩邊緣會糊掉。
- **量「置中」不要拿 `innerWidth/2` 當基準**：`position:fixed` 元素只涵蓋 layout viewport（不含 15px 捲軸），中心會差半個捲軸寬＝7.5px，會被誤判成沒置中。
- **稽核重疊時只能量「最上層」**：手機上 `.screen` 是 `position:absolute` 蓋在 `.rootpane` 上，兩層一起量會把「疊在下面的首頁」全判成重疊（實測 34 頁跑出上百筆假警報）。另外 `.body` 是 `overflow:auto`，捲出可視範圍的元素其 rect 仍在原處，也要排除。

## 慣例與雷區（改動前務必知道）

- **水平內距全站統一 `var(--space-4)`（16px），不可再寫 12/13/14/15**：整修前 `.pad`14／`.sech`14／`.tool`14／`.opt`14／`.strip`14／`.railhd`15／`.thumbs`12／`.aicard`15／`.sumcard`14 加上 JSX 裡十幾處 inline 12/13，同一頁會出現 3~5 條不同的內容左緣＝「看起來不對稱」。現在只剩 0（滿版列）／16（版心）／24（空狀態）／32（卡片內文＝16 margin＋16 padding）。
- **「扣掉左右 margin」的寬度不可寫死數字**：`.note` 與 `.coverbig`／`.ad-more` 原本寫 `calc(100% - 26px)`（假設左右各 13），但 margin 是 `var(--space-4)`＝16、兩側共 32 → 右緣少扣 6px，實測「左 16 / 右 10」的不對稱。一律寫 `calc(100% - var(--space-4) * 2)`，或乾脆拿掉 inline width 讓 flex stretch 自然對稱。
- **量對稱要相對「容器」不是「視窗」**：桌機內容卡置中於 1440 且有 15px 捲軸，用 `innerWidth - rect.right` 量會把每個元素都判成不對稱（238/254）。要用 `body.getBoundingClientRect()` 當基準，且雙欄（grid）版面本來就一左一右，要排除。
- **手機 RWD 的四個必檢項（2026-07-28 修）**：
  1. **安全區要「外加」不可「內扣」**：`.tabbar` 是 border-box，寫死 `height:62px` 再加 `padding-bottom:env(safe-area-inset-bottom)`，iPhone（安全區 34px）內容區只剩 27px，圖示 26＋標籤 13 直接放不下＝底部列被擠扁。要用 `height:calc(62px + env(safe-area-inset-bottom))`。
  2. **輸入框字級 <16px 會讓 iOS 聚焦時自動放大整頁**（版面被推歪）。`--text-xs` 是 15px 剛好踩線。已加全域保險 `input/textarea/select { font-size:max(16px, var(--text-sm)) }`（原本只有 `max-width:360px` 那個斷點裡對 `.field input` 做，一般手機沒被保護到）。
  3. **viewport 要有 `interactive-widget=resizes-content`**：否則手機鍵盤彈出時 `100dvh` 不會縮，鍵盤直接蓋住底部輸入列。**絕不可加 `user-scalable=no`／`maximum-scale`**（禁止雙指放大＝無障礙失敗）。
  4. **觸控目標 ≥24×24**（WCAG 2.5.8 AA）。留言的讚曾是 19×19、刪除 ✕ 16×30。**用 `min-width/min-height` 撐大本體，不要用 `::after` 擴張隱形點擊區**——實測 40×40 的擴張區會與相鄰按鈕重疊（讚 ↔ 刪除重疊 6×37、還蓋到送出鈕），反而更容易點錯。
- **`.body` 是 flex column，子項一律要 `flex-shrink:0`（已加全域規則）**：flex 項目預設 `flex-shrink:1`，內容總高超過容器時（會捲動的頁面幾乎都是）**每一列都會被壓到自己的 min-height，但文字不會跟著縮 → 溢出去疊到下一列**。實測「我的」頁：列內容需 60px、被壓成 44px（全域觸控規則的 `min-height`），標題與上一列副標重疊 10px＝使用者看到的「文字堆疊在一起」。字級放大前內容剛好 ~44px 所以一直被蓋著沒發現。
  - **必須連 `display:contents` 的包裝層一起列**（`.ex-top/.ex-main/.ex-side`、`.feed-main/.feed-side`）：CSS 的 `>` 比對 DOM 不是盒模型，`.body > *` 只選到包裝層本身，選不到裡面那些真正變成 flex 項目的卡片（探索頁挑戰卡就這樣被壓成 44px／需要 108px）。
  - **稽核要查「文字重疊」**：溢出、裁切、觸控大小這三項都驗不出這個 bug——`overflow:visible` 不會被判為裁切、頁面也沒有橫向溢出。要兩兩比對含文字節點的元素矩形是否相交。
- **`.body` 內含 `overflow:hidden` 的區塊要加 `flex:0 0 auto`**，否則被壓成 0 高。
- **按鈕點開的覆蓋層／面板必須自己限高並可捲**：`.sheet`(max-height `min(82dvh, 100dvh-48px)`)、`.fmenu`(45dvh)、`.glosspanel`(40dvh) 皆已設定。**上限不可用「視窗高減固定值」**——面板起點取決於頂列/搜尋/選單列的實際高度，會隨字級與斷點變化（實測橫向 390px 時固定扣 140px 仍超出 61px），要用 dvh 比例。**也不可用 `flex:1 1 auto` 讓它自動填滿**——`.body` 是 flex column，空間不足時 `flex-shrink` 預設 1 會把面板壓成 0 高（實測高度 0、內容溢出 78px），必須 `flex:0 0 auto`。
- **`.sheet` 絕不可用 inline `style` 覆寫 `maxHeight`／`paddingBottom`**：那會蓋掉樣式表的 `min(82dvh, 100dvh-48px)` 與 `env(safe-area-inset-bottom)`。實際踩過兩處：`Scan.jsx` 的 `maxHeight:'92%'`（橫向貼底會超出）、`AuthWall.jsx` 的 `maxHeight:'unset'`（直接取消上限，內容一多就溢出視窗）。高度與安全區一律交給 `.sheet` 樣式。
- **`.lp-map` 地圖預覽不可用固定高**：原本 184px，手機橫向時搜尋結果的捲動區只剩 72px（地圖看得到但選不到地點）。改 `clamp(120px, 24dvh, 184px)`，矮視窗另壓到 100px 並給清單 `min-height`。
- **入場動畫的終態要與靜態樣式一致並加 `forwards`**：`slideup` 原本 `to{transform:none}` 且無 fill-mode，動畫被中斷或未推進時元素會停在 `from` 的 `translateY(24px)`，底部彈出的 sheet 露出視窗外。
- **★★★ `/AR` 於 2026-08-11 整層重寫，程式在 `src/ar/`（舊的 `src/lib/mind*.js`＋自研追蹤那一串全部刪除）。**
  分四層，邊界是硬的——**每一層都不知道相鄰層的實作**，這是刻意的，因為這個功能歷來最貴的 bug 全部是跨層的：

  | 檔案 | 職責 | 不知道什麼 |
  | --- | --- | --- |
  | `src/ar/cardSpace.js` | 卡面座標換算、熱區命中、遲滯 | 純函式，什麼都不知道（可直接 node 測） |
  | `src/ar/camera.js` | 拿到一路可用的後鏡頭串流 | 不知道 AR、不建立 `<video>` |
  | `src/ar/tracker.js` | 包住 MindAR `Controller`，吐矩陣 | **不知道 three** |
  | `src/ar/stage.js` | three 場景，吃矩陣畫東西 | **不知道相機與 MindAR** |
  | `src/ar/session.js` | 狀態機，唯一知道全貌的地方 | — |
  | `src/screens/Scan.jsx` | 畫面，是 `phase` 的**純函式** | 不碰 getUserMedia／three／MindAR |

  閘門是 `scripts/check-ar.mjs`（100 項，含變異測試）。
  - **★★★ 為什麼不再用 `MindARThree`**：舊版把上游 `mind-ar/src/image-target/three.js` **整份抄進專案再改 6 處**（`sRGBEncoding`、Controller 來源、拿掉 CSS3DRenderer、拿掉內建 UI、補 dispose、stop 防呆）。代價是它同時擁有 video／renderer／camera／anchor／resize 五件事，於是每個 bug 都跨層（畫面全黑、換鏡頭沒 resize），而且上游一更新就要人工比對改過哪幾處。**直接用 `Controller` 完全沒有這些問題**——它不 import three，所以 `sRGBEncoding` 那個相容性問題**從一開始就不存在**，一行上游程式碼都不用抄。
  - **★★★ 座標系是「推導」出來的，不再是「量」出來的**（這是這次重寫最大的收穫）。舊版走 `anchor.group` ＋ `postMatrix`，把卡片正規化成「寬 1.0、中心在原點」的單位空間，然後發現 y 與直覺相反，只好留下 `CALIB = { vSign: -1, outAxis: +1 }` 兩個「實測值，不可憑直覺改」的常數。**那兩個數字是那個設計自己製造出來的問題**。新版不用 `postMatrix`，直接把 `worldMatrix` 當物件變換，而它消費什麼空間在上游原始碼裡是寫死的（`controller.js` 的 `_glModelViewMatrix` 前乘了 `[1 0 0 0; 0 -1 0 h; 0 0 -1 0]`）：
    > **worldMatrix 的空間 ＝ 目標圖像素、原點左下、y 朝上、+z 離開紙面**（標準 OpenGL 右手系）

    ⇒ `uvToCard(u,v,W,H) = [u*W, (1-v)*H, 0]`。一個減法，沒有要記的符號。**`CALIB` 已刪除。**
  - **★★★ 一定要設 `<video>` 的 `width`/`height` 屬性**（`camera.attach()`）。MindAR 的 `InputLoader.loadInput` 是 `context.drawImage(input, 0, 0, input.width, input.height)`——`input.width` 讀的是**內容屬性**，屬性沒設時是 **0** ⇒ 畫一張 0×0 ⇒ **追蹤每一幀都在分析全黑畫布** ⇒ 永遠掃不到。而相機在播、心跳照跳、幀率漂亮、一個錯誤都沒有。`check-ar.mjs` 有專測（拿掉那兩行會紅）。
  - **★★★ 同源 worker 讓 AR 不再依賴 CSP**：上游 `controller.js` 用 `?worker&inline` 把 worker 內嵌成 **blob**，於是 CSP 必須放行 `worker-src blob:`，漏設時失效**完全靜默**（2026-08-10 正式站事故）。`tracker.js` 改用 `?worker`（不 inline）⇒ Vite 產出**同源的 .js**，`script-src 'self'` 本來就允許。⚠️ **必須在 `addImageTargets` 之前換掉**：`setup` 訊息（含 matchingDataList）是在那支方法裡才 postMessage 的，換晚了新 worker 收不到目標資料 ⇒ 永遠比對不出東西。⚠️ `server/index.js` 的 `workerSrc`/`childSrc` **仍要保留 blob:**（兩層一起才穩：這一層讓「設定漏了也能跑」，那一層讓「退回內建 blob worker 也能跑」）。診斷面板的「比對 worker」欄會顯示目前用的是哪一種。
  - **★★★ 狀態必須是單調的：終局狀態不可被非同步回呼覆蓋。** 這條是被真的 bug 逼出來的——`createStage()` 因為一行寫錯而拋例外 ⇒ catch 正確把 phase 設成 `failed`，**但追蹤器是獨立在跑的**，它幾秒後的 `onFound` 又把 phase 推成 `locked` ⇒ 畫面顯示「已對準：2027 小寒」，而根本沒有任何東西被算繪。`session.js` 用 `TERMINAL` 集合 ＋ `fatal` 旗標鎖住，離開只能靠重建 session。
  - **★★ `Object3D.position` 是唯讀屬性**：`Object.assign(light, { position: v })` 會丟 `TypeError: Cannot assign to read only property 'position'`。上面那個 bug 就是這樣來的。一律 `.position.set(...)`。
  - **★★ 疊層由 React 與樣式表決定，不由函式庫決定**：`<video>`／`<canvas>` 現在都是 Scan.jsx 渲染的，z-index 寫在 `styles.css`（video 0 → canvas 1 → 取景框 2 → 降級說明 3）。舊版讓 MindARThree 自己 `createElement` 再 `appendChild`，它預設 `z-index:-2`，而 `.scan-stage` 是有深色背景的 `position:relative` ⇒ **整片全黑**。⚠️ 這個 bug 從數字上完全看不出來：追蹤讀的是 video 元素的像素不是螢幕上的結果，所以「已對準」「熱區命中」「3D 有在算繪」全部量得到。**驗 AR 不能只驗數字，一定要真的看畫面**（判定法：暫時 `visibility:hidden` 掉 canvas，`document.elementFromPoint` 取景框中心必須是 `VIDEO`）。
  - **★★ 裁切修正取代了舊版的 `fovAdjust` 算術**：Controller 的投影矩陣涵蓋**整張輸入影像**，但畫面上的 video 是 `object-fit:cover`，長寬比不同時影像會被裁掉一部分。精確解：cover 縮放 `s = max(cw/iw, ch/ih)`，把投影矩陣**第 0 列**整列乘 `kx = iw·s/cw`、**第 1 列**乘 `ky = ih·s/ch`。⚠️ three 的矩陣是 column-major，第 0 列是索引 **0,4,8,12**、第 1 列是 **1,5,9,13**——寫成「行」的話橫向與縱向的修正會互換，在正方形畫面上完全看不出來。⚠️ 覆寫投影矩陣之後**絕不可**再呼叫 `updateProjectionMatrix()`。
  - **★★ 用 `ResizeObserver` 盯容器，不能只聽 window 的 resize**：容器變大變小不一定伴隨 window resize（手機捲動時網址列收合改變 dvh、上方內容載入把版面推開、鍵盤彈出）。而且容器一開始常常是 0×0（版面還沒算完），只做一次的話畫布會**永久**停在 three 的預設 300×150——實測就是這樣，症狀是 3D 只畫在左上一小塊。
  - **★★★ 即時特徵點計（`tracker.probeFeatures()`）是這一版給使用者的回饋迴路。** 舊版在「還沒認出來」時只能給罐頭提示，而使用者無從知道自己的調整有沒有讓情況變好。`controller.detect()` 回傳這一幀找到幾個特徵點，那是**直接量到的影像品質**：接近 0 ⇒ 相機畫面本身不可用（太遠／太暗／糊／反光）；幾百個卻還追不到 ⇒ 問題在角度或卡片版本。所以它顯示在狀態列上（`.scan-meter`），不是藏在診斷面板裡。⚠️ **只能用 `controller.detect()`，絕不可用 `match()`**：`workerMatchDone` 是**單一欄位不是佇列**，與處理迴圈同時送 `match` 會覆蓋前一個 resolver ⇒ 前一個 Promise 永遠不 resolve ⇒ 追蹤整個靜默卡死。`detect()` 走本地 TFJS 不碰 worker，可以安全並行。
  - **★★★ 心跳看門狗要判「心跳有沒有前進」，不可判「總數是不是 0」**：上游迴圈是 `await _detectAndMatch(...)` 而比對走 worker，worker 若是**跑了幾輪之後才死**（或某次 Promise 永遠不 resolve），總數會停在 1、2 這種非零小數字 ⇒ 「總數===0」的判準**永遠不會觸發** ⇒ 使用者看到「掃描中」跑到天荒地老而畫面上毫無異常。改成滾動偵測：心跳連續 12 秒沒前進才判 `stalled`。
  - **★★ 心跳速率（輪/秒）要顯示在使用者看得到的地方**，不可只藏在診斷面板：使用者回報「掃不到」時，只有這個數字能把「比對迴圈根本沒在跑（程式的問題）」與「迴圈在跑但認不出這張卡（卡片／目標檔的問題）」分開。
  - **★★ 特徵點數高 ≠ 卡片被看清楚**：`detect()` 數的是**整個裁切窗**裡的特徵點，桌面、筆電邊框、鍵盤、背景全部算進去。所以「特徵點 342 卻一直不命中」是完全可能的，文案**不可以**因此斷言「一定是版本不同」——那是會誤報的診斷。要如實列出三種可能（卡片沒佔滿畫面／鏡頭選錯／版本不同）。
  - **實測排除清單（2026-08-11，離線用真的 `.mind` ＋ 真的 Controller 跑）**：收邊版與未收邊原稿 **4/4 皆命中**；卡片佔畫面 95%／80%／60%／45% **全 4/4**；透視傾斜 0–35° **4/4**、45° 3/4；過曝 +60%、低對比 50%、模糊 2px、過曝＋傾斜 **全 4/4**。直向 960×1280、暗背景、收邊版、80% 填滿的完整端到端也是 **1.4 秒 lock 並跳轉**。⇒ 這些條件都**不是**掃不到的原因，不要再往這些方向猜。
  - **★★ 「畫面夠清楚 ＋ 迴圈在跑 ＋ 就是沒命中」時要自動跑自我測試**（`Scan.jsx` 的 `stuck`）：那個結果是把原因一刀切成兩半的唯一資訊（**裝置的辨識運算壞掉** vs **掃的圖與目標檔不同版**），而使用者不可能自己問得出來，也不該被要求去找按鈕。⚠️ 只跑一次（會暫停即時迴圈）。
  - **★★★ `stuck` 讀 `longSearch`，所以 `longSearch` 必須宣告在它之前**（TDZ）。順序顛倒會丟 `Cannot access before initialization`、**整頁被 ErrorBoundary 接走，而 `npm run build` 一個字都不會報**。這個坑在本專案已經咬過兩次（PostDetail 的 hook 順序、這裡），`check-ar.mjs` 已上閘門並做過變異測試。
  - **★★ JSX 的文字節點裡不可以寫 markdown 的 `**粗體**`**：`.scan-nofile` 是一般 DOM 不會 render markdown，星號會原樣印在使用者眼前。要用 `<b>`。（註解裡的 `**` 沒關係。）
  - **★★★ 「認出來」只看比對，不等上游的光流追蹤**（`tracker.js` 攔截 `_detectAndMatch`）。上游要判定「認出來了」其實有**兩道**關卡（`controller.js` 的 `startProcessing`）：① `_detectAndMatch()` 比對成功；② 接著**同一幀**馬上跑 `_trackAndUpdate()`（光流／模板追蹤），而且要連續 `warmupTolerance+1` 幀都成功，才會把 `showing` 設成 true、才會發出帶 worldMatrix 的 `updateMatrix`。
    ⇒ **比對成功但光流追蹤跟不上時，畫面上永遠不會有任何反應**：狀態列一直寫「掃描中」、心跳正常、特徵點正常，而它其實每一輪都認出來了。
    ⚠️ **這個失敗模式的離線測試完全看不到**——`check-ar` 與我所有手動實驗都只呼叫 `_detectAndMatch`，從來沒有跑過 `_trackAndUpdate`。所以「離線每種條件都 4/4、實機永遠掃不到」是**完全可能**的，不要再把離線全過當成「管線沒問題」。
    ⚠️ 這一版的動線**根本不需要追蹤**（認出一次就跳模型頁），所以直接繞過第②關：包住 `_detectAndMatch`，比對一成功就自己 `getWorldMatrix()` 並宣告 found。順帶讓辨識快很多（不必等暖機）。
    ★ 驗法（只能在瀏覽器做）：把 `Controller.prototype._trackAndUpdate` 覆寫成 `async () => null`（＝光流永遠失敗），舊邏輯**必定**永遠認不出來；新版實測仍 **1.5 秒認出並跳轉**。未打 patch 的正常路徑 2.2 秒。
  - **★★★ `selfTest` 必須呼叫「未被攔截」的 `origDetectAndMatch`**：上面那個攔截是「比對一成功就宣告認出來」，而自我測試餵的是**內建的卡面圖**——走攔截版的話，自我測試一成功就會讓 session 進入 `locked` 並跳去模型頁，**而使用者的卡片根本沒被認出來**。那是**假成功**，而且自我測試是自動觸發的（卡住時），所以會發生在「一直掃不到」的人身上——最不該被誤導的那群人。實測驗過：掃永遠不會命中的畫面 22 秒，自我測試通過但**不會**跳轉，網址仍停在 `/AR`。
  - **★★ 繞過 warmup 之後要自己把「防誤判」補回來**（`MATCH_CONFIRM = 2`）：上游的 `warmupTolerance` 身兼兩職——等光流穩定（我們不需要）**與去抖動**（我們需要）。只認一次比對就跳轉會把後者一起丟掉，而這條動線誤跳的代價是**直接把人送到另一頁**。設 2 只多花約 0.3 秒（實測每秒約 3~4 次成功比對）。
  - **`warmupTolerance: 1`／`missTolerance: 10`**：上游預設要**連續 6 幀**都追到才算認出（`DEFAULT_WARMUP_TOLERANCE=5`），手持低幀率下是很高的門檻，而暖機期間畫面完全沒有回饋，看起來就是「完全掃不到」。⚠️ 這**不是**調低比對門檻——MindAR 是 inlier 式判定，比對本身沒有分數可調；warmup 只是防抖。
  - **★★ 3D 角色錨在 `primary` 熱區，不可綁「目前選中的熱區」**：使用者最自然的動作是把整張卡擺在畫面正中央 ⇒ 中心落在「身體保健」區（那一區沒有 model）⇒ **白菜永遠不出現**，而卡面上白紙黑字印著「掃描主物件：結球白菜」。`check-ar.mjs` 用真的熱區資料算出「中心落在哪一區」把這個事實釘住。
  - **★★ 主 bundle 不可牽進 three/TFJS**：`Scan.jsx` 靜態 import `session.js`，所以 session **只能靜態 import 輕量模組**（camera／cardSpace）。實測不小心靜態 import 了 `stage.js`（只為了一個 `hasWebGL`），主 bundle 就從 **458 kB 變成 976 kB**。`tracker`/`stage` 一律 `await import()`，閘門有鎖。目前：主 bundle 460 kB／gzip 195、three 511 kB、`mindar-image.prod` 1,759 kB（都懶載入，且要相機真的開起來才下載）。
  - **★ 熱區重疊時取面積最小的**：卡面上大框套小框是常態（曆頁那一大條裡面還有臘八粥），取大的等於小的永遠點不到。
  - **離線驗證：假相機 ＋ rAF shim**。`canvas.captureStream()` 餵給 video。⚠️ 自動化環境 `visibilityState` 恆為 `'hidden'`、rAF 不觸發，而 MindAR 的處理迴圈每輪結尾是 `await tf.nextFrame()`（靠 rAF 解析）⇒ **迴圈停在第一輪**，而 video 在播、看起來一切正常。不補 shim 會誤判成「偵測不到」。⚠️ 換 `srcObject` 之後**一定要 `play()`**，否則影格永遠不更新、特徵點恆為 0——這一點在重寫的驗證過程中意外重現了一次，正是 `attach()` 裡那句 `play()` 存在的理由。⚠️ **完全平坦的灰底是退化輸入**：模板比對在零梯度畫面上會一直「追得到」，所以測「追丟」要用有紋理的畫面，不要用純色。
  - **2026-08-11 實測（正式 build ＋ CSP，375×812 行動視窗）**：1.5 秒內 `locked`；`<video>` 屬性 1280×960；取景框中心最上層是 `VIDEO`（無黑畫面）；畫布 468×751（＝375×601×1.25）；3D 白菜算繪出來且錨在 primary 熱區；熱區命中「身體保健」；特徵點計追丟時 0、正常距離 111；心跳約 43 輪/秒；worker 顯示「同源」。
- **★★★ CPU 運算後備（`src/ar/cpuPipeline.js`，2026-08-11）—— 給「特徵點抓得到、比對永遠 0 次」的 GPU。**
  **關鍵事實藏在上游原始碼裡**：`mind-ar/src/image-target/offline-compiler.js` 第 5 行 `import './detector/kernels/cpu/index.js'` ⇒ **`.mind` 裡那份特徵描述子是 CPU kernel 算出來的**；而執行期的 `detector.js` 第 5 行只 import `kernels/webgl/index.js`，跑的是同一套演算法的 WebGL 版。兩份「應該」一致，在絕大多數 GPU 上也確實一致，但那不是規格保證。一旦某台裝置的 WebGL 版算出**位置對、值不對**的描述子，症狀就是「特徵點 372 很漂亮、比對成功 0 次、自我測試也失敗」（Samsung Xclipse 540 / ANGLE on Vulkan 實測，**連 MindAR 官方原版範例 `/ar/plain.html` 在同一台上也失敗**）。⇒ 那就別用那顆 GPU 算，改用**編譯 `.mind` 時用的同一份 CPU kernel**。這不是繞過，是回到產生那份資料的參考實作。
  - **★★★ 先前「純 CPU 走不通，不要再試」的結論只對當時那個做法成立**（`tfjsCompat.js` 的舊註解）：那個實驗是 `?tfjsflags=HAS_WEBGL:false`，把 WebGL **整個拔掉**，Controller 建構當場就炸（`InputLoader` 建構式有 `backend.texData.get(...)`，CPU 後端沒有 `texData`）。它測的是「拔掉 WebGL 會不會壞」，不是「CPU kernel 能不能算」。正解是 **WebGL 留著**（建構期要用），只把 tfjs 的**運算後端**切到 cpu。
  - **順序是硬的**：`webgl 建構 → 換 inputLoader → 切 cpu → addImageTargets → dummyRun`。切早了 `InputLoader` 建構式 TypeError；切晚了目標 tensor 建在 webgl 上變孤兒；`disableOpticalFlow()` 必須在 `addImageTargets` **之後**（`controller.tracker` 到那時才存在）。`check-ar.mjs` 用「呼叫位置的先後」鎖住這四步。
  - **硬綁 WebGL 的只有三處，每一處都有現成替代**：① `InputLoader.loadInput`（`gpgpu.uploadPixelDataToTexture` ＋自訂 shader）→ 換成 `tf.browser.fromPixels().mean(2)`；② `Tracker.track/dummyRun`（光流）→ **直接停用**，這一版認出一次就跳頁本來就不需要追蹤，而上游對 `_trackAndUpdate` 回傳 null 的處理就是把 `isTracking` 設回 false，是它預期內的分支；③ `Detector` 看起來像 WebGL 專用，其實**早就全部改成 `tf.engine().runKernel(...)`**（11 處），舊的 `_compileAndRun` 全躺在註解裡——只差沒人去 import CPU 那份 kernel。
  - **★★ 灰階要用 `mean(2)`＝(r+g+b)/3，不可用 luma 權重**：那是**編譯器**的公式（`compiler-base.js`），而執行期 shader 用的是 `0.299/0.587/0.114`——兩者本來就不同（FREAK 是亮度**比較**式的，單調變換多半洗得掉，所以平常沒事）。既然走參考實作就一路走到底。
  - **★★★ 一定要降解析度，而且要等比例**。偵測器成本幾乎與像素數成正比，而**命中率幾乎不受影響**。離線實測（node、純 JS CPU 後端、同一張卡與 `.mind`，卡片佔畫面 85/60/40%，共 15 組**全中**）：1280×960 一幀 **12.3~14.3 秒**；800×600 5.2~5.9；640×480 3.6~4.0；512×384 2.2~2.8；400×300 1.9。特徵點只從 344 掉到 274。⇒ `CPU_PIXEL_BUDGET = 180000`（1280×960 → **490×368**），實測 490×368 在卡片佔 90/75/55/40/30% 共 10 組全中、每幀 1.5~1.7 秒。**慢到沒人等得下去，跟不能用是同一件事。** ⚠️ 長寬比必須保住：`stage.js` 的裁切修正用 video 長寬比算 kx/ky，投影矩陣卻來自 Controller 的 inputWidth/Height，兩者長寬比一旦不同 3D 就會與影像對不上。⚠️ 降解析度之後 `loadInput` **一定要縮放填滿**（`drawImage(input,0,0,W,H)`），照抄上游的 1:1 貼上會變成**只把畫面左上角送進偵測器**，而卡片幾乎一定在中間 ⇒ 永遠掃不到而且畫面上完全看不出來。
  - **★★★ 自我測試不可用固定睡眠等處理迴圈停下來**：`workerMatchDone` 是**單一欄位不是佇列**，迴圈那一輪還在等 worker 時再送一次 match 就會覆蓋掉前一個 resolver ⇒ 追蹤靜默死掉。原本的「`stopProcessVideo()` 之後睡 150ms」在 WebGL 上夠（一輪幾十毫秒），在 CPU 上**完全不夠**（一輪 3~8 秒）。改成用 `inFlight` 計數真的等它歸零，**並且要有上限**（迴圈真的死掉時死等會讓診斷永遠不回來）。
  - **CPU 上要放寬的三個常數**：`STALL_MS` 12 秒 → **45 秒**（否則把「正常但很慢」誤判成「比對迴圈卡死」，而那個畫面斬釘截鐵地說了一件不是事實的事）；`MATCH_CONFIRM` 2 → **1**（WebGL 上多確認一次只花 0.3 秒，CPU 上是多等一整輪；且 CPU 版 inlier 實測 29~137，門檻是 6，本來就更不易誤判——但**絕不可設 0**）；特徵點探測間隔加到 **6 秒**（它與比對迴圈搶同一條主執行緒，照 0.9 秒跑會讓辨識速度直接砍半）。
  - **升級路徑是自動的，不做成按鈕**：自我測試失敗在 `match`／`pipeline` ⇒ 自動 `switchBackend('cpu')` 再測一次，**兩次都失敗才算確定不可用**（才切 QR 模式）。它成立的前提是上游原始碼的實作細節，使用者不可能知道，也就不可能自己決定要不要按。診斷面板另有一顆手動按鈕，給「自我測試會過但實機一直不中」那種不在自動判準內的情況。
  - **★★ 要有 `testPending`**：effect 在 render **之後**才跑，少了它畫面會閃一下「圖像辨識沒救了，去用 QR」再跳回「檢查中」。那種閃動比慢更傷信任。
  - **★★ 只重建追蹤器，不重建 stage**：`stage.dispose()` 會 `forceContextLoss()`，同一張 canvas 之後不保證拿得回 context（那正是「第 N 次點開變成空白」那個坑）。而 `targetSize`/`projectionMatrix` 完全由「同一個 `.mind` ＋ 同一個影像長寬比」決定 ⇒ 重建後必定相同，本來就不需要動它。
  - **成本**：CPU 路徑要 import `mind-ar/src/…` 原始碼（才拿得到共用的 `tf` 實例；`dist/mindar-image.prod.js` 把 TFJS 包在自己裡面，呼叫不到 `setBackend`），所以會多出兩個懶載入分塊：`controller` 196 kB、`register_all_kernels`（TFJS）1,657 kB。**正常裝置永遠不會載到它們**；主 bundle 只 +1.2 kB。
  - **2026-08-11 實測（正式 build，假相機）**：WebGL 路徑不受影響（照常跳轉）；手動切 CPU 後診斷面板顯示「運算後端：CPU（相容運算，較慢）」、自我測試**第 1 幀 784 ms 通過**、心跳 1 輪/秒；把卡片放進畫面後 **3.36 秒**跳到 `/ar/model/2027-xiaohan`（含 900ms 跳轉延遲），模型 102 mesh／170,456 三角形／102 draw call 全部畫出。
- **★★★ 節氣知識王 `/quiz`（`src/screens/QuizGame.jsx` ＋ `src/data/quiz.js`，2026-08-16）**：三分鐘計時問答，兩種玩法（闖關生存／兩人對戰）。題庫與規則常數在 `quiz.js`（純資料＋純函式，之後要接 API 只換 `QUESTIONS` 的來源）；**正解一律寫在 `o[0]`，發題時才由 `dealt()` 洗牌**——這樣新增題目不必想「答案要放第幾個」，也不會手滑把索引寫錯。
  - **樣式一律沿用站內既有詞彙**（`.calpage`／`.tool`／`.chips`／`.yiji`／`.b`／`.sech`），只有血條與選項按鈕是站上沒有的才新增 `.qz-*`。對錯用通勝的宜綠 `--yi`／忌朱 `--ji`，當底色時字色用 `--on-yi`／`--on-ji`。
  - **★★ 計時器一定要在卸載時清乾淨**：這個畫面是 push 進堆疊的，使用者按返回就會卸載，而它同時有「每秒倒數」「模擬對手」「下一題」「血條殘影」四組計時器。沒清的話會對已卸載的元件 setState。實測對戰進行中離開，12 秒內零錯誤。
  - **★★★ 桌機的曆頁卡要用 `width: min(100%, 560px)` 另外指定**：全域那條 `.stage.signed-in .calpage { max-width:560px; margin:auto }` 在 flex column 裡會**關掉 stretch**（auto 邊界的必然結果），卡片於是收縮成內容寬——實測 1280px 下只剩 333px、四個選項擠成兩欄各 145px。這與「`.body` 用 max-width+auto 會縮成內容寬」是同一條規則的第二次現形。
- **★★★ 題庫擴充到 101 題並上閘門（`scripts/check-quiz.mjs`，2026-09-10）**：45 → 101（節氣 28／曆法 20／民俗 23／擇日 18／生肖 12）。
  - **★★★ 每一題都必須對得上站內既有資料，不可自撰**：神煞與術語 → `glossary.js`（那 10 條的 answer 是逐條查證過的）；七十二候與台灣實況 → `termArticle.js`；三合六合刑沖 → `match.js` 的常數；神明誕辰 → `deityArticle.js`（已對照台灣省城隍廟誕辰表）；日沖／建除／黃道 → `almanac.js` 的演算。⇒ **題目答錯了，站上一定有另一頁會打自己的臉**，而使用者一定會發現。這條紀律比「題目好不好玩」重要。
  - **★★ 干擾項要與正解等長、等具體**：正解明顯最長的話，不用懂也猜得到。擴充前實測有 **3 題**中此病（小滿／農曆新年／太歲），已一併修正，閘門會擋（正解是最長且比最短多 4 個字以上就紅）。
  - ⚠️ 干擾項不可「碰巧也是對的」：寫過一版「六十甲子為什麼是六十」，四個選項裡「十二乘以五」「十乘以六」算出來**都是 60**，只是不是那個推導 ⇒ 兩個選項都能自圓其說。改成「甲子的下一組是？」才乾淨。
  - **題庫是靜態查表，沒有演算法保護**——寫壞了不會有任何錯誤訊息，只會有使用者答到一題怎麼選都是錯的，而他不會來回報（同 `almanac.js` 納音與胎神那兩個 bug 的躲法）。閘門鎖住：選項數／重複選項／重複題目／tag 白名單／解說非空／正解不可明顯最長／markdown 星號／emoji；另外實跑 `dealt()` 2,020 次確認正解追蹤正確，以及 `seededDeck()` 同種子必然同牌（對戰兩邊拿到不同的牌是不會有任何錯誤訊息的）。**七項變異測試全部抓得到。**
- **★★★ 節氣知識王的樣式與動效（2026-08-16 重整）**：
  - **★★★★ 內容的進場只動 `transform`，不動 `opacity`**（`qzRise`）。原本用站上共用的 `riseIn`（`from{opacity:0}`）＋ `backwards` ＋ stagger 延遲 ⇒ 動畫一旦沒有推進（分頁在背景、UA 停用動畫、不合成畫面的環境），**題目與四顆選項全部永久隱形**，而且是靜默的：版面在、文字在，就是看不見。實測就是這樣（四顆 opacity 全 0）。站規早就寫著「元素越大、越是內容本體，可見性就越不該依賴動畫」，這一支是反例。
  - **★★★ `.qz-k` 的實心底改 `--primary`**：原本是 `--cinnabar` ＋ 白字，而深色模式的 `--cinnabar` 是淺藍 `#6E9CD2`，白字只有 **2.86**（AA 要 4.5）。這正是站上「一次踩了 14 處」的同一個坑，這裡是第 15 處；改 `--primary` 後 8.24。
  - **★★ 選項是大面積元素（343×48），不可套 `.tap` 預設的 `scale(.92)`**，要用「輕縮 .985 ＋ 換底」。整條塌 8% 看起來像壞掉不像回饋。
  - **★★ 時長一律用 `--m-fast/--m-base/--m-slow`**：重整前這一支自己寫了 `.16/.22/.32/.34/.38/.4/.42/.55/1s` **九種**速度，正是站規說的「同畫面出現 4 種速度，體感會散」。唯一保留的硬編碼是飄字的 `1s`（那是「飄上去再淡出」的完整弧線，壓到 .44s 會看不清數字），並在註解裡寫明理由。
  - **★★ 揭曉之後，沒被選中也不是正解的選項要退到 `opacity:.42`**：四顆維持同樣的視覺重量時，對錯反而讀不出來——揭曉的重點是對比。
  - **★ 成功用站上的招牌動作蓋印章**（`setStamp`）：撐過三分鐘＝「撐住了」、擊倒對手＝「勝」。註冊／發佈／下單／掃描辨識都用這個語彙，贏一場沒有理由自己另做一套。
  - ⚠️ 改模式代號時要全檔掃過：`makeFoe` 那條迴圈原本比對 `mode !== 'duel'`，把玩法改名成 `bot` 之後**練習對手完全不出手**，而畫面上一切正常（血條就是不動）。
- **★★★★ 節氣知識王的「兩人對戰」是**真人對戰**（2026-08-16）**：`quiz_matches` 表 ＋ 四支端點（`/api/quiz/queue｜match/:id｜answer｜leave`）。模擬對手降級成獨立的「練習對手」玩法。
  - **★★★★ 狀態存 DB，不存記憶體。** Cloud Run 會水平擴展，兩個玩家的請求不保證落在同一個實例上——房間放記憶體在本機單一實例測起來完全正常，一上正式站就變成「兩個人各自在不同的房間裡對打」，而且沒有任何錯誤訊息。（與 session 從 SQLite 改成 Cloud SQL 同一個理由。）
  - **★★★ 為什麼是輪詢不是 WebSocket**：① 專案沒有 `ws` 相依，而加相依前要先確認它沒有 git 來源（EALLOWGIT 那個坑）；② 就算加了，WebSocket 連線一樣綁在單一實例上，跨實例還是得靠 DB；③ 每人每分鐘只有幾個動作，1.2 秒一次的輪詢完全夠用。
  - **★★★ 兩邊必須拿到同一副牌**：`seededDeck(seed)`（純函式，mulberry32）把題目順序**與每題的選項順序**都由伺服器發的種子決定。用 `Math.random` 各洗各的就不是同一場比賽了。
  - **★★★ 傷害與勝負一律由伺服器判定**：前端只送「第幾題、選了哪個」，不送「我贏了」。只認「下一題」（`qi === done`）⇒ 擋掉跳題與重複送出灌傷害。⚠️ 誠實話：題庫在前端 bundle 裡，看得到答案的人仍然可以每題都答對——這一層擋的是**偽造勝利**，不是完整的防作弊。
  - **★★★ 收局原因要用中性代碼**（`ko`／`offline`／`left`），句子由前端依自己的勝負轉。實測踩過：伺服器存了「你倒下了」，**贏的那一方也看到「戰報：你倒下了」**——同一個字串要給兩個立場看，帶立場就一定有一邊是錯的。
  - **★★★ 對手離線要主動收局**（25 秒沒輪詢）：少了這一段，對方關掉分頁時你會一直等一個不會回來的人，而畫面上還寫著「對戰中」——那是最糟的一種卡住，看起來完全正常。卸載時另用 `sendBeacon` 通知一聲，讓對手不必空等（那只是**加速**，保底仍是伺服器端的判定）。
  - **★★ 稱號＝帳號名稱，不是另外打的暱稱（2026-09-10 使用者指定）**：開始頁那個 `qz-nick` 輸入框已移除，`who` 直接取 `user.name`（訪客＝「訪客」）。⚠️ **上限 16 必須兩邊一致**（`QuizGame.jsx` 的 `who` 與 `server/index.js` 的 `/api/quiz/queue`）——不一致的話自己看到全名、對手看到被截斷的版本，而畫面上兩邊都不覺得有問題。血條與積分榜的名字都已有 `text-overflow:ellipsis`，所以 16 字不會撐破版面。
  - **★★ 訪客也能對戰**：每個座位發一把**能力金鑰**，只動得了自己那一格，對手的金鑰絕不出現在回應裡。不需要帳號——掃到卡片／路過的人本來就是主要客群。
  - **★★★ 配不到真人時絕不可偷偷換成機器人**：等待畫面明講「已等 N 秒」並給兩個出口（取消／改跟**練習對手（電腦模擬）**打）。把機器人講成真人是騙人，那與 AI 那條線上「不可用假的網路錯誤當婉拒」是同一條原則。
  - 新表靠 `CREATE TABLE IF NOT EXISTS` 在啟動時自動建立，pg 與 sqlite 都不需要手動遷移。
- **★★★★ 徽章系統與唯一徽章（王座式）／個人名片（2026-09-10 使用者指定）**：`src/data/badges.js`（目錄，15 枚）＋`server/badges.js`（授予與易主的**單一入口**）＋`/badges` 收藏庫＋`/card/:handle` 公開名片。閘門是 `scripts/check-badges.mjs`（九項變異測試全部抓得到）。
  - **兩種階級**：`normal` 拿到就永久、人人可有，住 `user_badges`；`unique`（**王座式**）全站**同時**只有一人，住 `badge_thrones`，被超越就易主。知識王 10 枚＝7 normal ＋ 3 unique。
  - **★★★★ 「全站只有一個人」必須是資料層的約束，不是應用層的自律**：`badge_thrones` 的 **PRIMARY KEY 是 badge_id**，而易主一律用**條件式 UPDATE**（`WHERE badge_id=? AND value<?`，pg 與 sqlite 的單句 UPDATE 都是原子的，`changes=0` 就是沒搶到）。寫成「SELECT 出來比大小再 UPDATE」的話，兩個人同時破紀錄會**兩個人都成功**，而畫面上不會有任何錯誤訊息。
  - **★★★★ 唯一徽章絕不可以寫進 `user_badges`——這個洞 2026-09-10 實際存在過並被實測利用**：`POST /api/badges` 原本只驗 id 格式（`/^[a-z0-9-]{3,48}$/`），而 `quiz-throne-streak` 完全符合 ⇒ **admin 一場都沒贏，`POST /api/badges {ids:['quiz-throne-streak']}` 就永久拿到了「連勝之王」，而且與真正的持有者同時擁有**。那支端點的用途是「合併瀏覽器裡的本機紀錄」，而本機紀錄是使用者完全控制得了的東西。
    - ⇒ **三道過濾，缺一不可，而且它們防的是不同路徑**：① `POST /api/badges`（使用者直接可呼叫）② `grantBadges()`（未來每個新玩法都會走的內部入口）③ `arBadges.js` 的 `save()`（localStorage，會被 `syncBadges` 推上去）。
    - ⇒ ③ 還有另一個獨立的理由：**王座是會被搶走的，而 localStorage 那份沒有人會回來刪**。存進去的症狀是「王座早就易主了，收藏庫與個人頁卻還顯示你有」——名片端點會在讀取當下重驗所以名片不會說謊，但站內其他地方會，而使用者無從分辨哪一個才對。
    - ⚠️ 這三道**平常永遠通過**，拿掉任何一道，本機、測試、畫面全都看不出差別。所以一定要上閘門（`check-badges.mjs` 的 B 段，含自我驗證與變異測試）。
  - **★★★ 名片（與任何展示徽章的地方）要在讀取當下重驗持有**：`slots` 存在 `users.badge_slots`，但王座會易主 ⇒ 只讀 slots 就會掛著一枚已經不是他的「全站唯一」，那是在對看名片的人陳述一件不實的事。`PATCH /api/me/badges` 同理要驗「這枚是不是他真的有」——不驗的話任何人都能在公開名片上掛「連勝之王」。
  - **★★★ 唯一徽章的 metric 只能來自伺服器算得出來的東西**。三枚的可信度是**刻意排序**的：`duelStreak` 最硬（勝負完全由 `quizFinish` 判定，前端連自稱贏了都做不到）；`bestScore`／`bestCombo` 次之——伺服器用 `maxScoreFor(right)` 把分數夾在「答對這麼多題最多可能拿到的分」以內（實測送 999999 只採計 5200），**但那不是防作弊**：題庫在前端 bundle 裡，看得到答案的人仍然可以每題都答對。這與 PvP 那層「擋的是偽造勝利，不是防作弊」是同一個限度，文案與註解都不可講成防作弊。
  - **★★★ `quizFinish` 必須擋重入**：四個呼叫點都可能重複收局（對手離線判定、雙方各自送出最後一題、離開時的 beacon）。`UPDATE ... WHERE status<>'done'` 的 `changes=0` 就代表收過了，不擋的話同一場會被重複計進連勝——而**灌出來的連勝會把「連勝之王」從一個真的連贏的人手上拿走**。`recordDuel` 全檔只能被呼叫一次（閘門有鎖），理由同 `HEALTH_RE.test`：兩份實作遲早分岔，而分岔的那一份不會有人發現。
  - **★★★★ 二十四節氣印（2026-09-10 使用者指定）：在那個節氣期間打開站台就蓋一枚，集滿 24 枚＝跟著站走完一整年。** 這是唯一一組「不必買卡、不必贏、只要人在」就拿得到的徽章，也是國民曆產品最自然的年度收藏主軸。**與「節氣卡」那 24 枚是兩組不同的東西**（那組綁實體卡、23 張還沒發行）。
    - **★★★★ 「今天是哪個節氣」只能由伺服器算**（`POST /api/badges/checkin` 用 `taipeiToday()` ＋ `termFromDate()`）。交給前端的話，**把系統時鐘調一調就能一次集滿 24 枚**，而這一組的全部價值就在「你真的在那段時間來過」。那支端點**完全不吃輸入**（連日期都不收），前端唯一能決定的是「要不要呼叫」。閘門鎖住 `req.body` 不可出現在那一段。
    - ⚠️ 一定要 `taipeiToday()` 不可 `new Date()`：Cloud Run 是 UTC，台灣時間 00:00–08:00 會算成前一天 ⇒ **交節那天會蓋錯印**。
    - ⚠️ 節氣名→slug 一律從 `termArticle.js` 推導，不可另抄一張表：兩份節氣表遲早有一個字不一樣（站規記過「驚蟄」寫成「驚蜇」），而症狀是那一枚印**永遠蓋不下去**且畫面上看不出原因。
    - ⚠️ 誠實話：`POST /api/badges` 仍收得下這些 id（它是合併本機紀錄用的）⇒ 存心的人仍可自己灌。**刻意不擋**——擋了會讓訪客集到的印在註冊後消失（所有人都會遇到的損失），而灌印只傷到自己，不像王座是從別人手上搶。這與「題庫在前端 bundle 裡」是同一個限度，不可講成防作弊。
    - **★★ 一天只蓋一次**（`jq-jieqi-stamped` 存台北的日曆日）：那支會寫 DB 也會發通知，每次切畫面都打是白費的。不可用 `new Date().toDateString()`——跨時區的人會在半夜多蓋一次。
    - **★★ 收藏庫要標「現在正是」**：24 格裡今天能蓋的是哪一枚，是這一組唯一的行動線索，不標的話使用者只會看到 23 個灰格子。
  - **★★★★ 徽章圖（2026-09-11 使用者提供原稿）：轉檔一定要走 `npm run badge:icons -- <原稿資料夾>`，不可把原稿直接丟進 `public/`。**
    - **原稿是 1254×1254、每張約 3 MB、69 張共 195 MB**。收藏庫一次列 69 枚 ⇒ 照原樣就是 195 MB 的下載量，而畫面上那個位置只有 64px。轉完是 128²／每張約 30 KB／**共 2 MB**，再配 `loading="lazy"`。
    - **★★★★ 去背是必要的不是美化**：原稿的背景被**烤進像素**了，而且四組各不相同（實測：格紋 25 張、白底 8 張、黑底 2 張、淺灰 4 張、奶油底 29 張）。其中「格紋」是繪圖軟體的透明格線被一起輸出成不透明像素 ⇒ 直接用的話，奶油色卡片上會出現一塊灰色棋盤格方塊。
    - **去背用「從四邊界泛洪」不是色鍵**：先從最外圈**只學低飽和的**顏色（圖案是金邊與彩色植物，學不進去），再從邊界往內擴散。⇒ 圖案內部就算有同色的小塊也碰不到——**色鍵會把徽章中間的淺色一起挖掉**。
    - **★★★★ 泛洪會從邊框的缺口滲進圖案裡，而且淺色主題完全看不出來**：小雪／大雪／大寒 三張節氣卡的內部是雪景，顏色與卡外底色幾乎一樣 ⇒ 整片內容被挖成透明。奶油挖空後露出的還是奶油底，**只有深色主題才會現形成一塊黑**。⇒ 腳本因此**逐張量「內容外接框中央 50% 的透明率」**，超過 2% 就自動收緊容差重試（26→18→…→3）；全部都滲漏時**寧可不去背**——背景色不對只是不好看，挖破是內容不見了。
    - **★★ 圖載不出來一定要退回字形磚**（`BadgeArt` 的 `onError`），而且**尺寸要一樣**（實測 64×64 → 64×64，版面不跳）。會載不出來的情境比想像多：新增徽章還沒補圖、轉檔沒跑過、舊快取。字形磚本來就是完整的方案，退回去毫無損失。
    - **★★ 未取得的徽章要 `filter: grayscale(1)`**：只降 opacity 的話彩色圖仍然很搶眼，整頁看起來像「大部分都拿到了」——那是不實的暗示。
    - ⚠️ **`canvas` 在 Windows 上開不了含中文的路徑**（`EILSEQ, Illegal byte sequence`）：一律 `fs.readFileSync` 成 Buffer 再餵給 `loadImage`。
    - ⚠️ **`canvas` 不支援 WebP**。原稿混了一張 `立春.webp`（VP8L），是用瀏覽器解碼後經 `/api/images` 繞回本機轉出來的。**下次請美術統一給 PNG**。
    - ⚠️ 原稿檔名把「臘八粥」寫成「**蠟**八粥」，靠腳本裡的 `ALIAS` 對應。**不要去改原稿檔名**——下次再給一次還是同一個字，把差異記在程式裡才有人看得到。
    - **對應不到就讓腳本失敗**：少一張的症狀是「那一枚徽章永遠沒有圖」，而畫面會退回字形磚 ⇒ **看起來完全正常**。所以最後一定要逐項核對 69/69。
  - **★★★ 節氣類徽章的字形磚要用**完整節氣名**（兩個字），不可只取第一個字**：立春／立夏／立秋／立冬 會變成四個一樣的「立」，小滿／小暑／小雪／小寒 四個「小」，大暑／大雪／大寒 三個「大」——**24 枚裡有 11 枚重複**，而字形磚是格子裡的主要辨識物。兩個字要把字級降一階（`--text-xl`）才不會撐破 150px 的格子。閘門鎖住「同一組內字形磚不可重複」。
  - **★★★★ 24 節氣卡徽章：`requires` 空陣列 ＝ 那張卡還沒發行（2026-09-10）**。目前官方卡只有一張（2027 小寒），所以 24 枚裡有 **23 枚是現在不可能拿到的**。收藏庫必須把這件事明講成「這張卡片尚未發行」，**不可以照著 `how` 寫「去掃卡答對」**——那是叫使用者去做一件做不到的事，而他會以為是自己找不到卡。分組標題也要寫成「1 / 1 已發行 · 共 24」，只寫「1 / 24」會看起來像做壞了。
    - ⚠️ 用「`requires` 是否為空」當發行狀態是**刻意**的：發行一張新卡時本來就得回來把那張卡的小挑戰徽章 id 填進去 ⇒ 發行狀態不可能忘記同步。另設一個 `released` 旗標的話，遲早會出現「卡發行了、旗標沒改」。
    - **★★★ `every` 對空陣列恆為 true** ⇒ `termBadgesCompletedBy()` 若少了 `isReleased` 那道判斷，**一登入就會白送 23 枚**（「集滿零枚」立刻成立）。閘門有專測，變異測試驗過。
    - **★★ 集滿判定要前後端共用同一支純函式**：訪客沒有 session（後端那條路他完全走不到，而訪客正是掃到卡片的主要客群），登入者又不能只信前端。兩邊各寫一份遲早分岔，症狀是「本機說集滿了、重整之後又沒有」。
  - **★★★ 逆境徽章（2026-09-10 使用者指定）：語氣一律用通書的字，而且這一組刻意沒有唯一徽章。** 血光之災／諸事不宜／時運不濟／屢敗屢戰／否極泰來——通書那套語彙天生帶著「這是天時不是你的錯」的味道。**不可以寫成嘲諷**：一個讓人看了不舒服的徽章，使用者會希望它不要出現在自己的名片上，那就等於白做。
    - **不可做成唯一徽章**：「全站輸最多場」被公告出來是難堪的，而王座還會發通知說你被超越了——那個通知在這個語境下是在羞辱人。閘門鎖住這一條。
    - **一定要有出口（`quiz-comeback` 否極泰來）**：只有負面徽章的話，收藏庫會變成一面「你有多爛」的牆，而站上的語氣從來不是那樣。
    - **★★ 「否極泰來」要在 `loseStreak` 歸零**之前**讀它**：贏的那一支會馬上把連敗歸零，順序顛倒的話那一枚永遠發不出去（而且完全沒有跡象）。已用連敗 3 場→贏 1 場的實測釘住。
    - **★★ 「諸事不宜」要求至少作答 3 題**：一開局就按「結束這局」的人 right 與 wrong 都是 0，那不是「全錯」而是「沒玩」，發了會很莫名。
  - **★★★★ 統計一律用原子 SQL 遞增，絕不可「讀出來 → 在 JS 加一 → 整份寫回去」（2026-09-10 修）**：那是典型的 lost update——兩個請求同時進來（對戰收局撞上單人成績、使用者連點兩次），後寫的那份會用一個**過期的快照**蓋掉前一份。**實測：舊寫法並發 20 場敗只記到 1 場（掉 19），改成 `SET duel_losses = duel_losses + 1` 之後 0 掉。**
    - ⇒ 少算的那一場如果剛好是第 10 敗，「屢敗屢戰」就**再也不會**發出來，而使用者只會覺得「我明明輸夠了卻沒拿到」——完全查不出原因。
    - **門檻一律用「寫入之後重讀」的值**：並發時可能讀到別人那一次也加過的數字，但門檻都是 `>=` 而授予是冪等的 ⇒ 最壞情況只是早一點拿到，**絕不會漏發**。反過來（先讀後寫）才會真的漏。
    - **「越大越好」的欄位用條件式 UPDATE**（`SET best_score=? WHERE best_score<?`）；`best_streak` 用**欄位對欄位**（`SET best_streak=duel_streak WHERE best_streak<duel_streak`）。
    - **★★★ 「否極泰來」的判斷必須與歸零是同一條 SQL**：`... SET lose_streak=0 WHERE user_id=? AND lose_streak>=3`，`changes=1` 就證明寫入的那一刻連敗真的 ≥3。先前寫成「先把 loseStreak 讀進變數、再歸零」——單執行緒下答案對，但判斷依據與寫入之間有空隙。
  - **★★★ `claimThrone` 的 UPDATE 要帶 `AND user_id=?`**（不只 `AND value<?`）：`changes=1` 才能證明寫入的那一刻持有者確實是我們讀到的那個人 ⇒ `previousUserId` 是**精確**的。少了它，高度競爭時會**通知錯人**——跟一個徽章好好的人說「你的徽章被搶走了」。沒搶到就重讀重試（上限 3 次）。
  - **★★★★ 兩個非同步來源寫同一格 state，就一定要問「誰後到誰贏」——只要答案不是「兩個都留著」，那就是 bug（2026-09-10 實測必現）**：收藏庫的徽章有兩個來源，`localStorage`（訪客也有，但**刻意不含王座**）與 `/api/badges`（含王座）。原本兩者寫同一個 `owned`：API 回來時合併，但 `BADGES_EVENT` 一觸發就 `setOwned(new Set(本機那份))` 把合併結果整個換掉 ⇒ **王座從畫面上消失**。而 `syncBadges` 正好會在登入還原時發那個事件，時機就在 API 回應前後。**實測：API 回 13 枚、畫面只有 11 枚。**
    - ⇒ 正解是**兩份分開存**（`local` / `remote`），render 時才取聯集。`Profile.jsx` 的徽章牆本來就是這樣寫的，所以它沒中。
    - ⚠️ 這個 bug 是「王座不存 localStorage」與「事件用本機那份覆蓋」**兩個各自正確的決定**交會出來的——改動兩處看似無關的程式時，要問它們有沒有共用的一格狀態。
  - **★★ 王座易主一定要通知被擠下來的人**：他名片上那枚徽章會就這樣消失，沒有通知的話他只會覺得「我的徽章不見了」——那是最糟的一種靜默。`announceBadges()` 是唯一發這類通知的地方。
  - **★★ 收藏庫要列出**還沒拿到的**徽章與取得方式**：只列已擁有的話，這一頁對「還沒有任何徽章的人」是一片空白，而那正是最需要被告訴「怎麼拿」的那群人。（個人頁的徽章牆「一枚都沒有就整塊不顯示」是對的——那是個人頁，收藏庫是目錄。）唯一徽章還要顯示**目前在誰手上**：空著的王座才有人想去挑戰，被誰拿走也是資訊。
  - **★★ 訪客拿得到一般徽章（存瀏覽器）但拿不到唯一徽章、也沒有名片**——他沒有帳號就沒有「持有者」這個概念。UI 必須**先講**，不可以讓他挑戰一個不可能拿到的東西之後才發現。
  - **★★ `--ji`／`--yi` 本身就是兩個主題都對的「文字色」（淺色 `#9A3B2E`／深色 `#E29A8C`，方向自動翻轉）；`--on-ji`／`--on-yi` 只能用在朱紅／宜綠**底色**上**。這一輪把 `--on-ji` 當淺底上的文字色用，實測對比 **1.02**（奶油字在奶油底上）——與 `.coverbig.oracle .cta` 那個坑是同一件事的反方向。
  - **★★ 新做的畫面最容易漏掉 `stripEmoji()`**：名片直接印資料庫的 `bio`，而正式站的舊資料仍帶 emoji（實測種子帳號是「記錄二十四節氣 🌿　台中」）。本機測試資料看起來往往是乾淨的，所以這一條**要靠掃描不能靠眼睛**。順帶補掉 `CreatorPage`／`Profile` 同一類的既有漏網。
  - **★★★ 建置閘門絕不可 import `server/db.js`**：那支在 `NODE_ENV=production` 且沒設 DB 時會 throw ⇒ 閘門就有能力擋掉正式部署（站規記過一次真實事故）。`maxScoreFor` 因此住在 `src/data/quiz.js`（純資料層），閘門從那裡拿。**目前靠的是 Dockerfile 把 `ENV NODE_ENV=production` 寫在 `RUN npm run build` 之後——那是行序上的巧合，不要依賴它。**
  - ⚠️ **`POST /api/quiz/result` 必須放在 `quizLimiter` 宣告之後**：放前面會踩 TDZ 而**整個服務起不來**，而 `npm run build` 一個字都不會報（同一種坑站規已記過兩次）。
- **★★★★ 「新增畫面要同時改三處路由表」已經做成閘門了**（`check-nav.mjs`，逐一比對 `SCREEN_PATH` × `registry.jsx`／`server/seo.js`／`App.jsx`，目前 77 項）。**CLAUDE.md 早就寫著這條，2026-08-16 加 `/quiz` 時還是漏了 `server/seo.js`**——因為漏掉的症狀是**畫面完全正常、只有 HTTP 狀態碼是 404**：本機點得進去、按得動、玩得完，只有搜尋引擎知道那一頁「不存在」。⇒ **靠人記住的規則遲早會漏，能寫成檢查的就寫成檢查。**
- **★★★ 掃到卡片 → **跳轉**到 A-Frame 模型頁 `/ar/model/:slug`（`src/screens/ArModel.jsx`，2026-08-11）。**
  `/AR` 用 MindAR 認出卡片後停 `JUMP_DELAY_MS`(900ms) 再 `push('arModel', {slug, hotspot})`。
  - **為什麼是「跳轉」不是「貼在卡片上」**：貼在卡片上需要**持續追蹤**，追蹤一斷內容就消失，使用者得一直維持手、卡片、光線三者都對——那正是先前「掃得到卻用不起來」的主因。跳走之後**辨識只需要成功一次**，看模型不再依賴相機，可以放下卡片、雙手轉動觀察。
  - **停 900ms 再跳**：辨識成功是這條動線唯一的「成了！」時刻，瞬間換掉的話使用者不知道剛剛發生什麼事。但也不可超過一秒半——手已經放下卡片還在等會以為當掉。
  - **★★★ 跳轉 effect 的 deps 只能是 `[phase, push]`，`hotspot` 千萬不可放進去**：熱區是遲滯確認的（連 3 幀），所以「認出來」之後約 0.3 秒才會從 null 變成實際那一區 ⇒ effect 重跑 ⇒ cleanup 清掉計時器 ⇒ 但一次性旗標已是 true ⇒ **不再重新排程 ⇒ 跳轉永遠不會發生**，而畫面停在「正在開啟 3D 模型…」。狀態列說得斬釘截鐵、實際上什麼都不會來。熱區改用 ref 讀。實測踩過，`check-ar.mjs` 有鎖。
  - **只跳一次**（`jumpedRef`）：追蹤會反覆 found/lost，不鎖的話回到這一頁又追到就再跳一次，使用者會被彈來彈去。
  - **★★★ A-Frame 自帶 `super-three@0.184`，與本專案 `three@0.185` 是兩份副本**（A-Frame 的相依寫成 `three: npm:super-three@0.184.0`，永遠不會被 npm 去重）。角色用**本專案的 three** 建，交給 **A-Frame 的算繪器**畫——跨副本。
    - **可行**：`WebGLRenderer` 判斷型別用的是 `isMesh`／`isBufferGeometry`／`isMaterial` 這類**布林旗標**（three 就是為了跨副本互通才這樣設計），不是 `instanceof`。實測 102 個 mesh、170,456 三角形全部正常畫出。
    - **★★ 但絕不可用 `el.setObject3D()`**：它第一行就是 `if (!(obj instanceof THREE.Object3D)) throw`，而那個 `THREE` 是 A-Frame 自己的 super-three ⇒ 跨副本必定 false ⇒ 直接拋「`Entity.setObject3D` was called with an object that was not an instance of THREE.Object3D.」（實測拿到的錯誤）。改用 `el.object3D.add()` 繞過——A-Frame 擋的是它自己的 API 契約，不是算繪能力。
    - **代價**：物件不在 `object3DMap` 裡，`removeObject3D` 找不到它，卸載要自己 `object3D.remove()`，否則反覆進出會一直往場景疊角色。
    - ⚠️ 升級 A-Frame 或 three 之後**要重驗**：失效方式是「模型不出現而且沒有任何錯誤訊息」。`check-ar.mjs` 有一項鎖住「A-Frame 仍使用 super-three」這個前提。
  - **`<a-scene>` 用 `document.createElement` 自己建，不交給 React 渲染**：A-Frame 是自訂元素，靠 DOM 掛載時的 `connectedCallback` 初始化，交給 React 的話重新調度會與它自己的生命週期打架。React 只負責那個容器。
  - **A-Frame 元件只能註冊一次**（`registered` 旗標）：重複 `registerComponent` 會 throw，少了旗標第二次進這一頁整頁就掛了。
  - **`.armodel-stage` 必須有明確高度**：`<a-scene embedded>` 拿到 0×0 時**不會自己重試**，症狀是整片空白而沒有任何錯誤。
  - **★★★ 相機框景必須由「畫布長寬比」推導，不可寫死**（2026-08-11 使用者回報「畫面比例怪怪的」）：three 的 `fov` 是**垂直**視角，所以**水平**看得到多少完全取決於畫布長寬比——手機直立時 `.armodel-stage` 是 411×498（0.83）、桌機是 680×520（1.31），同一組 `position`／`fov` 在兩邊差很多。舊版寫死 `camera position="0 0.15 3.2"` ＋ 角色 `position="0 -0.55 0"`（那個 −0.55 是從 AR 舞台搬來的，在那裡角色是站在卡片平面上），實測手機上**上方留白 52.6%、下緣被裁掉**。現在 `jq-fit` 元件用 `cam.aspect` 逐次算距離，並把角色的包圍盒中心對到 rig 的旋轉原點。
    - **俯仰上界要用常數不可用當下角度**：用當下角度的話使用者一拖動框景就忽大忽小。取 `maxPitch`(35°，與 `jq-drag-rotate` 的夾角一致) 當靜態上界。
    - **水平上界用 `radiusXZ = hypot(halfX, halfZ)`**：那是繞 Y 自轉時的上界，與 yaw 無關 ⇒ 自轉一圈都不會擦邊。實測 24 種 yaw×pitch 組合最小留白 12.5%，四種長寬比（0.83／1.00／1.31／2.62）最小留白 14~18%，全都沒有裁切。
    - **重心對到旋轉原點還有第二個好處**：自轉與俯仰都繞著重心，框景不會飄。舊版是繞著重心以外的一點轉，看起來會晃。
  - **★★★ A-Frame 1.8 的元件叫 `xr-mode-ui`，不是 `vr-mode-ui`**：舊名在 1.8 裡**根本不存在**，寫了會被**靜默忽略**（A-Frame 對不認識的元件不警告）⇒ 支援 WebXR 的裝置會冒出一顆「VR」按鈕。⚠️ **桌機偵測不到 XR 裝置會自動隱藏那顆按鈕，所以本機完全看不出來**——這個 bug 是從使用者的 Android Chrome 截圖才發現的。`check-ar.mjs` 同時鎖「自帶的那份 A-Frame 有 `xr-mode-ui`」與「原始碼不可出現 `vr-mode-ui`」。（`public/ar/plain.html` 裡的 `vr-mode-ui` **刻意保留**——那一頁是官方範例的逐字對照組。）
  - **★★★ 模型畫布一定要 `touch-action: none`**：預設 `auto` 會讓瀏覽器把觸控手勢當成捲動吃掉——手指在模型上滑，頁面往下捲，模型**一動也不動**，而畫面上白紙黑字寫著「拖曳可以轉動」。⚠️ 不可改用 `preventDefault` 解（那要把監聽器改成非 passive，iOS 對 touchmove 的非 passive 監聽特別敏感）。⚠️ 代價是這一塊不能用來捲頁面，所以舞台高度壓到 `56dvh`，上下都留得出可捲的地方。
  - **★★ `.armodel-stage` 的 `dvh` 一定要配一行 `vh` 退路**：`dvh` 是 iOS 15.4 才有的單位，舊 iOS 會把整條 `height: min(56dvh, …)` 判為**無效而整行丟掉**——而這個容器一旦沒高度，`<a-scene embedded>` 就拿到 0×0 且不會自己重試（整片空白、零錯誤訊息）。先寫 `vh` 版、再寫 `dvh` 版讓它覆蓋。
  - **★ 用 `ResizeObserver` 呼叫 `scene.resize()`**：`<a-scene embedded>` 只在 window resize 時重算畫布，容器自己變大變小（上方內容載入把版面推開）不會觸發。⚠️ 這一項**在 Claude 的瀏覽器窗格裡驗不到**——RO 是 frame-driven，窗格沒在合成時連第一次回呼都不會送（實測 `initial` 就是 0）。所以程式不可以**只**靠它：轉向與網址列收合走的是 window resize，A-Frame 自己就會處理。
  - **關掉 `look-controls`**：開著的話相機會跟手機陀螺儀轉，把手機放桌上看模型時畫面會自己飄。A-Frame 內建沒有 orbit-controls（那是社群元件），所以自己寫了 20 行 `jq-drag-rotate`：拖曳轉動、放開後慢慢自轉（靜止的 3D 看起來像一張圖片），上下角度夾在 ±35°（不夾會轉到模型底下看到穿模的內裡）。
  - **`lod: 0.85`** 與 ProduceStage 同一個值：全解析度 230,310 個三角形超出策畫書 §6.1 的 180k 預算，實測畫面看不出差別（0.85 ＝ 170,456）。
  - **★★★ A-Frame 走「自帶預編譯檔」，`package.json` 裡沒有 aframe。**
    ⚠️ 這不是偏好，是**部署會整個失敗**：`aframe` 的相依裡有一個 **git 來源**套件
    （`"three-bmfont-text": "github:dmarcos/three-bmfont-text#c3eec235…"`），而 GCP 的建置環境
    禁止 git 來源 ⇒ `npm ci` 直接死在 `npm error code EALLOWGIT：Fetching packages of type "git"
    have been disabled` ⇒ 服務部署不上去。2026-08-11 實際炸過一次（加了 aframe 之後第一次部署就掛）。
    作法：`public/vendor/aframe-1.8.0.min.js`（1,292 kB，自足的 UMD bundle，含它自己的 super-three），
    用 `<script>` 動態插入、等 `window.AFRAME` 出現。**同源，所以 `script-src 'self'` 本來就允許**。
    ⚠️ 檔名帶版號，升級換檔名（舊快取自然失效），而且**升級後一定要重驗跨副本算繪**。
    ⚠️ `<script>` 的 `load` 事件**不代表載入成功**——檔案不存在時 SPA fallback 會回 200 + index.html，
    那也會觸發 load。一定要接著檢查 `window.AFRAME` 是否真的存在。
    ⚠️ 加任何新相依之前先想一下它有沒有 git 來源：`npm view <pkg> dependencies` 看得到，
    而這個錯誤**只會在部署時出現**，本機 `npm install` 完全正常。
  - **成本**：自帶檔 1,292 kB，只有進到這一頁才會下載；**不進 Vite 模組圖**，主 bundle 完全不受影響。
  - **模型頁 `noindex`**：內容與 `/ar/card/:slug` 高度重疊，兩頁都放給搜尋引擎就是同一份內容用兩個網址參賽——而卡片頁才是刻意做給「沒有實體卡、從搜尋進來的人」看的那一版。
  - **實測（正式 build ＋ CSP，375×812）**：`/AR` 點開始 → 3.5 秒後網址變成 `/ar/model/2027-xiaohan`、分頁標題「3D 模型 · 機巧時運」；模型 102 mesh／170,456 三角形／102 draw call 全部畫出（畫布綠色像素 9.7%）；自轉正常；掃描時瞄到的熱區有跟著帶過去。
- **`/ar/plain.html` 是 MindAR 官方範例的原樣對照組**（`public/ar/plain.html`，2026-08-11）。逐字照 <https://hiukim.github.io/mind-ar-js-doc/quick-start/webpage>，只把兩個 CDN script 換成自架（本站 CSP 是 `script-src 'self'`）並換成本站的 `.mind` 與卡面圖。
  - **用途**：把站上那一整套自製的 AR 層排除掉，單獨測函式庫本身。官方原版也不行 ⇒ 是 MindAR／該裝置的問題；官方原版可以 ⇒ 是我們某一層加的東西害的。
  - ⚠️ **這一頁不可以加任何東西**（狀態列、診斷、QR、相容模式…）。加了就失去對照組的意義。
  - ⚠️ **無頭瀏覽器驗不了它**：官方頁在載入時就**同步**載入 MindAR，來不及補 rAF shim，處理迴圈會卡在第一輪（`processingVideo` 是 true 但 `_detectAndMatch` 一次都不會被呼叫）。我們自己那一層是動態 import 所以補得進去——**不要拿本機跑不動當成「官方版也壞掉」的證據**。它只能在真實裝置上驗。
- **（已刪除）自研平面追蹤**：`homography.js`／`quadDetect.js`／`arTracker.js`／`features.js`／`scanner.js`／`arPoseBridge.js`／`arDiagnose.js`／`arSimFrame.js`／`mindTrack.js`／`arCardRegistry.js`／`ARScene.jsx`／`ARCharacter.jsx` 與 `check-features.mjs`／`frame-card.mjs`／`install-target.mjs`（`card:frame`／`card:install`）**已於 2026-08-11 全部刪除**。那條路線偵測卡片四角 → 透視拉正 → dHash 比對 → 解 homography → CSS `matrix3d` 疊加。它留下的經驗多數已隨路線失效，只有兩條仍值得記住：① **實體卡的設計必須早於 AR 開發**；② **卡面要有明顯不對稱、紋理足夠的元素**（MindAR 也吃這一條，只是理由從「四角定向」變成「特徵點數量」）。**「收邊」規範已作廢**——MindAR 不偵測卡片邊界，實測收邊版與未收邊原稿都 12/12。
- **成果圖卡（`src/lib/shareCard.js`）純 canvas，零外部素材**，1080×1080，答對小挑戰後才出現。**內容紀律：只畫真的東西**——徽章名、節氣、日期、一句有出處的事實。不放「我贏了」「第 N 名」這種站上根本沒有的概念，也不放營養宣稱。
  - **⚠️ iOS Safari 不支援 `<a download>`**：點了只會在同一個分頁開啟那張圖，使用者以為壞掉了。順序必須是 ① Web Share API 帶檔案（手機最好的路徑）② `<a download>`（桌機）③ 開新分頁＋提示「長按圖片即可儲存」。**使用者按取消（`AbortError`）不是錯誤**，不可跳失敗提示。
  - **⚠️ Web Share 必須在使用者手勢附近呼叫**，所以圖要**先畫好**再呼叫 `saveOrShare`——在那裡才 `await` 繪製會被瀏覽器擋掉。
  - **⚠️ `URL.revokeObjectURL` 不可立刻呼叫**：下載／開啟是非同步的，馬上撤銷會讓檔案變成 0 bytes。
  - **要 `await document.fonts.ready` 再畫**：canvas 會用 fallback 字型量寬度，斷行位置與實際看到的不一樣（中文尤其明顯）。
  - **檔名要消毒**（`\ / : * ? " < > |` → `-`，`·` 與連續空白 → `_`，截 120 字）：徽章名是內容資料，未來可能含 Windows 非法字元，不處理會靜默失敗。
- **AR 徽章是「本機優先＋登入後雙向合併」**（`src/lib/arBadges.js`＋`user_badges` 表＋`GET/POST /api/badges`）：
  - **為什麼不是後端唯一**：訪客也要能拿徽章，而站上的訪客模式是純前端狀態（沒有 session cookie），所有寫入 API 一律 401——只存後端的話訪客答對小挑戰什麼都拿不到，而那是這條動線唯一的獎勵。
  - **合併必須雙向**：只往上推 → 換裝置登入看不到之前拿的；只往下拉 → 訪客時期拿的被覆蓋掉。每個帳號只合併一次（記在 `jq-ar-badges-merged`），避免未來做「刪除徽章」時被合併邏輯一直復活。
  - **合併要掛在「使用者變成真帳號」而不是 `login()`**：重新整理走的是 session 還原那條路，不經過 `login()`——只掛 `login()` 的話換裝置登入後第一次重整就看不到徽章。
  - **⚠️ 徽章牆必須訂閱變動，不可只在掛載時讀一次**：`syncBadges` 是登入之後才把後端那份拉回來。少了這一步的症狀是**換裝置登入第一次進 `/me` 看不到徽章、重整一次才出現**——而那正好是「上後端」要解決的情境。`save()` 會發 `BADGES_EVENT`。
  - **`earnBadge` 先寫本機再 fire-and-forget 送後端**：答對的那一刻就要看到徽章，網路慢不該讓回饋卡住；後端失敗也沒關係，下次登入的合併會補上。
  - **POST 要限制數量與格式**（`^[a-z0-9-]{3,48}$`、最多 60 筆）：那是使用者可控的輸入。**用「先查再插」不用 upsert**——pg 與 sqlite 的語法不同，而 db.js 的可移植性原則是只用兩邊都一樣的 SQL。
  - **一枚都沒有時整個區塊不顯示**，不做空狀態：這是多數人還沒接觸過的功能，在個人頁擺一塊空的只會讓人覺得「我漏了什麼嗎」。
  - **查不到 `BADGES` 表的 id 時顯示原始 slug 而不是藏起來**：藏起來會變成「使用者明明拿過卻看不到」，比顯示一個 slug 更難查。
- **`/ar/card/:slug`（`CardPage.jsx`）是不用相機的降級路徑，一頁兼三個用途**：① 桌機／拒絕相機權限的去處 ② **可索引**的內容頁（`/AR` 是 noindex，沒有實體卡片的人從搜尋進來靠這頁）③ **熱區校對工具**（熱區框直接畫在卡面上，開「顯示座標」就能對照 rect 數值）。
  - **熱區必須是真的 `<button>`**（帶 `aria-label`／`aria-pressed`）：div + onClick 的話 Tab 走不到、螢幕閱讀器也唸不出來。
  - **3D 走 `React.lazy`，不點就不下載**：實測 `ProduceStage` 分塊 138 KB gzip 獨立、主 bundle 只因為新畫面本身 +17 KB。
  - **卡面圖缺失時不可假裝有**：畫一個空的比例框並說明去哪裡補，熱區位置仍可校對（那才是這頁對美術最有用的地方）。
  - **小挑戰答錯不扣分、不鎖、不記次數**，而且**送出後才標對錯**——作答中就標紅等於直接給答案。
- **★★★ 小挑戰是共用元件 `src/components/ArQuiz.jsx`，`/ar/card/:slug` 與 `/ar/model/:slug` 兩頁都用它（2026-08-11）。**
  先前它是 `CardPage.jsx` 的區域元件，於是「知識卡 → 答題 → 徽章」這段**只存在於不用相機的卡片頁**——**真的拿卡片掃到的人反而走不到獎勵**，而那正是這條 AR 動線唯一的「成了！」時刻。現在掃到卡片跳去模型頁之後：看 3D 角色 → 讀知識卡 → 聽語音 → 答題 → 拿徽章。
  - **六個熱區有五個有題目**（櫻花那一區刻意沒有，理由見下）。**卡面中心落在「身體保健」**（CLAUDE.md 別處有記），所以最常見的掃描路徑一定會遇到題目——先前那一區沒有題目，等於多數人掃到之後什麼都拿不到。
  - **新增小挑戰一定要一起補 `BADGES`**（`src/lib/arBadges.js`）：`ArQuiz` 查不到 id 時會退而顯示原始 slug，那是保底不是設計。`check-ar.mjs` 已上閘門。
  - ⚠️ 題目的欄位是 **`badge`（單一字串）**不是 `badgeId`／`badgeName`——寫錯會**靜默不發徽章**。
  - ⚠️ **題目必須在「模型頁」也成立**：那一頁只渲染當前物件的 `facts`／`warn`，**不渲染 `link`、也不渲染 `card.subtitle`**。所以「答案在下一頁」「答案在副標題裡」的題目在卡片頁看似可行、在模型頁無解。而且作答狀態是元件區域 state，使用者為了查答案點走再回來就全部清空。
- **★★★ 跟角色說話：`src/components/ArTalk.jsx`（2026-08-11）。**
  模型頁的互動從「看它自轉」變成「跟它對話」：點一個問題 → 角色**先想一下**（`think`）→ 說出答案（開口＋身體起伏）→ 收回 `present`。
  - **★★★ 讓它「活起來」的是 `actor.setOverlay('talk')`**——那條 additive 通道 `actor.js` 早就寫好，但**在這之前沒有任何地方用過**。它與 base 動作**相加**，所以「一邊點頭一邊講話」是免費的。實測說話中 `rx` 從 0.0084→0.0107→0.0149（base 的 `happy` 根本沒設 rx），講完回到 0。
  - **⚠️ Web Speech API 拿不到音量**，所以自己做一條有隨機感的包絡（`setOverlayLevel`）。**不可用固定值**——等幅起伏看起來像機器在震動不像人在講話。
  - **★★★ AI 是主聲道，卡片資料是它查得到的資料（2026-08-11 使用者指定，與前一版相反）。** 先前是「卡上有的由 `findAnswer` 逐字回答、沒有的才問 AI」，讀起來像**查詢機**——問一句答一句、句句附出處、不會寒暄也接不了上一句。現在整張卡（含其他熱區）都放進伺服器端的系統提示，由模型自己引用。
    - **★★ 要明令「不要重複自我介紹」**：開場白已經介紹過了，模型卻每一則都先報一次「我是結球白菜」——熟人聊天不會這樣講話，讀起來像跳針也很像機器。只有對方**明確問你是誰**時才自我介紹。
    - **★★ 系統提示必須同時要求兩件事**：像朋友聊天（可寒暄、可反問、可承接上一輪）**且**「數字、品種名、地名、日期一律照抄並附出處」。只講前者會讓它把產地講成「彰化一帶」；只講後者就退回查詢機。**卡上沒有的就直接回答，不要每則都先聲明「卡片上沒寫」**（2026-08-16 使用者指定）——那句開場白每一則都出現很囉嗦。⚠️ 出處那件事因此**改由畫面上的「AI 生成 · 非卡片原文」標記負責**——但那個標記也在 2026-08-16 依使用者指定移除了，所以**畫面上目前沒有任何「這句不是卡片原文」的線索**。這是產品決定；要恢復的話兩條路擇一：把提示詞的聲明規則打開，或在 `ArTalk` 把標記渲染回來（log 裡仍留著 `ai: true`，哪幾則出自模型是查得到的）。⚠️ 但「不先聲明」不等於可以把推測講成卡片上的事實——編造品種名／產地／日期／數字仍然絕對禁止。
    - **★★★ `findAnswer` 不可以刪掉，它現在是降級路徑**：訪客沒有 session ⇒ `/api/ai/chat` 一律 401，那是**常態不是例外**（掃到卡片的人多半還沒註冊）；AI 失敗時也要退回它，否則網路抖一下連「品種是什麼」這種卡上明明有的問題都答不出來。實測訪客問「臘八是哪一天」仍逐字答出 2027-01-15（站內曆算）。
    - **★★★★ AI 走伺服器的 persona 模式，絕不可從前端直接打模型。** `persona` 只送一個 **objectId**，系統提示由 `server/index.js` 的 `AR_PERSONAS` 從 `arCards.js` 產生（白名單）。讓前端送自由字串等於把系統提示的控制權交出去——那是 prompt injection 的正門。
    - **★★★★ 執行期的法規守門 `HEALTH_RE` 是唯一的防線。** 卡面資料有建置期閘門（`check-ar.mjs` G 段）掃過，但**建置期的閘門碰不到模型生成的字**；而讓 LLM 扮演一顆白菜，它兩三句內就會自己講到維生素——這不是假想的風險，是預設行為。攔到就 `sse({ replace })` **整段換掉**，不是刪字（半句被挖空讀起來像壞掉，而且使用者會以為是網路問題再問一次）。⚠️ 黑名單刻意不列「預防」「避免」：卡面的一氧化碳提醒是公共安全資訊不是食品健康宣稱。閘門用**使用者參考圖上的原文**當樣本自我驗證，並附反例確認不誤殺。
    - **★★★★ `/api/ar/talk` 的輸入長度是唯一會真的花到錢的攻擊面**（外部稽核實測：輸入框 `maxLength = -1`，塞 5,200 字前後端都沒擋）。三層：前端 `maxLength` ＋ 字數提示（**只是提示，可繞過**）、後端超過 `AR_TALK_MAX_CHARS`(500) 回 **413**、空白回 400。⚠️ **不可默默截斷**——使用者以為模型讀完了他打的東西，實際上只讀了前面一小段。⚠️ 前端要把 413／400 照實顯示，不可混進「訊號不好」，否則使用者會一直重送同一段五千字。
  - **★★★ 3D 角色的 `<canvas>` 要有 `role="img"` ＋ `aria-label` ＋ `tabindex="0"`，並支援方向鍵轉動**：它是這一頁的主角，但對輔助技術原本**完全不存在**；而且手勢是唯一操作方式時，鍵盤使用者連「轉到背面看看」都做不到。⚠️ A-Frame 的 canvas 是它自己建的，要等 `renderstart` 才掛得上。
  - **★★★ `App.jsx` 的堆疊畫面（`.screen`）要排在根分頁（`.rootpane`）之前**：原本 DOM 順序是「首頁那一整塊（H2×3）→ 堆疊畫面（H1）」，於是**每一個詳情頁的標題大綱都是 H2 → H2 → H2 → H1**，搜尋引擎與螢幕閱讀器都吃虧。⚠️ 調順序不影響畫面：手機的 `.screen` 是 `position:absolute; z-index:10`（定位元素本來就畫在流內容之上，與 DOM 先後無關），桌機的 `.rootpane` 在有堆疊時是 `display:none`。⚠️ **不可改成「有堆疊就不渲染 rootpane」**——那會把分頁的捲動位置與已抓好的清單全部丟掉，而站上的捲動還原正是靠它留在 DOM 裡。
  - **★★ 訪客不可以看到「登出」**（導覽列與設定頁）：他沒有帳號，要的是「登入／註冊」。
  - **★★ `/ar/model/:slug` 的 description 不可預設對方已經掃過卡片**：這一頁直接開網址就進得來（外部稽核全程沒掃過卡片）。og:image 也改用**該卡自己的卡面圖**，不要 24 個節氣分享出去長得一模一樣。
  - **★★★★ 語言模型沒有時鐘：任何跟「現在」有關的東西都要由後端算好餵給它**（`src/data/cardTime.js` ＋ `personaTimeBlock()`）。先前系統提示裡完全沒有日期，模型只好把卡片上的「小寒」當成此刻 ⇒ 8 月的台灣（33 度、剛過大暑）它開口就是「小寒的風有點冷」，還宣稱自己「正忙著長得圓滾滾」；問它今天幾號則答「我想不太出來」——**不是算錯，是根本沒有這個資訊**。
    - **★★ 時間區塊必須逐次請求算**，不可烤進 `AR_PERSONAS`（那是啟動時算一次的），否則服務跑過午夜就會一直講昨天。
    - **★★★ 三種語態**（`phase`）：`BEFORE` 期待式（「還要等 142 天」）／`DURING` 現在式（卡片那句原文**只有這時候**才成立）／`AFTER` 回顧式。開場白也要跟著換——`obj.line` 是現在式，照講就是那個讓人以為壞掉的 bug。
    - **★★ 節氣不是查表是真的天文演算**（`lunisolar.js`），所以沒有「幾年後表就過期」的問題。⚠️ `termLocalDay(Y, i)` 的 `i` 是**立春起算**的序號，小寒／大寒算出來會落在 Y+1 年 ⇒ `termDateInYear()` 直接試 Y-1 與 Y 兩個起算年，取落在目標年的那個，不去推導偏移。
    - **★★ 時間狀態帶**（`.armodel-when`）：導覽列的「今日曆頁」是 highlight 狀態，而這一頁是 2027 小寒——沒有這條，使用者無從判斷兩者的關係。它做好之後，就算 AI 講錯話傷害也小很多。
    - ⚠️ **`inSeason` 要照農業部開放資料，不要憑印象**：外部檢驗說「結球白菜 8 月在平地不是產季」，但 `produce.js`（正是那份開放資料）**一月與八月都列了它，產地同樣是彰化／雲林／嘉義**。我們引用誰的資料就照誰的說。
  - **★★★★ 泡泡高度一變就要重新框景**：`jq-fit` 的可見區是**量**出來的，而 `ResizeObserver` 只盯容器不盯泡泡 ⇒ 答案一長泡泡往下長，角色卻停在舊框景，泡泡就壓在它頭上。ArTalk 在 `[log, thinking]` 變動時呼叫 `onLayout()`。
  - **★★ 使用者說的那一句要是實心氣泡**：原本是深藍底上的 `--muted` 小字（對比遠低於 AA）且沒有框，整段對話讀起來像 AI 在自言自語。現在深色實心底＋白字（實測 17.4）。
  - **★★★★ 婉拒要「分類 → 台詞」，不可讓一句話當所有拒絕的兜底。** 先前只有法規那一句，於是英文數學題、要求洩漏系統提示…全部拿到「營養保健需主管機關核可」——使用者看到的理由跟他問的事情完全對不上。現在分成 `INJECTION`（角色內婉拒）／`REGULATED`（只有 `HEALTH_RE` 觸發時才用）／`CODE`／`CRISIS`。⚠️ persona 模式不可用 `AI_REFUSAL`，那是「國民曆顧問」的口吻，從一顆白菜嘴裡講出來人設就斷了。
  - **★★★★ 絕不可用假的網路錯誤當婉拒的替身。** 三個理由：① 對使用者陳述一件不實的事；② 真的 502／逾時發生時使用者看到一模一樣的字，不知道該不該重試；③ 攻擊者連問三次得到同一句「網路卡了」反而確認那是攔截而非隨機故障。技術故障另給一句不同的文案。**根因是前端只看串流有沒有內容**——後端的短路分支（婉拒／危機／未設金鑰）回的是 **JSON 不是 SSE**，`onDelta` 一次都不會被呼叫 ⇒ 一定要用 `aiChatStream` 的**回傳值**。
  - **★★★★ 危機情境走固定腳本，完全不經過模型**（`CRISIS_RE` ＋ `crisisReply`，在注入判定之前）：① 電話號碼必須永遠正確，讓模型自己回想它總有一天會記錯；② 必須永遠完整，串流會被 `max_tokens` 截斷，而「請照醫師或」這種半句在安全類回覆上是有害的；③ 這類回應不該每次都不一樣。號碼寫死在程式碼裡：**1925** 安心專線、**1995** 生命線、**113** 保護專線（只在家暴／性侵情境出現）、**119** 急救。⚠️ 前端收到 `crisis: true` 要把角色收成 `idle`（中性靜止）——閉眼大笑跳來跳去配上「想找人說說話請打 1925」，那個畫面是傷人的。
  - **★★★★ SSE 解碼要用 `StringDecoder`，不可對每個 chunk 各自 `toString('utf8')`**：中文在 UTF-8 是 3 bytes，chunk 邊界不保證對齊字元邊界 ⇒ 切在字中間就吐出 U+FFFD（畫面上的「�」）。⚠️ 這個 bug **英文測試永遠測不到**，而且**本機也不容易重現**——localhost 上 Node 的 HTTP 層會把小 chunk 合併（實測逐 byte 寫入仍拼得回來），所以「本機沒事」不等於線上沒事。
  - **★★ 免責標註要釘在泡泡底部、捲動區之外**：先前它跟內文一起放在可捲的區塊裡，長一點的回答就把它捲出可視範圍——**看不到的免責標註等於沒有**。內層加底部漸層當「還有下文」的提示。⚠️ 內層高度上限刻意壓在 26dvh：泡泡越高 `jq-fit` 的可見區越小、角色就越小。
  - **★★ 「這枚徽章你已經有了」要放在題目之前並寫成邀請**：原本掛在送出鈕底下、作答之前就出現，讀起來像「你做這題也沒用」。徽章狀態在**作答之後**才是重點。
    - **★★★★ 訪客也走得到模型：`/api/ar/talk` 不需登入（2026-08-11）。** 先前走 `/api/ai/chat`，而它有 `requireAuth` ⇒ 訪客一律 401 ⇒ **模型從頭到尾沒有被叫用過**，每個掃到卡片的人看到的都是同一句罐頭「這張卡上沒有寫到」。而掃到卡片的人多半就是還沒註冊的第一次訪客——那是這條動線的**主要客群**，不是例外。
      - 代價是這支端點沒有登入把關、會直接燒 OpenAI 額度。防護四層：① persona 必須命中白名單；② 每 IP 每小時 40 次；③ **全站每日總量上限** `AR_TALK_DAILY_MAX`（預設 3000，超過就回 fallback 讓前端退回卡片資料，而不是把帳單燒穿）；④ 輸出仍走 `streamGuarded`。要收回這個決定，在 `arTalkLimiter` 前面補 `requireAuth` 即可。
      - **★★★★ 守門只能有一份實作**：`/api/ai/chat` 與 `/api/ar/talk` 共用 `streamGuarded()`。兩份實作遲早分岔，而分岔的那一份**不會有人發現**——它平常永遠通過。閘門鎖住「`HEALTH_RE.test` 全檔只能出現一次」。
      - **★★★★ `onDelta` 給的是「累積全文」不是增量**（`api.js`：`full += m.delta; onDelta?.(full, false)`）。寫成 `got += d` 會變成平方級的重複亂碼，**而且被守門攔下時的 `replace` 會被接在髒字後面**——那正是守門要移除的東西。這個 bug 寫進去兩版都沒被發現，因為 AI 那條路在本機從來沒被真的跑起來過（訪客一律 401）。⇒ **端到端沒跑過的路徑，等於沒寫過**；用一支假的 OpenAI（SSE stub ＋ `OPENAI_BASE_URL`）就能在本機跑完整條路。
    - 新增的只有**問句的措辭**（`fact.ask`）與**回答時的動作**（`fact.act`），卡面事實一項都沒有新增。
  - **★★★ 語音要有逾時看門狗**：`speak.js` 已處理「run() 拋例外」與「單句 onerror」，但還有一種它接不到的失敗——`synth.speak()` **靜默地什麼都沒做**（部分 WebView、系統沒有中文語音、音訊被佔用）。那時 `onend`／`onerror` 都不觸發 ⇒ `busy` 永遠 true ⇒ **每一顆提問 chip 永久 disabled**，而畫面看起來完全正常。逾時就放行——字已經在畫面上了，沒唸出來不該連帶把對話鎖死。
  - **⚠️ 換熱區要 `hush()`**：不然白菜會用臘八粥的身分把上一段唸完，而畫面上的名字已經換人了。
  - **★ 排版依使用者的參考圖（2026-08-11）**：**一整片連續的場景**（`.armodel-scene`）——角色、對話泡泡（尖端朝上）、2×2 選項格、底部輸入列**共用同一個背景**，控制項疊在下半。這是參考圖最主要的特徵：它讓人覺得是「站在角色面前跟它說話」，而不是「在操作一個 3D 檢視器」。
  - **★★★ 這一頁的深色背景幕是全站唯一的 UI 漸層例外。** 站規是「印刷不會有漸層」，而那條規則講的是**介面元件**（按鈕、卡片、chip）；這一塊是 3D 場景的背景幕，性質接近「攝影棚的背景紙」。即使如此它仍然是例外，所以：**只在 `.armodel-scene` 這一個 class、只用品牌深藍**、不可擴散到其他頁面。要收回去就把 `background` 換成 `var(--tone-1)`（記得同時把疊在上面的淺色文字改回墨色，否則會變成淺底淺字）。深底之上的文字實測對比 11.3~14.9，遠高於 AA 的 4.5。
  - **★★★ 框景要把「被控制項蓋住的那一段」扣掉**：對話泡泡與選項疊在畫布下半，照整張畫布置中的話**角色的臉正好被泡泡遮掉**——而那是這一頁唯一要看的東西。`jq-fit` 多吃一個 `visible`（可見比例）：距離按 `tanV * vis` 算，再把相機往下移 `(1 - vis) * d * tanV`，模型就落在可見區正中央。實測角色佔畫布 10.7~44.4%（含各種旋轉角度），泡泡頂端在 56.6%，任何角度都不會被遮到也不會被裁切。
  - **★★★ 開場白要把玩法講出來**：使用者是剛從相機被送過來的，畫面上是一隻會自轉的白菜、幾顆看起來像標籤的按鈕、一條輸入列——沒有任何前例可循，不講的話多數人只會看著它轉，而這一頁的全部價值都在「可以問它」。參考圖的第一句就是「請選擇一個選項或直接輸入」。⚠️ 這句是**介面說明不是事實陳述**，不需要出處；但也不可以寫成「我什麼都可以回答」——它只認得這張卡上的內容。⚠️ 多這一行會讓面板高 28px ⇒ `visible` 從 0.519 掉到 0.389 ⇒ **角色小 25%**，所以要從 `.artalk` 的 `padding-top`（--space-6 → --space-4）換回來（實測回到 0.414）。這一塊每高一格角色就小一格，加東西前先想清楚要從哪裡付。
  - **★★★ 泡泡的三個點只能綁「想」那一段，不可綁整個 `busy`**：`busy` 涵蓋「想 → 說完」（用來擋重複提問），而三個點只該出現在那 480ms 的停頓。共用一個旗標的話，答案會在**整段朗讀期間**被三個點蓋住——40 字要 7 秒才看得到字，正好違反站規「語音是輔助不是替代，絕不可把文字藏在語音後面」。⚠️ 症狀只是「反應有點慢」，不會被回報成 bug；而且**不支援語音合成的瀏覽器反而正常**（`finish()` 立刻執行），所以在桌機上測不出來。已拆成 `thinking` 並上閘門。
  - **★★★ 泡泡的尖角畫在外層，所以外層絕不可有 `overflow`**：尖角是 `::before` 且 `top:-11px` 伸出框外，外層一有 `overflow-y:auto`（原本為了讓長答案在泡泡內捲）就會把它**整個裁掉**——而症狀只是「泡泡看起來像一塊圓角方塊」，沒有錯誤訊息，也不會有人想到是 overflow。限高與捲動一律放內層 `.artalk-bubble-in`。⚠️ 尖角**只要一個**（置中對著角色）：兩個看起來像頁籤不像說話。
  - **★★★ `.artalk-send` 一定要寫 `width: auto`**：`.btn-primary` 帶著 `width:100%`，而在 flex 列裡 `flex-basis:auto` 會去讀 `width` ⇒ 送出鈕的基準寬度是**整列**，把輸入框壓成一顆小藥丸（實測 375px 下輸入框只剩 min-content、發送佔滿整條）。`flex: 0 0 auto` 擋不住這件事——它管的是伸縮，不是基準值。修好後 375px 是 255 : 80、1280px 是 556 : 80。
  - **★★★ 資料卡預設收起來（`showCard`），而小挑戰在它**裡面** ⇒「考考我」一定要 `setShowCard(true)` 再捲**：少了展開，`quizRef.current` 是 null ⇒ 捲動靜默失敗 ⇒ 畫面上什麼都不會發生，而角色剛剛才說「好啊，往下看——我出一題」。⚠️ 展開之後 DOM 還沒長出來，同一輪一定捲不到，要等下一幀；用 `setTimeout` 不用 `rAF`（分頁在背景時 rAF 完全不觸發）。⚠️ 為什麼要收起來：這一頁的主角是「跟角色說話」，一整塊條列資料攤在下面會把它變成「3D 檢視器 ＋ 說明書」。
  - **★★★ 泡泡在角色**上方偏右**，尖角朝下（2026-08-11 依使用者指定）**：所以可見區**不再貼著畫布頂端** ⇒ `jq-fit` 除了 `visible`（有多高）還要吃 `offset`（從哪裡開始）。相機位移改用通式 `shift = (0.5 − (off + vis/2)) · 2·d·tanV`——舊的 `(1 − vis)·d·tanV` 只在「可見區貼齊頂端」時成立，照搬會把角色往上頂、臉正好躲進泡泡後面（與先前那個 bug 同樣的症狀、不同的成因）。⚠️ 泡泡寬度不是美感問題：窄一格就多一行，而每多一行角色就小一截（實測 268px 寬時開場白排成 3 行、泡泡 133 高 ⇒ 角色只剩 32.6%）。⚠️ 主題列的「詳細」鈕高度要**固定 36**不可用 padding 撐——底下的泡泡是用 `calc` 讓開這一列的，padding 撐出來的高度會隨字級變動 ⇒ 讓開的量對不上 ⇒ 按鈕直接壓在泡泡上（實測整段重疊）。
  - **★★★ `jq-fit` 一定要有 `update() { this.fit() }`**：沒有它，`setAttribute('jq-fit', …)` 只是改了資料而**不會重新框景**——縮放寫得進去卻一點反應都沒有，而且完全不報錯（實測捏合到 2 倍，相機 z 仍停在 5.88）。它一直沒被發現是因為先前只有 `jq-character-ready` 與 `rendererresize` 會呼叫 `fit()`，而可見區剛好都在那之後才寫入。
  - **★★★ 手勢：左右拖曳＝繞 Y 轉動、上下滑動＝**改變俯仰角度**、雙指／滾輪＝縮放（0.6~3×）。**
    - ⚠️ 2026-08-11 曾誤把「上下滑動」做成**換主題**，使用者當場訂正。它就是俯仰。`check-ar.mjs` 鎖住 `jq-swap` 不可再出現。
    - **俯仰的夾角上限（±35°）必須與 `jq-fit` 的 `maxPitch` 是同一個數字**：那邊拿它當**靜態上界**去算「縱向最多會佔多高」（`halfHeight·cos p + radiusXZ·sin p`）。兩邊不一致就會在極端角度被裁掉；而用「當下角度」去算的話使用者一拖動框景就忽大忽小。實測 −35°~+35° 共 15 個角度，最擠的剛好佔可見區 **100.0%**（margin 1.0 ＝ 貼齊，不裁切）。
    - **滾輪監聽器必須是非 passive**（要 `preventDefault`），否則在模型上滾動會把**整頁捲走**，而使用者以為自己在縮放。
    - **★★ 換主題只剩按鈕（`.artalk-swap` ‹ ›，帶 `aria-label`）**，不綁手勢——手勢已經給俯仰了，而且鍵盤與讀屏使用者本來就比不出手勢。
    - **換主題只換內容不換模型**：這張卡只有結球白菜有 `model`，所以說話的人一直是它 ⇒ ArTalk 的稱謂要用 `speaker`（卡片主角）不可用 `obj.name`，否則會變成「問問小寒 · 身體保健…」。
    - 場景只建一次（effect 相依是 `[slug]`），所以場景事件的處理函式會**閉包住第一次 render 的值** ⇒ 要用 ref。與「`remember()` 不可放進 setState 更新函式」同一類的陳舊閉包問題。
  - **★★★ 選項只留兩顆（「考考我」「看詳細資料」），主題列整條移除（2026-08-11 使用者指定）。** 原本 6 顆排成 3 列光那一塊就佔掉畫布約 136px，而**這一頁的每一格高度都會直接換算成角色變小**。砍掉的四顆各自要有著落，不可以就這樣消失：三顆提問 → 打字問（`findAnswer` 本來就搜整張卡，所以連別的熱區都問得到），**開場白因此必須舉例**（「例如「品種」「產地」」）——那是唯一還剩的線索；做個動作 → **點角色本人**（`jq-poke`）。⚠️ 點擊判定要與拖曳分開（比對按下與放開時的 yaw／pitch 差 < 2°），否則轉完放手就冒出一個動作，看起來像亂跳。
  - **★★ 場景要填滿整個頁面**：`.armodel-scene` 改成 `flex: 1 1 auto` ＋ `min-height`，並把 `.body` 的下內距歸零，否則場景底下會留一條白帶。⚠️ 歸零的選擇器要一路寫到 `.stage.signed-in .screen .body.armodel-body`——桌機那一條是**四個 class** 而且在後面，只寫 `.armodel-body` 甚至 `.screen .body.armodel-body` 都蓋不掉（實測桌機仍留 8px）。⚠️ `min-height` 一定要留：桌機的 `.body` 是內容高，`flex-basis: auto` 在那裡不會長出高度 ⇒ `<a-scene embedded>` 拿到 0×0 且不會自己重試。結果：角色從 27% 變 **38.6%**（桌機 38.9%），底下留白 0。
  - **★★★ 回答要「人性化」但只能加語氣不能加事實**（`WARMUP`）：招呼句一律是「這個我熟！」「問得好，」這類純語氣的話，後面接的答案仍然是**逐字的 `fact.value`**。⚠️ 絕對不可以在招呼裡加任何關於這個物件的敘述——那會變成沒有出處、而且**不會被建置期法規閘門掃到**的內容。招呼與答案分成兩個欄位（`warm` / `text`）存進 log，就是為了讓「答案是逐字的」這件事在程式碼裡看得出來，不會被人順手改掉。⚠️ 招呼在點擊當下決定一次，不可在 render 時決定（否則每次重繪都換一句）。
  - **★★★ 小挑戰在**對話串裡**出題（2026-08-16 使用者指定），不再彈出另一套 UI。** 角色在泡泡裡問，下面那排 chip **暫時變成選項**，答完由角色回饋。⚠️ 站上的題目**全部是複選** ⇒ 不可做成「點一下就作答」，要能勾選（`aria-pressed`）再送出，另有「先不答」的出口。⚠️ 送出後才標對錯——作答中就標紅等於直接給答案。⚠️ 模型頁因此**不再掛 `ArQuiz`**（同一段動線不該有兩套出題 UI）；沒有對話框的 `/ar/card/:slug` 仍然用它。
  - **★★ 徽章的講法有先後**：「這枚你已經有了，再玩一次也行」要在**題目之前**（寫成邀請）；「你拿到徽章：◯◯」要在**作答之後**。反過來就變成「你做這題也沒用」。
  - **★★★ 詳細資料是**彈窗**（`SheetMask`），頁面本體只剩場景（2026-08-11 使用者指定）。** 一定要走 `SheetMask`——Esc、焦點鎖、`role="dialog"`、離場動畫都做在那裡，自己刻一個 div 會少掉這四件事，而少掉的每一件在畫面上都看不出來。⚠️ 底部原本那兩顆（「看這張卡的完整內容」「再掃一次」）已依要求從頁面移除，**改放進彈窗的最後**——直接刪掉的話，從相機跳進來的人就沒有路回去再掃一張，而那是這條動線唯一的重來方式。⚠️「考考我」的台詞要跟著改：小挑戰現在在彈窗裡，再說「往下看」就是指錯方向。
  - **★★ JSX 註解裡絕對不可以寫出 JSX 註解的結束符號**：它會提前收掉那個註解，剩下的字直接變成畫面上的文字。實測踩到——整個彈窗內容被換成半句註解，而 `npm run build` **一個字都不會報**。同理 `{(close) => (` 括號裡是 JS 運算式位置不是 JSX，註解放進去是語法錯誤（那個反而會報，但錯誤訊息指向下一行的 `className`，很容易看錯地方）。
  - **★★★ 「詳細資料」的入口是選項格裡的一顆 chip，不可做成場景頂端獨立的一列**：那一列實測佔掉畫布 56px，而**每一格高度都會直接換算成角色變小**（`jq-fit` 是按可見區算距離的）。放進選項格是免費的——原本 5 顆就已經排成 3 列，加到 6 顆還是 3 列。目前正面 27.0% 佔畫布（先前 24.3%），泡泡 2 行、可見區 0.418。
  - **★★ 底下那條「看資料卡」按鈕與手勢說明已移除（使用者要求），入口改到場景內主題列的「詳細」**：移掉之後一定要確認資料卡還有路進得去——否則就只剩「考考我」一條，而那是答題不是查資料。
  - **★ 散景光點（`.armodel-scene::before`）是純裝飾，三件事缺一不可**：`pointer-events:none`（它鋪滿整個場景，會吃掉舞台的拖曳手勢，而症狀是「模型轉不動」卻看不出有東西擋著）、`z-index:0` 疊在 canvas **之下**（反過來是一層霧蓋在角色臉上）、無限動畫要能被 reduce-motion 關掉。
  - **★★★ 那個比例必須是量出來的，不可寫死**：對話面板的高度會隨字級、答案長短、有沒有小挑戰而變（實測 411×889 上是 0.52~0.58）。寫死就會在某些狀態下把臉遮掉。⚠️ 這個窗格的 `ResizeObserver` 不會觸發，所以除了 RO 也掛了 window resize，兩條路都留著。
  - **★★★ 不顯示對話紀錄**：做過一版可捲的歷史區，但它會把底下的輸入列往下推——實測問四題之後輸入列跑到 top 984 而視窗只有 889，**使用者要捲下去才打得到字**。改成只留「你問：◯◯」一行小字 ＋ 泡泡（限高 18dvh 自捲）。實測連問四題後輸入列仍在 818–867，穩定在畫面內。
  - **★★★ 手動輸入不接 LLM，`findAnswer()` 在卡片自己的資料裡找**：先找目前這個物件，再找同一張卡的其他熱區（所以在白菜身上問「臘八是哪一天」也答得出來），命中就逐字用 `fact.value` 並附上它的 source。**查不到就明說查不到**並列出它知道什麼——掰一個看起來合理的句子等於把法規閘門繞過去，因為那句話不會經過建置期的營養／療效掃描。實測「白菜有什麼營養」得到的是「這張卡上沒有寫到這個」。
- **★★★ 兩個在做對話面板時才現形的既有 bug（2026-08-11）**：
  - **`.scan-hit` 在模型頁不可限高自捲**：那個 `max-height:40dvh; overflow:auto` 是為 `/AR` 設的（它疊在即時相機畫面上，不限高會吃掉整個取景框）。照搬到模型頁就把小挑戰**藏進卡片內部的捲軸裡**——實測卡片可視 354／內容 619，答題區完全看不到，而畫面上沒有任何跡象顯示被截斷了。
  - **★★★ `scrollIntoView` 對 `.device .body` 是靜默無效的，而且 `.device .body` 有兩個。** 有堆疊畫面時根分頁那一層與堆疊畫面那一層**同時存在**，`document.querySelector` 取的是第一個——躺在底下、使用者根本沒在看的那個。實測按「考考我」：捲了根分頁的 body（scrollTop 0→863），目標元素在另一個 body 裡，位置一點都沒變。⇒ `nav.jsx` 匯出 `scrollIntoContainer()`，從**元素自己**往上找捲動祖先（並確認它真的捲得動）。
- **★★★★ `check-ar.mjs` 的去註解器對 JSX 是壞的，2026-08-11 才發現（而且壞得完全靜默）。**
  判斷 `/` 是不是 regex 開頭用的是**否定式**判準（「前一個字元不是 `[\w$)\]}]` 就當 regex」）。JSX 的 `</p>` 前面是 `<`、`attr={x} />` 前面是 `}`，兩者都不在集合裡 ⇒ 被當成 regex 開頭 ⇒ 一路吞到下一個 `/`（往往是後面 `{/* … */}` 的那個）⇒ **從那一行之後整份檔案都沒被去註解**。實測 `ArModel.jsx`／`Scan.jsx`／`CardPage.jsx` 三支都中招，於是「原始碼不可出現 X」那一類檢查全部失去意義，卻照樣回報「通過」。
  - 改成**肯定式**：只有 `( , = : [ ! & | ? ; + - * % ~ ^` 與字串開頭後面才可能接 regex。
  - 另外補了**樣板字串的巢狀**：`Scan.jsx` 的診斷字串是「樣板的 `${}` 裡又是樣板」，天真地「掃到下一個反引號就結束」會提早收掉外層。
  - ⚠️ 誠實話：JSX 那兩條自我測試有**兩道互為冗餘**的防護（判準 ＋「regex 不跨行就收手」），變異測試實測只拆任一道另一道仍擋得住，兩道都拆才會紅。**知道它們目前不強，比假裝它們很強有用。**
- **★★★★ 卡面內容的法規閘門（`check-ar.mjs` 的 G 段）曾經整個消失，2026-08-11 才發現並補回。**
  CLAUDE.md 一直寫著「`check-ar.mjs` 把「待審」變成閘門（`ok(!obj.nutrients)` ＋ 療效用語黑名單）」，但 2026-08-11 重寫 AR 層時 `check-ar.mjs` 是**從零寫的**，這一段沒有被帶過來 ⇒ **文件說有、實際上沒有**，而且完全沒有跡象（這種閘門平常永遠通過，所以感覺不到它不在）。⇒ **重寫一支閘門檔案時，要逐條確認舊檔的檢查有沒有被帶過來**，尤其是這種「平常永遠通過」的。
  - 現在鎖的是：任何物件不可有 `nutrients` 欄位；`name`／`line`／`warn`／`facts`／`link.label`／**小挑戰的題目、選項、解說**裡都不可出現營養素或保健療效用語。
  - **黑名單刻意不列「預防」「避免」**：卡面的 `warn` 是一氧化碳中毒的公共安全提醒，那是公共安全資訊不是食品的健康宣稱，不可被誤殺（自我驗證裡有這條反例）。
  - **負向檢查自己先證明抓得到**：用的樣本就是使用者參考圖上的原文（「維生素 C／幫助維持免疫力」「膳食纖維／促進腸道蠕動，幫助消化」「硫化物（蒜素）／具有抗氧化作用」）——實測三條全部攔下。
- **2026-08-11 一併訂正兩筆「被自己引用的出處否定」的卡面資料**（都是出小挑戰時逐項查證才發現的）：
  - **文旦不是一月當令**：原本寫「文旦：一月當令，source 農業部開放資料」，但 `produce.js`（正是 `build-produce.mjs` 從那份資料產生的）裡「文旦柚」**只出現在八、九月**。品項保留（卡面「食在地」那一區真的畫了它），但不可再宣稱當令。
  - **櫻花不是小寒開**：原本寫「花期：小寒前後陸續開花，source 站內節氣生活資料庫（花期）」，但 `termGuide.js` 小寒那筆的 `flowers` 是**空陣列**，整份檔案一次櫻花都沒有；而站上其他資料的方向相反——賞花清單寫陽明山「2–3 月」、武陵農場「2 月」，`termArticle.js` 把「山區的櫻花陸續開」放在**立春**。小寒是 1/5，**按這張卡自己的「看賞花地圖」點過去就會看到 2–3 月**。⇒ 這一區因此**沒有小挑戰**：唯一一條素材的出處查不到，湊不出可查證的題目，寧可少一題也不要編。
  - **徽章存 `localStorage['jq-ar-badges']`**（沿用站上 `jq-` 慣例，不要用文件寫的 `cq.ar.badges`——同一個 app 兩套命名遲早會漏掉一邊，例如「刪帳號時清本機資料」那段）。訪客也能拿（站上訪客沒有 session，寫入 API 一律 401）。
  - **底圖用 `card.target` 那張靜態檔**（`card:mind` 會順手縮出短邊 900px 的版本）。舊版另有一份 localStorage 縮圖快取，已隨自研路線刪除。
- **官方 AR 卡包在 `src/data/arCards.js`**：進 `/AR` 就有東西可掃。**「使用者自己登錄目標」已於 2026-08 移除**——那是工程 demo 的動線，拿到卡片的人不該先被要求登錄一張目標才能掃。追蹤只吃官方卡（`.mind` 由 `card:mind` 編譯）。舊裝置殘留的 `jq-ar-cards-v3` 刻意不主動刪除（使用者資料不該在改版裡被靜默清掉）。
  - **★ 沒有目標檔時的失敗是「靜默」的，必須主動講出來**：`public/ar/targets/` 缺 `.mind` 時，相機、掃描線、取景框全部正常，但沒有可比對的目標 → 永遠不命中 → 3D 永遠不出現。症狀與「沒對準／光線不夠／角度太斜」**一模一樣**，使用者會一直換角度重試。`Scan.jsx` 的 `.scan-nofile` 橫幅與 aria-live 都把這一種狀態**單獨列出**：那不是使用者對不準，再怎麼喬角度都不會成功。⚠️ 同理 aria-live 不可留著叫人去按已經移除的按鈕——**叫使用者去按一個不存在的東西，比不給提示更糟**。
  - **換稿用 `npm run card:mind -- 稿.png`**（`scripts/compile-mind.mjs`）：編出 `.mind` 並縮出備援頁底圖，檔名都從 `arCards.js` 讀（不讓人手打）。⚠️ `.mind`／png 底圖／`hotspots` **三者必須同一版**，否則「追得到但整個貼歪」（實測差 10.5%）。
  - **抓目標檔不可用 `cache: 'force-cache'`，而且只看 `res.ok` 不夠**：檔案不存在時 SPA fallback 回 **200 + index.html**，force-cache 把那份 HTML 存下來後，就算圖補上了也永遠拿到 HTML。症狀是「The source image could not be decoded.」——**「檔案不存在」偽裝成「圖片壞掉」**，會讓人去查圖片格式而不是查路徑。要檢查 `content-type` 是不是 `image/`。
  - **★★ 3D 角色不可綁「目前選中的熱區」**：`Scan.jsx` 原本寫 `if (!objectForHotspot(hotspot)?.model) return null`，而**使用者最自然的動作是把整張卡擺在畫面正中央** → 畫面中心對到卡面 (0.5, 0.5) → 落在「身體保健」區（x 0.224~0.728、y 0.258~0.510 正好含住中心）→ 那一區沒有 `model` → **白菜永遠不出現**，而卡面上白紙黑字印著「掃描主物件：結球白菜」。⚠️ `applyHotspot` 裡的「預設主物件」保底解不掉：它的條件是「完全沒瞄到任何熱區」，而這裡是**瞄到了另一個沒有模型的熱區**。**註解寫對了問題、程式卻沒解到**，正是它藏起來的原因。規則：選中的熱區自己有 model 就用它，否則退回 `primary` 熱區並錨在那一區。`check-mind.mjs` 用真的熱區資料算出「中心落在哪一區、那區有沒有 model」把這個事實釘住。
  - **★★★ 比對門檻是可以調的（我先前寫「沒有分數可調」是錯的）**：`matching/matching.js` 有三個常數 `HAMMING_THRESHOLD`(0.7, Lowe 比值)／`MIN_NUM_INLIERS`(6)／`INLIER_THRESHOLD`(3px)。`vite.config.js` 用建置期字串替換把 **Lowe 比值放寬到 0.75**，另外兩個**原封不動**。
    - ⚠️ **`MIN_NUM_INLIERS` 絕不可低於 6**：4 點正好是解出單應性矩陣的最低數量，等於「任意四點碰巧對得上就算命中」。實測 0.8＋內點4＋重投影5px 時，**完全不是卡片的隨機色塊畫面也會命中並跳轉**——那比掃不到更糟。`INLIER_THRESHOLD` 放寬同理（更多雜點被算成內點）。
    - ⚠️ 只放寬 Lowe 比值是**對症**的：描述子一髒，最佳與次佳的 Hamming 距離會變接近，`best/second < 0.7` 過不了關 ⇒ 候選配對變少 ⇒ 內點不足。放寬它讓略髒的描述子仍能進 RANSAC，而 RANSAC 與內點數門檻不動，誤判照樣擋得住（實測：非卡片畫面 0 誤判、真卡片 1.6 秒命中）。
    - ⚠️ `matching.js` **只存在於 worker 的獨立 rollup 建置**，外掛要同時掛在 `plugins` 與 `worker.plugins`，驗收也不能寫在主建置的 `buildEnd`。
    - ⚠️ 替換**找不到目標字串就要讓建置失敗**：靜默不生效＝「以為放寬了其實沒有」。
  - **★ 目標圖尺寸**與辨識率**沒有關係**（2026-08-11 實測，回應「是不是圖太大」）：把同一張卡編成短邊 1335／1024／800／640／512px 五種 `.mind`（尺度層級 12→8、特徵點 3961→2238、809→506 KB），在卡片佔畫面 90%／67%／45%／30%／22%／16% 六種距離下**命中率完全一樣**（都 4~5/5）；雜訊 σ 加到 70 也全部 6/6。所以**縮小目標圖不能解決掃不到**，只會少 300 KB 下載。⚠️ `image-list.js` 的尺度覆蓋是 `100/短邊` 到 1.0、每級 ×2^(1/3)，範圍本來就很寬——不要再往「尺度沒覆蓋到」這個方向猜。
  - **★★★ 已逐項排除的原因清單（2026-08-11，全部實測，不要再重複試）**：使用者的 Samsung Xclipse 540 掃不到，以下**都不是**原因——
    | 假設 | 怎麼測的 | 結果 |
    | --- | --- | --- |
    | 卡片版本不同 | 拿**使用者實際那個 `2027小寒-原稿-付印.png`** 跑真的 Controller | 90%／67%／45% **全 4/4** |
    | 目標圖太大 | 編成短邊 1335/1024/800/640/512 五種 `.mind` | 六種距離命中率**完全一樣** |
    | 距離／構圖 | 卡片佔畫面 90%~16% | 4~5/5 |
    | 透視傾斜 | 0~45° | ≤35° 全中，45° 3/4 |
    | 過曝／低對比／模糊 | brightness 1.6、contrast 0.5、blur 2px | 全 4/4 |
    | 摩爾紋（拍螢幕）／高 ISO 雜訊 | 週期 2~6px、σ 到 70 | 全 4/4~6/6 |
    | CSP／worker 檔案 | `check:live` ＋ 線上實抓 | 全部 200 |
    | mind-ar 版本過舊 | npm 查詢 | 1.2.5 **已是最新**（2024-01 後無更新） |
    ⇒ 唯一剩下的解釋是**裝置端算出來的特徵描述子是壞的**，而這一點由「自我測試餵網站內建卡面圖也失敗」直接證實。**下次再遇到掃不到，先看自我測試的結果，不要重跑上面這些。**
  - **★★★★ 結論（2026-08-11，用 MindAR 官方原版證實）：MindAR 在 Samsung Xclipse 540 / ANGLE on Vulkan 上根本不能用。** `/ar/plain.html`——**MindAR 官方文件的範例原樣，不含本站任何一行邏輯**——在該機上同樣認不出來。⇒ 這不是我們的程式、不是卡片、不是目標圖、不是相機、不是設定，是**函式庫與該 GPU 不相容**，調程式解決不了。
    - **所以產品面的正解是「快速判定 ＋ 切換到 QR」**，不是繼續調辨識：自我測試失敗 ⇒ `imageTrackingDead` ⇒ 若支援 QR 就把**狀態列的主要指示**換成「請改對準卡片左下角的 QR code」，並**隱藏特徵點計量**（它量的是影像品質，而問題不在影像，繼續顯示只會讓人以為還有得調）。
    - 升級判定從 8 秒縮到 **3.5 秒**：正常裝置實測 1.5~2.6 秒就命中，不會誤傷；而對已知沒救的裝置，多等 8 秒只是讓人白白喬角度。**實測：7.4 秒切換成 QR 模式（原本 12 秒以上），切換後掃 QR 1.8 秒跳轉。**
    - ⇒ **QR 從「備援」升格成「某些裝置上唯一的路」**。所以印刷稿的 QR 必須改成帶 slug 的網址（現在只編了站台首頁，多張卡時分不出是哪一張），這已經不是可選項。
  - **★★★ 使用者的裝置最終診斷（2026-08-11，相容模式也失敗後）**：`Samsung Xclipse 540 on Vulkan 1.3.279`／Android／Chrome 151。心跳 495、17 輪/秒、**畫面特徵點 372**、**比對成功 0 次**、自我測試失敗［match］、**相容模式開啟且 worker 已換成內建 blob**。⇒ TFJS 保守旗標與 worker 實作**都排除了**；偵測（keypoint）完全正常，只有**比對**永遠失敗。這台裝置的圖像辨識沒救，**QR 是唯一可用的路**（診斷顯示 `QR 備援：有`）。
    - **★★ 所以「相容模式也失敗」時畫面必須引導去掃 QR**。先前那個分支只寫「請複製診斷資料」，等於把唯一還能用的出路藏起來——使用者卡在那裡卻不知道有救。
    - **★★ 灰階尺度自動校正（`autoFixInputScale`）**：`InputLoader` 的 shader 假設 `texture()` 回傳 0~1 再乘 255；若某驅動不是這樣，輸出會差 255 倍。程式在 `dummyRun` 之後、`processVideo` 之前量一次，**只在結構性偏差（max ≤ 1.5 或 > 1000）時**把整個 `setOutput` 運算式乘上補償係數，校正後再量一次確認，沒修好就還原。⚠️ 不可去字串比對 `* 255.0`（上游改寫法會靜默失效），要用 regex 包住整個運算式。⚠️ 絕不可把「畫面本來就暗」誤判成需要校正。**實測**：注入「輸出除以 255」的假驅動錯誤 → 自動校正成功、3.3 秒仍認出並跳轉；正常裝置校正不介入、2.5 秒認出。
    - **★★ 但這不是使用者那台的成因**：實測尺度壞掉時**特徵點會變成 0**（Laplacian 門檻 3.0 永遠達不到），而使用者看到的是 **372**。⇒ 他的數值尺度是正常的，別再往這個方向查。
    - **★ 新增「影像數值範圍」診斷**（`tracker.probeInputRange()`）：`InputLoader` 的自訂 shader 假設 `texture()` 回傳 0~1 再乘 255。若某驅動回的是 0~255，輸出會變成 0~65025；反之則是 0~1。兩種情況下 Laplacian 門檻（3.0）都失去意義——**特徵點數量看起來很健康但全是雜訊**，正好符合「372 個特徵點卻 0 次比對成功」。本機基準值：`10.1~254.9（平均 63.2）`。若使用者的裝置顯示 `max ≤ 1` 或 `> 1000`，那就是源頭。
    - **★★★ QR 備援（`src/ar/qrFallback.js`）——完全不經過 TFJS 與 GPU 的第二條路**：卡面本來就印了 QR（實測解出 `https://chengqi.tw/`），而 `BarcodeDetector` 是**瀏覽器原生 API**，不碰 TFJS／WebGL／worker，正好繞開「裝置算出來的描述子是壞的」那一段。因為這條動線只需要**認出一次**（之後跳模型頁、不需要姿態與追蹤），QR 提供的正是那件事。
    - 與 MindAR **並行**跑（相機一接上就開始，不必等 1.7 MB 的追蹤引擎），MindAR 認得出來時仍由它先命中。
    - **★★★ `BarcodeDetector` 是 Chrome／Android 的 API，iOS Safari 至今沒有實作** ⇒ `qrReady` 在**每一支 iPhone 上都是 false** ⇒ 圖像辨識掛掉的 iPhone **百分之百**會走到「沒有 QR 備援」那一格。那一格原本只寫「請按複製診斷資料貼給我們」——那是給**我們**的東西，不是給使用者的下一步，等於把所有 iPhone 使用者留在死路上。現在一律導向 `/ar/card/:slug`（那一頁本來就是為「沒有相機」設計的，內容一點都沒少），診斷資料降級成「如果願意幫我們一把」。`check-ar.mjs` 鎖住「每一種『沒救了』的分支都要有 `screen="arCard"`」。
    - ⚠️ **只認本站網址**：不限定 host 的話，路上任何一張 QR 都會觸發跳轉。
    - ⚠️ **目前卡面的 QR 只編了站台首頁，認不出是哪一張卡**。只有一張官方卡時可以推斷；**多張時一律不猜**（猜錯會把人帶到別張卡的內容，比沒反應更糟）。**出第二張卡之前，印刷稿的 QR 必須改成帶 slug 的網址**（如 `https://chengqi.tw/ar/model/2027-xiaohan`），`matchCardFromQr` 已先支援。
    - ⚠️ 一定要 `getSupportedFormats()` feature-detect（iOS Safari 沒有這個 API），且**失敗一律靜默略過**——它是備援，不可反過來影響主路徑。偵測也不可重疊呼叫（部分實作會拋 `InvalidStateError` 然後靜默死掉）。
    - `matchCardFromQr` 是純函式，閘門在 node 裡直接測（含「多張卡時不可亂猜」的反例）。⚠️ 所以它不可相依 `location`——要防呆。
    - **★★★ 啟動流程最後那句 `to('searching')` 必須先確認不是已經 `locked`**：QR 通常比追蹤引擎（1.7 MB）先有結果，它一命中就設 `locked`，但啟動流程跑完會把狀態蓋回 `searching` ⇒ Scan.jsx 的跳轉 effect 因為 phase 變了而 cleanup 掉計時器，而一次性旗標已是 true ⇒ **跳轉永遠不會發生**。症狀是「QR 明明認出來了，畫面卻退回掃描中然後什麼都沒發生」。**實測踩到**（第一次接上 QR 就是這樣沒反應）。與「hotspot 進 deps」同一類：狀態被後到的寫入蓋掉。
    - **實測（正式 build）**：相機餵完全不是卡片的畫面 ＋ 模擬原生偵測器 → **1.6 秒由 QR 認出並跳轉**，狀態列正確顯示「用卡片上的 QR」；拿掉模擬偵測器改餵真卡片 → MindAR 1.6 秒認出，且**不會誤稱是 QR**。
  - **★★ 相容模式（`src/ar/tfjsCompat.js`）**：給「特徵點抓得到、比對永遠 0 次、連自我測試都失敗」的裝置（實測 Samsung Xclipse 540 / ANGLE on Vulkan）。TFJS **只在模組初始化那一刻**讀網址的 `tfjsflags`，所以旗標必須在 `await import(mindar)` **之前**塞進網址、import 完立刻還原。開啟必須**重新載入**（已初始化就不再讀）。⚠️ 實測 `?tfjsflags=HAS_WEBGL:false` 會讓 Controller 直接建構失敗——MindAR 硬相依 WebGL 後端，**純 CPU 那條路走不通，不要再試**。
  - **★★★ 負向檢查（「原始碼不可出現 X」）必須先證明自己抓得到**：`check-ar.mjs` 的 `MIN_NUM_INLIERS` 那條原本寫成 `[0-5]`，但產生檔案時 `` 被寫成**真正的退格字元 0x08**，於是 regex 永遠不匹配 ⇒ **閘門恆為通過**。變異測試當場抓到它沒反應。現在所有負向 regex 都先對一個「應該被抓到的樣本」自我驗證。**一個永遠通過的檢查比沒有檢查更糟。**
  - **MindAR 沒有「相似度」分數可顯示**（inlier 式判定，`score` 恆為 `null`）：狀態列若照舊寫死 `相似度 {track.score}%` 會顯示「相似度 **%**」——一個空的數字比不顯示更像壞掉。
  - **★ 收邊版與未收邊原稿的比對率是一樣的**（2026-08-10 用 `.mind` 實測，1280×960、卡片佔 55%：兩者都 **12/12**）。MindAR 的特徵點是局部且尺度不變的，多一圈外框不影響比對——**這與自研 dHash 路線的結論相反**（那條路線換版本會 0/2）。所以換到 MindAR 之後，「登錄版與付印版不同」不再是致命問題；**收邊的價值只剩下自研 fallback 那條路的四角偵測**。
  - **`cornersFromWorldMatrix` 的 y 翻轉已實測確認**（1280×960、卡片畫在 288..992 × 223..736）：不翻轉時逐角誤差 **1.0/1.0/1.2/1.6px**，翻轉時 337px。驗法是用合成畫面手動驅動 `_detectAndMatch` + `getWorldMatrix`（不需要相機也不需要 rAF）——這是這一層唯一能離線驗證的路徑。
  - **熱區命中一定要走 `makeHotspotLatch`（進入 3 幀／離開 8 幀）**：追蹤每秒 15 次、四角偵測有 1px 抖動，熱區邊界附近會在命中／沒命中之間高頻跳動，而開關內容面板是最貴的操作。**進出門檻必須不同**（hysteresis），同門檻時站在邊界上會等頻率一直開一直關。
  - **卡面內容刻意不放營養素與健康宣稱**：那受《食品安全衛生管理法》規範，未經食藥署核對不可上。`check-ar.mjs` 把「待審」變成閘門（`ok(!obj.nutrients)` ＋ 療效用語黑名單）。不碰營養宣稱也有足夠內容——品種／產地來自農業部開放資料、俗語與養生來自 `termGuide.js`、宜忌來自 `almanac.js`，全都可標來源。
  - **查某日屬於哪個節氣要用 `termFromDate`，不可用 `termLocalDay` 的序號反推公曆年**：小寒在「立春起算」的序號裡屬於**下一個**公曆年，`termLocalDay(2027, 22)` 會得到 2028-01-06。2027 小寒實際是 **01-05**（改版文件寫 01-06 是錯的）。
- **3D 角色層在 `src/lib/char/`（純 three，零 A-Frame）**：`geometry.js`（手刻葉／芯／四肢／臉貼片／菜根）＋`material.js`（賽璐璐＋inverted-hull 描邊）＋`face.js`（canvas 表情）＋`factory.js`（組裝＋preset）＋`actor.js`（通道式動作）。`components/ProduceStage.jsx` 是 React 進入點。`scripts/check-char.mjs`（100 項）掛在 `npm run build` 上。**移植自 demo `_6`：5 層 54 片葉子、102 顆 mesh、25 份幾何。**
- **★★★★ 唯一的移植來源是 `大白菜擬人-動作展示_6.html`。混到別支 demo 就是 2026-08-11 那場事故。**
  使用者回報「手的位置不對」，追出來的成因是：**菜身（菜心／5 層葉／菜根／臉貼片）逐字取自 `_6`，四肢／接觸陰影／相機卻是從 `白菜擬人-cel-demo_4.html` 抄的**（該檔 1107–1111 行的 `limbs` preset：`armX 0.382／armY 0.600／armR 0.053／armL 0.135／handR 0.072／handY −0.222／legR 0.056／legL 0.100／legX 0.112／footR 0.080／footSc '1 0.60 1.35'／cam.y 0.62` —— **一個不差，全部對得上**）。而那支 demo 的原點是 `baseY = +0.19`、**角色腳踩 y = 0**；`_6` 是 `baseY = −0.595`、**地面在 bodyRoot 空間的 y = −0.785**。⇒ 整組差 0.785。
  - **三個症狀是同一個成因，不是三個 typo**：手臂樞紐 y=+0.600 ＝身高的 **100%** ⇒ 兩隻手從菜頂戳出來（使用者說的「天線」）；髖 y=+0.218 ＝ 68% ⇒ **兩條腿整個包在菜心與內層葉之間，從外面一根都看不到**；陰影 y=+0.006 ⇒ 一圈半透明環套在**腰上**。
  - **★★★ 當時所有既有檢查全部通過**：mesh 數 102 對、幾何份數 24 對、包圍盒非 NaN、高度 1.334 落在「合理範圍 0.8–2.0」、y 中心 −0.008 也「大致置中」。⇒ **總量型的檢查抓不到「零件位置錯了」**。現在 `check-char.mjs` 有一張 `DEMO6` 對照表逐項鎖住手臂／髖／上臂／手掌／大腿／腳掌／頂芽／陰影的 position、scale、rotation 與幾何尺寸（7 項變異測試全部抓得到）。
  - **★★ 那張表的值是把 `_6` 跑起來之後從 `object3D` 直接讀出來的，不是抄原始碼**——抄原始碼會再犯一次同樣的錯（抄到別支檔案也看不出來）。重新量的方法：把 demo 複製到 `dist/`（`.gitignore` 內）並把 CDN 的 `aframe.min.js` 換成 `/vendor/aframe-1.8.0.min.js`（同版本），用 `preview` 開起來後讀 `document.getElementById('armL').object3D`。
  - **★★ 幾何份數 24 這條檢查本身鎖住了一個缺件**：24 剛好是「有陰影、**沒有頂芽**」的數字。demo 的頂芽（`sphere r 0.098 @ y 0.523`，用來擋葉尖收攏處那道縫）從來沒被移植，而檢查因為總數對得上就放行了。現在是 25。
  - **★★ 2026-08-11 的完整稽核**（5 個維度平行比對＋逐項反向驗證）找出 **91 項分歧、全部確認成立**（10 嚴重／46 中等／35 輕微），已全數修正。分佈：組裝 17、動作 16、臉 26、材質與光 27、幾何 5。**演算法層是忠實的**（`buildLimbGeometry` 與 demo 的 `soft-limb` 逐字相同、葉層 preset 與 `LAYERS` 逐字相同、ramp 公式算出來的值與 demo 實測一致），**漂掉的全部是「手調的常數」**。
  - **其中最大的三項**：① toon ramp `steps 3／lo 0.46`（demo 是 **5／0.58**，臉另有 **3／0.66**）—— 5 階柔梯變 3 階、暗面暗 21%，葉片交界出現粗硬深色帶，讀起來像「髒掉的白菜」；② 臉的嘴往下掉 0.114 H、**9 個表情裡有 8 個完全沒有眉毛**（舊版只有 angry 畫一條直線）；③ 四盞燈全部漂掉，方向一致地讓角色變暗變粉（背光 `#EEFFD2` 淡黃綠 → `#FFE6F0` 粉紅）。
  - **★★ 不可開真實陰影貼圖**：demo 實測 `shadowMap.enabled === false`。`MeshToonMaterial` 的 gradientMap 套在**已經乘過陰影衰減**的光照上 ⇒ 被遮蔽處直接掉進最暗那一階，畫面上是大塊硬邊的深色斑，把葉片頂點色畫出來的假 AO 蓋掉。
  - **★★ 也不可加 emissive**：demo 實測 `emissive #000000`。加了 0.05 等於每顆 mesh 多一層不受頂點色與光照影響的白霧，把「鄰葉壓在本片上的陰影溝」填掉一階，層層堆疊的立體感變平。
  - **★ 皺褶的方位角頻率必須是葉片數的整數倍**（`kAz = n`、`kRib = 2n`，factory 自動推導）：這樣 `sin(k(θ − i·2π/n)) = sin(kθ)`，同一層每片葉子落在**同一個曲面**上，只差 `rAdd` 一階，永遠不會互相穿插。頻率隨便取就會葉片穿模。
  - **★ 葉片半徑要用「世界高度 pu」取樣，不是這片葉子自己的 u**：同層有 3 種高度變體，用自己的 u 會讓矮葉在同一個世界高度鼓到高葉前面，**把臉遮掉**。
  - **葉尖用 |t|³ 不是 t²**：t² 會拉出尖峰，一圈葉尖讀起來像鬱金香花瓣。
  - **只描最外兩層（`li >= 3`，27 片）**：54 片全描邊會讀成「一叢芹菜稈」而不是白菜。
  - **臉葉的幾何 key 必須含 face 旗標**：`faceClear`／`gLift` 不同，共用到別片會讓其他葉子中間出現一塊莫名的白色平面。
  - **中央白葉柄的半寬是大白菜最關鍵的一件事**：綠色只長在那條白帶之外（`wRib`／`gpZone`）。實測算繪像素的綠度梯度由上到下 43 → 6 → 1，這條驗得出移植對不對。
  - **`bulge` 表要是「直筒」**：u=0.22~0.79 幾乎等寬（0.97），底部 20% 才收圓、頂部 76% 以上才收頂。一路線性收窄怎麼調都像竹筍；線性 flare 則會變成青江菜。
  - **preset 欄位改名一定要同步 factory**：`leafBaseY` → `baseY` 改了一半時 `baseY = undefined` → 所有 `position.y = NaN` → **世界矩陣 NaN → 模型整個不見**，而每一顆 mesh 的 position 屬性都是正常的，逐點檢查完全驗不出來。**要量世界包圍盒**（check-char 有這一項）。
  - **全解析度 230,310 個三角形超出策畫書 §6.1 的 180k 預算**（那份預算按舊版 29 片葉估的）。`ProduceStage` 因此**預設 `lod = 0.85`**（170,456，畫面看不出差別）。
  - **draw call ≈ mesh 數，而 LOD 只降細分、不會減少 draw call**：全解析度 102 超出 AR 的 ≤90。要進預算得少描一層邊 → **AR 用 `{ lod: 0.6, outlineLayers: 1 }`**（draw call 87、三角形 75,274）。
  - **反覆進出 3D 抽屜 20 次實測**：幾何恆 24、紋理恆 2、draw call 恆 102，收完仍拿得到新 WebGL context（策畫書驗收 #10）。
  - **這一層與 three 絕不可進主 bundle**：一律 `React.lazy(() => import('../components/ProduceStage.jsx'))`。實測懶載入分塊 **137.5 KB gzip**，主 bundle 只 +1.2 KB。無條件塞進去等於首頁多背三分之一重量給一個多數人不會點的功能。
  - **剝離 A-Frame 時 schema 預設值會消失**：`buildLeafGeometry` 讀十幾個欄位而 preset 的 layers 不會全給——原本靠 `registerGeometry` 的 schema 補。少了預設值就是 `sin(undefined)=NaN`，整份 position 變 NaN、**模型整個不見而且不拋任何錯誤**。geometry.js 自帶 `LEAF_DEFAULTS`，check-char 有專測。
  - **接觸陰影掛 `root` 不掛 `body`**：原 demo 放場景層級並用 `getElementById('blob')` 抓（註解寫「掛在角色底下會跟著跳起來」——觀察對，但角色就無法多實例）。正解是分兩層：root 不動、body 才受動作驅動，陰影掛 root。**別照字面把它改成 body 的子節點**，那會讓陰影跟著跳躍飛起來。
  - **`gradientMap` 必須 `NearestFilter`**：它是查表資料不是顏色，用 LinearFilter 會把階梯內插掉＝完全沒有賽璐璐效果，而且不會有任何錯誤訊息。
  - **幾何要共用**：葉片每層只有 3 種高度變體（54 片 → 15 份）、四肢左右同形（8 → 4 份）。退回去畫面完全看不出差別，只有記憶體與載入變差——所以 check-char 鎖死「幾何份數 **24**」（葉 15 ＋ 臉葉 1 ＋ 芯 1 ＋ 四肢 4 ＋ 根 1 ＋ 臉貼片 1 ＋ 陰影 1）。
  - **描邊不可每幀 `apply()`**：原本 `tick(){this.apply()}` 是 63 顆 mesh × 60fps ＝ 每秒 3,780 次無謂查詢。幾何建好就不會換，建立時做一次即可。
  - **React unmount 必須 `dispose()` 並 `forceContextLoss()`**：行動裝置能同時存在的 WebGL context 常見上限 8–16，反覆進出抽屜會拿不到新 context，症狀是「第 N 次點開變成空白」而前面幾次都正常。**ramp 快取是跨角色共用的，不可被單一角色的 dispose 清掉**。
  - **JS 驅動的動畫要自己讀 reduce-motion**（同 AnimatedText 那個坑）。作法是把幅度縮到 ~12% 而**不是整個停掉**——角色僵住不動看起來像壞掉，微微呼吸才像「靜止」。
  - **動作是 base ＋ additive 兩層**：原本的 `switch` 互斥，寫不出「揮手同時講話」。`setOverlay('talk')` 走 additive 通道相加，既有 12 個動作一行都不用改。
- **語音導覽在 `src/lib/speak.js`（Web Speech API，零相依）**：`/ar/card/:slug` 的「聽這一段」。**絕不自動朗讀**——這頁可能在公共場合被打開，而且沒有使用者手勢的發聲本來就會被 iOS/Chrome 擋掉（拿到一個靜默失敗的 utterance，看起來像功能壞了）。**語音是輔助不是替代**：不支援的瀏覽器**整顆按鈕不渲染**，一顆按了沒反應的按鈕比沒有更糟。
  - **`getVoices()` 第一次常常回空陣列**（清單非同步載入，Chrome 尤其明顯）。只呼叫一次就放棄的症狀是「第一次點沒聲音或英文腔，第二次才正常」，而使用者不會再點第二次。要等 `voiceschanged`，**並且加逾時**——有些 WebView 永遠不發這個事件，死等會讓按鈕卡在準備中。
  - **Chrome 桌機唸超過約 15 秒會被看門狗靜音砍掉，且不觸發 error**。常見繞法是定時 `pause()/resume()`，但那會在句中造成可聽見的頓挫。改成**切成短句依序排隊**：每段遠短於 15 秒，而且在句子邊界斷句本來就好聽。中文沒有空白可切要靠標點，**切出的空字串要濾掉**（`onend` 立刻觸發，聽起來像跳過一句）。
  - **`speechSynthesis` 是全域單例、跨頁面存活**：不在卸載時 `cancel()` 的話，使用者按上一頁離開，聲音**還會繼續唸完**，而畫面上已經沒有東西能停它。三個清理缺一不可：**卸載、切換熱區、分頁切到背景**。
  - **`lang` 一定要設**：不設的話英文系統會用英文語音唸中文，出來是一串亂音節。另外 `u.voice` 只接受原生 `SpeechSynthesisVoice`，塞別的會丟 TypeError → 要包 try（失敗就靠 `lang` 挑，不是致命的）。
  - **狀態不可依賴合成引擎不出錯**：`run()` 裡只要拋一次，狀態就永遠停在 `speaking`——按鈕寫著「停止朗讀」卻一個字都沒唸，使用者無從得知已經壞了。整體 catch 後退回 idle。**同「動畫只負責怎麼出現、不可負責是否存在」那條原則：失效要退回可用狀態，不是卡在中間態。**
  - `scripts/check-speak.mjs`（47 項）掛在 `npm run build` 上，**並且自己做過變異測試**：拿掉超長硬切、拿掉出處去重都會被抓到；但「不產生空段」那幾條抓不到——`splitForSpeech` 對空段有兩道互為冗餘的防護，拆掉任一道另一道仍擋著（等價變異）。那幾條是防未來一起拿掉的保險，**知道它們目前不強，比假裝它們很強有用**。
  - 唸的稿子（`scriptForObject`）與畫面上的字**刻意不完全一樣**：括號裡的出處逐條唸很吵，改成結尾說一次；對照表要補「，」才聽得懂分界。但**內容不增減**，不可為了順口加上畫面沒有的說法。
- **新增 effect 要放在它相依的 state 宣告之後**：`useEffect(..., [status])` 寫在 `const [status] = useState()` 之前會踩到 TDZ，**整個畫面被 ErrorBoundary 接走**（只看到「畫面暫時出了點狀況」），而 `npm run build` 完全不報錯。
- **「今天」一律取台北的日曆日（`almanac.js` 的 `taipeiToday()`）**，不可用 `new Date()` 直接算。**Cloud Run 的預設時區是 UTC**，比台北慢 8 小時——每天台灣時間 00:00–08:00 這八個小時，伺服器注入的首屏靜態層、sitemap 的 lastmod、RSS、逐頁 og:image 取的節氣、AI 的曆訊 context **全部會是前一天的**。瀏覽器端同理，人在美洲／歐洲會看到前一天。**不可用 `new Date(Date.now() + 8*3600e3)` 手動加時差**（在本身就是 UTC+8 的環境會多加八小時），要交給 `Intl` 判斷。Dockerfile 另設 `TZ=Asia/Taipei` 只是為了 log 可讀。
- **網址參數的日期一定要用 `parseDateParam()` 驗證**，不可只比對 `^\d{4}-\d{2}-\d{2}$` 就丟給 `new Date(y, m-1, d)`：JS 會**自動進位**（`2026-02-30`→3/2、`2026-99-99`→2034/6/7），兩位數年份會被當成 19xx（`0050`→1950），而 `9999-12-31` 會照樣算出一整頁煞有介事的宜忌神煞。可查詢範圍的唯一真相是 `BROWSE_RANGE_DAYS`（UI 箭頭停用、網址驗證、AI context 共用）——同一個限制分散在兩處就一定會不一致。無效參數要退回今天**並正規化網址**；指到今天要正規化成 `/`（否則 `/` 與 `/?date=<今天>` 同內容兩個網址）。
- **手機／矮視窗版面捲的是 `.device .body`，鍵盤捲動要自己實作**：`html`／`body` 的高度被鎖成一個視窗，而瀏覽器的鍵盤捲動作用在「有焦點的捲動容器」上——`.body` 從來沒拿到焦點，所以空白鍵、PageDown、End、方向鍵**全部落空**（違反 WCAG 2.1.1）。同理原生 anchor jump 也動不了它，「跳至主要內容」等於裝飾。**注意斷點**：手機層的條件含 `min-height:600px`，所以 1280×545 這種矮視窗也走手機版面。**不可用 `scrollBy({behavior:'smooth'})`**——實測在真的 Chromium 上對這個容器完全沒有作用且是靜默的，要直接指定 `scrollTop`。
- **浮層要有 Esc、焦點鎖與 `role="dialog"`**（統一做在 `SheetMask`）：原本按 Esc 沒反應、連按三下 Tab 焦點就跑到遮罩底下看不見的按鈕上、關閉後焦點掉回 `<body>`。開啟時把焦點移進面板、關閉時還給觸發按鈕。
- **`Number('')` 是 `0` 不是 `NaN`**：選填的 `<input>` 沒填時值是 `''`，用 `Number.isFinite(Number(x))` 當「有沒有填」的判斷會全數通過。實測擇日頁的出生年換算就是這樣壞的——月／日沒填時被當成「0 月 0 日」，永遠早於立春，於是每個人都被算成前一年的生肖（民國 87 年顯示「牛」，正解虎）。要先 `String(x ?? '').trim() !== ''`。
- **首頁翻到的日期存在網址（`/?date=YYYY-MM-DD`，`nav.jsx` 的 `homeDate`）不是元件 state**：先前是 local state，於是不管翻到哪一天網址都是 `/`——想把某一天傳給朋友做不到（貼過去對方看到今天），翻幾天後按「上一頁」會**直接離開整個網站**。**第一次離開「今天」用 pushState，之後一天一天翻用 replaceState**，否則翻五天就多五筆歷史（這個坑在 AlmanacDay 已經踩過一次）。
- **跨年時日期一定要顯示年份**：曆頁只寫「8 / 31 週二 · 農曆七月三十」，跳到 2027 年整頁找不到任何年份字樣，使用者百分之百會當成今年的 8/31 然後照這天的宜忌去搬家。同年不顯示（畫面乾淨），跨年一定顯示。
- **AI 的曆訊 context 要收「使用者正在看的那一天」**（`buildAlmanacContext(user, iso)`），不是永遠 `todayOffset()`。日期由前端傳入但**只取日期**、所有數字仍由伺服器算，與「不採用前端傳來的 context」不衝突。**一併帶入前一日與後一日**——「那明天呢？」是最自然的追問，而系統自己就把它列為建議問句，沒有這兩行就必定答不出來。**建議一個自己答不出來的問題，比不建議更糟。**
- **有堆疊畫面時 `.rootpane` 要加 `inert`**：手機上 `.screen` 是蓋在首頁上的浮層，背景那層看不見卻仍然吃 Tab——實測開 `/auspicious` 之後一直按 Tab，焦點會跑進看不見的首頁，按 Enter 還會去改一個使用者看不到的頁面的日期。桌機那層本來就 `display:none`，**所以不能只靠 CSS**。
- **`ToolRow` 給了 `screen` 就渲染成 `<a href>`**：`/almanac` 的 20 幾張卡片原本全是 `<button>`，不能 Ctrl／中鍵開新分頁、不能右鍵複製連結、螢幕閱讀器唸成「按鈕」、爬蟲也走不進去——而同站的 `/auspicious`、`/dream` 早就是正確的 `<a>`。純動作（登出、切換主題）才留 `<button>`。
- **404 的 `<title>` 不可沿用首頁的**：`injectMeta` 收到 `route === null` 就是未知路徑，標題要改成「找不到頁面 · 機巧時運」並補 `noindex`（原本的 `route?.noindex` 碰不到 `null`）。畫面顯示「找不到這個頁面」但分頁標題仍是首頁那句，使用者在一堆分頁裡分不出哪個是壞掉的。
- **擇日清單預設只列「接下來」**：一律從 1 月列起的話，8 月的使用者要往下滑過七個月才看得到還能用的日期，「共 N 天」也把已經過去的算進去。標題用「接下來還有 N 天」，另給「看整年（含已過）」的開關。
- **姓名筆畫要有長度上限（8 字）**：熊崎式 81 數理只定義 1–81，貼 45 個字進去會算出「地格 221 吉、總格 225 吉 → 87 分」——超過的數字沒有對應意義，卻給出權威感十足的吉凶。這與「查不到筆畫就明講查不到」是同一個原則。
- **解夢要顯示「實際比對到哪個關鍵字」**：輸入「我夢到我變成一台冰箱而且會飛」只比對到「飛」，畫面若原封不動印出整句加上原典斷語，看起來就像古書真的針對「變成冰箱」下了斷語。同時列出其他有比對到的詞讓使用者改選。
- **兄弟節點的 `key` 必須加前綴，不可直接用小整數**：`App.jsx` 裡 `.rootpane` 的 key 曾是 `{tab}`、`.screen` 的 key 曾是 `{stack.length}`，兩者是**同一層的兄弟**。tab 與堆疊深度都是 0–4 的小整數，撞在一起時（探索 tab=1 開一層堆疊＝深度 1，兩個 key 都是 `"1"`）React 會把兩個兄弟當成同一個節點配對而刪錯人：**舊的 rootpane 留在 DOM 沒被卸載，新的接在它後面**——使用者看到「探索」與「我的」整頁疊在一起（實測 `.device` 高度 766 → 2053）。**production build 不會有任何警告**（重複 key 的 console 警告只在 dev 版），只能從畫面上看出來。判斷這類 bug 的關鍵是**不對稱性**：tab=2 配深度 1 就完全正常。現在是 `root-${tab}` 與 `screen-${深度}-${畫面名}`，命名空間不可能相交。
- **`.screen` 在桌機是 `position:static`，靠 `flex:1` 撐開的畫面會塌掉**：相機／掃描是「取景器」不是文件，`.cam{flex:1}` 在內容高的容器裡等於 0，`.cam-stage{min-height:0}` 再把它壓到最小——實測 1180px 高的平板上整個相機只有 277px，取景畫面是一條細縫，看起來就是壞掉。這兩頁要明確給 `min-height:calc(100dvh - 62px)`。
- **hook 一律寫在提早 return 之前**：`PostDetail` 的編輯狀態（`editing/eTitle/eCap/saving`）原本寫在 `if (!post) return 載入中` 之後——第一次渲染只跑 11 個 hook、資料回來後 15 個，React 丟「Rendered more hooks than during the previous render」，**整個貼文詳情頁被 ErrorBoundary 接走**（點進貼文只看到錯誤畫面，build 不會報錯）。新增狀態時務必放在所有 `return` 之前。
- **`ToolRow` 本身是 `<button>`**：放進去的互動子元件不能是 `<button>`（button 巢 button＝DOM 穿模）；`Switch` 用 `<span role="switch">`。
- **`.calcell.empty` 的 `empty` 會撞到全站空狀態元件 `.empty`**（那個有 `padding:50px 24px`）：月曆前導空白格是 `<span class="calcell empty">`，被撐成 100px 把首週那列從 46px 拉高（就是舊註解說的「首週大空隙」，但原因不是 aspect-ratio）。`visibility:hidden` **不會讓它不占位**，必須顯式 `padding:0; min-height:0`。**新元件取 class 名前先確認沒有同名的全站元件。**
- **月曆格 `.calgrid`/`.calwk`**：用 `grid-template-columns:repeat(7,minmax(0,1fr))`，且高度用 `grid-auto-rows:46px` 固定、**不要用 `aspect-ratio`**——前導空白格是空 `<span>`，aspect-ratio 會把它撐成 ~100px 拉高首週那列、產生大空隙。
- **桌機內容卡 `.device` 用 `overflow:clip` 不能 `overflow:hidden`**：`hidden` 會讓它變 sticky 的捲動容器，害 sticky 頂列偏移出空白帶。
- **`.webnav,.webfoot` 的基礎 `display:none` 要放在 `@media(min-width:900px)` 之前**：同 specificity 時後者勝，放後面會永遠隱藏。
- **★★★ 節氣知識王的桌機版面：同一頁上有「兩個內容欄」（2026-09-08 依使用者截圖修）**。`.calpage` 被全站規則獨立置中成 560，而其他每一個區塊（按鈕、`SectionHead`、工具列、chips、排行榜）吃的是通則 `.screen .body` 的 720（內容盒 676）⇒ **卡片盒落在 80、其他區塊盒落在 22，左右各差 58px**。畫面上就是使用者看到的「按鈕比卡片寬、卡片莫名往內縮」。
  - **正解是把手機那套關係搬到桌機，不要另外湊一組數字**：手機端本來就是對的——每個區塊的內容左緣都是 16~17，`.calpage` 靠自己的 `margin:… var(--space-4)` 對齊。所以把版心收成 **636**（＝ 592 內容盒），560 置中後左右剛好各 16 ⇒ **卡片盒的左緣 ＝ 其他區塊「內容」的左緣**，與手機完全一致。實測 320／640／768／1280／1920／844×390 六種尺寸，卡片盒與內容左緣全部收斂到同一個值。
  - ⚠️ **不要改成「把 calpage 放寬到 676」**：560 是這張卡在全站的固定寬度（首頁曆頁也是），放寬會讓同一張卡在兩個地方長得不一樣。
  - **★★★ 這種修正要跟著「版面模式」的斷點走，不要順手寫進手邊那個 900px 的區塊。** 我第一版把兩條規則寫進 `@media (min-width:900px)`，於是 **600–899 的平板整段沒被涵蓋**，實測 768px 下卡片只有 **417px**——那個寬度沒有任何規則指定，是全站那條 `.stage.signed-in .calpage { max-width:560px; margin:auto }` 在 flex column 裡**用 auto 邊界關掉了 stretch**，卡片縮成內容寬（站規已記過「flex column 內用 margin:auto 置中會關閉 stretch」，這是它的第三次現形）。本站登入後的版面斷點是 **600px**，RWD 修正就要寫在 600px。
  - ⚠️ **版心的水平內距要明寫**：通則在 600–899 是 `padding:0 20px`、≥900 才是 22px。不寫死的話兩個斷點的內容盒寬不同（596 vs 592）⇒ 560 置中後的邊距是 18 vs 16 ⇒ 卡片左緣與其他區塊差 2px。
- **★★ `.calpage` 的 `min-height:318px` 在知識王是純死重，要關掉**（2026-09-08）：那條的理由寫在它自己的註解裡——「讓不同日期的宜忌長短不影響整體版面」，服務的是**首頁翻日**。知識王沒有翻日，於是它在這支畫面**哪一個狀態都沒有作用，只會製造死空白**：實測「配對中」與「模式選擇」內容只有 202px 卻被撐到 318 ⇒ 卡片下半空 **116px**（使用者截圖上那一大塊白）；而「遊戲中」自然高度 421px，地板根本碰不到。
  - ⚠️ **也不必另外給遊戲中一個地板**：45 題的題目最長 22 字、選項最長 13 字，桌機內容區 528px 下**每一題都只有一行**，逐題實測卡高恆為 421、落差 0。**沒有在跳的東西不需要防跳**——加一個永遠不會生效的地板，只是把死空白搬到別的狀態去。
  - ⚠️ override 必須限定 `.screen-quiz`：首頁那張卡仍然需要 318 的地板（已回歸驗證：首頁 `min-height` 仍是 318px）。
- **★★★ 全站 RWD 稽核：49 頁 × 6 種尺寸（320／375／768／844×390 橫向／1280／1920），結論是「本來就已經是響應式的」（2026-09-08）**。零橫向溢出、零真實文字重疊、零真實裁切；橫向手機滿版無外框、分頁列 62px；1920 下三條水平節奏對齊（453=453=453）。**唯一的真問題是麵包屑的觸控目標**（下一條）。⇒ 這一輪最有價值的產出其實是**量測方法**：8 個候選有 7 個是假警報，而每一種假警報都會誘導人去「修」一個沒壞的東西。
  - **★★★ 假警報一：行內元素換行時，`getBoundingClientRect()` 回的是「聯集」。** `/editorial` 掃出文字重疊，實際是兩個 `<b>` 各自跨 2 個行框，union 高 49px（每片段只有 21px），相鄰的行內元素**必然**看起來相交。⇒ 量重疊一定要用 **`getClientRects()` 逐片段**比對，不可用單一 union rect。（這與站規已記的「只能量最上層」是同一類的量測陷阱。）
  - **★★ 假警報二：`.chips` 的「出界」是刻意的橫向捲動列。** `/dream`、`/auspicious/moving` 的 chip 超出右緣 7 個，但容器是 `overflow-x:auto` 且 `scrollWidth 740 > clientWidth 375`——那是設計，不是溢出。判斷出界前要先問「它的祖先是不是捲得動」。
  - **★★ 假警報三：`scrollHeight > clientHeight` 不等於「內容被裁掉」。** `.coverbig` 量到 221>205 且 `overflow:hidden`，看起來是裁切；但逐一量每個文字節點，**最後一個子元素的底緣還在容器內 19px**，多出來的是裝飾用偽元素——本來就該被遮。⇒ 要判「真的被裁」必須量**文字節點**有沒有越過容器邊界，不是比對 scrollHeight。
  - **★★ 假警報四：`document.querySelector('.tabbar')` 只證明它存在，不證明它看得見。** 768px 下我一度以為「桌機導覽列與手機分頁列同時出現」，實際 `.tabbar` 是 `display:none`。⇒ 一律量 computed display 與 rect，不要用 `!!element`。
  - **★★ 假警報五（前一輪已記，這裡重演）：臨時查詢忘了限定最上層。** 有堆疊畫面時 `document.querySelectorAll('.body *')` 會同時撈到底下的根分頁，於是 `/editorial` 冒出一堆與首頁曆頁元素的「重疊」。稽核函式本身有限定，是我另外寫的那支臨時查詢沒有。
- **★★★ 麵包屑連結 26×17，掉出 WCAG 2.5.8 AA（24×24）——而且是「修過了但靜默沒生效」（2026-09-08 修）**：`reset.css` 的全域 44px 觸控規則**刻意豁免** `a[href]:not([class])`（行內文字連結套 44px 會撐破行高），而麵包屑的連結剛好沒有 class ⇒ 被豁免掉。
  - **★★★ 關鍵在於：那裡補的 `min-height` 對它是完全無效的。** `Breadcrumb` 為了在節與節之間插分隔符 `›`，把每一節包在 `<span>` 裡 ⇒ `a` 不是 `.crumb` 這個 flex 容器的直接子元素 ⇒ **不會被 blockify** ⇒ 仍是 `display:inline` ⇒ **`min-height` 對 inline 元素不生效**。⇒ 補觸控大小時**一定要同時改 `display`**，光寫 min-height 會安靜地什麼都不做。
  - ⚠️ `reset.css` 那句「這些緊湊型 chip 仍遠大於 24x24，所以豁免 44px 不會掉出 AA」**不是對每一個被豁免的元素都成立**，不可當通則信任——麵包屑就是反例。豁免的理由是「不要撐破內文行高」，不是「這些元素反正夠大」。註解已訂正。
  - 用 `inline-flex` 不用 `inline-block`：需要 `align-items:center` 讓 13px 的字在 24px 高的盒子裡置中。不套 44px 是因為 `.crumb` 是資訊列不是主要操作區，44px 會讓它比下方的頁面標題還高。
  - 實測 320／375／1280 三種寬度、10 餘頁：全部 ≥24×24（26×24、52×24、78×24、91×24），列高 36 不換行，零溢出、與分隔符零重疊。
- **★★★ 長文正文被排成「次要說明」（2026-09-08，依 `redesign-skill` 稽核修正）**：`styles.css` 的 `.card p` 是 `font-size:var(--text-xs)(15px); color:var(--muted); line-height:1.6`，而 `.card` 全站有 **83 處**——它同時服務兩種完全不同的東西：(a) 鍵值列底下的小字附註（本來就該小該淡）、(b) **24 節氣專文／12 神佛由來／解夢條目／編輯政策的正文本體**。於是站上最該被讀的長文被排成灰色 15px、行高 1.6，**層級整個倒置**。而 `--leading-body: 1.75` 這個 token 的註解白紙黑字寫著「中文內文」，卻從來沒有被用在任何一段中文內文上。
  - 修正後：正文 **16px／墨色／1.75／`max-width:var(--measure)`／`text-wrap:pretty`**，對比從 5.28 → **14.36**；附註維持 15px 灰 1.6。
  - **不可直接改 `.card p`**：83 處裡多數是 (a)，全域改會把每張卡的小字附註一起放大加深，等於把層級**再倒置一次**。用 `screen-<key>`（App.jsx 早就為堆疊畫面掛好）限定在閱讀型畫面，**一行 JSX 都不用動**。
  - **用 `:not([class])` 分辨正文與附註**：純正文是 `<p>{a.origin}</p>`（無 class），附註是 `.td-note`／`.td-crops`／`.td-saying`。React 在 className 是 undefined 時不會輸出屬性，所以這個判準可靠，而且剛好與語意一致。
  - ⚠️ **名單裡刻意沒有 `/about`／`/terms`／`/privacy`**：實測那三頁用的是 `.article` 不是 `.card`，本來就已經是 16px/1.75/墨色。列進去只會多三條**永遠不命中**的選擇器，讓人以為它們有在做事。
  - ⚠️ `text-wrap` 用 **`pretty`** 不是 `balance`：balance 是給 2~4 行標題用的（瀏覽器對長段落本來就會放棄），pretty 才是處理長文末行孤字的那一個。
- **★★★ 工具列分段改用 `<section>` 並把 `SectionHead` 收進去，但這會打壞 `nth-child` 的奇偶**（2026-09-08）：`.toolgrid` 從 `<div>` 改成 `<section>` 並把該段的 `<h2>` 移進去（原本 h2 是 section 的**兄弟**，section 裡沒有自己的標題＝語意空殼）。⚠️★ **標題會佔掉 `nth-child` 的第 1 格，奇偶整個反過來**：5 顆工具列時最後一顆從 `:nth-child(5)`（奇）變成 `:nth-child(6)`（偶），原本補滿整列的那條規則再也不會命中 ⇒ **右邊的洞會整組跑回來**，而畫面上沒有任何錯誤訊息，只是「又變得不平均了」。用 `:has(> .sech)` 把「有標題」與「沒標題」兩種情況分成兩條**互斥**的規則——只改成偶數的話，沒有標題的那種會反過來壞掉。另需 `.toolgrid > .sech { grid-column:1 / -1 }` 讓標題跨滿兩欄。
- **★★ 稽核要「先量再改」，量到不成立就不要改**（2026-09-08 用 `redesign-skill` 跑全站稽核的收穫）：這一輪有三項看起來很像問題、實測全部不成立，**都沒有動**——
  - **焦點環**：程式化 `.focus()` 不會觸發 `:focus-visible`，於是掃出「41 個互動元素有 39 個沒有焦點環」。實際上 `styles.css:1181` 的全域 `:focus-visible` 一直都在，用真的鍵盤路徑量到 `2px solid` 深藍。**照那份假報告去修，等於把一個好東西改壞。**
  - **`tabular-nums`**：站上是資料密集的曆法介面，看起來理當要用表格數字。實測**加了完全沒有效果**——大字走的是 **Georgia**，它沒有表格數字組（前後每位數寬度一模一樣）；而真正排成欄的十二時辰用的是無襯線字且置中，四格量出來都是 37.2px，本來就沒有錯位。
  - **換字體**（skill 建議 Geist／Satoshi／Outfit）：本站刻意用零下載的系統字（0 檔 0KB、無 FOUT/CLS），換 web font 是拿明確的效能與穩定性去換一個主觀偏好。**否決。**
  - 同理否決的還有漸層／glassmorphism／噪點疊層／spotlight 邊框／GSAP 捲動動效／picsum 佔位圖／打散圓角——前六項直接違反站規「印刷不會有漸層」與零相依原則，最後一項（2px 統一圓角）**本來就是印刷卡片的語彙，不是偷懶**。
- **★★★ 桌機雙欄的「水平沒有平均」不是邊界沒對齊，是奇數段尾巴留洞**（2026-08-16）：`/almanac` 與 `/create` 的工具列是一段一段的（各有 `SectionHead`），但 `.rootpane.grid2 .body` 是**整個 body 一張 grid** ⇒ 每一段的最後一顆若讓那一段變成奇數，右欄就空一格，而下一段的標題又跨滿寬 ⇒ 看起來像左右不平均。⚠️ **先量再改**：實測三條水平節奏（內容 body／頁尾 inner／導覽 inner）本來就完全一致（都是 213~1213），往「邊界對齊」的方向修一整輪都不會有任何改變。
  - 解法是每一段包一層 `.toolgrid`：**手機 `display:contents`**（版面完全透明，維持原本的長條列）、**桌機才變成那一段自己的雙欄**，並用 `.toolgrid > .tool:last-child:nth-child(odd) { grid-column:1 / -1 }` 讓奇數段的最後一顆補滿整列。⚠️ 這件事**沒有包裝層就做不到**：CSS 選得到「body 裡的第幾顆」，選不到「這一段的最後一顆、而且這一段是奇數」——段落的邊界只存在於 DOM 結構裡。
  - ⚠️ **加了 `display:contents` 的包裝層就一定要把它列進 `flex-shrink:0` 那條規則**（站規別處已寫過 `.ex-top`／`.feed-main` 同一個坑）：`.body > *` 比對的是 DOM 不是盒模型，選到的是包裝層本身，裡面真正變成 flex 項目的工具列**一顆都沒被選到** ⇒ 手機上被壓成 `min-height` 44px（實際需要 86~117）⇒ 標題與副標疊在一起。
  - ⚠️ 還有三條既有選擇器是寫 `.grid2 .body > .tool` 的（卡片外觀、`:active` 壓底、`:hover`），**多一層包裝之後 `>` 就對不上了**：症狀是桌機的工具列突然沒有邊框、沒有白底、按下去沒反應——三者都要補上 `.toolgrid > .tool` 那一支。
  - 驗法：桌機量每一顆 `.tool` 的寬與 top，找「同一列只有自己一顆、而且寬度不到滿版」的（那就是洞）。實測 `/almanac` 9 顆、`/create` 4 顆，兩頁都 0 洞；手機端包裝層 `display:contents`、工具列仍是單欄滿寬、無橫向溢出。
- **grid2 雙欄**：`.rootpane.grid2 .body` 由 flex 改 grid，非 `.tool` 子元素要 `grid-column:1/-1` 才不會被塞進雙欄。
- **flex column 內用 `margin:auto` 置中會關閉 stretch**：`.screen` 是 flex column，其子項 `.body` 若用 `max-width + margin:auto` 置中，auto 邊界會取消 stretch → `.body` 收縮成內容寬（詳情頁看起來太窄/稀疏）。要用 **`width:min(100%, Npx)`**（確定寬度）才會真的填滿到 N 再置中。
- **桌機堆疊畫面的版心（2026-07 修）**：通則 `.screen .body` 是 `width:min(100%,720px)` ＋ `margin:auto`，40 頁實測有 30 頁因此變成「1440px 視窗中間一條 720px 手機欄」、1000px 內容卡裡左右各 140px 死白。已按內容性質分三類：**讀字型**（條款/關於/專欄/貼文/表單）維持窄欄；**清單型**（設定/安全/神佛/諺語/慶典/賞花/食材/相剋/干支/商店/排行/創作者後台）改**雙欄**；**時序型**（通知/收益/訂單/紀錄/專案/挑戰/生肖/今日）維持單欄但放寬到內容卡滿寬。雙欄沿用 `.rootpane.grid2` 約定：直接子元素預設 `grid-column:1/-1`，只有列出的 `.tool/.opt/.kv/.list-item/.card/.acc-form` 才 `grid-column:auto`。
- **要放寬 `.body` 必須寫 `width` 且把 `margin-left/right` 歸零**：(1) 只寫 `max-width` 會被通則的 `width:min(100%,720px)` 蓋掉——`.wd-body`(920) 與 `.screen-subscription`(840) 兩處都因此長年被壓在 720，方案卡只有 298px；(2) 改成 `width:auto` 卻留著通則的 `margin:auto`，flex column 下會關閉 stretch、`.body` 縮成內容寬（實測左緣隨內容在 580~833 間跳動）。
- **導覽列/頁尾/內容卡要共用同一條左緣**：三者原本是 1040+28、1000+26、720 置中，1920px 下產生 452／460／504 三條差 8~52px 的邊——「差一點沒對齊」正是整體比例看起來歪的主因。已統一為 1000 版心 ＋ 26px 內距。
- **桌機各詳情畫面微調**：`App.jsx` 給堆疊 `.screen` 加 `screen-<key>` class（如 `screen-postDetail`、`screen-subscription`），可在 CSS 針對單一畫面調版面（訂閱雙欄、貼文窄欄等）。
- **桌機 `.device` 一定要覆寫 base 的 `max-height:100dvh`**：手機 base 是 `height:100dvh; max-height:100dvh`（滿版手機框內捲）。桌機是整頁捲動，device 要 `height:auto; max-height:none`。**只覆寫 height 忘了 max-height** → device 被鎖在一個視窗高，較長內容溢出、頁尾（device 之後的手足）疊到內容上（「頁尾殘影」）。
- **`.coverbig` 有 inline `width:calc(100%-26px)`**：桌機要 `width:auto !important` 才蓋得掉。
- **站內導覽一律用 `ui.jsx` 的 `<Link>`（真 `<a href>`），不可用 `<button>`＋`push()` 當導覽**：全站曾只有 1 個 `<a>`（跳過主要內容），中鍵/Cmd+點擊開新分頁全部失效、爬蟲爬不到任何內部連結（逐頁 meta 都做了卻沒有連結能走到那些頁）。`Link` 的 href 來自 `nav.jsx` 的 `hrefForTab/hrefForScreen`（路徑唯一真相），左鍵走 SPA、修飾鍵交還瀏覽器。`<button>` 保留給「動作」（登出、送出、切主題）。
- **新增畫面要同時改三處路由表**：`registry.jsx` 的 `SCREENS`、`nav.jsx` 的 `SCREEN_PATH`、以及 **`server/seo.js` 的 `ROUTES`**。漏了第三處，新頁會被伺服器判定為未知路由而回 **404 狀態碼**（畫面仍能用，但搜尋引擎不收錄）。
- **CSR 的爬蟲補救在 `server/seo.js`**：**LINE／FB／Threads 的預覽抓取器完全不執行 JS**，所以每頁的 title/description/og/canonical 必須在伺服器端就寫進 HTML（`injectMeta`），不能等 React 設 `document.title`。個人頁／需登入頁在路由表標 `noindex`。
- **未知路由回真 404**：原本一律回 index.html + 200＝soft 404，等於告訴搜尋引擎「站上有無限多個內容重複的有效頁面」。現在 body 仍送 SPA HTML（使用者看得到設計過的找不到頁面），但狀態碼是 404。
- **`notFound` 畫面不在 `SCREEN_PATH` 裡**：`pathFromState` 特別為它回傳 `window.location.pathname`，保留使用者打錯的網址；否則網址會被同步邏輯改寫成 `/`，重整就變首頁。
- **主題切換不重整**：`nav.jsx` 讀寫 `localStorage('jq-theme')`；勿把主題 script inline 進 HTML（違反 CSP，已外移 `public/theme-init.js`）。
- **真 Chrome 截圖**：點擊/導航後常 CDP timeout（renderer freeze），重試單獨 screenshot 即可；量測用 `javascript_tool` 較穩。
- **不要**放回 IG 風格元素（彩虹 story 環、IG 藍、IG Shop 黑底 $ 徽章、純圖示底部列）——刻意去 IG 化，走宣紙/墨/朱紅/金/靛青 + 襯線明體。
- **農曆／節氣／干支已是真實天文演算（`src/data/lunisolar.js`，2026-07-28 起）**：Meeus 朔望月（ch.49）＋太陽視黃經（ch.25），UTC+8 日界，零相依。已驗：2020–2030 春節 11/11 全中、2025 閏六月、2026-07-28＝農曆六月十五・丙午年乙未月癸卯日、節氣日期與公開資料一致、400 天連續性無異常。**原本是「錨點＋每月固定 30 天」的假農曆與固定國曆日期的節氣表，已刪除，不要再加回 `TERMS`／`lunarMD`。**
  - 年柱以**立春**換年（`termLocalDay(Y,0)`）；`lunarYearGanzhiIndex` 則以**正月初一**換年（稱骨用），兩者在立春與春節之間差一年，**不可混用**。
  - 煞方依日支三合組（寅午戌煞北／申子辰煞南／巳酉丑煞東／亥卯未煞西），原本是 `off % 4` 輪替的假值。
  - **文案不可再寫「示範演算」涵蓋農曆/干支**——那一層現在是真的；只有宜忌神煞屬民俗。
- **二十八星宿的 epoch 差 7 天不會被任何檢查抓到**：28 宿依序配七曜（木金土日月火水），每 7 宿一循環，所以**同一曜的宿一定落在同一個星期幾**——亢金龍與牛金牛都固定在星期五。差整整 7 天時星期仍然對得上，肉眼與「星期是否正確」的檢查都無效。校正錨點：2026-07-17（壬辰日）＝鬼宿（第 22 位），外部兩來源一致。改 `xiuIdx` 的 offset 務必重跑 `almanac.js` 註解裡的三個錨點檢查。
- **吉時用黃道黑道十二神，不可退回三合六合法**：起神位置依日支（子午起申、丑未起戌、寅申起子、卯酉起寅、辰戌起辰、巳亥起午），依序青龍→明堂→天刑→朱雀→金匱→天德→白虎→玉堂→天牢→玄武→司命→勾陳，六黃道神為吉。舊的「日支三合六合為吉、六沖為凶」與市售通書幾乎相反（丙午日它判寅未戌為吉，通書那三個時辰是白虎、勾陳、天刑全凶），而且與本站自己的「干支・三合六合」頁矛盾（午午自刑卻列為吉時）。驗證值：丙午日＝子丑卯午申酉。
- **宜忌必須與神煞對帳（`almanac.js` 的 reconcile 區塊）**：宜忌候選、建除註解、特殊日原本各算各的，同一天會一邊寫「閉日：忌開市」一邊把「交易」列進宜。神煞有否決權，**且同義詞要成組處理**——「交易」「立券」「納財」都屬開市，只比對「開市」兩字會漏掉另外三個（這正是原本沒被發現的原因）。
- **★吉日星等不可用亂數**：原本是 `1 + mod(off*3+2, 5)`，與當天任何一項神煞都無關，於是受死日＋三娘煞＋閉日仍拿三顆星。現由神煞推導並附一句文字評等（`rating`），**大凶日一律壓到 2 星以下**，且**上限也要套用在人工精寫樣本上**（否則 400 天裡會漏出一天 ★★★★★「凶勝於吉」）。星等與評等必須永遠講同一件事。
- **犯太歲沒有「雞」**：午與酉在十二支中沒有任何刑的關係。三刑只有子卯（無禮）、寅巳申（無恩）、丑戌未（恃勢）、辰午酉亥（自刑）；午年的刑是午午自刑＝屬馬本人。
- **財神方位表（`CAISHEN`）是對的，不要「修正」成西南**：依「財＝我剋者的方位」推導——甲乙木剋土→東北（艮土）、丙丁火剋金→正西、戊己土剋水→正北、庚辛金剋木→正東、壬癸水剋火→正南，五組全部自洽，也就是傳統《財神方位歌》。把丙丁改成西南（坤土）會破壞整個推導（火剋金不剋土）。
- **當令農產由 `src/data/produce.js` 提供，那是 `scripts/build-produce.mjs` 從農糧署開放資料產生的，不要手改**（下次重跑會被覆蓋）。要更新資料跑 `node scripts/build-produce.mjs`。**節氣要取「月份聯集」不是起始月**（`monthsForTerm()`）——大暑橫跨 7/8 兩個月，只取 7 月會漏掉文旦柚、金針、柿子。`termGuide.js` 的 `land` 欄位已不再被 `Ingredients` 使用（俗語/應景食物/慶典/花期/養生仍在用）。
- **綁農曆日的習俗不可綁節氣**：半年圓是農曆六月十五，五年裡有三年不在大暑。已移到 `LUNAR_FEST`。
- **橫向 chip 列的捲動陰影遮罩色用 `--color-bg` 不可用 `--paper-100`**：後者在深色模式仍是 `#FFFFFF`（它是「紙色」原色不是「目前背景」），會在深色底上畫出兩條白帶。
- **訪客身分存 `localStorage('jq-guest')`**：純記憶體的舊作法有三個死路——按 F5 回登入牆、把網址貼給朋友對方看到登入牆、從書籤打開也是登入牆，使用者只會覺得「這站一直把我踢出去」。這不是安全漏洞：訪客沒有 csrf token，後端所有寫入 API 仍以 `requireAuth` 擋下。
- **日沖是「天干進四位、地支進六位」**（丙+4=庚、午+6=子 → 丙午日沖庚子）。天干曾寫成 +6 而算出「壬子」，錯兩位。這個 bug 藏得極深：**地支 ±6 在 mod 12 下同值，所以「沖鼠」「沖虎」永遠對，連帶煞方與沖煞歲數（都只看地支）也全對**，畫面上只有天干那兩個字錯。以六十甲子序數看正解是 `(n − 6 + 60) % 60`。改動後請跑 60 天互驗（A 沖 B ⇒ 序數差恆為 6）。
- **二十八宿吉凶：凶宿必須剛好 13 個**（亢、氐、心、牛、女、虛、危、昴、觜、鬼、柳、星、翼），其餘 15 吉。這張表曾把「牛」標成吉、「參」標成凶，剛好兩格都反了。改表前先數一遍數量並確認與 `XIU` 順序對齊。
- **`JIANCHU_YI` 是結構化的 `{yi:[], ji:[]}`，顯示用句子由 `jianchuText()` 自動生成**——不可改回手寫散文。散文只能顯示不能運算，於是宜忌欄與建除註解各走各的：閉日註解寫「宜造葬」宜欄卻從沒出現造葬（建除的宜根本沒被採用）、除日冒出開市與嫁娶（多數通書除日忌嫁娶）。
  - reconcile 的三條規則缺一不可：(1) 建除的**忌**刷掉宜項；(2) 建除的**宜**要回填進宜欄（只做減法不做加法就會漏掉造葬）；(3) **最後把已進宜欄的詞從忌欄剔除**——宜與忌的候選都來自隨機池，而建除與神煞又會往宜欄補詞，三個來源交會時同一個詞會同時出現在兩欄（實測 400 天有 21 筆，例如開日「宜動土」同時「忌動土」）。
  - **大凶日的可用清單要從神煞自己的說明文字推導**，不可另外寫死一份。寫死成 `['祭祀','安葬','入殮']` 時，對上受死日的說明「惟入殮、安葬、畋獵可用」就又冒出「宜：祭祀」的矛盾。清單與說明只要是兩份資料，遲早分岔。
- **解夢：沒有原典就不要掛書名號**（`src/data/dream.js`）。整修前所有回覆都以「《周公解夢》：」開頭，內容卻是「智慧與轉變」「壓力」這種現代心理語彙——原典是斷語體、直給吉凶（「蛇咬人，主得大財」）。更糟的是查無關鍵字時的萬用回覆也署名古籍＝憑空捏造出處。現在 `classic` 只放逐字引用、不確定就留空，`modern` 明確標為「現代參考」，查無資料一律誠實說沒收錄。**新增詞條時絕不可自撰詩句冒充原文。**
  - **比對要「最長關鍵字優先」**：否則「撿到錢」會先被短的「錢」吸走，而這兩條因為**反夢**原則斷語剛好相反（拾得錢財主失財），配錯就是給出完全顛倒的答案。
- **路徑樣板支援 `/:name?` 選填參數**（`nav.jsx` 與 `server/seo.js` 兩邊都要同步支援）。完整曆頁是 `/almanac/day/:date?`——不帶日期＝今天，帶日期＝可分享。兩個雷：(1) **選填參數沒被匹配時 regex 群組是 `undefined`**，`decodeURIComponent(undefined)` 會得到字串 `'undefined'` 並被當成真的日期傳進畫面；(2) **`server/seo.js` 的 ROUTES 也要有帶參數的那一條**，否則帶日期的網址回 404 狀態碼，而「2026年8月15日 國民曆」正是這類產品最大宗的長尾搜尋。
- **同一畫面只換參數要用 `replace()` 且網址同步要走 `replaceState`**：只改堆疊而不管網址同步層的話，翻一天就多推一筆歷史（實測連按三下就要按三次上一頁才離得開）。判準是「堆疊深度與最上層畫面都沒變」。
- **`new Date('2026-08-15')` 會被當成 UTC 午夜**，在 UTC+8 解讀成前一天早上 8 點，整頁差一天。日期字串一律拆成年月日用本地時間建構。
- **姓名筆畫查 `src/data/strokes.js`（康熙筆畫，由 `scripts/build-strokes.mjs` 從 Unicode Unihan 產生），不要手改**。舊實作是 `5 + (字數 × 7) % 24`＋charCode 當分數＋三才五格寫死「木火土 · 相生」，於是「一」與「王」都算成 12 畫、emoji 也能拿「大吉 94 分」。
  - 康熙筆畫 = **剩餘筆畫 + 該部首的康熙標準筆畫**（由 kTotalStrokes 與 kRSUnicode 推導）。氵→水4、扌→手4、艹→艸6、辶→辵7、左阝→阜8、右阝→邑7、月(肉)→肉6、王→玉5、礻→示5、衤→衣6。
  - **剩餘筆畫為 0 時絕不可套用**——那代表這個字本身就是部首。最典型的是「王」：部首是玉，但姓名學的王是 **4 畫**不是 5 畫（5 畫是當偏旁出現在別的字裡時，如珍＝玉5＋5）。漏掉這條，全台灣最大的姓氏從第一格就錯。
  - **非中文字一律拒算**，不可給任何猜測值。驗證基準（與外部一致）：王小明＝天格5、人格7、地格11、外格9、總格15、三才土金木。
- **生肖運勢的分數必須由當日干支推導**（`src/data/zodiacLuck.js`），不可用 DB 的靜態 `score`。舊版與本站曆頁直接對打：丙午日曆頁寫「沖鼠」，運勢頁卻給鼠 82 分、值太歲又自刑的馬 95 分（全場最高）、午未六合的羊 66 分（全場最低）。**年支要從 `dayFor().yearGZ` 取，不可寫死**。
  - **本週／本月要逐日實算後平均**，不可用今日分數乘倍數——舊版的 ×0.94／×1.07 讓十二生肖排名完全一樣，等於沒有資訊。
  - 吉時一律取 `dayFor().luckyHours`。舊版寫死「辰時・未時」，與首頁給的是兩套。
- **`match.js` 的刑表要完整**：三刑（寅巳申、丑戌未）＋子卯（無禮之刑）＋辰午酉亥（自刑）。舊版只寫了兩組三刑，於是「鼠×兔」被判成「平和之配」、「雞×雞」被判成「同生肖」，而本站的「干支・三合六合」頁白紙黑字寫著完整的四類——註解寫對了、常數卻沒跟上。**自刑要判在「同生肖」之前**，否則酉酉會被歸成一般同生肖而漏掉刑。
- **綁農曆日期的慶典不可掛在固定節氣上**：鹽水蜂炮（元宵）曾掛「立春」，實際 2026 元宵是 3/3 落在雨水；南鯤鯓王爺祭掛小滿實際在芒種；頭城搶孤掛處暑實際已進白露。改由 `nextLunarOccurrence` 逐年實算。**行事曆標題不可寫死當年年份**——今年已過的慶典會算到明年那一次，寫「2026 年」卻列 2027 日期就自相矛盾。
- **「每日一句」只能有一個來源**：首頁曆頁用 `proverbs[mod(off, len)]`（錨點偏移）、諺語頁用 `floor(Date.now()/86400000) % len`（epoch 天數），同一天給出兩句不同的話。現在諺語頁以 `dayFor(todayOffset()).proverb` 為起點。
- **免責文案要跟著實作走**：生肖運勢改成純確定性演算後仍掛著通用的「結合…AI 生成內容」就是不實陳述。同理解夢頁不可再宣稱「AI 延伸解析」。
- **站上沒有抽籤功能，任何地方都不可承諾它**。曾在 AI 開場白、建議問句、AI 意圖回覆、AIChat 續問建議、占卜頁文案、「我的」選單、`AI_SYSTEM` 導流清單共 8 處提到抽籤，而「🎋 去抽籤」按鈕導到 `/records`（顯示「還沒有占卜紀錄」）。AI 拒絕編籤詩是對的，但它順口說了「抽籤在占卜分頁裡，那邊用的是站內的籤庫」——**編造一個不存在的功能比編一支籤更糟**，因為使用者會以為是自己找不到。日後真的做了再加回去。
- **財神方位採台灣通書通行版（丙丁西南）**。曾寫「正西」，而正西其實是**丙日陽貴神**的位置——兩個欄位對錯位了，這個巧合正是它被抓到的原因。另有一派由「財＝我剋者」推得正西（火剋金），兩說並存，頁面已標明流派。改動前請先確認是不是又把貴神的值抄過來了。
- **「今日吉神方位」四格必須都是方位**：喜神／財神／陽貴神／陰貴神。天乙貴人給的是**生肖**（哪些生肖的人是你的貴人），性質不同，另列一行並加註說明。舊版把生肖塞進方位區，看起來就像算錯。
- **登入狀態改變時要清掉過期的系統訊息**：AI 對話存 sessionStorage，訪客時期跳出的「這一段要登入才能請顧問開口／去註冊・登入」在登入後仍掛在畫面上——使用者已經登入了卻還被叫去登入。那一則的生命週期綁的是登入狀態不是對話內容，要用 `user` 變動的 effect 單獨濾掉（`cta === 'login'`）。
- **`AI_SYSTEM` 要明令「問幾件事就答幾件」**：實測被問「二十八星宿是哪一宿？財神、喜神、貴神各在哪個方位？」時只答了星宿，而方位明明就在給它的曆訊 context 裡。
- **資料變真了就要把「示範」字樣拿掉**：年度總覽頁尾長期寫著「以上為示範，正式版依當年紫白年盤與通書為準」，但那頁的值已逐項核對通過。網站上線後還掛著「示範」等於叫使用者不要相信自己看到的東西，而他也無從分辨哪些欄位才是真的。
- **前端不可在進站時覆寫伺服器注入的 `<title>`**：`server/seo.js` 已依路由寫好關鍵字完整的標題，但 `App.jsx` 原本無條件蓋成「完整國民曆 · 機巧時運」，而 **Google 採用的是渲染後的 DOM**，所以伺服器那份全白做。判準必須是「路由有沒有變」而不是「effect 跑第幾次」——這個 effect 相依 `[user, tab, top]`，訪客身分還原就會讓它多跑一次，只擋第一次照樣會被蓋掉（實測就是這樣漏的）。日期頁翻日要把 `props.date` 算進簽章，否則整串歷史紀錄同名。
- **首屏靜態內容注入（`server/seo.js` 的 `fallbackFor`）**：原始 HTML 的可見文字原本是 **0**，全靠 475KB JS 跑完才出現。Google 會二次渲染但要排隊，Bing 更差，而台灣 Yahoo 奇摩吃的就是 Bing。現在把曆頁首屏寫成真 HTML 放在 `#root` 之後，`main.jsx` 掛載時移除。**只能放畫面上真的會出現的內容**——放使用者看不到的字就是 cloaking。這不是 SSR 的替代品，真正的解法仍是預渲染／SSG。
- **`sitemap.xml` 的 `lastmod` 不可一律填今天**：全站每天都宣稱自己更新過，Google 判定不可信後會**整份忽略**。靜態頁用手動維護的 `SITE_LASTMOD`，日期頁用該日期本身。目前輸出 760 個網址（29 靜態 ＋ 前後一年共 731 天）。
- **日期頁是這類產品最大的單一流量來源**：`/almanac/day/:date` 的 title/description 由 `dateMeta()` 依真實曆算逐日產生（每天內容都不同），並在頁面放**真的 `<a href>`** 前後日連結——`<button>` 爬蟲點不到也記不住。
- **`SectionHead` 是 `<h2>` 不是 `<div>`**：這些區塊視覺上早就是標題，但用 div 包起來搜尋引擎與螢幕閱讀器都看不到層級（實測整站只有 1 個 h1、零個 h2）。改動時記得 `h2.sech` 要歸零瀏覽器預設 margin/font-size。
- **品牌用「國民曆」，但 description 與 `/about` 要自然帶到「農民曆」**：台灣人搜的是農民曆，搜尋量差一個數量級。介面文案一律國民曆（品牌決定），語意橋接只做在 meta 與內文，不要為了 SEO 把介面改回去。
- **條目頁的資料層與畫面層分開**：`termArticle.js`（24 節氣專文）、`deityArticle.js`（12 神佛）是**內容層**，`termGuide.js` 是節氣生活層，兩者互補不重疊。條目頁走 `/solarterms/:slug`、`/deities/:slug`、`/dream/:slug`。
  - **七十二候與神明由來必須逐字照抄或據實編寫，不可自撰**。候名出自《月令七十二候集解》；`taiwan` 那段是刻意要寫**台灣的實況**——七十二候是華北黃河流域的觀察，大雪不下雪、小寒常有 25 度，不點破的話使用者會覺得整套節氣在台灣是胡說八道。
  - **諺語與賞花刻意不做條目頁**：一句話＋一句解釋、名稱＋花期＋地點，撐不到 300 字。薄內容頁量一多會拖累全站評價，**寧可少幾百頁**。要做就得先補足內容。
  - **解夢只有「有原典斷語」的詞條建立獨立頁**（27 個），沒有原典的留在查詢頁即可。
  - **`DREAMS` 的 `k[0]` 同時是網址 slug 與頁面標題**，必須放使用者實際會搜的詞——「夢見掉牙」的搜尋量遠大於「夢見牙」。比對本身會掃過 `k` 全部的詞，不受順序影響。
- **條目頁必須對不存在的 slug 回真 404**（`server/seo.js` 的 `entryExists`）：路由樣板對得上還不夠。`/solarterms/nope` 若回 200＋「找不到」畫面就是 soft 404，而條目化之後這個風險比以前大得多（三種路由 × 任意字串＝無限多個假頁面）。
- **首屏靜態層要涵蓋畫面上真的有的東西**：節氣頁的當令農產與節氣生活資料也要進去，否則爬蟲只看到典據那一半。**放畫面沒有的才是 cloaking，這裡是相反的情況**。24 個節氣頁靜態層皆 ≥800 字。
- **總覽頁的切換 chip 是 `<button>`，爬蟲點不到**：節氣、神佛、解夢三個總覽頁都要另外給真的 `<a href>` 清單（節氣改成四季網格，順便解掉 1280px 下「立春」被切出畫面的問題）。
- **`Breadcrumb`（`ui.jsx`）同時輸出畫面麵包屑與 BreadcrumbList JSON-LD**：JSON-LD 必須用 `dangerouslySetInnerHTML`——React 會把 `{JSON.stringify(x)}` 當文字轉義，`<` 變成 `&lt;` 會讓 Google 解析失敗。
- **路徑樣板的參數名稱必須「單次掃描依序收集」**（`nav.jsx` 與 `server/seo.js` 兩邊同一套）：`'/auspicious/:kind/:ym?'` 若分兩次 replace（先處理選填的 `:ym?` 再處理 `:kind`），`names` 會變成 `['ym','kind']`，但 regex 的捕獲組順序是 `(kind)(ym)`——整個錯位，`kind` 拿到 undefined，畫面顯示「找不到」。**新增畫面也要在 `App.jsx` 的 `SCREEN_TITLES` 補一筆**，否則站內導覽後標題會退回預設值。
- **擇日工具（`src/data/auspicious.js`）沒有新的命理判定**：全部是 `dayFor()` 宜欄的重新組織——某用途出現在當日宜欄就是吉日。**不可為了讓每個月都有吉日而放寬標準**，寧可誠實顯示「這個月沒有」。生肖沖煞是「標出來」不是「刪掉」——沖煞的嚴重程度各家看法不同，直接刪掉等於替使用者做了他不知道的決定。
- **術語頁（`src/data/glossary.js`）的 `answer` 欄位是給 AI 摘的**：開頭 40–60 字直接給完整定義、不鋪陳。`source` 沒有明確典據就留空，不可掰一個書名充數。`caveat`（常見誤解）是本站相對於一般命理站的實質差異，也最容易被引用。
- **`robots.txt` 對 AI 爬蟲的立場是「明確 Allow」**：GPTBot、PerplexityBot、ClaudeBot 等逐一列出並允許索引公開內容，個人頁與交易流程仍一律擋掉。要改變立場（不希望被 AI 引用）就把那一段改成 `Disallow: /`。搭配 `public/llms.txt` 說明資料的三層可信度與引用方式。
- **`max-image-preview:large` 不可拿掉**（`index.html` 的 robots meta）：沒有這行，Google 在 Discover 與搜尋只給小縮圖，Discover 幾乎進不去。這個站有節氣攝影社群＝獨家高畫質圖，是競品沒有的資產。
- **sitemap 分成 index + 五類**（core／daily／solarterms／auspicious／entries）：GSC 對每一份分別統計「已建立索引 ÷ 提交數」，拆開才知道是哪一類沒被收（低於 60% 代表那一類有品質問題）。主 `sitemap.xml` 仍保留完整版供相容。**`robots.txt` 要宣告的是 `sitemap-index.xml` 不是扁平的 `sitemap.xml`**——只宣告扁平版的話 GSC 只給一個總數，分檔等於白做；也不要兩份都宣告（同一批網址重複提交）。
- **首頁與 `/almanac/day` 的靜態層必須不同**：兩者原本共用 `almanacFallback`，字元重疊率 **96%**（583 vs 594 字）且都自我 canonical＝同一份內容用兩個網址參賽，而首頁是全站權重最高的頁卻長得像一個每天輪替的曆頁。現在 `homeFallback()` 是「農民曆入口」（今日摘要＋擇日／術語／節氣／年度導覽，打「農民曆」大詞），完整神煞表只留在曆頁（打日期型查詢），相似度降到 25.9%。**`homeFallback()` 列出的每一個連結，`Feed.jsx` 的 `.home-portal` 都要真的渲染得出來**——改一邊要改兩邊，放畫面上沒有的東西就是 cloaking。
- **`lastmod` 的例外只有「內容真的每天變」的兩頁**：`/` 與 `/almanac/day` 用今天（`lastmodFor()`），其餘沿用手動維護的 `SITE_LASTMOD`。這與「不可全站一律填今天」不衝突——反對的是讓整份 lastmod 失去可信度而被 Google 整份忽略，不是反對誠實標註。
- **曆頁靜態層是寫給 AI 摘要看的**：開頭 40–60 字**直接回答**（日期＋農曆干支＋節氣第幾天＋宜忌前三＋吉時＋沖煞）、小標一律**問句**（「今天幾點是吉時？」不是「今日吉時」）、對照資料用真的 `<table>`／`<ol>`（AI 抽不出圖裡的字，也抽不出沒有語意的 div）、並標明計算依據與流派差異。依據：實查台灣 Google「農民曆的宜忌怎麼算出來」，AI 摘要引用的是 Threads 貼文與一家婚宴會館的部落格，排名前段的命理大站一個都沒被引用——這個利基的引用位幾乎空著，門檻不是網域權重而是「有沒有把問題直接回答清楚」。
- **分析工具全部走環境變數，未設就一行 script 都不注入**（`GA4_MEASUREMENT_ID`／`CLARITY_PROJECT_ID`／`GSC_VERIFICATION`；CSP 也是條件式放行，`GET /api/health` 回三個布林值）。`clutterScore` 是**站台級**訊號，目前首頁只有 16 個請求、沒有廣告聯播網，不可為了「先放著」而載入沒在用的追蹤碼。
- **文章型內容走靜態模組，清單型內容走 `ref_items`**：`termArticle.js`／`deityArticle.js`／`glossary.js`／**`products.js`** 是前者。判準是「有沒有獨立網址」——有獨立網址的頁需要伺服器端**同步**取得 slug 與描述，而 `server/seo.js` 的 `injectMeta`／`entryExists`／sitemap 全是同步函式，不能 `await` 資料庫。商品目錄因此由 `ref_items('storeProducts')` 改為 `src/data/products.js`（正式站 ref_items 的殘留該類可在管理後台刪除）。
- **商品的 Product schema：洽詢報價不可填 `price: 0`**（會被判成免費商品），要用 `priceSpecification` 只給幣別。**也不可捏造 `aggregateRating`／`review`**——虛構評價是明確違規。
- **不要在商品頁編造運費、出貨天數、最低訂量、交期、退換貨天數**：那些是營運決定，寫死的數字一旦與實際政策不符就是履約糾紛。目前只寫《消費者保護法》第 19 條的七日猶豫期（**法定**權利，不是自訂政策，不會有出入），數位商品標明屬該條的合理例外。實際政策定案後再補 `SHIPPING_NOTE`。
- **`og:image` 逐頁用真實作品**（`server/index.js` 的 `ogImageFor()`）：貼文頁用該貼文的圖、作品頁用該作品的圖、節氣頁與曆頁用該節氣底下最多讚的作品，查無圖才回退品牌圖。**注入時要把寫死的 `og:image:width/height` 移除**——使用者上傳的圖不是固定 1200×630，留著會讓 FB 照錯的比例裁。只放「這一頁真的在講的那張照片」，隨便配圖等於把預覽卡當廣告版位。
- **`PhotoImg` 的 `alt` 一定要傳真敘述**：原本寫死 `alt=""`＝宣告「裝飾圖可跳過」，但那是本站唯一的原創視覺資產，空 alt 等於自願退出 Google 圖片搜尋（「立春 台灣」「大暑 稻田」的圖片結果幾乎沒有競爭），讀屏使用者也會整頁作品全被跳過。
- **RSS 的圖用 `media:content` 不用 `enclosure`**：後者的 `length` 是必填的位元組數，不值得為了產一份 feed 去把每張圖讀出來量長度。
- **IndexNow 需設 `INDEXNOW_KEY` 環境變數**（任意 8–128 位十六進位字串），未設就跳過不報錯。Bing／Yandex 支援而台灣 Yahoo 奇摩吃 Bing。**Google 不支援 IndexNow**，其 Indexing API 只開放徵才與直播內容，不要浪費時間去接。
- **公開 API `GET /api/v1/almanac/:date` 免金鑰但有速率限制**（以 IP 計，每小時 600 次）。回應帶 `_source` / `_license`，目的是換取開發者在 README 與技術文章裡的外連。`/widget/today` 是可嵌入的今日宜忌卡，**本身要 noindex**（避免與曆頁重複），底部的來源連結是 do-follow。
- **`manifest.webmanifest` 的 `screenshots` 刻意沒放**：那需要真實截圖檔，寫一個不存在的路徑會讓安裝介面壞掉，比不寫更糟。有實際截圖再補。
- **這三項已證實無效，不要再加回來**：`FAQPage`（2026-05-07 起 rich results 完全停止顯示）、`HowTo`（2023-09 起）、`WebSite`+`SearchAction` sitelinks 搜尋框（2024-11-21 起）、`llms.txt`（Ahrefs 掃 137,000 個網域：97% 收到零次請求，AI 檢索 bot 僅佔 1.1%；Google 2026-06-15 明說無效果）。**FAQ 型的「內容」仍值得寫**（對 passage ranking 與 AI 引用有價值），只是不要為了 rich result 去加 schema。`BreadcrumbList` 2025-01 起行動結果不顯示但**桌機仍有**且 Google 仍用它理解結構，保留。
- **日期頁是滾動視窗（過去 30 ＋ 未來 60）不是全量**：洩露文件的 `hostAge` 逐字說明是「used in twiddler to **sandbox fresh spam**」——新網域一次噴出 731 個程式產生的頁面，訊號上與 fresh spam 難以區分；`siteQualityStddev` 又會量測站內品質的**離散程度**，少數好頁＋大量薄頁反而拖累整站。擴充規則：GSC 的「已建立索引 ÷ 已提交」高於 70% 才往外擴，低於 50% 要先修內容而不是加量。
- **`server/compress.js` 是緩衝式不是串流式**：第一版用「攔截 res.write 轉送到壓縮 stream」整個卡死——`express.static` 把檔案 pipe 到 res，遇到 backpressure 時等 res 發 `'drain'`，但資料被轉走了，res 永遠不會 drain。改成緩衝完整回應再一次壓縮。**SSE 必須放行**（`text/event-stream`），緩衝起來等於 AI 對話整個壞掉。實測 JS 省 74%、CSS 省 81%。
- **SERP 面的 title 用「農民曆」，介面文案維持「國民曆」**：依據是洩露文件的 `titlematchScore` 為**站台層級**訊號——一批對不上使用者實際用詞的標題會拖累整站，而台灣人搜的是農民曆。description 裡寫「國民曆（俗稱農民曆、黃曆）」是正確的同義說明。
- **`sunTimes.js` 的兩個坑**：(1) `n` 必須是「自 2000-01-01 **正午**起的**整數**天數」，`julianDay()` 回傳的是 0h 的 JD（尾數 .5），不 `Math.round` 的話那個 .5 會讓所有時刻**整整差 12 小時**，看起來像日出日落被對調；(2) JD → 當地時間要 `(J + 0.5)` 取小數，因為 JD 從正午起算。精度已對照中央氣象署台北全年五個日期：**最大誤差 7 分**（春分秋分最差、夏至冬至最準），頁面必須標明誤差。
- **`clutterScore` 是站台級**：「penalizing sites with a large number of distracting/annoying resources」。目前首頁只有 16 個請求、沒有廣告聯播網——**維持住**。前 12 個月把第三方腳本壓到最低，靠 `/store` 與 `/subscription` 變現而不是靠廣告。
- **不要為了字數灌水**：Google 官方逐字「Are you writing to a particular word count because you've heard Google has a preferred word count? (No, we don't.)」。內容的目標是回答完問題，不是湊字數。
- **納音是「兩兩一組」的三十組，索引一律用六十甲子序整除 2**（`nayinOf()`）。這張表曾經只有 12 筆、索引寫成 `(2*天干+地支)%12`——那個公式與納音的定義毫無關係，六十干支裡**只有甲子與丙午碰巧對，其餘 58 個全錯**。而 2026 剛好是丙午年，所以整年看起來完全正常，2027 丁未一到就會顯示「爐中火」（正解天河水）。
- **胎神六十筆的方位是有規律的**：依序走完十二個方位，各段長度為 2,5,6,5,6,5,5,6,5,6,5,4（合計 60）。第 45–59 筆曾整段被寫成「房內東」，還出現「房內正東」這個根本不存在的方位。`scripts/check-almanac.mjs` 會驗這個段落長度。
- **`npm run build` 會先跑 `scripts/check-almanac.mjs`**：納音 60 筆快照、胎神 60 筆方位段落、400 天宜忌一致性、60 天沖煞序數差。**靜態查表沒有演算法保護，寫壞了不會有任何錯誤訊息**——上面兩個 bug 都是這樣躲過所有檢查的。不要為了讓 build 快一點把它拿掉。
- **地母經的卜曰首句必定點出該年生肖**（`dimuOk()`）：丙午年的卜曰開頭曾是「鼠耗一空虛」——那是子年的卜辭，放在馬年頁面上自相矛盾。目前只收錄丙午一則，**未收錄的年份要顯示「未收錄」而不是拿別年頂替**。
- **芒神站位看的是「立春落在哪兩個望之間」不是「距正月初一幾天」**：立春在十二月望前→牛前（農事早）、正月望後→牛後（農事晚）、兩望之間→**與牛並行**。2026 立春是農曆十二月十七（望後兩天）＝與牛並行。左右側才是看陰陽年。
- **神煞標籤必須真的參與宜忌合成**（`flagBan`）：說明文字裡明講「忌 ◯◯」的就要進忌欄，而且要**同時**把該項從宜欄濾掉——只加進忌欄的話，最後那條「已進宜欄的詞從忌欄剔除」會把它刷掉，繞一圈又回到「標籤說忌嫁娶、忌欄沒有嫁娶」。**建除的宜項回填也要檢查 `flagBan`**，否則滿日（宜嫁娶）碰上三娘煞時嫁娶會被補回宜欄（實測 2/5、2/23 就是這樣漏的）。
- **大凶日的忌欄要寫成一句完整的範圍描述**（「除入殮、安葬、畋獵外，諸事不宜」），不要列一份七項的清單——那看起來像「只忌這七項」，與上方「諸事凶」的標籤自相矛盾。
- **1929 年以前的農曆日期可能差一日**：當時以北京地方平時（UTC+7:45:40）定日界，本站一律採 UTC+8。已在曆頁 Disclaimer 與 `/editorial` 標明，不要拿掉。
- **秤骨用真表（`src/data/bone.js`）**：農曆年（六十甲子）/月/日/時辰四項骨重相加，來源註明於檔頭。原本是 `(年+月+日)%5` 自創公式，與任何參考網站都對不上。輸入需明示國曆/農曆（國曆會自動轉換）。**完整《稱骨歌》51 首批語未收錄，不可用自撰詩句冒充原文。**
- **犯太歲的分類名稱各家不一**：同一生肖有寫「刑太歲」有寫「偏沖」（查證：商周良醫健康網明確寫「刑太歲又稱偏沖」）。故並列標示，避免使用者對照別站以為算錯。丙午年：午值／子沖／丑害／卯破／酉刑（偏沖）。
- **神明誕辰要分清誕辰與成道/飛昇日**：土地公曾誤填農曆 8/15（那是成道日），誕辰為二月初二。已依台灣省城隍廟誕辰表（sim.org.tw）核對 12 位。倒數天數由 `nextLunarOccurrence` 實算，不可寫死。
- **節氣資料分兩層，別搞混**：`almanac.js`＝**曆算層**（干支/建除/宜忌，純演算無資料表）；`termGuide.js`＝**生活層**（當令農產漁獲+產地、俗語、應景食物、慶典、花期、養生臟器、開運色，人工編纂 24 筆）。生活層走 `ref_items` 的 `termGuide` 類（`GET /api/content/termGuide`），改內容用管理後台 CMS；改 `termGuide.js` 要重跑 `npm run seed` 才生效。**`term` 用字必須與 `almanac.js` 的 `TERMS` 表一致**（「驚蟄」非「驚蜇」），否則對不到當前節氣、整頁空白。
- **節氣清單排序不可直接用 `TERM_ORDER`**：那是 `almanac.js` 依國曆月日排的**查表序**，以「大寒」開頭；UI 的節氣年表要從**立春**排起（`InfoScreens.jsx` 的 `useTermGuide` 已做旋轉）。
- **24 個節氣 chip 橫向捲動時，預設選中的「今日節氣」多半在中段**，不主動捲進視野會讓人以為選的是立春。用 `scrollIntoView({inline:'center', block:'nearest'})`——**不可用預設參數**，預設會連垂直方向一起捲、整頁跳位。
- **當令食材已改為逐節氣**（`Ingredients` 讀 termGuide）。原本 `mock.js` 的 `ingredients`（陸/海/空三組）只有芒種一份、不論今天什麼節氣都顯示同一份，已於 2026-07 移除；`ref_items` 的 `ingredients` 類同時停用（正式站殘留資料請在管理後台刪該類）。**沒有當令品項的節氣要誠實顯示「沒有收錄」，不可補假資料**（例：小滿、夏至、大暑無當令漁獲）。慶典/花期同理——原始資料只有名稱沒有地點簡介，不得替它編造。
- **`almanac.js` 曆算公式（改前先懂）**：月柱用**五虎遁**（`monthGan = mod(2*年干+2 + mod(月支-2,12), 10)`，丙年正月起庚寅）；沖煞歲數是**虛歲**（`mod(當生肖-沖生肖,12)+1`，出生即 1 歲，**不是 `||12`**）。改錯會得丙午/6 歲而非正解甲午/7 歲。全部確定性、可 `node --input-type=module` 直接驗。
- **`.ad-*`/`.ya-*` 樣式在 styles.css 末段**（reduced-motion 之後）；`AlmanacDay`/`YearAlmanac` 桌機用 `screen-almanacDay`/`screen-yearAlmanac` 收斂 `width:min(100%,760px)`、時辰格改 6 欄。`yearOverview.ganzhi` 已含「年」字（"丙午年"），串接標題勿再加「年」。
- **App 開在真實今日**：`almanac.js` 的 `todayOffset()=offsetFromDate(new Date())`；UI 的 `off` 以此為基準（Feed 用 `T0`）。「回今日」「today 高亮」都比 `T0` 而非 0（0＝錨點 6/6）。改動翻日邏輯勿退回硬編 0。
- **資料層 SQL 一律用 `?` 佔位、TEXT 存時間（ISO）**：pg 驅動自動把 `?`→`$n`；時間用 ISO 字串字典序＝時間序，pg/sqlite 比較一致。**勿改用 `NOW()`/`SERIAL`/`AUTOINCREMENT`/boolean/timestamp 型別**（破可移植性）。`COUNT(*) AS c` 在 pg 回字串 → 取值要 `Number(row.c)`。新增查詢走 `db.get/all/run`（皆 async，記得 await）。
- **改 schema 後本機要砍舊 sqlite**：`schema.sql` 是 `CREATE ... IF NOT EXISTS`，不會補欄位；本機新增欄位後需刪 `server/data/auth.db*` 再 `npm run seed`（正式 Cloud SQL 每次全新故無此問題）。
- **探索頁版面＝桌機雙欄**：`.ex-top`(搜尋+篩選跨全寬)/`.ex-main`(作品)/`.ex-side`(挑戰+創作者，300px 右欄)。三個包裝層手機上 `display:contents`（版面透明、順序＝作品在宣傳內容前）。作品是這頁的主角——**切勿把挑戰看板或創作者排回作品前面**（原版把 170px 挑戰看板放在作品前，860px 視窗照片全在摺線下）。人氣創作者是名單列不是漂浮圓頭像（1 人時不會整排空白）。
- **探索頁只有「節氣」一個篩選軸**（選單式：`節氣：值▾` 點開＝快速列＋傳統四季節氣表，選定即收合）。曾經加過「題材」作為第二維度，**已於 2026-07 移除**——這個 App 的組織軸就是節氣，第二個維度會稀釋核心概念，且標籤是使用者自由輸入、久了會分裂成「花卉／花／花朵」。**切勿再加回第二個篩選軸**。標籤本身仍解析自說明裡的 `#標籤` 並存入 `tags_json`，但只供**搜尋**比對——它是搜尋輔助，不是導覽軸。
- **`.nums`（個人檔案統計三格）的選擇器必須是 `> *` 不能是 `> div`**：那三格已改為可點的 `<button>`，寫死 `> div` 會讓按鈕拿不到 `flex:1`／置中／分隔線，三格全擠在左邊、數字與標籤還被拆成兩行。
- **統計數字切勿用 `posts + works`**：上架市集時會同時建立 post 與 work（`NewPost.publish` 先 `createPost` 再 `createWork`），相加會把同一張照片算兩次。`Profile` 的「作品」＝`stats.posts`；`CreatorPage` 的相簿**以圖片 URL 去重**（標題不是可靠的鍵，兩者標題可各自不同），同一張照片配到 work 時只補價格徽章、不多開一格，統計則用去重後的實際格數。
- **品牌標記一律用 `<Seal>`，不可再用「印」字方塊**：桌機導覽列/頁尾/登入頁/錯誤頁早就換了，手機頂列（`.topbar .brand::before content:"印"`）、AuthWall、載入畫面漏掉，變成同一個 App 兩種標記。`Seal` 有兩版——**小尺寸（24–34px）用 `badge`（favicon.svg，實心底＋鏤空標誌，16px 下 100% 可辨）；大尺寸（≥56px）用原版 logo.svg**。原版是金色細線條，白底 24px 實測只有 16.1% 可辨像素、平均色差 27＝一團糊，不可用在小處。
- **換 favicon 要同時把 `index.html` 的 `?v=` 號碼 +1**：分頁圖示快取獨立於 HTTP 快取，不換 URL 的話使用者的分頁還是舊圖（得開無痕視窗才看得到新的）。
- **`public/favicon.svg` 不可直接複製 `logo.svg`**：標誌是金色細線條＋透明底，16px 下實測在淺色分頁列僅 9.4% 可辨。favicon 版需加朱紅實心底＋紙色鏤空標誌（深色分頁列 100%／淺色 99.2%）。墨底+金 在深色分頁列剩 9%、紙底+金 在淺色剩 6.3%，皆不可用。另 `/favicon.ico` 已在 server 回 204——否則會落到 SPA fallback 回傳 index.html。**改完 favicon 瀏覽器不會立刻更新**（分頁圖示快取獨立於 HTTP 快取），需另開無痕視窗確認。
- **種子作者是 `is_seed=1` 的 user**（`seed-<handle>`，無法登入）；貼文/作品 FK 到這些 user。前端顯示 `user`＝該作者 `handle`。
- **`getUserMedia` 必須明確要求解析度**：只給 `facingMode` 的話，行動瀏覽器預設回 **640×480**——手機原生相機是 1200 萬畫素起跳，這就是「網頁拍的比 App 爛很多」的根因（畫質鏈的其他環節：拍照 canvas 取 videoWidth、`bakeImage` 上限 1600px/0.85，都只能保留源頭給的像素，救不回來）。要用 `ideal` 不可用 `exact`——`exact` 在裝置不支援時直接丟 OverconstrainedError（黑畫面）；`ideal` 由瀏覽器夾到該裝置最大值。另註：原生 App 還有多幀合成/HDR 這類計算攝影，Web 拿不到，所以拉滿解析度後仍會有些微差距，屬平台限制。
- **相機生命週期只能由單一 effect 管理**（`Camera.jsx`，deps `facing/mode/shot/videoUrl/camKey`）：**串流必須放 state 不能放 ref**（ref 變動不觸發重繪 → 掛載 effect 不重跑 → video 仍連著已停止的舊串流＝切鏡頭失效／放棄編輯後黑畫面）；**不要在 onClick 另外呼叫開相機**（會與 effect 互搶產生競態），放棄編輯只需 `setShot(null)`。快速連按切鏡頭靠 effect 內 `cancelled` 旗標丟棄過期的 getUserMedia 結果。無實體鏡頭時可覆寫 `getUserMedia` 回傳 `canvas.captureStream()` 假串流做自動化測試。
- **相機採 IG 式兩段流程（2026-07）**：檢視畫面的「下一步 →」**不發佈**，只 `push('newPost', { photo })` 把照片交給發文頁；使用者在發文頁寫說明/標節氣地點/決定是否上架後按「發佈」才真的送出（拍完不會立刻公開）。`NewPost` 收到 `photo` prop 會隱藏選圖選項並顯示「返回重拍」。**發佈必須真的上傳圖片**：`publish()` 先 `api.uploadImage()` 拿 imageId 再 `createPost`，否則貼文只顯示 📷 emoji 佔位圖；且**畫面濾鏡只是 CSS 預覽**，需經 `bakeImage()` 把濾鏡/強度/疊加特效/文字畫進 canvas（`ctx.filter` 語法同 CSS filter）才會存進圖檔。發佈時自動標記當前節氣。
- **限動貼紙（票選/問答/倒數）內容可由使用者自訂**（`CreateStory` 的 `poll`/`qa`/`cd` state），倒數每秒更新且僅在選中時啟動計時器。
- **相機需 CSP `img-src`/`media-src` 含 `blob:`**（拍照/錄影預覽）；`camera` 在 `App.jsx` fullScreens（隱藏 tabbar）。臉部貼合是 **CSS 疊加/濾鏡近似**（無第三方 face-tracking）；搖晃顯影用 DeviceMotion（iOS 需 `requestPermission`，桌機給「點我模擬」fallback）。濾鏡/特效/漸層/字體＝DB `ref_items`（feedFilters/storyFilters/effects/gradients/textFx），改資料走 CMS 不動碼。
- **RBAC 階層**：`ROLES=['user','creator','moderator','admin']`，`requireRole(min)` 用 `roleRank` 比大小（非等值）。moderator+ 可改內容、admin 可改角色；**admin 不能改自己的角色**（防自鎖）。
- **handle 唯一**：`CREATE UNIQUE INDEX idx_users_handle ON users(lower(handle))`（大小寫不敏感、NULL 可重複）；註冊存小寫。競態時捕捉 unique 例外回 409。
- **地點全走後端代理**：`/api/places/search`、`/api/places/reverse`、`/api/map/tile/:z/:x/:y` 代理 OSM（伺服器加 User-Agent，前端只連同源符合 CSP `img-src 'self'`/`connect-src 'self'`）。切勿讓前端直連 nominatim/tile（會被 CSP 擋）。

---

## 推播（Web Push）

`server/push.js` 自寫 RFC 8291／8292，**零第三方相依**（node crypto 即可：ES256 簽章＋ECDH＋AES-128-GCM）。
- 產生金鑰：`npm run push:keys` → 設 `VAPID_PUBLIC_KEY`／`VAPID_PRIVATE_KEY`（私鑰放 Secret Manager）
- **未設金鑰＝只 log 不送**（與 mailer.js 同樣的降級行為，本機開發不需金鑰）
- 訂閱存 `push_subs`、偏好存 `push_prefs`（節氣／神佛／互動三類可分別開關）
- **社群推播掛在 `notify()` 這個單一入口**——所有互動自動都有推播，不需逐處修改
- `public/sw.js` 只做推播不做離線快取（避免與 Vite 資產雜湊衝突）；不可用 ESM
- 推播權限只能在使用者明確操作時要求（設定頁開關），不可自動彈出
- 404/410 ＝訂閱失效，`sendPushToAll` 回傳 `goneIds` 供呼叫端刪除

## 分潤結算（骨架，尚未簽約金流）

`ledger`（應付分潤）＋`payouts`（提領申請）兩張表，**先記帳、後付款**：
- 訂單成立時 `recordLedger()` 寫入 ledger（`status='pending'`）
- 金額一律以**分**為單位存整數（避免浮點誤差），顯示才除 100
- `GET /api/ledger` 回傳 `settlementReady: false`——前端據此顯示「待簽約後撥款」
- `POST /api/payouts` 只建立 `requested` 紀錄，**不呼叫任何金流 API**
- 簽約後只要在 payout 處理流程接上金流即可，帳目歷史完整保留

## 已知限制（上線前需處理）

- 干支/農曆/節氣/命理/建除/星宿/沖煞/胎神等**擇日神煞層為確定性示範演算**（`almanac.js`＋各頁 Disclaimer 已標明；規則正確但非權威曆算），正式版應接 lunar-javascript 等函式庫或通書資料核對。年神方位（三煞/五黃/歲破/大將軍）逐年變動，切勿沿用。
- **AI 顧問有守備範圍限制（2026-07）**：`server/index.js` 的 `AI_SYSTEM` 明確界定只回答國民曆/節氣/生肖/民俗/節氣攝影/App 用法，並以三層防護避免被當成免費通用 ChatGPT（寫程式、寫作業、翻譯）——(1) 系統提示界定範圍與婉拒方式 (2) `AI_ABUSE_RE` 輸入預檢擋明顯越獄與程式碼區塊（**刻意不擋「寫程式」等字眼**，因為「今天適合寫程式嗎」是正常提問）(3) `looksLikeCode()` 輸出守門攔截漏網的程式碼並改回婉拒。攔截會寫 `ai_offtopic` / `ai_offtopic_output` 稽核記錄。改文案找 `AI_SYSTEM` 與 `AI_REFUSAL`。**模型預設 `gpt-5.6-luna`**（$1.00/$6.00 每 1M tokens；2026-07 查詢值。2026-08-11 依指示從 `gpt-5.4-nano` 換過來，**成本是原本的 5 倍**——本顧問只做限定範圍短問答，原本刻意用最便宜的一階，要壓回成本就設 `OPENAI_MODEL=gpt-5.4-nano`）；換模型設 `OPENAI_MODEL` 環境變數即可，不必改碼。⚠️ **正式站是用環境變數釘住的**（部署指令帶 `--update-env-vars=OPENAI_MODEL=…`），所以只改程式裡的預設值**不會**改到已部署的服務——一定要重新部署並更新那個環境變數，改完用管理後台「系統狀態」或 `GET /api/health` 確認實際生效的是哪一個。價格表與成本估算見 `docs/操作手冊.md`。
- **模型參數會自動適配，換模型不必改碼（2026-07-30）**：不同世代的模型接受的參數不一樣——較新的要 `max_completion_tokens`（送 `max_tokens` 回 400）、部分只接受預設 `temperature`。`callOpenAI()` 先照預設送，被 400 拒絕就從錯誤訊息判斷該改哪個參數，調整後重試，並把可用組合記在 `aiParamMode`，之後直接用對的。**雷區**：(1) **要用迴圈不能只重試一次**——模型可能同時嫌棄多個參數而上游一次只報一個（實測先修好 `max_tokens`，重試後才冒出 `temperature` 的抱怨）；(2) **「模型出現在 `/v1/models` 清單裡」不等於「這樣呼叫會成功」**，實測 `gpt-5.4-nano` 在清單中但用舊參數一律 400；(3) 400 要歸類為「設定有誤」（回 503、不給重試鈕），不是暫時性錯誤。
- **AI 上游失敗要能診斷**：金鑰無效／模型不存在／額度用完三者症狀完全一樣，真因原本只寫進 Cloud Run log。`POST /api/admin/ai-test`（admin）會直接打一次上游，回傳狀態碼、模型、遮蔽後金鑰（只前後 4 碼）、目前實際使用的參數組合與對應修法；管理後台「系統狀態」有按鈕。
- **AI 對話是串流的（2026-07-29）**：`/api/ai/chat` 對 OpenAI 開 `stream:true`，再轉成自訂 SSE 事件 `{delta}｜{replace}｜{done}｜{error}`；前端 `api.aiChatStream()` 逐塊拼接。雷區：
  - **串流會弱化「輸出守門」**——文字一段段送出去，等收完才檢查就已經到瀏覽器了。作法是**前 48 字先扣住不送**（`HOLD`），湊夠了做一次完整 `looksLikeCode()` 判定，放行後仍逐塊檢查有沒有冒出 ``` 圍籬；被繞過就送 `{replace}` 事件把整段換成婉拒（實測程式碼一個字都不會外洩）。
  - **回覆短於 48 字時，扣住的內容要在迴圈結束後補送**，否則短回覆會整個不見。
  - **已經開始串流就不能再改 HTTP 狀態碼**，錯誤只能用 `{error}` 事件送；未送 header 前才可以 `res.status(...)`。
  - **前端不可套用全站的 12 秒逾時**（後端給 OpenAI 是 25 秒）——會變成「前端已中止並吐假回覆、後端還在等、token 照扣」。改成首位元組 20 秒、之後每收到一塊就續命的**閒置逾時**。
  - **送出鎖必須用 `useRef` 不能用 state**：state 更新非同步，同一個 render 內連點三次讀到的 `typing` 都還是 false，三個請求照送（實測連點 3 下＝3 則訊息、3 次 token）。
- **降級一律要「看得見」，不可靜默假裝成功**：AI 失敗時**絕不可**偷偷改用 `mock.js` 的腳本。未設金鑰＝回覆掛「示範」徽章（`.msg.ai[data-demo]`）；401/429/502/504 各自顯示 `.msg.sys` 系統訊息＋對應動作（登入／再試一次）。免責文案也要跟著 `GET /api/health` 的 `ai:on/off` 切換——接了金鑰還寫「AI 回覆為示範內容」就是不實陳述。
- **AI 限流以使用者為單位**（`keyGenerator: req.user?.id ?? req.ip`）：純 IP 級會讓同一間辦公室／學校／電信 NAT 後面的人互相把額度吃光。
- **模型輸出的 Markdown 要在前端清掉**（`AIChat.jsx` 的 `stripMd`）：`.msg` 是 `white-space:pre-wrap` 的純文字容器不會 render，模型一吐 `**粗體**`／`###` 就是滿螢幕星號。`AI_SYSTEM` 已明令禁止，但模型不是每次都聽話，這層是雙保險。
- **AI 有「本地知識層」擋在 API 之前**（`src/data/aiKnowledge.js`，54 個意圖）：曆法事實、客服類、敏感邊界、站外問題一律本地回答，**不打 API**。三個理由——(1) 答案來自 `dayFor()` 真實曆算或站內事實，**不可能幻覺**；(2) 零 token 零延遲，且不受 `requireAuth` 擋，**訪客也能用**；(3) 每句話都可被審閱。實測 182 題覆蓋 139 題（76%），七個原本 100% 空轉的客服類別現在全滿，敏感邊界 10/10。
  - **比對順序不可調換**：安全類（自傷/醫療/法律/賭博）最優先 → `exact` 短輸入 → 最長關鍵字。否則「我媽住院了，今天適合開刀嗎？」會被「今天」吸進曆法意圖。
  - **這一層刻意不寫任何價格、退費天數、出貨時間**——寫死的數字一旦與實際政策不符就是履約糾紛，一律導向站內頁面或真人客服。新增意圖時務必守住。
  - **開放式問題要 `return null` 交給 GPT**（宜忌建議、節氣養生、解籤、多輪對話）。本地層不是要取代 AI，硬做成 FAQ 機器人反而更糟。
- **AI 的曆訊 context 由後端自己算**（`buildAlmanacContext()`，`server/index.js`）：後端直接 `import` `src/data/almanac.js`（Dockerfile 已複製該目錄）。**不可沿用前端傳來的字串**——那是可竄改的輸入，而且原本只有薄薄一行，沖煞/財神/胎神/農曆日期/星等根本沒進 prompt，模型只能編（實測沖煞干支、煞方、財神方位、農曆日期全錯，還憑空生出一張四維星等表）。現在 17 個欄位一次給足，並在 `AI_SYSTEM` 加「資料紀律」要求照抄。
- **`luckyHours` 只能由 `hours12` 推導，不可另外查表**：先前 `luckyHours` 來自一張與日支無關的 `HOURS` 常數（按 off 輪替），而完整曆頁顯示的是 `hours12`——實測連續 60 天 **100% 互相矛盾**（AI 說吉時「寅時・申時」，曆頁把申時標成「平」）。使用者一點開曆頁對照就會發現在說謊。
- **對話存 sessionStorage**（`jq-ai-chat`，帶 date 跨日重置）：`msgs` 若只是 `useState`，`pop()` 讓元件卸載＝整段對話蒸發，使用者去看個曆頁回來就要重問。
- 金流、分潤金額為**前端模擬**（訂單、貼文、留言、按讚、追蹤、通知已真實入 DB）。
- **社群登入（Google/LINE/Apple）已移除（2026-07）**：原本只是彈 Demo 提示的假按鈕，會讓使用者以為能用。目前只提供 Email 註冊/登入。日後要接真 OAuth 再重新加回，設計參考 `docs/登入需求-前端整合.md` §3.6。
- **寄信已可正式化（2026-07）**：`mailer.js` 支援 **Gmail SMTP／通用 SMTP／Resend／SendGrid／Mailgun／Brevo**，**零新相依**——SMTP 走自寫的 `server/smtp.js`（`net`/`tls`，465 隱式 TLS、587 自動 STARTTLS、AUTH PLAIN/LOGIN、RFC 2047 中文標頭、multipart/alternative、內文 base64 免 dot-stuffing），HTTP API 走內建 `fetch`。**Cloud Run 只封鎖 25 埠，465/587 可用**（先前註記「不能用 SMTP」有誤）。推薦 Gmail＋應用程式密碼（免費 500 封/日）；`GMAIL_USER` 必須與 `GMAIL_APP_PASSWORD` 成對，程式會**自動把 `MAIL_FROM` 位址對齊成 `GMAIL_USER`**（Gmail 只准以登入身分寄信，否則會被改寫）。**雷區：SMTP 錯誤碼語意與 HTTP 相反——4xx 才是暫時性可重試、5xx（如 535 帳密錯）是永久失敗不該重試**。**未設金鑰＝維持原 dev 行為**（只 log 連結＋回傳 `devLink`）；設了金鑰即自動真寄，不需改碼。設計重點：`sendMail()` 維持**同步回傳**介面（呼叫端不需改），實際送信在背景 fire-and-forget，**寄信失敗不會擋住註冊/下單**（實測註冊 408ms 完成）；**已接供應商時不再回傳 `devLink`**（避免一次性連結外洩到 API 回應）；HTML＋純文字雙版本、零外部資源（不被擋圖）。驗證工具：`npm run mail:test -- you@example.com`、`GET /api/health` 的 `mail` 欄、管理後台「系統狀態」分頁可寄測試信（`POST /api/admin/mail-test`，admin 限定）。**`APP_URL` 沒設對信中連結會指向 localhost**。設定教學見 `docs/寄信-Email設定.md`。
- 無真分析（GA4）/Search Console/Sentry —— 需外部帳號後接。
- ~~SQLite 在 Cloud Run `/tmp` 會重置~~：**已改 Cloud SQL PostgreSQL**（session 與內容持久化、多實例共享）。本機仍用 SQLite 後備。
- **內容嚴格只吃 DB（無 runtime mock 回退）**：所有顯示的文章／內容畫面都移除了 `mock.js` 執行期 fallback——載入中顯示空狀態／「載入中…」，不再回退示範資料。涵蓋 Feed/Explore（含 chips＋人氣創作者由真實 works 聚合）/PostDetail/**WorkDetail(`/api/works/:id`)**/**CreatorPage(`/api/users/:handle`)**/**Profile(自己真實貼文/作品/統計，訪客歸零)**/TodayShots/NewPost/Notifications/**Subscription(plans)**/**MakeCalendar(works)**/Deities/Zodiac/Leaderboard/Challenges/InfoScreens(諺語/慶典/賞花/食材/節氣專欄)/**Almanac(fortuneTools/cultureTools)**/**Matchmaking(zodiacs)**/**CalendarPreview(poemPool)**。索引型畫面（諺語/節氣專欄/訂閱/詳情頁）都加了空陣列 null guard 防止載入期崩潰。`mock.js` 只留給 `seed.js`／`BRAND` 品牌字串／`aiReply` 模擬 AI／設定型清單（solarTermNames/licenseTiers）／尚未建的子系統畫面（見下）。`toAppUser` 用**真實 handle/bio/avatar**（非 email 前綴）；EditProfile 編輯 name/bio/avatar 會 PATCH 持久化。**注意**：`exploreChips`／`poemPool` 在 `ref_items` 存為 `[{chips:[...]}]`／`[{poems:[...]}]` 單筆包裹，但 `GET /api/content/:kind` 會**攤平**回字串陣列——前端直接當字串陣列用，勿再取 `[0].chips`。
- **仍為模擬（非「上傳資料」，屬另建功能）**：Wallet/CreatorConsole 收益帳（需分潤/結算系統）、DMs/DMThread 私訊（需即時訊息系統）、MyProjects 手帳專案、Records 占卜紀錄、Store 商店品項。這些不是「假的使用者上傳」，而是尚未建的子系統。
- **上線清理 Demo 資料**：管理後台「上線清理」或 `DELETE /api/admin/seed`（admin）→ 刪 `is_seed=1` 作者連帶其貼文/作品/留言（FK CASCADE）＋短 id 示範通知，**真人帳號與上傳、ref_items 不受影響**；要換回示範資料重跑 `npm run seed`。**`SEED_DEMO=0 npm run seed` 只更新參考清單、不灌示範內容**——正式站清完 Demo 後重佈署請在部署環境設 `SEED_DEMO=0`，否則 seed 會把測試資料塞回來。
- **真實圖片上傳（2026-07）**：`images` 表（base64 TEXT，pg/sqlite 通用）＋`POST /api/images`（登入者上傳，前端 canvas 壓縮 ≤1600px JPEG，後端驗 MIME 魔數、3MB 上限、只能掛自己的圖）＋`GET /api/images/:id` 同源供圖（CSP `img-src 'self'` 相容、immutable 快取）。`posts.image_id`/`works.image_id` 經 db.js 輕量 ALTER 遷移（**免砍本機 DB**）。前端 `PhotoImg`（ui.jsx）在 `.ph/.img/.gimg` 佔位框內覆蓋顯示，有圖顯圖、無圖回退 emoji。**⚠️ 用 `PhotoImg` 的畫面務必 import**——漏了只有「有照片時」才會崩（無照片走 emoji 分支不會踩到），症狀是點進詳情頁整頁空白但網址與標題已變（WorkDetail/PostDetail 曾雙雙漏掉）——涵蓋 Feed/Explore/TodayShots/PostDetail/WorkDetail/Profile/CreatorPage/MakeCalendar/Leaderboard。NewPost「上傳照片」＋勾「上架市集」會真的 `POST /api/works`（同一張圖）。**排行榜改 `GET /api/leaderboard` 依真實 like_count 即時計算**（ref_items 的 leaderboard 清單已不被前端使用）。
- nav context 單一 provider 全樹重繪（原型可接受）。
- 已處理（2026-07 全面總檢）：法務三頁（privacy/terms/contact）、帳號安全 UI（改密/匯出/刪帳）、訂單後端化（orders 表+API+確認信+防連點）、robots.txt、503.html、API 錯誤中介層、fetch 逾時+友善網路錯誤、註冊 honeypot、每頁 title、main 地標、prefers-reduced-motion、表單 aria-label、曆頁星期對齊真實日期、react vendor chunk 分割。
- 已處理（2026-07 國民曆內容補全）：影像辨識掃描（**已於 2026-08-11 整層重寫成 `src/ar/`，見上**）；曆頁引擎擴充至完整傳統項目（建除/星宿/彭祖/胎神/沖煞虛歲/財喜貴方位/十二時辰/特殊日）；新增完整曆頁 `AlmanacDay`、年度總覽 `YearAlmanac`、附錄工具（食物相剋/度量衡/干支對照）；Feed「看完整國民曆」＋占卜「國民曆·曆頁」「附錄·查詢表」入口。
- 已處理（2026-07 資料庫化＋部署）：App 開在**真實今日**（`todayOffset`，年柱動態）；後端由 SQLite 抽象為 **pg(Cloud SQL)/sqlite 雙驅動**（`db.js`＋`schema.sql`，全 async）；社群內容 DB 化（`posts/comments/post_likes/works/follows/notifications` 表＋API＋前端 `useApi` hooks，`mock.js` 降為種子）；`npm run seed`；**Cloud Run + Cloud SQL 部署 runbook＋一鍵腳本**（全程 Cloud Shell、免本機安裝、免 GitHub）。
- 已處理（2026-07 相機/帳號/金流大版）：**相機工作室**（`Camera.jsx`：拍攝單點照/長按錄、2–6格版面拼貼、建立限動[漸層+文字+票選/問答/倒數]、滑動濾鏡、貼文經典濾鏡+強度滑桿、特效庫、搖晃顯影[DeviceMotion]、動態文字[打字機/卡拉OK/霓虹]；**純瀏覽器 API 零第三方**；濾鏡/特效/漸層/字體設定存 DB `ref_items`、可經 CMS 改）；**註冊自訂 handle**（唯一索引＋即時可用性）；**Email 驗證**（`VerifyBanner`＋重寄）；**RBAC 四級**（user/creator/moderator/admin，`Admin.jsx` 後台改角色/內容）；**新增地點**（`LocationPicker`：OSM 搜尋/反查/圖磚全走後端代理、Geolocation、`user_places` 常用位置）；**金流 scaffold**（`/api/payments/intent`+`webhook`+`PAY_PROVIDER`，串接指南見文件）。臉部 AR 為 CSS 疊加近似（無第三方 face-tracking）。
- 已處理（2026-07 每頁獨立網址＋上線）：路由由「單一 URL」改為**每畫面一個網址**（`nav.jsx` 的 `TAB_PATHS`/`SCREEN_PATH`＋History API 同步；`vite.config.js` `base:'/'`），deep-link/上一頁/下一頁皆可；**已部署 Cloud Run + Cloud SQL 並綁自訂網域 `chengqi.tw`**。AI 顧問接 OpenAI（`/api/ai/chat`，未設金鑰回 fallback；金鑰走 Secret Manager）。
- 文件：對外看 `docs/產品介紹.md`；使用者看 `docs/使用手冊.md`；API 看 `docs/API-總表.md`；維運看 `docs/操作手冊.md`。
- 上架前完整檢查見 `docs/功能完成度.md` 與相關稽核。

---

## 文件索引（`docs/`）

| 檔案 | 內容 | 對象 |
| --- | --- | --- |
| [docs/檢修地圖.md](docs/檢修地圖.md) | ★★★**每個檔案的每個部分在做什麼**：畫面對照表（63 頁）、CSS 前綴→行段、API 端點分區、全域狀態分區。**改東西前先查這份**，省去掃全站。有閘門擋過期 | 全部 |
| [docs/指令集.md](docs/指令集.md) | ★★所有常用指令速查（本機/Cloud Shell/瀏覽器分開標示）＋常見狀況處理 | 全部 |
| [docs/修改指南.md](docs/修改指南.md) | ★★「要改什麼→查哪個檔案→踩雷」任務導向查詢表（改東西前先看這份） | 開發 |
| [docs/產品介紹.md](docs/產品介紹.md) | ★一頁式產品簡介：問題/解法/功能亮點/技術亮點/里程碑（另有網頁版） | 對外 |
| [docs/使用手冊.md](docs/使用手冊.md) | ★App 使用教學：曆頁/社群/相機/AI/占卜/管理後台 | 使用者 |
| [docs/API-總表.md](docs/API-總表.md) | ★全部 42 支 `/api` 端點依類別＋權限整理 | 開發 |
| [docs/操作手冊.md](docs/操作手冊.md) | ★營運速查：更新伺服器/維運指令/成本/金鑰/踩雷（另有網頁版） | 營運 |
| [docs/架構.md](docs/架構.md) | 目錄樹、資料流、啟動生命週期、渲染模型細節 | 開發 |
| [docs/畫面地圖.md](docs/畫面地圖.md) | 全部畫面（40+）：檔案、用途、props、進入點 | 開發 |
| [docs/樣式與RWD.md](docs/樣式與RWD.md) | 設計 token、三斷點、桌機模型、class 詞彙表、雷區 | 開發 |
| [docs/狀態與資料.md](docs/狀態與資料.md) | `nav.jsx` Context 完整 API、`mock.js` 資料形狀 | 開發 |
| [docs/後端-認證.md](docs/後端-認證.md) | `server/` 認證端點、DB schema、安全設計（端點全表見 API-總表） | 開發 |
| [docs/部署-CloudRun-PostgreSQL.md](docs/部署-CloudRun-PostgreSQL.md) | ★Cloud Run + Cloud SQL 部署 runbook（全程 Cloud Shell、免本機、免 GitHub） | 部署 |
| [docs/legal/terms-of-service-en.md](docs/legal/terms-of-service-en.md) · [docs/legal/privacy-policy-en.md](docs/legal/privacy-policy-en.md) | ★英文版服務條款與隱私權政策草案（**未經律師審閱**，`[BRACKETED]` 佔位待填；免責條款的「法律不允許排除者除外」但書切勿刪除，刪了整條可能被判無效） | 法務 |
| [docs/寄信-Email設定.md](docs/寄信-Email設定.md) | ★如何讓驗證信/重設密碼信真的寄出：供應商比較、金鑰、網域驗證、Secret Manager、疑難排解 | 部署 |
| [docs/金流-付款串接.md](docs/金流-付款串接.md) | ★如何讓使用者付款：金流商比較、金鑰、Stripe/TapPay/藍新、webhook、PCI | 部署 |
| [docs/待辦總表.md](docs/待辦總表.md) | ★★**目前還沒做好的部分**（2026-07-29 逐項在 codebase 驗證）。舊的待辦文件多有已完成項，**以這份為準** | 全部 |
| [docs/社交平台檢驗報告.md](docs/社交平台檢驗報告.md) | ★95 項社交平台 QA 逐項檢驗結果（P0/P1/P2 待辦部分已過時，見待辦總表） | 開發/營運 |
| docs/登入需求-*.md · docs/部署-CloudRun.md · docs/功能完成度.md | 既有（部分早於資料庫化/路由改版，以 CLAUDE.md 與上列新文件為準） | 參考 |
