import { TopBar, ToolRow, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { projects } from '../data/mock.js'

export default function Create() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="節氣工作室" />
      <div className="body">
        <button className="coverbig tap" onClick={() => push('camera')} style={{ width: 'calc(100% - 26px)', textAlign: 'left' }}>
          <div className="bt">✦ 開始創作</div>
          <div className="bd">開相機拍照/錄影・版面拼貼・純文字限動・滑動濾鏡・特效與動態文字。</div>
          <span className="cta">＋ 開啟相機</span>
        </button>

        <SectionHead title="建立內容" />
        <ToolRow icon="📸" bg="#fde9d0" title="相機工作室" sub="拍攝 · 版面 · 限動 · 濾鏡 · 特效 · 搖晃顯影" onClick={() => push('camera')} />
        <ToolRow icon="📷" bg="#dcfce7" title="發貼文（打字）" sub="選圖 · 標節氣 · 地點 · 上架市集" onClick={() => push('newPost')} />
        <ToolRow icon="🗓️" bg="#e9e3fb" title="做月曆工作室" sub="選圖 → AI 排版 → 詩詞 → 預覽" onClick={() => push('makeCalendar')} />
        <ToolRow icon="🔮" bg="#dbeafe" title="明年預拍" sub="節氣提醒 → 一鍵成曆" onClick={() => push('prePlan')} />

        <SectionHead title="我的專案" extra="全部" />
        {projects.map(pr => (
          <ToolRow key={pr.id} icon={pr.emoji} bg={pr.color} title={pr.name} sub={pr.status}
            onClick={() => push('myProjects', { focus: pr.id })} />
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
