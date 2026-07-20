# 樣式與 RWD

> 全站樣式在單一 `src/styles.css`（token 驅動）。改 token 即全站換裝。
> 完整變數定義見 `styles.css` 的 `:root` 與 `[data-theme="dark"]`（各 ~44 個變數）。

## 設計方向

刻意**去 IG 化**，走「農民曆／手帳」隱喻：宣紙暖白底 + 墨字 + 朱紅印章主操作 + 金 Premium + 通勝宜綠/忌朱 + 靛青占卜 + 襯線明體標題。
**不要放回**：IG 彩虹 story 環、IG 藍、IG Shop 黑底 $ 徽章、純圖示底部列。

## 色彩 token（淺色，深色以 `[data-theme="dark"]` 對應覆蓋）

| 變數 | 值 | 用途 |
| --- | --- | --- |
| `--bg` | `#F4EFE6` | 宣紙頁面底 |
| `--text` | `#2A2622` | 墨字 |
| `--card` | ≈`#FBF7EF` | 卡片/導覽列/頁尾底（比 bg 略亮） |
| `--stage` | `#E7DFCF` | 平板外框背景 |
| `--field` | `#ECE3D2` | 輸入框/按下底 |
| `--line` / `--line2` | `#E5DBC9` / `#D6C9B2` | 細線 / 較深線 |
| `--primary`/`--cinnabar`/`--accent` | `#C8352B` | 朱紅：主操作、印章 |
| `--cinnabar-d` | `#A82A22` | 朱紅深（漸層） |
| `--pfg` | `#FCF8F0` | 朱紅上的前景（近白） |
| `--gold` / `--gold-hi` / `--bronze` | `#B8863B` / `#D8B15A` / `#8C6239` | 金：Premium、星等 |
| `--yi` / `--ji` | `#3E6B4A` / `#A83232` | 通勝宜綠 / 忌朱 |
| `--oracle-bg` / `--oracle-fg` | `#1C2E4A` / 金月 | 占卜夜觀靛青 |
| `--muted` | 灰 | 次要文字 |

字型：`--serif:"Noto Serif TC","Songti TC",serif`（標題明體）；sans 走系統（PingFang TC / Microsoft JhengHei / Noto Sans TC）——**皆系統字型，無外部字型下載**。

主題：`nav.jsx` 讀寫 `localStorage('jq-theme')`，切 `data-theme` 屬性 + 更新 `meta[theme-color]`。掛載前由 `public/theme-init.js` 先套，避免 FOUC。

## 三斷點

| 斷點 | 版面 | 關鍵 |
| --- | --- | --- |
| **≤559px 手機** | App 滿版無框 + 底部 `.tabbar` + 內部捲動 | `.device` max-width 430、`.body{flex:1;overflow-y:auto}`、`.stage` 100dvh |
| **560–899px 平板** | 手機外框置中 + 品牌漸層背景 | `.device` 圓角 44 + 陰影；`.webnav`/`.webfoot` none |
| **≥900px 桌機（已登入）** | **網站式**：頂部 `WebNav` + 整頁捲動 + `WebFooter` | 見下 |

`≤360px`：縮小干支/日期（block 放在 `styles.css` 檔末）。

## 桌機模型（≥900px 且 `.stage.signed-in`）

**整頁捲動的網站**（非 App 內捲），且**扁平單一頁面**（無外框卡片＝避免「頁面裡有頁面」）：

- `.stage.signed-in`：`min-height:100dvh; height:auto; overflow:visible; background:var(--bg)`（整頁捲動、單一連續底）。
- `.webnav`：`position:sticky; top:0`（捲動時常駐）。
- `.device`：`width:min(100%,1000px)` 置中、`overflow:clip`（**不是 hidden**，見雷區）、`background:transparent`、無框無陰影、`flex:0 0 auto` 隨內容長高。
- `.stage.signed-in .body`：`overflow:visible; height:auto`（內容流入整頁）。
- **根畫面頂列隱藏** `.rootpane .topbar{display:none}`（通知/私訊/設定已移進 `WebNav`）；內容貼齊導覽列。
- **堆疊詳情**：`.rootpane` 包根畫面（`display:contents`），有堆疊時 device 加 `has-stack` → `.device.has-stack .rootpane{display:none}`；`.screen{position:static}`（整頁流動）；`.screen .topbar{position:sticky; top:62px}`（返回列黏在 navbar 下）。
- **導航捲頂**：`nav.jsx` 的 push/pop/popAll/setTab 都 `window.scrollTo(0,0)`。

### 桌機各分頁多欄版面（`@media(min-width:900px)` 內容設計層）

