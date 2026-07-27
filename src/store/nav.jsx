import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { api, setCsrf } from '../api.js'

// ─────────────────────────────────────────────────────────────
// 網址路由：每個畫面對應一個路徑，與 History API 同步（無 react-router）。
// 根分頁用 TAB_PATHS；堆疊畫面用 SCREEN_PATH（:param 由 props 帶入，如 /post/:id）。
// ─────────────────────────────────────────────────────────────
const TAB_PATHS = ['/', '/explore', '/create', '/almanac', '/me']
const SCREEN_PATH = {
  aiChat: '/ai', checkout: '/checkout', workDetail: '/work/:id', postDetail: '/post/:id',
  newPost: '/new', makeCalendar: '/calendar/make', calendarPreview: '/calendar/preview',
  myProjects: '/projects', deities: '/deities', zodiac: '/zodiac', dream: '/dream',
  nameFortune: '/name', matchmaking: '/match', bone: '/bone', proverbs: '/proverbs',
  festivals: '/festivals', flowers: '/flowers', ingredients: '/ingredients', solarterms: '/solarterms',
  subscription: '/subscription', wallet: '/wallet', notifications: '/notifications',
  dms: '/messages', settings: '/settings', records: '/records',
  creatorConsole: '/creator-console', store: '/store', orders: '/orders',
  scan: '/AR', camera: '/camera', todayShots: '/today', almanacDay: '/almanac/day',
  yearAlmanac: '/almanac/year', foodTaboo: '/appendix/food', units: '/appendix/units',
  ganzhiTable: '/appendix/ganzhi', challenges: '/challenges', challengesBoard: '/leaderboard',
  creatorPage: '/creator/:user', followList: '/creator/:handle/:rel', prePlan: '/preplan', editProfile: '/edit-profile',
  about: '/about', accountSecurity: '/security', admin: '/admin',
  privacy: '/privacy', terms: '/terms', contact: '/contact',
}
const SCREEN_MATCHERS = Object.entries(SCREEN_PATH).map(([screen, tpl]) => {
  const names = []
  const rx = new RegExp('^' + tpl.replace(/:(\w+)/g, (_, k) => { names.push(k); return '([^/]+)' }) + '/?$')
  return { screen, rx, names }
})
function buildPath(screen, props = {}) {
  const tpl = SCREEN_PATH[screen]; if (!tpl) return null
  return tpl.replace(/:(\w+)/g, (_, k) => encodeURIComponent(props?.[k] ?? ''))
}
// 給 <Link> 產生真實 href 用（SPA 的連結必須是真的 <a href>，才能支援
// Cmd/Ctrl+click 開新分頁、右鍵複製網址、爬蟲辨識）。
// ★ 這裡是路徑組成的唯一真相，Link 不可自行重實作一份。
export const hrefForScreen = (screen, props) => buildPath(screen, props)
export const hrefForTab = (tab) => TAB_PATHS[tab] || '/'
function pathFromState(tab, stack) {
  const top = stack[stack.length - 1]
  if (top) { const p = buildPath(top.screen, top.props); if (p) return p }
  return TAB_PATHS[tab] || '/'
}
function routeFromPath(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  const ti = TAB_PATHS.indexOf(p)
  if (ti >= 0) return { tab: ti, stack: [] }
  for (const m of SCREEN_MATCHERS) {
    const mm = m.rx.exec(p)
    if (mm) {
      const props = {}
      m.names.forEach((n, i) => { try { props[n] = decodeURIComponent(mm[i + 1]) } catch { props[n] = mm[i + 1] } })
      return { tab: 0, stack: [{ screen: m.screen, props }] }
    }
  }
  return { tab: 0, stack: [] }   // 未知路徑 → 首頁
}
const initialRoute = () => { try { return routeFromPath(window.location.pathname) } catch { return { tab: 0, stack: [] } } }

// 後端 auth user → App 使用者形狀
const toAppUser = (u) => ({
  name: u.name, handle: u.handle || (u.email ? u.email.split('@')[0] : 'user'),
  email: u.email, role: u.role, emailVerified: u.emailVerified,
  bio: u.bio, avatar: u.avatar, avatarBg: u.avatarBg, guest: false,
})

