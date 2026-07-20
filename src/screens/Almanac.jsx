import Icon from '../components/Icon.jsx'
import { TopBar, ToolRow, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { today, fortuneTools, cultureTools } from '../data/mock.js'

export default function Almanac() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="占卜 · 農民曆"
        right={<button className="iconbtn tap" onClick={() => push('deities')} aria-label="神佛提醒"><Icon name="bell" /></button>} />

      <div className="body">
        {/* AI 時光顧問 —— 夜觀星象 hero */}
        <button className="coverbig oracle tap" onClick={() => push('aiChat')} style={{ width: 'calc(100% - 26px)', textAlign: 'left' }}>
          <div className="bt">✦ AI 時光顧問</div>
          <div className="bd">用對話占卜今日運勢、解宜忌、抽籤、解夢——你的專屬命理顧問。</div>
          <span className="cta">開始占卜 →</span>
        </button>

        {/* 今日宜忌（連動首頁曆頁） */}
        <div className="yiji">
          <div className="gz">今日 · {today.term}　{today.ganzhi}　吉時 {today.luckyHours}</div>
          <div className="yj">
            <div><div className="yl" style={{ color: 'var(--yi)' }}>宜</div>{today.yi.map(t => <span key={t} className="ty">{t}</span>)}</div>
            <div><div className="yl" style={{ color: 'var(--ji)' }}>忌</div>{today.ji.map(t => <span key={t} className="tn">{t}</span>)}</div>
          </div>
        </div>

        <SectionHead title="算命 · 命理" extra="全部" />
        {fortuneTools.map(t => (
          <ToolRow key={t.id} icon={t.icon} bg={t.bg} title={t.title} sub={t.sub} onClick={() => push(t.screen)} />
        ))}

        <SectionHead title="文化 · 24 節氣" extra="全部" />
        {cultureTools.map(t => (
          <ToolRow key={t.id} icon={t.icon} bg={t.bg} title={t.title} sub={t.sub} onClick={() => push(t.screen)} />
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
