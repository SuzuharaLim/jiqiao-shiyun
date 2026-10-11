#!/usr/bin/env bash
# 機巧時運 —— 成本清理：Secret 舊版本 ＋ Artifact Registry 舊映像（在 Cloud Shell 執行）。
# 用法（在專案根目錄）：
#   DRY_RUN=1 bash deploy/cost-cleanup.sh     # 只報告、什麼都不改（第一次請先跑這個）
#   bash deploy/cost-cleanup.sh                # 列出計畫 → 問 y/N → 才動手
#   ASSUME_YES=1 bash deploy/cost-cleanup.sh   # 不問直接做（deploy.sh 只在「非互動」執行時這樣呼叫）
#   DRY_RUN／ASSUME_YES 只認 0（或不設）與 1／true／yes，其他值一律中止、什麼都不改。
# 變數：PROJECT_ID（沒設就用 gcloud config 的專案）、REGION（預設 asia-east1）、SERVICE（預設 jiqiao）
#       GRACE_HOURS（預設 24）、AR_KEEP（預設 5）、AR_OLDER_THAN（預設 14d）
# ★ 這支是清理的**唯一實作**：deploy.sh 呼叫它、文件也叫人單獨跑它。不要在別處另寫一份——
#   兩份遲早分岔，而分岔的那一份平常不會有任何症狀（它只是默默地沒在清，或清錯東西）。
#
# ★★★ 為什麼要有這支（2026-10 對帳）：
#   Secret Manager 8 月 372 → 9 月 452 TWD，比 Cloud SQL（約 300）還貴，而站上幾乎沒人用。
#   它按「有效版本數 × 時間」計費，而**停用（DISABLED）的版本也算有效**，只有
#   **銷毀（DESTROYED）**才免費。官方價目表 https://cloud.google.com/secret-manager/pricing ：
#     「A secret version is "active" when it's in any of these states: Enabled and Disabled」
#     「Destroyed secret versions — Free」
#   每個版本每月約 1.9 TWD（US$0.06），前 6 個免費（整個帳單帳戶共用）。
#   舊版 deploy.sh 每跑一次就無條件 `gcloud secrets versions add`、從不清舊的 ⇒
#   每次部署多 1～7 個版本、只增不減。452 TWD ≈ 237 個「版本‧月」。
#   Artifact Registry 同理：`gcloud run deploy --source .` 每次都推一個新映像進
#   cloud-run-source-deploy，沒有清理規則就一直堆（9.63 → 19.92 TWD）。
#
# 做兩件事：
#   1) 只看下面 SECRETS 清單裡的 Secret：每個只留「最新的 ENABLED 版本」，其餘（含已停用的）**銷毀**。
#   2) cloud-run-source-deploy 設清理規則：名稱以 $SERVICE 開頭的套件，每個保留最新 AR_KEEP 個版本、
#      其餘超過 AR_OLDER_THAN 的刪除。只在這個專案／區域真的讀得到服務 $SERVICE 時才設（防設錯專案）。
#
# ⚠️ 銷毀不可復原（沒開「延遲銷毀」時是立即、永久的）。安全規則——每一條都不可拿掉：
#   - **最新的 ENABLED 版本永遠不動**。Cloud Run 掛的是 `:latest`、新執行個體啟動時才解析，
#     官方：「If the secret retrieval process fails, the instance doesn't start」——
#     動到它，下一次冷啟動（min-instances=0，幾乎每次有人來都是）整站起不來。
#   - 最新的版本是 DISABLED 或 DESTROYED（`:latest` 指的是「最後建立」的版本、不論狀態，所以已經讀不到）、
#     或一個 ENABLED 都沒有 ⇒ 這個 Secret 整個不動、只提醒。那是要人看的異常狀態，不是清理該順手處理的事。
#   - Cloud Run 服務（目前設定 ＋ 每一個修訂版本，再加上同專案其他服務的目前設定）若用「版本號」
#     釘住某個版本 ⇒ 那個版本不銷毀（`:latest` 不算釘住）。
#     **讀不到服務設定 ⇒ 不知道有沒有被釘住 ⇒ 這次一個都不銷毀**，寧可多付一個月。
#   - 最新版本建立未滿 GRACE_HOURS 小時 ⇒ 多留前一個 ENABLED 版本，下次再清。
#     官方說用 `latest` 別名讀取不保證強一致（其他操作「may take a few hours」才一致）；
#     剛加完新版本就銷毀前一版，這段期間啟動的執行個體理論上可能還解析到舊版本而起不來。
#     ⚠️ 這一點官方沒有明講（是推論、未證實），所以選保守的做法——多留一個版本一天只多約 0.06 TWD。
#   - **不用「停用」**：停用的版本照樣收費，等於白做。
#   - 不讀、不印任何 Secret 的值（這支完全不呼叫 `versions access`）。
#   - 只碰 SECRETS 清單裡的名字，專案裡別的 Secret 一律不看（REPORT_ONLY 清單只報告、不銷毀）。
#   - 已經「排定銷毀」的版本（開了延遲銷毀才會有）不再重送 destroy，只計入有效版本數。
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [ "$PROJECT_ID" = "(unset)" ]; then PROJECT_ID=""; fi
: "${PROJECT_ID:?請先 export PROJECT_ID（或 gcloud config set project 你的專案）}"
REGION="${REGION:-asia-east1}"
SERVICE="${SERVICE:-jiqiao}"
DRY_RUN="${DRY_RUN:-0}"
ASSUME_YES="${ASSUME_YES:-0}"
GRACE_HOURS="${GRACE_HOURS:-24}"
AR_REPO="cloud-run-source-deploy"   # `gcloud run deploy --source` 固定用這個名字，放在部署的那一區
AR_KEEP="${AR_KEEP:-5}"
# 14 天：保留規則已經保住最近 AR_KEEP 次部署，這條只是讓「同一天連續部署好幾次」時不會把當天的映像刪掉。
# 正在服務的修訂版本不受影響——Cloud Run 部署時就把映像複製一份，啟動新執行個體不會回 repo 拉
# （https://docs.cloud.google.com/run/docs/deploying）。⚠️ 但把流量切回「映像已被刪掉的舊修訂版本」
# 官方沒寫會怎樣（未證實），所以要回滾就回最近 AR_KEEP 次部署以內的。
AR_OLDER_THAN="${AR_OLDER_THAN:-14d}"

