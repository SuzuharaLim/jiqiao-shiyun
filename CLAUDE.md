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
- **資料**：**社群內容已資料庫化**——貼文/作品/留言/按讚/追蹤/通知/訂單皆真實存 DB、可持久化（`mock.js` 降為**種子來源**＋離線 fallback）。**曆算為確定性演算**（`almanac.js`）。仍模擬：金流、AI 對話、社群登入（Google/LINE/Apple）。
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
- **`almanac.js` 曆算公式（改前先懂）**：月柱用**五虎遁**（`monthGan = mod(2*年干+2 + mod(月支-2,12), 10)`，丙年正月起庚寅）；沖煞歲數是**虛歲**（`mod(當生肖-沖生肖,12)+1`，出生即 1 歲，**不是 `||12`**）。改錯會得丙午/6 歲而非正解甲午/7 歲。全部確定性、可 `node --input-type=module` 直接驗。
- **`.ad-*`/`.ya-*` 樣式在 styles.css 末段**（reduced-motion 之後）；`AlmanacDay`/`YearAlmanac` 桌機用 `screen-almanacDay`/`screen-yearAlmanac` 收斂 `width:min(100%,760px)`、時辰格改 6 欄。`yearOverview.ganzhi` 已含「年」字（"丙午年"），串接標題勿再加「年」。
- **App 開在真實今日**：`almanac.js` 的 `todayOffset()=offsetFromDate(new Date())`；UI 的 `off` 以此為基準（Feed 用 `T0`）。「回今日」「today 高亮」都比 `T0` 而非 0（0＝錨點 6/6）。改動翻日邏輯勿退回硬編 0。
- **資料層 SQL 一律用 `?` 佔位、TEXT 存時間（ISO）**：pg 驅動自動把 `?`→`$n`；時間用 ISO 字串字典序＝時間序，pg/sqlite 比較一致。**勿改用 `NOW()`/`SERIAL`/`AUTOINCREMENT`/boolean/timestamp 型別**（破可移植性）。`COUNT(*) AS c` 在 pg 回字串 → 取值要 `Number(row.c)`。新增查詢走 `db.get/all/run`（皆 async，記得 await）。
- **改 schema 後本機要砍舊 sqlite**：`schema.sql` 是 `CREATE ... IF NOT EXISTS`，不會補欄位；本機新增欄位後需刪 `server/data/auth.db*` 再 `npm run seed`（正式 Cloud SQL 每次全新故無此問題）。
- **種子作者是 `is_seed=1` 的 user**（`seed-<handle>`，無法登入）；貼文/作品 FK 到這些 user。前端顯示 `user`＝該作者 `handle`。
- **相機生命週期只能由單一 effect 管理**（`Camera.jsx`，deps `facing/mode/shot/videoUrl/camKey`）：**串流必須放 state 不能放 ref**（ref 變動不觸發重繪 → 掛載 effect 不重跑 → video 仍連著已停止的舊串流＝切鏡頭失效／放棄編輯後黑畫面）；**不要在 onClick 另外呼叫開相機**（會與 effect 互搶產生競態），放棄編輯只需 `setShot(null)`。快速連按切鏡頭靠 effect 內 `cancelled` 旗標丟棄過期的 getUserMedia 結果。無實體鏡頭時可覆寫 `getUserMedia` 回傳 `canvas.captureStream()` 假串流做自動化測試。
- **相機發佈必須真的上傳圖片**：`usePhoto` 要先 `api.uploadImage()` 拿 imageId 再 `createPost`，否則貼文只顯示 📷 emoji 佔位圖；且**畫面濾鏡只是 CSS 預覽**，需經 `bakeImage()` 把濾鏡/強度/疊加特效/文字畫進 canvas（`ctx.filter` 語法同 CSS filter）才會存進圖檔。發佈時自動標記當前節氣。
- **限動貼紙（票選/問答/倒數）內容可由使用者自訂**（`CreateStory` 的 `poll`/`qa`/`cd` state），倒數每秒更新且僅在選中時啟動計時器。
- **相機需 CSP `img-src`/`media-src` 含 `blob:`**（拍照/錄影預覽）；`camera` 在 `App.jsx` fullScreens（隱藏 tabbar）。臉部貼合是 **CSS 疊加/濾鏡近似**（無第三方 face-tracking）；搖晃顯影用 DeviceMotion（iOS 需 `requestPermission`，桌機給「點我模擬」fallback）。濾鏡/特效/漸層/字體＝DB `ref_items`（feedFilters/storyFilters/effects/gradients/textFx），改資料走 CMS 不動碼。
- **RBAC 階層**：`ROLES=['user','creator','moderator','admin']`，`requireRole(min)` 用 `roleRank` 比大小（非等值）。moderator+ 可改內容、admin 可改角色；**admin 不能改自己的角色**（防自鎖）。
- **handle 唯一**：`CREATE UNIQUE INDEX idx_users_handle ON users(lower(handle))`（大小寫不敏感、NULL 可重複）；註冊存小寫。競態時捕捉 unique 例外回 409。
- **地點全走後端代理**：`/api/places/search`、`/api/places/reverse`、`/api/map/tile/:z/:x/:y` 代理 OSM（伺服器加 User-Agent，前端只連同源符合 CSP `img-src 'self'`/`connect-src 'self'`）。切勿讓前端直連 nominatim/tile（會被 CSP 擋）。

