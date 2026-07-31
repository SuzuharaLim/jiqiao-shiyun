import { useMemo } from 'react'
import { TopBar, SectionHead, Breadcrumb, Link } from '../components/ui.jsx'
import { useContent } from '../hooks/useApi.js'
import { dayFor, todayOffset, monthsForTerm } from '../data/almanac.js'
import { termTable } from '../data/lunisolar.js'
import { PRODUCE_BY_MONTH } from '../data/produce.js'
import { TERM_ARTICLES, articleBySlug } from '../data/termArticle.js'

// 單一節氣的專頁 —— /solarterms/:slug
//
// ⚠️ 這頁存在的理由：24 個節氣原本共用 /solarterms 一個網址，用橫向 tab 切換，
//    tab 不是 <a href> 所以爬蟲點不到也記不住，整頁可見文字只有 472 字。
//    節氣是這個產品的核心概念，卻是全站最薄的一頁。現在一個節氣一個網址，
//    內容由「典據層（七十二候）＋台灣在地層＋當令農產＋俗語慶典」疊起來。
export default function TermDetail({ slug }) {
  const a = articleBySlug(slug)
  const guides = useContent('termGuide')
  const today = useMemo(() => dayFor(todayOffset()).term, [])

  // 當令農產（節氣涵蓋月份取聯集，同 Ingredients 的規則）
  const produce = useMemo(() => {
    if (!a) return []
    const seen = new Map()
    for (const m of monthsForTerm(a.term)) {
      for (const it of (PRODUCE_BY_MONTH[String(m)] || [])) {
        if (!seen.has(it.name)) seen.set(it.name, it)
      }
    }
    return [...seen.values()]
  }, [a])

  if (!a) {
    return (
      <>
        <TopBar title="找不到這個節氣" onBack />
        <div className="body"><div className="empty">沒有這個節氣，請回節氣專欄看看。</div></div>
      </>
    )
  }
  const g = (guides || []).find(x => x.term === a.term)
  const ty = new Date().getFullYear()
  const years = [ty - 1, ty, ty + 1, ty + 2]
    .map(y => { const t = termTable(y).find(x => x.name === a.term); return t && { y, m: t.m, d: t.d } })
    .filter(Boolean)
  // 前後節氣：讓爬蟲與使用者能一路走完 24 個
  const order = TERM_ARTICLES.map(x => x.term)
  const i = order.indexOf(a.term)
  const prev = TERM_ARTICLES[(i - 1 + 24) % 24]
  const next = TERM_ARTICLES[(i + 1) % 24]

  return (
    <>
      <TopBar title={`${a.term}｜由來、三候、台灣氣候與當令`} onBack />
      <div className="body">
        <Breadcrumb items={[
          { label: '首頁', tab: 0 },
          { label: '二十四節氣專欄', screen: 'solarterms' },
          { label: a.term },
        ]} />

        <div className="td-head">
          <div className="td-term">{a.term}{a.term === today && <span className="td-now">今</span>}</div>
          <div className="td-meta">{a.season}季　{g?.date || ''}</div>
        </div>

        <SectionHead title="節氣釋義" />
        <div className="card"><p>{a.meaning}</p></div>

        <SectionHead title="七十二候" extra="《月令七十二候集解》" />
        <div className="card">
          {a.hou.map((h, k) => (
            <div key={h.name} className="td-hou">
              <b>{['初候', '二候', '三候'][k]}　{h.name}</b>
              <span className="muted">{h.say}</span>
            </div>
          ))}
          <p className="muted td-note">
            ＊七十二候是古代黃河流域的物候觀察，逐字引自原典。台灣位於亞熱帶，
            許多候與實際情形對不上（例如大雪不下雪、小寒仍可能有 25 度），
            下一段是台灣的實況。
          </p>
        </div>

        <SectionHead title={`${a.term}在台灣`} />
        <div className="card"><p>{a.taiwan}</p></div>

        {g?.tips?.length > 0 && (
          <>
            <SectionHead title="生活小叮嚀" />
            <div className="card">
              <ul className="td-list">{g.tips.map((t, k) => <li key={k}>{t}</li>)}</ul>
            </div>
          </>
        )}

        <SectionHead title="農事" />
        <div className="card"><p>{a.farm}</p></div>

        {produce.length > 0 && (
          <>
            <SectionHead title="當令農產" extra={`${monthsForTerm(a.term).map(m => `${m} 月`).join('・')}　共 ${produce.length} 項`} />
            <div className="card">
              <p className="td-crops">{produce.slice(0, 24).map(p => p.name).join('、')}
                {produce.length > 24 && ` 等 ${produce.length} 項`}</p>
              <Link screen="ingredients" className="td-more">看完整當令食材與產地 ›</Link>
              <p className="muted td-note">＊資料來源：農業部（農糧署）「每月盛產農產品產地」開放資料。</p>
            </div>
          </>
        )}

        {g?.sayings?.length > 0 && (
          <>
            <SectionHead title="節氣俗語" />
            <div className="card">
              {g.sayings.map((sv, k) => <p key={k} className="td-saying">「{sv}」</p>)}
              <Link screen="proverbs" className="td-more">更多台灣諺語 ›</Link>
            </div>
          </>
        )}

        {(g?.foods?.length > 0 || g?.festivals?.length > 0 || g?.flowers?.length > 0) && (
          <>
            <SectionHead title="應景與活動" />
            <div className="card">
              {g.foods?.length > 0 && <div className="kv"><span>應景食物</span><b>{g.foods.join('、')}</b></div>}
              {g.festivals?.length > 0 && <div className="kv"><span>節慶活動</span><b>{g.festivals.join('、')}</b></div>}
              {g.flowers?.length > 0 && <div className="kv" style={{ borderBottom: 'none' }}><span>當季花期</span><b>{g.flowers.join('、')}</b></div>}
            </div>
          </>
        )}

        {(g?.organ || g?.luckyColor) && (
          <>
            <SectionHead title="節氣養生與開運色" />
            <div className="card">
              {g.organ && <div className="kv"><span>養生重點</span><b>{g.organ}</b></div>}
              {g.luckyColor && <div className="kv" style={{ borderBottom: 'none' }}><span>開運色</span><b>{g.luckyColor}</b></div>}
            </div>
          </>
        )}

        {/* 「大暑是幾號」是這類頁面最常見的查詢。逐年實算，每頁內容都不同。 */}
        <SectionHead title={`${a.term}是幾號？`} extra="近年交節日期" />
        <div className="card">
          {years.map(y => (
            <div key={y.y} className="kv"><span>{y.y} 年</span><b>{y.m} 月 {y.d} 日</b></div>
          ))}
          <p className="muted td-note">
            ＊節氣交節時刻由太陽視黃經實算，每年略有不同（本站以 UTC+8 為日界）。
            交節當天起算，到下一個節氣前一天為止，都算在{a.term}的區間內。
          </p>
        </div>

        <SectionHead title={`${a.term}拍什麼`} />
        <div className="card">
          <p>{a.photo}</p>
          <Link screen="todayShots" params={{ term: a.term }} className="td-more">
            看大家拍的〈{a.term}〉 ›
          </Link>
        </div>

        {/* 前後節氣：24 頁互相串成一圈，爬蟲可以一路走完 */}
        <nav className="td-nav" aria-label="前後節氣">
          <Link screen="termDetail" params={{ slug: prev.slug }}>‹ {prev.term}</Link>
          <Link screen="solarterms">節氣總覽</Link>
          <Link screen="termDetail" params={{ slug: next.slug }}>{next.term} ›</Link>
        </nav>

        <p className="muted" style={{ padding: '10px 16px 0', fontSize: 'var(--text-2xs)', lineHeight: 1.8 }}>
          ＊節氣交節時刻依太陽視黃經實算（UTC+8 日界）。七十二候逐字引自《月令七十二候集解》，
          白話說明與台灣氣候段落為本站編寫。農事與攝影建議僅供參考。
        </p>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// 節氣總覽用的四季分組（桌機不再只有一條會被切掉的橫向捲軸）
export function termsBySeason() {
  const by = { 春: [], 夏: [], 秋: [], 冬: [] }
  for (const t of TERM_ARTICLES) by[t.season].push(t)
  return by
}