# 本專案管理的 Secret（只碰這些名字；不存在的略過）＝deploy.sh 會建的（DB 密碼 ＋ 6 支選用金鑰）。
# ⚠️ deploy.sh 新增 Secret 時一起加進來，否則它的舊版本永遠不會被清。
SECRETS=(jiqiao-db-pass jiqiao-gmail-pass jiqiao-smtp-pass jiqiao-resend-key
         jiqiao-sendgrid-key jiqiao-brevo-key jiqiao-openai-key)
# 只報告、不銷毀：openai-key＝docs/部署-CloudRun-PostgreSQL.md「接你的 GPT」那一節舊寫法建的名字。
#   名稱不帶 jiqiao-，不能確定只有 Cloud Run 在用（這支只查得到 Cloud Run 的釘選），所以只列出
#   它有幾個版本、可以銷毀哪些，要清請自己確認後手動 destroy。
REPORT_ONLY=(openai-key)

# 變數健檢（同 deploy.sh：錯的值會讓 gcloud 丟出難懂的端點錯誤）
if ! [[ "$REGION" =~ ^[a-z]+-[a-z]+[0-9]$ ]]; then
  echo "❌ REGION 的值不像區域名稱：[$REGION]（應為 asia-east1 這種格式）"; exit 1
fi
if [[ "$PROJECT_ID" =~ [@[:space:]] ]]; then
  echo "❌ PROJECT_ID 看起來不對：[$PROJECT_ID]（不該含 @ 或空白）"; exit 1
fi
if ! [[ "$GRACE_HOURS" =~ ^[0-9]+$ && "$AR_KEEP" =~ ^[1-9][0-9]*$ && "$AR_OLDER_THAN" =~ ^[0-9]+[smhd]$ ]]; then
  echo "❌ GRACE_HOURS／AR_KEEP／AR_OLDER_THAN 格式不對（例：24／5／14d）"; exit 1
fi
# SERVICE 會被寫進清理規則的 JSON（套件名稱前綴），先確認是 Cloud Run 服務名稱的格式
if ! [[ "$SERVICE" =~ ^[a-z]([-a-z0-9]*[a-z0-9])?$ ]]; then
  echo "❌ SERVICE 的值不像 Cloud Run 服務名稱：[$SERVICE]"; exit 1
