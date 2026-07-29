import { useState } from 'react'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'

const months = [
  { m: '一月', term: '小寒', e: '❄️', bg: 'var(--tone-3)', poem: '寒盡春生，靜待新芽' },
  { m: '二月', term: '雨水', e: '🌧️', bg: 'var(--tone-3)', poem: '好雨知時，潤物無聲' },
  { m: '三月', term: '春分', e: '🌸', bg: 'var(--tone-4)', poem: '晝夜均分，萬物生長' },
  { m: '四月', term: '清明', e: '🍃', bg: 'var(--tone-2)', poem: '氣清景明，慎終追遠' },
  { m: '五月', term: '立夏', e: '🌱', bg: 'var(--tone-2)', poem: '萬物並秀，欣欣向榮' },
  { m: '六月', term: '芒種', e: '🌾', bg: 'var(--tone-1)', poem: '耕耘有時，靜待花開' },
  { m: '七月', term: '小暑', e: '🌡️', bg: 'var(--tone-6)', poem: '溫風徐來，心靜自涼' },
  { m: '八月', term: '立秋', e: '🍂', bg: 'var(--tone-6)', poem: '一葉知秋，收斂沉澱' },
  { m: '九月', term: '白露', e: '💧', bg: 'var(--tone-3)', poem: '露凝而白，秋意漸濃' },
  { m: '十月', term: '寒露', e: '🌾', bg: 'var(--tone-4)', poem: '鴻雁南飛，天高氣爽' },
  { m: '十一月', term: '立冬', e: '🍁', bg: 'var(--tone-3)', poem: '萬物收藏，休養生息' },
  { m: '十二月', term: '冬至', e: '⛄', bg: 'var(--tone-5)', poem: '陰極陽生，圍爐團圓' },
]

export default function CalendarPreview({ count = 12 }) {
  const { pop, push, addToCart, setToast, requireAccount } = useNav()
  const poemPool = useContent('poemPool')   // 詩詞池嚴格來自資料庫（後端已攤平為字串陣列）
  const [poems, setPoems] = useState(() => months.map(m => m.poem))

  const reshuffle = () => {
    if (!poemPool.length) return
    // Fisher–Yates 真洗牌
    const arr = [...poemPool]
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
    setPoems(months.map((m, i) => arr[i % arr.length] || m.poem))
    setToast('已換一批節氣詩詞 ✨')
  }
  // 點單月：從詩詞池循環替換該月一句
  const editMonth = (i) => setPoems(ps => {
    if (!poemPool.length) return ps
    const cur = poemPool.indexOf(ps[i])
    const next = poemPool[(cur + 1 + poemPool.length) % poemPool.length]
    return ps.map((p, k) => (k === i ? next : p))
  })

  return (
    <>
      <TopBar title="月曆預覽" onBack={pop} />
      <div className="body">
        <div className="aicard">
          <div className="t">✨ AI 已完成排版</div>
          <div className="d">以你選的 {count} 張為基底、其餘由 AI 補齊 12 個月，並為每月配一句節氣詩詞。點任一月可換句。</div>
        </div>

        <div className="grid" style={{ gap: 6, padding: '0 10px' }}>
          {months.map((mo, i) => (
            <button key={mo.m} className="tap" style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--card)', textAlign: 'left', padding: 0 }} onClick={() => editMonth(i)}>
              <div className="gimg" style={{ background: mo.bg, aspectRatio: '3/2', fontSize: 'var(--text-xl)', position: 'relative' }}>
                {mo.e}{i < count && <span className="ph-like" style={{ background: 'var(--yi)' }}>你的</span>}
              </div>
              <div style={{ padding: '6px 7px' }}>
                <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 800 }}>{mo.m} · {mo.term}</div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>{poems[i]}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ height: 12 }} />
        <button className="ai-hint tap" onClick={reshuffle}>
          🔁 換一批詩詞
        </button>

        <div style={{ padding: '4px var(--space-4) 16px', display: 'flex', gap: 8 }}>
          {/* ⚠️ 原本 onClick 只 pop() + toast「已存為草稿」，但草稿完全沒有持久化——
              MyProjects.jsx 自己也寫著「專案儲存功能仍在開發中，離開頁面不會保留」，
              兩處說法直接打架。在專案子系統做出來之前，不可謊報儲存成功。 */}
          <button className="b tap" onClick={() => setToast('草稿儲存功能尚未開放，離開後不會保留')}>存草稿</button>
          <button className="b dark tap" onClick={() => { if (!requireAccount('下單製作月曆')) return; addToCart({ id: 'cal', name: '植物月曆 ×1（12 張）', price: 480 }); push('checkout') }}>
            下單製作 NT$480
          </button>
        </div>
      </div>
    </>
  )
}
