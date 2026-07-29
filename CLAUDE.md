# CLAUDE.md — 機巧時運 專案導覽（先讀這份，通常不必逐檔掃描）

> 「機巧時運」是**智慧互動農民曆 × 節氣攝影社群 × AI 時光顧問**的虛實整合原型。
> 本檔是給 AI 代理／開發者的**單一入口**：架構、指令、慣例、雷區都在這；細節見 `docs/`。
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
│  │  └─ almanac.js        任意日期生農民曆日頁（dayFor/monthCells，錨點 6/6，示範演算）
│  │                        ★todayOffset() 讓 App 開在真實今日；dayFor 回傳完整傳統項目（三柱干支動態年份/建除/星宿/彭祖/胎神/沖煞歲數/財喜貴方位/十二時辰/特殊日）；另 export yearOverview
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
│     ├─ AlmanacDay.jsx    完整農民曆日頁（dayFor → 全部傳統項目）
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
| **≤559px 手機** | App 滿版無框、底部分頁列 `.tabbar`、內部捲動 |
| **560–899px 平板** | 手機外框置中、溫潤品牌背景 |
| **≥900px 桌機（登入）** | **網站式**：`WebNav` 頂部列 + 整頁捲動內容 + `WebFooter`；多欄版面 |

**⚠️ 斷點同時看寬度與高度**：平板/桌機的兩個斷點都是 `and (min-height:600px)`。只看寬度的話，橫向手機（844×390）寬度也 ≥560，會被當成平板而套用「手機外框」——實測變成中間 420×334 的小框、左右各 212px 灰邊，只用到 43% 螢幕。矮視窗（橫向手機）一律走滿版手機版面，另有 `@media (max-height:599px) and (min-width:431px)` 解除 `.device` 的 430px 上限讓它填滿。

桌機是**整頁捲動的網站**（非 App 內捲）：sticky navbar、內容直接坐在單一頁面上（無外框卡片＝避免頁中頁）、footer 落最後；各分頁多欄化（曆頁雙欄、探索/作品集 4 欄相簿、占卜/建立/我的工具列雙欄卡片、作品詳情雙欄商品頁）。細節、class 詞彙表、雷區見 [docs/樣式與RWD.md](docs/樣式與RWD.md)。

---

## 後端與認證（`server/`）

真實認證：伺服器端 session 存 SQLite、HttpOnly+SameSite=Strict Cookie、CSRF header、bcrypt cost12、速率限制、帳號鎖定、防列舉、helmet CSP/HSTS、GDPR 刪帳/匯出、RBAC。
**密碼規則**：至少 8 碼且需同時含大小寫英文（`server/index.js` 的 `passwordError()`，前端鏡像在 `src/lib/password.js`，兩邊文案必須一致）。**只在設定新密碼時檢查**（註冊／重設／變更）——登入僅比對雜湊，因此收緊規則不會把既有帳號鎖在門外；`seed.js` 的測試密碼不符新規則但仍可登入。端點表、schema、安全設計、限制見 [docs/後端-認證.md](docs/後端-認證.md)。

---

