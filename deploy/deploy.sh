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
# 與 deploy/cost-cleanup.sh 共用：Secret 最新版本建立未滿這麼多小時，就當作「:latest 可能還沒更新」（見 put_secret）
GRACE_HOURS="${GRACE_HOURS:-24}"
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
if ! printf '%s' "$GRACE_HOURS" | grep -qE '^[0-9]+$'; then
  echo "❌ GRACE_HOURS 要是整數（小時），例：24"; exit 1
fi
# 殘留的端點覆寫會讓部署一直失敗，先清掉
gcloud config unset api_endpoint_overrides/run >/dev/null 2>&1 || true

# ★★ 只改了程式碼的話，這整支腳本都不必跑。
#    它會啟用 API、建/查 Cloud SQL、設 IAM、`npm ci` 再灌種子——每一步都可能
#    卡住或撞配額，而那些跟「把新版程式碼推上去」完全無關。
#    2026-08-11 實測：第 0 步撞 serviceusage 每分鐘配額（429）整支中止；
#    第 4 步的 `npm ci` 要裝 TensorFlow.js 與 node-canvas（可能編譯原生程式碼），
#    在 Cloud Shell 動輒數分鐘，看起來就像當掉。
echo
echo "ℹ️  只改程式碼（沒動資料表／參考清單）時，不需要這支腳本，用這條就好："
echo "      gcloud run deploy $SERVICE --source . --region=$REGION"
echo "   跳過灌種子： SKIP_SEED=1 bash deploy/deploy.sh"
echo

echo "== [0/6] 設定專案 & 啟用 API =="
gcloud config set project "$PROJECT_ID" >/dev/null
# 需先綁定「有效帳單帳戶」，否則 Cloud SQL/Run 建立會失敗（帳單需你在 Console 或 gcloud billing 設定）
if command -v gcloud >/dev/null && gcloud beta billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null | grep -qi false; then
  echo "   ⚠️ 此專案尚未綁定帳單帳戶！請先： gcloud billing projects link $PROJECT_ID --billing-account=XXXX-XXXX-XXXX"
fi
# ★★ 只啟用「還沒啟用」的 API。
#
# ⚠️ 原本是無條件 `gcloud services enable`（5 個 API）。站已經在跑的時候那些
#    早就啟用了，這一步純粹是多餘的呼叫——但它算在
#    `serviceusage.googleapis.com` 的 **Mutate requests per minute（120/分）**
#    配額裡，於是重跑幾次腳本就會撞到：
#      ERROR: (gcloud.services.enable) ... 429 RESOURCE_EXHAUSTED
#      Quota exceeded for quota metric 'Mutate requests'
#    而那個錯誤訊息看起來像「部署失敗」，實際上跟程式碼、跟服務本身都無關，
#    很容易讓人以為是自己的改動有問題。2026-08-11 實際踩到。
# ⚠️ 而且它是**第一步**，撞到就整支腳本中止，後面什麼都不會跑。
NEED_API=""
ENABLED="$(gcloud services list --enabled --format='value(config.name)' 2>/dev/null || true)"
for api in run.googleapis.com sqladmin.googleapis.com \
           cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com; do
  grep -qx "$api" <<<"$ENABLED" || NEED_API="$NEED_API $api"
done
if [ -n "$NEED_API" ]; then
  echo "   啟用尚未開啟的 API：$NEED_API"
  gcloud services enable $NEED_API
  echo "   等待 API 生效（避免下一步 SERVICE_DISABLED 競態）…"; sleep 15
else
  echo "   5 個 API 都已啟用，略過（避免撞到 serviceusage 的每分鐘配額）"
fi

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

