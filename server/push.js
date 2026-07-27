// Web Push 推播 —— 零第三方相依，只用 node 內建 crypto。
//
// 為什麼自己寫：web-push 套件會拉進一堆傳遞相依，而 Web Push 的規格其實只需要
// 三件事——(1) VAPID JWT 簽章（ES256）、(2) ECDH 產生共享密鑰、(3) AES-128-GCM
// 加密內容。node 的 crypto 全部內建，所以自寫比裝套件更小也更好審。
//
// 規格依據：RFC 8291（Message Encryption）、RFC 8292（VAPID）。
// 加密採 aes128gcm content-encoding（現行瀏覽器都支援，取代舊的 aesgcm）。
//
// ⚠️ 需要 VAPID 金鑰對才會真的送出。未設定時 sendPush() 只 log 不送，
// 與 mailer.js 的行為一致（本機開發不需要金鑰也能跑）。
// 產生金鑰：npm run push:keys

import crypto from 'crypto'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@chengqi.tw'

export const pushEnabled = () => !!(VAPID_PUBLIC && VAPID_PRIVATE)
export const publicKey = () => VAPID_PUBLIC

// ── base64url 工具 ──
const b64u = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (str) => Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64')

// ── 產生 VAPID 金鑰對（供 npm run push:keys 使用）──
export function generateKeys() {
  const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  // 公鑰取未壓縮點格式（0x04 || X || Y），共 65 bytes
  const pubRaw = pub.export({ type: 'spki', format: 'der' }).subarray(-65)
  const privRaw = priv.export({ type: 'pkcs8', format: 'der' }).subarray(36, 68)   // 32 bytes 私鑰
  return { publicKey: b64u(pubRaw), privateKey: b64u(privRaw) }
}

// ── 由 raw 私鑰還原成 KeyObject（用於簽章與 ECDH）──
function privateKeyFromRaw(rawPriv, rawPub) {
  // 組 PKCS#8 DER：SEQUENCE 包 version / algorithm / privateKey(含 publicKey)
  const der = Buffer.concat([
    Buffer.from('308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420', 'hex'),
    rawPriv,
    Buffer.from('a144034200', 'hex'),
    rawPub,
  ])
  return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
}

// ── VAPID JWT（ES256）──
function vapidHeaders(audience) {
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const payload = b64u(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,   // 12 小時（規格上限 24）
    sub: VAPID_SUBJECT,
  }))
  const unsigned = `${header}.${payload}`
  const key = privateKeyFromRaw(unb64u(VAPID_PRIVATE), unb64u(VAPID_PUBLIC))
  // ES256 需要 raw (r||s) 而非 DER 編碼的簽章
  const sig = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' })
  return {
    Authorization: `vapid t=${unsigned}.${b64u(sig)}, k=${VAPID_PUBLIC}`,
  }
}

// ── HKDF（RFC 5869）——node 有內建但介面較繞，這裡直接用 HMAC 實作 ──
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest()
function hkdf(salt, ikm, info, length) {
  const prk = hmac(salt, ikm)
  return hmac(prk, Buffer.concat([info, Buffer.from([1])])).subarray(0, length)
}

// ── 內容加密（RFC 8291 aes128gcm）──
function encrypt(payload, clientPub, clientAuth) {
  const salt = crypto.randomBytes(16)
  // 伺服器端臨時金鑰對
  const eph = crypto.createECDH('prime256v1')
  eph.generateKeys()
  const sharedSecret = eph.computeSecret(clientPub)

  // PRK：以 client 的 auth secret 當 salt，把共享密鑰與雙方公鑰綁進 info
  const authInfo = Buffer.concat([
    Buffer.from('WebPush: info\0'), clientPub, eph.getPublicKey(),
  ])
  const ikm = hkdf(clientAuth, sharedSecret, authInfo, 32)

  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16)
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12)

  // 內容後面要補一個 0x02 分隔符（表示最後一個 record）
  const padded = Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])])
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const body = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()])

  // aes128gcm 的 header：salt(16) || rs(4, big-endian) || idlen(1) || keyid
  const ephPub = eph.getPublicKey()
  const header = Buffer.concat([
    salt,
    Buffer.from([0, 0, 0x10, 0]),        // record size 4096
    Buffer.from([ephPub.length]),
    ephPub,
  ])
  return Buffer.concat([header, body])
}

// ── 送出單一推播 ──
// 回傳 { ok, status, gone }。gone=true 表示訂閱已失效，呼叫端應刪除該筆。
export async function sendPush(sub, data) {
  if (!pushEnabled()) {
    console.log(`[push] (未設 VAPID 金鑰，僅記錄) → ${String(sub.endpoint).slice(0, 60)}… ${JSON.stringify(data).slice(0, 80)}`)
    return { ok: false, skipped: true }
  }
  try {
    const url = new URL(sub.endpoint)
    const body = encrypt(JSON.stringify(data), unb64u(sub.p256dh), unb64u(sub.auth))
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        ...vapidHeaders(`${url.protocol}//${url.host}`),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: data.urgency || 'normal',
      },
      body,
    })
    // 404/410 ＝ 訂閱已失效（使用者移除了通知權限或換了裝置）
    const gone = res.status === 404 || res.status === 410
    if (!res.ok) console.warn(`[push] ${res.status} ${res.statusText} → ${url.host}`)
    return { ok: res.ok, status: res.status, gone }
  } catch (e) {
    console.error('[push] 送出失敗:', e.message)
    return { ok: false, error: e.message }
  }
}

// ── 批次送出，並回報哪些訂閱該刪 ──
export async function sendPushToAll(subs, data) {
  const results = await Promise.all(subs.map(s => sendPush(s, data)))
  return {
    sent: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok && !r.skipped).length,
    goneIds: subs.filter((s, i) => results[i].gone).map(s => s.id),
  }
}

export function pushStatus() {
  return { enabled: pushEnabled(), publicKey: VAPID_PUBLIC ? VAPID_PUBLIC.slice(0, 12) + '…' : null }
}
