import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useWorks } from '../hooks/useApi.js'
import { dayFor, todayOffset } from '../data/almanac.js'

export default function Explore() {
  const { push, setToast } = useNav()
  const nowTerm = dayFor(todayOffset()).term.replace('（交節）', '')   // 真實當前節氣（與 Feed 同源）
  const [chip, setChip] = useState('全部')
  const [openMenu, setOpenMenu] = useState(null)      // null | 'term' | 'tag'（同時只開一個選單）
  const [tag, setTag] = useState('全部')     // 題材（與節氣可同時生效）
  const [q, setQ] = useState('')

  const works = useWorks(null)   // 全部作品嚴格來自資料庫（前端再依 chip/搜尋篩選）

  // ⚠️ 這排篩選原本讀 ref_items 的 exploreChips＝['全部','芒種','夏至','花卉','海','慶典']，
  // 有三個結構性錯誤：
  //  (1) 混了兩種分類軸——芒種/夏至是「節氣」，花卉/海/慶典是「題材」；
  //  (2) 篩選比對的是 w.term（節氣欄位），所以花卉/海/慶典「不可能」匹配到任何東西；
  //  (3) 清單是靜態種子資料，不含當前節氣（大暑）也不含實際內容的節氣（小暑），
  //      連 Explore 自己標示當前節氣的 ● 分支都永遠不會執行。
  // 主列固定三項：全部／●當前節氣／（從面板選了其他節氣時多一項）＋「廿四節氣」開關。
  // 先前的做法是把「有作品的節氣」全部攤平成一排——24 個節氣都有內容時
  // 會變成 25 項的長捲軸。節氣是固定集合且有公認的四季結構，
  // 收進面板用「四季 × 六節氣」呈現，主列永遠不超過 4 項。
  const termCounts = works.reduce((m, w) => {
    if (w.term) m[w.term] = (m[w.term] || 0) + 1
    return m
  }, {})


  // 題材：由作品實際帶的 #標籤 聚合。節氣是「時間軸」、題材是「主題軸」，
  // 兩者是不同維度，所以分成兩排並且可以疊加（原設計把兩者混在同一排，
  // 導致選了節氣就沒辦法再選題材）。只列真的有作品的題材，依件數排序。
  const tagCounts = works.reduce((m, w) => {
    (w.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1 })
    return m
  }, {})
  // 題材是使用者自由產生的（無上限、無固定結構），與節氣不同：
  // 不能攤平也沒有四季那種表可收。改「依件數取前幾名＋更多展開」，
  // 展開時換行鋪開而不是變成更長的水平捲軸。
  const tagList = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])
  // 人氣創作者由真實作品聚合（依上架作品數），不再用示範假名
  const creators = Object.values(works.reduce((m, w) => {
    const k = w.author
    if (!m[k]) m[k] = { user: w.author, emoji: w.avatar || w.emoji, bg: w.avatarBg || w.bg, works: 0 }
    m[k].works++
    return m
  }, {})).sort((a, b) => b.works - a.works).slice(0, 8)
  const list = works.filter(w => {
    const okChip = chip === '全部' || w.term === chip
    const okTag = tag === '全部' || (w.tags || []).includes(tag)
    const okQ = !q || w.title.includes(q) || w.author.includes(q) || w.term.includes(q)
      || (w.tags || []).some(t => t.includes(q))
    return okChip && okTag && okQ
  })

  return (
    <>
      <TopBar title="探索・節氣冊"
        right={<button className="iconbtn tap" aria-label="分享" onClick={() => {
          const url = location.href
          if (navigator.share) navigator.share({ title: '機巧時運 · 探索', url }).catch(() => {})
          else { try { navigator.clipboard.writeText(url) } catch { /* ignore */ } setToast('已複製連結') }
        }}><Icon name="share" /></button>} />

      <div className="body ex-body">
        {/* 版面分三區：ex-top(搜尋+篩選) / ex-main(作品) / ex-side(挑戰+創作者)。
            手機上三個包裝層都是 display:contents（版面=原本的直向堆疊），
            ≥900px 變成雙欄 grid：作品是這頁的主角，佔主欄；挑戰與創作者
            是輔助內容，收進側欄——原本它們排在作品前面，導致照片全部
            落在摺線以下，而挑戰看板一行字佔掉畫面最大一塊。 */}
        <div className="ex-top">
        <div className="search">
          <Icon name="search" style={{ width: 17, height: 17, stroke: 'var(--muted)' }} />
          <input placeholder="搜尋節氣、植物、創作者" aria-label="搜尋節氣、植物、創作者" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {/* 篩選選單列：平常只顯示「目前選了什麼」，點開才出現選項。
            原本兩排選項直接攤在頁面上（節氣一排＋題材一排），
            使用者回饋應做成選單選取。兩顆選擇器＋展開面板，
            同時只開一個選單。 */}
        <div className="fbar">
          <button className={`fsel tap ${openMenu === 'term' ? 'open' : ''}`}
            aria-expanded={openMenu === 'term'} aria-haspopup="true"
            onClick={() => setOpenMenu(m => m === 'term' ? null : 'term')}>
            <span className="fs-l">節氣</span>
            <b className={chip !== '全部' ? 'sel' : ''}>{chip === nowTerm ? `● ${chip}` : chip}</b>
            <span className="fs-c">{openMenu === 'term' ? '▴' : '▾'}</span>
          </button>
          {tagList.length > 0 && (
            <button className={`fsel tap ${openMenu === 'tag' ? 'open' : ''}`}
              aria-expanded={openMenu === 'tag'} aria-haspopup="true"
              onClick={() => setOpenMenu(m => m === 'tag' ? null : 'tag')}>
              <span className="fs-l">題材</span>
              <b className={tag !== '全部' ? 'sel' : ''}>{tag}</b>
              <span className="fs-c">{openMenu === 'tag' ? '▴' : '▾'}</span>
            </button>
          )}
        </div>

        {/* 節氣選單：快速列（全部／今日）＋傳統四季節氣表 */}
        {openMenu === 'term' && (
          <div className="fmenu">
            <div className="tp-quick">
              <button className={`tw-t tap ${chip === '全部' ? 'on' : ''}`}
                onClick={() => { setChip('全部'); setOpenMenu(null) }}>全部節氣</button>
              <button className={`tw-t tap ${chip === nowTerm ? 'on' : ''}`}
                onClick={() => { setChip(nowTerm); setOpenMenu(null) }}>● {nowTerm}（今日）</button>
            </div>
            <div className="term-panel">
              {[['春', ['立春', '雨水', '驚蟄', '春分', '清明', '穀雨']],
                ['夏', ['立夏', '小滿', '芒種', '夏至', '小暑', '大暑']],
                ['秋', ['立秋', '處暑', '白露', '秋分', '寒露', '霜降']],
                ['冬', ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒']]].map(([season, terms]) => (
                <div key={season} className="tp-row">
                  <span className="tp-season">{season}</span>
                  {terms.map(t => (
                    <button key={t}
                      className={`tp-t tap ${chip === t ? 'on' : ''} ${!termCounts[t] ? 'dim' : ''} ${t === nowTerm ? 'now' : ''}`}
                      onClick={() => { setChip(t); setOpenMenu(null) }}>
                      {t}{termCounts[t] ? <small className="tm-n">{termCounts[t]}</small> : null}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 題材選單：全部＋依件數排序的標籤（換行鋪開） */}
        {openMenu === 'tag' && (
          <div className="fmenu">
            <div className="tag-menu">
              <button className={`tw-t tap ${tag === '全部' ? 'on' : ''}`}
                onClick={() => { setTag('全部'); setOpenMenu(null) }}>全部</button>
              {tagList.map(t => (
                <button key={t} className={`tw-t tap ${tag === t ? 'on' : ''}`}
                  onClick={() => { setTag(t); setOpenMenu(null) }}>
                  {t}<small className="tm-n">{tagCounts[t]}</small>
                </button>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* ── 主欄：作品（這頁的主角，緊跟在篩選後面）── */}
        <div className="ex-main">
        <div className="railhd">
          <div className="t">
            {chip === '全部' && tag === '全部' && !q ? '全部作品' : (
              <>
                {chip !== '全部' && <>〈<small>{chip}</small>〉</>}
                {tag !== '全部' && <span className="rh-tag">{tag}</span>}
                作品
              </>
            )}
          </div>
          <span className="more">
            {list.length} 件
            {(chip !== '全部' || tag !== '全部' || q) && (
              <button className="rh-clear tap" onClick={() => { setChip('全部'); setTag('全部'); setQ('') }}>清除</button>
            )}
          </span>
        </div>
        {list.length === 0 ? (
          <div className="empty"><div className="big">🔍</div>找不到{[chip !== '全部' && chip, tag !== '全部' && tag, q].filter(Boolean).join('・') || '任何'}的作品</div>
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
        </div>

        {/* ── 側欄：輔助內容（桌機在右側；手機排在作品後面）── */}
        <div className="ex-side">
          {/* 挑戰改為精簡卡：原本是一行標題+一行字撐出約 170px 的空看板 */}
          <button className="ex-chal tap" onClick={() => push('challenges')}>
            <div className="xc-t">🎯 {nowTerm}攝影挑戰</div>
            <div className="xc-d">拍下你的{nowTerm}，前 3 名收錄官方植物月曆</div>
            <span className="xc-go">參加投稿 ›</span>
          </button>

          {/* 創作者改為名單列：原本是 66px 圓頭像橫向漂浮，只有一人時
              整排都是空白；名單列在 1 人或 8 人時都成立 */}
          <div className="railhd"><div className="t">本月人氣創作者</div><span className="more">依作品數</span></div>
          <div className="ex-creators">
            {creators.map((c, i) => (
              <button key={c.user} className="ex-cr tap"
                onClick={() => push('creatorPage', { user: c.user, avatar: c.emoji, avatarBg: c.bg })}>
                <span className="xr-rank">{i + 1}</span>
                <span className="xr-ava" style={{ background: c.bg }}>{c.emoji}</span>
                <span className="xr-name">@{c.user}</span>
                <span className="xr-n">{c.works} 件</span>
              </button>
            ))}
            {creators.length === 0 && <div className="empty" style={{ padding: '20px 12px' }}>還沒有創作者上架作品</div>}
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
