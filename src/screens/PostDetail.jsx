import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 貼文詳情 —— 內容、留言、按讚、追蹤皆嚴格來自資料庫（真實、可持久化）。
// 加入月曆素材（saved）屬前端個人化概念，仍走 nav 本地狀態。
export default function PostDetail({ id }) {
  const { setToast, push, pop, saved, toggleSave, requireAccount, user } = useNav()

  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [authorId, setAuthorId] = useState(null)
  const [clikes, setClikes] = useState({})   // 留言按讚（前端個人化）
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  // ⚠️ 編輯狀態的 useState 必須放在下面 `if (!post) return` 之前。
  // 原本寫在 return 之後（第 70 行附近）＝條件式 hook：第一次渲染 post 還是 null，
  // 提早 return 只跑了 11 個 hook；資料載回來後跑 15 個 →
  // React 丟「Rendered more hooks than during the previous render」，
  // 整個貼文詳情頁被 ErrorBoundary 接走（點進貼文只看到錯誤畫面）。
  const [editing, setEditing] = useState(false)
  const [eTitle, setETitle] = useState('')
  const [eCap, setECap] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    api.post(id).then(r => {
      if (!alive) return
      setPost(r.post); setComments(r.comments); setLiked(r.liked)
      setLikeCount(r.post.likes); setFollowing(r.following); setAuthorId(r.authorId)
    }).catch(() => {})
    return () => { alive = false }
  }, [id])

  if (!post) {
    return (
      <>
        <TopBar title="貼文" onBack />
        <div className="body"><div className="empty"><div className="empty-ic"><Icon name="branch" /></div>載入中…</div></div>
      </>
    )
  }

  const isSaved = saved[post.id]

  const onLike = async () => {
    if (!requireAccount('幫這則貼文按讚')) return
    const next = !liked
    setLiked(next); setLikeCount(c => c + (next ? 1 : -1))   // 樂觀更新
    // 觸覺回饋：12ms 只是「一下」不是震動。iOS Safari 不支援會自然略過；
    // 開了「減少動態」的人通常也不想被震，一併尊重。
    if (next && 'vibrate' in navigator
      && document.documentElement.dataset.reduceMotion !== 'on'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(12)
    try { const r = await api.likePost(post.id); setLiked(r.liked); setLikeCount(r.likeCount) }
    catch { setLiked(!next); setLikeCount(c => c + (next ? -1 : 1)); setToast('操作失敗，請稍後再試') }
  }

  const onFollow = async () => {
    if (!requireAccount(`追蹤 @${post.user}`)) return
    const next = !following
    setFollowing(next)
    try { const r = await api.follow({ userId: authorId, handle: post.user }); setFollowing(r.following); setToast(r.following ? `已追蹤 @${post.user} ✓` : '已取消追蹤') }
    catch { setFollowing(!next); setToast('操作失敗，請稍後再試') }
  }

  const send = async () => {
    const t = text.trim(); if (!t) return
    if (!requireAccount('留言')) return
    setText('')
    try { const r = await api.addComment(post.id, t); setComments(cs => [...cs, r.comment]) }
    catch { setToast('留言失敗，請稍後再試'); setText(t) }
  }

  const mine = !!user && !user.guest && post.user === user.handle
  // ⚠️ 先前只能刪除——打錯字只能刪掉重發，連帶失去所有按讚與留言。
  // 就地編輯：標題與說明可改，標籤從說明的 #標籤 重新解析（與發文時一致）。
  const startEdit = () => { setETitle(post.title || ''); setECap(post.caption || ''); setEditing(true) }
  const saveEdit = async () => {
    if (saving) return
    if (!eTitle.trim()) { setToast('標題不可空白'); return }
    setSaving(true)
    try {
      const tags = [...new Set((eCap.match(/#[^\s#]+/g) || []).map(t => t.slice(1)))].slice(0, 8)
      const r = await api.editPost(post.id, { title: eTitle.trim(), caption: eCap, tags })
      setPost(p => ({ ...p, ...r.post }))
      setEditing(false)
      setToast('貼文已更新 ✓')
    } catch (e) { setToast(e?.message || '更新失敗，請稍後再試') }
    finally { setSaving(false) }
  }
  const onDelete = async () => {
    if (!window.confirm('確定刪除這則貼文？（留言與按讚會一併刪除，無法復原）')) return
    try { await api.deletePost(post.id); setToast('貼文已刪除'); pop() }
    catch { setToast('刪除失敗，請稍後再試') }
  }
  const onReport = async () => {
    if (!requireAccount('檢舉這則貼文')) return
    try { const r = await api.report('post', post.id, ''); setToast(r.message || '已收到檢舉') }
    catch { setToast('檢舉失敗，請稍後再試') }
  }
  const delComment = async (cid) => {
    try { await api.deleteComment(cid); setComments(cs => cs.filter(x => x.id !== cid)) }
    catch { setToast('刪除失敗，請稍後再試') }
  }

  return (
    <>
      <TopBar title={editing ? '編輯貼文' : '貼文'} onBack right={
        mine
          ? (editing
            ? <button className="acc tap" onClick={saveEdit} disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>
            : <button className="acc tap" onClick={startEdit}>編輯</button>)
          : <button className="acc tap" onClick={onReport}>檢舉</button>
      } />
      <div className="body">
        <div className="post-hd">
          <button className="av tap" style={{ background: post.avatarBg }}
            onClick={() => push('creatorPage', { user: post.user, avatar: post.avatar, avatarBg: post.avatarBg })}>{post.avatar}</button>
          <div className="uname">{post.user}<div className="muted" style={{ fontWeight: 400, fontSize: 'var(--text-2xs)' }}>{post.place}</div></div>
          <button className={`pill sm tap ${following ? '' : 'dark'}`} onClick={onFollow}>
            {following ? '追蹤中' : '＋ 追蹤'}
          </button>
        </div>
        <div className="img" style={{ background: post.bg, height: 300, fontSize: 66, padding: 0, position: 'relative', overflow: 'hidden' }}>
          {post.image ? <PhotoImg src={post.image} /> : post.emoji}
        </div>

        <div className="acts">
          <div style={{ display: 'flex', gap: 15 }}>
            <button className="iconbtn tap" aria-label={liked ? '取消讚' : '讚'} aria-pressed={liked} onClick={onLike}><Icon name="heart" fill={liked} className={liked ? 'heart-on' : ''} /></button>
            <button className="iconbtn tap" aria-label="留言" onClick={() => inputRef.current?.focus()}><Icon name="cmt" /></button>
            <button className="iconbtn tap" aria-label="分享" onClick={() => {
              const url = location.href
              if (navigator.share) navigator.share({ title: `機巧時運 · ${post.title}`, url }).catch(() => {})
              else { try { navigator.clipboard.writeText(url) } catch { /* ignore */ } setToast('已複製連結') }
            }}><Icon name="share" /></button>
          </div>
          <button className={`pill tap ${isSaved ? 'on' : 'dark'}`} onClick={() => { toggleSave(post.id); setToast(isSaved ? '已移除' : '已加入月曆素材 ✓') }}>
            {isSaved ? '已加入月曆' : '加入月曆'}
          </button>
        </div>

        <div className="cap2"><b>{likeCount}</b> 個讚</div>
        {editing ? (
          /* 就地編輯：標題與說明。節氣與地點的修改留在發文頁（那裡有專屬選擇器） */
          <div className="ct-field" style={{ paddingTop: 8 }}>
            <label className="ct-label" htmlFor="pd-title">標題</label>
            <input id="pd-title" className="ct-input" value={eTitle} maxLength={60}
              onChange={e => setETitle(e.target.value)} />
            <label className="ct-label" htmlFor="pd-cap" style={{ marginTop: 12 }}>說明</label>
            <textarea id="pd-cap" className="ct-input ct-area" rows={4} maxLength={400}
              value={eCap} onChange={e => setECap(e.target.value)}
              placeholder="撰寫說明…　#節氣 #題材" />
            <div className="ct-count">{eCap.length} / 400</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="b tap" onClick={() => setEditing(false)}>取消編輯</button>
              <button className="b danger-solid tap" onClick={onDelete}>刪除貼文</button>
            </div>
            <div className="ct-hint">說明裡的 #標籤 會重新解析，供搜尋使用</div>
          </div>
        ) : (
          <div className="cap2" style={{ whiteSpace: 'pre-wrap' }}><b>{post.user}</b> {post.caption} {(post.tags || []).map(t => <span key={t} className="tag">#{t} </span>)}</div>
        )}
        <div className="cap2 muted">{post.time}</div>

        <div className="sech">留言 {comments.length}</div>
        {comments.map((c) => {
          const cliked = clikes[c.id]
          return (
            <div key={c.id} className="post-hd" style={{ paddingTop: 6, paddingBottom: 6, alignItems: 'flex-start' }}>
              <div className="av" style={{ background: c.avatarBg || 'var(--tone-2)', width: 30, height: 30, fontSize: 'var(--text-sm)' }}>{c.avatar || '🌾'}</div>
              <div className="cap2" style={{ padding: 0, flex: 1 }}>
                <b>{c.user}</b> {c.body}
                {c.time && <div className="muted" style={{ fontSize: 'var(--text-2xs)', marginTop: 2 }}>{c.time}</div>}
              </div>
              <button className="iconbtn tap" aria-label={cliked ? '取消讚' : '讚'} aria-pressed={cliked}
                onClick={() => setClikes(m => ({ ...m, [c.id]: !m[c.id] }))}>
                <Icon name="heart" fill={cliked} className={cliked ? 'heart-on' : ''} style={{ width: 15, height: 15 }} />
              </button>
              {!!user && !user.guest && c.user === user.handle && (
                <button className="iconbtn tap" aria-label="刪除留言" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}
                  onClick={() => delComment(c.id)}>✕</button>
              )}
            </div>
          )
        })}
        <div style={{ height: 12 }} />
      </div>

      {/* 留言輸入列 */}
      <div className="cinput">
        <div className="f">
          <input ref={inputRef} placeholder="留個言…" aria-label="留言" value={text}
            onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} />
        </div>
        <button className="sendbtn tap" onClick={send} aria-label="送出留言"><Icon name="send" /></button>
      </div>
    </>
  )
}
