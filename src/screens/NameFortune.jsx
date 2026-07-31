import { useState } from 'react'
import { TopBar, Disclaimer, Meter } from '../components/ui.jsx'
import { analyzeName, analyzeBrand } from '../data/nameFortune.js'

// ⚠️ 這頁的每個數字都必須是真的推導出來的。舊版的分數是 charCode 相加、
//    總筆畫是字數乘 7、三才五格是寫死的「木火土 · 相生」，於是「一」（1 畫）
//    與「王」（4 畫）都算成 12 畫，連 emoji 都能拿到「大吉 94 分」。
//    現在筆畫查真正的康熙筆畫表（src/data/strokes.js，由 Unihan 推導），
//    查不到就明講查不到，**不給任何分數**。
export default function NameFortune() {
  const [mode, setMode] = useState('person')   // person | brand
  const [name, setName] = useState('')
  const [res, setRes] = useState(null)

  const go = () => {
    const v = name.trim()
    if (!v) return
    setRes(mode === 'person' ? analyzeName(v) : analyzeBrand(v))
  }
  const swap = (m) => { setMode(m); setRes(null) }
  const luckColor = (l) => (l === '吉' ? 'var(--teal-ink)' : l === '凶' ? 'var(--orange-ink)' : 'var(--muted)')

  return (
    <>
      <TopBar title="姓名・商店 命名吉凶" onBack />
      <div className="body">
        <div className="pad">
          <div className="seg" role="tablist" style={{ marginBottom: 10 }}>
            <button role="tab" aria-selected={mode === 'person'}
              className={`tap ${mode === 'person' ? 'on' : ''}`} onClick={() => swap('person')}>人名（五格）</button>
            <button role="tab" aria-selected={mode === 'brand'}
              className={`tap ${mode === 'brand' ? 'on' : ''}`} onClick={() => swap('brand')}>店名・品牌（總格）</button>
          </div>
          <div className="search" style={{ margin: '0 0 10px' }}>
            <input placeholder={mode === 'person' ? '輸入姓名，如：王小明' : '輸入店名或品牌名'}
              aria-label={mode === 'person' ? '姓名' : '店名或品牌名'} value={name}
              onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go() }} />
          </div>
          <button className="btn-primary tap" onClick={go}>測算吉凶</button>
        </div>

        {res && !res.ok && (
          <div className="card">
            {res.reason === 'unknown' ? (
              <>
                <h4>算不了這個名字</h4>
                <p className="muted">
                  「{res.unknown.join('」「')}」不是中文字，查不到康熙筆畫。
                  姓名學是以漢字筆畫為基礎的，英文字母、數字與符號沒有筆畫可算，
                  這裡就不硬給你一個數字了。
                </p>
              </>
            ) : res.reason === 'tooShort' ? (
              <><h4>請至少輸入兩個字</h4><p className="muted">五格剖象需要「姓」與「名」才能拆解。單一個字可改用「店名・品牌」模式看總格。</p></>
            ) : <><h4>請先輸入名字</h4></>}
          </div>
        )}

        {res?.ok && res.kind === 'person' && (
          <>
            <div className="card">
              <h4>「{name}」· {res.score} 分</h4>
              <Meter score={res.score} />
              <div className="kv" style={{ marginTop: 10, alignItems: 'flex-start' }}>
                <span>康熙筆畫</span>
                <b style={{ textAlign: 'right' }}>{res.perChar.map(p => `${p.c} ${p.n}`).join('、')}　共 {res.zong} 畫</b>
              </div>
              <div className="kv"><span>姓／名</span><b>{res.sur.join('')} ／ {res.given.join('')}</b></div>
            </div>

            <div className="card">
              <h4>五格剖象</h4>
              {res.grids.map(g => (
                <div key={g.k} className="kv" style={{ alignItems: 'flex-start' }}>
                  <span>{g.k}
                    <small className="muted" style={{ display: 'block', fontSize: 'var(--text-2xs)', fontWeight: 400 }}>{g.d}</small>
                  </span>
                  <b style={{ textAlign: 'right' }}>
                    {g.v}（{g.wx}）
                    <small style={{ display: 'block', fontWeight: 400, color: luckColor(g.luck) }}>{g.luck}</small>
                  </b>
                </div>
              ))}
            </div>

            <div className="card">
              <h4>三才（天・人・地）</h4>
              <div className="kv"><span>五行配置</span><b>{res.sancai.text}　{res.sancai.verdict}</b></div>
              <p className="muted" style={{ marginTop: 6 }}>{res.sancai.detail}</p>
            </div>
          </>
        )}

        {res?.ok && res.kind === 'brand' && (
          <div className="card">
            <h4>「{name}」· {res.score} 分（{res.luck}）</h4>
            <Meter score={res.score} />
            <div className="kv" style={{ marginTop: 10, alignItems: 'flex-start' }}>
              <span>康熙筆畫</span><b style={{ textAlign: 'right' }}>{res.perChar.map(p => `${p.c} ${p.n}`).join('、')}</b>
            </div>
            <div className="kv"><span>總格</span><b>{res.zong} 畫（{res.wx}）· <span style={{ color: luckColor(res.luck) }}>{res.luck}</span></b></div>
            {/* ⚠️ 店名沒有「姓」與「名」的分工，硬套五格是沒有意義的 */}
            <p className="muted" style={{ marginTop: 8 }}>
              店名與品牌名沒有姓名的「姓／名」結構，天格、人格、地格無從拆起，因此只看總格數理。
            </p>
          </div>
        )}

        {!res && <div className="empty"><div className="big">✍️</div>輸入名字，看看筆畫吉凶</div>}
        <Disclaimer text="筆畫採康熙筆畫（由 Unicode Unihan 資料庫推導，部首依姓名學慣例還原為本字，如氵作水四畫、左阝作阜八畫）。五格剖象與 81 數理採熊崎式通行版本，各家判定略有出入。姓名學屬民俗文化範疇，僅供參考娛樂，不構成任何專業建議。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
