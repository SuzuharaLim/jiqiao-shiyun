import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { dayFor, todayOffset, parseDateParam } from '../data/almanac.js'
import { api, setCsrf } from '../api.js'
import { syncBadges } from '../lib/arBadges.js'

// ─────────────────────────────────────────────────────────────
// 網址路由：每個畫面對應一個路徑，與 History API 同步（無 react-router）。
// 根分頁用 TAB_PATHS；堆疊畫面用 SCREEN_PATH（:param 由 props 帶入，如 /post/:id）。
//
// ★ 路徑表與組成邏輯已抽到 `./paths.js`（**純 JS，沒有 React**），
//   因為那一層是全站最容易靜默壞掉的地方，卻原本 import 不進 build 期的檢查腳本。
//   詳細理由見 paths.js 的檔頭。**不可在這裡再寫第二份路徑表。**
// ─────────────────────────────────────────────────────────────
import {
  TAB_PATHS, SCREEN_PATH, SCREEN_MATCHERS, requiredParams, buildPathInfo,
} from './paths.js'
export { TAB_PATHS, SCREEN_PATH, requiredParams }

// ⚠️ 開發模式要大聲喊出「誰漏了哪個必填參數」——那個錯誤在畫面上完全看不出來
//    （文字顯示的值是對的、只有 href 是空的），所以兩輪人工驗收都沒抓到。
function buildPath(screen, props = {}) {
  const { path, missing } = buildPathInfo(screen, props)
  if (import.meta.env?.DEV && missing.length) {
    console.error(
      `[nav] buildPath('${screen}') 缺少必填參數 ${missing.join('、')}`
      + `，會產生壞掉的網址「${path}」。`
      + ` 檢查 <Link screen="${screen}" params={{ ${missing[0]}: … }}>`)
  }
  return path
}
// 給 <Link> 產生真實 href 用（SPA 的連結必須是真的 <a href>，才能支援
// Cmd/Ctrl+click 開新分頁、右鍵複製網址、爬蟲辨識）。
// ★ 這裡是路徑組成的唯一真相，Link 不可自行重實作一份。
export const hrefForScreen = (screen, props) => buildPath(screen, props)
export const hrefForTab = (tab) => TAB_PATHS[tab] || '/'
// 首頁翻到的日期（`/?date=YYYY-MM-DD`）。
//
// ⚠️ 為什麼首頁的翻日一定要進網址：先前不管翻到哪一天網址都是 `/`，造成兩個
//    使用者一定會踩到的問題——(1) 想把「8/7 的曆頁」傳給朋友或加書籤做不到，
//    貼過去對方看到的是今天；(2) 翻了幾天之後按瀏覽器「上一頁」會**直接離開
//    整個網站**，而不是回到前一天。後者是最常見的動作。
// ⚠️ 只有「首頁根畫面」用得到這個參數（tab 0 且沒有堆疊）。堆疊畫面自己有路徑。
// ⚠️ 一定要**驗證**而不是只比對格式。原本只檢查 `^\d{4}-\d{2}-\d{2}$`，於是：
//      ?date=2026-02-30 → 顯示 3/2（JS 自動進位）
//      ?date=2026-99-99 → 顯示 2034/6/7
//      ?date=9999-12-31 → 照樣算出一整頁煞有介事的宜忌神煞
//    而網址列還留著原本那個不存在的日期。日期選擇器明明寫著可查詢範圍、
//    箭頭也會 disabled，但網址參數完全不受限——同一個限制在兩條路徑上不一致。
//    parseDateParam 會擋掉進位、兩位數年份與超出範圍，並回傳正規化後的 iso。
export const homeDateFromSearch = (search) => {
  try {
    const v = new URLSearchParams(search || '').get('date')
    const p = parseDateParam(v)
    // ⚠️ 指到「今天」時回 null，讓網址正規化成 `/`。否則 `/` 與
    //    `/?date=<今天>` 是同一份內容的兩個網址——canonical 已經指向 `/`，
    //    多一個等價網址只會稀釋自己。
    return (p && p.off !== todayOffset()) ? p.iso : null
  } catch { return null }
}
function pathFromState(tab, stack, homeDate) {
  const top = stack[stack.length - 1]
  // ⚠️ 找不到頁面沒有自己的路徑：要保留使用者打錯的那個網址，
  // 否則同步邏輯會把網址改寫成 '/'，使用者按重新整理就變成首頁、
  // 也無法把壞掉的連結回報給我們。
  if (top?.screen === 'notFound') return window.location.pathname + window.location.search
  if (top) { const p = buildPath(top.screen, top.props); if (p) return p }
  const base = TAB_PATHS[tab] || '/'
  return (tab === 0 && homeDate) ? `${base}?date=${homeDate}` : base
}
function routeFromPath(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  const ti = TAB_PATHS.indexOf(p)
  if (ti >= 0) return { tab: ti, stack: [] }
  for (const m of SCREEN_MATCHERS) {
    const mm = m.rx.exec(p)
    if (mm) {
      const props = {}
      m.names.forEach((n, i) => {
        // ⚠️ 選填參數沒被匹配時 mm[i+1] 是 undefined，decodeURIComponent(undefined)
        //    會得到字串 'undefined'——那會被當成一個真的日期傳進畫面。
        if (mm[i + 1] === undefined) return
        try { props[n] = decodeURIComponent(mm[i + 1]) } catch { props[n] = mm[i + 1] }
      })
      return { tab: 0, stack: [{ screen: m.screen, props }] }
    }
  }
  // ⚠️ 未知路徑不可靜默回首頁：伺服器已回 404 狀態碼，畫面卻顯示首頁的話，
  // 使用者不知道自己打錯網址，只會覺得「連結壞掉」。改推明確的找不到頁面。
  return { tab: 0, stack: [{ screen: 'notFound', props: {} }] }
}
const initialRoute = () => { try { return routeFromPath(window.location.pathname) } catch { return { tab: 0, stack: [] } } }