## 樣式系統（2026-07 整修後的規則）

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
- **hook 一律寫在提早 return 之前**：`PostDetail` 的編輯狀態（`editing/eTitle/eCap/saving`）原本寫在 `if (!post) return 載入中` 之後——第一次渲染只跑 11 個 hook、資料回來後 15 個，React 丟「Rendered more hooks than during the previous render」，**整個貼文詳情頁被 ErrorBoundary 接走**（點進貼文只看到錯誤畫面，build 不會報錯）。新增狀態時務必放在所有 `return` 之前。
- **`ToolRow` 本身是 `<button>`**：放進去的互動子元件不能是 `<button>`（button 巢 button＝DOM 穿模）；`Switch` 用 `<span role="switch">`。
- **`.calcell.empty` 的 `empty` 會撞到全站空狀態元件 `.empty`**（那個有 `padding:50px 24px`）：月曆前導空白格是 `<span class="calcell empty">`，被撐成 100px 把首週那列從 46px 拉高（就是舊註解說的「首週大空隙」，但原因不是 aspect-ratio）。`visibility:hidden` **不會讓它不占位**，必須顯式 `padding:0; min-height:0`。**新元件取 class 名前先確認沒有同名的全站元件。**
- **月曆格 `.calgrid`/`.calwk`**：用 `grid-template-columns:repeat(7,minmax(0,1fr))`，且高度用 `grid-auto-rows:46px` 固定、**不要用 `aspect-ratio`**——前導空白格是空 `<span>`，aspect-ratio 會把它撐成 ~100px 拉高首週那列、產生大空隙。
- **桌機內容卡 `.device` 用 `overflow:clip` 不能 `overflow:hidden`**：`hidden` 會讓它變 sticky 的捲動容器，害 sticky 頂列偏移出空白帶。
- **`.webnav,.webfoot` 的基礎 `display:none` 要放在 `@media(min-width:900px)` 之前**：同 specificity 時後者勝，放後面會永遠隱藏。
- **grid2 雙欄**：`.rootpane.grid2 .body` 由 flex 改 grid，非 `.tool` 子元素要 `grid-column:1/-1` 才不會被塞進雙欄。
- **flex column 內用 `margin:auto` 置中會關閉 stretch**：`.screen` 是 flex column，其子項 `.body` 若用 `max-width + margin:auto` 置中，auto 邊界會取消 stretch → `.body` 收縮成內容寬（詳情頁看起來太窄/稀疏）。要用 **`width:min(100%, Npx)`**（確定寬度）才會真的填滿到 N 再置中。
- **桌機堆疊畫面的版心（2026-07 修）**：通則 `.screen .body` 是 `width:min(100%,720px)` ＋ `margin:auto`，40 頁實測有 30 頁因此變成「1440px 視窗中間一條 720px 手機欄」、1000px 內容卡裡左右各 140px 死白。已按內容性質分三類：**讀字型**（條款/關於/專欄/貼文/表單）維持窄欄；**清單型**（設定/安全/神佛/諺語/慶典/賞花/食材/相剋/干支/商店/排行/創作者後台）改**雙欄**；**時序型**（通知/收益/訂單/紀錄/專案/挑戰/生肖/今日）維持單欄但放寬到內容卡滿寬。雙欄沿用 `.rootpane.grid2` 約定：直接子元素預設 `grid-column:1/-1`，只有列出的 `.tool/.opt/.kv/.list-item/.card/.acc-form` 才 `grid-column:auto`。
- **要放寬 `.body` 必須寫 `width` 且把 `margin-left/right` 歸零**：(1) 只寫 `max-width` 會被通則的 `width:min(100%,720px)` 蓋掉——`.wd-body`(920) 與 `.screen-subscription`(840) 兩處都因此長年被壓在 720，方案卡只有 298px；(2) 改成 `width:auto` 卻留著通則的 `margin:auto`，flex column 下會關閉 stretch、`.body` 縮成內容寬（實測左緣隨內容在 580~833 間跳動）。
- **導覽列/頁尾/內容卡要共用同一條左緣**：三者原本是 1040+28、1000+26、720 置中，1920px 下產生 452／460／504 三條差 8~52px 的邊——「差一點沒對齊」正是整體比例看起來歪的主因。已統一為 1000 版心 ＋ 26px 內距。
- **桌機各詳情畫面微調**：`App.jsx` 給堆疊 `.screen` 加 `screen-<key>` class（如 `screen-postDetail`、`screen-subscription`），可在 CSS 針對單一畫面調版面（訂閱雙欄、貼文窄欄等）。
- **桌機 `.device` 一定要覆寫 base 的 `max-height:100dvh`**：手機 base 是 `height:100dvh; max-height:100dvh`（滿版手機框內捲）。桌機是整頁捲動，device 要 `height:auto; max-height:none`。**只覆寫 height 忘了 max-height** → device 被鎖在一個視窗高，較長內容溢出、頁尾（device 之後的手足）疊到內容上（「頁尾殘影」）。
- **`.coverbig` 有 inline `width:calc(100%-26px)`**：桌機要 `width:auto !important` 才蓋得掉。
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
- **AI 顧問有守備範圍限制（2026-07）**：`server/index.js` 的 `AI_SYSTEM` 明確界定只回答農民曆/節氣/生肖/民俗/節氣攝影/App 用法，並以三層防護避免被當成免費通用 ChatGPT（寫程式、寫作業、翻譯）——(1) 系統提示界定範圍與婉拒方式 (2) `AI_ABUSE_RE` 輸入預檢擋明顯越獄與程式碼區塊（**刻意不擋「寫程式」等字眼**，因為「今天適合寫程式嗎」是正常提問）(3) `looksLikeCode()` 輸出守門攔截漏網的程式碼並改回婉拒。攔截會寫 `ai_offtopic` / `ai_offtopic_output` 稽核記錄。改文案找 `AI_SYSTEM` 與 `AI_REFUSAL`。**模型預設 `gpt-5.4-nano`**（最便宜一階，$0.20/$1.25 每 1M tokens；2026-07 查詢值）——本顧問只做限定範圍短問答，不需旗艦模型；換模型設 `OPENAI_MODEL` 環境變數即可，不必改碼。價格表與成本估算見 `docs/操作手冊.md`。
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
- 已處理（2026-07 農民曆內容補全）：自研影像辨識掃描（`lib/scanner.js`＋`Scan.jsx`，零相依裝置端）；曆頁引擎擴充至完整傳統項目（建除/星宿/彭祖/胎神/沖煞虛歲/財喜貴方位/十二時辰/特殊日）；新增完整曆頁 `AlmanacDay`、年度總覽 `YearAlmanac`、附錄工具（食物相剋/度量衡/干支對照）；Feed「看完整農民曆」＋占卜「農民曆·曆頁」「附錄·查詢表」入口。
- 已處理（2026-07 資料庫化＋部署）：App 開在**真實今日**（`todayOffset`，年柱動態）；後端由 SQLite 抽象為 **pg(Cloud SQL)/sqlite 雙驅動**（`db.js`＋`schema.sql`，全 async）；社群內容 DB 化（`posts/comments/post_likes/works/follows/notifications` 表＋API＋前端 `useApi` hooks，`mock.js` 降為種子）；`npm run seed`；**Cloud Run + Cloud SQL 部署 runbook＋一鍵腳本**（全程 Cloud Shell、免本機安裝、免 GitHub）。
- 已處理（2026-07 相機/帳號/金流大版）：**相機工作室**（`Camera.jsx`：拍攝單點照/長按錄、2–6格版面拼貼、建立限動[漸層+文字+票選/問答/倒數]、滑動濾鏡、貼文經典濾鏡+強度滑桿、特效庫、搖晃顯影[DeviceMotion]、動態文字[打字機/卡拉OK/霓虹]；**純瀏覽器 API 零第三方**；濾鏡/特效/漸層/字體設定存 DB `ref_items`、可經 CMS 改）；**註冊自訂 handle**（唯一索引＋即時可用性）；**Email 驗證**（`VerifyBanner`＋重寄）；**RBAC 四級**（user/creator/moderator/admin，`Admin.jsx` 後台改角色/內容）；**新增地點**（`LocationPicker`：OSM 搜尋/反查/圖磚全走後端代理、Geolocation、`user_places` 常用位置）；**金流 scaffold**（`/api/payments/intent`+`webhook`+`PAY_PROVIDER`，串接指南見文件）。臉部 AR 為 CSS 疊加近似（無第三方 face-tracking）。
- 已處理（2026-07 每頁獨立網址＋上線）：路由由「單一 URL」改為**每畫面一個網址**（`nav.jsx` 的 `TAB_PATHS`/`SCREEN_PATH`＋History API 同步；`vite.config.js` `base:'/'`），deep-link/上一頁/下一頁皆可；**已部署 Cloud Run + Cloud SQL 並綁自訂網域 `chengqi.tw`**。AI 顧問接 OpenAI（`/api/ai/chat`，未設金鑰回 fallback；金鑰走 Secret Manager）。
- 文件：對外看 `docs/產品介紹.md`；使用者看 `docs/使用手冊.md`；API 看 `docs/API-總表.md`；維運看 `docs/操作手冊.md`。
- 上架前完整檢查見 `docs/功能完成度.md` 與相關稽核。

---

## 文件索引（`docs/`）

| 檔案 | 內容 | 對象 |
| --- | --- | --- |
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
