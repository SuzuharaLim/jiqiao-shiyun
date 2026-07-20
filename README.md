# 機巧時運 · 智慧互動農民曆

> 虛實整合的「會說話文化手帳」——**智慧互動農民曆 × 節氣攝影社群 × AI 時光顧問**。
> 全端可互動產品（真實帳號認證、真實資料庫），已上線於 **https://chengqi.tw**（Google Cloud Run + Cloud SQL）。

**開發者／AI 代理請先讀 [CLAUDE.md](CLAUDE.md)** —— 架構、指令、慣例、雷區的單一入口。
**想快速看懂這是什麼 → [docs/產品介紹.md](docs/產品介紹.md)**（另有網頁版）。

---

## 技術

- **前端**：Vite 5 + React 18 SPA（`src/`）。無 react-router、無狀態庫；**每個畫面有自己的網址**（History API 同步，見 `src/store/nav.jsx`），全域狀態亦集中於此。
- **後端**：Node/Express（`server/`）——真實認證（註冊/登入/session/CSRF/RBAC/GDPR）。
- **資料庫**：正式＝**Cloud SQL PostgreSQL**（`pg`）；本機無雲端時自動退回 SQLite。同一套 async 介面＋同份 `server/schema.sql`（見 `server/db.js`）。
- **資料**：社群內容（貼文/作品/留言/讚/追蹤/通知/訂單）**真實存資料庫**、可持久化；`mock.js` 降為種子來源。曆算為確定性演算。仍模擬：金流、AI（未接金鑰時）、社群登入。
- 淺／深色主題、手機／平板／桌機 RWD（桌機為網站式版面）。

## 功能總覽

| 分頁 | 內容 |
| --- | --- |
| 🏠 **今日曆頁** | 翻日農民曆、干支宜忌、**完整曆頁**（建除/星宿/彭祖/胎神/沖煞/十二時辰）、年度總覽、今日社群卷軸 |
| 🔍 **探索** | 搜尋、節氣篩選、作品市集、購買授權、創作者頁、挑戰排行 |
| ➕ **建立** | **相機工作室**（拍攝/版面/限動/濾鏡+強度/搖晃顯影/動態文字，純瀏覽器 API）、發貼文（含地點搜尋/地圖/常用位置）、做月曆 |
| 🔮 **占卜** | AI 時光顧問、完整農民曆/年度總覽、命名/婚配/神佛/生肖/秤骨/解夢、24 節氣、附錄查詢表 |
| 👤 **我的** | 個人檔案、訂單、創作者後台、訂閱、錢包、商店、設定、**管理後台**（RBAC） |

## 本機開發

需求：Node 20。首次先 `npm install`。

```bash
npm run dev         # 前端（Vite）http://localhost:5173
npm run dev:server  # 後端（Express）http://localhost:8080  ← 要測登入需一起跑
npm run seed        # 灌種子資料進本機 DB（SQLite）
npm run build       # 打包前端 → dist/
npm run start       # 正式：node 同時 serve dist/ + /api（8080）
```

開發時 `/api` 由 Vite proxy 到 8080（同源 Cookie 正常）。首次跑 `npm run seed`。
測試帳號：一般 `newuser@example.com` / `secret12345`；管理者 `admin@jiqiao.local` / `admin12345`。

## 部署

全端 `Dockerfile` → **Google Cloud Run**，資料存 **Cloud SQL PostgreSQL**，全程可在 Cloud Shell 完成（免本機安裝、免 GitHub）。
一鍵腳本 `deploy/deploy.sh`；逐步 runbook 見 [docs/部署-CloudRun-PostgreSQL.md](docs/部署-CloudRun-PostgreSQL.md)；日常維運/更新看 [docs/操作手冊.md](docs/操作手冊.md)。

## 專案結構（重點）

```
├─ index.html · vite.config.js（base '/'）· Dockerfile
├─ public/            favicon.svg · theme-init.js
├─ src/
│  ├─ main.jsx · App.jsx · styles.css · api.js
│  ├─ store/nav.jsx   全域狀態 + 每頁網址路由
│  ├─ hooks/useApi.js 內容 fetch hooks（DB 為源）
│  ├─ data/           mock.js（種子）· almanac.js（農民曆引擎）
│  ├─ lib/scanner.js  自研影像辨識
│  ├─ components/      ui · Icon · WebNav · WebFooter · AuthWall · ErrorBoundary · LocationPicker · VerifyBanner · AnimatedText
│  └─ screens/         registry.jsx（ROOTS+SCREENS）+ 40+ 畫面（含 Camera · Admin · AlmanacDay · YearAlmanac …）
├─ server/            index.js（42 支 /api）· db.js（pg/sqlite）· schema.sql · seed.js · mailer.js
├─ deploy/deploy.sh   Cloud Run + Cloud SQL 一鍵部署
└─ docs/              詳細文件（見下）
```

## 文件

- **總入口**：[CLAUDE.md](CLAUDE.md)
- **對外**：[產品介紹](docs/產品介紹.md)
- **使用者**：[App 使用說明](docs/使用手冊.md)
- **開發**：[架構](docs/架構.md) · [畫面地圖](docs/畫面地圖.md) · [狀態與資料](docs/狀態與資料.md) · [樣式與RWD](docs/樣式與RWD.md) · [後端-認證](docs/後端-認證.md) · [API 端點總表](docs/API-總表.md)
- **部署/營運**：[部署-CloudRun-PostgreSQL](docs/部署-CloudRun-PostgreSQL.md) · [操作手冊](docs/操作手冊.md) · [金流-付款串接](docs/金流-付款串接.md)
- 其他：docs/功能完成度.md · docs/登入需求-*.md

## 授權

Demo 內文案、財務數字與品牌設定取自《機巧時運 創業營運計畫書 v1》。內部提案／教學用途。
