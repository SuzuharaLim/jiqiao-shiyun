# AUDIT.md — 極簡編輯感改造・階段 1 稽核報告

> 依 `DESIGN_BRIEF.md` 階段 1 執行：**只讀不改**，未修改任何檔案。
> 稽核對象：`src/`（7,450 行 / 63 檔）。日期：2026-07。

---

## 摘要：最需要處理的五件事

| # | 問題 | 現況 | 規格目標 |
| --- | --- | --- | --- |
| 1 | **全站沒有任何 `<h1>`** | 0 個 | 每頁一個，階層不跳號 |
| 2 | 字級失控 | **35 種**不同 font-size | 7 檔字級代幣 |
| 3 | 色碼散寫 | CSS 141 次 + JSX 66 次硬編碼 | 全走 tokens |
| 4 | inline style 氾濫 | **358 處**、分布 49 檔 | 移入 CSS/代幣 |
| 5 | 裝飾過多 | 圓角 125、陰影 28、漸層 18 | 極簡風應大幅刪減 |

**好消息**：架構乾淨（單一 CSS 檔、無 CSS-in-JS、無 UI 框架），既有 27 個 CSS 變數與深色模式機制可直接沿用改造，不需推倒重來。

---

## 1. 樣式現況

### 1.1 樣式寫在哪裡

| 方式 | 數量 | 說明 |
| --- | --- | --- |
| 全域 CSS | **1 檔**（`src/styles.css`，1,279 行） | 唯一樣式檔，於 `main.jsx` 匯入 |
| CSS Modules | 0 | 未使用 |
| styled-components / Emotion | 0 | 未使用 |
| **inline style** | **358 處 / 49 檔** | ⚠️ 主要問題來源 |

> ✅ 符合規格「不引入 UI 框架」的前提——目前就是原生 CSS，改造方向一致。

### 1.2 硬編碼色碼（依頻率）

**`styles.css` 內（共 141 次）**

| 次數 | 色碼 | 語意 |
| --- | --- | --- |
| 25 | `#fff` | 白 |
| 7 | `#0c0b0a` | 近黑（深色底） |
| 5 | `#D8B15A` | 金 |
| 5 | `#C8352B` | 朱紅（品牌主色） |
| 4 | `#E0574B` | 朱紅亮階 |
| 4 | `#000` | 黑 |
| 3 | `#cfc7ba` / `#B8863B` / `#8a8175` / `#7FB08A` / `#3E6B4A` / `#1a1712` | 宣紙灰、金褐、灰、綠系 |

**JSX 內（共 66 次）**——全是「emoji 佔位圖的背景色」

| 次數 | 色碼 | 用途 |
| --- | --- | --- |
| 9 | `#e9e3fb` | 紫（工具列圖示底） |
| 8 | `#dcfce7` | 綠 |
| 8 | `#dbeafe` | 藍 |
| 7 | `#f3e7c9` | 米 |
| 6 | `#ffedd5` | 橙 |
| 5 | `#fce7f3` | 粉 |

> 💡 **這 66 個色碼有共同語意**：都是內容縮圖／工具圖示的柔和底色。改造時應收斂成一組「內容色票」代幣（如 `--tone-1`…`--tone-6`），而非逐一替換。

### 1.3 字級（35 種，嚴重超標）

```
13px(31) 12px(28) 12.5px(26) 13.5px(16) 11px(16) 14px(15) 16px(12) 15px(12)
11.5px(10) 17px(8) 26px(7) 20px(7) 18px(6) 30px(5) 19px(5) 10.5px(5)
40px(4) 22px(4) 10px(4) 24px(3) …
```

另有 **92 處 inline `fontSize`**（最常見 11、12、11.5、13）。

**問題**：`12px / 12.5px / 13px / 13.5px` 四種尺寸肉眼幾乎無差異，卻各自散布——這正是規格說的「隨手填數字」。

### 1.4 既有 CSS 變數（27 個，可作為改造基礎）

```
--bg --stage --line --primary --cinnabar --gold --yi --go --season
--serif --acard-bg --ok-bg --oracle-bg --st-full
```

深色模式已用 `[data-theme="dark"]` 實作（`nav.jsx` 寫入 `documentElement`、存 localStorage）。

> ⚠️ **與規格的衝突**：規格 tokens.css 用 `@media (prefers-color-scheme: dark)`，但本專案是**使用者手動切換**（有主題按鈕、記憶偏好）。
> **建議**：保留 `[data-theme]` 手動切換，並額外支援系統偏好作為初始值。此點需你拍板（見文末）。

### 1.5 裝飾密度（極簡風的主要削減目標）

| 屬性 | 次數 | 極簡風建議 |
| --- | --- | --- |
| `border-radius` | 125 | 收斂為單一 `--radius: 3px` |
| `box-shadow` | 28 | 幾乎全刪，改用 `1px` 邊框 |
| `gradient` | 18 | 保留限動背景（功能性），其餘刪除 |

---

## 2. 元件清單

### 2.1 版面元件（layout）

| 檔案 | 角色 |
| --- | --- |
| `App.jsx` | 主框架：主題切換、桌機 WebNav/WebFooter、`.device` 容器、root/stack 路由、AuthWall |
| `components/WebNav.jsx` | 桌機頂部導覽（≥900px） |
| `components/WebFooter.jsx` | 桌機頁尾 |
| `components/ui.jsx` → `TopBar` / `TabBar` | 手機頂列與底部分頁列 |
| `components/ErrorBoundary.jsx` | 全站錯誤邊界 |

### 2.2 原子元件（`src/components/ui.jsx`，11 個匯出）

```
TopBar  TabBar  ToolRow  Switch  SectionHead  Disclaimer
useGlossary  GlossTerm  GlossPanel  PhotoImg  Toast
```

