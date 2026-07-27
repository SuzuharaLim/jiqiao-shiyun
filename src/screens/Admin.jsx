import { useState, useEffect } from 'react'
import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 管理後台 —— 使用者角色（admin）＋ 內容 CMS（moderator 以上）。
// 內容存 ref_items（JSON），可直接編輯 → 「資料方便修改」。
const KINDS = ['feedFilters', 'storyFilters', 'effects', 'gradients', 'textFx',
  'proverbs', 'deities', 'festivals', 'flowers', 'ingredients', 'zodiacs', 'challenges']
const ROLE_LABEL = { user: '一般使用者', creator: '創作者', moderator: '版主', admin: '管理者' }

export default function Admin() {
  const { user, setToast } = useNav()
  // 權限守門：後端每支 admin API 都有 requireRole 擋著（資料本來就安全），
  // 但直接輸入 /admin 網址仍會看到管理介面外殼，容易誤會「我進得去」。這裡明確擋掉。
  const canManage = ['moderator', 'admin'].includes(user?.role)
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState(isAdmin ? 'users' : 'content')
  // ⚠️ 客服訊息先前完全沒有營運端入口——使用者送出的訊息進了 support_messages
  // 卻沒有任何畫面能讀（若未設寄信服務等於進黑洞）。稽核日誌同理。
  const [support, setSupport] = useState(null)   // null=未載入（區分載入中與真的沒有）
  const [audit, setAudit] = useState(null)
  const [users, setUsers] = useState([]); const [roles, setRoles] = useState(['user', 'creator', 'moderator', 'admin'])
  const [kind, setKind] = useState('feedFilters')
  const [items, setItems] = useState([])
  const [newId, setNewId] = useState('')
  const [seed, setSeed] = useState(null)      // 示範資料統計
  const [armPurge, setArmPurge] = useState(false)
  const [reports, setReports] = useState([])  // 檢舉佇列（moderator 以上）
  const [health, setHealth] = useState(null)  // 系統狀態
  const [mailTo, setMailTo] = useState('')
  const [mailBusy, setMailBusy] = useState(false)

  useEffect(() => { if (tab === 'reports') api.adminReports().then(r => setReports(r.reports || [])).catch(() => {}) }, [tab])
  useEffect(() => { if (tab === 'support') api.adminSupport().then(r => setSupport(r.messages || [])).catch(() => setSupport([])) }, [tab])
  useEffect(() => { if (tab === 'audit' && isAdmin) api.adminAudit().then(r => setAudit(r.audit || [])).catch(() => setAudit([])) }, [tab, isAdmin])
  useEffect(() => { if (tab === 'system' && isAdmin) api.health().then(setHealth).catch(() => {}) }, [tab, isAdmin])
  const doMailTest = async () => {
    setMailBusy(true)
    try {
      const r = await api.mailTest(mailTo.trim() || undefined)
      setToast(r.ok ? `測試信已送出（${r.provider}）→ 請查收 📬` : `寄送失敗：${JSON.stringify(r.result).slice(0, 80)}`)
    } catch (e) { setToast(e?.message || '寄送失敗') } finally { setMailBusy(false) }
  }
  const closeReport = async (id, status) => {
    try { await api.resolveReport(id, status); setReports(rs => rs.map(r => r.id === id ? { ...r, status } : r)); setToast(status === 'resolved' ? '已處理' : '已駁回') }
    catch (e) { setToast(e?.message || '更新失敗') }
  }

  useEffect(() => { if (tab === 'users' && isAdmin) api.adminUsers().then(r => { setUsers(r.users); setRoles(r.roles) }).catch(() => {}) }, [tab, isAdmin])
  useEffect(() => { if (tab === 'seed' && isAdmin) api.seedInfo().then(r => setSeed(r.seed)).catch(() => {}) }, [tab, isAdmin])
  const doPurge = async () => {
    try {
      const r = await api.purgeSeed()
      setToast(`已清除示範資料（${r.removedUsers} 位示範作者及其內容）`)
      setArmPurge(false); api.seedInfo().then(x => setSeed(x.seed)).catch(() => {})
    } catch (e) { setToast(e?.message || '清除失敗') }
  }
  useEffect(() => {
    if (tab !== 'content') return
    api.adminContent(kind).then(r => setItems(r.items.map(it => ({ ...it, _json: JSON.stringify(it.data, null, 2) })))).catch(() => setItems([]))
  }, [tab, kind])

  const changeRole = async (id, role) => {
    try { await api.setUserRole(id, role); setUsers(us => us.map(u => u.id === id ? { ...u, role } : u)); setToast(`已設為${ROLE_LABEL[role] || role}`) }
    catch (e) { setToast(e?.message || '更新失敗') }
  }
  const saveItem = async (it) => {
    let data
    try { data = JSON.parse(it._json) } catch { return setToast('JSON 格式錯誤，請檢查') }
    try { await api.saveContent(kind, it.id, data, it.sort || 0); setToast(`已儲存 ${kind}/${it.id}`) }
    catch (e) { setToast(e?.message || '儲存失敗') }
  }
  const delItem = async (id) => {
    try { await api.deleteContent(kind, id); setItems(list => list.filter(x => x.id !== id)); setToast('已刪除') }
    catch (e) { setToast(e?.message || '刪除失敗') }
  }
  const addItem = () => {
    const id = newId.trim() || `item${items.length + 1}`
    if (items.some(x => x.id === id)) return setToast('id 已存在')
    setItems(list => [...list, { kind, id, sort: list.length, data: {}, _json: '{\n  "name": ""\n}' }])
    setNewId('')
  }

  // 非版主/管理者（含訪客）直接輸入 /admin 網址時，顯示明確的無權限畫面
  if (!canManage) {
    return (
      <>
        <TopBar title="管理後台" onBack />
        <div className="body">
          <div className="empty">
            <div className="big">🔒</div>
            此頁僅限版主與管理者<br />
            <span className="muted" style={{ fontSize: 12 }}>
              {user?.guest ? '你目前是訪客，請先註冊登入' : '你的帳號沒有管理權限'}
            </span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="管理後台" onBack />
      <div className="body">
        <div className="chips" style={{ paddingTop: 12 }}>
          {isAdmin && <button className={`chip tap ${tab === 'users' ? 'on' : ''}`} onClick={() => setTab('users')}>使用者・角色</button>}
          <button className={`chip tap ${tab === 'content' ? 'on' : ''}`} onClick={() => setTab('content')}>內容 CMS</button>
          <button className={`chip tap ${tab === 'reports' ? 'on' : ''}`} onClick={() => setTab('reports')}>檢舉佇列</button>
          <button className={`chip tap ${tab === 'support' ? 'on' : ''}`} onClick={() => setTab('support')}>客服訊息</button>
          {isAdmin && <button className={`chip tap ${tab === 'audit' ? 'on' : ''}`} onClick={() => setTab('audit')}>稽核日誌</button>}
          {isAdmin && <button className={`chip tap ${tab === 'system' ? 'on' : ''}`} onClick={() => setTab('system')}>系統狀態</button>}
          {isAdmin && <button className={`chip tap ${tab === 'seed' ? 'on' : ''}`} onClick={() => setTab('seed')}>上線清理</button>}
        </div>

        {tab === 'system' && isAdmin && (
          <>
            <SectionHead title="服務接線狀態" />
            <div className="card" style={{ margin: '8px 13px' }}>
              {health ? (
                <>
                  <div className="kv"><span>資料庫</span><b>{health.db === 'pg' ? 'Cloud SQL PostgreSQL' : 'SQLite（本機）'}</b></div>
                  <div className="kv"><span>寄信</span><b style={{ color: health.mail === 'log' ? 'var(--ji)' : 'var(--yi)' }}>
                    {health.mail === 'log' ? '未接（信寄不出去）' : `已接 ${health.mail}`}</b></div>
                  <div className="kv"><span>AI 顧問</span><b style={{ color: health.ai === 'on' ? 'var(--yi)' : 'var(--muted)' }}>{health.ai === 'on' ? '已接' : '未接（用示範回覆）'}</b></div>
                  <div className="kv" style={{ borderBottom: 'none' }}><span>金流</span><b style={{ color: health.pay === 'demo' ? 'var(--muted)' : 'var(--yi)' }}>{health.pay === 'demo' ? '示範模式' : health.pay}</b></div>
                </>
              ) : <div className="muted" style={{ fontSize: 12 }}>讀取中…</div>}
            </div>

            <SectionHead title="寄信測試" />
            <div className="acc-form" style={{ padding: '0 13px' }}>
              <div className="field">
                <input value={mailTo} onChange={e => setMailTo(e.target.value)} placeholder={user?.email || 'you@example.com'}
                  aria-label="測試收件信箱" type="email" />
              </div>
              <button className="b dark tap" style={{ width: '100%' }} onClick={doMailTest}
                disabled={mailBusy || (health && health.mail === 'log')}>
                {mailBusy ? '寄送中…' : '📬 寄一封測試信'}
              </button>
              <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.7, marginTop: 8 }}>
                留空則寄給自己（{user?.email}）。若顯示「未接」，請先在部署環境設定寄信金鑰——設定教學見
                <b> docs/寄信-Email設定.md</b>。收不到信時記得看垃圾信匣。
              </p>
            </div>
            <div style={{ height: 12 }} />
          </>
        )}

        {tab === 'support' && (
          <>
            <SectionHead title="客服／聯絡訊息" extra={support ? `${support.length} 則` : '載入中'} />
            {support === null && <div className="empty">載入中…</div>}
            {support?.length === 0 && <div className="empty"><div className="big">📮</div>目前沒有訊息</div>}
            {support?.map(m => (
              <div key={m.id} className="card" style={{ margin: '6px 13px' }}>
                <div className="kv"><span>主題</span><b>{m.topic}</b></div>
                <div className="kv"><span>寄件者</span><span className="muted">{m.email}</span></div>
                <div className="kv"><span>時間</span><span className="muted">{String(m.created_at).slice(0, 16).replace('T', ' ')}</span></div>
                <div className="ad-note" style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                <div className="kv" style={{ borderBottom: 'none' }}>
                  <span>回覆</span>
                  <a className="acc" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.topic + '｜機巧時運')}`}>用 Email 回覆 ›</a>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'audit' && isAdmin && (
          <>
            <SectionHead title="稽核日誌" extra={audit ? `最近 ${audit.length} 筆` : '載入中'} />
            {audit === null && <div className="empty">載入中…</div>}
            {audit?.length === 0 && <div className="empty"><div className="big">📋</div>沒有稽核記錄</div>}
            {audit?.map((a, i) => (
              <div key={a.id || i} className="kv" style={{ padding: '10px 16px' }}>
                <span style={{ fontSize: 12 }}>{a.event}{a.detail ? ` · ${a.detail}` : ''}</span>
                <span className="muted" style={{ fontSize: 11 }}>
                  {a.user_id || '—'} · {a.ip} · {String(a.created_at || '').slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            ))}
          </>
        )}

        {tab === 'reports' && (
          <>
            <SectionHead title="使用者檢舉" extra={`${reports.filter(r => r.status === 'open').length} 件待處理`} />
            {reports.length === 0 && <div className="empty"><div className="big">🛡️</div>目前沒有檢舉</div>}
            {reports.map(r => (
              <div key={r.id} className="card" style={{ margin: '6px 13px' }}>
                <div className="kv"><span>對象</span><b>{({ post: '貼文', comment: '留言', work: '作品', user: '使用者' })[r.type] || r.type} · {r.targetId.slice(0, 12)}</b></div>
                <div className="kv"><span>檢舉人</span><span className="muted">@{r.reporter} · {r.time}</span></div>
                {r.reason && <div className="kv"><span>原因</span><span className="muted">{r.reason}</span></div>}
                <div className="kv" style={{ borderBottom: 'none' }}><span>狀態</span>
                  {r.status === 'open' ? (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button className="pill sm tap dark" onClick={() => closeReport(r.id, 'resolved')}>已處理</button>
                      <button className="pill sm tap" onClick={() => closeReport(r.id, 'dismissed')}>駁回</button>
                    </span>
                  ) : <span className="ty">{r.status === 'resolved' ? '已處理' : '已駁回'}</span>}
                </div>
              </div>
            ))}
            <div className="ad-note" style={{ padding: '6px 16px' }}>
              處理方式：開啟對應貼文/作品確認內容，違規則直接於詳情頁刪除（版主以上可代刪），再回此標記「已處理」。
            </div>
          </>
        )}

        {tab === 'seed' && isAdmin && (
          <>
            <SectionHead title="示範資料 · 上線清理" />
            <div className="ad-note" style={{ padding: '6px 16px' }}>
              示範作者（wang_photo 等）與其貼文、作品、留言都是預先給的 Demo 內容。正式上線、要換成真人上傳的資料前，可一鍵清除。
              <b>只會刪示範內容</b>——真實註冊使用者、他們的上傳，以及濾鏡/節氣等參考清單都不受影響。
            </div>
            <div className="card" style={{ margin: '8px 13px' }}>
              {seed ? (
                <>
                  <div className="kv"><span>示範作者</span><b>{seed.users} 位</b></div>
                  <div className="kv"><span>示範貼文</span><b>{seed.posts} 則</b></div>
                  <div className="kv" style={{ borderBottom: 'none' }}><span>示範作品</span><b>{seed.works} 件</b></div>
                </>
              ) : <div className="muted" style={{ fontSize: 12 }}>讀取中…</div>}
            </div>
            <div style={{ padding: '4px 13px' }}>
              {!armPurge ? (
                <button className="b tap" style={{ color: 'var(--ji)', borderColor: 'var(--ji)' }}
                  onClick={() => setArmPurge(true)} disabled={!seed || seed.users === 0}>
                  {seed && seed.users === 0 ? '已無示範資料' : '清除所有示範資料…'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="b dark tap" style={{ background: 'var(--ji)', borderColor: 'var(--ji)' }} onClick={doPurge}>確定清除（不可復原）</button>
                  <button className="b tap" onClick={() => setArmPurge(false)}>取消</button>
                </div>
              )}
            </div>
            <div className="ad-note" style={{ padding: '8px 16px' }}>
              清除後 Feed／探索／創作者頁只會顯示真人上傳的內容。要重新灌回示範資料，於後端跑 <code>npm run seed</code> 即可。
            </div>
          </>
        )}

        {tab === 'users' && isAdmin && (
          <>
            <SectionHead title="使用者" extra={`${users.length} 人`} />
            {users.map(u => (
              <div key={u.id} className="kv" style={{ padding: '11px 16px', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13.5 }}>{u.name}</b>{u.handle && <span className="muted"> @{u.handle}</span>}
                  <div className="muted" style={{ fontSize: 11 }}>{u.email}{u.is_seed ? ' · 種子' : ''}</div>
                </div>
                <select value={u.role} disabled={u.id === user.id}
                  onChange={e => changeRole(u.id, e.target.value)}
                  style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--line2)', background: 'var(--card)', color: 'var(--text)', fontSize: 12.5 }}>
                  {roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
                </select>
              </div>
            ))}
            <div className="ad-note" style={{ padding: '8px 16px' }}>角色階層：一般使用者 &lt; 創作者 &lt; 版主（可改內容）&lt; 管理者（可改角色）。不能變更自己的角色。</div>
          </>
        )}

        {tab === 'content' && (
          <>
            <div className="chips" style={{ paddingTop: 6 }}>
              {KINDS.map(k => <button key={k} className={`chip tap ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}
            </div>
            <div className="kv" style={{ padding: '8px 16px', gap: 8 }}>
              <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="新項目 id" aria-label="新項目 id"
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line2)', background: 'var(--field)', color: 'var(--text)' }} />
              <button className="b dark tap" onClick={addItem}>＋ 新增</button>
            </div>
            {items.map((it, i) => (
              <div key={it.id} className="card" style={{ margin: '8px 13px' }}>
                <div className="kv" style={{ padding: '2px 2px 8px' }}><b>{it.id}</b><span className="muted" style={{ fontSize: 11 }}>{kind} · sort {it.sort ?? i}</span></div>
                <textarea value={it._json} spellCheck={false}
                  onChange={e => setItems(list => list.map(x => x.id === it.id ? { ...x, _json: e.target.value } : x))}
                  style={{ width: '100%', minHeight: 96, fontFamily: 'monospace', fontSize: 12, padding: 10, borderRadius: 8, border: '1px solid var(--line2)', background: 'var(--field)', color: 'var(--text)', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="b dark tap" onClick={() => saveItem(it)}>儲存</button>
                  <button className="b tap" onClick={() => delItem(it.id)} style={{ color: 'var(--ji)' }}>刪除</button>
                </div>
              </div>
            ))}
            <div className="ad-note" style={{ padding: '8px 16px' }}>直接編修 JSON 即可改濾鏡/特效/背景/文化清單等；儲存後前端下次載入即生效（＝資料方便修改）。</div>
          </>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
