import { TopBar, ToolRow, Switch, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

export default function Settings() {
  const { theme, toggleTheme, setToast, push, logout, user, prefs, setPref } = useNav()
  return (
    <>
      <TopBar title="設定" onBack />
      <div className="body">
        <div className="strip">目前登入：<b>{user?.name}</b>{user?.guest && '（訪客）'}　{user?.email && `· ${user.email}`}</div>

        <SectionHead title="帳號" />
        <ToolRow icon="👤" bg="#dcfce7" title="個人檔案・作品集" sub="編輯名稱、簡介、頭像" onClick={() => push('editProfile')} />
        <ToolRow icon="🔐" bg="#dbeafe" title="帳號安全" sub="變更密碼 · 匯出資料 · 刪除帳號" onClick={() => push('accountSecurity')} />
        <ToolRow icon="✦" bg="#ede9fe" title="訂閱與帳號" sub="Free / Premium" onClick={() => push('subscription')} />
        <ToolRow icon="💰" bg="#dcfce7" title="錢包 / 收益" sub="訂單 · 授權 · 提領" onClick={() => push('wallet')} />

        {['admin', 'moderator'].includes(user?.role) && (
          <>
            <SectionHead title="站務" />
            <ToolRow icon="🛡️" bg="#e9e3fb" title="管理後台"
              sub={user.role === 'admin' ? '使用者角色 · 內容 CMS' : '內容 CMS（版主）'} onClick={() => push('admin')} />
          </>
        )}

        <SectionHead title="偏好" />
        <div className="opt">
          <div className="l">🌙 深色模式</div>
          <Switch on={theme === 'dark'} onChange={toggleTheme} />
        </div>
        <div className="opt">
          <div className="l">🔔 通知（節氣 · 神佛誕辰 · 互動）</div>
          <Switch on={prefs.notif} onChange={(v) => { setPref('notif', v); setToast(v ? '已開啟通知 🔔' : '已關閉通知') }} />
        </div>
        <div className="opt">
          <div className="l">🔤 文字大小</div>
          <div className="segbtns" role="radiogroup" aria-label="文字大小">
            {[['sm', '小'], ['md', '標準'], ['lg', '大']].map(([k, label]) => (
              <button key={k} role="radio" aria-checked={prefs.textSize === k}
                className={`seg tap ${prefs.textSize === k ? 'on' : ''}`}
                onClick={() => setPref('textSize', k)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="opt">
          <div className="l">🎬 減少動態效果</div>
          <Switch on={!!prefs.reduceMotion} onChange={(v) => { setPref('reduceMotion', v); setToast(v ? '已減少動態效果' : '已恢復動態效果') }} />
        </div>

        <SectionHead title="隱私與授權" />
        <div className="opt">
          <div className="l">🔒 私密帳號</div>
          <Switch on={prefs.priv} onChange={async (v) => {
            setPref('priv', v)
            // ⚠️ 隱私設定不可靜默失敗：先前用 .catch(() => {}) 吞錯，
            // 開關看起來打開了但後端沒存，使用者以為自己是私密帳號。
            if (user && !user.guest) {
              try {
                await api.updateProfile({ priv: v })
              } catch (e) {
                setPref('priv', !v)   // 回退成原狀，不要留下假象
                setToast(e?.message || '隱私設定儲存失敗，請稍後再試')
                return
              }
            }
            setToast(v ? '已設為私密帳號（公開頁將隱藏你的貼文/作品）' : '已設為公開帳號')
          }} />
        </div>
        <ToolRow icon="📜" bg="#ffedd5" title="服務條款" sub="使用規範 · 市集分潤 70% · 非商用授權" onClick={() => push('terms')} />
        <ToolRow icon="🛡️" bg="#fce7f3" title="隱私權政策" sub="資料使用 · GDPR 權利" onClick={() => push('privacy')} />

        <SectionHead title="關於" />
        <ToolRow icon="📖" bg="#e9e3fb" title="品牌故事" sub="五位資工生的文化實驗" onClick={() => push('about')} />
        <ToolRow icon="❓" bg="#dcfce7" title="聯絡我們" sub="客服信箱 · 服務時間" onClick={() => push('contact')} />

        <div className="pad">
          <button className="btn-ghost tap" onClick={() => { setToast('已登出'); logout() }}>登出</button>
        </div>
        <div className="center muted" style={{ fontSize: 11, paddingBottom: 16 }}>機巧時運 · 互動原型 v0.1</div>
      </div>
    </>
  )
}
