# CLAUDE.md — 機巧時運 專案導覽（先讀這份，通常不必逐檔掃描）

> 「機巧時運」是**智慧互動國民曆 × 節氣攝影社群 × AI 時光顧問**的虛實整合原型。
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
│  │  └─ almanac.js        任意日期生國民曆日頁（dayFor/monthCells，錨點 6/6，示範演算）
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

- **動畫只負責「怎麼出現」，不可負責「是否存在」**：絕不可寫成「基礎樣式 `opacity:0` ＋ keyframes 只定義 `to`」——動畫一旦沒執行（列印、UA 停用動畫、在 `display:none` 容器內掛載、某些 WebView），內容就**永久隱形**，而且是靜默的（版面在、文字在、就是看不見）。要寫成 `animation: x .34s both` ＋ keyframes 同時定義 `from`/`to`，讓基礎樣式保持可見。實測舊寫法在動畫停用時有 15 個元素消失（宜忌 chip、三柱干支、吉日星等、AI 回覆本文）。
  - **元素越大，可見性越不該依賴動畫**：`.rootpane > .body` 與 `.screen` 裝著整頁內容，它們的進場**只動 `transform` 不動 `opacity`**——最壞情況只是偏移 8px，永遠看得見。小元件（chip／星等／訊息）才可以用淡入，因為失效只影響那一個。
  - **`animation-play-state:paused` 絕不可用 `*` 全站套**：一次性的進場動畫被暫停在 0% 就等於內容消失（實測整個內容區變 opacity 0）。只列出真正無限循環的那幾支（seasonGlow／sealBreath／ui-pulse／scanmove／blink…）。暫停一次性動畫本來也沒有省電意義。
  - 例外是 **transition 驅動**的 `.reveal`：它的基礎必須隱形才有東西可過場，但 class 由 JS 加上，所以「JS 沒跑 ⇒ 沒有 class ⇒ 內容正常顯示」，失效方向是安全的。**切勿把 `.reveal` 寫進 JSX 的靜態 className**，那就變成「JS 沒跑就永久隱形」。
