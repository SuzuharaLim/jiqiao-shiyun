#!/usr/bin/env bash
# 機巧時運 —— Cloud Run + Cloud SQL(PostgreSQL) 一鍵部署（在 Cloud Shell 執行）。
# 用法：
#   1) 先設好變數（見 docs/部署-CloudRun-PostgreSQL.md 第 0 節），至少 PROJECT_ID / DB_PASS
#      DB_PASS 請用「URL 安全」的隨機字串： export DB_PASS="$(openssl rand -hex 24)"
#   2) 在專案根目錄執行： bash deploy/deploy.sh
# 冪等：可重複執行；已存在的資源會略過或更新。
set -euo pipefail

: "${PROJECT_ID:?請先 export PROJECT_ID}"
REGION="${REGION:-asia-east1}"
SQL_INSTANCE="${SQL_INSTANCE:-jiqiao-db}"
DB_NAME="${DB_NAME:-jiqiao}"
DB_USER="${DB_USER:-jiqiao_app}"
SERVICE="${SERVICE:-jiqiao}"
: "${DB_PASS:?請先 export DB_PASS（請用 URL 安全字串：openssl rand -hex 24；勿用 base64，'/' 會破壞種子連線字串）}"

# 變數健檢：錯的值（例如把 Email 誤設成 REGION）會讓 gcloud 丟出難懂的端點錯誤，這裡先擋下來
if ! printf '%s' "$REGION" | grep -qE '^[a-z]+-[a-z]+[0-9]$'; then
  echo "❌ REGION 的值不像區域名稱：[$REGION]"
  echo "   應為 asia-east1 這種格式。請重設： export REGION=\"asia-east1\""
  exit 1
fi
if printf '%s' "$PROJECT_ID" | grep -qE '[@ ]'; then
  echo "❌ PROJECT_ID 看起來不對：[$PROJECT_ID]（不該含 @ 或空白）"; exit 1
fi
# 殘留的端點覆寫會讓部署一直失敗，先清掉
gcloud config unset api_endpoint_overrides/run >/dev/null 2>&1 || true

echo "== [0/6] 設定專案 & 啟用 API =="
gcloud config set project "$PROJECT_ID" >/dev/null
# 需先綁定「有效帳單帳戶」，否則 Cloud SQL/Run 建立會失敗（帳單需你在 Console 或 gcloud billing 設定）
if command -v gcloud >/dev/null && gcloud beta billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null | grep -qi false; then
  echo "   ⚠️ 此專案尚未綁定帳單帳戶！請先： gcloud billing projects link $PROJECT_ID --billing-account=XXXX-XXXX-XXXX"
fi
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com
echo "   等待 API 生效（避免下一步 SERVICE_DISABLED 競態）…"; sleep 15

echo "== [1/6] Cloud SQL（PostgreSQL）=="
if ! gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  gcloud sql instances create "$SQL_INSTANCE" --database-version=POSTGRES_15 \
    --tier=db-f1-micro --edition=ENTERPRISE --region="$REGION" --storage-size=10GB --storage-auto-increase \
    --backup --backup-start-time=19:00   # 每日自動備份（台灣凌晨 3 點；gcloud 預設「不」開備份，務必保留此旗標）
else
  # 既有實例：冪等補開每日備份（早期版本建立時未帶備份旗標）
  gcloud sql instances patch "$SQL_INSTANCE" --backup-start-time=19:00 --quiet || true
fi
gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" 2>/dev/null || true
gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" 2>/dev/null \
  || gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS"
INSTANCE_CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"
echo "   INSTANCE_CONNECTION_NAME=$INSTANCE_CONNECTION_NAME"

echo "== [2/6] Secret（DB 密碼）=="
if gcloud secrets describe jiqiao-db-pass >/dev/null 2>&1; then
  printf "%s" "$DB_PASS" | gcloud secrets versions add jiqiao-db-pass --data-file=-
else
  printf "%s" "$DB_PASS" | gcloud secrets create jiqiao-db-pass --data-file=-
fi

# 寄信金鑰（選用）：執行前若 export 了下列任一變數，會自動建 Secret 並在部署時掛上。
#   Gmail：export GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD="16碼應用程式密碼"
#   其他 ：RESEND_API_KEY / SENDGRID_API_KEY / BREVO_API_KEY / SMTP_PASS(+SMTP_HOST,SMTP_USER)
# 設定教學見 docs/寄信-Email設定.md
MAIL_SECRETS=""
MAIL_ENVS=""
for v in GMAIL_USER SMTP_HOST SMTP_PORT SMTP_USER MAIL_FROM MAIL_REPLY_TO; do
  [ -n "${!v:-}" ] && MAIL_ENVS="${MAIL_ENVS},${v}=${!v}"
