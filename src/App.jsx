import { useEffect, useRef } from 'react'
import { useNav } from './store/nav.jsx'
import { TabBar, Toast } from './components/ui.jsx'
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
  notifications: '通知', dms: '私訊', dmThread: '私訊', settings: '設定', records: '占卜紀錄',
  creatorConsole: '創作者後台', store: '商店', orders: '我的訂單', scan: '掃描明信片', camera: '相機',
  todayShots: '今日大家拍的', challenges: '節氣挑戰', challengesBoard: '挑戰排行榜',
  creatorPage: '創作者', prePlan: '明年預拍', almanacDay: '完整農民曆', yearAlmanac: '年度總覽',
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
    if (!user) { document.title = '機巧時運 · 智慧互動農民曆'; return }
    const t = top ? SCREEN_TITLES[top.screen] : TAB_TITLES[tab]
    document.title = t ? `${t} · 機巧時運` : '機巧時運 · 智慧互動農民曆'

    if (firstRender.current) { firstRender.current = false; return }
    // 等新畫面掛載完成再移轉焦點
    const id = requestAnimationFrame(() => {
      document.querySelector('[data-screen-title]')?.focus?.()
    })
    return () => cancelAnimationFrame(id)
  }, [user, tab, top])

  return (
    <div className={`stage ${user ? 'signed-in' : ''}`}>
      {/* 跳至主要內容：鍵盤使用者 Tab 第一下就能跳過導覽（規格要求項目） */}
      <a className="skip-link" href="#main">跳至主要內容</a>

      <button className="theme-fab tap" onClick={toggleTheme} aria-label="切換主題">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* 桌機頂部網站式導覽列（≥900px；登入後才出現，取代底部分頁列） */}
      {user && !authLoading && <WebNav />}

      <main id="main" className={`device ${TopScreen ? 'has-stack' : ''}`}>
        {authLoading ? (
          /* 還原登入狀態中（打 /api/me） */
          <div className="auth-splash"><div className="ba-seal">印</div><div className="muted">機巧時運載入中…</div></div>
        ) : !user ? (
          /* 未登入 → 登入／註冊畫面（全站入口守門） */
          <Auth />
        ) : (
          <>
            <VerifyBanner />
            {/* 根分頁畫面（rootpane 對版面透明；桌機開堆疊畫面時隱藏）
                tab-N 供桌機各分頁專屬版面；grid2 讓工具列在桌機排成雙欄卡片 */}
            <div className={`rootpane tab-${tab} ${[2, 3, 4].includes(tab) ? 'grid2' : ''}`}>
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
    </div>
  )
}
