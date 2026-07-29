import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Disclaimer } from '../components/ui.jsx'

const DB = {
  水: '夢見水多主財與情緒。清水為吉、渾水宜謹慎理財。',
  雨: '夢雨主潤澤、財氣將至；若淋雨狼狽，提醒別把事情攬太滿。',
  蛇: '蛇主智慧與轉變，也可能暗示暗中的貴人或壓力，宜留意人際。',
  火: '火主熱情與名聲，旺則有喜、烈則提醒控制脾氣。',
  飛: '夢飛主提升與渴望自由，近期有突破機會，把握之。',
  牙: '夢見掉牙多與變動、長輩健康或壓力有關，宜多關心家人。',
  錢: '夢見錢財，得為進財之兆，但夢失錢則提醒開源節流。',
}
const keys = Object.keys(DB)

export default function Dream() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)

  const go = (kw) => {
    const term = (kw ?? q).trim()
    if (!term) return
    const hit = keys.find(k => term.includes(k))
    const base = hit ? DB[hit] : '這個夢境較特殊，可從「近期心境」與「未竟之事」兩方向解讀。'
    setRes(`《周公解夢》：${base}\n\nAI 延伸：結合今日「芒種・丙午日」的火旺之氣，此夢提醒你近期宜「緩」不宜「急」，重要決定放到未時（13–15 時）再拍板。`)
  }

  return (
    <>
      <TopBar title="周公解夢" onBack />
      <div className="body">
        <div className="pad">
          <div className="search" style={{ margin: 0 }}>
            <Icon name="search" style={{ width: 17, height: 17, stroke: 'var(--muted)' }} />
            <input placeholder="輸入夢境關鍵字，如：下雨、掉牙…" aria-label="夢境關鍵字" value={q}
              onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go() }} />
          </div>
        </div>
        <div className="chips" style={{ paddingTop: 0 }}>
          {keys.map(k => <button key={k} className="chip tap" onClick={() => { setQ(k); go(k) }}>{k}</button>)}
        </div>

        <div style={{ padding: '0 var(--space-4)' }}>
          <button className="btn-primary tap" onClick={() => go()}>解夢</button>
        </div>

        {res && (
          <div className="aicard" style={{ marginTop: 14 }}>
            <div className="t">🌙 解夢結果</div>
            <div className="d" style={{ whiteSpace: 'pre-wrap', color: 'var(--acard-t)' }}>{res}</div>
          </div>
        )}
        <Disclaimer />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
