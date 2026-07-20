import { useState } from 'react'
import { TopBar, ToolRow, Switch, SectionHead } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'

const TIMES = ['誕辰前 1 天 09:00', '誕辰當天 08:00', '誕辰前 3 天 09:00', '誕辰前一晚 21:00']

export default function Deities() {
  const { reminders, toggleReminder, setToast } = useNav()
  const deities = useContent('deities')   // 神佛誕辰嚴格來自資料庫
  const [timeI, setTimeI] = useState(0)

  const flip = (d) => {
    const willOn = !reminders[d.id]
    toggleReminder(d.id)
    setToast(willOn ? `已開啟「${d.name}」提醒 🔔` : '已關閉提醒')
  }
  const allOn = deities.every(d => reminders[d.id])
  const toggleAll = () => {
    deities.forEach(d => { if (!!reminders[d.id] === allOn) toggleReminder(d.id) })
    setToast(allOn ? '已關閉全部提醒' : '已開啟全部提醒 🔔')
  }

  return (
    <>
      <TopBar title="臺灣神佛的生日" onBack
        right={<button className="iconbtn tap" aria-label={allOn ? '全部關閉' : '全部開啟'} onClick={toggleAll}><Icon name="bell" /></button>} />
      <div className="body">
        <SectionHead title="近期誕辰 · 開啟提醒" extra={allOn ? '全部已開' : '點鈴鐺全開'} />
        {deities.map(d => (
          <ToolRow key={d.id} icon={d.icon} bg={d.bg} title={d.name}
            sub={d.date + (d.note ? `　· ${d.note}` : '')}
            right={<Switch on={!!reminders[d.id]} onChange={() => flip(d)} />}
            onClick={() => flip(d)}
          />
        ))}
        <button className="note tap" style={{ width: '100%' }} onClick={() => { const n = (timeI + 1) % TIMES.length; setTimeI(n); setToast(`提醒時間：${TIMES[n]}`) }}>
          <span>提醒時間：{TIMES[timeI]}</span><span className="acc">變更</span>
        </button>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
