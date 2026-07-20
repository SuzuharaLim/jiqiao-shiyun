// 寄信設定測試 —— 不用啟動伺服器、不用登入，直接驗證金鑰與寄件網域是否可用。
//
//   npm run mail:test -- you@example.com
//
// 本機（PowerShell）先設金鑰再跑：
//   $env:RESEND_API_KEY="re_xxx"; $env:MAIL_FROM="機巧時運 <noreply@chengqi.tw>"
//   npm run mail:test -- you@example.com
import { sendMail, mailStatus } from './mailer.js'

const to = process.argv[2]
const st = mailStatus()

console.log('── 寄信設定 ──────────────────────────')
console.log('  供應商 :', st.provider, st.enabled ? '(已啟用)' : '(未接，只會印 log 不會真的寄出)')
console.log('  寄件者 :', st.from)
if (st.error) console.log('  ⚠ 問題 :', st.error)
console.log('──────────────────────────────────────')

if (!st.enabled) {
  console.log('\n尚未設定寄信服務。請擇一設定環境變數後重試：')
  console.log('  RESEND_API_KEY / SENDGRID_API_KEY / MAILGUN_API_KEY(+MAILGUN_DOMAIN) / BREVO_API_KEY')
  console.log('設定教學：docs/寄信-Email設定.md')
  process.exit(1)
}
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error('\n用法：npm run mail:test -- you@example.com')
  process.exit(1)
}

console.log(`\n寄送測試信到 ${to} …`)
const { delivery } = sendMail({
  to, subject: '機巧時運 寄信測試 ✓',
  link: (process.env.APP_URL || 'https://chengqi.tw') + '/', kind: 'generic',
})
const r = await delivery

if (r.sent) {
  console.log(`\n✅ 已送出（${r.provider}）。請到收件匣確認——沒看到請檢查垃圾信匣。`)
  process.exit(0)
}
console.error('\n❌ 寄送失敗：', r.body || r.reason || JSON.stringify(r))
if (st.provider === 'gmail' || st.provider === 'smtp') {
  console.error(`
常見原因（SMTP）：
  • 535 帳密錯 → 用的是「應用程式密碼」而非 Google 帳號密碼嗎？
    產生位置：https://myaccount.google.com/apppasswords（需先開啟兩步驟驗證）
  • GMAIL_USER 要填完整地址（例：yourname@gmail.com）
  • 應用程式密碼是 16 碼，複製時的空白會自動去除，不必手動處理`)
} else {
  console.error('常見原因：金鑰錯誤／MAIL_FROM 的網域尚未在供應商完成驗證／免費方案僅能寄給已驗證信箱。')
}
process.exit(1)
