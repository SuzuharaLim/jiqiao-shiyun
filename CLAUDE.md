# CLAUDE.md — 機巧時運 專案導覽（先讀這份，通常不必逐檔掃描）

> 「機巧時運」是**智慧互動農民曆 × 節氣攝影社群 × AI 時光顧問**的虛實整合原型。
> 本檔是給 AI 代理／開發者的**單一入口**：架構、指令、慣例、雷區都在這；細節見 `docs/`。
> 最後更新：2026-07。若你改動了架構，請一併更新本檔與對應的 `docs/*`。

---

## 這是什麼

- **前端**：Vite 5 + React 18 SPA（`src/`），純 ESM（`package.json` 有 `"type":"module"`）。
- **後端**：Node/Express + better-sqlite3 + bcryptjs（`server/`），真實帳號認證（非 mock）。
- **狀態**：單一 React Context（`src/store/nav.jsx`），無 Redux、無 react-router。
- **資料**：畫面內容多為示範資料（`src/data/mock.js`）；**只有認證是真的**，金流/AI/社群登入仍是模擬。
- 目標用途：募資／提案／使用者測試展示，並已備妥 Cloud Run 全端部署。

---

## 如何執行

需求：Node 18+（建議 20）。首次先 `npm install`。

| 指令 | 作用 | Port |
| --- | --- | --- |
| `npm run dev` | 前端開發（Vite，HMR） | 5173 |
| `npm run dev:server` | 後端開發（`node --watch`） | 8080 |
| `npm run build` | 打包前端到 `dist/` | — |
| `npm run preview` | 預覽打包結果 | 4173 |
| `npm run start` / `npm run server` | 正式：node 同時 serve `dist/` + `/api` | 8080（`PORT`） |

