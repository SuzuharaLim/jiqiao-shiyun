import { useState, useMemo, useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { useNav, hrefForScreen, hrefForTab } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'

// 頂列（Top bar）
// ★ 無障礙關鍵：title 渲染成 <h1>。稽核發現全站原本 0 個 h1（標題都畫在這裡
//   但用 <div>），改這一處即補上 48 個畫面的標題語意。
//   tabIndex={-1} 供頁面切換後移轉焦點用（SPA 無障礙必要，見 App.jsx）。
//
// ★ 每頁只能有一個 h1：開啟堆疊畫面（如貼文詳情）時，根分頁的 TopBar 仍在
//   DOM 裡（只是 CSS 隱藏），若兩者都是 h1 就會重複。故底層的降級為 <p>，
//   只有「最上層畫面」的標題才是 h1。
export function TopBar({ title, brand, left, right, onBack, onClose }) {
  const { pop, stack } = useNav()
  // 有堆疊時，沒有 onBack/onClose 的 TopBar 代表它是被蓋住的根畫面
  const isTop = stack.length === 0 || onBack !== undefined || onClose !== undefined
  const TitleTag = isTop ? 'h1' : 'p'
  // onBack / onClose 可為 bare flag（true）或函式；bare 時預設呼叫 pop
  const showBack = onBack !== undefined
  const showClose = onClose !== undefined
  const backFn = typeof onBack === 'function' ? onBack : pop
  const closeFn = typeof onClose === 'function' ? onClose : pop
  return (
    <div className="topbar">
      <div className="row" style={{ minWidth: 30 }}>
        {showBack ? (
          <button className="iconbtn tap" onClick={backFn} aria-label="返回"><Icon name="back" /></button>
        ) : showClose ? (
          <button className="iconbtn tap" onClick={closeFn} aria-label="關閉"><Icon name="x" /></button>
        ) : (left || null)}
      </div>
      {brand
        /* 標誌用 <Seal>（公司 logo.svg）；alt 留空避免螢幕閱讀器把品牌名唸兩次 */
        ? <TitleTag className="brand" {...(isTop && { 'data-screen-title': true, tabIndex: -1 })}>
            <Seal className="tb-seal" alt="" badge />{brand}
          </TitleTag>
        : <TitleTag className="ttl" {...(isTop && { 'data-screen-title': true, tabIndex: -1 })}>{title}</TitleTag>}
      <div className="row" style={{ minWidth: 30, justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )
}

// 底部分頁列（Tab bar）—— 加中文標籤，去 IG 純圖示化
const TABS = [
  { i: 0, name: 'home', label: '首頁' }, { i: 1, name: 'search', label: '探索' },
  { i: 2, name: 'plus', label: '建立' }, { i: 3, name: 'fortune', label: '曆書' },
  { i: 4, name: 'user', label: '我的' },
]
export function TabBar() {
  const { tab } = useNav()
  return (
    /* ⚠️ 指示條改掛在 tabbar 上（見 styles.css 的 .tabbar::before），用 transform 滑過去。
       原本是各按鈕自己的 ::before，切分頁時舊的消失、新的出現，中間沒有位移＝看不出「從哪到哪」。
       這裡只交出「第幾格」，實際位移由 CSS 算（指示條本體是一格寬，位移＝100% × 序號）。 */
    /* ⚠️ 分頁是真的 <a href>（Link 元件）不是 <button>：
       中鍵/Cmd+點擊可開新分頁、爬蟲有內部連結可走。SPA 行為不變。 */
    <div className="tabbar" style={{ '--ink-i': tab }}>
      {TABS.map(t => (
        <Link key={t.i} tab={t.i} className={`tabbtn tap ${tab === t.i ? 'on' : ''}`}
          aria-label={t.label} aria-current={tab === t.i ? 'page' : undefined}>
          <Icon name={t.name} fill={tab === t.i} />
          <span className="tablbl">{t.label}</span>
        </Link>
      ))}
      {/* 掃描：開啟鏡頭掃描實體明信片／手帳（之後接明信片辨識） */}
      <Link screen="scan" className="tabbtn tap scanbtn" aria-label="掃描明信片">
        <Icon name="scan" />
        <span className="tablbl">掃描</span>
      </Link>
    </div>
  )
}

// SPA 內部導覽連結 —— 必須是真的 <a href>，不是 <button>。
// ⚠️ 為什麼：實測全站原本只有 1 個 <a>（跳過主要內容），導覽列、頁尾全是
//    <button>——中鍵／Cmd+點擊開新分頁完全失效，搜尋引擎也爬不到任何內部連結
//    （逐頁 meta 都做了，卻沒有連結能讓爬蟲走到那些頁）。
// 行為：一般左鍵 → preventDefault 走 SPA 導覽（不重整）；
//       中鍵／Cmd／Ctrl／Shift ＋點擊 → 交還瀏覽器原生行為（開新分頁）。
// href 一律來自 nav.jsx 的 hrefFor*（路徑的唯一真相），不可自己拼字串。
export function Link({ tab, screen, params, className = '', onNavigate, children, ...rest }) {
  const { setTab, push } = useNav()
  const href = screen != null ? (hrefForScreen(screen, params) || '/') : hrefForTab(tab)
  return (
    <a href={href} className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        if (screen != null) push(screen, params || {})
        else setTab(tab)
        onNavigate?.()
      }}
      {...rest}>
      {children}
    </a>
  )
}

// 數字滾動（count-up）：從 0 滾到目標值。
// 「0 作品」直接顯示沒差，但使用者真的有 12 件作品時，滾上去的那一下是成就感。
// ⚠️ reduce-motion（系統偏好或 App 內開關）時直接顯示終值，不播。
export function CountUp({ value, ms = 900 }) {
  const n = Number(value) || 0
  const reduce = typeof document !== 'undefined' && (
    document.documentElement.dataset.reduceMotion === 'on'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [shown, setShown] = useState(reduce ? n : 0)
  useEffect(() => {
    if (reduce || n === 0) { setShown(n); return }
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms)
      setShown(Math.round(n * (1 - Math.pow(1 - p, 3))))   // easeOutCubic
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [n, ms, reduce])
  return <>{shown.toLocaleString()}</>
}

// 占卜／配對的分數條。
// 占卜的價值在「揭曉」：分數瞬間就位＝答案早就寫好了，從 0 跑上去＝正在為你推算。
//
// ⚠️ 這裡刻意用 CSS **animation** 而不是 transition，並靠 key 重掛載來重播。
//    「先設 0、下一幀再設真值」的 transition 作法在這個元件實測有三種失敗：
//      1. useState + requestAnimationFrame：effect 在 commit 後、paint 前跑，
//         rAF 回呼也在同一幀被吃掉，瀏覽器沒畫出 width:0 那一格
//         → 分數條是從「上一個生肖的分數」滑到新分數（82%→71%），不是從 0。
//      2. 寫 0% ＋ 強制 reflow：transition 還開著時寫 0% 不會瞬間跳到 0，
//         而是「開始一段往 0 的過場」，下一行寫真值時起點還在舊分數上
//         （實測第 16ms 量到的仍是舊值 204px）。
//      3. 關 transition → 寫 0% → reflow → 開 transition → 寫真值：
//         起點對了，但瀏覽器仍以 transition:none 當「變更前樣式」，寬度直接跳到終點
//         （實測 60ms 就到位，等於沒有動畫）。
//    animation 沒有「變更前樣式」這回事——keyframes 自己定義了起訖，
//    只要元素是新的就一定從頭播完。key 換掉即重掛載，行為完全確定。
export function Meter({ score = 0 }) {
  // key 用「第幾次揭曉」而不是分數本身：不同項目剛好同分時也要重播
  const [round, setRound] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }   // 首次掛載本來就會播
    setRound(r => r + 1)
  }, [score])
  return (
    <div className="meter">
      <div key={round} style={{ '--meter-to': `${score}%` }} />
    </div>
  )
}

