import { TopBar, ToolRow, SectionHead } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'

export default function Create() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="節氣工作室" />
      <div className="body">
        <button className="coverbig tap" onClick={() => push('camera')} style={{ textAlign: 'left' }}>
          <div className="bt"><Icon name="sparkle" style={{ width: 18, height: 18, marginRight: 7, verticalAlign: -3 }} />開始創作</div>
          <div className="bd">開相機拍照/錄影・版面拼貼・純文字限動・滑動濾鏡・特效與動態文字。</div>
          <span className="cta">＋ 開啟相機</span>
        </button>

        <SectionHead title="建立內容" />
        {/* 相機與發貼文原本是兩個並排入口，但流程上是同一件事的前後兩段：
            拍照 →（IG 式）寫說明、標節氣地點、決定是否上架 → 發布。
            分成兩個入口會讓人以為是兩種不同功能，且「發貼文」那條會跳過拍攝。
            合併成單一入口，想用既有照片的人從相機裡選相簿即可。 */}
        <ToolRow iconName="camera" title="拍照發布"
          sub="拍攝／選圖 · 濾鏡特效 · 標節氣地點 · 上架市集" onClick={() => push('camera')} />
        <ToolRow iconName="scroll" title="做月曆工作室" sub="選圖 → AI 排版 → 詩詞 → 預覽" onClick={() => push('makeCalendar')} />
        <ToolRow iconName="fortune" title="明年預拍" sub="節氣提醒 → 一鍵成曆" onClick={() => push('prePlan')} />

        {/* ⚠️ 專案子系統尚未建置，這裡曾經列出 mock.js 的示範專案，
            會讓使用者看到自己從未建立過的東西。改成單一入口，實際清單交給 MyProjects 顯示空狀態。 */}
        <SectionHead title="我的專案" />
        <ToolRow iconName="book2" title="查看我的專案" sub="做好的月曆與手帳"
          onClick={() => push('myProjects')} />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