// 後端 auth user → App 使用者形狀
// ⚠️ 這裡必須把 publicUser()（server/index.js）回傳的欄位**全部**帶過來。
//    先前手寫成白名單卻漏了三個，而且每一個都造成真實的 bug：
//      · avatarImageId —— 上傳的頭像照片在重新整理後消失（改頭像 → 當下正常
//        → 重整就變回 emoji）。因為 updateProfile 的本地 setUser 有帶，
//        但重整後走 /api/me → toAppUser 把它濾掉了。
//      · isPrivate     —— 個人檔案的「私密」設定重整後跟著失效。
//      · id            —— 全站 user.id 都是 undefined。Admin.jsx 用
//        `disabled={u.id === user.id}` 防止管理員改自己的角色，
//        undefined === 'user-xxx' 永遠為 false ⇒ **防自鎖的保護整個失效**。
//    用展開複製而不是逐欄挑，之後後端新增欄位也不會再漏。
const toAppUser = (u) => ({
  ...u,
  handle: u.handle || (u.email ? u.email.split('@')[0] : 'user'),
  guest: false,
})

const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)

// 訂單一律以後端 /api/orders 為準；訪客沒有帳號＝沒有訂單，顯示空狀態而非假資料。
// （先前這裡放示範訂單，訪客會看到「植物萬年曆手帳 NT$800 已出貨」這種不存在的購買紀錄。）

// 訪客身分（純前端；後端所有寫入 API 仍以 requireAuth 擋下訪客）
const GUEST_KEY = 'jq-guest'
const GUEST_USER = { name: '訪客', handle: 'guest', guest: true, role: 'guest', emailVerified: false }
const readGuest = () => { try { return localStorage.getItem(GUEST_KEY) === '1' } catch { return false } }
const writeGuest = (on) => { try { on ? localStorage.setItem(GUEST_KEY, '1') : localStorage.removeItem(GUEST_KEY) } catch { /* 無痕模式忽略 */ } }

