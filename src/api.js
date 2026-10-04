// 認證 API 用戶端：同源、自動帶 Cookie（credentials）、對變更請求帶 CSRF header。
// 敏感憑證（session）在 HttpOnly Cookie 內，JS 讀不到；此處只保存非敏感的 csrf token。
let csrf = null
export const setCsrf = (t) => { csrf = t }

const TIMEOUT_MS = 12000   // 請求逾時：避免慢網路無限轉圈

async function req(path, { method = 'GET', body, timeout = TIMEOUT_MS } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (method !== 'GET' && csrf) headers['x-csrf-token'] = csrf
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
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
  posts: (term, before) => {
    const q = new URLSearchParams()
    if (term) q.set('term', term)
    if (before) q.set('before', before)
    return req('/posts' + (q.toString() ? `?${q}` : ''))
  },
  post: (id) => req('/posts/' + encodeURIComponent(id)),
  createPost: (b) => req('/posts', { method: 'POST', body: b }),
  likePost: (id) => req(`/posts/${encodeURIComponent(id)}/like`, { method: 'POST' }),
  addComment: (id, body) => req(`/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: { body } }),
  termCounts: () => req('/works/term-counts'),
  postTermCounts: () => req('/posts/term-counts'),
  // 桌曆設計器（2026-10-04）
  calDesigns: () => req('/caldesigns'),
  calCreate: (design) => req('/caldesigns', { method: 'POST', body: { design } }),
  calGet: (id) => req('/caldesigns/' + encodeURIComponent(id)),
  calSave: (id, design) => req('/caldesigns/' + encodeURIComponent(id), { method: 'PATCH', body: { design } }),
  calDelete: (id) => req('/caldesigns/' + encodeURIComponent(id), { method: 'DELETE' }),
  calShare: (id) => req('/caldesigns/' + encodeURIComponent(id) + '/share', { method: 'POST' }),
  calUnshare: (id) => req('/caldesigns/' + encodeURIComponent(id) + '/share', { method: 'DELETE' }),
  calShared: (token) => req('/calshare/' + encodeURIComponent(token)),
  calInquiries: (id) => req('/caldesigns/' + encodeURIComponent(id) + '/inquiries'),
  calInquire: (id, b) => req('/caldesigns/' + encodeURIComponent(id) + '/inquiry', { method: 'POST', body: b }),
  // 原圖約 3 MB，手機網路上傳要比全站預設的 12 秒久
  calPrint: (inqId, page, b) => req(`/calinquiries/${encodeURIComponent(inqId)}/print/${page}`, { method: 'POST', body: b, timeout: 90000 }),
  calFinalize: (inqId, missing) => req(`/calinquiries/${encodeURIComponent(inqId)}/finalize`, { method: 'POST', body: { missing } }),
  adminCalInquiries: () => req('/admin/calinquiries'),
  adminCalUpdate: (id, b) => req('/admin/calinquiries/' + encodeURIComponent(id), { method: 'PATCH', body: b }),
  adminCalStorage: () => req('/admin/calstorage'),
  works: (term, before) => {
    const q = new URLSearchParams()
    if (term && term !== '全部') q.set('term', term)
    if (before) q.set('before', before)
    return req('/works' + (q.toString() ? `?${q}` : ''))
  },
  work: (id) => req('/works/' + encodeURIComponent(id)),
  createWork: (b) => req('/works', { method: 'POST', body: b }),
  leaderboard: () => req('/leaderboard'),
  uploadImage: (dataUrl) => req('/images', { method: 'POST', body: { data: dataUrl } }),
  userProfile: (handle) => req('/users/' + encodeURIComponent(handle)),
  follow: (b) => req('/follow', { method: 'POST', body: b }),
  followers: (handle) => req('/users/' + encodeURIComponent(handle) + '/followers'),
  following: (handle) => req('/users/' + encodeURIComponent(handle) + '/following'),
  // 節氣徽章（AR 小挑戰）。POST 接受 { ids } 陣列＝登入後合併本機紀錄。
  badges: () => req('/badges'),

  // ── 節氣知識王：真人對戰 ──
  // ⚠️ 這幾支**不需要登入**（訪客也要能對戰），身分靠伺服器發的 key 認。
  //    key 只在這一場有效，而且只動得了自己那一格。
  quizQueue: (name) => req('/quiz/queue', { method: 'POST', body: { name } }),
  quizPoll: (id, key) => req(`/quiz/match/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`),
  quizAnswer: (b) => req('/quiz/answer', { method: 'POST', body: b }),
  quizLeave: (b) => req('/quiz/leave', { method: 'POST', body: b }),
  earnBadges: (ids) => req('/badges', { method: 'POST', body: { ids } }),
  // 「裝上」名片要展示的徽章（最多 3 枚，伺服器會驗是不是真的持有）
  setBadgeSlots: (slots) => req('/me/badges', { method: 'PATCH', body: { slots } }),
  // 蓋今天的節氣印。⚠️ **不送任何參數**：今天是哪個節氣由伺服器算，
  //    前端唯一能決定的是「要不要呼叫」。
  stampTerm: () => req('/badges/checkin', { method: 'POST' }),
  // 公開名片（不需登入——名片就是給別人看的）
  card: (handle) => req('/card/' + encodeURIComponent(handle)),
  // ⚠️ 登錄單人賽成績。訪客會拿到 401，那是**常態不是故障**——
  //    呼叫端一律靜靜略過，不可跳錯誤提示。
  quizResult: (b) => req('/quiz/result', { method: 'POST', body: b }),
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
  aiTest: () => req('/admin/ai-test', { method: 'POST', timeout: 20000 }),   // AI 自我檢測（admin）
  // 金流（scaffold）
  payIntent: (b) => req('/payments/intent', { method: 'POST', body: b }),
  support: (b) => req('/support', { method: 'POST', body: b }),   // 客服／聯絡訊息（真的會送出）
  adminSupport: () => req('/admin/support'),   // 營運端讀客服訊息（moderator+）
  // ── 推播 ──
  pushKey: () => req('/push/key'),
  pushSubscribe: (b) => req('/push/subscribe', { method: 'POST', body: b }),
  pushUnsubscribe: (b) => req('/push/unsubscribe', { method: 'POST', body: b }),
  pushPrefs: () => req('/push/prefs'),
  setPushPrefs: (b) => req('/push/prefs', { method: 'PATCH', body: b }),
  pushTest: () => req('/push/test', { method: 'POST' }),
  // ── 分潤結算 ──
  ledger: (before) => req('/ledger' + (before ? `?before=${encodeURIComponent(before)}` : '')),
  requestPayout: () => req('/payouts', { method: 'POST' }),
  // ── 編輯／取消／撤回 ──
  editPost: (id, b) => req('/posts/' + id, { method: 'PATCH', body: b }),
  editWork: (id, b) => req('/works/' + id, { method: 'PATCH', body: b }),
  cancelOrder: (id, b) => req('/orders/' + id + '/cancel', { method: 'POST', body: b }),
  withdrawReport: (id) => req('/reports/' + id, { method: 'DELETE' }),
  adminAudit: () => req('/admin/audit'),       // 稽核日誌（admin）
  // AI 時光顧問（後端代呼叫 OpenAI；未設金鑰時回 {fallback:true}）
  //
  // ⚠️ 這條**不可以**用全站的 12 秒逾時：後端給 OpenAI 的上限是 25 秒，
  //    中文加上 max_tokens:500，尖峰時段超過 12 秒很常見。前端先中止的話，
  //    後端還在等、token 照扣，回來的內容直接丟掉——使用者的體感是
  //    「這 AI 有時候會變笨」，其實是好回覆被自己人掐掉了。
  //    串流之後改用兩段式逾時：首個位元組 20 秒，之後看「閒置」而不是總時長
  //    （已經在逐字吐出來的回覆，不該因為講得比較長就被砍掉）。
  // ⚠️ date＝「使用者正在看的那一天」（YYYY-MM-DD 或 null＝今天）。
  //    後端只拿它當日期用、所有數字仍自己算，所以不違反「不採用前端傳來的 context」。
  // ⚠️ persona＝AR 卡片角色的 objectId。後端只接**白名單**裡的 id，
  //    對應的系統提示由伺服器產生——前端送不進自由字串（prompt injection 的正門）。
  aiChatStream: async (messages, context, { onDelta, signal, date, persona } = {}) => {
    const headers = { 'Content-Type': 'application/json' }
    if (csrf) headers['x-csrf-token'] = csrf

    const ctrl = new AbortController()
    const abort = () => ctrl.abort()
    signal?.addEventListener('abort', abort)
    let timer = setTimeout(abort, 20000)                       // 首位元組逾時
    const bump = (ms) => { clearTimeout(timer); timer = setTimeout(abort, ms) }

    let res
    try {
      // ★★★ AR 卡片角色走**不需登入**的 /api/ar/talk：掃到卡片的人多半還沒
      //   註冊，走 /api/ai/chat 的話 requireAuth 會一律 401，模型從頭到尾不會
      //   被叫用。⚠️ 那支端點只吃白名單 persona，且有 IP 與每日總量上限。
      res = await fetch(persona ? '/api/ar/talk' : '/api/ai/chat', {
        method: 'POST', credentials: 'include', headers, signal: ctrl.signal,
        body: JSON.stringify(persona ? { messages, persona } : { messages, context, date }),
      })
    } catch (e) {
      clearTimeout(timer); signal?.removeEventListener('abort', abort)
      if (signal?.aborted) throw Object.assign(new Error('已停止'), { stopped: true })
      throw Object.assign(new Error(e?.name === 'AbortError' ? '顧問想太久了，換個問法或稍後再試' : '網路連線異常，請稍後再試'), { network: true })
    }

    // 短路情況（未設金鑰 fallback／婉拒／錯誤）後端仍回 JSON
    if (!res.headers.get('content-type')?.includes('text/event-stream')) {
      clearTimeout(timer); signal?.removeEventListener('abort', abort)
      let data = null
      try { data = await res.json() } catch { /* 無 body */ }
      if (!res.ok) throw Object.assign(new Error(data?.error || '發生錯誤，請稍後再試'), { status: res.status, data })
      return data || {}
    }

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = '', full = '', stopped = false
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        bump(20000)                                            // 有資料就續命（閒置逾時）
        buf += dec.decode(value, { stream: true })
        const events = buf.split('\n\n'); buf = events.pop() || ''
        for (const ev of events) {
          const line = ev.split('\n').find(l => l.startsWith('data:'))
          if (!line) continue
          let m; try { m = JSON.parse(line.slice(5).trim()) } catch { continue }
          if (m.error) throw Object.assign(new Error(m.error), { status: 502 })
          if (m.replace != null) { full = m.replace; onDelta?.(full, true) }   // 整段換掉（被守門攔下）
          else if (m.delta) { full += m.delta; onDelta?.(full, false) }
        }
      }
    } catch (e) {
      if (signal?.aborted) stopped = true                       // 使用者按了「停止」→ 保留已收到的內容
      else { clearTimeout(timer); signal?.removeEventListener('abort', abort); throw e }
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort)
      try { reader.cancel() } catch { /* 已關閉 */ }
    }
    return { reply: full, stopped }
  },
}
