// 認證 API 用戶端：同源、自動帶 Cookie（credentials）、對變更請求帶 CSRF header。
// 敏感憑證（session）在 HttpOnly Cookie 內，JS 讀不到；此處只保存非敏感的 csrf token。
let csrf = null
export const setCsrf = (t) => { csrf = t }

const TIMEOUT_MS = 12000   // 請求逾時：避免慢網路無限轉圈

async function req(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (method !== 'GET' && csrf) headers['x-csrf-token'] = csrf
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch('/api' + path, {
      method, credentials: 'include', headers, signal: ctrl.signal,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    // 網路層錯誤（斷線/DNS/逾時）→ 統一友善訊息，不丟英文 TypeError 給使用者
    const msg = e?.name === 'AbortError' ? '連線逾時，請檢查網路後再試' : '網路連線異常，請稍後再試'
    throw Object.assign(new Error(msg), { network: true })
  } finally {
    clearTimeout(timer)
  }
  let data = null
  try { data = await res.json() } catch { /* 無 body */ }
  if (!res.ok) throw Object.assign(new Error(data?.error || '發生錯誤，請稍後再試'), { status: res.status, data })
  return data
}

export const api = {
  me: () => req('/me'),
  register: (b) => req('/register', { method: 'POST', body: b }),
  login: (b) => req('/login', { method: 'POST', body: b }),
  logout: () => req('/logout', { method: 'POST' }),
  logoutAll: () => req('/logout-all', { method: 'POST' }),
  sessions: () => req('/sessions'),
  forgot: (b) => req('/password/forgot', { method: 'POST', body: b }),
  reset: (b) => req('/password/reset', { method: 'POST', body: b }),
  changePassword: (b) => req('/password/change', { method: 'POST', body: b }),
  verifyEmail: (b) => req('/verify-email', { method: 'POST', body: b }),
  deleteAccount: (b) => req('/account', { method: 'DELETE', body: b }),
  exportAccount: () => req('/account/export'),
  orders: () => req('/orders'),
  createOrder: (b) => req('/orders', { method: 'POST', body: b }),
  updateProfile: (b) => req('/me', { method: 'PATCH', body: b }),
}
