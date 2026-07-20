// 桌機版網站頁尾（≥900px）—— 讓電腦版像完整網站
import { useNav } from '../store/nav.jsx'

export default function WebFooter() {
  const { push } = useNav()
  return (
    <footer className="webfoot">
      <div className="wf-inner">
        <div className="wf-brand"><span className="wf-seal">印</span>機巧時運</div>
        <nav className="wf-links" aria-label="頁尾連結">
          <button className="tap" onClick={() => push('about')}>品牌故事</button>
          <button className="tap" onClick={() => push('privacy')}>隱私權政策</button>
          <button className="tap" onClick={() => push('terms')}>服務條款</button>
          <button className="tap" onClick={() => push('contact')}>聯絡我們</button>
        </nav>
        <div className="wf-copy">© 2026 機巧時運 · 大葉大學高教深耕計畫團隊</div>
      </div>
    </footer>
  )
}
