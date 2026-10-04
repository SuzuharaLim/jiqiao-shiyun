# 寄信設定（Email）— 讓驗證信／重設密碼信真的寄出

> 現況：程式已完全就緒，**只差一組帳密/金鑰**。沒設定時系統不會壞——只是把連結印在伺服器 log、不真的寄信。
> 設好之後，註冊驗證信、忘記密碼信、訂單確認信會自動開始寄出，**不需要改任何程式碼**。
> 最後更新：2026-07

---

## 0. 先講清楚：Google 有哪些選擇

**Google Cloud 沒有「交易信 API」這種產品**（沒有等同 SendGrid/SES 的服務），GCP 官方文件本身就是叫你用第三方。
Google 這邊實際能用來寄信的是：

| 方式 | 寄件地址 | 額度 | 費用 | 設定難度 |
| --- | --- | --- | --- | --- |
| **Gmail SMTP＋應用程式密碼** | 你的 `@gmail.com` | 500 封/日 | 免費 | ★ 最簡單 |
| Google Workspace SMTP 中繼 | `noreply@chengqi.tw` | 10,000 封/日 | 約 NT$220/月起 | ★★ |
| Gmail API（OAuth2） | 同上 | 同上 | 免費 | ★★★ 需管理 refresh token |

**本專案規模（募資展示、每天最多幾十封）用 Gmail SMTP 綽綽有餘**，以下以此為主。
之後若要用 `noreply@chengqi.tw` 這種正式寄件地址，再升級 Workspace（見 §5）。

> ⚙️ 技術重點：Google Cloud **只封鎖 25 埠**，465／587 是通的，所以 SMTP 在 Cloud Run 可以正常運作。
> 本專案的 SMTP 用戶端是自己寫的（`server/smtp.js`），**沒有多裝任何套件**。

---

## 1. 取得 Gmail 應用程式密碼（5 分鐘）

「應用程式密碼」是 Google 給程式用的 16 碼專用密碼，**不是**你的 Google 帳號密碼。

1. **先開啟兩步驟驗證**（沒開就不會有應用程式密碼這個選項）
   → <https://myaccount.google.com/signinoptions/two-step-verification>
2. 前往 <https://myaccount.google.com/apppasswords>
3. 應用程式名稱填 `機巧時運`，按「建立」
4. 畫面會顯示 **16 碼密碼**（像 `abcd efgh ijkl mnop`）——**只會出現這一次**，先複製起來

> 💡 中間的空白不用管，程式會自動去除。
> ⚠️ 這組密碼等同你的信箱寄信權限，**絕不可**寫進程式碼或 commit 進 Git。正式環境走 Secret Manager（§4）。

---

## 2. 本機測試（先確認能寄出）

PowerShell：

```powershell
$env:GMAIL_USER="你的帳號@gmail.com"
$env:GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
npm run mail:test -- 你要收信的信箱@gmail.com
```

成功會看到：

```
── 寄信設定 ──────────────────────────
  供應商 : gmail (已啟用)
  寄件者 : 機巧時運 <你的帳號@gmail.com>
──────────────────────────────────────
寄送測試信到 xxx@gmail.com …
✅ 已送出（gmail）。請到收件匣確認——沒看到請檢查垃圾信匣。
```

失敗看到 `535` → 幾乎都是用到「Google 帳號密碼」而不是「應用程式密碼」，回 §1 重做。

---

## 3. 關於寄件者地址

Gmail **只允許用已驗證的身分寄信**。若你把 `MAIL_FROM` 設成 `noreply@chengqi.tw` 但登入的是 Gmail 帳號，
Google 會直接把寄件者改寫掉。所以程式已做保護：**自動把寄件地址對齊成 `GMAIL_USER`，只保留顯示名稱**。

實際效果：使用者收到的信會顯示 `機巧時運 <你的帳號@gmail.com>`。

想改顯示名稱：

```powershell
$env:MAIL_FROM="機巧時運 <任意值會被自動換成 GMAIL_USER>"   # 顯示名稱「機巧時運」會保留
$env:MAIL_REPLY_TO="chengqi1943@gmail.com"                        # 使用者按「回覆」時寄到這（建議設）
```

---

## 4. 部署到 Cloud Run

在 **Cloud Shell** 執行：

```bash
# 1) 把應用程式密碼存進 Secret Manager
printf 'abcdefghijklmnop' | gcloud secrets create jiqiao-gmail-pass --data-file=-
# 已存在要更新時改用：
# printf 'newpassword' | gcloud secrets versions add jiqiao-gmail-pass --data-file=-

# 2) 授權 Cloud Run 讀取
PROJECT_NUMBER="$(gcloud projects describe "$(gcloud config get-value project)" --format='value(projectNumber)')"
gcloud secrets add-iam-policy-binding jiqiao-gmail-pass \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 3) 掛到服務上
gcloud run services update jiqiao --region=asia-east1 \
  --set-secrets=GMAIL_APP_PASSWORD=jiqiao-gmail-pass:latest \
  --update-env-vars=GMAIL_USER=你的帳號@gmail.com,MAIL_FROM='機巧時運 <你的帳號@gmail.com>'
```

或直接用一鍵腳本（會自動建 Secret 並掛上）：

```bash
export GMAIL_USER="你的帳號@gmail.com"
export GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
bash deploy/deploy.sh
```

