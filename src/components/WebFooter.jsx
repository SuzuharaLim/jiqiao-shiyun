import { Seal, Link } from './ui.jsx'
// 桌機版網站頁尾（≥900px）—— 讓電腦版像完整網站

export default function WebFooter() {
  return (
    <footer className="webfoot">
      <div className="wf-inner">
        <div className="wf-brand"><Seal className="wf-seal" badge />機巧時運</div>
        <nav className="wf-links" aria-label="頁尾連結">
          {/* 真連結：頁尾是爬蟲認識網站結構最重要的入口之一 */}
          <Link screen="about" className="tap">品牌故事</Link>
          <Link screen="privacy" className="tap">隱私權政策</Link>
          <Link screen="terms" className="tap">服務條款</Link>
          <Link screen="contact" className="tap">聯絡我們</Link>
        </nav>
        <div className="wf-copy">© 2026 機巧時運 · 承氣有限公司</div>
      </div>
    </footer>
  )
}
