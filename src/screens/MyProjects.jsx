import { TopBar, ToolRow } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { projects } from '../data/mock.js'

export default function MyProjects({ focus }) {
  const { push, setToast } = useNav()
  const open = (pr) => {
    if (pr.status.includes('草稿')) push('makeCalendar')
    else if (pr.status.includes('下單')) push('calendarPreview', { count: 12 })
    else { setToast('企業客製報價將由專人與你聯繫 📩'); push('creatorConsole') }
  }
  return (
    <>
      <TopBar title="我的專案" onBack right={<button className="acc tap" onClick={() => push('makeCalendar')}>新增</button>} />
      <div className="body">
        {projects.map(pr => (
          <ToolRow key={pr.id} icon={pr.emoji} bg={pr.color}
            title={pr.name + (focus === pr.id ? '　←' : '')} sub={pr.status}
            onClick={() => open(pr)} />
        ))}
        <div className="pad"><button className="btn-primary tap" onClick={() => push('makeCalendar')}>＋ 建立新月曆</button></div>
        <div style={{ height: 8 }} />
      </div>
    </>
  )
}
