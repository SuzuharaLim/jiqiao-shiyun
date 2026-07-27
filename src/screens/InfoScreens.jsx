import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'

export function Proverbs() {
  const { setToast } = useNav()
  const proverbs = useContent('proverbs')   // 諺語嚴格來自資料庫
  // 依日期輪替「每日一句」
  const [i, setI] = useState(() => Math.floor(Date.now() / 86400000))
  const cur = proverbs.length ? proverbs[i % proverbs.length] : null
  return (
    <>
      <TopBar title="台灣諺語" onBack />
      <div className="body">
        {cur && <div className="aicard">
          <div className="t">💬 每日一句</div>
          <div className="d" style={{ fontSize: 15, fontWeight: 700, color: 'var(--acard-t)' }}>「{cur.tw}」</div>
          <div className="d" style={{ margin: '0 0 10px' }}>{cur.mean}</div>
          <button className="go tap" onClick={() => { setI(n => (n + 1) % proverbs.length); setToast('換一句 🗣️') }}>換一句</button>
        </div>}
        <SectionHead title="更多諺語" />
        {proverbs.map((p, k) => (
          <div key={k} className="list-item">
            <div className="big">🗣️</div>
            <div className="txt"><b>{p.tw}</b><span>{p.mean}</span></div>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function Festivals() {
  const festivals = useContent('festivals')
  return (
    <>
      <TopBar title="臺灣特色慶典活動" onBack />
      <div className="body">
        {festivals.map((f, i) => (
          <div key={i} className="card">
            <h4>{f.emoji} {f.name}</h4>
            <div className="kv"><span>時間</span><span className="muted">{f.time}</span></div>
            <div className="kv"><span>地點</span><span className="muted">{f.place}</span></div>
            <p style={{ marginTop: 8 }}>{f.desc}</p>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function Flowers() {
  const flowers = useContent('flowers')
  return (
    <>
      <TopBar title="臺灣賞花景點" onBack />
      <div className="body">
        {flowers.map((f, i) => (
          <div key={i} className="list-item">
            <div className="big">{f.emoji}</div>
            <div className="txt"><b>{f.name}</b><span>花期 {f.period}　·　{f.place}</span></div>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function Ingredients() {
  const ingredients = useContent('ingredients')
  return (
    <>
      <TopBar title="當季食材 陸・海・空" onBack />
      <div className="body">
        {ingredients.map((g, i) => (
          <div key={i} className="card">
            <h4>{g.emoji} {g.type}</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
              {g.items.map(it => <span key={it} className="ty">{it}</span>)}
            </div>
            <p>{g.tip}</p>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function SolarTerms() {
  const solarTermArticles = useContent('solarTerms')
  const [i, setI] = useState(0)
  const a = solarTermArticles[i] || solarTermArticles[0]
  return (
    <>
      <TopBar title="24 節氣專欄" onBack />
      <div className="body">
        <div className="chips" style={{ paddingTop: 12 }}>
          {solarTermArticles.map((t, idx) => (
            <button key={t.term} className={`chip tap ${i === idx ? 'on' : ''}`} onClick={() => setI(idx)}>{t.emoji} {t.term}</button>
          ))}
        </div>
        {a && <>
          <div className="img" style={{ height: 150, background: '#EDE4CE', fontSize: 56 }}>{a.emoji}</div>
          <div className="article">
            <h3>{a.term}</h3>
            <p className="muted" style={{ fontSize: 12 }}>{a.sub}</p>
            {a.body.split('\n\n').map((para, k) => <p key={k}>{para}</p>)}
          </div>
        </>}
      </div>
    </>
  )
}

const boneVerses = [
  '此命推來福不輕，自成自立顯門庭，前途風光終有望，勤懇耕耘步步升。',
  '此命為人性最良，一生福祿自榮昌，中年運到財源廣，晚景滔滔金滿箱。',
  '平生衣祿是綿長，件件搜求備齊全，苦心竭力成家計，到老全無怨與嗟。',
]
export function Bone() {
  const { setToast } = useNav()
  const [b, setB] = useState({ y: '', m: '', d: '' })
  const [res, setRes] = useState(null)
  const go = () => {
    if (!b.y) { setToast('請輸入出生年'); return }
    const n = (Number(b.y) + Number(b.m || 6) + Number(b.d || 15))
    const liang = 2 + (n % 5)
    const qian = (n % 10)
    setRes({ w: `${liang} 兩 ${qian} 錢`, v: boneVerses[n % boneVerses.length] })
  }
  return (
    <>
      <TopBar title="袁天罡秤骨神術" onBack />
      <div className="body">
        <div className="pad">
          {/* ⚠️ .search 基礎樣式是 flex:0 0 auto，三個並排時不會收縮，
              390px 手機上第三個會溢出 162px。必須 minWidth:0 + flex:'1 1 0'
              ——flex 項目預設 min-width:auto，光給 flex:1 仍不會縮到內容寬以下。 */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[['y', '年', 4], ['m', '月', 2], ['d', '日', 2]].map(([k, lbl, len]) => (
              <input key={k} className="search" style={{ margin: 0, flex: '1 1 0', minWidth: 0, textAlign: 'center' }}
                placeholder={lbl} aria-label={`出生${lbl}`} maxLength={len} value={b[k]}
                onChange={e => setB(s => ({ ...s, [k]: e.target.value.replace(/\D/g, '') }))} />
            ))}
          </div>
          <div style={{ height: 10 }} />
          <button className="btn-primary tap" onClick={go}>開始秤骨</button>
        </div>
        {res ? (
          <div className="card">
            <h4>⚖️ 命理骨重：{res.w}</h4>
            <p style={{ marginTop: 8, lineHeight: 1.9 }}>{res.v}</p>
            <p className="muted" style={{ marginTop: 8, fontSize: 11.5 }}>＊秤骨神術為傳統民俗趣味，僅供參考娛樂。</p>
          </div>
        ) : <div className="empty"><div className="empty-ic"><Icon name="ruler" /></div>輸入生辰，為你秤一秤命格</div>}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