- 開發時 `vite.config.js` 把 `/api` proxy 到 `http://localhost:8080`（同源 → Cookie 正常）。要測登入需**同時**跑 `dev` 與 `dev:server`。
- 正式環境只跑 node：`server/index.js` 偵測到 `dist/` 存在就 serve 靜態檔 + SPA fallback（非 `/api` 一律回 `index.html`）。
- **測試帳號**：`newuser@example.com` / `secret12345`。
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
│  ├─ api.js               認證 API 用戶端（credentials + x-csrf-token）
│  ├─ store/nav.jsx        ★全域 Context：主題/使用者/路由/所有互動狀態 → 見 docs/狀態與資料.md
│  ├─ data/
│  │  ├─ mock.js           所有示範資料 → 見 docs/狀態與資料.md
│  │  └─ almanac.js        任意日期生農民曆日頁（dayFor/monthCells，錨點 6/6，示範演算）
│  ├─ lib/
│  │  └─ scanner.js        ★自研影像辨識（dHash＋直方圖＋清晰度，純陣列運算零相依，可直接 Node 測試）
│  ├─ components/
│  │  ├─ ui.jsx            共用：TopBar / TabBar / ToolRow / Switch / SectionHead / Disclaimer / Toast
│  │  ├─ Icon.jsx          內嵌 SVG 線條圖示系統（P 物件查表）
│  │  ├─ WebNav.jsx        桌機頂部導覽列（≥900px）
│  │  ├─ WebFooter.jsx     桌機頁尾（≥900px）
│  │  ├─ AuthWall.jsx      登入牆（訪客下單/上傳時彈出）
│  │  └─ ErrorBoundary.jsx 全站錯誤邊界（單元件崩不整頁白屏）
│  └─ screens/
│     ├─ registry.jsx      ★ ROOTS[5] + SCREENS{} 畫面對照表 → 見 docs/畫面地圖.md
│     └─ *.jsx             34 個畫面
├─ server/
│  ├─ index.js             ★Express：所有 /api 路由 + 安全中介層 + serve dist
│  ├─ db.js                SQLite schema（users/sessions/tokens/audit_log）
│  ├─ mailer.js            dev 只 log 連結（無真 SMTP）
│  └─ data/auth.db         SQLite 檔（DATA_DIR 可覆蓋）
└─ docs/                   ★詳細文件（見下方索引）
```

---

## 渲染與路由模型（沒有 react-router）

- 路由 = **分頁（tab）+ 畫面堆疊（stack）**，都在 `nav.jsx`。整站只有一個 URL `/`。
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

登入牆：`requireAccount(reason)` — 訪客/未登入回 `false` 並彈 `AuthWall`；已在結帳、發佈、購買、下單、加入購物車前呼叫。

---

## 樣式與 RWD（`src/styles.css`）

Token 驅動；淺/深色以 `[data-theme]` 44 個 CSS 變數切換。三斷點：

| 斷點 | 版面 |
| --- | --- |
| **≤559px 手機** | App 滿版無框、底部分頁列 `.tabbar`、內部捲動 |
| **560–899px 平板** | 手機外框置中、溫潤品牌背景 |
| **≥900px 桌機（登入）** | **網站式**：`WebNav` 頂部列 + 整頁捲動內容 + `WebFooter`；多欄版面 |

桌機是**整頁捲動的網站**（非 App 內捲）：sticky navbar、內容直接坐在單一頁面上（無外框卡片＝避免頁中頁）、footer 落最後；各分頁多欄化（曆頁雙欄、探索/作品集 4 欄相簿、占卜/建立/我的工具列雙欄卡片、作品詳情雙欄商品頁）。細節、class 詞彙表、雷區見 [docs/樣式與RWD.md](docs/樣式與RWD.md)。

---

## 後端與認證（`server/`）

真實認證：伺服器端 session 存 SQLite、HttpOnly+SameSite=Strict Cookie、CSRF header、bcrypt cost12、速率限制、帳號鎖定、防列舉、helmet CSP/HSTS、GDPR 刪帳/匯出、RBAC。端點表、schema、安全設計、限制見 [docs/後端-認證.md](docs/後端-認證.md)。

---

## 慣例與雷區（改動前務必知道）

- **`.body` 是 flex column**：內含 `overflow:hidden` 的區塊要加 `flex:0 0 auto`，否則被壓成 0 高。
- **`ToolRow` 本身是 `<button>`**：放進去的互動子元件不能是 `<button>`（button 巢 button＝DOM 穿模）；`Switch` 用 `<span role="switch">`。
- **月曆格 `.calgrid`/`.calwk`**：用 `grid-template-columns:repeat(7,minmax(0,1fr))`，且高度用 `grid-auto-rows:46px` 固定、**不要用 `aspect-ratio`**——前導空白格是空 `<span>`，aspect-ratio 會把它撐成 ~100px 拉高首週那列、產生大空隙。
- **桌機內容卡 `.device` 用 `overflow:clip` 不能 `overflow:hidden`**：`hidden` 會讓它變 sticky 的捲動容器，害 sticky 頂列偏移出空白帶。
- **`.webnav,.webfoot` 的基礎 `display:none` 要放在 `@media(min-width:900px)` 之前**：同 specificity 時後者勝，放後面會永遠隱藏。
- **grid2 雙欄**：`.rootpane.grid2 .body` 由 flex 改 grid，非 `.tool` 子元素要 `grid-column:1/-1` 才不會被塞進雙欄。
- **flex column 內用 `margin:auto` 置中會關閉 stretch**：`.screen` 是 flex column，其子項 `.body` 若用 `max-width + margin:auto` 置中，auto 邊界會取消 stretch → `.body` 收縮成內容寬（詳情頁看起來太窄/稀疏）。要用 **`width:min(100%, Npx)`**（確定寬度）才會真的填滿到 N 再置中。
- **桌機各詳情畫面微調**：`App.jsx` 給堆疊 `.screen` 加 `screen-<key>` class（如 `screen-postDetail`、`screen-subscription`），可在 CSS 針對單一畫面調版面（訂閱雙欄、貼文窄欄等）。
- **桌機 `.device` 一定要覆寫 base 的 `max-height:100dvh`**：手機 base 是 `height:100dvh; max-height:100dvh`（滿版手機框內捲）。桌機是整頁捲動，device 要 `height:auto; max-height:none`。**只覆寫 height 忘了 max-height** → device 被鎖在一個視窗高，較長內容溢出、頁尾（device 之後的手足）疊到內容上（「頁尾殘影」）。
- **`.coverbig` 有 inline `width:calc(100%-26px)`**：桌機要 `width:auto !important` 才蓋得掉。
- **主題切換不重整**：`nav.jsx` 讀寫 `localStorage('jq-theme')`；勿把主題 script inline 進 HTML（違反 CSP，已外移 `public/theme-init.js`）。
- **真 Chrome 截圖**：點擊/導航後常 CDP timeout（renderer freeze），重試單獨 screenshot 即可；量測用 `javascript_tool` 較穩。
- **不要**放回 IG 風格元素（彩虹 story 環、IG 藍、IG Shop 黑底 $ 徽章、純圖示底部列）——刻意去 IG 化，走宣紙/墨/朱紅/金/靛青 + 襯線明體。

---

## 已知限制（上線前需處理）

- 干支/農曆/節氣/命理為**近似示範演算**（`almanac.js` 有免責），應接 lunar-javascript 等函式庫。
- 金流、分潤金額、AI 對話、社群登入（Google/LINE/Apple）皆為**前端模擬**（訂單本身已後端化）。
- 無真 SMTP（`mailer.js` dev 只 log 連結；註冊驗證信/訂單確認信皆走此）。
- 無真分析（GA4）/Search Console/Sentry —— 需外部帳號後接。
- SQLite 在 Cloud Run `/tmp` 會重置且多實例不共享 session → 正式需 Cloud SQL/Redis。
- nav context 單一 provider 全樹重繪（原型可接受）。
- 已處理（2026-07 全面總檢）：法務三頁（privacy/terms/contact）、帳號安全 UI（改密/匯出/刪帳）、訂單後端化（orders 表+API+確認信+防連點）、robots.txt、503.html、API 錯誤中介層、fetch 逾時+友善網路錯誤、註冊 honeypot、每頁 title、main 地標、prefers-reduced-motion、表單 aria-label、曆頁星期對齊真實日期、react vendor chunk 分割。
- 上架前完整檢查見 `docs/功能完成度.md` 與相關稽核。

---

## 文件索引（`docs/`）

| 檔案 | 內容 |
| --- | --- |
| [docs/架構.md](docs/架構.md) | 目錄樹、資料流、啟動生命週期、渲染模型細節 |
| [docs/畫面地圖.md](docs/畫面地圖.md) | 全部 34 畫面：檔案、用途、props、進入點 |
| [docs/樣式與RWD.md](docs/樣式與RWD.md) | 設計 token、三斷點、桌機模型、class 詞彙表、雷區 |
| [docs/狀態與資料.md](docs/狀態與資料.md) | `nav.jsx` Context 完整 API、`mock.js` 資料形狀 |
| [docs/後端-認證.md](docs/後端-認證.md) | `server/` 端點表、DB schema、安全設計、限制 |
| docs/登入需求-*.md | 登入需求落實對照、後端安全設計、前端整合（既有） |
| docs/部署-CloudRun.md | Cloud Run 全端部署（既有） |
| docs/功能完成度.md | 各功能完成度紀錄（既有） |
