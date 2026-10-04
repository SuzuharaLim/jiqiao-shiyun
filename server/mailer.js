// 郵件寄送 —— 交易信（Email 驗證 / 重設密碼 / 訂單確認）。
//
// ★ 未設任何金鑰 → 維持開發行為：只在 log 印出連結、回傳 devLink 供前端顯示（無需真信箱即可 demo）。
// ★ 設了金鑰    → 真的寄出（SMTP 走自寫的 smtp.js、HTTP API 走 Node 內建 fetch，皆零第三方相依）。
//
// 支援：Gmail SMTP／任意 SMTP 主機／Resend／SendGrid／Mailgun／Brevo。
// 金鑰一律走環境變數（正式用 Secret Manager），勿寫死。
// 設定教學見 docs/寄信-Email設定.md
//
// 設計重點：
//   * sendMail() 維持「同步回傳」介面（呼叫端 const { devLink } = sendMail(...) 不需改），
//     真正的 HTTP 送信在背景進行（fire-and-forget）—— 註冊/下單不會被供應商的延遲卡住。
//   * 送信失敗只記 log 不拋錯：交易信失敗不該讓使用者的註冊/下單整個失敗。
//   * 同時送 HTML 與純文字版本（純文字版對送達率與無障礙都重要）。

import { smtpSendMail } from './smtp.js'

const isProd = process.env.NODE_ENV === 'production'
const FROM = process.env.MAIL_FROM || '機巧時運 <noreply@chengqi.tw>'
const REPLY_TO = process.env.MAIL_REPLY_TO || ''
const BRAND = '機巧時運'
const TIMEOUT_MS = 12000

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// "機巧時運 <noreply@chengqi.tw>" → { name, email }
function parseFrom(s) {
  const m = String(s).match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  return m ? { name: m[1] || undefined, email: m[2].trim() } : { email: String(s).trim() }
}

// ---------- 信件內容（依 kind 決定文案）----------
const TEMPLATES = {
  verify: {
    heading: '驗證你的 Email',
    body: '歡迎加入機巧時運！點下方按鈕完成 Email 驗證，即可解鎖發文、購買與跨裝置同步。',
    cta: '驗證我的 Email',
    note: '此連結 24 小時內有效，僅能使用一次。若非你本人註冊，請忽略這封信。',
  },
  reset: {
    heading: '重設你的密碼',
    body: '我們收到你的密碼重設要求。點下方按鈕設定新密碼；完成後其他裝置會自動登出。',
    cta: '重設密碼',
    note: '此連結 1 小時內有效，僅能使用一次。若非你本人操作，請忽略這封信，你的密碼不會被變更。',
  },
  order: {
    heading: '訂單確認',
    body: '感謝你的訂購！我們已收到你的訂單，可於「我的訂單」查看處理進度與授權下載。',
    cta: '查看我的訂單',
    note: '如對訂單有任何疑問，直接回覆這封信即可與我們聯繫。',
  },
  // 桌曆客製（2026-10-04）。⚠️ 「3 個工作天」與 src/data/calendarRules.js 的 REPLY_WORKDAYS 一致，改一邊要改兩邊。
  calInquiry: {
    heading: '我們收到你的桌曆客製洽詢了',
    body: '謝謝你用機巧時運設計桌曆！你的設計已經傳到我們這邊，我們會在 3 個工作天內與你聯絡，確認數量、規格與報價。這是洽詢不是訂單，報價確認之前不會收取任何費用。',
    cta: '查看我的設計',
    note: '印刷顏色以實際打樣為準；國定假日以政府公告為準。若有問題，直接回覆這封信即可。',
  },
  calStaff: {
    heading: '新的桌曆客製洽詢',
    body: '有客人送出了桌曆客製洽詢。設計、聯絡方式與印刷用原圖都在管理後台的「客製洽詢」分頁。我們對客人承諾 3 個工作天內聯絡。',
    cta: '打開管理後台',
    note: '',
  },
  calReminder: {
    heading: '你的桌曆設計即將被清除',
    body: '你有一份桌曆設計已經將近 90 天沒有動過，7 天後會自動清除。想保留的話，打開它隨便改一個地方就會重新計時。',
    cta: '打開我的設計',
    note: '',
  },
  generic: { heading: BRAND, body: '', cta: '前往機巧時運', note: '' },
}

