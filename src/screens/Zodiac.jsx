import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Disclaimer, Meter } from '../components/ui.jsx'
import { useContent } from '../hooks/useApi.js'
import { dayFor, todayOffset } from '../data/almanac.js'
import { relationOn, scoreOver, RANGE_DAYS } from '../data/zodiacLuck.js'

// ⚠️ 分數一律由當日干支推導（見 data/zodiacLuck.js），不可再用 DB 的靜態 score。
//    舊版是 `base × {今日1, 本週0.94, 本月1.07}`——十二生肖的排名完全一樣，
//    等於沒有資訊；而且與本站自己的曆頁對打（沖鼠日給鼠 82、值太歲的馬 95）。

export default function Zodiac() {
  const zodiacs = useContent('zodiacs')   // 生肖運勢嚴格來自資料庫
  const [range, setRange] = useState('今日')
  const [pick, setPick] = useState(null)
  const today = dayFor(todayOffset())
  const days = RANGE_DAYS[range] || 1
  return (
    <>
      <TopBar title="生肖運勢" onBack />
      <div className="body">
        <div className="chips" style={{ paddingTop: 12 }}>
          {['今日', '本週', '本月'].map(r => (
            <button key={r} className={`chip tap ${range === r ? 'on' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>

        <div className="grid" style={{ gap: 8, padding: '0 var(--space-4)' }}>
          {zodiacs.map(z => {
            const s = scoreOver(z.sign, days)
            return (
              <button key={z.sign} className="tap" style={{
                border: `1.5px solid ${pick === z.sign ? 'var(--go)' : 'var(--line2)'}`, borderRadius: 12,
                padding: '12px 6px', background: pick === z.sign ? 'var(--acard-bg)' : 'var(--bg)', textAlign: 'center',
              }} onClick={() => setPick(z.sign)}>
                <div className="glyph" style={{ fontSize: 'var(--text-2xl)' }}>{z.sign}</div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, marginTop: 2 }}>{z.sign}</div>
                {/* 分數是文字，要用文字安全的 --gold（加深橙 5.28）；
                    --go 是填色/邊框用的原色橙，當文字只有 3.18 不合 AA */}
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--gold)', fontWeight: 800 }}>{s}</div>
              </button>
            )
          })}
        </div>

        {pick && (() => {
          const z = zodiacs.find(x => x.sign === pick)
          const s = scoreOver(z.sign, days)
          const rel = relationOn(z.sign, todayOffset())
          return (
            <div className="card">
              <h4>屬{z.sign} · {range}運勢 {s} 分</h4>
              <Meter score={s} />
              {/* 把推導依據寫出來——分數若沒有理由，使用者無從判斷可不可信，
                  也就無法發現它與曆頁矛盾。 */}
              <div className="kv" style={{ marginTop: 10, alignItems: 'flex-start' }}>
                <span>今日關係</span>
                <b style={{ textAlign: 'right' }}>{rel.notes.length ? rel.notes.join('、') : '與今日日支無特別關係'}</b>
              </div>
              <div className="kv"><span>今日干支</span><b>{today.ganzhi}・{today.zheng}</b></div>
              {/* ⚠️ 吉時一定要取曆算值。舊版寫死「辰時・未時」，而同一個 App 的
                  首頁與完整國民曆給的是另一組——同一天兩套吉時。 */}
              <div className="kv" style={{ alignItems: 'flex-start' }}>
                <span>今日吉時</span><b style={{ textAlign: 'right' }}>{today.luckyHours}</b>
              </div>
              <p style={{ marginTop: 10 }}>{z.luck}</p>
              {range !== '今日' && (
                <p className="muted" style={{ marginTop: 6, fontSize: 'var(--text-2xs)' }}>
                  ＊{range}分數為未來 {days} 天逐日實算後的平均，不是今日分數乘倍數，
                  因此各生肖的排名會與今日不同。
                </p>
              )}
            </div>
          )
        })()}
        {!pick && <div className="empty"><div className="empty-ic"><Icon name="dragon" /></div>點一個生肖，看 {range}運勢</div>}
        {/* ⚠️ 通用免責寫「結合…AI 生成內容」，但這頁現在完全是由當日干支推導的，
            沒有任何 AI 參與——照抄通用文案等於不實陳述。 */}
        <Disclaimer text="分數由當日干支與生肖的三合、六合、六沖、六害、相刑關係，以及流年犯太歲狀況推算，為確定性演算，無 AI 生成成分。本週／本月為該期間逐日實算後的平均。生肖運勢屬民俗文化範疇，僅供參考娛樂。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
