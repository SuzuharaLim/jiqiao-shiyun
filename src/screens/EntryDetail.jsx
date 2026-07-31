import { useMemo } from 'react'
import { TopBar, SectionHead, Breadcrumb, Link, Disclaimer } from '../components/ui.jsx'
import { useContent } from '../hooks/useApi.js'
import { dayFor, todayOffset } from '../data/almanac.js'
import { nextLunarOccurrence, lunarFromDate } from '../data/lunisolar.js'
import { DREAMS, dreamExtend } from '../data/dream.js'
import { DEITY_ARTICLES, deityBySlug } from '../data/deityArticle.js'

// ---------- 神佛誕辰單頁 /deities/:slug ----------
// ⚠️ 條目化的前提是「每頁有實質內容」。神佛頁之所以做得起來，是因為除了
//    誕辰日期之外，還有由來、信仰內涵、主要廟宇、祭祀習俗可以寫。
//    諺語（一句話＋一句解釋）與賞花（名稱＋花期＋地點）撐不到這個厚度，
//    硬做只會產生大量薄內容頁，反而拖累全站評價——所以刻意不做。
export function DeityDetail({ slug }) {
  const a = deityBySlug(slug)
  const occ = useMemo(() => (a ? nextLunarOccurrence(a.lunarMonth, a.lunarDay) : null), [a])

  if (!a) {
    return (<><TopBar title="找不到這位神明" onBack />
      <div className="body"><div className="empty">沒有收錄這位神明。</div></div></>)
  }
  const dt = occ?.date
  const i = DEITY_ARTICLES.indexOf(a)
  const prev = DEITY_ARTICLES[(i - 1 + DEITY_ARTICLES.length) % DEITY_ARTICLES.length]
  const next = DEITY_ARTICLES[(i + 1) % DEITY_ARTICLES.length]

  return (
    <>
      <TopBar title={`${a.name}聖誕｜農曆${a.lunarMonth}月${a.lunarDay}日`} onBack />
      <div className="body">
        <Breadcrumb items={[
          { label: '首頁', tab: 0 },
          { label: '臺灣神佛誕辰', screen: 'deities' },
          { label: a.name },
        ]} />

        <div className="td-head">
          <div className="td-term">{a.emoji} {a.name}</div>
          <div className="td-meta">{a.alias?.length ? `又稱 ${a.alias.join('、')}` : ''}</div>
        </div>

        <SectionHead title="誕辰" />
        <div className="card">
          <div className="kv"><span>農曆</span><b>{a.lunarMonth} 月 {a.lunarDay} 日</b></div>
          {dt && (
            <>
              <div className="kv"><span>下次國曆日期</span><b>{dt.getFullYear()}/{dt.getMonth() + 1}/{dt.getDate()}</b></div>
              <div className="kv" style={{ borderBottom: 'none' }}>
                <span>倒數</span><b>{occ.daysAway === 0 ? '就是今天' : `還有 ${occ.daysAway} 天`}</b>
              </div>
            </>
          )}
          {a.note && <p className="muted td-note">{a.note}</p>}
        </div>

        <SectionHead title="由來" />
        <div className="card"><p>{a.origin}</p></div>

        <SectionHead title="信仰內涵" />
        <div className="card">
          <p>{a.belief}</p>
          {a.bless?.length > 0 && (
            <div className="kv" style={{ marginTop: 8, borderBottom: 'none' }}>
              <span>常見祈求</span><b>{a.bless.join('、')}</b>
            </div>
          )}
        </div>

        <SectionHead title="台灣主要廟宇" />
        <div className="card">
          <ul className="td-list">{a.temples.map((t, k) => <li key={k}>{t}</li>)}</ul>
          <p className="muted td-note">＊僅列部分香火鼎盛或具文化資產身分者，非完整名單。</p>
        </div>

        {a.custom && (<><SectionHead title="祭祀與習俗" /><div className="card"><p>{a.custom}</p></div></>)}

        <nav className="td-nav" aria-label="其他神明">
          <Link screen="deityDetail" params={{ slug: prev.slug }}>‹ {prev.name}</Link>
          <Link screen="deities">誕辰總覽</Link>
          <Link screen="deityDetail" params={{ slug: next.slug }}>{next.name} ›</Link>
        </nav>

        <p className="muted" style={{ padding: '10px 16px 0', fontSize: 'var(--text-2xs)', lineHeight: 1.8 }}>
          ＊誕辰為農曆日期，國曆換算由真實農曆演算逐年推得。各地廟宇的祭典日期可能因
          擲筊或地方慣例而不同，請以該宮廟公告為準。
        </p>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// ---------- 解夢單頁 /dream/:slug ----------
// ⚠️ 只有「有原典斷語」的詞條才建立獨立頁。沒有原典的條目內容太薄，
//    做成獨立頁就是空殼——寧可少幾十頁，也不要拖累全站評價。
export function DreamDetail({ slug }) {
  const today = dayFor(todayOffset())
  const dayWx = today.wuxing?.slice(-1)
  const d = DREAMS.find(x => x.k[0] === slug)

  if (!d) {
    return (<><TopBar title="找不到這個夢境" onBack />
      <div className="body"><div className="empty">詞庫裡沒有收錄這個夢境。</div></div></>)
  }
  // 同五行的其他夢境（情境化內部連結，不是全站導覽）
  const related = DREAMS.filter(x => x !== d && x.wx === d.wx).slice(0, 6)

  return (
    <>
      <TopBar title={`夢見${d.k[0]}｜原典斷語與現代參考`} onBack />
      <div className="body">
        <Breadcrumb items={[
          { label: '首頁', tab: 0 },
          { label: '解夢', screen: 'dream' },
          { label: `夢見${d.k[0]}` },
        ]} />

        <div className="td-head">
          <div className="td-term">夢見{d.k[0]}</div>
          <div className="td-meta">夢象五行：{d.wx}</div>
        </div>

        {d.classic && (
          <>
            <SectionHead title="《周公解夢》原典" extra="逐字引用" />
            <div className="card">
              <blockquote className="dream-classic">{d.classic}</blockquote>
            </div>
          </>
        )}

        <SectionHead title={`現代參考${d.classic ? '' : '（本條無原典斷語）'}`} />
        <div className="card"><p>{d.modern}</p></div>

        <SectionHead title="結合今日曆象" />
        <div className="card">
          <div className="kv"><span>今日干支</span><b>{today.ganzhi}・納音{today.wuxing}</b></div>
          <p style={{ marginTop: 8 }}>{dreamExtend(d.wx, dayWx)}</p>
          <Link screen="almanacDay" className="td-more">看今日完整國民曆 ›</Link>
        </div>

        {d.k.length > 1 && (
          <div className="card">
            <div className="kv" style={{ borderBottom: 'none' }}>
              <span>這一條也涵蓋</span><b>{d.k.slice(1).join('、')}</b>
            </div>
          </div>
        )}

        {related.length > 0 && (
          <>
            <SectionHead title={`其他屬${d.wx}的夢境`} />
            <nav className="td-tags" aria-label="相關夢境">
              {related.map(r => (
                <Link key={r.k[0]} screen="dreamDetail" params={{ slug: r.k[0] }}>夢見{r.k[0]}</Link>
              ))}
            </nav>
          </>
        )}

        <nav className="td-nav" aria-label="回解夢">
          <Link screen="dream">回解夢查詢</Link>
        </nav>
        <Disclaimer text="原典斷語逐字引自《周公解夢》流傳版本；「現代參考」為白話說明，不屬古籍內容。解夢屬民俗文化範疇，僅供參考娛樂。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// 供 sitemap 與總覽頁列出「有獨立頁」的夢境
export const DREAM_SLUGS = DREAMS.filter(d => d.classic).map(d => d.k[0])
export { lunarFromDate, useContent }
