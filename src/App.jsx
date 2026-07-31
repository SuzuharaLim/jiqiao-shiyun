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
  zodiac: '生肖運勢', dream: '周公解夢', nameFortune: '命名吉凶', matchmaking: '生肖星座婚配',
  bone: '秤骨神術', proverbs: '台灣諺語', festivals: '臺灣特色慶典', flowers: '賞花景點',
  ingredients: '當季食材', solarterms: '24 節氣專欄', subscription: '訂閱與帳號', wallet: '錢包收益',
  notifications: '通知', dms: '聯絡我們', settings: '設定', records: '占卜紀錄',
  creatorConsole: '創作者後台', store: '商店', orders: '我的訂單', scan: '掃描明信片', camera: '相機',
  todayShots: '今日大家拍的', challenges: '節氣挑戰', challengesBoard: '挑戰排行榜',
  creatorPage: '創作者', followList: '粉絲／追蹤中', prePlan: '明年預拍', almanacDay: '完整國民曆', yearAlmanac: '年度總覽',
  foodTaboo: '食物相剋', units: '度量衡換算', ganzhiTable: '干支對照',
  editProfile: '編輯個人檔案', about: '品牌故事', accountSecurity: '帳號安全', admin: '管理後台',
  privacy: '隱私權政策', terms: '服務條款', contact: '聯絡我們',
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
  useEffect(() => {
    if (!user) { document.title = '機巧時運 · 智慧互動國民曆'; return }
    const t = top ? SCREEN_TITLES[top.screen] : TAB_TITLES[tab]
    document.title = t ? `${t} · 機巧時運` : '機巧時運 · 智慧互動國民曆'

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
            <div key={tab} className={`rootpane tab-${tab} ${[2, 3, 4].includes(tab) ? 'grid2' : ''}`}>
              <RootScreen />
            </div>

            {/* 堆疊（詳情）畫面 —— 手機覆蓋在上方，桌機整頁流動；screen-<key> 供桌機各畫面微調版面 */}
            {TopScreen && (
              <div className={`screen screen-${top.screen}`} key={stack.length}>
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