// 清單列（工具 / 選項）
// icon 可傳 emoji 字串（舊）或 Icon 名稱（新，優先）。
// ⚠️ 彩色 emoji 與紙感氣質斷層（Windows 上是 Segoe UI 彩色卡通圖），
// 新程式碼一律傳 iconName；bg 也不再需要（線條圖示用墨色描邊即可）。
// ⚠️ 給了 screen 就渲染成真的 <a href>，只有純動作（登出、切換）才留 <button>。
//    /almanac 的 20 幾張卡片原本全是 <button>，於是不能 Ctrl／中鍵開新分頁、
//    不能右鍵複製連結、滑過去左下角看不到網址、螢幕閱讀器唸成「按鈕」而不是
//    「連結」，搜尋引擎也爬不到這些內部連結——而同一個站的 /auspicious、/dream
//    早就是正確的 <a href>，所以不是做不到，是漏了。
//    href 一律由 nav.jsx 的 hrefForScreen 產生（路徑的唯一真相），不可自己拼。
export function ToolRow({ icon, iconName, bg, title, sub, onClick, right, screen, params }) {
  const inner = (
    <>
      {iconName
        ? <div className="ti ti-line"><Icon name={iconName} /></div>
        : icon && <div className="ti" style={{ background: bg }}>{icon}</div>}
      <div className="tn2">
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </div>
      {right !== undefined ? right : <Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />}
    </>
  )
  if (screen) {
    return <Link screen={screen} params={params} className="tool tap" onNavigate={onClick}>{inner}</Link>
  }
  return <button className="tool tap" onClick={onClick}>{inner}</button>
}