### 確認上線後真的能寄
1. 開 <https://chengqi.tw/api/health> → 應看到 `"mail":"gmail"`（若是 `"mail":"log"` 表示沒吃到設定）
2. 或用管理者帳號登入 → **設定 → 管理後台 → 系統狀態** → 填信箱按「📬 寄一封測試信」

---

## 5. 升級：用 `noreply@chengqi.tw` 寄信（Google Workspace）

當你想要正式的寄件地址時：

1. 申請 [Google Workspace](https://workspace.google.com/)（Business Starter 約 NT$220/使用者/月），驗證 `chengqi.tw` 網域
2. 管理主控台 → **應用程式 → Gmail → 路由 → SMTP 中繼服務**，新增允許的寄件 IP／驗證方式
3. 設定改成通用 SMTP 模式：

```bash
gcloud run services update jiqiao --region=asia-east1 \
  --set-secrets=SMTP_PASS=jiqiao-smtp-pass:latest \
  --update-env-vars=SMTP_HOST=smtp-relay.gmail.com,SMTP_PORT=465,SMTP_USER=noreply@chengqi.tw,MAIL_FROM='機巧時運 <noreply@chengqi.tw>'
```

程式會自動改用 `smtp` 供應商，其餘完全不用動。

> 不想付月費又想用自家網域？可改用免費的第三方（見 §6），但一樣需要在 DNS 加 SPF/DKIM 記錄。

---

## 6. 其他可選供應商（不用 Google 時）

程式同時支援這些，設對應的環境變數即可自動切換，**不需改碼**：

| 供應商 | 環境變數 | 免費額度 |
| --- | --- | --- |
| Resend | `RESEND_API_KEY` | 3,000 封/月 |
| SendGrid | `SENDGRID_API_KEY` | 100 封/日 |
| Brevo | `BREVO_API_KEY` | 300 封/日 |
| Mailgun | `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` | 需綁卡 |

這些可用自家網域寄件，但都要在 DNS 加 SPF/DKIM 記錄驗證網域。

---

## 7. 環境變數一覽

| 變數 | 說明 |
| --- | --- |
| `GMAIL_USER` | 你的 Gmail 完整地址 |
| `GMAIL_APP_PASSWORD` | 16 碼應用程式密碼（**不是**帳號密碼） |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | 通用 SMTP（Workspace 中繼或其他主機）。埠預設 465（隱式 TLS），587 會自動走 STARTTLS |
| `MAIL_FROM` | 寄件者 `名稱 <地址>`；用 Gmail 時地址會自動對齊成 `GMAIL_USER` |
| `MAIL_REPLY_TO` | （建議）使用者按「回覆」時的收件地址 |
| `MAIL_PROVIDER` | （選用）強制指定 `gmail`/`smtp`/`resend`/`sendgrid`/`brevo`/`mailgun`；不設就自動偵測 |
| `APP_URL` | **重要**：信中連結的網址前綴，正式站必須是 `https://chengqi.tw` |

> ⚠️ `APP_URL` 沒設對的話，驗證信裡的連結會指向 localhost，使用者點了沒反應。

---

## 8. 系統會寄出哪些信

| 觸發時機 | 主旨 | 連結有效期 |
| --- | --- | --- |
| 註冊成功 | 請驗證你的機巧時運帳號 | 24 小時、限用一次 |
| 點「重寄驗證信」 | 同上 | 24 小時、限用一次 |
| 忘記密碼 | 重設你的機巧時運密碼 | **1 小時**、限用一次 |
| 下單完成 | 訂單確認 JQ-YYMMDD-NN（NT$xxx） | — |

信件為統一品牌樣板（宣紙底、朱紅印章標頭），HTML＋純文字雙版本、零外部資源（不會被郵件軟體擋圖）。
想改文案／樣式 → `server/mailer.js` 的 `TEMPLATES` 與 `render()`。

---

## 9. 疑難排解

| 症狀 | 原因與解法 |
| --- | --- |
| `535 Username and Password not accepted` | 用到 Google 帳號密碼了。要用 §1 的**應用程式密碼**；且帳號必須已開兩步驟驗證 |
| 啟動 log 出現「缺少 GMAIL_USER」 | 只設了密碼沒設帳號，兩個都要設 |
| `/api/health` 顯示 `"mail":"log"` | 設定沒吃到。檢查 Secret 是否掛上、變數名拼字、服務是否已重新部署 |
| 收件者顯示的寄件者不是我設的 | 正常：Gmail 只能用登入帳號寄信，程式已自動對齊（見 §3）。要自訂網域請看 §5 |
| 信進垃圾信匣 | Gmail 寄自個人帳號較容易被歸類；正式上線建議升級 Workspace 或用第三方＋SPF/DKIM |
| 一天寄超過 500 封被擋 | Gmail 免費帳號上限。需要更多請升級 Workspace（10,000/日） |
| 信中連結指向 localhost | `APP_URL` 沒設成 `https://chengqi.tw` |
| 註冊沒收到信但也沒報錯 | 這是設計：寄信在背景進行，失敗不擋註冊。到 log 搜 `[mail]` 看原因 |

查看寄信記錄：

```bash
gcloud run services logs read jiqiao --region=asia-east1 --limit=50 | grep mail
```
