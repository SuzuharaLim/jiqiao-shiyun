import { useState, useRef } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { posts } from '../data/mock.js'

const demoComments = [
  { u: 'flora.tw', t: '這光線也太美了吧！', e: '🌸', bg: '#fce7f3' },
  { u: 'green_life', t: '想收進我的植物月曆 🙏', e: '🍃', bg: '#d3f0ec' },
  { u: 'sky_diary', t: '芒種就是要來一張稻浪', e: '🌅', bg: '#ffedd5' },
]

export default function PostDetail({ id }) {
  const {
    setToast, push, liked, toggleLike, saved, toggleSave,
    following, toggleFollow, comments, addComment, likedComments, toggleCommentLike,
  } = useNav()
  const p = posts.find(x => x.id === id) || posts[0]
  const isLiked = liked[p.id]
  const isSaved = saved[p.id]
  const isFollowing = following[p.user]
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  const mine = comments[p.id] || []
  const all = [...demoComments, ...mine]
  const send = () => { const t = text.trim(); if (!t) return; addComment(p.id, t); setText('') }

  return (
    <>
      <TopBar title="貼文" onBack />
      <div className="body">
        <div className="post-hd">
          <button className="av tap" style={{ background: p.avatarBg }}
            onClick={() => push('creatorPage', { user: p.user, avatar: p.avatar, avatarBg: p.avatarBg })}>{p.avatar}</button>
          <div className="uname">{p.user}<div className="muted" style={{ fontWeight: 400, fontSize: 11 }}>{p.place}</div></div>
          <button className={`pill sm tap ${isFollowing ? '' : 'dark'}`}
            onClick={() => { toggleFollow(p.user); setToast(isFollowing ? '已取消追蹤' : `已追蹤 @${p.user} ✓`) }}>
            {isFollowing ? '追蹤中' : '＋ 追蹤'}
          </button>
        </div>
        <div className="img" style={{ background: p.bg, height: 300, fontSize: 66 }}>{p.emoji}</div>

        <div className="acts">
          <div style={{ display: 'flex', gap: 15 }}>
            <button className="iconbtn tap" aria-label={isLiked ? '取消讚' : '讚'} aria-pressed={isLiked} onClick={() => toggleLike(p.id)}><Icon name="heart" fill={isLiked} className={isLiked ? 'heart-on' : ''} /></button>
            <button className="iconbtn tap" aria-label="留言" onClick={() => inputRef.current?.focus()}><Icon name="cmt" /></button>
            <button className="iconbtn tap" aria-label="分享私訊" onClick={() => push('dms')}><Icon name="share" /></button>
          </div>
          <button className={`pill tap ${isSaved ? 'on' : 'dark'}`} onClick={() => { toggleSave(p.id); setToast(isSaved ? '已移除' : '已加入月曆素材 ✓') }}>
            {isSaved ? '已加入月曆' : '加入月曆'}
          </button>
        </div>

        <div className="cap2"><b>{p.likes + (isLiked ? 1 : 0)}</b> 個讚</div>
        <div className="cap2"><b>{p.user}</b> {p.caption} {p.tags.map(t => <span key={t} className="tag">#{t} </span>)}</div>
        <div className="cap2 muted">{p.time}</div>

        <div className="sech">留言 {all.length}</div>
        {all.map((c, i) => {
          const key = `${p.id}-${i}`
          const cliked = likedComments[key]
          const uname = c.mine ? c.user : c.u
          return (
            <div key={key} className="post-hd" style={{ paddingTop: 6, paddingBottom: 6, alignItems: 'flex-start' }}>
              <div className="av" style={{ background: c.mine ? '#dcfce7' : c.bg, width: 30, height: 30, fontSize: 15 }}>{c.mine ? '🌾' : c.e}</div>
              <div className="cap2" style={{ padding: 0, flex: 1 }}>
                <b>{uname}</b>{c.mine && <span className="tag"> · 我</span>} {c.mine ? c.text : c.t}
              </div>
              <button className="iconbtn tap" aria-label={cliked ? '取消讚' : '讚'} aria-pressed={cliked}
                onClick={() => toggleCommentLike(key)}>
                <Icon name="heart" fill={cliked} className={cliked ? 'heart-on' : ''} style={{ width: 15, height: 15 }} />
              </button>
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