// 開關（Switch）—— 用 span（非 button），避免巢狀在 ToolRow 的 <button> 內造成 DOM 穿模
export function Switch({ on, onChange }) {
  return (
    <span
      className={`sw ${on ? 'on' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange && onChange(!on) }}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onChange && onChange(!on) } }}
      role="switch" aria-checked={on} tabIndex={0}
    ><i /></span>
  )
}

// ---------- 麵包屑 ----------
// ⚠️ 稽核指出 /solarterms 整頁只有 14 個連結、而且全是 header/footer 的全站導覽，
//    沒有任何情境化的內容連結，也沒有麵包屑。麵包屑同時做三件事：
//    (1) 讓爬蟲理解站內層級 (2) 讓 SERP 顯示路徑而不是一長串網址
//    (3) 深層頁的使用者知道自己在哪、回得去（桌機的返回鍵離內容很遠）
//
// 每一層都是真的 <a href>（走 Link），最後一層是當前頁不給連結。
// 同時輸出 BreadcrumbList JSON-LD——Google 用它來畫 SERP 上的路徑。
export function Breadcrumb({ items = [] }) {
  if (items.length < 2) return null
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.tab != null || it.screen
        ? { item: `https://chengqi.tw${it.tab != null ? hrefForTab(it.tab) : hrefForScreen(it.screen, it.params)}` }
        : {}),
    })),
  }
  return (
    <>
      <nav className="crumb" aria-label="麵包屑">
        {items.map((it, i) => {
          const last = i === items.length - 1
          return (
            <span key={i}>
              {i > 0 && <i aria-hidden="true">›</i>}
              {last
                ? <b aria-current="page">{it.label}</b>
                : it.tab != null
                  ? <Link tab={it.tab}>{it.label}</Link>
                  : <Link screen={it.screen} params={it.params}>{it.label}</Link>}
            </span>
          )
        })}
      </nav>
      {/* ⚠️ 用 dangerouslySetInnerHTML 是 JSON-LD 的標準做法：React 會把
          {JSON.stringify(x)} 當文字轉義，`<` 變成 &lt; 會讓 Google 解析失敗。 */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld) }} />
    </>
  )
}

