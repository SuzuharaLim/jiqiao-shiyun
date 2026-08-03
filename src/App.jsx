import { useEffect, useRef } from 'react'
import { useNav } from './store/nav.jsx'
import { TabBar, Toast, Seal, StampMark } from './components/ui.jsx'
import WebNav from './components/WebNav.jsx'
import WebFooter from './components/WebFooter.jsx'
import AuthWall from './components/AuthWall.jsx'
import VerifyBanner from './components/VerifyBanner.jsx'
import { ROOTS, SCREENS } from './screens/registry.jsx'
import Auth from './screens/Auth.jsx'

// 每頁獨立 <title>（SEO/分頁辨識：SPA 單一 URL，至少讓瀏覽器分頁與歷史紀錄有意義）
const TAB_TITLES = ['今日曆頁', '探索', '建立', '占卜', '我的']
const SCREEN_TITLES = {
  aiChat: 'AI 時光顧問', checkout: '結帳', workDetail: '作品', postDetail: '貼文', newPost: '新貼文',
  makeCalendar: '做月曆', calendarPreview: '月曆預覽', myProjects: '我的專案', deities: '臺灣神佛的生日',
  zodiac: '生肖運勢', dream: '解夢', nameFortune: '命名吉凶', matchmaking: '生肖星座婚配',
  bone: '秤骨神術', proverbs: '台灣諺語', festivals: '臺灣特色慶典', flowers: '賞花景點',
  ingredients: '當季食材', solarterms: '24 節氣專欄', subscription: '訂閱與帳號', wallet: '錢包收益',
  notifications: '通知', dms: '聯絡我們', settings: '設定', records: '占卜紀錄',
  creatorConsole: '創作者後台', store: '商店', productDetail: '商品', orders: '我的訂單', scan: '掃描明信片', camera: '相機',
  todayShots: '今日大家拍的', challenges: '節氣挑戰', challengesBoard: '挑戰排行榜',
  creatorPage: '創作者', followList: '粉絲／追蹤中', prePlan: '明年預拍', almanacDay: '完整國民曆', yearAlmanac: '年度總覽',
  foodTaboo: '食物相剋', units: '度量衡換算', ganzhiTable: '干支對照',
  editProfile: '編輯個人檔案', about: '品牌故事', accountSecurity: '帳號安全', admin: '管理後台',
  privacy: '隱私權政策', terms: '服務條款', contact: '聯絡我們',
  termDetail: '節氣專頁', deityDetail: '神明誕辰', dreamDetail: '解夢',
  auspiciousIndex: '擇日工具', auspicious: '吉日查詢',
  glossary: '術語解釋', glossaryDetail: '術語', editorial: '編輯政策', myths: '常見誤解',
  sunIndex: '攝影時刻', sunTimes: '日出日落',
}

