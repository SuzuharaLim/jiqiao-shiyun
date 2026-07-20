# 機巧時運 · 智慧互動農民曆

> 虛實整合的「會說話文化手帳」——結合節氣攝影社群、月曆創作市集、農民曆與 AI 時光顧問。
> 依《機巧時運 創業營運計畫書》製作的**可互動全端原型**（含真實帳號認證），用於募資／提案／使用者測試。

**開發者／AI 代理請先讀 [CLAUDE.md](CLAUDE.md)** —— 架構、指令、慣例、雷區的單一入口，通常不必逐檔掃描。

---

## 技術

- **前端**：Vite 5 + React 18 SPA（`src/`）。無 react-router、無狀態庫，路由與全域狀態集中在 `src/store/nav.jsx`。
- **後端**：Node/Express + SQLite + bcrypt（`server/`）——**真實認證**（註冊/登入/session/CSRF/GDPR）。
- **資料**：畫面內容為示範資料（`src/data/mock.js`）；金流、AI 對話、社群登入仍為模擬。
- 淺／深色主題、手機／平板／桌機 RWD（桌機為網站式版面）。

## 功能總覽

| 分頁 | 內容 |
| --- | --- |
| 🏠 **今日曆頁** | 翻日農民曆、干支宜忌、今日社群卷軸、通知、私訊 |
| 🔍 **探索** | 搜尋、節氣篩選、作品市集、作品詳情、購買授權、創作者頁、挑戰 |
| ➕ **建立** | 拍照上傳（可上架市集）、做月曆工作室、我的專案 |
| 🔮 **占卜** | 當日宜忌、AI 時光顧問、命名/婚配/神佛/生肖/秤骨/解夢、24 節氣專欄 |
| 👤 **我的** | 個人檔案、訂單、占卜紀錄、創作者後台、訂閱、錢包、商店、設定 |

## 本機開發

需求：Node 18+（建議 20）。首次先 `npm install`。

```bash
npm run dev         # 前端（Vite）http://localhost:5173
npm run dev:server  # 後端（Express）http://localhost:8080  ← 要測登入需一起跑
npm run build       # 打包前端 → dist/
npm run preview     # 預覽打包結果（4173）
npm run start       # 正式：node 同時 serve dist/ + /api（8080）
```

開發時 `/api` 由 Vite proxy 到 8080（同源 Cookie 正常）。測試帳號：`newuser@example.com` / `secret12345`。

## 部署

全端 `Dockerfile`（node build → node runtime，serve `dist/` + `/api`），目標 Cloud Run。細節見 `docs/部署-CloudRun.md`。
（`netlify.toml`/`public/_redirects` 為早期純前端設定，在 Cloud Run 全端下無效。）

## 專案結構（重點）

```
├─ index.html · vite.config.js · Dockerfile
├─ public/            favicon.svg · theme-init.js
├─ src/
│  ├─ main.jsx · App.jsx · styles.css · api.js
│  ├─ store/nav.jsx   全域狀態 + 路由
│  ├─ data/           mock.js（示範資料）· almanac.js（農民曆引擎）
│  ├─ components/      ui.jsx · Icon · WebNav · WebFooter · AuthWall · ErrorBoundary
│  └─ screens/         registry.jsx（ROOTS+SCREENS）+ 34 畫面
├─ server/            index.js（API）· db.js · mailer.js
└─ docs/              詳細文件（見下）
```

## 文件

- [CLAUDE.md](CLAUDE.md) — 專案導覽總入口
- [docs/架構.md](docs/架構.md) · [docs/畫面地圖.md](docs/畫面地圖.md) · [docs/樣式與RWD.md](docs/樣式與RWD.md) · [docs/狀態與資料.md](docs/狀態與資料.md) · [docs/後端-認證.md](docs/後端-認證.md)
- docs/登入需求-*.md · docs/部署-CloudRun.md · docs/功能完成度.md

## 授權

Demo 內文案、財務數字與品牌設定取自《機巧時運 創業營運計畫書 v1》。內部提案／教學用途。