- **載入中不可顯示空狀態**：`usePagedList` 的 `loading` 初值必須是 `true`（元件掛載後一定會發首次請求）。若從 `false` 開始，第一幀是「loading=false 且 items=[]」，呼叫端會判成「沒有資料」而顯示「找不到任何作品」——在資料還在路上時就跟使用者說這裡是空的，對剛起步的社群是最糟的第一印象。載入中請用 `.ui-skeleton` 骨架（同時預留版面）。
- **每一條 `:hover` 都要包 `@media (hover:hover) and (pointer:fine)`**：觸控裝置沒有真正的 hover，點一下之後狀態會**黏住**直到點別處——使用者會看到某張卡莫名一直亮著。全站 27 條（含 `styles/components.css` 的 9 條）都已包好，新增時別漏。
- **捲動位置：`push` 歸零、`pop`/`setTab` 還原**。底部分頁列的心智模型是「五個並排的房間」，不是五條瀏覽紀錄，每次回來被丟回門口很惱人。兩個雷：(1) **手機捲的是 `.device .body` 不是 `window`**，`window.scrollTo` 對它完全沒作用；(2) **還原不能只做一次**——切分頁時 `.body` 整個重掛，貼文/作品又是 fetch 回來才長高，第一幀容器還很矮，寫進去的 `scrollTop` 會被夾成 0（實測捲到 400 切走再切回仍是 0）。要用 rAF ＋ 幾次重試直到到位。
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
- **AR 是自研平面追蹤，不是 MindAR**（`src/lib/homography.js` ＋ `quadDetect.js` ＋ `arTracker.js`，零第三方相依）：偵測卡片四角 → 透視拉正 → 四方向比對辨識 → 角點平滑 → 解 homography 與 3D 姿態 → `ARScene.jsx` 用 CSS `matrix3d` 貼上去。適合**有明確邊框的印刷品**；沒有邊框、貼在雜亂背景上的圖會找不到，這是這條路線的已知邊界。`scripts/check-ar.mjs`（47 項）掛在 `npm run build` 上——這層是純數學，寫錯不會拋錯，只會讓模型「貼歪」或「亂轉」。
  - **方向對齊是 `(i - r + 4) % 4` 不是 `(i + r)`**：寫成加時 0° 與 180° 完全正確（±2 在 mod 4 下同值），只有 90°／270° 的原點跑到對角，而且**模型不會消失、只是整個轉 90°**——正面朝上測試永遠測不出來。
  - **CSS `matrix3d` 是行主序**（前四個數是第一「欄」）：寫成列主序時靜態畫面看起來很像，一旋轉才發現角度全錯。
  - **「是不是四邊形」要看「凸包縮成四邊形時損失多少面積」，不是實心度**：一個 L 形貪婪縮頂點會收斂成貼著它外緣的梯形，L 佔那個梯形 94%，實心度完全過關。
  - **角點要做線擬合精修**（TLS／PCA，不可用一般最小平方——邊接近垂直時斜率發散）：凸包直接取角在透視下有 5px 誤差＝160 寬畫面的 3%，模型會明顯偏出卡片；精修後 ≤1.2px。
  - **取樣畫面的長寬比必須等於顯示區**，不可寫死 4:3：`.scan-video` 是 `object-fit:cover`，兩個裁切區不同會讓偵測找到看不到的卡片，且座標換算永遠對不上（實測 scale 變成非等比 2.35×5.01，內容飛出畫面三萬 px）。
  - **AR 疊加層的模型盒要 100px 不可 1px**：子元素的 %、字級、`translate(-50%)` 會在 1px 的盒子裡爆掉（實測印章跑到 −12437px）。換算靠 transform 尾端補 `scale(0.01)`。
  - 疊加層必須 `pointer-events:none`（否則吃掉整個取景畫面的點擊，症狀是「按鈕有時候按不動」）。
  - **★ 圖卡收邊規範是「白留白邊 ＋ 深色框」，不是只加深色框**（拿 2027 小寒卡實測出來的，最大角誤差）：

    | 收邊 | 深色桌面 | 中灰 | 淺色 | 木紋 |
    | --- | --- | --- | --- | --- |
    | 滿版出血（第一版稿） | 26px | 28px | 72px | 28px |
    | 只加深色框 | **27px** | 1.4px | 1.4px | 1.4px |
    | 白留白邊＋深色框 | 1.4px | 1.4px | 1.4px | 1.4px |

    白邊負責深／中／木紋桌面的對比，深色框負責淺色桌面，兩者互補；只做一半一定有一種桌面會爛。規範是：四邊留一圈白邊（短邊 2.5%）、**任何元素都不可碰到紙邊**、白邊內側再一圈深色實框（短邊 3%）。`check-ar.mjs` 有五項鎖這條，含兩個反例。
  - **滿版出血最危險的是「單角失敗」，不是整張認不到**：小寒卡左下角是深藍 QR、上緣是橘色帶，兩者都碰到紙邊 → 那一段邊界與桌面同色 → **那一個角被切掉 24~64px，其他三角完全正常**。偵測仍然回報成功，只是模型與熱區整個歪掉。只檢查「有沒有偵測到」永遠測不出來，**要逐角量誤差**。
  - 連帶的排程結論：**實體卡的設計必須早於 AR 疊加的開發**，拿滿版出血的稿去測會得到「這條路線不可行」的錯誤結論。
  - **`track()` 已經吐出完整 6DoF**（`{ref, score, rotation, corners, H, matrix3d, pose, areaRatio}`），要接 WebGL 不需要先做「追蹤器到底暴露什麼」的調查。`pose.matrix` 是 column-major 4×4，可直接 `Matrix4.fromArray()`。**追蹤器不知道也不該知道卡片的實體尺寸（mm）**——那是卡片註冊表的 metadata，`pose` 的單位是卡片邊長。
  - **180° 翻轉誤判已經處理掉了**（比對階段四個方向都試、取最佳分，`check-ar.mjs` 有四方向測試）。但**卡面若接近旋轉對稱，四個方向的分數會很接近而變得不穩**，所以印刷面仍要有明顯不對稱的定位元素——理由是「拉開分數差距」，不是「四角偵測分不出方向」。
  - **要換 A-Frame／three.js 只需另寫一個吃同樣 `track` 物件的元件**，追蹤層不用動；`pose.matrix` 是 column-major 4×4，可直接 `Matrix4.fromArray()`。⚠️ 兩邊的 **fov 必須一致**（A-Frame 預設 80、本追蹤器預設 60），否則模型會浮在卡片上方或陷進桌面。