fi
# ★★ 開關「看不懂就拒絕」：原本只認字串 "1"，於是 DRY_RUN=true／yes／TRUE／" 1" 全被當成
#    「不是 dry run」⇒ 真的銷毀（deploy.sh 非互動呼叫時連 y/N 都不問）。實測過，所以改成白名單。
flag() {   # 用法：flag <變數名>——正規化成 0 或 1；看不懂的值整支中止、什麼都不改
  local v="${!1}"
  case "${v,,}" in
    ''|0|false|no) printf -v "$1" '%s' 0 ;;
    1|true|yes)    printf -v "$1" '%s' 1 ;;
    *) echo "❌ $1 只能是 0 或 1（收到：[$v]）——看不懂的值一律不動手"; exit 1 ;;
  esac
}
flag DRY_RUN
flag ASSUME_YES

TMPD="$(mktemp -d)"
trap 'rm -rf "$TMPD"' EXIT
ERR="$TMPD/err"
errline() { head -n 1 "$ERR" 2>/dev/null | cut -c1-200; }
# python 失敗時第一行永遠是「Traceback (most recent call last):」，真正的例外在最後一行
errlast() { tail -n 1 "$ERR" 2>/dev/null | cut -c1-200; }
# 「1 2 3 5 7 8」→「1-3,5,7-8」（舊版本可能上百個，逐個列會洗版）
ranges() {
  printf '%s\n' "$@" | sort -n | awk 'NR==1{s=p=$1; next} $1==p+1{p=$1; next}
    {printf "%s%s,", s, (s==p ? "" : "-" p); s=p=$1} END{if (NR) printf "%s%s", s, (s==p ? "" : "-" p)}'
}
HAVE_PY=0
if python3 -c 'pass' >/dev/null 2>&1; then HAVE_PY=1; fi

echo
echo "== 成本清理：Secret 舊版本 ＋ Artifact Registry 舊映像 =="
echo "   專案：$PROJECT_ID　區域：$REGION　服務：$SERVICE"
if [ "$DRY_RUN" = "1" ]; then
  echo "   模式：DRY_RUN=1——只報告，不會改任何東西"
else
  echo "   模式：⚠️ 會「銷毀」舊的 Secret 版本（不可復原）並設定映像清理規則"
  echo "         只想看報告： DRY_RUN=1 bash deploy/cost-cleanup.sh"
fi

# ── 1) 哪些 Secret 版本被 Cloud Run 用版本號釘住 ─────────────────────────────
# 走訪整份 JSON 找 secretKeyRef（環境變數）與 secret.items（掛成檔案），不寫死欄位路徑：
# 服務（spec.template.spec…）與修訂版本（spec…）的層級不同，寫死的話少看一種就會漏。
# 每行輸出「secret名稱 版本號」；`latest` 不算釘住，不輸出。
PIN_PY='
import json, re, sys
pins, alias = set(), {}
def sec(n):
    m = re.search(r"/secrets/([^/]+)", n)
    return m.group(1) if m else n
def ver(k):
    m = re.fullmatch(r"(?:.*/versions/)?([0-9]+)", str(k))
    return m.group(1) if m else None
def walk(o):
    if isinstance(o, dict):
        ann = o.get("annotations")
        if isinstance(ann, dict) and isinstance(ann.get("run.googleapis.com/secrets"), str):
            for part in ann["run.googleapis.com/secrets"].split(","):
                if ":" in part:
                    a, full = part.split(":", 1)
                    alias[a.strip()] = sec(full.strip())
        ref = o.get("secretKeyRef")
        if isinstance(ref, dict) and ref.get("name"):
            v = ver(ref.get("key", ""))
            if v:
                pins.add((ref["name"], v))
        s = o.get("secret")
        if isinstance(s, dict) and s.get("secretName"):
            for it in s.get("items") or []:
                if isinstance(it, dict):
                    v = ver(it.get("key", ""))
                    if v:
                        pins.add((s["secretName"], v))
        for x in o.values():
            walk(x)
    elif isinstance(o, list):
        for x in o:
            walk(x)
walk(json.load(sys.stdin))
for n, v in sorted({(alias.get(n, sec(n)), v) for n, v in pins}, key=lambda p: (p[0], int(p[1]))):
    print(n, v)
