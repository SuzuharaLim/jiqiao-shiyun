import Icon from './components/Icon.jsx'
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
const TAB_TITLES = ['今日曆頁', '探索', '建立', '曆書工具箱', '我的']
const SCREEN_TITLES = {
  aiChat: 'AI 時光顧問', checkout: '結帳', workDetail: '作品', postDetail: '貼文', newPost: '發布貼文',
  makeCalendar: '做月曆', calendarPreview: '月曆預覽', myProjects: '我的專案', deities: '臺灣神佛的生日',
  zodiac: '生肖運勢', dream: '解夢', nameFortune: '命名吉凶', matchmaking: '生肖星座婚配',
  bone: '秤骨神術', proverbs: '台灣諺語', festivals: '臺灣特色慶典', flowers: '賞花景點',
  ingredients: '當季食材', solarterms: '24 節氣專欄', subscription: '訂閱與帳號', wallet: '錢包收益',
  notifications: '通知', dms: '聯絡我們', settings: '設定', records: '占卜紀錄',
  creatorConsole: '創作者後台', store: '商店', productDetail: '商品', orders: '我的訂單', scan: '掃描明信片', camera: '相機',
  todayShots: '今日大家拍的', challenges: '節氣挑戰', challengesBoard: '挑戰排行榜',
  creatorPage: '創作者', followList: '粉絲／追蹤中', prePlan: '明年預拍', almanacDay: '完整國民曆', yearAlmanac: '年度總覽',
  foodTaboo: '食物相剋', units: '度量衡換算', ganzhiTable: '干支對照',
  quiz: '節氣知識王',
  badges: '徽章收藏庫',
  nameCard: '名片',
  editProfile: '編輯個人檔案', about: '品牌故事', accountSecurity: '帳號安全', admin: '管理後台',
  privacy: '隱私權政策', terms: '服務條款', contact: '聯絡我們',
  termDetail: '節氣專頁', deityDetail: '神明誕辰', dreamDetail: '解夢',
  arCard: '節氣卡片', arModel: '3D 模型',
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
  const initialSig = useRef(null)      // 進站時的路由簽章
  const hasNavigated = useRef(false)   // 曾經離開過進站那一頁沒有（見下方說明）
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
    // ★★ 判準是「**曾經**離開過進站的那一頁」，不是「現在是不是那一頁」。
    //
    // ⚠️ 原本寫 `sig !== initialSig.current`，於是**回到進站那一頁時標題不會更新**：
    //    從 /ar/model/x 進站 → 點去 /ar/card/x（標題改成「節氣卡片」）→ 按上一頁
    //    回到 /ar/model/x，sig 又等於 initialSig ⇒ 判定「沒導覽過」⇒ 標題**留在
    //    「節氣卡片」**。實測就是這樣（網址 /ar/model/…、分頁標題卻是節氣卡片）。
    //    使用者在一堆分頁裡是靠標題找頁面的，錯的標題比沒有更糟。
    // ⚠️ 但**第一次進站仍然不可覆寫**——伺服器（server/seo.js）已經依路由注入了
    //    關鍵字完整的標題，而 Google 採用的是渲染後的 DOM，蓋掉等於那份全白做。
    if (sig !== initialSig.current) hasNavigated.current = true
    if (hasNavigated.current) {
      if (!user) document.title = '機巧時運 · 智慧互動國民曆'
      else {
        // 日期頁的標題要帶上該日期，與伺服器注入的格式一致
        // 找不到頁面：站內與伺服器端要用同一句，否則同一個畫面兩種標題
        if (top?.screen === 'notFound') { document.title = '找不到頁面 · 機巧時運'; return }
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

  // ---------- 鍵盤捲動（手機／矮視窗版面必要）----------
  //
  // ⚠️ 手機版面（含 1280×545 這種矮視窗）捲的是內層的 `.device .body`，而
  //    `<html>`／`<body>` 的高度剛好被鎖成一個視窗——瀏覽器的鍵盤捲動是作用在
  //    「有焦點的捲動容器」上，`.body` 從來沒拿到焦點，所以空白鍵、PageDown、
  //    End、方向鍵**全部落空**（實測 scrollTop 0 → 0），只有滑鼠滾輪能捲。
  //    這同時是 WCAG 2.1.1 Keyboard 的違反：只能用鍵盤的人根本看不到第一屏以下。
  // ⚠️ 桌機（≥600px 且 ≥600px 高）是整頁捲動，瀏覽器原生就會處理——那時
  //    `scroller()` 找不到內層容器（`.body` 的 overflow 是 visible），直接不攔。
  // ⚠️ 在輸入框／可編輯區內打字時絕不可攔（空白鍵要能打空格）。
  //    也不攔 Ctrl/Cmd/Alt 組合鍵，那些是瀏覽器自己的快捷鍵。
  // ⚠️ 不可用 `if (!user) return` 擋掉——登入頁本身也是同一個內層捲動容器，
  //    只能用鍵盤的人連登入畫面都捲不動。沒有可捲容器時 scroller() 自然回 null。
  useEffect(() => {
    const scroller = () => {
      const el = document.querySelector('.device .body')
      if (!el) return null
      const st = getComputedStyle(el)
      const scrollable = /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 4
      return scrollable ? el : null
    }
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t && t.closest?.('input, textarea, select, [contenteditable="true"]')) return
      // 浮層開著時交給 SheetMask 處理（它自己有 Esc 與焦點鎖）
      if (document.querySelector('.sheet-mask')) return
      const sc = scroller()
      if (!sc) return
      const page = Math.max(120, sc.clientHeight * 0.9)
      const step = 60
      let dy = null
      switch (e.key) {
        case ' ': case 'Spacebar': dy = e.shiftKey ? -page : page; break
        case 'PageDown': dy = page; break
        case 'PageUp': dy = -page; break
        case 'ArrowDown': dy = step; break
        case 'ArrowUp': dy = -step; break
        case 'End': dy = sc.scrollHeight; break
        case 'Home': dy = -sc.scrollHeight; break
        default: return
      }
      e.preventDefault()
      // ⚠️ 不要用 `scrollBy({behavior:'smooth'})`——實測在真的 Chromium 上，對這個
      //    內層容器呼叫 smooth 版**完全沒有作用**（scrollTop 停在 0），同一行改成
      //    直接指定 scrollTop 就正常。平滑捲動需要合成器參與，容器在某些情況下
      //    拿不到那一幀，而且失敗是靜默的。能捲動比捲得漂亮重要。
      const max = sc.scrollHeight - sc.clientHeight
      sc.scrollTop = Math.max(0, Math.min(max, sc.scrollTop + dy))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [user])

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
      {/* 跳至主要內容：鍵盤使用者 Tab 第一下就能跳過導覽（規格要求項目）
          ⚠️ 不能只靠原生的 anchor jump。手機／矮視窗版面真正在捲的是內層的
             `.device .body`，而原生跳錨動不了它——實測按下去網址變成 /#main、
             畫面卻完全沒動（scrollTop 0 → 0），焦點也掉回 <body> 而不是 <main>。
             這個無障礙功能等於只是裝飾。改成自己捲內層容器並把焦點送進 main。 */}
      <a className="skip-link" href="#main" onClick={(e) => {
        const main = document.getElementById('main')
        if (!main) return
        e.preventDefault()
        const sc = document.querySelector('.device .body')
        const canScroll = sc && /(auto|scroll)/.test(getComputedStyle(sc).overflowY)
        if (canScroll) sc.scrollTo({ top: 0 })
        else main.scrollIntoView({ block: 'start' })
        // main 已有 tabIndex={-1}，可直接聚焦——螢幕閱讀器才會宣告新的區域
        main.focus?.({ preventScroll: true })
      }}>跳至主要內容</a>

      {/* ⚠️ 要把事件物件傳進去——圓形擴散的圓心就是這顆按鈕被按到的位置 */}
      <button className="theme-fab tap" onClick={(e) => toggleTheme(e)} aria-label="切換主題">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>

      {/* 桌機頂部網站式導覽列（≥900px；登入後才出現，取代底部分頁列） */}
      {user && !authLoading && <WebNav />}

      {/* tabIndex={-1}：讓「跳至主要內容」可以把焦點真的送進來（報告實測焦點只掉到 <body>） */}
      <main id="main" tabIndex={-1} className={`device ${TopScreen ? 'has-stack' : ''}`}>
        {authLoading ? (
          /* 還原登入狀態中（打 /api/me） */
          <div className="auth-splash"><Seal className="ba-seal" alt="" /><div className="muted">機巧時運載入中…</div></div>
        ) : !user ? (
          /* 未登入 → 登入／註冊畫面（全站入口守門） */
          <Auth />
        ) : (
          <>
            <VerifyBanner />
            {/* ★★★ **堆疊畫面排在根分頁之前**（2026-08-16 外部稽核）。
                原本 DOM 順序是「首頁那一整塊（H2×3）→ 堆疊畫面（H1）」，於是每個
                詳情頁的標題大綱都是 H2 → H2 → H2 → H1——搜尋引擎與螢幕閱讀器都吃虧。
                ⚠️ 這樣調不影響畫面：手機的 `.screen` 是 `position:absolute; z-index:10`
                   （定位元素本來就畫在流內容之上，與 DOM 先後無關），桌機的
                   `.rootpane` 在有堆疊時是 `display:none`。兩個斷點都實測過。
                ⚠️ **不可改成「有堆疊就不渲染 rootpane」**：那會把分頁的捲動位置與
                   已抓好的清單全部丟掉，而站上的捲動還原正是靠它留在 DOM 裡。 */}
            {/* 堆疊（詳情）畫面 —— 手機覆蓋在上方，桌機整頁流動；screen-<key> 供桌機各畫面微調版面 */}
            {/* key 帶畫面名稱：同深度換不同畫面要重新掛載（進場動畫、內部 state
                都該重置）；replace() 翻日是同名同深度，key 不變＝不重掛，正是我們
                要的。前綴同 rootpane，避免兩個兄弟的 key 互撞。 */}
            {TopScreen && (
              <div className={`screen screen-${top.screen}`} key={`screen-${stack.length}-${top.screen}`}>
                <TopScreen {...top.props} />
              </div>
            )}

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
            {/* ⚠️ 有堆疊畫面時，底下這層要 inert。手機上 `.screen` 是蓋在上面的浮層，
                背景這層看不見卻仍然吃 Tab：實測直接開 /auspicious 之後一直按 Tab，
                焦點會跑進看不見的首頁（通知、私訊、‹ 8/4 ›、底部分頁列），
                按 Enter 還會去改一個使用者看不到的頁面的日期。
                inert 同時處理焦點與螢幕閱讀器（等同 aria-hidden ＋ 移除 tabindex），
                也順便讓 /auspicious 的純文字內容不再包含整份首頁文案。
                ⚠️ 桌機這層本來就 `display:none`（.device.has-stack .rootpane），
                   但手機不是——所以不能只靠 CSS。 */}
            <div key={`root-${tab}`} inert={TopScreen ? '' : undefined}
              className={`rootpane tab-${tab} ${[2, 3, 4].includes(tab) ? 'grid2' : ''}`}>
              <RootScreen />
            </div>


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
