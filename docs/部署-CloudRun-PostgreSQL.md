# 部署到 Google Cloud Run + Cloud SQL（PostgreSQL）

> 目標：把「機巧時運」全端（Node 同時服務 `/api` 與打包好的前端）部署到 **Cloud Run**，
> 資料存在 **Cloud SQL for PostgreSQL**。**全程在 Cloud Shell 完成**——本機不需安裝任何東西、
> 也不需要 GitHub（用 zip 上傳原始碼）。

本專案已為此鋪好：
- `server/db.js`：偵測到 `INSTANCE_CONNECTION_NAME` → 走 **PostgreSQL（Cloud SQL unix socket）**；本機無雲端時自動退回 SQLite。
- `server/schema.sql`：開機自動建表（可移植 DDL，pg／sqlite 皆可）。
- `server/seed.js`：`npm run seed` 把 `mock.js` 內容灌入資料庫（真實內容，非硬編）。
- `Dockerfile`：`--omit=optional` 略過原生 better-sqlite3，正式只用純 JS 的 `pg`。

---

## 0. 名詞與一次性設定

在 Cloud Shell（https://shell.cloud.google.com）開一個終端機，設定變數（**改成你自己的值**）：

```bash
export PROJECT_ID="你的-gcp-專案id"
export REGION="asia-east1"                 # 台灣就近：asia-east1（彰化）
export SQL_INSTANCE="jiqiao-db"
export DB_NAME="jiqiao"
export DB_USER="jiqiao_app"
export DB_PASS="$(openssl rand -hex 24)"      # ★URL 安全隨機密碼（勿用 base64，'/' 會破壞種子連線字串）
export SERVICE="jiqiao"

gcloud config set project "$PROJECT_ID"
echo "DB_PASS=$DB_PASS   ← 先複製保存"
```

**先確認帳單**（Cloud SQL/Run 都需要專案綁定有效帳單帳戶，否則建立資源會直接失敗）：

```bash
gcloud billing accounts list                                   # 找到你的 BILLING_ACCOUNT_ID
gcloud billing projects link "$PROJECT_ID" --billing-account=XXXX-XXXX-XXXX
gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)'   # 應為 True
```

啟用需要的 API（第一次要等 1–2 分鐘）：

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 1. 建立 Cloud SQL（PostgreSQL）

```bash
# 建立執行個體（db-f1-micro 最省；正式流量可改 db-custom-1-3840）
# ★ db-f1-micro 是共用核心，只在 --edition=ENTERPRISE 有效（若專案預設 Enterprise Plus 會被拒）
gcloud sql instances create "$SQL_INSTANCE" \
  --database-version=POSTGRES_15 \
  --edition=ENTERPRISE \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-size=10GB \
  --storage-auto-increase

# 建資料庫與應用程式帳號
gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE"
gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS"

# 取得連線名稱（格式 PROJECT:REGION:INSTANCE），後面到處要用
export INSTANCE_CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"
echo "INSTANCE_CONNECTION_NAME=$INSTANCE_CONNECTION_NAME"
```

把密碼放進 Secret Manager（不要寫進程式或環境變數明文）：

```bash
printf "%s" "$DB_PASS" | gcloud secrets create jiqiao-db-pass --data-file=-
# 若已存在要更新：printf "%s" "$DB_PASS" | gcloud secrets versions add jiqiao-db-pass --data-file=-
```

### 1.5 授權服務帳號（★必做，否則第一次部署會失敗）

Cloud Run 預設用「Compute 預設服務帳號」執行；新專案這個帳號**預設沒有**讀 Secret／連 Cloud SQL 的權限，
不先授權，部署會被拒（`Permission denied on secret …`）或起來後連不到 DB（500）。**在部署前先跑**：

```bash
export PROJNUM="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export RUNTIME_SA="${PROJNUM}-compute@developer.gserviceaccount.com"

# 執行時：連 Cloud SQL + 讀 Secret
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/cloudsql.client" --condition=None
gcloud secrets add-iam-policy-binding jiqiao-db-pass \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"

# 建置：--source 走 Cloud Build，新專案的 compute SA 需 builder 權限
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/cloudbuild.builds.builder" --condition=None
```

> 「灌種子的身分」＝你 Cloud Shell 登入的帳號（透過 Auth Proxy，需 `roles/cloudsql.client`，Owner/Editor 已內含）；
> 「服務執行的身分」＝上面這個 Compute SA。兩者不同，別搞混。