---

## 已知限制（上線前需處理）

- 干支/農曆/節氣/命理/建除/星宿/沖煞/胎神等**擇日神煞層為確定性示範演算**（`almanac.js`＋各頁 Disclaimer 已標明；規則正確但非權威曆算），正式版應接 lunar-javascript 等函式庫或通書資料核對。年神方位（三煞/五黃/歲破/大將軍）逐年變動，切勿沿用。
- **AI 顧問有守備範圍限制（2026-07）**：`server/index.js` 的 `AI_SYSTEM` 明確界定只回答農民曆/節氣/生肖/民俗/節氣攝影/App 用法，並以三層防護避免被當成免費通用 ChatGPT（寫程式、寫作業、翻譯）——(1) 系統提示界定範圍與婉拒方式 (2) `AI_ABUSE_RE` 輸入預檢擋明顯越獄與程式碼區塊（**刻意不擋「寫程式」等字眼**，因為「今天適合寫程式嗎」是正常提問）(3) `looksLikeCode()` 輸出守門攔截漏網的程式碼並改回婉拒。攔截會寫 `ai_offtopic` / `ai_offtopic_output` 稽核記錄。改文案找 `AI_SYSTEM` 與 `AI_REFUSAL`。**模型預設 `gpt-5.4-nano`**（最便宜一階，$0.20/$1.25 每 1M tokens；2026-07 查詢值）——本顧問只做限定範圍短問答，不需旗艦模型；換模型設 `OPENAI_MODEL` 環境變數即可，不必改碼。價格表與成本估算見 `docs/操作手冊.md`。
- 金流、分潤金額、社群登入（Google/LINE/Apple）皆為**前端模擬**（訂單、貼文、留言、按讚、追蹤、通知已真實入 DB）。
- **寄信已可正式化（2026-07）**：`mailer.js` 支援 **Gmail SMTP／通用 SMTP／Resend／SendGrid／Mailgun／Brevo**，**零新相依**——SMTP 走自寫的 `server/smtp.js`（`net`/`tls`，465 隱式 TLS、587 自動 STARTTLS、AUTH PLAIN/LOGIN、RFC 2047 中文標頭、multipart/alternative、內文 base64 免 dot-stuffing），HTTP API 走內建 `fetch`。**Cloud Run 只封鎖 25 埠，465/587 可用**（先前註記「不能用 SMTP」有誤）。推薦 Gmail＋應用程式密碼（免費 500 封/日）；`GMAIL_USER` 必須與 `GMAIL_APP_PASSWORD` 成對，程式會**自動把 `MAIL_FROM` 位址對齊成 `GMAIL_USER`**（Gmail 只准以登入身分寄信，否則會被改寫）。**雷區：SMTP 錯誤碼語意與 HTTP 相反——4xx 才是暫時性可重試、5xx（如 535 帳密錯）是永久失敗不該重試**。**未設金鑰＝維持原 dev 行為**（只 log 連結＋回傳 `devLink`）；設了金鑰即自動真寄，不需改碼。設計重點：`sendMail()` 維持**同步回傳**介面（呼叫端不需改），實際送信在背景 fire-and-forget，**寄信失敗不會擋住註冊/下單**（實測註冊 408ms 完成）；**已接供應商時不再回傳 `devLink`**（避免一次性連結外洩到 API 回應）；HTML＋純文字雙版本、零外部資源（不被擋圖）。驗證工具：`npm run mail:test -- you@example.com`、`GET /api/health` 的 `mail` 欄、管理後台「系統狀態」分頁可寄測試信（`POST /api/admin/mail-test`，admin 限定）。**`APP_URL` 沒設對信中連結會指向 localhost**。設定教學見 `docs/寄信-Email設定.md`。
- 無真分析（GA4）/Search Console/Sentry —— 需外部帳號後接。
- ~~SQLite 在 Cloud Run `/tmp` 會重置~~：**已改 Cloud SQL PostgreSQL**（session 與內容持久化、多實例共享）。本機仍用 SQLite 後備。
- **內容嚴格只吃 DB（無 runtime mock 回退）**：所有顯示的文章／內容畫面都移除了 `mock.js` 執行期 fallback——載入中顯示空狀態／「載入中…」，不再回退示範資料。涵蓋 Feed/Explore（含 chips＋人氣創作者由真實 works 聚合）/PostDetail/**WorkDetail(`/api/works/:id`)**/**CreatorPage(`/api/users/:handle`)**/**Profile(自己真實貼文/作品/統計，訪客歸零)**/TodayShots/NewPost/Notifications/**Subscription(plans)**/**MakeCalendar(works)**/Deities/Zodiac/Leaderboard/Challenges/InfoScreens(諺語/慶典/賞花/食材/節氣專欄)/**Almanac(fortuneTools/cultureTools)**/**Matchmaking(zodiacs)**/**CalendarPreview(poemPool)**。索引型畫面（諺語/節氣專欄/訂閱/詳情頁）都加了空陣列 null guard 防止載入期崩潰。`mock.js` 只留給 `seed.js`／`BRAND` 品牌字串／`aiReply` 模擬 AI／設定型清單（solarTermNames/licenseTiers）／尚未建的子系統畫面（見下）。`toAppUser` 用**真實 handle/bio/avatar**（非 email 前綴）；EditProfile 編輯 name/bio/avatar 會 PATCH 持久化。**注意**：`exploreChips`／`poemPool` 在 `ref_items` 存為 `[{chips:[...]}]`／`[{poems:[...]}]` 單筆包裹，但 `GET /api/content/:kind` 會**攤平**回字串陣列——前端直接當字串陣列用，勿再取 `[0].chips`。
- **仍為模擬（非「上傳資料」，屬另建功能）**：Wallet/CreatorConsole 收益帳（需分潤/結算系統）、DMs/DMThread 私訊（需即時訊息系統）、MyProjects 手帳專案、Records 占卜紀錄、Store 商店品項。這些不是「假的使用者上傳」，而是尚未建的子系統。
- **上線清理 Demo 資料**：管理後台「上線清理」或 `DELETE /api/admin/seed`（admin）→ 刪 `is_seed=1` 作者連帶其貼文/作品/留言（FK CASCADE）＋短 id 示範通知，**真人帳號與上傳、ref_items 不受影響**；要換回示範資料重跑 `npm run seed`。**`SEED_DEMO=0 npm run seed` 只更新參考清單、不灌示範內容**——正式站清完 Demo 後重佈署請在部署環境設 `SEED_DEMO=0`，否則 seed 會把測試資料塞回來。
- **真實圖片上傳（2026-07）**：`images` 表（base64 TEXT，pg/sqlite 通用）＋`POST /api/images`（登入者上傳，前端 canvas 壓縮 ≤1600px JPEG，後端驗 MIME 魔數、3MB 上限、只能掛自己的圖）＋`GET /api/images/:id` 同源供圖（CSP `img-src 'self'` 相容、immutable 快取）。`posts.image_id`/`works.image_id` 經 db.js 輕量 ALTER 遷移（**免砍本機 DB**）。前端 `PhotoImg`（ui.jsx）在 `.ph/.img/.gimg` 佔位框內覆蓋顯示，有圖顯圖、無圖回退 emoji——涵蓋 Feed/Explore/TodayShots/PostDetail/WorkDetail/Profile/CreatorPage/MakeCalendar/Leaderboard。NewPost「上傳照片」＋勾「上架市集」會真的 `POST /api/works`（同一張圖）。**排行榜改 `GET /api/leaderboard` 依真實 like_count 即時計算**（ref_items 的 leaderboard 清單已不被前端使用）。
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
| [docs/寄信-Email設定.md](docs/寄信-Email設定.md) | ★如何讓驗證信/重設密碼信真的寄出：供應商比較、金鑰、網域驗證、Secret Manager、疑難排解 | 部署 |
| [docs/金流-付款串接.md](docs/金流-付款串接.md) | ★如何讓使用者付款：金流商比較、金鑰、Stripe/TapPay/藍新、webhook、PCI | 部署 |
| [docs/社交平台檢驗報告.md](docs/社交平台檢驗報告.md) | ★95 項社交平台 QA 逐項檢驗結果（含 2026-07 已修 23 項與 P0/P1/P2 待辦） | 開發/營運 |
| docs/登入需求-*.md · docs/部署-CloudRun.md · docs/功能完成度.md | 既有（部分早於資料庫化/路由改版，以 CLAUDE.md 與上列新文件為準） | 參考 |
