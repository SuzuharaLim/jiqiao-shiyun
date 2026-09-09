import { useState, useMemo } from 'react'
import { TopBar, ToolRow, Switch, SectionHead, Link, Breadcrumb } from '../components/ui.jsx'
import { deityByName } from '../data/deityArticle.js'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'
import { nextLunarOccurrence } from '../data/lunisolar.js'

const TIMES = ['誕辰前 1 天 09:00', '誕辰當天 08:00', '誕辰前 3 天 09:00', '誕辰前一晚 21:00']

// 「農曆 3/23」→ { m:3, d:23 }
const parseLunar = (s) => {
  const m = /(\d+)\s*\/\s*(\d+)/.exec(s || '')
  return m ? { m: Number(m[1]), d: Number(m[2]) } : null
}

export default function Deities() {
  const { reminders, toggleReminder, setToast } = useNav()
  const deities = useContent('deities')   // 神佛誕辰嚴格來自資料庫
  const [timeI, setTimeI] = useState(0)

  // 距今天數用真實農曆換算得出，並依「最近的誕辰」排序。
  // ⚠️ 原本 mock 資料裡的「還有 5 天」是寫死的假倒數（不論今天是哪天都顯示 5 天）。
  const list = useMemo(() => {
    const withDays = deities.map(d => {
      const p = parseLunar(d.date)
      const occ = p ? nextLunarOccurrence(p.m, p.d) : null
      return { ...d, days: occ?.daysAway ?? null, solar: occ?.date || null }
    })
    return withDays.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999))
  }, [deities])

  const flip = (d) => {
    const willOn = !reminders[d.id]
    toggleReminder(d.id)
    setToast(willOn ? `已開啟「${d.name}」提醒 ` : '已關閉提醒')
  }
  const allOn = deities.every(d => reminders[d.id])
  const toggleAll = () => {
    deities.forEach(d => { if (!!reminders[d.id] === allOn) toggleReminder(d.id) })
    setToast(allOn ? '已關閉全部提醒' : '已開啟全部提醒 ')
  }

  return (
    <>
      <TopBar title="臺灣神佛的生日" onBack
        right={<button className="iconbtn tap" aria-label={allOn ? '全部關閉' : '全部開啟'} onClick={toggleAll}><Icon name="bell" /></button>} />
      <div className="body">
        <Breadcrumb items={[{ label: '首頁', tab: 0 }, { label: '臺灣神佛誕辰' }]} />
        <SectionHead title="近期誕辰 · 開啟提醒" extra={allOn ? '全部已開' : '點鈴鐺全開'} />
        {list.map(d => (
          <ToolRow key={d.id} iconName="seal2" title={d.name}
            sub={[
              d.date,
              d.solar ? `國曆 ${d.solar.getMonth() + 1}/${d.solar.getDate()}` : null,
              d.days === 0 ? '就是今天' : d.days != null ? `還有 ${d.days} 天` : null,
              d.note,
            ].filter(Boolean).join('　· ')}
            right={<Switch on={!!reminders[d.id]} onChange={() => flip(d)} />}
            onClick={() => flip(d)}
          />
        ))}
        {/* ⚠️ 上面那排是 <button>（開關提醒用），爬蟲點不到。
            這裡另外給真的 <a href>，讓 12 個神明的專頁走得到、也讓使用者能看由來。 */}
        <SectionHead title="神明專頁" extra="由來・信仰・主要廟宇" />
        <nav className="td-tags" aria-label="神明專頁">
          {list.map(d => {
            const art = deityByName(d.name)
            return art ? (
              <Link key={art.slug} screen="deityDetail" params={{ slug: art.slug }}>
                {art.name}
              </Link>
            ) : null
          })}
        </nav>
        <button className="note tap" style={{ width: '100%' }} onClick={() => { const n = (timeI + 1) % TIMES.length; setTimeI(n); setToast(`提醒時間：${TIMES[n]}`) }}>
          <span>提醒時間：{TIMES[timeI]}</span><span className="acc">變更</span>
        </button>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
