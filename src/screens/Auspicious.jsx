import { useState, useMemo } from 'react'
import { TopBar, SectionHead, Breadcrumb, Link, Disclaimer } from '../components/ui.jsx'
import { dateFromOffset, todayOffset } from '../data/almanac.js'
import { PURPOSES, purposeBySlug, goodDaysInMonth, upcoming, filterByZodiac } from '../data/auspicious.js'
import { ZODIAC_ORDER } from '../data/zodiacLuck.js'

const iso = (off) => {
  const d = dateFromOffset(off)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const WD = ['日', '一', '二', '三', '四', '五', '六']

// ---------- 擇日總覽 /auspicious ----------
export function AuspiciousIndex() {
  return (
    <>
      <TopBar title="擇日工具｜搬家、結婚、開市吉日查詢" onBack />
      <div className="body">
        <Breadcrumb items={[{ label: '首頁', tab: 0 }, { label: '擇日工具' }]} />
        <p className="au-lead">
          依傳統擇日的宜忌推算各用途的吉日。判準完全來自曆頁的宜欄與當日神煞，
          不另外發明規則——某個月剛好沒有吉日，這裡就會誠實顯示沒有。
        </p>
        <SectionHead title="選擇用途" extra={`${PURPOSES.length} 類`} />
        <div className="au-grid">
          {PURPOSES.map(p => {
            const next = upcoming(p.slug, 1)[0]
            return (
              <Link key={p.slug} screen="auspicious" params={{ kind: p.slug }} className="au-card">
                <b>{p.title}</b>
                <small>{next ? `最近：${iso(next.off).slice(5)}` : '近半年無'}</small>
              </Link>
            )
          })}
        </div>
        <Disclaimer text="擇日屬傳統民俗文化範疇，各流派判定可能相異。重大事宜（婚嫁、動土、喪葬）建議另請專業擇日師，並一併考量當事人的生辰。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// ---------- 單一用途 /auspicious/:kind ＋ 月份頁 /auspicious/:kind/:ym ----------
export default function Auspicious({ kind, ym }) {
  const p = purposeBySlug(kind)
  const today = todayOffset()
  const now = dateFromOffset(today)
  // ym 形如 2026-09；沒給就用今年
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '')
  const year = m ? Number(m[1]) : now.getFullYear()
  const month = m ? Number(m[2]) : null
  const [zodiac, setZodiac] = useState('')

  const months = useMemo(() => {
    if (!p) return []
    const list = month
      ? [{ month, days: goodDaysInMonth(p.slug, year, month) }]
      : Array.from({ length: 12 }, (_, i) => ({ month: i + 1, days: goodDaysInMonth(p.slug, year, i + 1) }))
    return list.map(x => ({ ...x, days: filterByZodiac(x.days, zodiac) }))
  }, [p, year, month, zodiac])

  if (!p) {
    return (<><TopBar title="找不到這個用途" onBack />
      <div className="body"><div className="empty">沒有這個擇日用途。</div></div></>)
  }
  const total = months.reduce((n, x) => n + x.days.length, 0)
  const heading = month ? `${year} 年 ${month} 月${p.title}` : `${year} 年${p.title}`

  return (
    <>
      <TopBar title={`${heading}｜宜忌、沖煞與說明`} onBack />
      <div className="body">
        <Breadcrumb items={[
          { label: '首頁', tab: 0 },
          { label: '擇日工具', screen: 'auspiciousIndex' },
          ...(month ? [{ label: p.title, screen: 'auspicious', params: { kind: p.slug } }] : []),
          { label: month ? `${year} 年 ${month} 月` : `${year} 年` },
        ]} />

        <div className="td-head">
          <div className="td-term">{heading}</div>
          <div className="td-meta">共 {total} 天　依當日宜忌與神煞推算</div>
        </div>

        <div className="card"><p>{p.intro}</p></div>

        {/* 生肖過濾：標出沖到自己的日子。⚠️ 是「標出來」不是「刪掉」——
            沖煞的嚴重程度各家看法不同，直接刪掉等於替使用者做了他不知道的決定。 */}
        <SectionHead title="標出沖到我的日子" extra="選填" />
        <div className="chips" style={{ paddingTop: 0 }}>
          <button className={`chip tap ${!zodiac ? 'on' : ''}`} onClick={() => setZodiac('')}>不篩選</button>
          {ZODIAC_ORDER.map(z => (
            <button key={z} className={`chip tap ${zodiac === z ? 'on' : ''}`} onClick={() => setZodiac(z)}>{z}</button>
          ))}
        </div>

        {months.map(({ month: mo, days }) => (
          <div key={mo}>
            <SectionHead title={`${year} 年 ${mo} 月`} extra={days.length ? `${days.length} 天` : '無吉日'} />
            {!days.length ? (
              <div className="card"><p className="muted">
                這個月沒有適合{p.name}的日子。這是實算結果，不是資料缺漏——
                傳統擇日本來就會有整個月都不宜某件事的情況。
              </p></div>
            ) : (
              <div className="card">
                {days.map(x => (
                  <Link key={x.off} screen="almanacDay" params={{ date: iso(x.off) }}
                    className={`au-day${x.clash ? ' clash' : ''}`}>
                    <b>{mo}/{dateFromOffset(x.off).getDate()}
                      <small>（{WD[dateFromOffset(x.off).getDay()]}）</small></b>
                    <span>
                      {x.d.lunar}・{x.d.ganzhi}
                      <small>宜{x.matched.join('、')}{x.bonus.length ? `、${x.bonus.join('、')}` : ''}　{x.d.zheng}</small>
                    </span>
                    {x.clash && <i className="au-clash">沖你</i>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        <SectionHead title={`${p.name}的傳統講究`} />
        <div className="card"><p>{p.tips}</p></div>

        {/* 月份分頁：吃「9月搬家吉日」這種查詢，也讓爬蟲走得到每個月 */}
        {!month && (
          <>
            <SectionHead title="依月份查看" />
            <nav className="td-tags" aria-label="月份">
              {Array.from({ length: 12 }, (_, i) => (
                <Link key={i} screen="auspicious"
                  params={{ kind: p.slug, ym: `${year}-${String(i + 1).padStart(2, '0')}` }}>
                  {year} 年 {i + 1} 月
                </Link>
              ))}
            </nav>
          </>
        )}

        <SectionHead title="其他用途" />
        <nav className="td-tags" aria-label="其他擇日用途">
          {PURPOSES.filter(x => x.slug !== p.slug).map(x => (
            <Link key={x.slug} screen="auspicious" params={{ kind: x.slug }}>{x.title}</Link>
          ))}
        </nav>

        <Disclaimer text="吉日由當日宜忌與神煞推算，屬傳統民俗文化範疇，各流派判定可能相異。婚嫁、動土、喪葬等重大事宜建議另請專業擇日師，並一併考量當事人的生辰八字。本頁不構成任何專業建議。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