// ---------- JSON-LD 結構化資料 ----------
// ⚠️ 只放「Google 現在還會用」的類型。已確認失效的不要再投入：
//   FAQPage      2026-05-07 起 rich results 完全停止顯示
//   HowTo        2023-09 起不再顯示
//   SearchAction 2024-11-21 起 sitelinks 搜尋框已停止
//   BreadcrumbList 2025-01 起行動結果不顯示，但**桌機仍有**且 Google 仍用它
//                  理解站台結構，所以保留。
// 仍在官方 Search Gallery 的：Article、Event、Product/Offer、Organization、
// ImageObject、Profile page、Video、Q&A、Local business。
//
// ⚠️ 必須用 dangerouslySetInnerHTML：React 會把 {JSON.stringify(x)} 當文字轉義，
//    `<` 變成 &lt; 會讓 Google 解析失敗。
export function JsonLd({ data }) {
  if (!data) return null
  return <script type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

// 文章類頁面（節氣、術語、神佛、編輯政策）
export const articleLd = ({ headline, description, url, section, modified }) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline,
  ...(description ? { description } : {}),
  ...(url ? { mainEntityOfPage: { '@type': 'WebPage', '@id': url } } : {}),
  ...(section ? { articleSection: section } : {}),
  // ⚠️ 日期要誠實。Google 明文把「改日期讓內容看起來很新」列為 helpful content
  //    自評的反面例子，寫一個假的 dateModified 是負分不是加分。
  ...(modified ? { dateModified: modified } : {}),
  inLanguage: 'zh-Hant-TW',
  isAccessibleForFree: true,
  publisher: { '@type': 'Organization', name: '機巧時運', '@id': 'https://chengqi.tw/#org' },
})

// 商品。⚠️ 沒有 Product schema 就不會有商品類的豐富結果（價格、庫存、評價）。
//    price 為 null＝洽詢報價：這種情況**不可填 price: 0**（那會被判成免費商品），
//    改用 Offer.availability + priceSpecification 只給幣別，讓 Google 知道
//    「有在賣但價格需洽詢」。
//    ⚠️ 也**不可捏造 aggregateRating／review**——虛構評價是明確違規，
//    真的有評價資料再加。
export const productLd = ({ name, description, url, price, image, sku, brand = '機巧時運' }) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name,
  ...(description ? { description } : {}),
  ...(image ? { image } : {}),
  ...(sku ? { sku } : {}),
  brand: { '@type': 'Brand', name: brand },
  offers: {
    '@type': 'Offer',
    url,
    priceCurrency: 'TWD',
    ...(price != null
      ? { price: String(price), availability: 'https://schema.org/InStock' }
      : { availability: 'https://schema.org/InStock', priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'TWD' } }),
    seller: { '@type': 'Organization', name: '機巧時運', '@id': 'https://chengqi.tw/#org' },
  },
})

// 慶典（Event 仍有 rich result，且有日期地點時特別吃香）
export const eventLd = ({ name, startDate, place, description, url }) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name,
  startDate,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  ...(place ? { location: { '@type': 'Place', name: place, address: { '@type': 'PostalAddress', addressCountry: 'TW' } } } : {}),
  ...(description ? { description } : {}),
  ...(url ? { url } : {}),
})

// 區段標題
export function SectionHead({ title, extra, as: Tag = 'h2' }) {
  // 標題包成 span，朱紅標記才能當成標題的一部分。
  // 先前用 .sech::before 絕對定位，位置要用 padding 反推，在不同畫面會跑掉。
  // ⚠️ 外層要是真的 <h2>：這些區塊視覺上早就是標題了，但用 <div> 包起來的話
  //    搜尋引擎與螢幕閱讀器都看不到層級——實測整站只有 1 個 h1、零個 h2。
  return <Tag className="sech"><span className="sech-t">{title}</span>{extra && <span>{extra}</span>}</Tag>
}