- **官方 AR 卡包在 `src/data/arCards.js`＋`src/lib/arCardRegistry.js`**：進 `/AR` 就有東西可掃，不必自己登錄。**使用者自訂登錄（從圖片檔／相機）刻意保留**，只是降級為進階選項。
  - **簽名不寫進原始碼，載入時從 `public/ar/targets/*.png` 算**：建置期要算就得在 Node 裡解 PNG／JPEG（PNG 還能用 zlib 硬幹，JPEG 要整套解碼器）。美術換稿只要換那張圖，算完存 `localStorage['jq-ar-official-v1']`。**換稿要換檔名或呼叫 `clearOfficialCache()`**——快取以路徑為 key。
  - **抓目標圖不可用 `cache: 'force-cache'`，而且只看 `res.ok` 不夠**：檔案不存在時 SPA fallback 回 **200 + index.html**，force-cache 把那份 HTML 存下來後，就算圖補上了也永遠拿到 HTML。症狀是「The source image could not be decoded.」——**「檔案不存在」偽裝成「圖片壞掉」**，會讓人去查圖片格式而不是查路徑。要檢查 `content-type` 是不是 `image/`。
  - **★ 目標圖必須是「實際會印出來的那一版」（含收邊）**：加了白邊與深色框之後整張圖的內容就變了（版面內縮、四周多兩圈），壓成 48×48 的 dHash 與加收邊之前完全不同。拿加收邊之前的稿登錄、印加收邊之後的卡：相機**看得到**卡片、四角也抓得準，但一律判定「不是登錄過的目標」。實測無框版登錄＋有框版拍攝 **0/2**，改用有框版登錄 **4/4**（深／淺桌面 × 正對／斜拍，六個熱區全中）。**這個陷阱會浪費一整輪打樣**，`check-ar.mjs` 有一項鎖它。
  - **`bindLocalTarget()` 讓使用者在頁面上指定本機圖片當官方卡的目標**（美術還在改稿時先驗動線用）。簽名存 localStorage 並標 `source:'local'`，只在那台裝置有效——介面上必須講清楚，否則會以為已經上線了。
  - **熱區命中一定要走 `makeHotspotLatch`（進入 3 幀／離開 8 幀）**：追蹤每秒 15 次、四角偵測有 1px 抖動，熱區邊界附近會在命中／沒命中之間高頻跳動，而開關內容面板是最貴的操作。**進出門檻必須不同**（hysteresis），同門檻時站在邊界上會等頻率一直開一直關。
  - **卡面內容刻意不放營養素與健康宣稱**：那受《食品安全衛生管理法》規範，未經食藥署核對不可上。`check-ar.mjs` 把「待審」變成閘門（`ok(!obj.nutrients)` ＋ 療效用語黑名單）。不碰營養宣稱也有足夠內容——品種／產地來自農業部開放資料、俗語與養生來自 `termGuide.js`、宜忌來自 `almanac.js`，全都可標來源。
  - **查某日屬於哪個節氣要用 `termFromDate`，不可用 `termLocalDay` 的序號反推公曆年**：小寒在「立春起算」的序號裡屬於**下一個**公曆年，`termLocalDay(2027, 22)` 會得到 2028-01-06。2027 小寒實際是 **01-05**（改版文件寫 01-06 是錯的）。
