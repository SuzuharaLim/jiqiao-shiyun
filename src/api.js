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
  // 社群內容（真實資料庫）
  posts: (term) => req('/posts' + (term ? `?term=${encodeURIComponent(term)}` : '')),
  post: (id) => req('/posts/' + encodeURIComponent(id)),
  createPost: (b) => req('/posts', { method: 'POST', body: b }),
  likePost: (id) => req(`/posts/${encodeURIComponent(id)}/like`, { method: 'POST' }),
  addComment: (id, body) => req(`/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: { body } }),
  works: (term) => req('/works' + (term && term !== '全部' ? `?term=${encodeURIComponent(term)}` : '')),
  work: (id) => req('/works/' + encodeURIComponent(id)),
  createWork: (b) => req('/works', { method: 'POST', body: b }),
  leaderboard: () => req('/leaderboard'),
  uploadImage: (dataUrl) => req('/images', { method: 'POST', body: { data: dataUrl } }),
  userProfile: (handle) => req('/users/' + encodeURIComponent(handle)),
  follow: (b) => req('/follow', { method: 'POST', body: b }),
  followers: (handle) => req('/users/' + encodeURIComponent(handle) + '/followers'),
  following: (handle) => req('/users/' + encodeURIComponent(handle) + '/following'),
  notifications: () => req('/notifications'),
  notificationsRead: () => req('/notifications/read', { method: 'POST' }),
  deletePost: (id) => req('/posts/' + encodeURIComponent(id), { method: 'DELETE' }),
  deleteComment: (id) => req('/comments/' + encodeURIComponent(id), { method: 'DELETE' }),
  deleteWork: (id) => req('/works/' + encodeURIComponent(id), { method: 'DELETE' }),
  report: (type, targetId, reason) => req('/reports', { method: 'POST', body: { type, targetId, reason } }),
  adminReports: () => req('/admin/reports'),
  resolveReport: (id, status) => req('/admin/reports/' + encodeURIComponent(id), { method: 'PATCH', body: { status } }),
  // 參考／編輯內容（種子灌入的清單）
  content: (kind) => req('/content/' + encodeURIComponent(kind)),
  // 帳號 handle 即時檢查 + Email 驗證
  handleAvailable: (h) => req('/handle-available?handle=' + encodeURIComponent(h)),
  resendEmail: () => req('/email/resend', { method: 'POST' }),
  // 地點：搜尋 / 常用位置
  placesSearch: (q) => req('/places/search?q=' + encodeURIComponent(q)),
  placesReverse: (lat, lon) => req(`/places/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`),
  myPlaces: () => req('/places'),
  savePlace: (b) => req('/places', { method: 'POST', body: b }),
  deletePlace: (id) => req('/places/' + encodeURIComponent(id), { method: 'DELETE' }),
  // 管理者：使用者/角色 + 內容 CMS
  adminUsers: () => req('/admin/users'),
  setUserRole: (id, role) => req(`/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: { role } }),
  adminContent: (kind) => req('/admin/content/' + encodeURIComponent(kind)),
  saveContent: (kind, id, data, sort = 0) => req(`/admin/content/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, { method: 'PUT', body: { data, sort } }),
  deleteContent: (kind, id) => req(`/admin/content/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  seedInfo: () => req('/admin/seed'),
  purgeSeed: () => req('/admin/seed', { method: 'DELETE' }),
  // 系統狀態 / 寄信測試（管理者）
  health: () => req('/health'),
  mailTest: (to) => req('/admin/mail-test', { method: 'POST', body: { to } }),
  // 金流（scaffold）
  payIntent: (b) => req('/payments/intent', { method: 'POST', body: b }),
  support: (b) => req('/support', { method: 'POST', body: b }),   // 客服／聯絡訊息（真的會送出）
  adminSupport: () => req('/admin/support'),   // 營運端讀客服訊息（moderator+）
  adminAudit: () => req('/admin/audit'),       // 稽核日誌（admin）
  // AI 時光顧問（後端代呼叫 OpenAI；未設金鑰時回 {fallback:true}）
  aiChat: (messages, context) => req('/ai/chat', { method: 'POST', body: { messages, context } }),
}