// 命理／占卜 免責聲明（上線合規）
export function Disclaimer({ text }) {
  return (
    <p className="muted" style={{ padding: '6px 16px 16px', fontSize: 'var(--text-2xs)', lineHeight: 1.7 }}>
      ＊{text || '本結果結合傳統民俗文化與 AI 生成內容，僅供參考娛樂，不構成醫療、法律、財務、婚姻或投資等專業建議。'}
    </p>
  )
}

// ---------- 宜／忌 詞彙白話解釋 ----------
// 用法：父層 const gl = useGlossary() → 用 <GlossTerm term={t} cls="ty" gl={gl} /> 取代原本的文字，
// 再在合適位置放一個 <GlossPanel gl={gl} />（通常放在兩欄之下，才有整行寬度顯示說明）。
// 詞彙表存 DB 的 ref_items（kind=almanacTerms），查不到解釋的詞會自動退化成純文字（不可點）。
export function useGlossary() {
  const items = useContent('almanacTerms')
  const map = useMemo(
    () => Object.fromEntries((items || []).map(it => [it.term, it.mean])),
    [items])
  const [open, setOpen] = useState(null)
  return {
    map, open,
    toggle: (t) => setOpen(o => (o === t ? null : t)),
    close: () => setOpen(null),
  }
}

export function GlossTerm({ term, cls = '', gl }) {
  // ⚠️ 沒有詞條的詞也要有 `.gterm`。原本只回一個裸 <span>，它是 inline、沒有右邊距、
  //    也沒有 nowrap，而有詞條的 `.glossable` 兩者都有——於是只要連續出現兩個沒詞條的
  //    詞（例如平日的「修飾垣牆」「平治道塗」）就會**黏成一坨八個字**，
  //    在 356px 手機寬度下還會從詞的中間硬切成「修／飾垣牆平治道塗」。
  // ⚠️ 同時要讓「不可點」看得出來：使用者會直覺去點這些罕見詞，發現沒反應。
  //    有詞條的是虛線底線（暗示可點），沒詞條的就不畫底線。
  if (!gl?.map[term]) return <span className={`${cls} gterm`}>{term}</span>
  const on = gl.open === term
  return (
    <button type="button" className={`${cls} gterm glossable tap${on ? ' on' : ''}`}
      aria-expanded={on} aria-label={`${term}，查看說明`}
      onClick={() => gl.toggle(term)}>{term}</button>
  )
}

export function GlossPanel({ gl }) {
  if (!gl?.open) return null
  return (
    <div className="glosspanel" role="status">
      <b>{gl.open}</b>
      <span>{gl.map[gl.open]}</span>
      <button type="button" className="x tap" aria-label="關閉說明" onClick={gl.close}>✕</button>
    </div>
  )
}

// 使用者上傳的照片：填滿容器（.ph/.img/.gimg 等 emoji 佔位框），無圖時由呼叫端 fallback 到 emoji
// 照片：載入完成才淡入，不要「啪」一下出現。
// ⚠️ 容器（.ph / .album .it .ph / .gimg / .railcard .ph）本來就有
//    aspect-ratio 或固定尺寸，空間是預留好的——所以這裡**沒有 CLS 問題**，
//    加淡入純粹是為了收掉那個突兀的瞬間。不要為此再給 img 設寬高，
//    那會和容器的 aspect-ratio 打架。
// ⚠️ 必須處理「圖片已在快取」的情況：那時 onLoad 可能在 React 掛上
//    handler 之前就觸發過了，只靠 onLoad 會永遠停在透明。用 ref 補查
//    img.complete。
// ⚠️ alt 一定要傳真的敘述。這裡原本寫死 alt=""（＝宣告「這是裝飾圖，螢幕閱讀器
//    可以跳過」），但這些正是本站唯一的原創視覺資產——節氣攝影作品。alt 空白等於
//    自願退出 Google 圖片搜尋，而「立春 台灣」「大暑 稻田」這類查詢的圖片結果
//    幾乎沒有競爭。對讀屏使用者也是：整頁作品全部被跳過，等於這一頁沒有內容。
//    真的沒有敘述可用時才留空（例如純色佔位）。
export function PhotoImg({ src, alt = '', style }) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (el?.complete) setLoaded(true)     // 快取命中：onLoad 不會再來
  }, [src])
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}      // 載入失敗也要顯示（才看得到破圖佔位，不是一片空白）
      className={`photo-img${loaded ? ' loaded' : ''}`}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit', ...style }}
    />
  )
}