done
for pair in "GMAIL_APP_PASSWORD:jiqiao-gmail-pass" "SMTP_PASS:jiqiao-smtp-pass" \
            "RESEND_API_KEY:jiqiao-resend-key" "SENDGRID_API_KEY:jiqiao-sendgrid-key" "BREVO_API_KEY:jiqiao-brevo-key"; do
  VAR="${pair%%:*}"; SECRET="${pair##*:}"; VAL="${!VAR:-}"
  [ -z "$VAL" ] && continue
  if gcloud secrets describe "$SECRET" >/dev/null 2>&1; then
    printf "%s" "$VAL" | gcloud secrets versions add "$SECRET" --data-file=- >/dev/null
  else
    printf "%s" "$VAL" | gcloud secrets create "$SECRET" --data-file=- >/dev/null
  fi
  MAIL_SECRETS="${MAIL_SECRETS},${VAR}=${SECRET}:latest"
  MAIL_SECRET_NAMES="${MAIL_SECRET_NAMES:-} $SECRET"
  echo "   已設定寄信 Secret：$SECRET"
done

echo "== [3/6] IAM：授權執行時/建置服務帳號（否則首次部署會 500 / 建置失敗）=="
PROJNUM="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${PROJNUM}-compute@developer.gserviceaccount.com"
# 執行時：連 Cloud SQL + 讀 Secret
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/cloudsql.client" --condition=None >/dev/null
gcloud secrets add-iam-policy-binding jiqiao-db-pass \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor" >/dev/null
for S in ${MAIL_SECRET_NAMES:-}; do
  gcloud secrets add-iam-policy-binding "$S" \
    --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor" >/dev/null
done
# 建置（--source 走 Cloud Build，新專案的 compute SA 需 builder 權限）
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/cloudbuild.builds.builder" --condition=None >/dev/null || true
echo "   已授權 $RUNTIME_SA"

echo "== [4/6] 灌種子（透過 Cloud SQL Auth Proxy；用你 Cloud Shell 的身分連線）=="
if [ ! -x ./cloud-sql-proxy ]; then
  curl -sSfo cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64
  chmod +x cloud-sql-proxy
fi
./cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" & PROXY_PID=$!
trap 'kill $PROXY_PID 2>/dev/null || true' EXIT
sleep 4
npm ci --omit=optional
# DB_PASS 為 hex（URL 安全）；DATABASE_URL 優先於 INSTANCE_CONNECTION_NAME（db.js 已修正），故走 proxy TCP。
# ★ 預設「不灌示範資料」，只更新參考清單（濾鏡/諺語/宜忌解釋等）——避免已上線的站每次部署被塞回測試資料。
#   要示範資料時才明確開啟： SEED_DEMO=1 bash deploy/deploy.sh
SEED_DEMO="${SEED_DEMO:-0}" DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}" npm run seed
kill $PROXY_PID 2>/dev/null || true; trap - EXIT

echo "== [5/6] 部署到 Cloud Run（從原始碼建置）=="
# ★ 用 --update-env-vars / --update-secrets（只新增或更新指定項目），
#   不可用 --set-*（那會「取代全部」，把本腳本沒列出的設定如 OPENAI_API_KEY 清掉）。
gcloud run deploy "$SERVICE" --source . --region="$REGION" --allow-unauthenticated \
  --add-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --update-env-vars="NODE_ENV=production,INSTANCE_CONNECTION_NAME=${INSTANCE_CONNECTION_NAME},DB_USER=${DB_USER},DB_NAME=${DB_NAME}${MAIL_ENVS}" \
  --update-secrets="DB_PASS=jiqiao-db-pass:latest${MAIL_SECRETS}" \
  --cpu=1 --memory=512Mi --min-instances=0 --max-instances=3

echo "== [6/6] 回填 APP_URL & 驗證 =="
# APP_URL 決定驗證信/重設密碼信裡的連結網址。已綁自訂網域就優先用它，
# 否則退回 Cloud Run 預設網址。可用 export APP_URL=... 覆寫。
if [ -z "${APP_URL:-}" ]; then
  DOMAIN="$(gcloud beta run domain-mappings list --region="$REGION" \
            --filter="spec.routeName=${SERVICE}" --format='value(metadata.name)' 2>/dev/null | head -1)"
  if [ -n "$DOMAIN" ]; then APP_URL="https://${DOMAIN}"
  else APP_URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"; fi
fi
gcloud run services update "$SERVICE" --region="$REGION" --update-env-vars="APP_URL=${APP_URL}" >/dev/null
echo "   對外網址：$APP_URL（信件連結會用這個）"
echo "   健康檢查：$(curl -s "${APP_URL}/api/health")"
echo "   ↑ db 應為 pg；mail 非 log 表示寄信已接；ai 為 off 表示未設 OPENAI_API_KEY"
echo "✅ 完成。用 admin@jiqiao.local / admin12345（管理者）或 newuser@example.com / secret12345 登入測試。"
echo "   停用計費（Cloud SQL 24h 計費）： gcloud sql instances stop $SQL_INSTANCE"