export default function App() {
  const { theme, toggleTheme, user, authLoading, tab, stack } = useNav()

  const RootScreen = ROOTS[tab]
  const top = stack[stack.length - 1]
  const TopScreen = top ? SCREENS[top.screen] : null
  // 某些堆疊畫面自帶頂列且需隱藏底部分頁列（全螢幕）
  const fullScreens = new Set(['aiChat', 'newPost', 'makeCalendar', 'checkout', 'calendarPreview', 'scan', 'camera'])
  const hideTabBar = top && fullScreens.has(top.screen)

  // 依目前畫面更新 <title>，並把焦點移到新畫面的標題
  // ★ SPA 無障礙必要：切頁時 DOM 換了但焦點還留在原處，螢幕閱讀器不會知道
  //   換頁了。把焦點移到新頁的 <h1>（TopBar 渲染，帶 data-screen-title）
  //   才會宣告新標題。first 用來跳過初次載入（那時焦點本來就在頁首）。
  const firstRender = useRef(true)
  const initialSig = useRef(null)   // 進站時的路由簽章；相同時不覆寫伺服器的 <title>
  useEffect(() => {
    // ⚠️ 絕不可在「初次載入」就覆寫 <title>。
    //    伺服器已經依路由注入了關鍵字完整的標題（server/seo.js 的 ROUTES），
    //    例如「今日完整國民曆｜宜忌、吉時、沖煞、建除、彭祖百忌」，
    //    但這裡原本無條件寫成「完整國民曆 · 機巧時運」把它蓋掉了——
    //    而 Google 採用的是**渲染後的 DOM**，所以伺服器那份好標題完全白做。
    //    現在只在「使用者於站內導覽之後」才更新標題（那時網址已經變了、
    //    伺服器的那份也不再對應當前畫面），初次載入一律沿用伺服器的。
    // ⚠️ 判準是「路由有沒有變」，不是「effect 跑第幾次」。
    //    這個 effect 的相依是 [user, tab, top]，而 user 會從 null 變成訪客／登入者，
    //    所以光是還原身分就會讓它多跑一次——只擋「第一次」的話，第二次照樣把
    //    伺服器的好標題蓋成「完整國民曆 · 機巧時運」（實測就是這樣漏掉的）。
    //    只要使用者還停在進站時的那個網址，就一律沿用伺服器注入的標題。
    // 日期頁翻日時「畫面沒變、只有參數變」，也要算成一次導覽——
    // 否則整串歷史紀錄會全部叫同一個名字，使用者在上一頁清單裡分不出哪天是哪天。
    const sig = `${tab}|${top?.screen || ''}|${top?.props?.date || ''}`
    if (initialSig.current === null) initialSig.current = sig
    const navigated = sig !== initialSig.current
    if (navigated) {
      if (!user) document.title = '機巧時運 · 智慧互動國民曆'
      else {
        // 日期頁的標題要帶上該日期，與伺服器注入的格式一致
        const t = top?.screen === 'almanacDay' && top.props?.date
          ? `${top.props.date} 國民曆｜宜忌・吉時・沖煞`
          : top ? SCREEN_TITLES[top.screen] : TAB_TITLES[tab]
        document.title = t ? `${t} · 機巧時運` : '機巧時運 · 智慧互動國民曆'
      }
    }

    if (firstRender.current) { firstRender.current = false; return }

    // 等新畫面掛載完成再移轉焦點
    const id = requestAnimationFrame(() => {
      document.querySelector('[data-screen-title]')?.focus?.()
    })
    return () => cancelAnimationFrame(id)
  }, [user, tab, top])

  // 分頁切到背景時暫停所有循環動畫（seasonGlow 這類 9 秒的呼吸在
  // 看不見的分頁裡白燒 CPU 與電池；回到前景就恢復）。CSS 一條規則全暫停。
  useEffect(() => {
    const sync = () => { document.documentElement.dataset.pageHidden = document.hidden ? 'true' : 'false' }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  // ---------- 桌機捲動進場（動效銳評 §03 後半）----------
  // 登入後 ≥900px 是「整頁捲動的長頁面」，但格狀內容原本一次全部就位。
  // ⚠️ 只在桌機啟用：手機是單一視窗高的 App 版面，捲動進場反而礙事（內容還沒滑到就看不見）。
  // ⚠️ 每次 tab/stack 變動都要重掃，因為 DOM 整批換過了。
  useEffect(() => {
    if (!user) return
    const desktop = window.matchMedia('(min-width:900px) and (min-height:600px)')
    const reduce = document.documentElement.dataset.reduceMotion === 'on'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!desktop.matches || reduce || typeof IntersectionObserver === 'undefined') return

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { rootMargin: '0px 0px -8% 0px' })

    const SEL = '.railcard, .album .it, .rootpane .tool, .card'
    let n = 0
    const scan = () => {
      document.querySelectorAll(SEL).forEach(el => {
        if (el.classList.contains('reveal')) return
        el.classList.add('reveal')
        el.style.transitionDelay = (n++ % 6) * 45 + 'ms'
        io.observe(el)
      })
    }
    // ⚠️ 掃一次不夠：作品／貼文是 fetch 回來才渲染的，
    //    只在切頁當下掃會掃到空的 DOM（實測探索頁 12 張作品一個都沒被觀察到，
    //    捲動進場等於整頁失效）。用 MutationObserver 補掃後來才出現的節點。
    const mo = new MutationObserver(scan)
    mo.observe(document.querySelector('.device') || document.body, { childList: true, subtree: true })
    const raf = requestAnimationFrame(scan)
    return () => { cancelAnimationFrame(raf); io.disconnect(); mo.disconnect() }
  }, [user, tab, top])

  return (
    <div className={`stage ${user ? 'signed-in' : ''}`}>
      {/* 跳至主要內容：鍵盤使用者 Tab 第一下就能跳過導覽（規格要求項目） */}
      <a className="skip-link" href="#main">跳至主要內容</a>

      {/* ⚠️ 要把事件物件傳進去——圓形擴散的圓心就是這顆按鈕被按到的位置 */}
      <button className="theme-fab tap" onClick={(e) => toggleTheme(e)} aria-label="切換主題">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* 桌機頂部網站式導覽列（≥900px；登入後才出現，取代底部分頁列） */}
      {user && !authLoading && <WebNav />}

      <main id="main" className={`device ${TopScreen ? 'has-stack' : ''}`}>
        {authLoading ? (
          /* 還原登入狀態中（打 /api/me） */
          <div className="auth-splash"><Seal className="ba-seal" alt="" /><div className="muted">機巧時運載入中…</div></div>
        ) : !user ? (
          /* 未登入 → 登入／註冊畫面（全站入口守門） */
          <Auth />
        ) : (
          <>
            <VerifyBanner />
            {/* 根分頁畫面（rootpane 對版面透明；桌機開堆疊畫面時隱藏）
                tab-N 供桌機各分頁專屬版面；grid2 讓工具列在桌機排成雙欄卡片 */}
            {/* key={tab} 讓 React 在切分頁時重新掛載 → paneIn 進場動畫才會重播。
                ⚠️ 只做極短的淡入上浮，不要做左右滑動：setTab 同時呼叫 window.scrollTo(0,0)，
                   橫向滑動配上垂直瞬跳會互相打架。 */}
            {/* ⚠️ key 一定要加前綴，不可寫成 key={tab}。
                這個 div 與下面的 .screen 是**同一層的兄弟**，而 .screen 的 key 是
                堆疊深度——tab 與深度都是小整數，只要撞在一起（探索 tab=1 開一層
                堆疊＝深度 1，兩個 key 都是 "1"）React 就會把兩個兄弟當成同一個
                節點來配對，刪錯人：舊的 rootpane 留在 DOM 裡沒被卸載，新的接在
                它後面，於是「探索」與「我的」整頁疊在一起（實測 .device 高度
                766 → 2053）。**production build 不會有任何警告**（重複 key 的
                警告只在 dev 版），只有畫面上看得出來。 */}
            <div key={`root-${tab}`} className={`rootpane tab-${tab} ${[2, 3, 4].includes(tab) ? 'grid2' : ''}`}>
              <RootScreen />
            </div>

            {/* 堆疊（詳情）畫面 —— 手機覆蓋在上方，桌機整頁流動；screen-<key> 供桌機各畫面微調版面 */}
            {/* key 帶畫面名稱：同深度換不同畫面要重新掛載（進場動畫、內部 state
                都該重置）；replace() 翻日是同名同深度，key 不變＝不重掛，正是我們
                要的。前綴同 rootpane，避免兩個兄弟的 key 互撞。 */}
            {TopScreen && (
              <div className={`screen screen-${top.screen}`} key={`screen-${stack.length}-${top.screen}`}>
                <TopScreen {...top.props} />
              </div>
            )}

            {!hideTabBar && <TabBar />}
          </>
        )}
        <Toast />
      </main>

      {/* 桌機頁尾（≥900px） */}
      {user && !authLoading && <WebFooter />}

      {/* 登入牆（訪客下單/上傳時彈出） */}
      <AuthWall />

      {/* 成功時蓋一枚印（註冊／發佈／下單）。放在 stage 層才能蓋過所有畫面 */}
      <StampMark />
    </div>
  )
}