export function NavProvider({ children }) {
  // ---- 主題（記憶到 localStorage，reload 不重置）----
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('jq-theme') || 'light' } catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#141210' : '#FFFFFF')
    try { localStorage.setItem('jq-theme', theme) } catch { /* 隱私模式忽略 */ }
  }, [theme])
  // 主題切換 —— 從按鈕位置圓形擴散（日月交替）。
  // 宣紙暖白 ↔ 墨黑落差極大，數十個 CSS 變數同時瞬間翻轉會閃眼睛。
  // ⚠️ 不支援 View Transition API 的瀏覽器（Firefox）自動退回原本的瞬切，零風險；
  //    reduce-motion 也一律走瞬切。
  const toggleTheme = (ev) => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const reduce = document.documentElement.dataset.reduceMotion === 'on'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduce) return setTheme(next)
    // 沒有滑鼠座標時（鍵盤觸發）就從右上角的主題鈕位置擴散
    const x = ev?.clientX ?? window.innerWidth - 40
    const y = ev?.clientY ?? 40
    // 半徑取到「離觸發點最遠的那個角」，否則會有一角來不及被蓋到
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const vt = document.startViewTransition(() => setTheme(next))
    vt.ready.then(() => document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 480, easing: 'cubic-bezier(.2,.8,.3,1)', pseudoElement: '::view-transition-new(root)' },
    )).catch(() => { /* 動畫被中斷不影響主題已切換 */ })
  }

  // ---- 登入身分（由後端 Session Cookie 決定；啟動時打 /api/me 還原）----
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  useEffect(() => {
    let alive = true
    api.me()
      .then(({ user: u, csrfToken }) => { if (!alive) return; setCsrf(csrfToken); setUser(toAppUser(u)) })
      // 沒有後端 session 時，看看是不是「訪客模式」——訪客沒有 cookie，
      // 身分只是前端狀態，所以要自己從 localStorage 還原。
      // ⚠️ 這不是安全漏洞：訪客沒有 csrf token，後端所有寫入 API 都有
      //    requireAuth，訪客一律 401。這裡只還原「可以逛」這件事。
      .catch(() => { if (alive) setUser(readGuest() ? GUEST_USER : null) })
      .finally(() => { if (alive) setAuthLoading(false) })
    return () => { alive = false }
  }, [])
  // 由 Auth 畫面登入/註冊成功後呼叫（傳入後端回的 user 與 csrfToken）
  const login = (apiUser, csrfToken) => { setCsrf(csrfToken); setUser(toAppUser(apiUser)) }

  // ⚠️ AR 徽章的合併要掛在「使用者變成真帳號」這件事上，不能只掛在 login()：
  //    重新整理是走 session 還原（第 186 行那條），不會經過 login()，
  //    所以換裝置登入後第一次重整就會看不到之前拿的徽章。
  //    合併是雙向的（本機推上去 ＋ 後端拉下來），且每個帳號只做一次。
  useEffect(() => {
    if (!user || user.guest || !user.id) return
    // ⚠️ 這裡刻意用**靜態** import（見檔頭的 import 區）。原本是動態載入，理由寫著
    //    「徽章模組不必進主 bundle 的關鍵路徑」——但 CardPage 本來就靜態 import 它，
    //    rollup 因此無法把它移出主 chunk（build 會警告），動態載入完全沒有分塊效果，
    //    只換來非同步狀態與競態。而它壓縮後不到 1 KB，本來也不值得分塊。
    syncBadges(user.id).catch(() => { /* 離線或 401：本機那份仍在，下次再合併 */ })
  }, [user?.id, user?.guest])
  // ⚠️ 訪客身分要寫進 localStorage。原本純記憶體的作法有三個沒人預期得到的死路：
  //    按 F5 回登入牆、把網址貼給朋友對方看到登入牆、從書籤打開也是登入牆。
  //    使用者只會覺得「這站一直把我踢出去」，而不會知道自己是訪客。
  const loginGuest = () => { setCsrf(null); writeGuest(true); setUser(GUEST_USER) }
  const logout = async () => {
    try { if (!user?.guest) await api.logout() } catch { /* 忽略：仍在前端登出 */ }
    writeGuest(false)
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
      // 以伺服器回傳為準。⚠️ 要走 toAppUser 而不是直接展開 r.user——
      // 後者在 handle 為 null 時會把前端的 email 前綴 fallback 覆蓋掉。
      if (r?.user) setUser(u => ({ ...u, ...toAppUser(r.user) }))
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
  // 首頁正在看的日期（null＝今天）。進網址才能分享、加書籤，上一頁也才會回到前一天。
  const [homeDate, setHomeDate] = useState(() => {
    try { return homeDateFromSearch(window.location.search) } catch { return null }
  })

  // ---- 捲動位置：進入新畫面歸零、返回既有畫面還原 ----
  //
  // ⚠️ 兩個捲動容器，必須都處理：
  //    桌機是「整頁捲動」（window）；手機捲的是 `.device .body`（overflow-y:auto），
  //    對它呼叫 window.scrollTo(0,0) 完全沒有作用。
  //    先前手機的捲動歸零其實是 RootScreen 換掉導致 .body 重掛的副作用，不是這行做的。
  //
  // ⚠️ 方向性：push（進入子頁）歸零是對的；pop（返回）與 setTab（回到某個分頁）
  //    歸零是錯的——底部分頁列的心智模型是「五個並排的房間」，不是五條瀏覽紀錄。
  //    每次回來都被丟回門口，而且 paneIn 的上滑還會強化「這是全新頁面」的錯覺。
  const scrollMemo = useRef({})
  const scroller = () => document.querySelector('.device .body')
  const scrollKey = (t, depth) => `t${t}:${depth}`
  const readScroll = () => { const el = scroller(); return el ? el.scrollTop : window.scrollY }
  const writeScroll = (y) => {
    const el = scroller()
    if (el) el.scrollTop = y
    try { window.scrollTo(0, el ? 0 : y) } catch { /* ignore */ }
  }
  const remember = (t, depth) => { scrollMemo.current[scrollKey(t, depth)] = readScroll() }
  // ⚠️ 還原不能只做一次。切分頁時 .body 會整個重掛，而且貼文／作品是 fetch
  //    回來才渲染的——第一幀容器還很矮，寫進去的 scrollTop 會被瀏覽器夾成 0
  //    （實測捲到 400 切走再切回來，還原後仍是 0）。
  //    所以分幾次重試，直到真的設定成功或容器確實沒那麼長為止。
  const restoreTimers = useRef([])
  const restore = (t, depth) => {
    restoreTimers.current.forEach(clearTimeout)
    restoreTimers.current = []
    const y = scrollMemo.current[scrollKey(t, depth)] ?? 0
    if (!y) { writeScroll(0); return }
    const attempt = () => {
      const el = scroller()
      writeScroll(y)
      // 已到位（或容器就是沒那麼長）→ 不用再試
      return !el || Math.abs(el.scrollTop - y) < 2 || el.scrollHeight - el.clientHeight <= y
    }
    requestAnimationFrame(() => {
      if (attempt()) return
      restoreTimers.current = [80, 200, 400].map(ms => setTimeout(attempt, ms))
    })
  }
  useEffect(() => () => restoreTimers.current.forEach(clearTimeout), [])

  const push = useCallback((screen, props = {}) => {
    setStack(s => { remember(tab, s.length); return [...s, { screen, props }] })
    writeScroll(0)                                   // 新畫面 → 從頭看
  }, [tab])
  // 就地換掉堆疊最上層（同一個畫面換參數用，例如完整曆頁翻日）。
  // ⚠️ 不可用 push——那會讓每翻一天就多一層歷史，使用者按上一頁得一天一天倒退回去，
  //    而且堆疊會無限長大。也不做捲動歸零：翻日時使用者多半正在看某一區，
  //    把他拉回頁首反而礙事。
  const replace = useCallback((screen, props = {}) => {
    setStack(s => (s.length ? [...s.slice(0, -1), { screen, props }] : [{ screen, props }]))
  }, [])
  const pop = useCallback(() => {
    setStack(s => { const next = s.slice(0, -1); restore(tab, next.length); return next })
  }, [tab])
  const popAll = useCallback(() => { setStack([]); restore(tab, 0) }, [tab])
  const setTab = useCallback((i) => {
    setStack(s => { remember(tab, s.length); return [] })
    setTabRaw(i)
    restore(i, 0)
  }, [tab])

  // ---- 網址同步（History API）：狀態變 → 更新網址；上一頁/下一頁 → 還原狀態 ----
  const suppressSync = useRef(false)
  const lastSig = useRef(null)   // 上一次的「堆疊深度:畫面名」，用來分辨換頁與換參數
  const lastHomeDate = useRef(null)
  useEffect(() => {
    if (suppressSync.current) { suppressSync.current = false; return }  // popstate 造成的變動不再回推
    const path = pathFromState(tab, stack, homeDate)
    // ⚠️ 同一個畫面只換參數（例如完整曆頁翻日）要用 replaceState 不可 pushState。
    //    否則 replace() 雖然沒有把堆疊變長，網址同步這一層還是每次都推一筆歷史
    //    ——實測連按三下「後一天」就多三筆，使用者得按三次上一頁才離得開這頁。
    //    判準：堆疊深度與最上層畫面都沒變，就只是參數改了。
    const top = stack[stack.length - 1]
    const sig = `${stack.length}:${top?.screen ?? ''}`
    // ⚠️ 首頁翻日同理：第一次離開「今天」要 push（這樣按上一頁才會回到今天而不是
    //    離開網站），之後一天一天翻改用 replace——否則翻五天就多五筆歷史，
    //    使用者得按五次上一頁才離得開。
    const dateStepOnly = lastHomeDate.current != null && homeDate != null
    const paramOnly = lastSig.current === sig && (homeDate === lastHomeDate.current || dateStepOnly)
    lastSig.current = sig
    lastHomeDate.current = homeDate
    try {
      const cur = window.location.pathname + window.location.search
      if (path !== cur) {
        window.history[paramOnly ? 'replaceState' : 'pushState']({ tab, stack, homeDate }, '', path)
      }
    } catch { /* ignore */ }
  }, [tab, stack, homeDate])
  useEffect(() => {
    const onPop = (e) => {
      const r = (e.state && typeof e.state.tab === 'number') ? e.state : routeFromPath(window.location.pathname)
      suppressSync.current = true
      setTabRaw(r.tab); setStack(r.stack || [])
      // ⚠️ 日期也要跟著還原，否則按上一頁網址變回 `/` 但畫面還停在 8/31。
      //    state 沒帶（例如使用者手動改網址後按上一頁）就從 search 重新解析。
      const hd = (e.state && 'homeDate' in e.state) ? e.state.homeDate : homeDateFromSearch(window.location.search)
      lastHomeDate.current = hd || null
      setHomeDate(hd || null)
      scrollTop()
    }
    window.addEventListener('popstate', onPop)
    try { window.history.replaceState({ tab, stack, homeDate }, '', pathFromState(tab, stack, homeDate)) } catch { /* ignore */ }
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

  // 節氣換裝：依真實當前節氣掛 data-season，全站的 --season-hue 隨季節輪替。
  // ⚠️ 只換「第二點綴色」——朱紅主色（品牌識別）全年不動。
  // 節氣的季別以「立春／立夏／立秋／立冬」為分界（傳統四立），不是西曆月份。
  useEffect(() => {
    const SEASON = {
      spring: ['立春', '雨水', '驚蟄', '春分', '清明', '穀雨'],
      summer: ['立夏', '小滿', '芒種', '夏至', '小暑', '大暑'],
      autumn: ['立秋', '處暑', '白露', '秋分', '寒露', '霜降'],
      winter: ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'],
    }
    const term = dayFor(todayOffset()).term.replace('（交節）', '')
    const season = Object.keys(SEASON).find(k => SEASON[k].includes(term)) || 'summer'
    document.documentElement.dataset.season = season
  }, [])
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
  // 第二個參數可帶一個動作（{ label, onClick }），用於「復原」這種需要反悔的操作。
  // ⚠️ 有動作時停留久一點（4.5 秒）——1.8 秒不夠使用者反應過來要按什麼。
  const [toast, setToastRaw] = useState(null)
  const [toastAction, setToastAction] = useState(null)
  const toastTimer = useState({ t: null })[0]
  const setToast = useCallback((msg, action = null) => {
    setToastRaw(msg)
    setToastAction(action)
    if (toastTimer.t) clearTimeout(toastTimer.t)
    toastTimer.t = setTimeout(() => { setToastRaw(null); setToastAction(null) }, action ? 4500 : 1800)
  }, [toastTimer])

  // ---- 蓋印章：成功回饋 ----
  // 印章是這個品牌的動詞。註冊成功、發佈成功、下單成功都蓋一枚印，
  // 而不是各自跳一個長得一樣的文字 toast。
  // ⚠️ 時長要跟 .seal-stamp 的動畫（sealIn .5s + sealRing .6s+.18s 延遲）對齊，
  //    提早卸載會把餘韻切掉。
  const [stamp, setStampRaw] = useState(null)
  const stampTimer = useState({ t: null })[0]
  const setStamp = useCallback((msg) => {
    setStampRaw(msg)
    if (stampTimer.t) clearTimeout(stampTimer.t)
    stampTimer.t = setTimeout(() => setStampRaw(null), 1400)
  }, [stampTimer])

  const value = {
    theme, toggleTheme,
    stamp, setStamp,
    user, authLoading, login, loginGuest, logout, updateProfile,
    authWall, setAuthWall, requireAccount,
    tab, setTab, stack, push, replace, pop, popAll,
    homeDate, setHomeDate,
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
    toast, toastAction, setToast,
  }
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>
}
