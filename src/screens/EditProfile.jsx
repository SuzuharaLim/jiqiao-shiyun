import { useRef, useState } from 'react'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

const AVATARS = ['🌾', '🌸', '🌊', '🌅', '🪷', '🍃', '⛰️', '🌻']

// 頭像壓縮：正方形裁切 + 最長邊 512px（頭像不需要 1600px，省流量與 DB 空間）
function cropSquare(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const size = Math.min(512, side)
      const c = document.createElement('canvas')
      c.width = c.height = size
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('讀取圖片失敗')) }
    img.src = url
  })
}

export default function EditProfile() {
  const { user, updateProfile, pop, setToast, requireAccount } = useNav()
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatar, setAvatar] = useState(user?.avatar || '🌾')
  const [avatarImageId, setAvatarImageId] = useState(user?.avatarImageId || null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const handle = user?.handle || ''

  const pickFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!requireAccount('上傳頭像')) return
    setUploading(true)
    try {
      const dataUrl = await cropSquare(f)
      const r = await api.uploadImage(dataUrl)   // 存進 images 表，回傳 id
      setAvatarImageId(r.id)
      setToast('頭像已上傳，記得按儲存')
    } catch {
      setToast('上傳失敗，請換一張圖片')
    } finally { setUploading(false) }
  }

  const [saving, setSaving] = useState(false)
  const save = async () => {
    // 訪客沒有後端帳號，存了也不會保留 → 直接引導註冊，不給假的成功訊息
    if (!requireAccount('編輯個人檔案')) return
    if (!name.trim()) { setToast('暱稱不可空白'); return }
    if (saving) return
    setSaving(true)
    // ⚠️ 必須等後端結果再顯示成功。先前是 fire-and-forget 後無條件 toast
    // 「已更新 ✓」，伺服器 400/401/離線時使用者仍看到成功、重整後改動消失。
    const r = await updateProfile({ name: name.trim(), bio: bio.trim(), avatar, avatarImageId })
    setSaving(false)
    if (!r?.ok) { setToast(r?.error || '儲存失敗，請稍後再試'); return }
    setToast('個人檔案已更新 ✓')
    pop()
  }

  return (
    <>
      <TopBar title="編輯個人檔案" onBack right={<button className="acc tap" onClick={save} disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>} />
      <div className="body">
        <div className="center" style={{ padding: '18px 0 6px' }}>
          <div className="pf-av" style={{ background: user?.avatarBg || '#EDE4CE', margin: '0 auto', fontSize: 36, overflow: 'hidden' }}>
            {avatarImageId
              ? <img src={`/api/images/${avatarImageId}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : avatar}
          </div>
        </div>

        {/* 上傳真實照片當頭像（原本只能從 8 個 emoji 挑） */}
        <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} aria-hidden="true" />
        <div className="pad" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="b tap" style={{ flex: '0 1 200px' }} disabled={uploading}
            onClick={() => fileRef.current?.click()}>
            {uploading ? '上傳中…' : avatarImageId ? '換一張照片' : '📷 上傳照片'}
          </button>
          {avatarImageId && (
            <button className="b tap" style={{ flex: '0 1 120px' }}
              onClick={() => { setAvatarImageId(null); setToast('已改回圖示頭像') }}>移除照片</button>
          )}
        </div>

        <div className="muted" style={{ fontSize: 11, textAlign: 'center', padding: '2px 16px 6px' }}>
          {avatarImageId ? '目前使用上傳的照片；下方圖示需先移除照片才會生效' : '或從下列圖示挑一個'}
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
