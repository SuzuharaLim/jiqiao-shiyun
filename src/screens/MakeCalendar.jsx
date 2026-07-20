import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { works } from '../data/mock.js'

const pool = [...works, ...works.slice(0, 6)].map((w, i) => ({ ...w, key: w.id + '_' + i }))

export default function MakeCalendar() {
  const { pop, push, setToast } = useNav()
  const [src, setSrc] = useState('我的照片')
  const [sel, setSel] = useState(() => new Set(pool.slice(0, 8).map(p => p.key)))
  const N = 12

  const toggle = (k) => setSel(s => {
    const n = new Set(s)
    if (n.has(k)) n.delete(k)
    else if (n.size < N) n.add(k)
    else { setToast('已選滿 12 張'); return n }
    return n
  })
  const aiPick = () => {
    const n = new Set(sel)
    for (const p of pool) { if (n.size >= N) break; n.add(p.key) }
    setSel(n)
    setToast('AI 已為你補齊 12 張 ✨')
  }

  return (
    <>
      <TopBar title="做月曆" onClose={pop}
        right={<button className="acc tap" onClick={() => push('calendarPreview', { count: sel.size })}>下一步</button>} />
      <div className="body">
        <div className="prog">
          <div className="plbl"><span>選擇照片</span><span>已選 {sel.size} / {N}</span></div>
          <div className="bar"><div style={{ width: `${(sel.size / N) * 100}%` }} /></div>
        </div>

        <div className="chips">
          {['我的照片', '收藏', '市集'].map(c => (
            <button key={c} className={`chip tap ${src === c ? 'on' : ''}`} onClick={() => setSrc(c)}>{c}</button>
          ))}
        </div>

        <div className="grid">
          {pool.filter(p => src === '市集' ? p.price : src === '收藏' ? p.term === '芒種' : true).map(p => {
            const on = sel.has(p.key)
            return (
              <button key={p.key} className="gimg tap" style={{ background: p.bg }} onClick={() => toggle(p.key)}>
                {p.emoji}
                {on && <><div className="selo" /><div className="chk">✓</div></>}
              </button>
            )
          })}
        </div>

        <button className="ai-hint tap" onClick={aiPick}>
          ✨ 讓 AI 幫我自動選 {N} 張
          <Icon name="chev" style={{ width: 16, height: 16, stroke: 'var(--accent)' }} />
        </button>
        <div style={{ height: 12 }} />
      </div>
    </>
  )
}
