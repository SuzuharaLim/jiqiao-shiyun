import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useWorks } from '../hooks/useApi.js'
import { dayFor, todayOffset, TERM_ORDER } from '../data/almanac.js'

export default function Explore() {
  const { push, setToast } = useNav()
  const nowTerm = dayFor(todayOffset()).term.replace('（交節）', '')   // 真實當前節氣（與 Feed 同源）
  const [chip, setChip] = useState('全部')
  const [q, setQ] = useState('')

  const works = useWorks(null)   // 全部作品嚴格來自資料庫（前端再依 chip/搜尋篩選）

  // ⚠️ 這排篩選原本讀 ref_items 的 exploreChips＝['全部','芒種','夏至','花卉','海','慶典']，
  // 有三個結構性錯誤：
  //  (1) 混了兩種分類軸——芒種/夏至是「節氣」，花卉/海/慶典是「題材」；
  //  (2) 篩選比對的是 w.term（節氣欄位），所以花卉/海/慶典「不可能」匹配到任何東西；
  //  (3) 清單是靜態種子資料，不含當前節氣（大暑）也不含實際內容的節氣（小暑），
  //      連 Explore 自己標示當前節氣的 ● 分支都永遠不會執行。
  // 改為由真實資料生成：只列「當前節氣」與「真的有作品的節氣」，並依節氣年序排列。
  // 這樣每個選項都保證點得到東西，也會自動跟著節氣推進，不需要有人去維護清單。
  const termCounts = works.reduce((m, w) => {
    if (w.term) m[w.term] = (m[w.term] || 0) + 1
    return m
  }, {})
  const exploreChips = ['全部', ...[...new Set([nowTerm, ...Object.keys(termCounts)])]
    .sort((a, b) => TERM_ORDER.indexOf(a) - TERM_ORDER.indexOf(b))]
  // 人氣創作者由真實作品聚合（依上架作品數），不再用示範假名
  const creators = Object.values(works.reduce((m, w) => {
    const k = w.author
    if (!m[k]) m[k] = { user: w.author, emoji: w.avatar || w.emoji, bg: w.avatarBg || w.bg, works: 0 }
    m[k].works++
    return m
  }, {})).sort((a, b) => b.works - a.works).slice(0, 8)
  const list = works.filter(w => {
    const okChip = chip === '全部' || w.term === chip
    const okQ = !q || w.title.includes(q) || w.author.includes(q) || w.term.includes(q)
    return okChip && okQ
  })

  return (
    <>
      <TopBar title="探索・節氣冊"
        right={<button className="iconbtn tap" aria-label="分享" onClick={() => {
          const url = location.href
          if (navigator.share) navigator.share({ title: '機巧時運 · 探索', url }).catch(() => {})
          else { try { navigator.clipboard.writeText(url) } catch { /* ignore */ } setToast('已複製連結') }
        }}><Icon name="share" /></button>} />

      <div className="body">
        <div className="search">
          <Icon name="search" style={{ width: 17, height: 17, stroke: 'var(--muted)' }} />
          <input placeholder="搜尋節氣、植物、創作者" aria-label="搜尋節氣、植物、創作者" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {/* 節氣選擇輪 */}
        <div className="termwheel">
          {exploreChips.map(c => (
            <button key={c} className={`tm tap ${chip === c ? 'on' : c === nowTerm ? 'now' : ''}`}
              onClick={() => setChip(c)} title={c === nowTerm ? '今日節氣' : undefined}>
              {c === nowTerm ? `● ${c}` : c}
              {c !== '全部' && <small className="tm-n">{termCounts[c] || 0}</small>}
            </button>
          ))}
        </div>

        {/* 節氣挑戰封面 */}
        <button className="coverbig tap" onClick={() => push('challenges')} style={{ width: 'calc(100% - 26px)' }}>
          <div className="bt">🎯 {nowTerm}攝影挑戰</div>
          <div className="bd">拍下你的{nowTerm}，前 3 名收錄官方植物月曆</div>
        </button>

        {/* 本月人氣創作者 */}
        <div className="railhd"><div className="t">本月人氣創作者</div><span className="more">依作品數</span></div>
        <div className="rail">
          {creators.map(c => (
            <button key={c.user} className="railcard tap" style={{ width: 92 }}
              onClick={() => push('creatorPage', { user: c.user, avatar: c.emoji, avatarBg: c.bg })}>
              <div className="seal" style={{ background: c.bg, width: 66, height: 66, margin: '0 auto', borderRadius: '50%', border: '2px solid var(--gold)' }}>{c.emoji}</div>
              <div className="cap center" style={{ marginTop: 7 }}>@{c.user}</div>
              <div className="by center">{c.works} 件作品</div>
            </button>
          ))}
        </div>

        {/* 作品冊頁（2 欄框卡，非 IG 無縫方格） */}
        <div className="railhd"><div className="t">{chip === '全部' ? '全部作品' : <>〈<small>{chip}</small>〉作品</>}</div><span className="more">{list.length} 件</span></div>
        {list.length === 0 ? (
          <div className="empty"><div className="big">🔍</div>找不到「{q || chip}」的作品</div>
        ) : (
          <div className="album">
            {list.map(w => (
              <button key={w.id} className="it tap" onClick={() => push('workDetail', { id: w.id })}>
                <div className="ph" style={{ background: w.bg, position: 'relative', overflow: 'hidden' }}>
                  {w.image ? <PhotoImg src={w.image} /> : w.emoji}
                  {w.price && <div className="gbadge">NT${w.price}</div>}
                </div>
                <div className="cap">{w.title}<small>@{w.author} · {w.term}</small></div>
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