// 浮動提示（Toast）
// ⚠️ 「有進場沒離場」是最常見的半套動畫：使用者的大腦記住了它是滑上來的，
// 於是預期它滑下去；1.8 秒後「啪」地消失會產生一種說不上來的粗糙感。
// 作法：toast 轉 null 時不立刻卸載，先保留最後一則內容播離場，動畫結束才真的移除。
export function Toast() {
  const { toast, toastAction } = useNav()
  const [shown, setShown] = useState(null)
  const [act, setAct] = useState(null)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (toast) { setShown(toast); setAct(toastAction); setLeaving(false) }
    else setLeaving(l => (shown ? true : l))
  }, [toast])          // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown) return null
  return (
    <div className={`toast${leaving ? ' out' : ''}`} role="status"
      onAnimationEnd={() => { if (leaving) { setShown(null); setAct(null); setLeaving(false) } }}>
      <span>{shown}</span>
      {act && <button className="toast-act tap" onClick={() => { act.onClick?.(); setLeaving(true) }}>{act.label}</button>}
    </div>
  )
}

// 蓋印章：成功回饋的品牌動作（註冊成功／發佈成功／下單成功）。
// 由 nav 的 setStamp(訊息) 觸發，1.4 秒後自動收。
export function StampMark() {
  const { stamp } = useNav()
  if (!stamp) return null
  return (
    <div className="stamp-layer" role="status" aria-live="polite">
      <div className="stamp-box">
        <div className="stamp-seal seal-stamp"><Seal badge alt="" /></div>
        <div className="stamp-tx">{stamp}</div>
      </div>
    </div>
  )
}

