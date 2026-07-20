import { TopBar, SectionHead, Disclaimer } from '../components/ui.jsx'
import { yearOverview as y } from '../data/almanac.js'

// 年度總論（卷首）—— 值年太歲、春牛芒神、地母經、犯太歲、三煞五黃歲破大將軍方位。
export default function YearAlmanac() {
  return (
    <>
      <TopBar title="年度總覽" onBack />
      <div className="body">
        <div className="ya-hero">
          <div className="ya-gz">{y.ganzhi}</div>
          <div className="ya-year">{y.year}</div>
          <div className="ya-meta">生肖 {y.zodiac} · 納音 {y.nayin}</div>
        </div>

        <SectionHead title="值年太歲" />
        <div className="card">
          <div className="kv"><span>丙午年太歲</span><b>{y.taisui.name}</b></div>
          <div className="ad-note">{y.taisui.note}</div>
        </div>

        <SectionHead title="春牛圖・芒神" />
        <div className="card"><div className="article" style={{ padding: '2px 2px' }}>🐂 {y.chunniu}</div></div>

        <SectionHead title="地母經" />
        <div className="card">
          <div className="ya-poem">{y.dimu.poem}</div>
          <div className="ya-poem div">{y.dimu.div}</div>
        </div>

        <SectionHead title="犯太歲生肖" />
        <div className="ya-tais">
          {y.fanTaisui.map(f => (
            <div key={f.z} className="ya-tai">
              <div className="z">{f.z}</div>
              <div className="k">{f.k}</div>
              <div className="d">{f.d}</div>
            </div>
          ))}
        </div>
        <div className="ad-note" style={{ padding: '6px 16px' }}>犯太歲者可至廟宇安太歲、點光明燈祈平安（本 App「占卜 → 臺灣神佛的生日」可設誕辰提醒）。</div>

        <SectionHead title="年度凶方（動土修造避開）" />
        <div className="card">
          {y.fangwei.map(f => (
            <div key={f.k}>
              <div className="kv"><span>{f.k}</span><b>{f.v}</b></div>
              <div className="ad-note">{f.d}</div>
            </div>
          ))}
        </div>

        <Disclaimer text={`⚠️ ${y.note}`} />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