'
echo
echo "== [1/3] 讀 Cloud Run 服務設定（找出用版本號釘住的 Secret 版本）=="
# 三份都要讀得到才算數：$SERVICE 目前設定、$SERVICE 的每一個修訂版本（流量可能切回舊的）、
# 同專案所有 Cloud Run 服務的目前設定（例如另開的測試站也掛同一個 Secret、釘了版本號）。
# SVC_OK＝這個專案／區域真的有 $SERVICE。[3/3] 也靠它：沒設 PROJECT_ID 時用的是 gcloud config 的專案
# （Cloud Shell 會跟著主控台目前開的專案走），讀不到服務就代表很可能開錯專案，映像規則也不設。
SVC_OK=0; SVC_WHY=""
if gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT_ID" \
     --format=json >"$TMPD/svc.json" 2>"$ERR"; then
  SVC_OK=1
else
  SVC_WHY="讀不到 Cloud Run 服務 $SERVICE（$REGION）的設定：$(errline)"
fi
PINS_OK=0; PINNED=""; PIN_WHY=""
if [ "$HAVE_PY" != "1" ]; then
  PIN_WHY="找不到可用的 python3（用來解析服務設定）"
elif [ "$SVC_OK" != "1" ]; then
  PIN_WHY="$SVC_WHY"
elif ! gcloud run revisions list --service="$SERVICE" --region="$REGION" --project="$PROJECT_ID" \
       --format=json >"$TMPD/rev.json" 2>"$ERR"; then
  PIN_WHY="讀不到 $SERVICE 的修訂版本清單：$(errline)"
elif ! gcloud run services list --project="$PROJECT_ID" --format=json >"$TMPD/all.json" 2>"$ERR"; then
  PIN_WHY="列不出專案裡的 Cloud Run 服務：$(errline)"
elif ! PINNED="$({ printf '['; cat "$TMPD/svc.json"; printf ','; cat "$TMPD/rev.json"; printf ',';
                   cat "$TMPD/all.json"; printf ']'; } | python3 -I -c "$PIN_PY" 2>"$ERR")"; then
  PIN_WHY="解析服務設定失敗：$(errlast)"; PINNED=""
else
  PINS_OK=1
fi
if [ "$PINS_OK" = "1" ]; then
  if [ -n "$PINNED" ]; then
    echo "   以下版本被釘住，不會銷毀："
    while read -r ps pv; do echo "     · $ps 版本 $pv"; done <<<"$PINNED"
  else
    echo "   沒有用版本號釘住任何 Secret（都是 :latest）"
  fi
else
  echo "   ⚠️ $PIN_WHY"
  echo "   ⇒ 不知道有沒有版本被釘住，這次「不銷毀任何 Secret 版本」（只報告）。"
fi
is_pinned() { grep -qxF "$1 $2" <<<"$PINNED"; }

# ── 2) Secret：每個只留最新的 ENABLED 版本 ─────────────────────────────────
echo
echo "== [2/3] Secret Manager：每個 Secret 只留最新的 ENABLED 版本（其餘銷毀；停用的也照收費）=="
NOW="$(date -u +%s)"
declare -A BEFORE=() AFTER=() TODO=()
TOTAL_BEFORE=0; TOTAL_AFTER=0; TODO_COUNT=0