---

## 2. 上傳原始碼到 Cloud Shell（免 GitHub）

在**本機（Windows PowerShell）**把專案打包成 zip（排除 node_modules）：

```powershell
# 在專案資料夾 chengqi-main 的「上一層」執行
$src = "chengqi-main"
$zip = "chengqi-main.zip"
Get-ChildItem $src -Recurse -Force |
  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\.git\\|\\server\\data\\' } |
  Compress-Archive -DestinationPath $zip -Force
# 若上一行在舊版 PowerShell 有問題，改用最簡：先刪 node_modules 再壓縮整個資料夾
```

到 **Cloud Shell** 右上角「⋮ → Upload」上傳 `chengqi-main.zip`，然後：

```bash
cd ~
unzip -o chengqi-main.zip -d jiqiao && cd jiqiao   # 解到 ~/jiqiao
# 若 zip 內層還有一層 chengqi-main/，就 cd ~/jiqiao/chengqi-main
ls package.json server/schema.sql   # 確認在專案根目錄
```

---

## 3. 灌入種子資料（透過 Cloud SQL Auth Proxy）

Cloud Shell 用 Auth Proxy 連到 Cloud SQL，然後跑 `npm run seed`：

```bash
# 下載 Cloud SQL Auth Proxy v2
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
./cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" &   # 監聽 127.0.0.1:5432
sleep 3

# 安裝依賴（只要 pg／bcryptjs，略過原生 better-sqlite3）
npm ci --omit=optional

# 用 DATABASE_URL 指向 proxy，跑種子（會自動建表 + 灌內容）
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}" npm run seed
# 應印出 [seed] done { users: 10, posts: 3, works: 12, ... }

kill %1   # 關掉 proxy（種子完成）
```

> 註：`server/db.js` 看到 `DATABASE_URL` 就走 PostgreSQL；`schema.sql` 於連線時自動建表，
> 所以「建表」與「灌種子」一步完成。日後要重灌內容，重跑本節即可（`ON CONFLICT` 不會清掉真實使用者資料）。

---

## 4. 部署到 Cloud Run（從原始碼建置，免 GitHub）

`--source .` 會用 Cloud Build 讀 `Dockerfile` 建映像並部署，全在雲端：

```bash
gcloud run deploy "$SERVICE" \
  --source . \
  --region="$REGION" \
  --allow-unauthenticated \
  --add-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --set-env-vars="NODE_ENV=production,INSTANCE_CONNECTION_NAME=${INSTANCE_CONNECTION_NAME},DB_USER=${DB_USER},DB_NAME=${DB_NAME}" \
  --set-secrets="DB_PASS=jiqiao-db-pass:latest" \
  --cpu=1 --memory=512Mi --min-instances=0 --max-instances=3
```

第一次部署會問要不要建立 Artifact Registry repo → 選 **y**。建置約 2–4 分鐘。

部署完成後，把正式網址回填 `APP_URL`（給驗證信／重設密碼信連結用），再更新一次：

```bash
export URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
echo "服務網址：$URL"
gcloud run services update "$SERVICE" --region="$REGION" --update-env-vars="APP_URL=${URL}"
```

---

## 5. 驗證

```bash
curl -s "$URL/api/health"          # → {"ok":true,"db":"pg"}   ★ db 應為 pg
curl -s "$URL/api/posts" | head -c 300
curl -s "$URL/api/content/proverbs" | head -c 200
```

瀏覽器開 `$URL`：
- 首頁曆頁顯示**今天的日期**（非固定 6/6）。
- 用 `newuser@example.com` / `secret12345` 登入 → 貼文、按讚、留言、下單都會寫進 Cloud SQL。

### 5.1 ★ AR（`/AR`）專用驗證——**不做這一步會漏掉一整類靜默故障**

```bash
npm run check:live            # 預設打 https://chengqi.tw；可加參數指定其他網址
```

五項全 ✓ 才算過。最關鍵的是第一項 **CSP 是否允許 `blob:` 的 Web Worker**。

