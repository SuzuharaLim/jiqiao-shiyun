import { TopBar, SectionHead, Breadcrumb, Link, Disclaimer } from '../components/ui.jsx'
import { GLOSSARY, glossaryBySlug } from '../data/glossary.js'

// ---------- 術語總覽 /glossary ----------
export function GlossaryIndex() {
  return (
    <>
      <TopBar title="國民曆術語解釋｜建除、彭祖百忌、受死日、黃道吉時" onBack />
      <div className="body">
        <Breadcrumb items={[{ label: '首頁', tab: 0 }, { label: '術語解釋' }]} />
        <p className="au-lead">
          曆頁上那些看不懂的名詞，一個一個解釋清楚。每則都標明典據，
          沒有明確出處的就誠實說沒有，並附上該項最常見的誤解。
        </p>
        <SectionHead title="名詞一覽" extra={`${GLOSSARY.length} 則`} />
        <div className="card">
          {GLOSSARY.map(g => (
            <Link key={g.slug} screen="glossaryDetail" params={{ slug: g.slug }} className="au-day">
              <b>{g.term}</b>
              <span>{g.answer.slice(0, 46)}…</span>
            </Link>
          ))}
        </div>
        <Disclaimer text="以上為傳統曆法與擇日的名詞解釋，屬民俗文化範疇。各流派對部分名詞的判定可能相異，本站已在各則標明採用的版本。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// ---------- 單一術語 /glossary/:slug ----------
export default function GlossaryDetail({ slug }) {
  const g = glossaryBySlug(slug)
  if (!g) {
    return (<><TopBar title="找不到這個名詞" onBack />
      <div className="body"><div className="empty">術語表裡沒有收錄這個名詞。</div></div></>)
  }
  const i = GLOSSARY.indexOf(g)
  const prev = GLOSSARY[(i - 1 + GLOSSARY.length) % GLOSSARY.length]
  const next = GLOSSARY[(i + 1) % GLOSSARY.length]
  const related = (g.related || []).map(glossaryBySlug).filter(Boolean)

  return (
    <>
      <TopBar title={`${g.term}是什麼意思？｜國民曆術語`} onBack />
      <div className="body">
        <Breadcrumb items={[
          { label: '首頁', tab: 0 },
          { label: '術語解釋', screen: 'glossary' },
          { label: g.term },
        ]} />

        <div className="td-head">
          <div className="td-term">{g.term}</div>
          {g.aka?.length > 0 && <div className="td-meta">又稱 {g.aka.join('、')}</div>}
        </div>

        {/* ⚠️ 這一段是「開頭就給完整答案」——AI 檢索器與 AI Overviews 摘的就是這裡，
            所以不可鋪陳、不可先講背景。40–60 字給完整定義。 */}
        <div className="card gl-answer"><p>{g.answer}</p></div>

        <SectionHead title="詳細說明" />
        <div className="card"><p>{g.detail}</p></div>

        {g.source && (
          <>
            <SectionHead title="典據" />
            <div className="card"><p>{g.source}</p></div>
          </>
        )}

        {g.caveat && (
          <>
            <SectionHead title="常見誤解" />
            <div className="card gl-caveat"><p>{g.caveat}</p></div>
          </>
        )}

        <div className="card">
          <Link screen="almanacDay" className="td-more">在今日曆頁看這一項的實際值 ›</Link>
        </div>

        {related.length > 0 && (
          <>
            <SectionHead title="相關名詞" />
            <nav className="td-tags" aria-label="相關名詞">
              {related.map(r => (
                <Link key={r.slug} screen="glossaryDetail" params={{ slug: r.slug }}>{r.term}</Link>
              ))}
            </nav>
          </>
        )}

        <nav className="td-nav" aria-label="前後名詞">
          <Link screen="glossaryDetail" params={{ slug: prev.slug }}>‹ {prev.term}</Link>
          <Link screen="glossary">術語總覽</Link>
          <Link screen="glossaryDetail" params={{ slug: next.slug }}>{next.term} ›</Link>
        </nav>

        <Disclaimer text="傳統曆法與擇日名詞解釋，屬民俗文化範疇，各流派判定可能相異。本頁不構成醫療、法律、財務或投資建議。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