# ★★ Secret 只在「值真的變了」才加新版本（put_secret）。
#    Secret Manager 按「有效版本數」逐月計費——**停用的版本也算**，只有銷毀才不收。
#    原本這裡每跑一次就無條件 `gcloud secrets versions add`、從不清舊版本 ⇒
#    每次部署多 1～7 個版本、只增不減。2026-09 帳單：Secret Manager 452 TWD（8 月 372），
#    比 Cloud SQL（約 300）還貴，而站上幾乎沒人。已經累積的舊版本由 deploy/cost-cleanup.sh
#    銷毀（第 [5/6] 步部署成功後自動跑）。
# ⚠️ 值只走「參數 → printf（內建指令）→ stdin」，不進任何外部指令的命令列、也不印出來。
# ★★ 「沒變、不加」要三件事都成立：最新版本建立已超過 GRACE_HOURS 小時、讀得到 :latest、值相同。
#    `latest` 別名不在強一致保證內（官方：「This doesn't apply when you access a secret version using
#    aliases or latest」，其他操作「typically converge within minutes, but may take a few hours」，
#    https://docs.cloud.google.com/secret-manager/docs/reference/consistency ）。
#    ⇒ 剛加完新版本的這段時間，:latest 可能還讀到前一個值。若這時又用「前一個值」部署（例如換了 DB 密碼
#    又改回來），比對會說「沒變」而不加，但真正的 :latest 是另一個值——第 [1/6] 步剛把資料庫密碼設成
#    這次的值，新執行個體卻讀到另一個 ⇒ 連不上資料庫、整站起不來。原本的「無條件加」不會走到這個狀態。
#    所以最新版本還太新就一律照加（多出來的由 cost-cleanup.sh 清），只信「放了夠久」的 :latest。
#    ⚠️ 「最新版本多新」靠 versions list 判斷，而 list 官方也沒說是強一致——這是把機率壓低，不是保證。
# ★ 讀不到值時要講清楚為什麼，不可一律寫「值有變」：Editor 角色沒有 secretmanager.versions.access
#   （官方：「the roles/editor and roles/viewer do not」），卻有 versions.add ⇒ 每次都會照加，
#   而畫面說「值有變」是一句不實的話，也讓人看不出「不加版本」這件事對他根本沒生效。
put_secret() {   # 用法：put_secret <secret 名稱> <值>
  local name="$1" val="$2" cur="" ctime ts why errf
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    printf "%s" "$val" | gcloud secrets create "$name" --data-file=- >/dev/null
    echo "   已建立 Secret：$name"
    return 0
  fi
  errf="$(mktemp)"
  # 最新的版本（不論狀態——:latest 就是指「最後建立」的那個）是什麼時候建的。讀不到／看不懂 ⇒ 當成太新、照加。
  ctime="$(gcloud secrets versions list "$name" --sort-by=~createTime --limit=1 \
             --format='value(createTime)' 2>/dev/null || true)"
  if [ -z "$ctime" ] || ! ts="$(date -u -d "$ctime" +%s 2>/dev/null)" \
     || [ $(( $(date -u +%s) - ts )) -lt $(( GRACE_HOURS * 3600 )) ]; then
    why="最新版本建立未滿 ${GRACE_HOURS} 小時（或讀不到建立時間），:latest 可能還沒更新，不比對、照加"
  # ⚠️ 尾巴補一個 x 再去掉：$(…) 會吃掉結尾的換行，不補的話值結尾有換行時永遠比對不上。
  elif cur="$(gcloud secrets versions access latest --secret="$name" 2>"$errf" && printf x)"; then
    if [ "${cur%x}" = "$val" ]; then
      cur=""; rm -f "$errf"
      echo "   Secret 沒變，不加新版本：$name"
      return 0
    fi
    why="值有變"
  elif grep -q 'PERMISSION_DENIED' "$errf"; then
    why="沒有讀取 Secret 值的權限（需 Owner 或 Secret Manager Secret Accessor），無法比對、照加"
  else
    # 最新版本被停用／銷毀、或其他錯誤：照加剛好把壞掉的 :latest 修好
    why="讀不到目前的 :latest（最新版本可能已停用或銷毀），無法比對、照加"
  fi
  cur=""; rm -f "$errf"
  printf "%s" "$val" | gcloud secrets versions add "$name" --data-file=- >/dev/null
  echo "   已加新版本：$name——$why（舊版本由 deploy/cost-cleanup.sh 清）"
}

echo "== [2/6] Secret（DB 密碼）=="
put_secret jiqiao-db-pass "$DB_PASS"