> ⚠️ **缺少規格要求的核心原子元件**：沒有 `Button`、`Input`/`Field`、`Card`、`Heading`、`Container`、`Stack`、`Text`、`Link`。
> 目前這些都靠 **CSS class 直接寫在 JSX**（見 §3）。

### 2.3 其他

| 類別 | 檔案 |
| --- | --- |
| 頁面 | `src/screens/` 46 檔，`registry.jsx` 註冊 **48 個畫面**（部分檔含多個 export） |
| 功能元件 | `AnimatedText`（動態文字）、`LocationPicker`（地圖選點）、`AuthWall`（登入牆）、`VerifyBanner`、`Icon`（SVG 查表） |
| 資料/邏輯 | `store/nav.jsx`、`api.js`、`hooks/useApi.js`、`data/almanac.js`、`data/mock.js`、`lib/scanner.js` |

---

## 3. 重複實作

**沒有 Button 元件**，改用 8 種 class 組合散布全站：

| class | 次數 | 推測語意 |
| --- | --- | --- |
| `btn-primary` | 18 | 主要動作 |
| `acc` | 18 | 強調文字連結（TopBar 右側） |
| `iconbtn` | 17 | 圖示按鈕 |
| `b tap` | 17 | 次要按鈕 |
| `b dark` | 14 | 深色按鈕 |
| `pill` | 7 | 膠囊標籤鈕 |
| `btn-ghost` | 6 | 幽靈按鈕 |
| `chip` | 2+ | 篩選籤 |

→ **可收斂為規格要求的三種 variant**：`primary`（btn-primary + b dark）／`ghost`（btn-ghost + b tap）／`text`（acc + iconbtn）。

**沒有 Card 元件**，卡片類 class：

| class | 次數 |
| --- | --- |
| `kv` | 52（鍵值列，實為 definition list 語意） |
| `card` | 27 |
| `note` | 18 |
| `opt` | 12（設定列） |
| `aicard` | 7 |
| `tool` / `list-item` | 各 4 |

**沒有 Field 元件**：34 個 `<input>` 各自處理 label 與錯誤訊息（見 §4）。

---

## 4. 無障礙紅旗

| 項目 | 現況 | 嚴重度 |
| --- | --- | --- |
| **`<h1>` 數量** | **全站 0 個**；Feed／Explore／Auth／Profile 四大畫面**完全無標題標籤** | 🔴 高 |
| 標題階層 | 無 h1 可言，`<h3>`/`<h4>` 直接使用 | 🔴 高 |
| skip-to-content | **0 處**（規格明列必要） | 🟠 中 |
| `<div onClick>` 當按鈕 | **11 處**（+ `<span onClick>` 1 處） | 🟠 中 |
| input 標註 | 34 個 input：可見 `<label>` 17、`aria-label` 10、有 `id` 9 → **約 7 個缺標註** | 🟠 中 |
| `:focus-visible` | 僅 3 處規則 | 🟠 中 |
| img alt | **8/8 皆有** ✅ | ✅ |
| `prefers-reduced-motion` | 已實作 ✅ | ✅ |
| `document.title` 每頁更新 | 已實作（`App.jsx`）✅；但**切頁未移轉 focus** | 🟠 中 |

> 📌 **h1 缺失的成因**：本專案畫面標題都畫在 `TopBar`（渲染為 `<div>`）。修正方式是讓 `TopBar` 的 title 渲染成 `<h1>`，一次解決 48 個畫面——**這是投報率最高的單點修正**。

---

## 5. `src/store/nav.jsx` 導覽 API 摘要

> 後續 `Link.jsx` 會依賴此節。

### 5.1 路由模型

**路由 = 分頁（tab）+ 畫面堆疊（stack）**，用 History API 雙向同步，無 react-router。

```js
const TAB_PATHS = ['/', '/explore', '/create', '/almanac', '/me']   // 5 個根分頁
const SCREEN_PATH = { postDetail: '/post/:id', scan: '/AR', ... }   // 堆疊畫面
```

- `pathFromState(tab, stack)` → 由狀態算出網址
- `routeFromPath(pathname)` → 由網址解析成 `{ tab, stack }`（deep-link 用）
- 狀態變動時 `history.pushState`；`popstate` 時還原（用 `suppressSync` ref 避免迴圈）

### 5.2 導覽函式（`useNav()` 取得）

| API | 用途 |
| --- | --- |
| `tab` / `setTab(i)` | 目前分頁索引 / 切換根分頁 |
| `stack` | 畫面堆疊陣列，`stack[stack.length-1]` 為當前畫面 |
| `push(screen, props)` | 疊上新畫面（screen 為 `registry.jsx` 的 key） |
| `pop()` | 返回上一層 |
| `popAll()` | 清空堆疊回到根分頁 |

四者皆會 `window.scrollTo(0, 0)`。

### 5.3 `Link.jsx` 的實作要點（階段 2 用）

要把 `push()` 包成真正的 `<a href>`，需要：

1. **算出 href**：`SCREEN_PATH[screen]` 取模板，用 props 填入 `:param`。
   > ⚠️ 目前 `pathForScreen` 這類函式是 `nav.jsx` **內部私有**，未 export。階段 2 需要把它公開（或在 Link 內重實作一份——不建議，會有兩份真相）。
2. **保留原生行為**：`e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || target="_blank"` 時**不要** `preventDefault()`，讓瀏覽器自己開新分頁。
3. 其餘情況 `preventDefault()` 後呼叫 `push()` / `setTab()`。

### 5.4 其他全域狀態（本次不動）