const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)

// 訂單一律以後端 /api/orders 為準；訪客沒有帳號＝沒有訂單，顯示空狀態而非假資料。
// （先前這裡放示範訂單，訪客會看到「植物萬年曆手帳 NT$800 已出貨」這種不存在的購買紀錄。）

export function NavProvider({ children }) {
  // ---- 主題（記憶到 localStorage，reload 不重置）----
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('jq-theme') || 'light' } catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#141210' : '#F4EFE6')
    try { localStorage.setItem('jq-theme', theme) } catch { /* 隱私模式忽略 */ }
  }, [theme])
  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  // ---- 登入身分（由後端 Session Cookie 決定；啟動時打 /api/me 還原）----
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  useEffect(() => {
    let alive = true
    api.me()
      .then(({ user: u, csrfToken }) => { if (!alive) return; setCsrf(csrfToken); setUser(toAppUser(u)) })
      .catch(() => { if (alive) setUser(null) })
      .finally(() => { if (alive) setAuthLoading(false) })
    return () => { alive = false }
  }, [])
  // 由 Auth 畫面登入/註冊成功後呼叫（傳入後端回的 user 與 csrfToken）
  const login = (apiUser, csrfToken) => { setCsrf(csrfToken); setUser(toAppUser(apiUser)) }
  const loginGuest = () => { setCsrf(null); setUser({ name: '訪客', handle: 'guest', guest: true, role: 'guest', emailVerified: false }) }
  const logout = async () => {
    try { if (!user?.guest) await api.logout() } catch { /* 忽略：仍在前端登出 */ }
    setCsrf(null); setUser(null); setStack([]); setTabRaw(0)
  }
  // ⚠️ 回傳 Promise：呼叫端必須 await 後才顯示「已更新」。
  // 先前是 fire-and-forget + .catch(() => {})，伺服器 400/401/離線時
  // 使用者仍看到成功提示，重整後改動消失（EditProfile 與 Settings 都中）。
  const updateProfile = async (patch) => {
    setUser(u => ({ ...u, ...patch }))
    const needsSync = user && !user.guest &&
      (patch.name || patch.bio !== undefined || patch.avatar
        || patch.avatarImageId !== undefined || patch.priv !== undefined)
    if (!needsSync) return { ok: true, local: true }
    try {
      const r = await api.updateProfile({
        name: patch.name ?? user.name, bio: patch.bio, avatar: patch.avatar,
        avatarImageId: patch.avatarImageId,   // 使用者上傳的頭像；null＝改回 emoji
        priv: patch.priv,
      })
      if (r?.user) setUser(u => ({ ...u, ...r.user }))   // 以伺服器回傳為準
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e?.message || '儲存失敗，請稍後再試' }
    }
  }
  // ---- 登入牆：下單/上傳/發佈等需要「真帳號」（非訪客）----
  const [authWall, setAuthWall] = useState(null)  // null | 動作說明字串
  const requireAccount = (reason) => {
    if (!user || user.guest) { setAuthWall(reason || '此功能'); return false }
    return true
  }
  // 點 email 內 /verify-email?token=... 進來 → 驗證後清掉 URL
  useEffect(() => {
    try {
      if (location.pathname.includes('verify-email')) {
        const t = new URLSearchParams(location.search).get('token')
        if (t) api.verifyEmail({ token: t })
          .then(() => setToastRaw('Email 已驗證 ✓'))
          .catch(() => setToastRaw('驗證連結已失效'))
          .finally(() => history.replaceState(null, '', '/'))
      }
    } catch { /* ignore */ }
  }, [])

  // ---- 分頁 + 畫面堆疊（初始狀態由網址解析）----
  const [tab, setTabRaw] = useState(() => initialRoute().tab)
  const [stack, setStack] = useState(() => initialRoute().stack) // [{screen, props}]

  // 桌機為整頁捲動：切換分頁/進出畫面時捲回頂端（否則會停在上一頁的捲動位置）
  const scrollTop = () => { try { window.scrollTo(0, 0) } catch { /* ignore */ } }
  const push = useCallback((screen, props = {}) => { setStack(s => [...s, { screen, props }]); scrollTop() }, [])
  const pop = useCallback(() => { setStack(s => s.slice(0, -1)); scrollTop() }, [])
  const popAll = useCallback(() => { setStack([]); scrollTop() }, [])
  const setTab = useCallback((i) => { setStack([]); setTabRaw(i); scrollTop() }, [])

  // ---- 網址同步（History API）：狀態變 → 更新網址；上一頁/下一頁 → 還原狀態 ----
  const suppressSync = useRef(false)
  useEffect(() => {
    if (suppressSync.current) { suppressSync.current = false; return }  // popstate 造成的變動不再回推
    const path = pathFromState(tab, stack)
    try { if (path !== window.location.pathname) window.history.pushState({ tab, stack }, '', path) } catch { /* ignore */ }
  }, [tab, stack])
  useEffect(() => {
    const onPop = (e) => {
      const r = (e.state && typeof e.state.tab === 'number') ? e.state : routeFromPath(window.location.pathname)
      suppressSync.current = true
      setTabRaw(r.tab); setStack(r.stack || []); scrollTop()
    }
    window.addEventListener('popstate', onPop)
    try { window.history.replaceState({ tab, stack }, '', pathFromState(tab, stack)) } catch { /* ignore */ }
    return () => window.removeEventListener('popstate', onPop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 全域互動狀態（示範用）----
  const [liked, setLiked] = useState({})           // postId -> bool
  // 加入月曆（收藏）：持久化到 localStorage，重整不遺失
  const [saved, setSavedRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jq-saved') || '{}') } catch { return {} }
  })
  const setSaved = (updater) => setSavedRaw(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater
    try { localStorage.setItem('jq-saved', JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })
  const [reminders, setReminders] = useState({ mazu: true, tudi: true }) // 神佛提醒
  const [subscribed, setSubscribed] = useState(false) // Premium
  // 購物車：持久化到 localStorage——先前重整就全空，
  // 使用者在商店加了幾件、切到作品詳情再回來就得重加。
  const [cart, setCart] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem('jq-cart') || '[]'); return Array.isArray(v) ? v : [] }
    catch { return [] }
  })
  const [projectPhotos, setProjectPhotos] = useState({}) // 做月曆選圖 id->bool
  // ---- 購買紀錄（訂單）----
  // 真帳號 → 後端為準（/api/orders，伺服器產生單號並寄確認信）；訪客瀏覽 → 本機示範資料
  const [orders, setOrders] = useState([])
  useEffect(() => {
    let alive = true
    if (user && !user.guest) {
      api.orders().then(r => { if (alive) setOrders(r.orders) }).catch(() => { /* 離線時保持現狀 */ })
    } else {
      setOrders([])   // 訪客/未登入：沒有訂單
    }
    return () => { alive = false }
  }, [user?.email, user?.guest])
  // 回傳 Promise：Checkout 需等後端建單成功才清購物車
  const addOrder = (order) => {
    if (user && !user.guest) {
      return api.createOrder({ items: order.items, pay: order.pay })
        .then(r => { setOrders(o => [r.order, ...o]); return r.order })
    }
    // 訪客備援（正常被登入牆擋下）：本機補齊單號/日期/狀態
    const d = new Date(), pad = (n) => String(n).padStart(2, '0')
    const full = {
      id: `JQ-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-L${pad((d.getMinutes() + d.getSeconds()) % 100)}`,
      date: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
      status: '處理中', total: (order.items || []).reduce((s, i) => s + (i.price || 0), 0),
      ...order,
    }
    setOrders(o => [full, ...o])
    return Promise.resolve(full)
  }
  // ---- 錢包餘額（Wallet / CreatorConsole 共用同一來源）----
  // ⚠️ 餘額已改由後端 ledger 表提供（Wallet 直接呼叫 api.ledger()）。
  // 這裡保留 0 只為相容仍讀 balance 的畫面（CreatorConsole 的提領入口文案），
  // 不再有 withdraw()——那個函式只做 setBalance(0) 卻 toast「1–3 個工作天入帳」，
  // 是假的成功。真正的提領走 POST /api/payouts。
  const balance = 0
  // ---- 設定偏好（持久化）----
  const [prefs, setPrefsRaw] = useState(() => {
    try { return { notif: true, priv: false, textSize: 'md', ...JSON.parse(localStorage.getItem('jq-prefs') || '{}') } }
    catch { return { notif: true, priv: false, textSize: 'md' } }
  })
  const setPref = (k, v) => setPrefsRaw(p => {
    const next = { ...p, [k]: v }
    try { localStorage.setItem('jq-prefs', JSON.stringify(next)) } catch { /* ignore */ }
    return next
  })
  // 文字大小 / 減少動態：套到 <html> 資料屬性 → 由 CSS 生效
  useEffect(() => { document.documentElement.dataset.textsize = prefs.textSize || 'md' }, [prefs.textSize])
  useEffect(() => { document.documentElement.dataset.reduceMotion = prefs.reduceMotion ? 'on' : 'off' }, [prefs.reduceMotion])
  // ---- 通知已讀（清紅點）：以伺服器未讀數為準，跨重整一致 ----
  const [notifRead, setNotifRead] = useState(true)
  useEffect(() => {
    let alive = true
    if (user && !user.guest) {
      api.notifications().then(r => { if (alive) setNotifRead(!r.unread) }).catch(() => {})
    }
    return () => { alive = false }
  }, [user?.email, user?.guest])

  // ---- 社交 ----
  const [following, setFollowing] = useState({})   // 使用者名 -> bool（追蹤中）
  const [comments, setComments] = useState({})     // postId -> [{ user, text, mine }]
  const [likedComments, setLikedComments] = useState({}) // commentKey -> bool

  const toggleLike = (id) => setLiked(m => ({ ...m, [id]: !m[id] }))
  const toggleSave = (id) => setSaved(m => ({ ...m, [id]: !m[id] }))
  const toggleReminder = (id) => setReminders(m => ({ ...m, [id]: !m[id] }))
  const togglePhoto = (id) => setProjectPhotos(m => ({ ...m, [id]: !m[id] }))
  const addToCart = (item) => setCart(c => (c.find(x => x.id === item.id) ? c : [...c, item]))
  // ⚠️ 先前只有 addToCart / clearCart，誤加一項的唯一救法是清空整車。
  const removeFromCart = (id) => setCart(c => c.filter(x => x.id !== id))
  // ⚠️ 這個 effect 必須放在 cart 的 useState 之後——放在檔案上方會 ReferenceError
  //（const 有 TDZ，不像 function 宣告會提升）。
  useEffect(() => {
    try { localStorage.setItem('jq-cart', JSON.stringify(cart)) } catch { /* 隱私模式忽略 */ }
  }, [cart])
  const clearCart = () => setCart([])
  const toggleFollow = (user) => setFollowing(m => ({ ...m, [user]: !m[user] }))
  const followCount = () => Object.values(following).filter(Boolean).length
  const addComment = (postId, text) =>
    setComments(m => ({ ...m, [postId]: [...(m[postId] || []), { user: 'lim_suzuhara', text, mine: true }] }))
  const toggleCommentLike = (key) => setLikedComments(m => ({ ...m, [key]: !m[key] }))

  // ---- Toast ----
  const [toast, setToastRaw] = useState(null)
  const toastTimer = useState({ t: null })[0]
  const setToast = useCallback((msg) => {
    setToastRaw(msg)
    if (toastTimer.t) clearTimeout(toastTimer.t)
    toastTimer.t = setTimeout(() => setToastRaw(null), 1800)
  }, [toastTimer])

  const value = {
    theme, toggleTheme,
    user, authLoading, login, loginGuest, logout, updateProfile,
    authWall, setAuthWall, requireAccount,
    tab, setTab, stack, push, pop, popAll,
    liked, toggleLike, saved, toggleSave,
    reminders, toggleReminder,
    subscribed, setSubscribed,
    cart, addToCart, removeFromCart, clearCart,
    orders, addOrder, refreshOrders: () => api.orders().then(r => setOrders(r.orders)).catch(() => {}),
    projectPhotos, togglePhoto,
    following, toggleFollow, followCount,
    comments, addComment,
    likedComments, toggleCommentLike,
    balance,
    prefs, setPref,
    notifRead, setNotifRead,
    toast, setToast,
  }
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>
}