// export 供預覽/測試用（npm run mail:preview 產生 HTML 檔可直接開來看）
export function render({ kind, subject, link }) {
  const t = TEMPLATES[kind] || TEMPLATES.generic
  const heading = esc(t.heading || subject)
  const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#efe7d4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe7d4;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#f7f1e3;border:1px solid #ded2b4;border-radius:14px;overflow:hidden;">
      <!-- 印章式標頭 -->
      <tr><td style="background:#2b2b2b;padding:20px 24px;text-align:center;">
        <div style="display:inline-block;background:#c0392b;color:#f7f1e3;font-size:15px;font-weight:700;letter-spacing:4px;padding:8px 14px;border-radius:6px;font-family:'Songti TC','SimSun',serif;">機巧時運</div>
      </td></tr>
      <tr><td style="padding:28px 26px 8px;font-family:'Songti TC','SimSun',Georgia,serif;">
        <h1 style="margin:0 0 14px;font-size:21px;color:#2b2b2b;font-weight:700;letter-spacing:1px;">${heading}</h1>
        <p style="margin:0 0 22px;font-size:14.5px;line-height:1.9;color:#4a4235;font-family:-apple-system,'Segoe UI','Noto Sans TC',sans-serif;">${esc(t.body)}</p>
      </td></tr>
      <tr><td align="center" style="padding:0 26px 24px;">
        <a href="${esc(link)}" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 34px;border-radius:9px;font-family:-apple-system,'Segoe UI','Noto Sans TC',sans-serif;">${esc(t.cta)}</a>
      </td></tr>
      <tr><td style="padding:0 26px 22px;">
        <p style="margin:0 0 10px;font-size:12px;line-height:1.8;color:#8a7f6d;font-family:-apple-system,'Segoe UI','Noto Sans TC',sans-serif;">${esc(t.note)}</p>
        <p style="margin:0;font-size:11.5px;line-height:1.7;color:#8a7f6d;font-family:-apple-system,'Segoe UI','Noto Sans TC',sans-serif;">
          按鈕無法點擊？請複製下列網址貼到瀏覽器：<br>
          <span style="color:#7a6a52;word-break:break-all;">${esc(link)}</span>
        </p>
      </td></tr>
      <tr><td style="border-top:1px solid #e2d8bf;padding:16px 26px;text-align:center;">
        <p style="margin:0;font-size:11px;line-height:1.7;color:#9c917e;font-family:-apple-system,'Segoe UI','Noto Sans TC',sans-serif;">
          ${BRAND}　智慧互動國民曆 × 節氣攝影社群<br>此為系統自動發送的交易信件。
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

  const text = [
    `【${BRAND}】${t.heading || subject}`, '',
    t.body, '',
    `${t.cta}：`, link, '',
    t.note, '',
    `— ${BRAND}（系統自動發送）`,
  ].filter(x => x !== undefined).join('\n')

  return { html, text }
}

// ---------- 供應商 ----------
// 兩種機制並存，介面統一回傳 { ok, status?, body?, retryable? }：
//   * SMTP（Gmail／Google Workspace 中繼／任何 SMTP 主機）—— 用自寫的 server/smtp.js，零相依
//   * HTTP API（Resend／SendGrid／Mailgun／Brevo）—— 用 Node 內建 fetch
// ★ Cloud Run 只封鎖 25 埠，465/587 可正常連出，故 SMTP 在 Cloud Run 可用。
const httpResult = async (res) => ({
  ok: res.ok, status: res.status,
  body: res.ok ? '' : (await res.text().catch(() => '')).slice(0, 300),
  retryable: res.status === 429 || res.status >= 500,
})