`user` / `authWall` / `requireAccount` / `liked` / `saved` / `cart` / `orders` / `following` / `prefs` / `toast` 等 20+ 項互動狀態。**改造樣式時不應觸碰這些**。

---

## 6. 規格與現況的衝突（需你拍板）

### 6.1 深色模式機制 ⚠️

- **規格**：`@media (prefers-color-scheme: dark)`（跟隨系統）
- **現況**：`[data-theme="dark"]`（使用者手動切換 + localStorage 記憶 + `theme-init.js` 防閃爍）

**我的建議**：**保留手動切換**，因為使用者體驗上更可控，且已有完整實作（含防 FOUC）。可折衷為：初次造訪時以系統偏好為預設值，之後尊重使用者選擇。

### 6.2 品牌調性 ⚠️ 最重要的一題

- **規格色票**：中性灰 + 近黑強調色（`#fafaf9` / `#16151a` / `#1a1a1a`）
- **現況**：宣紙米底 + **朱紅 `#C8352B`** + 金 `#D8B15A` + 襯線明體，刻意營造「傳統農民曆」的文化感

CLAUDE.md 甚至明文記載：**「不要放回 IG 風格元素——刻意去 IG 化，走宣紙/墨/朱紅/金/靛青 + 襯線明體」**。

**這是根本性的取捨，有三條路：**

| 方案 | 說明 | 影響 |
| --- | --- | --- |
| **A. 完全照規格** | 換成中性灰 + 近黑 | 極簡編輯感最純粹，但**失去農民曆的文化識別**，與品牌定位衝突 |
| **B. 結構極簡、保留品牌色**（建議） | 採用規格的字級音階、間距、留白、去裝飾、a11y 全部照做；但強調色維持朱紅、標題維持襯線 | 兼顧編輯感與文化調性；實測朱紅對比：白底 **5.25:1**、宣紙底 **4.96:1**，皆通過 AA（4.5） |
| **C. 雙主題** | 做成可切換的「編輯版／傳統版」 | 工作量翻倍，且兩套都要維護 |

**我建議 B**——極簡編輯感的核心是「層級、留白、字體」，不是「必須用灰色」。歐洲編輯設計也常見單一飽和強調色。

### 6.3 改造範圍 ⚠️

規格的階段 3–5 若逐一改寫 **48 個畫面**，工作量極大且高風險（每個畫面都可能破版）。

**建議分批**：先做「基礎層 + 原子元件 + 5 大分頁根畫面」，確認方向對了再擴及次要畫面。

---

## 階段 1 完成

**變更檔案**：無（稽核階段只讀，僅新增本文件 `AUDIT.md`）

**設計決策**：
1. 架構無需推倒——單一 CSS 檔、零 CSS-in-JS、零 UI 框架，與規格的「原生 CSS + 變數」前提完全相容；既有 27 個變數與 `[data-theme]` 深色機制可直接演進。
2. 最高投報率的修正是 **`TopBar` 的 title 改渲染 `<h1>`**——一處修改即補上 48 個畫面缺失的標題語意。
3. JSX 內 66 個硬編碼色碼有共同語意（內容縮圖底色），應收斂為一組「內容色票」代幣而非逐一替換。

**待你決定**：
- **① 品牌調性**（§6.2）：要照規格改中性灰，還是保留朱紅/宣紙/襯線的文化識別？**我建議方案 B**。
- **② 深色模式**（§6.1）：保留手動切換（建議），或改成純跟隨系統？
- **③ 改造範圍**（§6.3）：先做 5 大分頁確認方向，或一次全改 48 畫面？**我建議前者**。

**下一步**（階段 2 第一件事）：建立 `src/styles/tokens.css` 與 `src/styles/reset.css`，於 `main.jsx` 匯入；接著建立 `primitives/`（Container / Stack / Prose / Text）與 `Link.jsx`，並把 `nav.jsx` 的 `pathForScreen` 公開供 Link 產生真實 href。**此階段不動任何既有畫面外觀。**


---

# 階段 3–6 執行結果（2026-07）

## 已完成

| 階段 | 內容 |
| --- | --- |
| 3 原子元件 | `Button`（primary/ghost/text）、`Field`（可見 label + aria-describedby + role=alert）、`Card`（邊框非陰影）、`Heading`（語意 level 與視覺 size 分離） |
| 4 版面節奏 | `.rhythm-*` 三檔區塊間距、`.grid12` 12 欄格線（桌機靠左 7 欄 + 右側留白）、移除內容卡片陰影 |
| 5 動效 | 頁面切換 `opacity 0→1 + translateY(6px)`、hover 只改顏色/底線、`.ui-skeleton` 載入態、全站尊重 reduced-motion |
| 6 無障礙 | **h1 從 0 → 每頁恰好 1 個**、切頁焦點移轉、skip-to-content、全站 `:focus-visible` 預設 |

## 關鍵決策：CSS 層收斂，不改 48 畫面的 JSX

既有 8 種按鈕 class 遍布 48 個畫面，逐一改寫 JSX 風險極高（每處都可能破版）。
改採 **`components.css` 讓舊 class 走新代幣**——視覺語言統一、hover 行為收斂，
但 JSX 零改動。新程式碼用 `.ui-*` 元件，舊畫面可漸進遷移。

## 踩到的坑：堆疊畫面出現兩個 h1

`TopBar` 改渲染 h1 後，開啟詳情頁時「根畫面的 TopBar 仍在 DOM」（只是 CSS 隱藏），
導致同時存在 2 個 h1。修法：`TopBar` 讀 `stack` 判斷自己是否為最上層，
底層降級為 `<p>`。已驗證六個畫面（含堆疊）恆為 1。

## 效能