// 底部彈出面板的遮罩層 —— 統一處理「離場動畫跑完才卸載」。
//
// ⚠️ 為什麼要有這支：原本 6 個 sheet 都是 `{open && <div className="sheet-mask">…}`，
//    關閉時直接從 DOM 拔掉。有進場沒離場，收起來像被剪斷。
//    這裡用 render prop 把「開始關閉」的函式交給內容，內部的 ✕ 鈕才能一起播動畫。
//
// 用法：<SheetMask onClose={() => setOpen(false)}>{close => <div className="sheet">…</div>}</SheetMask>
export function SheetMask({ onClose, children, label = '對話框' }) {
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(null)
  const boxRef = useRef(null)
  const opener = useRef(null)
  // ⚠️ 不能只靠 animationend：分頁切到背景時瀏覽器會暫停動畫，事件遲遲不觸發，
  //    面板就會一直掛在那裡（雖然已經 pointer-events:none，但仍是殘留節點）。
  //    補一個硬性上限（動畫 240ms + 60ms 緩衝），先到的那個生效。
  const close = () => {
    if (leaving) return
    setLeaving(true)
    timer.current = setTimeout(() => { timer.current = null; onClose() }, 300)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // ⚠️ 浮層的三件基本功，原本一件都沒有：
  //   · **Esc 關不掉**——實測按 Esc 完全沒反應，面板還在。使用者的第一反應就是按 Esc。
  //   · **焦點沒有移進來也沒有鎖住**——開啟後焦點還停在頁首的 <h1>，連按三下 Tab
  //     就跑到面板外、遮罩底下看不見的「›下一天」按鈕上；按 Enter 會去動一個
  //     使用者看不到的東西。
  //   · **沒有 role="dialog" / aria-modal**——讀螢幕的人不會知道跳出了東西。
  //   關閉時要把焦點還給原本那顆觸發按鈕，否則焦點掉回 <body>，鍵盤使用者要
  //   從頭 Tab 一次。
  useEffect(() => {
    opener.current = document.activeElement
    const el = boxRef.current
    // 移進面板：優先第一個可聚焦元素，沒有就聚焦容器本身
    const first = el?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ;(first || el)?.focus?.({ preventScroll: true })

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return }
      if (e.key !== 'Tab' || !el) return
      // 焦點鎖：Tab 循環只在面板內走
      const f = [...el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(n => !n.disabled && n.offsetParent !== null)
      if (!f.length) { e.preventDefault(); return }
      const i = f.indexOf(document.activeElement)
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus() }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // 還原焦點（元素可能已被卸載，所以要防呆）
      try { opener.current?.focus?.({ preventScroll: true }) } catch { /* ignore */ }
    }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    onClose()
  }
  return (
    <div className={`sheet-mask${leaving ? ' out' : ''}`} onClick={close}
      ref={boxRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      /* 只認遮罩自己的動畫；.sheet 的離場動畫會冒泡上來，要濾掉否則會提早卸載 */
      onAnimationEnd={(e) => { if (leaving && e.target === e.currentTarget) finish() }}>
      {typeof children === 'function' ? children(close) : children}
    </div>
  )
}

// 頭像：有上傳的照片就顯示照片，否則回退 emoji。
// 放在 .pf-av/.av/.wn-ava 等既有圓形容器內，靠 object-fit 填滿。
export function Avatar({ imageId, emoji = '🌾' }) {
  if (!imageId) return <>{emoji}</>
  return <img src={`/api/images/${imageId}`} alt=""
    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
}

// 品牌標誌。用 <img> 指向 public 的 SVG（同源，符合 CSP 的 img-src 'self'），
// 不內嵌 SVG——那份路徑資料 24KB，內嵌多處會讓 bundle 白白多 100KB。
//
// 兩個版本，依尺寸選用（實測：畫到 canvas 數「標誌墨跡」佔方塊的比例）：
//   logo.svg   原版：金色細線條、透明底。白底 24px 只有 16.1% 墨跡、平均色差 27
//              —— 小尺寸是一團糊，只適合 ≥56px 的大標誌（登入頁/錯誤頁）。
//   logo-mark.svg 小尺寸版：透明底＋金色標誌＋加粗筆畫，24px 下墨跡約 30%。
//              （分頁圖示另有 favicon.svg＝白底版，分頁列需要底色才辨識得出）
// badge 用在頂列(24)/導覽列(34)/頁尾(28)，大圖才用原版。
// ⚠️ 量測要比對「標誌 vs 方塊底色」，不是「方塊 vs 白色」——後者永遠是 100%，
//    先前就是這樣量出假的合格數字，實際上標誌只佔 6.3% 且沒置中。
export function Seal({ className = '', alt = '機巧時運', badge = false }) {
  return <img className={`seal-mark ${className}`} src={badge ? '/logo-mark.svg?v=1' : '/logo.svg'} alt={alt} />
}

// 空狀態：統一版型。iconName 用線條圖示（取代先前各處寫死的 <div className="big">emoji</div>）
export function Empty({ iconName = 'search', title, hint, children }) {
  return (
    <div className="empty">
      {iconName && <div className="empty-ic"><Icon name={iconName} /></div>}
      {title && <div className="empty-t">{title}</div>}
      {hint && <div className="empty-h">{hint}</div>}
      {children}
    </div>
  )
}
