import { useState } from 'react'
import { TopBar, Switch } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { solarTermNames, licenseTiers } from '../data/mock.js'

const thumbs = [
  { e: '🌾', bg: '#cfe3d3' }, { e: '🌊', bg: '#dbeafe' }, { e: '🌸', bg: '#fce7f3' },
  { e: '🌅', bg: '#ffedd5' }, { e: '🪷', bg: '#e9e3fb' },
]
const places = ['台中・外埔', '台南・七股', '台北・植物園', '桃園・觀音', '不顯示地點']

export default function NewPost() {
  const { pop, popAll, setToast, requireAccount } = useNav()
  const [sel, setSel] = useState(0)
  const [cap, setCap] = useState('')
  const [onSale, setOnSale] = useState(true)
  const [term, setTerm] = useState('芒種')
  const [pickTerm, setPickTerm] = useState(false)
  const [placeI, setPlaceI] = useState(0)
  const [priceI, setPriceI] = useState(1) // licenseTiers 索引，預設 $30

  const price = licenseTiers[priceI]
  const publish = () => {
    if (!requireAccount('發佈作品')) return
    popAll()
    setToast(`已發佈「${term}」貼文 🌾` + (onSale ? `（上架市集 ${price ? 'NT$' + price : '免費授權'}）` : ''))
  }

  return (
    <>
      <TopBar title="新貼文" onClose={pop}
        right={<button className="acc tap" onClick={publish}>發佈</button>} />
      <div className="body">
        <div className="img" style={{ background: thumbs[sel].bg, height: 260, fontSize: 56 }}>{thumbs[sel].e}</div>

        <div className="thumbs">
          {thumbs.map((t, i) => (
            <button key={i} className={`th tap ${i === sel ? 'on' : ''}`} style={{ background: t.bg }} onClick={() => setSel(i)}>{t.e}</button>
          ))}
        </div>

        <div className="capin">
          <textarea placeholder="撰寫說明…　#芒種 #田間" aria-label="貼文說明" value={cap} onChange={e => setCap(e.target.value)} />
        </div>

        {/* 標記節氣 —— 真的可選 */}
        <button className="opt tap" onClick={() => setPickTerm(v => !v)}>
          <div className="l">🕓 標記節氣</div>
          <div className="muted" style={{ color: 'var(--cinnabar)' }}>{term} {pickTerm ? '▾' : '›'}</div>
        </button>
        {pickTerm && (
          <div className="chips" style={{ padding: '10px 13px' }}>
            {solarTermNames.map(t => (
              <button key={t} className={`chip tap ${term === t ? 'on' : ''}`}
                onClick={() => { setTerm(t); setPickTerm(false) }}>{t}</button>
            ))}
          </div>
        )}

        {/* 新增地點 —— 循環切換 */}
        <button className="opt tap" onClick={() => setPlaceI(i => (i + 1) % places.length)}>
          <div className="l">📍 新增地點</div>
          <div className="muted">{places[placeI]} ›</div>
        </button>

        <div className="opt">
          <div className="l">🏷️ 同時上架市集販售</div>
          <Switch on={onSale} onChange={setOnSale} />
        </div>

        {/* 授權價 —— 真的可選分級 */}
        {onSale && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>單張授權價</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {licenseTiers.map((p, i) => (
                <button key={p} className={`chip tap ${priceI === i ? 'on' : ''}`} style={{ flex: 1, textAlign: 'center' }}
                  onClick={() => setPriceI(i)}>{p ? `$${p}` : '免費'}</button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              {price ? `售出可分潤 70%（約 NT$${Math.round(price * 0.7)}／張）` : '開放免費授權，累積曝光與人氣'}
            </div>
          </div>
        )}

        <div style={{ height: 16 }} />
        <div style={{ padding: '0 13px' }}>
          <button className="btn-primary tap" onClick={publish}>發佈貼文</button>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