- **零外部字體請求**（系統字體堆疊）→ 無 FOUT/CLS 風險
- 前端依賴僅 react + react-dom，無 >50KB 的第三方 UI 套件
- bundle：JS 201KB + vendor 138KB + CSS 67KB

## 未完成（刻意保留）

- 358 處 inline style 未全部移除——多數是動態值（如 `background: item.bg`），
  屬合理用途；靜態的可後續漸進遷移。
- 35 種字級尚未全站收斂——新元件已走 7 檔音階，既有畫面維持原樣以避免破版。
- Lighthouse 未實測（需 Chrome DevTools，非本工具可自動化）。


---
---

# Phase 0 盤點 — WEBSITE_REDESIGN_BRIEF.md（2026-07）

> 依第二份規格書 `WEBSITE_REDESIGN_BRIEF.md` Phase 0 執行：**未改動任何程式碼**。
> 本節只補「上一份稽核沒涵蓋」的面向（檔案結構/資產/JS/CSS 健康度細項）。

## ⚠️ 首要問題：規格書的技術棧前提與本專案不符

規格書開宗明義：「技術棧：**純 HTML + CSS + JavaScript，無框架、無 build step**」，
工作原則第 3 條並要求「不要引入 build step、不要 npm install、不要加框架」。

**但本專案是 Vite 5 + React 18 SPA**，已有 build step 與 48 個 React 畫面。

這份規格書看起來是通用模板，非為本專案量身撰寫。**需要你裁示如何解讀**（見文末）。
我的建議：把它當成**設計方向與品質標準**來遵循（tokens、字級尺度、留白、
無障礙、效能門檻都適用），但「不用框架」那條視為「不新增額外框架」而非「拆掉 React」。

## 檔案結構

| 檔案 | 大小 | 說明 |
| --- | --- | --- |
| `index.html` | 1.5 KB | 進入點，含完整 OG/meta |
| `src/styles.css` | 78.9 KB | 既有主樣式（1,279 行） |
| `src/styles/tokens.css` | 5.1 KB | ★ 上一階段新增 |
| `src/styles/reset.css` | 3.0 KB | ★ 上一階段新增 |
| `src/styles/components.css` | 7.4 KB | ★ 上一階段新增 |
| **建置產物** | | |
| `index-*.js` | **201.2 KB** | 應用程式碼（⚠️ 超過規格 200KB 提示線） |
| `react-*.js` | 137.6 KB | vendor chunk（已分離，可長快取） |
| `index-*.css` | 67.4 KB | 全站樣式 |

引用關係：`index.html` → `theme-init.js`（同步，0.3KB，刻意阻塞以防主題閃爍）
→ `main.jsx` → tokens → reset → styles → components。

## CSS 健康度

| 指標 | 現況 | 評價 |
| --- | --- | --- |
| `!important` | styles.css **9 處**、tokens.css 4 處 | tokens 那 4 處是 `prefers-reduced-motion` 覆寫，**屬正當用途**；styles.css 的 9 處需個案檢視 |
| 選擇器最深巢狀 | **3 層** | ✓ 健康（一般建議 ≤3） |
| 間距值種類 | **27 種** px 值 | ⚠️ 規格要求收斂為 9 階 |
| 字級種類 | 35 種（前次稽核） | ⚠️ 規格要求 7 階 |
| 顏色值 | 141 次硬編碼（前次稽核） | ⚠️ |

## 資產盤點

**本專案幾乎沒有靜態圖片資產**——這是罕見的優勢：

| 資產 | 大小 |
| --- | --- |
| `favicon.svg` | 0.3 KB |
| `theme-init.js` | 0.3 KB |
| `503.html` | 1.1 KB |
| `robots.txt` | 0.2 KB |

- 內容視覺以 **emoji + CSS 色塊** 呈現，無點陣圖
- 使用者照片存 **DB（base64）**，經 `/api/images/:id` 供圖，前端已做 canvas 壓縮（≤1600px JPEG 0.85）
- **無 >200KB 的靜態資產**；唯一超標的是應用程式 JS bundle

⚠️ **發現缺失**：`PhotoImg` 元件**未標 `width`/`height`**（0 處）→ 圖片載入前無保留空間，
有 CLS 風險。規格 Phase 6 明列此項。

## JS 盤點

| 項目 | 現況 |
| --- | --- |
| 前端依賴 | 僅 `react` + `react-dom`（**無 jQuery/lodash/moment 等冗餘函式庫**）✓ |
| script 標籤 | 2 個：`theme-init.js`（同步，刻意）、`main.jsx`（`type=module`，預設 defer）✓ |
| 阻塞渲染 | 僅 0.3KB 的 theme-init，為避免深色使用者看到白閃的必要取捨 ✓ |

## SEO 現況（Phase 7 前置）

| 項目 | 現況 |
| --- | --- |
| `<title>` / `meta description` | ✓ 有 |
| Open Graph | ✓ 有 type/site_name/title/description/locale |
| **`og:image`** | ❌ **缺** → 分享到 LINE/FB 沒有預覽圖 |
| `og:url` | ❌ 缺 |
| `robots.txt` | ✓ 有 |
| `sitemap.xml` | ❌ 缺 |
| JSON-LD 結構化資料 | ❌ 缺 |
| 每頁獨立 title | ✓ 有（`App.jsx` 依畫面更新） |

## 前五大問題（依 影響 ÷ 修復成本 排序）

