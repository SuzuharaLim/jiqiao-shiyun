// 郵件寄送 —— 開發模式不真的寄信，改記到 log 並回傳連結供前端顯示。
// 正式版請改接 SendGrid / Amazon SES / Mailgun（用環境變數放 API Key，勿寫死）。
const isProd = process.env.NODE_ENV === 'production'

export function sendMail({ to, subject, link }) {
  // 稽核安全：log 不含密碼/完整 session；驗證連結為一次性且有時效
  console.log(`[mail] to=${to} subject="${subject}" link=${link}`)
  // 非正式環境把連結回傳，前端可直接顯示「點此驗證/重設」（方便 demo，無需真信箱）
  return { devLink: isProd ? undefined : link }
}
