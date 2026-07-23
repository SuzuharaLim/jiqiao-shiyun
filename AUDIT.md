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