# 選用金鑰：執行前若 export 了下列任一變數，會自動建 Secret 並在部署時掛上。
#   寄信 Gmail：export GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD="16碼應用程式密碼"
#   寄信 其他 ：RESEND_API_KEY / SENDGRID_API_KEY / BREVO_API_KEY / SMTP_PASS(+SMTP_HOST,SMTP_USER)
#   AI 顧問  ：export OPENAI_API_KEY=sk-...
# 未 export 的金鑰不會被動到（部署用 --update-secrets，只改指定項目）。
# 設定教學見 docs/寄信-Email設定.md
EXTRA_SECRETS=""
EXTRA_ENVS=""
for v in GMAIL_USER SMTP_HOST SMTP_PORT SMTP_USER MAIL_FROM MAIL_REPLY_TO OPENAI_MODEL; do
  [ -n "${!v:-}" ] && EXTRA_ENVS="${EXTRA_ENVS},${v}=${!v}"
done
for pair in "GMAIL_APP_PASSWORD:jiqiao-gmail-pass" "SMTP_PASS:jiqiao-smtp-pass" \
            "RESEND_API_KEY:jiqiao-resend-key" "SENDGRID_API_KEY:jiqiao-sendgrid-key" \
            "BREVO_API_KEY:jiqiao-brevo-key" "OPENAI_API_KEY:jiqiao-openai-key"; do
  VAR="${pair%%:*}"; SECRET="${pair##*:}"; VAL="${!VAR:-}"
  [ -z "$VAL" ] && continue
  put_secret "$SECRET" "$VAL"
  EXTRA_SECRETS="${EXTRA_SECRETS},${VAR}=${SECRET}:latest"
  EXTRA_SECRET_NAMES="${EXTRA_SECRET_NAMES:-} $SECRET"
  echo "   已設定 Secret：$SECRET"
done

echo "== [3/6] IAM：授權執行時/建置服務帳號（否則首次部署會 500 / 建置失敗）=="
PROJNUM="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${PROJNUM}-compute@developer.gserviceaccount.com"
# 執行時：連 Cloud SQL + 讀 Secret
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/cloudsql.client" --condition=None >/dev/null
gcloud secrets add-iam-policy-binding jiqiao-db-pass \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor" >/dev/null
for S in ${EXTRA_SECRET_NAMES:-}; do
  gcloud secrets add-iam-policy-binding "$S" \
    --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor" >/dev/null
done
# 建置（--source 走 Cloud Build，新專案的 compute SA 需 builder 權限）
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/cloudbuild.builds.builder" --condition=None >/dev/null || true
echo "   已授權 $RUNTIME_SA"

echo "== [4/6] 灌種子（透過 Cloud SQL Auth Proxy；用你 Cloud Shell 的身分連線）=="
# ★ 只改程式碼時完全不需要這一步（資料表與參考清單都沒動）。
#   它是整支腳本最慢、最容易卡住的一段：下載 proxy、npm ci（TensorFlow.js
#   ＋ node-canvas 可能要編譯）、再連資料庫。SKIP_SEED=1 可整段跳過。
if [ "${SKIP_SEED:-0}" = "1" ]; then
  echo "   已略過（SKIP_SEED=1）"
else
if [ ! -x ./cloud-sql-proxy ]; then
  curl -sSfo cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64
  chmod +x cloud-sql-proxy
fi
./cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" & PROXY_PID=$!
trap 'kill $PROXY_PID 2>/dev/null || true' EXIT

# ★★ 等 proxy「真的可以連」，不要盲目 sleep。
# ⚠️ 原本是 `sleep 4`。proxy 慢了一點的話，後面的 seed 會連到一個還沒開的 port——
#    而 pg 的預設行為是**永遠等下去**（已在 server/db.js 補上連線逾時，但這裡
#    先確認 port 通了更直接）。症狀是「停在第 4 步、沒有任何輸出」。
echo "   等 Cloud SQL Auth Proxy 就緒…"
for i in $(seq 1 30); do
  if (exec 3<>/dev/tcp/127.0.0.1/5432) 2>/dev/null; then exec 3<&- 3>&-; echo "   ✓ proxy 已就緒（${i}s）"; break; fi
  if [ "$i" = 30 ]; then echo "   ❌ 等了 30 秒 proxy 仍未就緒，中止（避免無聲卡死）"; exit 1; fi
  sleep 1
done

