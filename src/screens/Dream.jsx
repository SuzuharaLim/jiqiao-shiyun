import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Disclaimer } from '../components/ui.jsx'
import { dayFor, todayOffset } from '../data/almanac.js'
import { DREAMS, lookupDream, dreamExtend } from '../data/dream.js'

// 推薦關鍵字：取每組的第一個詞，挑常見的排前面
const SUGGEST = ['蛇', '掉牙', '水', '火', '飛', '死人', '棺材', '撿到錢', '掉錢', '追', '考試', '懷孕', '鏡子', '房子']

export default function Dream() {
  const today = dayFor(todayOffset())   // 真實今日（節氣/干支/納音）
  const dayWx = today.wuxing?.slice(-1) // 納音末字即五行，如「天河水」→ 水
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)

  const go = (kw) => {
    const term = (kw ?? q).trim()
    if (!term) return
    const hit = lookupDream(term)
    // ⚠️ 沒有比對到就誠實說沒有，**絕不可**吐一段萬用文字再署名《周公解夢》。
    //    那等於憑空捏造出處，是內容可信度的硬傷。
    setRes({ term, hit, extend: hit ? dreamExtend(hit.wx, dayWx) : null })
  }

  return (
    <>
      <TopBar title="解夢" onBack />
      <div className="body">
        <div className="pad">
          <div className="search" style={{ margin: 0 }}>
            <Icon name="search" style={{ width: 17, height: 17, stroke: 'var(--muted)' }} />
            <input placeholder="輸入夢境關鍵字，如：掉牙、撿到錢…" aria-label="夢境關鍵字" value={q}
              onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go() }} />
          </div>
        </div>
        <div className="chips" style={{ paddingTop: 0 }}>
          {SUGGEST.map(k => <button key={k} className="chip tap" onClick={() => { setQ(k); go(k) }}>{k}</button>)}
        </div>

        <div style={{ padding: '0 var(--space-4)' }}>
          <button className="btn-primary tap" onClick={() => go()}>解夢</button>
        </div>

        {res && (
          <div className="aicard" style={{ marginTop: 14 }}>
            <div className="t">🌙 夢見「{res.term}」</div>
            {!res.hit ? (
              <div className="d" style={{ color: 'var(--acard-t)' }}>
                詞庫裡還沒有收錄這個夢境，這裡就不替你編一個解法了。
                <br />試試夢裡最鮮明的那一樣東西（人、動物、地點、動作），或換個說法。
              </div>
            ) : (
              <>
                {/* 只有真的有原典斷語時，才出現書名號。沒有就完全不提《周公解夢》 */}
                {res.hit.classic && (
                  <div className="dream-sec">
                    <div className="dream-lbl">《周公解夢》原典</div>
                    <blockquote className="dream-classic">{res.hit.classic}</blockquote>
                  </div>
                )}
                <div className="dream-sec">
                  <div className="dream-lbl">現代參考{res.hit.classic ? '' : '（本條無原典斷語）'}</div>
                  <div className="d" style={{ color: 'var(--acard-t)' }}>{res.hit.modern}</div>
                </div>
                {res.extend && (
                  <div className="dream-sec">
                    <div className="dream-lbl">結合今日曆象</div>
                    <div className="d" style={{ color: 'var(--acard-t)' }}>
                      今日{today.ganzhi}・納音{today.wuxing}。{res.extend}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <p className="muted" style={{ padding: '10px 16px 0', fontSize: 'var(--text-2xs)', lineHeight: 1.8 }}>
          ＊原典斷語逐字引自《周公解夢》流傳版本；「現代參考」為白話說明，不屬古籍內容，兩者已分開標示。
          目前收錄 {DREAMS.length} 組常見夢境。
        </p>
        <Disclaimer />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