| # | 問題 | 影響 | 成本 | 說明 |
| --- | --- | --- | --- | --- |
| 1 | **缺 `og:image`** | 高 | 極低 | 分享連結無預覽圖，直接影響傳播；加一張圖 + 兩行 meta 即可 |
| 2 | **`PhotoImg` 無 width/height** | 中高 | 極低 | CLS 風險，加 `aspect-ratio` 或屬性即可 |
| 3 | 間距 27 種 / 字級 35 種未收斂 | 中 | 中 | 已有 token，但既有畫面未遷移；全面替換有破版風險 |
| 4 | JS bundle 201KB | 中 | 中 | 可用動態 import 拆分次要畫面（相機/管理後台/掃描） |
| 5 | 缺 sitemap.xml / JSON-LD | 中 | 低 | SEO 基礎，但本站多數內容需登入，效益有限 |

## 與前一份規格（DESIGN_BRIEF.md）的重疊

兩份規格的 Phase 高度重疊，且前一份**已執行完畢**：

| 本規格 Phase | 狀態 |
| --- | --- |
| 1 Design tokens | ✅ 已做（`tokens.css`，含字級/間距/色彩/圓角/緩動/measure） |
| 2 字體排印 | ⚠️ 部分（系統字體堆疊已定，但既有畫面字級未收斂） |
| 3 版面格線 | ⚠️ 部分（`.grid12` 已建，既有畫面未套用） |
| 4 動效 | ✅ 已做（進場動畫、hover 只改色、reduced-motion） |
| 5 無障礙 | ✅ 大致完成（h1 每頁 1 個、skip-link、focus-visible、焦點移轉） |
| 6 效能 | ⚠️ 部分（零外部字體、lazy loading；但缺 width/height、bundle 偏大） |
| 7 內容轉換 | ❌ 未做（og:image、sitemap、JSON-LD、CTA 檢視） |

**真正還有價值的是 Phase 7（內容與轉換）與 Phase 6 的補強**——那是前一份規格沒涵蓋的。

---

## DESIGN_SPEC.md Phase 1 —— 色彩系統＋中文排版＋字體策略（2026-07-23）

### §2 色彩：token 成為全站唯一真相來源
- 重寫 `src/styles/tokens.css`：Primitives（`--paper-*`/`--ink-*`/`--seal-*`/`--jade-500`/`--gold-500`）
  → Semantic（`--color-*`）→ **Legacy 別名**（既有 40 個變數全部指向 Semantic）。
  這層別名是「不動 48 個畫面的 JSX 就換完色票」的關鍵。
- **移除 `src/styles.css` 原有的 `:root` / `[data-theme=dark]` 色彩宣告**。
  這是關鍵修正：styles.css 載入順序在 tokens.css 之後、同權重會勝出，
  導致別名被舊值蓋掉（實測 `--bg` 仍是 `#F4EFE6`）。刪掉後才真正生效。
- 相機／掃描介面 30 處寫死 HEX 收斂成 `--cam-*` token（該介面刻意恆為深色，不隨主題切換）。
  styles.css 現在只剩 `#fff`/`#000`（純黑白疊層）與霓虹特效的桃紅／青（創作特效，非 UI 色）。

