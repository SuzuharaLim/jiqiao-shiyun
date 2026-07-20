import { useState } from 'react'
import { TopBar, Disclaimer } from '../components/ui.jsx'

function scoreOf(str) {
  let s = 0
  for (const c of str) s += c.charCodeAt(0)
  return 60 + (s % 40) // 60–99
}
const verdicts = [
  { min: 90, t: '大吉', d: '筆畫五行相生，音韻響亮好記，利於品牌傳播與招財。' },
  { min: 80, t: '中吉', d: '整體平穩偏吉，建議搭配吉時開市，能加分。' },
  { min: 70, t: '小吉', d: '尚可，若能微調一字使五行更順，格局更佳。' },
  { min: 0, t: '平', d: '中性之名，建議參考生辰八字再做取捨。' },
]

export default function NameFortune() {
  const [name, setName] = useState('')
  const [res, setRes] = useState(null)
  const go = () => {
    if (!name.trim()) return
    const sc = scoreOf(name.trim())
    const v = verdicts.find(x => sc >= x.min)
    setRes({ sc, v, strokes: 5 + (name.length * 7) % 24 })
  }
  return (
    <>
      <TopBar title="姓名・商店 命名吉凶" onBack />
      <div className="body">
        <div className="pad">
          <div className="search" style={{ margin: '0 0 10px' }}>
            <input placeholder="輸入姓名或店名 / 品牌名" aria-label="姓名或店名" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go() }} />
          </div>
          <button className="btn-primary tap" onClick={go}>測算吉凶</button>
        </div>

        {res && (
          <div className="card">
            <h4>「{name}」· {res.v.t}（{res.sc} 分）</h4>
            <div className="meter"><div style={{ width: `${res.sc}%` }} /></div>
            <div className="kv" style={{ marginTop: 10 }}><span>總筆畫</span><b>{res.strokes} 畫</b></div>
            <div className="kv"><span>三才五格</span><span className="muted">木火土 · 相生</span></div>
            <p style={{ marginTop: 8 }}>{res.v.d}</p>
          </div>
        )}
        {!res && <div className="empty"><div className="big">✍️</div>輸入名字，看看筆畫吉凶</div>}
        <Disclaimer text="姓名筆畫與吉凶為示範演算，僅供參考娛樂，不代表實際命理結果。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
