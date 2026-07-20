import { useState } from 'react'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'

const AVATARS = ['🌾', '🌸', '🌊', '🌅', '🪷', '🍃', '⛰️', '🌻']

export default function EditProfile() {
  const { user, updateProfile, pop, setToast, requireAccount } = useNav()
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatar, setAvatar] = useState(user?.avatar || '🌾')
  const handle = user?.handle || ''

  const save = () => {
    // 訪客沒有後端帳號，存了也不會保留 → 直接引導註冊，不給假的成功訊息
    if (!requireAccount('編輯個人檔案')) return
    if (!name.trim()) { setToast('暱稱不可空白'); return }
    updateProfile({ name: name.trim(), bio: bio.trim(), avatar })
    setToast('個人檔案已更新 ✓')
    pop()
  }

  return (
    <>
      <TopBar title="編輯個人檔案" onBack right={<button className="acc tap" onClick={save}>儲存</button>} />
      <div className="body">
        <div className="center" style={{ padding: '18px 0 6px' }}>
          <div className="pf-av" style={{ background: user?.avatarBg || '#f3e7c9', margin: '0 auto', fontSize: 36 }}>{avatar}</div>
        </div>
        <div className="chips" style={{ justifyContent: 'center', paddingBottom: 14 }}>
          {AVATARS.map(a => (
            <button key={a} className={`th tap ${avatar === a ? 'on' : ''}`} style={{ width: 40, height: 40, fontSize: 20, background: 'var(--field)' }} onClick={() => setAvatar(a)}>{a}</button>
          ))}
        </div>

        <div className="auth-form" style={{ maxWidth: 'none' }}>
          <div className="field"><label>暱稱</label>
            <input value={name} onChange={e => setName(e.target.value)} aria-label="暱稱" /></div>
          <div className="field"><label>帳號 (handle)</label>
            <input value={'@' + handle} readOnly disabled aria-label="帳號（註冊後不可更改）" style={{ opacity: .6 }} /></div>
          <p className="muted" style={{ fontSize: 11, margin: '-6px 2px 10px' }}>帳號註冊後不可更改（避免他人連結失效）</p>
          <div className="field"><label>個人簡介</label>
            <input value={bio} onChange={e => setBio(e.target.value)} placeholder="介紹一下自己…" aria-label="個人簡介" /></div>
        </div>

        <div className="pad"><button className="btn-primary tap" onClick={save}>儲存變更</button></div>
        <div style={{ height: 8 }} />
      </div>
    </>
  )
}