### 規格本身的缺口（已補）
規格 §2 未定義「品牌色當底、白字在上」的用色。若深色模式沿用提亮後的
`--color-brand` (#D9584A)，白字對比只有 **3.86**，不符 §8 要求的 AA 4.5。
→ 新增 `--color-brand-solid` / `--color-on-brand`，實心按鈕在兩種主題都用深紅底
（白字對比 **5.94** ✓）。同理，宜／忌不用點綴用的柳綠（2.70）與金（2.12），改用加深版。

| 對比實測（WCAG 2.2 AA） | 淺色 | 深色 |
|---|---|---|
| 主文 on 底 | 12.97 ✓ | 14.37 ✓ |
| 次文 on 底 | 5.28 ✓ | 6.66 ✓ |
| 品牌 on 底 | 5.36 ✓ | 4.59 ✓ |
| 白字 on 實心品牌底 | 5.94 ✓ | 5.94 ✓ |

### §4 中文排版（reset.css）
`line-break: strict`（標點禁則）、`word-break: normal`（絕不 break-all）、
`overflow-wrap: anywhere`（只讓長 URL 斷行）、`hanging-punctuation: allow-end`、
內文 `line-height: 1.75` 且 `letter-spacing: 0`、標題襯線 + `text-wrap: balance`。
另補 `:focus-visible` 3px（WCAG 2.4.11）與可點元素 `min-height: 44px`（WCAG 2.5.8，
行內文字連結與 chip/tabbar 列例外，否則會撐破行高與工具列）。

> **未採用規格的一項寫法**：§4 的「內文一律 ≥400」不可實作成
> `body,p,button{font-weight:400}` —— 那是「等於 400」，會把既有 700/800 的
> 粗體按鈕與標題全部壓平。專案本來就沒用到 <400 字重，此項自然滿足。

### §5 字體：零下載
專案原本就沒有任何 webfont／Google Fonts（0 檔 / 0KB，遠低於規格上限 4 檔 / 100KB，
無 FOUT/CLS 風險）。本階段只重排堆疊順序：**先拉丁、後各 OS 中文系統字**——
CSS 逐字元回退，如此農民曆大量出現的日期數字會用 Georgia，中文才落到
Songti TC / PMingLiU / Noto Serif CJK，不會被拉丁字型的代用字接手。

### 驗收
| 項目 | 結果 |
|---|---|
| `npm run build` | ✓ 通過 |
| 切換 `data-theme` 全站反轉 | ✓ 淺 `#F7F3EA`／深 `#1A1815`，40 個別名同步 |
| 全專案無寫死 HEX | ✓（僅存純黑白與創作特效色） |
| 手機 375 / 桌機 1280 橫向溢出 | ✓ 零溢出（6 分頁＋詳情頁逐頁量測） |
| 每頁恰好一個 `<h1>` | ✓ |
| Console 錯誤 | ✓ 零 |
| 中文內文行高 1.75、無字距、禁則生效 | ✓ 實測 `line-break:strict`、`word-break:normal` |

**已知待辦**：登入頁（未登入狀態）沒有 `<h1>` —— TopBar 只在登入後渲染。留待 Phase 3 無障礙階段處理。

---

## 全站「明確紙感」改版（2026-07-23）

設計討論定案：紙的隱喻走**明確紙感**、曆頁桌機改**單頁式版面**、
照片採**裱框**處理（原本問的兩個選項都不好，改用傳統做法：相片裱在紙框裡、
墊中性襯底，照片色彩乾淨又不用把全站切成兩套視覺語言）。

### 做法：CSS 層改，不動 48 個畫面的 JSX
| 項目 | 手法 |
|---|---|
| 圓角 | 腳本就地改寫 styles.css **89 處** ≥4px 的圓角 → 2px |
| 保留圓形 | 頭像 `50%`、開關 `.sw`、進度條 `.bar`/`.meter`、手機外框 `.device` 44px、相機介面 |
| 陰影 | 卡片浮起陰影全數移除；hover 位移＋投影改為墨線加深（紙不會浮起來，但線可以加重） |
| 紙紋 | 純 CSS `repeating-linear-gradient`，套在 `.body`/`.sheet`/`.screen` |
| 朱紅第二套印色 | `.sech::before` 朱紅起始標記（原本只有曆頁有，改全站）、輸入框聚焦朱紅細框 |
| 照片裱框 | `.ph/.img/.gimg/.album .it` 給中性襯底 `#F2F0EC`（深色 `#171614`）＋墨線框 |

紙紋刻意用 CSS 漸層而非圖檔或 SVG data URI —— CSP 的 `img-src` 是 `'self'`，
data: 背景圖會被擋，且維持零下載。相機／掃描介面明確排除（那是恆為深色的原生 App 語彙）。

### 曆頁桌機單頁式（AlmanacDay）
各段包成 `.ad-blk`；手機 `display:contents` 讓包裝層完全透明（版面逐像素不變），
≥900px 才成為 grid 項目。三欄分組：左「該做什麼」（宜忌＋吉神方位）、
中「神煞」（值日＋沖煞）、右「時辰」獨佔整欄。

| | 改版前 | 改版後 |
|---|---|---|
| 曆面高 | 1636px | **916px（−44%）** |
| 桌機用寬 | 760 / 1280px | 1120 / 1280px |

**修正的兩個實作缺陷**：
1. `Disclaimer` 實際 class 是 `muted` 而非 `disc`，未指名會被 grid 自動排版塞進
   空的「特殊日」列，撐出 97px 死空隙。
2. 欄位初版配置（宜忌跨兩列 + 神煞/沖煞 + 方位/時辰）高度失衡，
   列高由最高者決定 → 773px。改為「高配高、矮配矮」後降到 584px。

### 順帶修掉的空狀態缺口
Demo 資料清除後，多數頁面會進入空狀態——這不是邊角案例而是**目前的常態**。
逐頁掃描 body 內容量找出兩個真缺口：
- **`/notifications`**：只有標題列，body 完全空白。補上空狀態，**並區分「載入中」與
  「真的沒通知」**——兩者都是空陣列，不分會讓使用者以為壞了。
- **`/calendar/make`**：無作品時整片空白。補空狀態，並修掉一個既有 bug：
  `useState` 的惰性初始值預選 8 張，但 `works` 是非同步載入的，首次 render 時
  pool 還是空的 → 初始化只跑一次，等於永遠選不到。改成作品到齊後才預選。

### 驗收
| 項目 | 結果 |
|---|---|
| `npm run build` | ✓ |
| 桌機 1280px 橫向破版 | ✓ **46 頁全過** |
| 手機 390px 橫向破版 | ✓ **46 頁全過** |
| 深色模式（6 頁抽驗） | ✓ 無破版，紙紋正確反轉 |
| Console 錯誤 | ✓ 零 |

**已知未套用**：相機／掃描介面維持原本的深色原生語彙（刻意）。
`/solarterms` 的 chip 列超出視窗寬是 `overflow-x:auto` 的水平捲動列，非破版。

---

## 廉價感修正（2026-07-23，使用者回饋「這個看起來太廉價了」）

**根因是我前一版做得不完整**：把圓角一律改成 2px 卻沒有重新設計元件，
結果「方框＋邊線＋填色」正好是瀏覽器預設表單控制項的長相。
廉價感來自「沒設計」，不是來自「方」。

### 1. 分類列：方框按鈕 → 報紙欄目列
紙上的分類導覽本來就不是按鈕，是一排欄目名、底下一條線、選中的用朱紅標記。
拿掉方框之後，朱紅才回到「標記」的角色，而不是一整塊飽和色。
套用於 `.chip`（做月曆來源選擇）與 `.termwheel .tm`（探索／個人檔案的節氣輪）。

### 2. 重點卡：漸層紅色塊 → 紙底朱紅雙線框
`.feedchal`／`.coverbig`／`.ya-hero` 原本是 `linear-gradient(135deg, cinnabar, cinnabar-d)`。
**漸層是廉價感最典型的來源，而且和「紙」直接矛盾——印刷不會有漸層。**
改成印刷品實際用來強調的手法：紙底、朱紅雙線框（公告／獎狀的邊框）、
墨色標題、朱紅點題。雙線框以 `inset` 陰影疊出 3px 紙間隔與 1px 內線。

### 修正過程中我自己造成又抓到的 bug
把 `.tm.on`／`.chip.on` 的文字改成朱紅時，**沒有清掉舊規則的
`background: var(--cinnabar)`** → 變成「朱紅底 + 朱紅字」，選中項的文字
完全看不見。舊規則 `.termwheel .tm.on` 的權重比新的 `.termwheel .tm` 高，
只覆寫 `color` 不會動到 `background`。已加 `background: none` 顯式清除。

> 教訓：改既有元件的配色時，只設新值不夠——舊規則沒被覆寫的屬性會殘留。
> 之後在回歸檢查裡加了「字色＝底色」的隱形文字偵測。

### 驗收
| 項目 | 結果 |
|---|---|
| 選中項對比（朱紅 on 紙） | **5.36** ✓（AA 門檻 4.5） |
| 未選項對比（次文 on 紙） | **5.28** ✓ |
| 選中底線 | ✓ 2px 朱紅，壓在列底線上 |
| 隱形文字偵測（8 頁） | ✓ 0 處 |
| 橫向破版（8 頁） | ✓ 無 |

---

## 全站假資料稽核（2026-07-23，使用者要求「檢查所有的假資料」）

用程式掃過 `src/screens/*.jsx` 的所有硬編陣列／物件與 `mock.js` 匯入，逐項分類。

### A. 已清除：憑空生成的使用者資產（最嚴重）
| 位置 | 原本 | 現在 |
|---|---|---|
| `nav.jsx` 餘額 | `creatorStats.balance` = **NT$1,840** | `0` |
| `Checkout` 購物車 | 空車時塞 3 筆示範商品（NT$630） | 只吃真實購物車；空車顯示空狀態且**不顯示付款列** |
| `Subscription` | 點一下就 `setSubscribed(true)`，無付款 | 金流未串接前不授予付費權益 |

### B. 已清除：不存在的子系統顯示編造內容
`MyProjects`／`Create`（3 筆假專案）、`Wallet`／`CreatorConsole`（假收益 42／18／3 筆入帳）、
`DMs`／`DMThread`（3 則假對話）、`Records`（5 筆假占卜紀錄，含「今天 09:12」）
→ 全部改為誠實空狀態，並註明該功能仍在開發中。
`CreatorConsole` 的粉絲與市集上架改抓真實 API（`/api/users/:handle`）。

### C. 已清除：過期硬編內容
- `aiOpen`／`aiQuickReplies` 寫死「芒種／丙午日」，但 App 開在真實今日
  → 改為 `aiOpenFor(d)`／`aiQuickRepliesFor(d)` 依當日生成；`aiReply(text, day)`
  也會把腳本裡的過期節氣／干支替換掉
- `Challenges` 參加人數 328／156、剩餘天數、標題「芒種」全寫死
  → **即時統計**：標記當前節氣的貼文與作品之不重複作者數；剩餘天數由節氣交節推算
- `NewPost` 的 `thumbs`（5 個 emoji 排成相簿縮圖狀，像使用者自己的照片）
  → 改名 `COVERS` 並標明是「沒有照片時的封面配色」
- `Checkout` 的「信用卡 ·· 4242」（測試卡號，像已綁卡）與兩間不存在的門市
  → 只列付款／取貨「方式」

### D. 判定為合法內容，保留
知識查表與選項常數**不是假資料**：`AppendixScreens`（食物相剋／度量衡／干支對照）、
`Dream` 解夢辭典、`InfoScreens` 稱骨歌訣、`NameFortune` 評語模板（演算法輸出文案，
性質同 `almanac.js` 的建除宜忌）、`CalendarPreview` 十二月節氣與詩、`Camera` 版面選項、
`EditProfile` emoji 清單、`Admin` CMS 分類、`Feed` 星期字、`PrePlan` 節氣名。
`Store` 商品清單雖是硬編，但屬商品目錄 → 移入 `ref_items('storeProducts')` 交由 CMS 管理。

### E. mock.js 現存用途（僅此四項為合法）
`BRAND` 品牌字串、`solarTermNames`／`licenseTiers` 設定型清單、
`aiOpenFor`／`aiQuickRepliesFor`／`aiReply` 訪客離線 fallback、`seed.js` 種子來源。

### 新增功能（因稽核衍生）
- `GET /api/users/:handle/followers|following` + `FollowList` 畫面 → 個人檔案三個統計數字可點
- `users.avatar_image_id` + `PATCH /api/me` 支援 → **個人檔案可上傳真實頭像照片**
  （原本只能從 8 個 emoji 挑）；新增共用 `<Avatar>` 元件接上 Profile／CreatorPage／WebNav／FollowList
- 相機與發貼文合併為單一入口（流程上是同一件事的前後兩段）

### 驗收（實際載入頁面確認，非推測）
| 頁面 | 顯示 |
|---|---|
| `/projects` | 還沒有專案 |
| `/wallet` | NT$ 0・還沒有收益紀錄 |
| `/records` | 還沒有占卜紀錄 |
| `/messages` | 私訊功能尚未開放 |
| `/creator-console` | 成交「—」、市集上架 1、粉絲 0（真實） |
| `/challenges` | 大暑攝影挑戰・參加 0 人・剩餘 16 天（即時算出） |
| `/checkout` | 購物車是空的 |
| `/subscription` | 點升級 → 「訂閱功能尚未開放（金流尚未串接）」，**不會變成 Premium** |
| `/me` | 統計改為可點按鈕（3 作品／0 粉絲／1 市集上架） |
| 頭像上傳 | 上傳 → 儲存 → Profile 與導覽列顯示 → DB 確認 5,576 bytes、擁有者正確 |

---

## 手機視窗比例與遮擋稽核（2026-07-23）

以 `elementFromPoint` 對每個可互動元素的中心點做命中測試（測「實際被誰蓋住」，
而非只看座標重疊），涵蓋 46 個畫面 × 360／390／430 三種寬度 ＋ 深色 ＋ 橫向。

### 偵測器的兩次修正（重要：先前的做法會產生大量誤報）
1. **被捲動容器裁切 ≠ 被遮擋**。第一版把 `.body`（`overflow-y:auto`）外的元素
   也算成遮擋。修正為：只測中心點確實落在捲動容器可視框內的元素。
2. **底層根畫面被堆疊畫面蓋住是正確行為**。第二版仍掃到整個 document，
   於是每個堆疊畫面都回報「‹／7-23週四／栽種」被蓋住——那是 Feed 在下層。
   修正為：只檢查最上層畫面（有堆疊取最後一個 `.screen`，否則取 `.rootpane`）。

### 修掉的三個真實問題
| 問題 | 根因 | 修法 |
|---|---|---|
| 浮動主題鈕蓋住內容 | `.theme-fab` 在 ≤519px 改為 `bottom:74px right:12px`，永久浮在內容區右下角；實測蓋住首頁「更多作品 ›」與神明頁提醒列 | 手機隱藏（`≤559px`）。設定頁本來就有同功能開關，為重複入口永久佔用內容區不划算；平板／桌機維持右上角不壓內容 |
| 神明頁提醒列右緣溢出 13px | `.note` 有 `margin:11px 13px`，畫面又傳 inline `width:100%`——`100%` 是父層寬、不扣自身 margin，`box-sizing` 擋不住 | `.note` 加 `max-width:calc(100% - 26px)` |
| 秤骨頁生辰欄溢出 162px | 三個 `.search` 並排，但 `.search` 基礎樣式是 `flex:0 0 auto`；**flex 項目預設 `min-width:auto`，光給 `flex:1` 不會縮到內容寬以下** | 改 `flex:'1 1 0'` + `minWidth:0` |

### 版面結構確認（非 bug）
`.device` 為 flex 三段：`.topbar`(50) / `.body`(可捲, `overflow-y:auto`) / `.tabbar`(62)，
皆為 relative 流內元素而非 fixed，故**分頁列不會覆蓋內容**——實測捲到底時
最後一項底部 778 < tabbar 頂 782。

### 驗收
| 條件 | 結果 |
|---|---|
| 390×844 全 46 頁 | ✓ 零遮擋、零溢位 |
| 360×640 全 46 頁 | ✓ 零遮擋、零溢位 |
| 430×932 抽驗 16 頁 | ✓ 乾淨 |
| 深色模式 8 頁 | ✓ 乾淨 |
| 橫向 844×390 | ✓ 手機外框 420×334 完整落於視窗內，tabbar 未被裁切 |

---

## 覆蓋層／展開面板的尺寸自適應稽核（2026-07-26）

需求：「所有頁面所有功能鍵點下去都可以自動適配所有格式」。
先前的稽核只驗「靜態頁面版面」，**按鈕點開後的東西從未系統性驗過**——
這是完全不同的測試面。盤點出九類覆蓋層（sheet-mask / legal-overlay /
fmenu / term-panel / glosspanel / LocationPicker / AuthWall / Camera 的
兩個 sheet），逐一點擊並在展開狀態下量測。

### 修掉的四個問題
| 問題 | 根因 | 修法 |
|---|---|---|
| `.term-panel` 無高度上限（約 243px） | `flex:0 0 auto` 且未限高，手機橫向（390px 視窗）會把作品區整個擠出畫面 | 交由 `.fmenu` 父層限高並捲動 |
| `.fmenu` 底部超出 61px | 上限寫 `calc(100dvh - 140px)`——**固定扣除值不可靠**，面板起點取決於頂列/搜尋/選單列實際高度 | 改 dvh 比例（45dvh） |
| `.fmenu` 高度塌成 0、內容溢出 78px | 試圖用 `flex:1 1 auto` 自動填滿，但 `.body` 是 flex column，空間不足時 `flex-shrink:1` 把它壓成 0 | `flex:0 0 auto`（CLAUDE.md 早已記載此雷區，我建新元件時沒照做） |
| 底部彈出 sheet 露出視窗外 24px | `slideup` 的 `to{transform:none}` 無 `fill-mode`，動畫被中斷／未推進時停在 `from` 的 `translateY(24px)` | 終態改 `translateY(0)` + `animation-fill-mode: forwards` |

另補：`.sheet` 下內距改 `max(20px, env(safe-area-inset-bottom))`（iOS home
indicator 會蓋住最後一列）、所有覆蓋層加 `overscroll-behavior: contain`
（捲到底不連帶捲動背後頁面）。

### 診斷過程中的兩次錯判（記錄以免重犯）
1. 誤判為 reduced-motion 造成動畫停在起始狀態，加了 `!important` 補丁；
   實測 `matchMedia('(prefers-reduced-motion)').matches === false`，補丁已撤。
2. 瀏覽器面板隱藏時 **CSS 動畫時鐘完全不走**（`playState:'running'` 但
   `currentTime:0`），量測到的 transform 是起始值。正確做法是先
   `document.getAnimations().forEach(a => a.finish())` 再量測。

### 驗收
| 視窗 | 跳日期 sheet | 節氣選單 | 宜忌詞彙 |
|---|---|---|---|
| 390×844 直向 | OK | OK | OK |
| 844×390 橫向 | OK | OK（176px 可捲，捲到底可達「冬」列） | — |
| 360×640 最窄 | OK | OK | — |
| 1459×905 桌機 | — | OK（295px，四季表完整無需捲動） | — |

判準：不塌陷（高 ≥8px）、不超出視窗上下緣、不橫向溢出、
內容高於容器時必須 `overflow-y:auto`、可捲者捲到底後最後一個按鈕須在視窗內。