# ⚠️ 這一步會裝 TensorFlow.js 與 node-canvas（可能要編譯原生程式碼），
#    在 Cloud Shell 動輒數分鐘。**沒有輸出不代表當掉**，但也請知道它可以跳過。
echo "   安裝相依（會花幾分鐘：TensorFlow.js／node-canvas）…"
npm ci --omit=optional
# DB_PASS 為 hex（URL 安全）；DATABASE_URL 優先於 INSTANCE_CONNECTION_NAME（db.js 已修正），故走 proxy TCP。
# ★ 預設「不灌示範資料」，只更新參考清單（濾鏡/諺語/宜忌解釋等）——避免已上線的站每次部署被塞回測試資料。
#   要示範資料時才明確開啟： SEED_DEMO=1 bash deploy/deploy.sh
SEED_DEMO="${SEED_DEMO:-0}" DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}" npm run seed
kill $PROXY_PID 2>/dev/null || true; trap - EXIT
fi

echo "== [5/6] 部署到 Cloud Run（從原始碼建置）=="
# ★ 用 --update-env-vars / --update-secrets（只新增或更新指定項目），
#   不可用 --set-*（那會「取代全部」，把本腳本沒列出的設定如 OPENAI_API_KEY 清掉）。
gcloud run deploy "$SERVICE" --source . --region="$REGION" --allow-unauthenticated \
  --add-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
  --update-env-vars="NODE_ENV=production,INSTANCE_CONNECTION_NAME=${INSTANCE_CONNECTION_NAME},DB_USER=${DB_USER},DB_NAME=${DB_NAME}${EXTRA_ENVS}" \
  --update-secrets="DB_PASS=jiqiao-db-pass:latest${EXTRA_SECRETS}" \
  --cpu=1 --memory=512Mi --min-instances=0 --max-instances=3

# ★★ 部署成功之後才清：Secret 的舊版本（停用的也照收費，只有銷毀不收）＋ 映像清理規則。
#    理由與安全規則見 deploy/cost-cleanup.sh 開頭——那支是清理的唯一實作，這裡只負責呼叫。
#    放在部署「之後」：每個 Secret 最新的 ENABLED 版本永遠不動，而 :latest 是新執行個體啟動時才解析，
#    正在跑的不受影響。⚠️ 清理失敗不算部署失敗（服務已經上線了），所以用 || 接住。
#    跳過： SKIP_CLEANUP=1 bash deploy/deploy.sh　　只看報告： DRY_RUN=1 bash deploy/cost-cleanup.sh
# ★★ 互動執行（在 Cloud Shell 直接跑）時**不帶 ASSUME_YES**：cost-cleanup.sh 會先列出計畫、問 y/N 才動手。
#    銷毀不可復原，不該是「照常部署」順手發生、沒看過計畫的副作用——尤其改版後第一次部署會一口氣銷毀
#    累積的上百個版本。沒有東西要改時它不會問。非互動（CI／管線，沒人能回答）才自動 ASSUME_YES=1。
# ⚠️ SKIP_CLEANUP 看不懂的值（true／yes／打錯）一律當「跳過」：不清只是多付錢，清錯不可復原。
case "${SKIP_CLEANUP:-0}" in
  0|'') SKIP_CLEANUP=0 ;;
  *)    SKIP_CLEANUP=1 ;;
esac
if [ "$SKIP_CLEANUP" = "1" ]; then
  echo "   成本清理：已略過（有設 SKIP_CLEANUP）"
else
  if [ -t 0 ]; then CLEAN_YES="${ASSUME_YES:-0}"; else CLEAN_YES=1; fi
  PROJECT_ID="$PROJECT_ID" REGION="$REGION" SERVICE="$SERVICE" GRACE_HOURS="$GRACE_HOURS" \
    ASSUME_YES="$CLEAN_YES" bash "$(dirname "$0")/cost-cleanup.sh" \
    || echo "   ⚠️ 成本清理沒有完整完成（不影響這次部署）；之後可單獨重跑： bash deploy/cost-cleanup.sh"
fi

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
echo "✅ 完成。"
echo "   ⚠️ 若這是正式站，請確認管理者帳號不是預設密碼（見 docs/操作手冊.md 的『建立你自己的管理員』）"
echo "   停用計費（Cloud SQL 24h 計費）： gcloud sql instances stop $SQL_INSTANCE"