plan_secret() {   # 用法：plan_secret <secret> [report]（report＝只報告、不排進銷毀清單）
  local s="$1" mode="${2:-}" listing vname vstate vtime vsched n ttl t te
  local -a en=() dis=() sched=() destroy=() pinned_keep=()
  local -A when=()
  local newest=0 newest_state="" top_en=0 prev=0 bad=0 billable extra=""
  if ! gcloud secrets describe "$s" --project="$PROJECT_ID" \
         --format='value(versionDestroyTtl)' >"$TMPD/ttl" 2>"$ERR"; then
    if grep -q 'NOT_FOUND' "$ERR"; then echo "   · $s：不存在，略過"
    else echo "   · $s：讀不到，略過（$(errline)）"; fi
    return 0
  fi
  ttl="$(cat "$TMPD/ttl")"
  # scheduledDestroyTime 放最後一欄：它常常是空的，而 read 會把連續的 tab 併成一個分隔，
  # 空欄放中間的話後面的欄位會往前錯位。createTime 一定有值。
  if ! listing="$(gcloud secrets versions list "$s" --project="$PROJECT_ID" \
                    --format='value(name,state,createTime,scheduledDestroyTime)' 2>"$ERR")"; then
    echo "   · $s：列不出版本，略過（$(errline)）"
    return 0
  fi
  # name 可能是完整資源名稱 projects/N/secrets/S/versions/V，也可能只有 V；一律取最後一段
  while read -r vname vstate vtime vsched; do
    if [ -z "$vname" ]; then continue; fi
    n="${vname##*/}"
    if ! [[ "$n" =~ ^[0-9]+$ ]]; then bad=1; continue; fi
    # ★ 最新版本要連 DESTROYED 一起算，所以放在 case 之前：`latest` 是「最後建立」的版本、不論狀態
    #   （官方 API：「latest is an alias to the most recently created SecretVersion」）。
    #   只看沒銷毀的話，最新版本已被銷毀（:latest 壞了）時會把次新的 ENABLED 當成目前版本，照常清理而不提醒。
    if [ "$n" -gt "$newest" ]; then newest="$n"; newest_state="$vstate"; fi
    case "$vstate" in
      ENABLED)   en+=("$n") ;;
      DISABLED)  if [ -n "$vsched" ]; then sched+=("$n"); else dis+=("$n"); fi ;;
      DESTROYED) continue ;;
      *)         bad=1; continue ;;
    esac
    when[$n]="$vtime"
  done <<<"$listing"
  for n in ${en[@]+"${en[@]}"}; do
    if [ "$n" -gt "$top_en" ]; then top_en="$n"; fi
  done
  # 排定銷毀的版本狀態仍是 DISABLED ⇒ 照價目表仍算有效版本（推論），計入但不再重送 destroy
  billable=$(( ${#en[@]} + ${#dis[@]} + ${#sched[@]} ))
  BEFORE[$s]=$billable; AFTER[$s]=$billable; TODO[$s]=""
  TOTAL_BEFORE=$((TOTAL_BEFORE + billable)); TOTAL_AFTER=$((TOTAL_AFTER + billable))
  local tag="$s：有效版本 $billable 個（ENABLED ${#en[@]}、DISABLED ${#dis[@]}"
  if [ "${#sched[@]}" -gt 0 ]; then tag="$tag、已排定銷毀 ${#sched[@]}"; fi
  tag="$tag）"

  if [ "$bad" = "1" ]; then
    echo "   ⚠️ $tag——看不懂 gcloud 列出的版本資料，這個 Secret 不動"; return 0
  fi
  if [ "${#en[@]}" -eq 0 ]; then
    if [ "$billable" -gt 0 ]; then
      echo "   ⚠️ $tag——一個 ENABLED 版本都沒有：:latest 讀不到，掛著它的服務新執行個體會起不來。不動，請人工確認"
    else
      echo "   · $s：沒有有效版本"
    fi
    return 0
  fi
  if [ "$top_en" -ne "$newest" ]; then
    echo "   ⚠️ $tag——最新的版本 $newest 是 $newest_state（:latest 指向它、讀不到）。不動，請人工確認（加一個新版本即可修復）"
    return 0
  fi

  # 最新版本太新 ⇒ 多留前一個 ENABLED 版本（理由見檔頭）。時間讀不懂也當成「太新」——保守。
  t="${when[$top_en]:-}"
  if [ -n "$t" ] && te="$(date -u -d "$t" +%s 2>/dev/null)" && [ $((NOW - te)) -ge $((GRACE_HOURS * 3600)) ]; then
    :
  else
    for n in "${en[@]}"; do
      if [ "$n" -ne "$top_en" ] && [ "$n" -gt "$prev" ]; then prev="$n"; fi
    done
  fi

  for n in "${en[@]}" ${dis[@]+"${dis[@]}"}; do
    if [ "$n" -eq "$top_en" ] || [ "$n" -eq "$prev" ]; then continue; fi
    if [ "$PINS_OK" = "1" ] && is_pinned "$s" "$n"; then pinned_keep+=("$n"); continue; fi
    destroy+=("$n")
  done

  if [ "$prev" -gt 0 ]; then extra="${extra}、前一版 $prev（最新版本建立未滿 ${GRACE_HOURS} 小時，下次再清）"; fi
  if [ "${#pinned_keep[@]}" -gt 0 ]; then extra="${extra}、被服務釘住的版本 $(ranges "${pinned_keep[@]}")"; fi
  if [ "${#destroy[@]}" -eq 0 ]; then
    echo "   · $tag——已經是最精簡（保留最新版本 $top_en${extra}）"
    return 0
  fi
  if [ "$mode" = "report" ]; then
    echo "   · $tag——可銷毀 ${#destroy[@]} 個（版本 $(ranges "${destroy[@]}")），但 $s 只報告、不自動銷毀（見檔頭 REPORT_ONLY）"
    echo "     確認沒有別的東西在用之後可手動：gcloud secrets versions destroy 版本號 --secret=$s"
    return 0
  fi
  if [ "$PINS_OK" != "1" ]; then
    echo "   · $tag——可銷毀 ${#destroy[@]} 個（版本 $(ranges "${destroy[@]}")），但這次不銷毀（讀不到服務設定，見上）"
    return 0
  fi
  TODO[$s]="$(printf '%s\n' "${destroy[@]}" | sort -n | tr '\n' ' ')"
  AFTER[$s]=$((billable - ${#destroy[@]}))
  TOTAL_AFTER=$((TOTAL_AFTER - ${#destroy[@]}))
  TODO_COUNT=$((TODO_COUNT + ${#destroy[@]}))
  echo "   · $tag → 留 ${AFTER[$s]} 個（最新版本 $top_en${extra}），銷毀 ${#destroy[@]} 個：版本 $(ranges "${destroy[@]}")"
  if [ -n "$ttl" ]; then
    # 延遲銷毀＝destroy 只先停用、期滿才真的刪；停用的照價目表仍算有效版本（期間是否計費官方沒明講，推論會）
    echo "     ⚠️ $s 開了延遲銷毀（$ttl）：銷毀後要等延遲期滿才真的刪除，那段期間可能照樣計費"
  fi
  return 0
}
for s in "${SECRETS[@]}"; do plan_secret "$s"; done
for s in "${REPORT_ONLY[@]}"; do plan_secret "$s" report; done

# ── 3) Artifact Registry 清理規則 ───────────────────────────────────────────
echo
echo "== [3/3] Artifact Registry：$AR_REPO（$REGION）清理規則 =="
# 保留規則優先於刪除規則（官方：同時符合時「the artifact is kept」）⇒
# 實際效果＝「每個套件最新 AR_KEEP 個版本永遠留著；其餘的超過 AR_OLDER_THAN 才刪」。
# ★★ 兩條都要帶 packageNamePrefixes：cloud-run-source-deploy 是**同一區所有** `--source` 部署共用的 repo，
#    不帶的話別的服務的映像也一起被刪。只限定保留規則也不行——刪除規則照樣刪別人的、而且沒有保底。
#    ⚠️ 是「前綴」比對（官方例：red 會比對到 red-team、redis），所以 jiqiao-staging 這類同名開頭的也算在內
#    （它們同樣各自保留最新 AR_KEEP 個）。`--source` 推的套件名稱就是服務名稱（buildpacks 的快取在其下）。
cat >"$TMPD/ar-policy.json" <<EOF
[
  {"name": "jiqiao-keep-recent", "action": {"type": "Keep"},
   "mostRecentVersions": {"packageNamePrefixes": ["$SERVICE"], "keepCount": $AR_KEEP}},
  {"name": "jiqiao-delete-old", "action": {"type": "Delete"},
   "condition": {"packageNamePrefixes": ["$SERVICE"], "tagState": "any", "olderThan": "$AR_OLDER_THAN"}}
]
EOF
# 套用規則檔會「整組取代」repo 上既有的規則（依 SDK 原始碼推論，官方文件沒明講）⇒
# 只要發現不是這支設的規則就不動，免得蓋掉別人設的。
# 輸出兩行：第 1 行＝不是這支設的規則名稱（逗號分隔，可能空）；第 2 行＝既有規則與要設的完全相同？1／0。
# ★ 第 2 行讓「已經設好」的時候不必再設——否則每次部署都有事要做，deploy.sh 互動時就每次都問 y/N。
#   既有規則的格式官方沒寫（gcloud 可能輸出 14d 或 1209600s、Keep 或 KEEP），所以先正規化再比；
#   看不懂的一律算「不同」⇒ 重設一次（只會覆蓋這支自己的兩條，別人的規則上一行已經擋住）。
AR_PY='
import json, re, sys
raw = sys.stdin.read().strip()
data = json.loads(raw) if raw else []
if isinstance(data, dict) and "cleanupPolicies" in data:
    data = data["cleanupPolicies"]
items = []
if isinstance(data, dict):
    items = [(str(k), p) for k, p in data.items()]
elif isinstance(data, list):
    for p in data:
        items.append((str((p.get("name") or p.get("id") or "?") if isinstance(p, dict) else p), p))
items = [(n.split("/")[-1], p) for n, p in items]
ours = {"jiqiao-keep-recent", "jiqiao-delete-old"}
print(",".join(n for n, _ in items if n not in ours))
UNIT = {"s": 1, "m": 60, "h": 3600, "d": 86400}
def norm(k, v):
    if k in ("olderThan", "newerThan"):
        m = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)([smhd])", str(v).strip())
        return int(float(m.group(1)) * UNIT[m.group(2)]) if m else "?" + str(v)
    if k == "keepCount":
        return int(v)
    if isinstance(v, list):
        return tuple(sorted(str(x) for x in v))
    return str(v).lower()
def block(d):
    if not isinstance(d, dict):
        return ("?", repr(d))
    return tuple(sorted((k, norm(k, v)) for k, v in d.items() if v not in (None, [], "")))
def canon(name, p):
    try:
        a = p.get("action")
        a = a.get("type") if isinstance(a, dict) else a
        return repr((name, str(a).lower(), block(p.get("condition") or {}),
                     block(p.get("mostRecentVersions") or {})))
    except Exception:
        return "?" + name + repr(p)
want = json.load(open(sys.argv[1], encoding="utf-8"))
have = sorted(canon(n, p) for n, p in items)
need = sorted(canon(p["name"], p) for p in want)
print(1 if have == need else 0)
'
AR_DO=0
if [ "$SVC_OK" != "1" ]; then
  echo "   ⚠️ 在專案 $PROJECT_ID 的 $REGION 讀不到服務 $SERVICE（見 [1/3]）——可能開錯專案，這次不設"
elif ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" --project="$PROJECT_ID" \
       >/dev/null 2>"$ERR"; then
  if grep -q 'NOT_FOUND' "$ERR"; then
    echo "   沒有這個 repo（還沒用 --source 部署過，或在別區）——略過"
  else
    echo "   讀不到這個 repo，略過（$(errline)）"
  fi
elif ! gcloud artifacts repositories list-cleanup-policies "$AR_REPO" --location="$REGION" \
         --project="$PROJECT_ID" --format=json >"$TMPD/ar-existing.json" 2>"$ERR"; then
  echo "   讀不到既有的清理規則；為了不蓋掉別人設的規則，這次不設（$(errline)）"
elif [ "$HAVE_PY" != "1" ]; then
  echo "   找不到可用的 python3，無法確認既有規則；為了不蓋掉別人設的規則，這次不設"
elif ! AR_OUT="$(python3 -I -c "$AR_PY" "$TMPD/ar-policy.json" <"$TMPD/ar-existing.json" 2>"$ERR")"; then
  echo "   看不懂既有的清理規則，這次不設（$(errlast)）"
else
  AR_OTHERS="${AR_OUT%%$'\n'*}"; AR_SAME="${AR_OUT##*$'\n'}"
  if [ -n "$AR_OTHERS" ]; then
    echo "   repo 上已經有別的清理規則（$AR_OTHERS）。套用會整組取代，為了不蓋掉它們，這次不設。"
    echo "   要合併請手動看： gcloud artifacts repositories list-cleanup-policies $AR_REPO --location=$REGION"
  elif [ "$AR_SAME" = "1" ]; then
    echo "   清理規則已經設好、內容相同，不用再設"
  else
    AR_DO=1
    echo "   要設定：名稱以 $SERVICE 開頭的映像，每個保留最新 $AR_KEEP 個版本；其餘超過 $AR_OLDER_THAN 的刪除（背景作業，約一天內生效）"
  fi
fi

# ── 小結 ──────────────────────────────────────────────────────────────────
est() { awk -v n="$1" 'BEGIN{x = n - 6; if (x < 0) x = 0; printf "%.0f", x * 1.9068}'; }
echo
echo "== 小結 =="
echo "   這支管的 Secret 有效版本：$TOTAL_BEFORE → $TOTAL_AFTER 個（預計銷毀 $TODO_COUNT 個）"
echo "   估計每月版本費：約 $(est "$TOTAL_BEFORE") → $(est "$TOTAL_AFTER") TWD"
echo "     （1.9068 TWD/版本/月、前 6 個免費；免費額度是整個帳單帳戶共用，這裡只算這支管的 Secret）"
echo "   要對帳：帳單 → 報表，服務選 Secret Manager、依 SKU 分組——"
echo "     費用在「Secret version replica storage」＝版本數造成的（就是這支在清的）；"
echo "     在「Secret access operations」才是讀取次數造成的（這支清不掉，要另外查）。"

if [ "$DRY_RUN" = "1" ]; then
  echo
  echo "ℹ️  DRY_RUN=1：以上只是報告，什麼都沒改。要真的清： bash deploy/cost-cleanup.sh"
  exit 0
fi
if [ "$TODO_COUNT" -eq 0 ] && [ "$AR_DO" != "1" ]; then
  echo
  echo "✅ 沒有要改的東西。"
  exit 0
fi

echo
echo "⚠️ 接下來會（專案 $PROJECT_ID）："
if [ "$TODO_COUNT" -gt 0 ]; then echo "   - 銷毀上面列出的 $TODO_COUNT 個 Secret 版本（不可復原；每個 Secret 最新的 ENABLED 版本不動）"; fi
if [ "$AR_DO" = "1" ]; then echo "   - 在 $AR_REPO 設定上面那組清理規則（之後映像會在背景被刪，刪掉的映像不可復原）"; fi
if [ "$ASSUME_YES" != "1" ]; then
  if [ -t 0 ]; then
    read -r -p "   確定嗎？輸入 y 繼續（其他任何輸入都會取消）： " ans || ans=""
    case "$ans" in
      y|Y|yes|YES) ;;
      *) echo "   已取消，什麼都沒改。"; exit 0 ;;
    esac
  else
    echo "   非互動執行時要加 ASSUME_YES=1 才會動手；這次什麼都沒改。"
    exit 0
  fi
fi

FAILS=0
if [ "$TODO_COUNT" -gt 0 ]; then
  echo
  echo "== 銷毀舊的 Secret 版本 =="
  for s in "${SECRETS[@]}"; do
    if [ -z "${TODO[$s]:-}" ]; then continue; fi
    done_n=0; fail_n=0
    for v in ${TODO[$s]}; do
      # --quiet：destroy 會問「This action cannot be reversed」，非互動時不加會直接報錯
      if gcloud secrets versions destroy "$v" --secret="$s" --project="$PROJECT_ID" --quiet >/dev/null 2>"$ERR"; then
        done_n=$((done_n + 1))
      else
        # 第一個失敗就停（這個 Secret 的其餘版本不再試）：多半是權限不足，照試下去只會洗出上百行同樣的錯
        fail_n=$(( $(wc -w <<<"${TODO[$s]}") - done_n ))
        echo "   ❌ $s 版本 $v 銷毀失敗，這個 Secret 其餘的先不試：$(errline)"
        break
      fi
    done
    FAILS=$((FAILS + fail_n))
    # 重新列一次，報告「實際」剩幾個（不是預估）
    if after="$(gcloud secrets versions list "$s" --project="$PROJECT_ID" --format='value(name,state)' 2>/dev/null)"; then
      left="$(awk '$2=="ENABLED" || $2=="DISABLED" {c++} END {print c+0}' <<<"$after")"
    else
      left="?（重新列出失敗）"
    fi
    if [ "$fail_n" -gt 0 ]; then
      echo "   ⚠️ $s：有效版本 ${BEFORE[$s]} → $left（銷毀 $done_n 個，沒清掉 $fail_n 個）"
    else
      echo "   ✓ $s：有效版本 ${BEFORE[$s]} → $left（銷毀 $done_n 個）"
    fi
  done
fi

if [ "$AR_DO" = "1" ]; then
  echo
  echo "== 設定 Artifact Registry 清理規則 =="
  # 明確帶 --no-dry-run：repo 的 dry-run 旗標沒設時的預設值官方沒寫（未證實），不賭預設值
  if gcloud artifacts repositories set-cleanup-policies "$AR_REPO" --location="$REGION" \
       --project="$PROJECT_ID" --policy="$TMPD/ar-policy.json" --no-dry-run --quiet >/dev/null 2>"$ERR"; then
    echo "   ✓ 已設定（背景作業，約一天內生效）。查看： gcloud artifacts repositories list-cleanup-policies $AR_REPO --location=$REGION"
  else
    FAILS=$((FAILS + 1)); echo "   ⚠️ 設定失敗（不影響服務）：$(errline)"
  fi
fi

echo
if [ "$FAILS" -gt 0 ]; then
  echo "⚠️ 有 $FAILS 項沒有完成（見上）。可以再跑一次： bash deploy/cost-cleanup.sh"
  exit 1
fi
echo "✅ 成本清理完成。"