> **為什麼要單獨列這一項（2026-08-10 的實際事故）**
>
> MindAR 的影像比對跑在 **Web Worker** 裡，而那個 worker 是用 `blob:` URL 建立的。
> CSP 少了 `worker-src 'self' blob:`（或 `child-src`）時，worker 被瀏覽器擋掉 →
> 比對的 Promise 永遠不 resolve → **永遠不會認出卡片**。
>
> ⚠️ 失效方式**完全靜默**：相機開得起來、掃描線在動、`.mind` 目標檔也載入了、
> 頁面沒有任何錯誤訊息。症狀與「沒對準／光線不夠」一模一樣，使用者只會一直換角度重試。
>
> ⚠️ 而且**只有正式站會壞**：Vite dev server 不送 CSP，所以本機 `npm run dev`
> 一切正常。**驗 AR 一律要 `npm run build && npm run start`，或部署後跑 `check:live`。**
>
> ⚠️ **CSP 是伺服器送的回應標頭——只改 `server/index.js` 而不重新部署，線上不會變。**

### 5.2 ⚠️ 「push 到 GitHub」不等於「已部署」

實測過：檔案 commit＋push 一小時後，正式站仍是舊版建置。
判斷有沒有真的換版，比對 bundle 檔名最準（`/api/health` 只證明服務活著，不含版本資訊）：

```bash
curl -s "$URL/AR" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js'   # 與本機 dist/index.html 裡的比對
```

---

## 6. 之後要更新（改了程式碼）

**現在有 GitHub repo 了，直接 `git pull` 比重壓 zip 快得多**（早期文件寫的 zip 流程仍可用，但已非首選）：

```bash
cd ~/chengqi-main && git pull
gcloud run deploy "$SERVICE" --source . --region="$REGION"   # 沿用先前的環境變數/密碼
```

部署完**務必回頭跑一次 5.1 的 `npm run check:live`**——特別是這次改動有碰到
`server/index.js` 的 helmet／CSP、快取或任何回應標頭時。

若只改內容種子：重跑「第 3 節」即可。

---

## 桌曆原圖儲存（Cloud Storage，桌曆設計器需要）

客人送出桌曆客製洽詢時，會上傳**印刷用原圖**（每張約 1–3 MB）。這些檔案存在 Cloud Storage，
**不公開**，只有管理後台「客製洽詢」分頁讀得到。

⚠️ **沒設定的話**：正式站會拒絕存原圖（不會偷偷存到容器磁碟——那裡重啟就清空），
洽詢照樣送得出去，但後台只會有預覽圖，那幾頁會標「缺原圖」。管理後台也會顯示紅字提醒。
`GET /api/health` 的 `printStore` 欄位：`gcs`＝已設定、`unset`＝還沒設。

在 Cloud Shell 依序執行（一次即可）：

```bash
export PROJECT_ID="$(gcloud config get-value project)"
export BUCKET="${PROJECT_ID}-cal-print"
# 建 bucket：與 Cloud Run 同區、統一權限、禁止公開存取
gcloud storage buckets create "gs://${BUCKET}" --location=asia-east1   --uniform-bucket-level-access --public-access-prevention
# 讓 Cloud Run 的服務帳號可以讀寫這個 bucket
export PROJNUM="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export RUNTIME_SA="${PROJNUM}-compute@developer.gserviceaccount.com"
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}"   --member="serviceAccount:${RUNTIME_SA}" --role="roles/storage.objectAdmin"
# 告訴服務要用哪個 bucket（新洽詢通知信要寄到別的信箱，也一併設 CAL_NOTIFY_TO）
gcloud run services update jiqiao --region=asia-east1   --update-env-vars="PRINT_BUCKET=${BUCKET}"
```

- **不需要** Cloud Storage 的自動刪除（生命週期）規則：清理由程式依洽詢狀態做
  （未成交 60 天、成交保留到隔年年底、上傳到一半放棄的 1 天）。
- 費用：每 GB 每月約 0.02 美元；只有**送出洽詢**的人才會上傳原圖，用量很小。
- 新洽詢的通知信預設寄到 `chengqi1943@gmail.com`，要改就設 `CAL_NOTIFY_TO`。

## 常見問題

- **`/api/health` 回 `db":"sqlite"`**：代表沒吃到 `INSTANCE_CONNECTION_NAME`。檢查 `--set-env-vars` 與 `--add-cloudsql-instances` 是否都帶了同一個連線名稱。
- **部署後 500 / 連不到 DB**：確認 Cloud Run 服務帳號有 `roles/cloudsql.client`：
  ```bash
  PROJNUM="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${PROJNUM}-compute@developer.gserviceaccount.com" \
    --role="roles/cloudsql.client"
  # Secret 讀取權：
  gcloud secrets add-iam-policy-binding jiqiao-db-pass \
    --member="serviceAccount:${PROJNUM}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  ```