- `App.jsx` 給 `.rootpane` 加 `tab-${tab}`，且 tab 2/3/4 加 `grid2`。
- **grid2 工具列雙欄卡片**（占卜/建立/我的）：`.rootpane.grid2 .body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}`；`> :not(.tool){grid-column:1/-1}`（非工具列跨欄）；`.tool` 加框/圓角/hover 變卡片。
- **曆頁雙欄**（tab-0）：`.tab-0 .body{display:grid;grid-template-columns:minmax(0,1fr) 320px}`；`.feed-side .rail{flex-direction:column}`（社群直排側欄）。
- **相簿多欄**：`.album{grid-template-columns:repeat(auto-fill,minmax(195px,1fr))}` + hover translateY（探索/我的作品冊 4 欄）。
- **作品詳情雙欄商品頁**：`.wd-body` 限寬 920 + 2 欄；`.wd-media` sticky、`.img` aspect-ratio 1/1。
- **詳情/表單**：`.screen .body` 限寬 720 置中（不被拉寬變醜）。
- 英雄卡 `.coverbig`、搜尋 `.search`、區段標題 `.sech`/`.railhd` 桌機皆放大。

## Class 詞彙表（重點）

**版面骨架**：`.stage`(.signed-in) · `.device` · `.rootpane`(.grid2/.tab-N/.has-stack) · `.body` · `.screen` · `.topbar`(.brand/.ttl) · `.tabbar`/`.tabbtn` · `.webnav`+`.wn-*` · `.webfoot`+`.wf-*` · `.theme-fab` · `.auth-splash`

**曆頁**：`.daystrip`(.side/.mid) · `.daytools` · `.calpage`(.hd/.gz/.meta/.yjcols/.calnote) · `.calacts` · `.cal-picker`(.calcap/.calwk/.calgrid/.calcell) · `.feed-main`/`.feed-side`

**內容區塊**：`.coverbig`(.bt/.bd/.cta；`.oracle` 靛青變體) · `.tool`(.ti/.tn2，即 `ToolRow`) · `.sech`（`SectionHead`） · `.search` · `.termwheel`/`.tm` · `.yiji`(.gz/.yj/.yl/.ty/.tn) · `.railhd`/`.rail`/`.railcard` · `.album`(.it/.ph/.cap/.gbadge) · `.tiepost`(.band/.row1/.seal/.nm/.bio/.nums) · `.pf-btns`/`.pf-tabs` · `.card` · `.kv`(標籤值列) · `.note` · `.empty` · `.chips`/`.chip`

**詳情/金流**：`.post-hd`(.av/.uname) · `.img` · `.cap2` · `.wd-body`/`.wd-media`/`.wd-info`/`.wd-acts` · `.sumcard`/`.sumrow` · `.paybar` · `.ordercard`(.orderhd/.ordid/.ordtag/.ordlines/.ordfoot)

**按鈕/元件**：`.b`(.dark) · `.pill`(.dark/.sm) · `.btn-primary` · `.btn-ghost` · `.acc` · `.more` · `.iconbtn` · `.tap`(按下縮放) · `.sw`（`Switch`） · `.ic`（`Icon` SVG） · `.badge-dot`

**覆蓋層**：`.toast` · `.sheet-mask`/`.sheet`/`.sheet-grip`（底部彈出，`AuthWall` 用） · `.auth-*`/`.auth-seal`/`.auth-btn`

## 雷區（改樣式前必讀）

1. **`.body` 是 flex column**：內含 `overflow:hidden` 的子區塊要加 `flex:0 0 auto`，否則被壓成 0 高。
2. **`.calgrid`/`.calwk` 用 `repeat(7,minmax(0,1fr))`**：用 `1fr` 會因 cell `aspect-ratio:1/1` 撐成 ~100px 溢出。
3. **桌機 `.device` 用 `overflow:clip` 不能 `hidden`**：`hidden` 建立捲動容器，害 `.screen .topbar` 的 `sticky top:62px` 相對 device 偏移出空白帶；`clip` 一樣裁切但不建立捲動容器。
4. **`.webnav,.webfoot` 基礎 `display:none` 要放在 `@media(min-width:900px)` 之前**：同 specificity 後者勝，放後面會永遠隱藏。
5. **grid2 非 `.tool` 子元素要 `grid-column:1/-1`**：否則被塞進雙欄格。
6. **`.coverbig` 有 inline `width:calc(100%-26px)`**：桌機覆寫要 `width:auto !important`。
7. **切換日期不跳版**：曆頁用固定高度插槽（`.daytools` 30px、`.calpage` min-height、`.yjcols .it`/`.calnote` 單行 ellipsis）。
8. **輸入框字級 ≥16px**（防 iOS 放大）；照片格用 `minmax(0,1fr)` 防 aspect-ratio 撐爆。