- **3D 角色層在 `src/lib/char/`（純 three，零 A-Frame）**：`geometry.js`（手刻葉／芯／四肢／臉貼片）＋`material.js`（賽璐璐＋inverted-hull 描邊）＋`face.js`（canvas 表情）＋`factory.js`（組裝＋preset）＋`actor.js`（通道式動作）。`components/ProduceStage.jsx` 是 React 進入點。`scripts/check-char.mjs`（46 項）掛在 `npm run build` 上。
  - **這一層與 three 絕不可進主 bundle**：一律 `React.lazy(() => import('../components/ProduceStage.jsx'))`。實測懶載入分塊 **137.5 KB gzip**，主 bundle 只 +1.2 KB。無條件塞進去等於首頁多背三分之一重量給一個多數人不會點的功能。
  - **剝離 A-Frame 時 schema 預設值會消失**：`buildLeafGeometry` 讀 `d.topWaveFreq`，但 preset 的 layers 沒這個欄位——原本靠 `registerGeometry` 的 schema 補 2。少了預設值就是 `sin(undefined)=NaN`，整份 position 變 NaN、**模型整個不見而且不拋任何錯誤**。geometry.js 自帶 `LEAF_DEFAULTS`，check-char 有專測。
  - **接觸陰影掛 `root` 不掛 `body`**：原 demo 放場景層級並用 `getElementById('blob')` 抓（註解寫「掛在角色底下會跟著跳起來」——觀察對，但角色就無法多實例）。正解是分兩層：root 不動、body 才受動作驅動，陰影掛 root。**別照字面把它改成 body 的子節點**，那會讓陰影跟著跳躍飛起來。
  - **`gradientMap` 必須 `NearestFilter`**：它是查表資料不是顏色，用 LinearFilter 會把階梯內插掉＝完全沒有賽璐璐效果，而且不會有任何錯誤訊息。
  - **幾何要共用**：葉片每層只有 3 種高度變體（29 片 → 15 份）、四肢左右同形（8 → 4 份）。退回去畫面完全看不出差別，只有記憶體與載入變差——所以 check-char 鎖死「幾何份數 22」。
  - **描邊不可每幀 `apply()`**：原本 `tick(){this.apply()}` 是 63 顆 mesh × 60fps ＝ 每秒 3,780 次無謂查詢。幾何建好就不會換，建立時做一次即可。
  - **React unmount 必須 `dispose()` 並 `forceContextLoss()`**：行動裝置能同時存在的 WebGL context 常見上限 8–16，反覆進出抽屜會拿不到新 context，症狀是「第 N 次點開變成空白」而前面幾次都正常。**ramp 快取是跨角色共用的，不可被單一角色的 dispose 清掉**。
  - **JS 驅動的動畫要自己讀 reduce-motion**（同 AnimatedText 那個坑）。作法是把幅度縮到 ~12% 而**不是整個停掉**——角色僵住不動看起來像壞掉，微微呼吸才像「靜止」。
  - **動作是 base ＋ additive 兩層**：原本的 `switch` 互斥，寫不出「揮手同時講話」。`setOverlay('talk')` 走 additive 通道相加，既有 12 個動作一行都不用改。
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
- **AI 顧問有守備範圍限制（2026-07）**：`server/index.js` 的 `AI_SYSTEM` 明確界定只回答國民曆/節氣/生肖/民俗/節氣攝影/App 用法，並以三層防護避免被當成免費通用 ChatGPT（寫程式、寫作業、翻譯）——(1) 系統提示界定範圍與婉拒方式 (2) `AI_ABUSE_RE` 輸入預檢擋明顯越獄與程式碼區塊（**刻意不擋「寫程式」等字眼**，因為「今天適合寫程式嗎」是正常提問）(3) `looksLikeCode()` 輸出守門攔截漏網的程式碼並改回婉拒。攔截會寫 `ai_offtopic` / `ai_offtopic_output` 稽核記錄。改文案找 `AI_SYSTEM` 與 `AI_REFUSAL`。**模型預設 `gpt-5.4-nano`**（最便宜一階，$0.20/$1.25 每 1M tokens；2026-07 查詢值）——本顧問只做限定範圍短問答，不需旗艦模型；換模型設 `OPENAI_MODEL` 環境變數即可，不必改碼。價格表與成本估算見 `docs/操作手冊.md`。
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
- 已處理（2026-07 國民曆內容補全）：自研影像辨識掃描（`lib/scanner.js`＋`Scan.jsx`，零相依裝置端）；曆頁引擎擴充至完整傳統項目（建除/星宿/彭祖/胎神/沖煞虛歲/財喜貴方位/十二時辰/特殊日）；新增完整曆頁 `AlmanacDay`、年度總覽 `YearAlmanac`、附錄工具（食物相剋/度量衡/干支對照）；Feed「看完整國民曆」＋占卜「國民曆·曆頁」「附錄·查詢表」入口。
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