async function sendViaSmtp({ host, port, user, pass, from, to, subject, html, text }) {
  try {
    const r = await smtpSendMail({ host, port, user, pass, from, to, subject, html, text, replyTo: REPLY_TO, timeoutMs: TIMEOUT_MS })
    return { ok: true, body: r.response }
  } catch (e) {
    // ⚠ SMTP 的錯誤碼語意與 HTTP 相反：4xx＝暫時性（可重試），5xx＝永久失敗（如 535 帳密錯，重試無用）。
    const code = e.code || 0
    return { ok: false, status: code, body: e.message, retryable: !code || (code >= 400 && code < 500) }
  }
}

const PROVIDERS = {
  // ── Google：Gmail SMTP（免費 500 封/日，寄件者＝你的 Gmail 地址）──────────
  // 需先開啟兩步驟驗證並建立「應用程式密碼」：https://myaccount.google.com/apppasswords
  gmail: {
    env: 'GMAIL_APP_PASSWORD',
    check: () => process.env.GMAIL_USER ? null : '已設 GMAIL_APP_PASSWORD 但缺少 GMAIL_USER（你的 Gmail 地址）',
    from() {
      // Gmail 只允許以「驗證過的身分」寄出，From 位址與登入帳號不符會被 Google 改寫。
      // 這裡主動對齊：保留顯示名稱、位址換成登入帳號，避免使用者看到奇怪的寄件者。
      const want = parseFrom(FROM), user = process.env.GMAIL_USER
      if (want.email.toLowerCase() !== String(user).toLowerCase()) {
        return `${want.name || BRAND} <${user}>`
      }
      return FROM
    },
    send(key, msg) {
      return sendViaSmtp({
        host: 'smtp.gmail.com', port: 465,
        user: process.env.GMAIL_USER, pass: key.replace(/\s+/g, ''),   // 應用程式密碼常被複製成 4 組帶空白
        ...msg,
      })
    },
  },
  // ── 任意 SMTP 主機（如 Google Workspace 中繼 smtp-relay.gmail.com，可用自家網域寄件）──
  smtp: {
    env: 'SMTP_PASS',
    check: () => (process.env.SMTP_HOST && process.env.SMTP_USER) ? null : '已設 SMTP_PASS 但缺少 SMTP_HOST 或 SMTP_USER',
    send(key, msg) {
      return sendViaSmtp({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 465,
        user: process.env.SMTP_USER, pass: key,
        ...msg,
      })
    },
  },
  // ── HTTP API 供應商 ────────────────────────────────────────────────
  // https://resend.com —— 免費 3,000 封/月
  resend: {
    env: 'RESEND_API_KEY',
    async send(key, { to, subject, html, text, from }) {
      return httpResult(await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, html, text, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }))
    },
  },
  // https://sendgrid.com —— 免費 100 封/日
  sendgrid: {
    env: 'SENDGRID_API_KEY',
    async send(key, { to, subject, html, text, from }) {
      return httpResult(await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: parseFrom(from), subject,
          content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }],
          ...(REPLY_TO ? { reply_to: { email: REPLY_TO } } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }))
    },
  },
  // https://mailgun.com —— 需另設 MAILGUN_DOMAIN（歐盟區設 MAILGUN_BASE=https://api.eu.mailgun.net）
  mailgun: {
    env: 'MAILGUN_API_KEY',
    check: () => process.env.MAILGUN_DOMAIN ? null : '已設 MAILGUN_API_KEY 但缺少 MAILGUN_DOMAIN',
    async send(key, { to, subject, html, text, from }) {
      const base = process.env.MAILGUN_BASE || 'https://api.mailgun.net'
      const form = new URLSearchParams({ from, to, subject, text, html })
      if (REPLY_TO) form.set('h:Reply-To', REPLY_TO)
      return httpResult(await fetch(`${base}/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`api:${key}`).toString('base64') },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }))
    },
  },
  // https://brevo.com（原 Sendinblue）—— 免費 300 封/日
  brevo: {
    env: 'BREVO_API_KEY',
    async send(key, { to, subject, html, text, from }) {
      return httpResult(await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: parseFrom(from), to: [{ email: to }], subject, htmlContent: html, textContent: text,
          ...(REPLY_TO ? { replyTo: { email: REPLY_TO } } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }))
    },
  },
}

// 決定用哪家：MAIL_PROVIDER 指定優先；否則依上方順序自動偵測第一個設好金鑰的
function resolveProvider() {
  const pick = (name) => {
    const p = PROVIDERS[name]
    const key = process.env[p.env]
    if (!key) return null
    const missing = p.check?.()
    if (missing) return { name: null, error: missing }
    return { name, provider: p, key, from: p.from ? p.from() : FROM }
  }
  const want = (process.env.MAIL_PROVIDER || '').toLowerCase()
  if (want && want !== 'log') {
    if (!PROVIDERS[want]) return { name: null, error: `未知的 MAIL_PROVIDER：${want}` }
    return pick(want) || { name: null, error: `MAIL_PROVIDER=${want} 但未設 ${PROVIDERS[want].env}` }
  }
  for (const name of Object.keys(PROVIDERS)) {
    const r = pick(name)
    if (r) return r
  }
  return { name: null }
}

// 供 /api/health 與啟動檢查用
export function mailStatus() {
  const r = resolveProvider()
  return { enabled: !!r.name, provider: r.name || 'log', from: r.from || FROM, error: r.error }
}

async function deliver({ to, subject, html, text }) {
  const { name, provider, key, from, error } = resolveProvider()
  if (!name) { if (error) console.warn('[mail]', error); return { sent: false, reason: error || 'no-provider' } }

  // 失敗重試一次（限暫時性錯誤：連線問題 / 429 / 5xx；帳密錯等 4xx 重試無用）
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await provider.send(key, { to, subject, html, text, from })
      if (res.ok) {
        console.log(`[mail] sent via ${name} to=${to} subject="${subject}"`)
        return { sent: true, provider: name }
      }
      const willRetry = res.retryable && attempt === 1
      console.error(`[mail] ${name} 失敗 ${res.status || ''}${willRetry ? '（將重試）' : ''}: ${res.body}`)
      if (!willRetry) return { sent: false, status: res.status, body: res.body }
    } catch (e) {
      console.error(`[mail] ${name} 例外${attempt === 1 ? '（將重試）' : ''}: ${e.message}`)
      if (attempt === 2) return { sent: false, reason: e.message }
    }
    await new Promise(r => setTimeout(r, 800))
  }
  return { sent: false }
}

/**
 * 寄出交易信。
 * @param {{to:string, subject:string, link:string, kind?:'verify'|'reset'|'order'}} opts
 * @returns {{devLink?:string, provider:string, delivery:Promise}} devLink：未接供應商時回傳連結供前端顯示
 */
export function sendMail({ to, subject, link, kind = 'generic' }) {
  const { name } = resolveProvider()
  // 稽核安全：log 不含密碼/完整 session；連結為一次性且有時效
  console.log(`[mail] to=${to} subject="${subject}" provider=${name || 'log(未接寄信服務)'}${name ? '' : ` link=${link}`}`)

  let delivery = Promise.resolve({ sent: false, reason: 'no-provider' })
  if (name) {
    const { html, text } = render({ kind, subject, link })
    // 背景送出：不阻塞註冊/下單回應；失敗只記 log（交易信失敗不該讓主流程失敗）
    delivery = deliver({ to, subject, html, text }).catch(e => {
      console.error('[mail] 未預期錯誤:', e.message); return { sent: false, reason: e.message }
    })
  }

  return {
    // 已接供應商 → 不再回傳連結（避免正式環境把一次性連結洩漏到 API 回應）
    // 未接供應商 → 非正式環境回傳連結，前端可直接點（方便本機 demo）
    devLink: name ? undefined : (isProd ? undefined : link),
    provider: name || 'log',
    delivery,
  }
}

// 啟動時提示：正式環境卻沒接寄信服務 → 使用者會收不到驗證信
{
  const st = resolveProvider()
  if (st.error) console.warn('[warn] 寄信設定不完整：' + st.error)
  else if (isProd && !st.name) {
    console.warn('[warn] 正式環境未設定寄信服務（GMAIL_APP_PASSWORD 等）—— 驗證信／重設密碼信將不會寄出。見 docs/寄信-Email設定.md')
  }
}