- **看不到 log／部署失敗查因**：
  ```bash
  gcloud run services logs read "$SERVICE" --region="$REGION" --limit=100   # 執行時 log（容器 crash 看這）
  gcloud builds list --limit=5                                              # 建置失敗時，找最近一次 build
  gcloud builds log <BUILD_ID>                                              # 看該次建置 log
  ```
  區分：**建置失敗**看 Cloud Build log；**起來後 500/crash**看 Cloud Run services log（例如「未設定資料庫」＝忘了帶 DB 環境變數）。
- **Session/資料持久性**：改用 Cloud SQL 後，Session 與所有內容都持久化、多實例共享（已解決先前 SQLite 在 `/tmp` 會重置的限制）。

---

## 成本與關閉（重要）

**Cloud SQL 是 24 小時計費的**——`min-instances=0` 只讓 **Cloud Run 運算**閒置歸零，**Cloud SQL 執行個體不論有沒有人用都持續計費**。控制成本：

```bash
gcloud sql instances stop  "$SQL_INSTANCE"    # 暫停（保留資料、最省，之後 start 即可）
gcloud sql instances start "$SQL_INSTANCE"    # 恢復
# 完全不用了、要停止所有費用（會刪資料）：
gcloud sql instances delete "$SQL_INSTANCE"
gcloud run  services  delete "$SERVICE" --region="$REGION"
gcloud artifacts repositories delete cloud-run-source-deploy --location="$REGION"   # 刪建置映像
```
db-f1-micro + Cloud Run min-instances=0 是最省的示範組合；正式流量再把 `--tier` 調大。

---

## 綁自訂網域（選用）

```bash
gcloud run domain-mappings create --service="$SERVICE" --region="$REGION" --domain=your-domain.com
```
需先在 Search Console 驗證網域擁有權（`gcloud domains verify your-domain.com`），依指示新增 DNS 記錄；
綁好後把 `APP_URL` 改成自訂網域（否則驗證信/重設信連結仍指向 `*.run.app`）：
```bash
gcloud run services update "$SERVICE" --region="$REGION" --update-env-vars="APP_URL=https://your-domain.com"
```
註：Cloud Run 網域對應在部分區域才支援；不支援時可改用 Firebase Hosting/Load Balancer 前置。

---

## 接你的 GPT / OpenAI API（AI 時光顧問）

金鑰**只放後端**（Secret Manager），前端永遠拿不到。程式已備好 `POST /api/ai/chat`（後端代呼叫 OpenAI，未設金鑰時自動退回內建示範腳本）。

1. 到 platform.openai.com 拿一支 `sk-...` API key。
2. 放進 Secret Manager：
   ```bash
   printf "%s" "sk-你的金鑰" | gcloud secrets create openai-key --data-file=-
   gcloud secrets add-iam-policy-binding openai-key \
     --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"
   ```
3. 部署時掛給 Cloud Run（模型可選）：
   ```bash
   gcloud run services update "$SERVICE" --region="$REGION" \
     --update-env-vars="OPENAI_MODEL=gpt-5.6-luna" \
     --update-secrets="OPENAI_API_KEY=openai-key:latest"
   ```
4. 驗證：`curl "$URL/api/health"` 會顯示 `"ai":"on"`。App 的「占卜 → AI 時光顧問」即改用真 GPT（帶入今日節氣/宜忌脈絡）。

> 本機開發：`export OPENAI_API_KEY=sk-...` 再 `npm run dev:server`（或 `node --env-file=.env server/index.js`）。
> 換 Azure OpenAI／相容服務：另設 `OPENAI_BASE_URL`。⚠️ 千萬別把金鑰寫進前端或 commit 進版控。

---

## 一鍵腳本

以上全流程（含帳單提醒、IAM 授權、API 生效等待、URL 安全密碼）已整理成 `deploy/deploy.sh`：
在 Cloud Shell 設好第 0 節變數後，`bash deploy/deploy.sh` 一次跑完 建 DB → 授權 → 種子 → 部署 → 回填 APP_URL。
