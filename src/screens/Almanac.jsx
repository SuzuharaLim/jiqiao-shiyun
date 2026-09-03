import Icon from '../components/Icon.jsx'
import { TopBar, ToolRow, SectionHead, useGlossary, GlossTerm, GlossPanel } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'
import { yearOverview, dayFor, todayOffset } from '../data/almanac.js'

export default function Almanac() {
  const { push } = useNav()
  const fortuneTools = useContent('fortuneTools')   // 命理工具清單嚴格來自資料庫
  const cultureTools = useContent('cultureTools')   // 節氣文化工具清單嚴格來自資料庫
  const gl = useGlossary()   // 宜/忌 詞彙白話解釋
  const T0 = todayOffset()
  const today = dayFor(T0)   // 真實今日曆頁（取代靜態 mock）
  return (
    <>
      <TopBar title="國民曆工具箱"
        right={<button className="iconbtn tap" onClick={() => push('deities')} aria-label="神佛提醒"><Icon name="bell" /></button>} />

      <div className="body">
        {/* AI 時光顧問 —— 夜觀星象 hero */}
        <button className="coverbig oracle tap" onClick={() => push('aiChat')} style={{ textAlign: 'left' }}>
          <div className="bt">✦ AI 時光顧問</div>
          <div className="bd">用對話問今日宜忌、吉時、沖煞、解夢——你的專屬命理顧問。</div>
          <span className="cta">開始占卜 →</span>
        </button>

        {/* 今日宜忌（連動首頁曆頁） */}
        <div className="yiji">
          <div className="gz">今日 · {today.term}　{today.ganzhi}　吉時 {today.luckyHours}</div>
          <div className="yj">
            <div><div className="yl" style={{ color: 'var(--yi)' }}>宜</div>{today.yi.map(t => <GlossTerm key={t} term={t} cls="ty" gl={gl} />)}</div>
            <div><div className="yl" style={{ color: 'var(--ji)' }}>忌</div>{today.ji.map(t => <GlossTerm key={t} term={t} cls="tn" gl={gl} />)}</div>
          </div>
          <GlossPanel gl={gl} />
        </div>

        <SectionHead title="國民曆 · 曆頁" />
        <ToolRow iconName="scroll" title="今日完整曆頁" sub="建除・星宿・彭祖百忌・胎神・沖煞・十二時辰" screen="almanacDay" />
        <ToolRow iconName="dragon" title={`${yearOverview.ganzhi} 年度總覽`} sub="值年太歲・地母經・犯太歲・年度凶方" screen="yearAlmanac" />
        <ToolRow iconName="scroll" title="擇日工具" sub="搬家・結婚・開市・安床・動土 吉日查詢" screen="auspiciousIndex" />
        <ToolRow iconName="book" title="術語解釋" sub="建除・彭祖百忌・受死日・黃道吉時 是什麼意思" screen="glossary" />
        <ToolRow iconName="branch" title="攝影時刻表" sub="日出日落・黃金時刻・藍調時刻｜台灣 14 個拍攝點" screen="sunIndex" />

        <SectionHead title="算命 · 命理" extra="全部" />
        {fortuneTools.map(t => (
          <ToolRow key={t.id} iconName={t.iconName} icon={t.icon} bg={t.bg} title={t.title} sub={t.sub} screen={t.screen} />
        ))}

        <SectionHead title="文化 · 24 節氣" extra="全部" />
        {cultureTools.map(t => (
          <ToolRow key={t.id} iconName={t.iconName} icon={t.icon} bg={t.bg} title={t.title} sub={t.sub} screen={t.screen} />
        ))}

        <ToolRow iconName="trophy" title="節氣知識王" sub="三分鐘計時問答｜闖關生存・兩人對戰｜節氣・曆法・擇日・民俗" screen="quiz" />

        <SectionHead title="附錄 · 查詢表" />
        <ToolRow iconName="basket" title="食物相剋" sub="常見飲食相剋組合與迷思釐清" screen="foodTaboo" />
        <ToolRow iconName="ruler" title="度量衡換算" sub="台斤・台尺・坪・甲・斗石對照" screen="units" />
        <ToolRow iconName="seal2" title="干支・三合六合" sub="天干地支・合沖刑害・生肖配對" screen="ganzhiTable" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
