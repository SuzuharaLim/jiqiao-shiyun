import { TopBar } from '../components/ui.jsx'

export default function About() {
  return (
    <>
      <TopBar title="品牌故事" onBack />
      <div className="body">
        <div className="img" style={{ height: 140, background: 'var(--tone-3)', fontSize: 54 }}>🌾✦</div>
        <div className="article">
          <h3>承先啟後，不忘本</h3>
          <p>「你有認真看過家中農民曆的樣貌嗎？」多數人的第一反應是：「那不是用來看日子的嗎？」</p>
          <p>農民曆不只是一本曆法書，而是蘊含節氣、農事、星象與生活宜忌的「早期農業社會生活資料庫」。但生硬的文言與單向閱讀，讓它逐漸被年輕世代忽視。</p>
          <h3>五位資工生的文化實驗</h3>
          <p>機巧時運由五位資訊工程背景的學生組成，孕育自大葉大學高教深耕計畫。我們把冷硬的黃曆數據，透過 AI 對話與植物美學，轉化為有溫度的現代生活指引。</p>
          <h3>會說話的智慧文化手帳</h3>
          <p>實體植物萬年曆負責觸感與記憶，App 的「AI 時光顧問」負責對話與陪伴——虛實整合（Phygital），開創一個全新的品類。</p>
          <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>對應 SDG 4 優質教育、SDG 11 永續城鄉、SDG 12 責任消費與生產。</p>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
