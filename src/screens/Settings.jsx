import { useEffect, useState } from 'react'
import { TopBar, ToolRow, Switch, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { pushSupported, pushPermission, enablePush, disablePush, isSubscribed } from '../lib/push.js'

export default function Settings() {
  // ⚠️ 先前「🔔 通知」只是寫進 localStorage 的偏好，整個專案沒有任何推播實作，
  // 開了永遠不會收到提醒。這裡接上真正的 Web Push（訂閱存 DB、依偏好過濾）。
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushInfo, setPushInfo] = useState(null)   // { enabled, devices, prefs }
  const { theme, toggleTheme, setToast, push, logout, user, prefs, setPref } = useNav()
  useEffect(() => {
    let alive = true
    if (!user || user.guest) return
    isSubscribed().then(v => { if (alive) setPushOn(v) })
    api.pushPrefs().then(r => { if (alive) setPushInfo(r) }).catch(() => {})
    return () => { alive = false }
  }, [user?.handle, user?.guest])

  const togglePush = async (v) => {
    if (pushBusy) return
    if (!user || user.guest) { setToast('註冊帳號後才能開啟推播通知'); return }
    if (!pushSupported()) { setToast('這個瀏覽器不支援推播通知'); return }
    setPushBusy(true)
    const r = v ? await enablePush() : await disablePush()
    setPushBusy(false)
    if (!r.ok) { setToast(r.reason || '設定失敗'); return }
    setPushOn(v)
    setToast(v ? '已開啟推播通知 ' : '已關閉推播通知')
    if (v) api.pushPrefs().then(setPushInfo).catch(() => {})
  }

  const setPushKind = async (key, v) => {
    setPushInfo(p => ({ ...p, prefs: { ...p?.prefs, [key]: v } }))
    try { await api.setPushPrefs({ [key]: v }) }
    catch (e) {
      setPushInfo(p => ({ ...p, prefs: { ...p?.prefs, [key]: !v } }))   // 回退
      setToast(e?.message || '偏好儲存失敗')
    }
  }

  return (
    <>
      <TopBar title="設定" onBack />
      <div className="body">
        <div className="strip">目前登入：<b>{user?.name}</b>{user?.guest && '（訪客）'}　{user?.email && `· ${user.email}`}</div>

        <SectionHead title="帳號" />
        <ToolRow iconName="user" title="個人檔案・作品集" sub="編輯名稱、簡介、頭像" onClick={() => push('editProfile')} />
        <ToolRow iconName="lock" title="帳號安全" sub="變更密碼 · 匯出資料 · 刪除帳號" onClick={() => push('accountSecurity')} />
        <ToolRow iconName="sparkle" title="訂閱與帳號" sub="Free / Premium" onClick={() => push('subscription')} />
        <ToolRow iconName="coin" title="錢包 / 收益" sub="訂單 · 授權 · 提領" onClick={() => push('wallet')} />

        {['admin', 'moderator'].includes(user?.role) && (
          <>
            <SectionHead title="站務" />
            <ToolRow iconName="shield" title="管理後台"
              sub={user.role === 'admin' ? '使用者角色 · 內容 CMS' : '內容 CMS（版主）'} onClick={() => push('admin')} />
          </>
        )}

        <SectionHead title="偏好" />
        <div className="opt">
          <div className="l"> 深色模式</div>
          <Switch on={theme === 'dark'} onChange={toggleTheme} />
        </div>
        <div className="opt">
          <div className="l">推播通知{pushBusy ? '（處理中…）' : ''}</div>
          <Switch on={pushOn} onChange={togglePush} />
        </div>
        {/* 只有真的訂閱成功才顯示分類開關——沒訂閱時這些設定沒有意義 */}
        {pushOn && pushInfo?.prefs && (
          <>
            <div className="opt" style={{ paddingLeft: 28 }}>
              <div className="l" style={{ fontSize: 'var(--text-xs)' }}>　節氣提醒</div>
              <Switch on={pushInfo.prefs.solarTerm} onChange={(v) => setPushKind('solarTerm', v)} />
            </div>
            <div className="opt" style={{ paddingLeft: 28 }}>
              <div className="l" style={{ fontSize: 'var(--text-xs)' }}>　神佛誕辰</div>
              <Switch on={pushInfo.prefs.deity} onChange={(v) => setPushKind('deity', v)} />
            </div>
            <div className="opt" style={{ paddingLeft: 28 }}>
              <div className="l" style={{ fontSize: 'var(--text-xs)' }}>　按讚・留言・追蹤</div>
              <Switch on={pushInfo.prefs.social} onChange={(v) => setPushKind('social', v)} />
            </div>
            <button className="note tap" onClick={async () => {
              try { const r = await api.pushTest(); setToast(r.sent ? '測試推播已送出，請看系統通知' : '沒有可用的裝置訂閱') }
              catch (e) { setToast(e?.message || '測試推播失敗') }
            }}>
              <span>送一則測試推播（已訂閱 {pushInfo.devices} 台裝置）</span>
              <span className="acc">測試 ›</span>
            </button>
          </>
        )}
        {!pushOn && pushSupported() && pushPermission() === 'denied' && (
          <p className="muted" style={{ padding: '0 16px 8px', fontSize: 'var(--text-2xs)', lineHeight: 1.7 }}>
            ＊你已封鎖此網站的通知權限，需到瀏覽器的網站設定裡重新允許才能開啟。
          </p>
        )}
        {!pushSupported() && (
          <p className="muted" style={{ padding: '0 16px 8px', fontSize: 'var(--text-2xs)', lineHeight: 1.7 }}>
            ＊這個瀏覽器不支援推播通知（iOS 需先「加入主畫面」才可使用）。
          </p>
        )}
        <div className="opt">
          <div className="l"> 文字大小</div>
          <div className="segbtns" role="radiogroup" aria-label="文字大小">
            {[['sm', '小'], ['md', '標準'], ['lg', '大']].map(([k, label]) => (
              <button key={k} role="radio" aria-checked={prefs.textSize === k}
                className={`seg tap ${prefs.textSize === k ? 'on' : ''}`}
                onClick={() => setPref('textSize', k)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="opt">
          <div className="l"> 減少動態效果</div>
          <Switch on={!!prefs.reduceMotion} onChange={(v) => { setPref('reduceMotion', v); setToast(v ? '已減少動態效果' : '已恢復動態效果') }} />
        </div>

        <SectionHead title="隱私與授權" />
        <div className="opt">
          <div className="l"> 私密帳號</div>
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
        <ToolRow iconName="scroll" title="服務條款" sub="使用規範 · 市集分潤 70% · 非商用授權" onClick={() => push('terms')} />
        <ToolRow iconName="shield" title="隱私權政策" sub="資料使用 · GDPR 權利" onClick={() => push('privacy')} />

        <SectionHead title="關於" />
        <ToolRow iconName="book2" title="品牌故事" sub="五位資工生的文化實驗" onClick={() => push('about')} />
        <ToolRow iconName="dots" title="聯絡我們" sub="客服信箱 · 服務時間" onClick={() => push('contact')} />

        <div className="pad">
          {/* 訪客沒有帳號可登出，講「登入／註冊」才對得上他看到的東西 */}
          <button className="btn-ghost tap" onClick={() => { setToast(user?.guest ? '' : '已登出'); logout() }}>
            {user?.guest ? '登入／註冊' : '登出'}
          </button>
        </div>
        <div className="center muted" style={{ fontSize: 'var(--text-2xs)', paddingBottom: 16 }}>機巧時運 · 互動原型 v0.1</div>
      </div>
    </>
  )
}
