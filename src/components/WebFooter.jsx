import { Seal, Link } from './ui.jsx'
// 桌機版網站頁尾（≥900px）—— 讓電腦版像完整網站

export default function WebFooter() {
  return (
    <footer className="webfoot">
      <div className="wf-inner">
        <div className="wf-brand"><Seal className="wf-seal" badge />機巧時運</div>
        <nav className="wf-links" aria-label="頁尾連結">
          {/* 真連結：頁尾是爬蟲認識網站結構最重要的入口之一 */}
          {/* 內容入口：頁尾是爬蟲認識網站結構最重要的地方，
              把新增的內容區塊都掛上去，讓每一頁都連得到它們。 */}
          <Link screen="solarterms" className="tap">二十四節氣</Link>
          <Link screen="auspiciousIndex" className="tap">擇日工具</Link>
          <Link screen="glossary" className="tap">術語解釋</Link>
          <Link screen="sunIndex" className="tap">攝影時刻</Link>
          <Link screen="myths" className="tap">常見誤解</Link>
          <Link screen="editorial" className="tap">編輯政策</Link>
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
