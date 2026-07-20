import { useState } from 'react'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { profile } from '../data/mock.js'

const AVATARS = ['🌾', '🌸', '🌊', '🌅', '🪷', '🍃', '⛰️', '🌻']

export default function EditProfile() {
  const { user, updateProfile, pop, setToast } = useNav()
  const [name, setName] = useState(user?.name || profile.name)
  const [handle, setHandle] = useState(user?.handle || profile.handle)
  const [bio, setBio] = useState(user?.bio || profile.bio)
  const [avatar, setAvatar] = useState(user?.avatar || profile.avatar)

  const save = () => {
    if (!name.trim()) { setToast('暱稱不可空白'); return }
    if (!handle.trim()) { setToast('帳號不可空白'); return }
    updateProfile({ name: name.trim(), handle: handle.trim(), bio: bio.trim(), avatar })
    setToast('個人檔案已更新 ✓')
    pop()
  }

  return (
    <>
      <TopBar title="編輯個人檔案" onBack right={<button className="acc tap" onClick={save}>儲存</button>} />
      <div className="body">
        <div className="center" style={{ padding: '18px 0 6px' }}>
          <div className="pf-av" style={{ background: profile.avatarBg, margin: '0 auto', fontSize: 36 }}>{avatar}</div>
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
            <input value={handle} onChange={e => setHandle(e.target.value.replace(/\s/g, ''))} aria-label="帳號" /></div>
          <div className="field"><label>個人簡介</label>
            <input value={bio} onChange={e => setBio(e.target.value)} placeholder="介紹一下自己…" aria-label="個人簡介" /></div>
        </div>

        <div className="pad"><button className="btn-primary tap" onClick={save}>儲存變更</button></div>
        <div style={{ height: 8 }} />
      </div>
    </>
  )
}
