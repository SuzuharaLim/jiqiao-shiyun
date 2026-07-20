# 部署到 Google Cloud Run

本專案是 **全端**應用：**Node/Express 認證後端**（bcrypt + SQLite + HttpOnly Session Cookie）＋ **Vite/React 前端**，由同一個 Node 程序同時提供 `/api/*` 與打包好的靜態前端（SPA fallback）。已附 multi-stage `Dockerfile`（node build → node runtime，非 root 執行）、`.dockerignore`、`.gcloudignore`、`.env.example`。
（舊的 `nginx/` 靜態設定已不使用，可刪。）

## 前置
```bash
gcloud auth login
gcloud config set project <你的-PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## 方式 A（最簡單）：從原始碼直接部署
Cloud Build 會讀 `Dockerfile` 幫你建置映像並部署。
```bash
gcloud run deploy jiqiao-shiyun \
  --source . \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 3 \
  --set-env-vars NODE_ENV=production,DATA_DIR=/tmp/authdata,APP_URL=https://jiqiao-shiyun-xxxx.run.app
```
- `NODE_ENV=production`：啟用 Secure Cookie（Cloud Run 有 HTTPS）＋隱藏錯誤堆疊。
- `APP_URL`：第一次部署拿到網址後，**再重跑一次**把它填正確（Email 驗證/重設連結會用到）。
- `--min-instances 0`：閒置不計費（冷啟動約 1–2 秒）。
- ⚠️ **資料持久化**：SQLite 存在容器 `/tmp`，**重佈署或多實例會重置**（帳號會不見）。正式請改用 **Cloud SQL for Postgres**（把 `server/db.js` 換成 pg），並用 **Secret Manager** 放連線字串／金鑰。
- ⚠️ **多實例 Session**：Session 存 SQLite，`--max-instances` >1 時各實例不共享 → 正式改用 Cloud SQL 或 Redis 作共享 store。

## 方式 B：先建置推到 Artifact Registry 再部署
```bash
gcloud artifacts repositories create web --repository-format=docker --location=asia-east1
gcloud builds submit --tag asia-east1-docker.pkg.dev/<PROJECT_ID>/web/jiqiao-shiyun
gcloud run deploy jiqiao-shiyun \
  --image asia-east1-docker.pkg.dev/<PROJECT_ID>/web/jiqiao-shiyun \
  --region asia-east1 --allow-unauthenticated --port 8080
```

## 本機開發（前後端分離，含熱重載）
```bash
npm install
npm run dev:server     # 認證後端 http://localhost:8080（SQLite 存 server/data）
npm run dev            # 前端 http://localhost:5173（vite.config.js 已把 /api 代理到 8080）
# 開 http://localhost:5173
```

## 本機測試「正式容器」（需 Docker Desktop）
```bash
npm run build
docker build -t jiqiao-shiyun .
docker run --rm -p 8080:8080 -e DATA_DIR=/tmp/authdata jiqiao-shiyun
# 開 http://localhost:8080（注意：非 production 模式下 Secure Cookie 才會在 http 生效）
```

## 綁自訂網域
```bash
gcloud run domain-mappings create --service jiqiao-shiyun --domain www.你的網域 --region asia-east1
```

## 注意事項
- Cloud Run 注入的 `PORT`（預設 8080）由 `server/index.js` 讀取。
- 安全標頭（HSTS/CSP/X-Frame-Options…）由後端 `helmet` 設定；HTTPS 由 Cloud Run 提供。
- `netlify.toml`、`public/_redirects`、`nginx/` 在此全端架構下皆無作用，可刪。
- 正式上線前的後端待辦見 `docs/登入需求-落實對照.md`（真實寄信、OAuth 金鑰、Cloud SQL、Redis、MFA/Passkey）。
