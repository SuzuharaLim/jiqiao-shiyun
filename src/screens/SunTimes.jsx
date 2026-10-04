import { useState, useMemo } from 'react'
import { TopBar, SectionHead, Breadcrumb, Link, JsonLd, articleLd } from '../components/ui.jsx'
import { dayFor, offsetFromDate, todayOffset, dateFromOffset } from '../data/almanac.js'
import { sunTimes, SPOTS, spotBySlug } from '../data/sunTimes.js'
import { TERM_ARTICLES } from '../data/termArticle.js'

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// 節氣攝影的日出日落與黃金／藍調時刻。
// ⚠️ 這頁是刻意做的差異化：洩露文件的 contentEffort 是「LLM-based effort
//    estimation」——LLM 複製得了文章，複製不了會算的工具與原創攝影。
//    同時它是台灣在地查詢（「阿里山日出時間」），而 NavBoost 的點擊資料按 locale 切分。
export default function SunTimesScreen({ spot }) {
  const s = spotBySlug(spot) || SPOTS[0]
  const [dateStr, setDateStr] = useState(() => iso(new Date()))
  const d = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date()
  }, [dateStr])
  const t = useMemo(() => sunTimes(d, s.lat, s.lng), [d, s])
  const alm = useMemo(() => dayFor(offsetFromDate(d)), [d])
  const termSlug = TERM_ARTICLES.find(x => x.term === alm.term)?.slug

  return (
    <>
      <TopBar title={`${s.name}日出日落時間｜黃金時刻與藍調時刻`} onBack />
      <div className="body">
        <Breadcrumb items={[
          { label: '首頁', tab: 0 },
          { label: '攝影時刻', screen: 'sunIndex' },
          { label: s.name },
        ]} />
        <JsonLd data={articleLd({
          headline: `${s.name}日出日落與攝影黃金時刻`,
          description: `${s.name}的日出、日落、黃金時刻與藍調時刻計算，可查任一天。`,
          url: `https://chengqi.tw/app/sun/${s.slug}`,
          section: '節氣攝影',
        })} />

        <div className="td-head">
          <div className="td-term">{s.name}</div>
          <div className="td-meta">{s.note}　北緯 {s.lat}°　東經 {s.lng}°</div>
        </div>

        <div className="ad-nav">
          <input type="date" className="ad-date" value={dateStr} aria-label="選擇日期"
            onChange={(e) => setDateStr(e.target.value)} />
        </div>

        <SectionHead title="攝影時刻" extra={alm.term} />
        <div className="card">
          <div className="kv"><span>晨藍調</span><b>{t.morningBlue || '—'}</b></div>
          <div className="kv"><span>日出</span><b>{t.sunrise || '—'}</b></div>
          <div className="kv"><span>晨黃金時刻</span><b>{t.morningGolden || '—'}</b></div>
          <div className="kv"><span>昏黃金時刻</span><b>{t.eveningGolden || '—'}</b></div>
          <div className="kv"><span>日落</span><b>{t.sunset || '—'}</b></div>
          <div className="kv"><span>昏藍調</span><b>{t.eveningBlue || '—'}</b></div>
          <div className="kv" style={{ borderBottom: 'none' }}><span>白晝長度</span><b>{t.dayLength || '—'}</b></div>
          <p className="muted td-note">
            ＊黃金時刻＝太陽高度 0–6 度，光線偏暖、影子長；藍調時刻＝太陽在地平線下 0–6 度，
            天空呈深藍，適合城市夜景。時刻由太陽位置實算，
            <b>誤差約 ±7 分鐘</b>（春分秋分前後最大，夏至冬至最準），請提早到現場。
          </p>
        </div>

        <SectionHead title="當天的曆象" />
        <div className="card">
          <div className="kv"><span>農曆</span><b>{alm.lunar}・{alm.ganzhi}</b></div>
          <div className="kv" style={{ borderBottom: 'none' }}><span>節氣</span><b>{alm.term} 第 {alm.termDay} 天</b></div>
          {termSlug && (
            <Link screen="termDetail" params={{ slug: termSlug }} className="td-more">
              看「{alm.term}」拍什麼 ›
            </Link>
          )}
        </div>

        <SectionHead title="其他地點" />
        <nav className="td-tags" aria-label="其他拍攝地點">
          {SPOTS.filter(x => x.slug !== s.slug).map(x => (
            <Link key={x.slug} screen="sunTimes" params={{ spot: x.slug }}>{x.name}</Link>
          ))}
        </nav>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// 地點總覽 /sun
export function SunIndex() {
  const today = dateFromOffset(todayOffset())
  return (
    <>
      <TopBar title="台灣攝影時刻表｜日出日落與黃金時刻" onBack />
      <div className="body">
        <Breadcrumb items={[{ label: '首頁', tab: 0 }, { label: '攝影時刻' }]} />
        <p className="au-lead">
          台灣各地的日出、日落、黃金時刻與藍調時刻。時刻由太陽位置實算，
          可查任一天，並會一併顯示當天的節氣與干支。
        </p>
        <SectionHead title="選擇地點" extra={`${SPOTS.length} 處`} />
        <div className="card">
          {SPOTS.map(s => {
            const t = sunTimes(today, s.lat, s.lng)
            return (
              <Link key={s.slug} screen="sunTimes" params={{ spot: s.slug }} className="au-day">
                <b>{s.name}</b>
                <span>日出 {t.sunrise}　日落 {t.sunset}<small>{s.note}</small></span>
              </Link>
            )
          })}
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
