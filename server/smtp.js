// 極簡 SMTP 寄信用戶端 —— 零相依（只用 Node 內建 net / tls / crypto）。
//
// 為什麼自己寫：本專案慣例是不加第三方相依；SMTP 送信協定本身很單純（不需收信/IMAP）。
// 支援：465 隱式 TLS（預設，較單純）／587 STARTTLS；AUTH PLAIN 與 LOGIN；
//       UTF-8 主旨與內文（RFC 2047 標頭編碼）；HTML＋純文字雙版本（multipart/alternative）。
//
// ★ Cloud Run 只封鎖 25 埠，465/587 可正常對外連線，故 Gmail SMTP 在 Cloud Run 可用。
import net from 'node:net'
import tls from 'node:tls'
import crypto from 'node:crypto'

const CRLF = '\r\n'

// RFC 2047：含非 ASCII 的標頭（中文主旨/顯示名）必須編碼，否則會變亂碼
const encodeHeader = (s) => /^[\x20-\x7E]*$/.test(String(s)) ? String(s)
  : '=?UTF-8?B?' + Buffer.from(String(s), 'utf8').toString('base64') + '?='

// 內文一律 base64（避免 SMTP 每行 1000 字元上限，也免去 dot-stuffing 問題——base64 字元集不含 '.'）
const b64Body = (s) => Buffer.from(String(s ?? ''), 'utf8').toString('base64').replace(/(.{76})/g, '$1' + CRLF)

export function parseAddr(s) {
  const m = String(s).match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  return m ? { name: m[1] || '', email: m[2].trim() } : { name: '', email: String(s).trim() }
}
const fmtAddr = ({ name, email }) => (name ? `${encodeHeader(name)} <${email}>` : email)

// RFC 2822 日期：Sat, 18 Jul 2026 12:00:00 +0000
function rfc2822Date(d = new Date()) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const p = (n) => String(n).padStart(2, '0')
  return `${days[d.getUTCDay()]}, ${p(d.getUTCDate())} ${mons[d.getUTCMonth()]} ${d.getUTCFullYear()} `
    + `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`
}

/** 組出符合 RFC 的信件內容（headers + multipart/alternative 內文） */
export function buildMessage({ from, to, subject, html, text, replyTo }) {
  const f = parseAddr(from), t = parseAddr(to)
  const boundary = 'jq_' + crypto.randomBytes(12).toString('hex')
  const head = [
    `From: ${fmtAddr(f)}`,
    `To: ${fmtAddr(t)}`,
    `Subject: ${encodeHeader(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${f.email.split('@')[1] || 'localhost'}>`,
    `Date: ${rfc2822Date()}`,
    'MIME-Version: 1.0',
    ...(replyTo ? [`Reply-To: ${parseAddr(replyTo).email}`] : []),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
  const body = [
    '', `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64', '',
    b64Body(text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64', '',
    b64Body(html),
    `--${boundary}--`, '',
  ]
  return head.join(CRLF) + body.join(CRLF)
}

// 讀取 SMTP 回應（可能多行：250-XXX / 250-YYY / 250 ZZZ，最後一行的碼後面是空格）
function makeReader(sock) {
  let buf = '', pending = null, failure = null
  const settle = () => {
    if (!pending) return
    if (failure) { const p = pending; pending = null; p.reject(failure); return }
    const m = buf.match(/^(?:\d{3}-[^\n]*\n)*(\d{3}) [^\n]*\n/)
    if (!m) return
    const raw = buf.slice(0, m[0].length)
    buf = buf.slice(m[0].length)
    const p = pending; pending = null
    p.resolve({ code: Number(m[1]), text: raw.trim() })
  }
  const onData = (d) => { buf += d.toString('utf8'); settle() }
  const onErr = (e) => { failure = e; settle() }
  const onClose = () => { if (!failure) failure = new Error('SMTP 連線被對方關閉'); settle() }
  sock.on('data', onData); sock.on('error', onErr); sock.on('close', onClose)
  return {
    read: () => new Promise((resolve, reject) => { pending = { resolve, reject }; settle() }),
    detach: () => { sock.off('data', onData); sock.off('error', onErr); sock.off('close', onClose) },
  }
}

function connect({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const sock = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(sock))
      : net.connect({ host, port }, () => resolve(sock))
    sock.once('error', reject)
  })
}

/**
 * 透過 SMTP 寄出一封信。
 * @param {{host:string, port?:number, secure?:boolean, user:string, pass:string,
 *          from:string, to:string, subject:string, html:string, text:string,
 *          replyTo?:string, timeoutMs?:number}} o
 */
export async function smtpSendMail(o) {
  const port = o.port || 465
  const secure = o.secure !== undefined ? o.secure : port === 465   // 465＝隱式 TLS；587＝先明文再 STARTTLS
  const timeoutMs = o.timeoutMs || 20000
  const envelopeFrom = parseAddr(o.from).email
  const rcptTo = parseAddr(o.to).email
  const clientName = envelopeFrom.split('@')[1] || 'localhost'

  let sock = await connect({ host: o.host, port, secure })
  sock.setTimeout(timeoutMs, () => sock.destroy(new Error('SMTP 逾時')))
  let rd = makeReader(sock)

  // 送出指令並檢查回應碼；錯誤訊息只取指令動詞（避免把密碼寫進 log）
  const cmd = async (line, expect) => {
    if (line !== null) sock.write(line + CRLF)
    const r = await rd.read()
    if (expect && !expect.includes(r.code)) {
      const verb = line === null ? '連線' : line.split(' ')[0]
      throw Object.assign(new Error(`SMTP ${verb} 失敗（${r.code}）：${r.text}`), { code: r.code })
    }
    return r
  }

  try {
    await cmd(null, [220])                                  // 伺服器歡迎詞
    let ehlo = await cmd(`EHLO ${clientName}`, [250])

    if (!secure) {                                          // 587：升級成 TLS
      await cmd('STARTTLS', [220])
      rd.detach()
      const plain = sock
      sock = tls.connect({ socket: plain, servername: o.host })
      await new Promise((res, rej) => { sock.once('secureConnect', res); sock.once('error', rej) })
      sock.setTimeout(timeoutMs, () => sock.destroy(new Error('SMTP 逾時')))
      rd = makeReader(sock)
      ehlo = await cmd(`EHLO ${clientName}`, [250])         // TLS 後必須重新 EHLO
    }

    if (/AUTH[^\n]*PLAIN/i.test(ehlo.text)) {
      await cmd('AUTH PLAIN ' + Buffer.from(`\0${o.user}\0${o.pass}`, 'utf8').toString('base64'), [235])
    } else {
      await cmd('AUTH LOGIN', [334])
      await cmd(Buffer.from(o.user, 'utf8').toString('base64'), [334])
      await cmd(Buffer.from(o.pass, 'utf8').toString('base64'), [235])
    }

    await cmd(`MAIL FROM:<${envelopeFrom}>`, [250])
    await cmd(`RCPT TO:<${rcptTo}>`, [250, 251])
    await cmd('DATA', [354])

    let msg = buildMessage(o)
    if (!msg.endsWith(CRLF)) msg += CRLF
    sock.write(msg + '.' + CRLF)                            // 單獨一行 '.' 表示內文結束
    const done = await rd.read()
    if (done.code !== 250) throw Object.assign(new Error(`SMTP 內文遭拒（${done.code}）：${done.text}`), { code: done.code })

    try { await cmd('QUIT', [221]) } catch { /* 收尾失敗無妨，信已送出 */ }
    return { accepted: true, response: done.text }
  } finally {
    sock.destroy()
  }
}
