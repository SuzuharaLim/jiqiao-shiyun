import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useWorksPaged } from '../hooks/useApi.js'
import { api } from '../api.js'
import { dayFor, todayOffset } from '../data/almanac.js'

export default function Explore() {
  const { push, setToast } = useNav()
  const nowTerm = dayFor(todayOffset()).term.replace('（交節）', '')   // 真實當前節氣（與 Feed 同源）
  const [chip, setChip] = useState('全部')
  const [openTerm, setOpenTerm] = useState(false)     // 節氣選單
  const [q, setQ] = useState('')

  // 節氣交給後端篩（伺服器端分頁才正確）；搜尋仍在前端做（即時回饋）
  const { items: works, hasMore, loading, loadMore } = useWorksPaged(chip === '全部' ? null : chip)

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
  // ⚠️ 件數必須用獨立統計端點——從「已篩選的清單」算會讓選了某節氣後其他全變 0，
  // 而且分頁後清單只含當前頁，件數也會不對。
  const [termCounts, setTermCounts] = useState({})
  useEffect(() => {
    let alive = true
    api.termCounts().then(r => { if (alive) setTermCounts(r.counts || {}) }).catch(() => {})
    return () => { alive = false }
  }, [works.length])   // 有新作品進來時重新統計


  // ⚠️ 曾經有「題材」作為第二個篩選維度，已移除。
  // 這個 App 的組織軸就是節氣——加第二個維度會稀釋核心概念，而且標籤是
  // 使用者自由輸入的，久了會分裂成「花卉／花／花朵」這種難以收斂的集合。
  // 標籤本身保留在資料裡並繼續參與「搜尋」比對：它是搜尋的輔助，不是導覽軸。
  // 人氣創作者由真實作品聚合（依上架作品數），不再用示範假名
  const creators = Object.values(works.reduce((m, w) => {
    const k = w.author
    if (!m[k]) m[k] = { user: w.author, emoji: w.avatar || w.emoji, bg: w.avatarBg || w.bg, works: 0 }
    m[k].works++
    return m
  }, {})).sort((a, b) => b.works - a.works).slice(0, 8)
  // chip 已由後端篩選（見 useWorksPaged 的參數），這裡只做搜尋
  const list = works.filter(w => !q || w.title.includes(q) || w.author.includes(q)
    || w.term.includes(q) || (w.tags || []).some(t => t.includes(q)))

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
            原本選項直接攤在頁面上，使用者回饋應做成選單選取。 */}
        <div className="fbar">
          <button className={`fsel tap ${openTerm ? 'open' : ''}`}
            aria-expanded={openTerm} aria-haspopup="true"
            onClick={() => setOpenTerm(v => !v)}>
            <span className="fs-l">節氣</span>
            <b className={chip !== '全部' ? 'sel' : ''}>{chip === nowTerm ? `● ${chip}` : chip}</b>
            <span className="fs-c">{openTerm ? '▴' : '▾'}</span>
          </button>
        </div>

        {/* 節氣選單：快速列（全部／今日）＋傳統四季節氣表 */}
        {openTerm && (
          <div className="fmenu">
            <div className="tp-quick">
              <button className={`tw-t tap ${chip === '全部' ? 'on' : ''}`}
                onClick={() => { setChip('全部'); setOpenTerm(false) }}>全部節氣</button>
              <button className={`tw-t tap ${chip === nowTerm ? 'on' : ''}`}
                onClick={() => { setChip(nowTerm); setOpenTerm(false) }}>● {nowTerm}（今日）</button>
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
                      onClick={() => { setChip(t); setOpenTerm(false) }}>
                      {t}{termCounts[t] ? <small className="tm-n">{termCounts[t]}</small> : null}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        </div>

        {/* ── 主欄：作品（這頁的主角，緊跟在篩選後面）── */}
        <div className="ex-main">
        <div className="railhd">
          <div className="t">
            {chip === '全部' && !q ? '全部作品' : (
              <>{chip !== '全部' && <>〈<small>{chip}</small>〉</>}作品</>
            )}
          </div>
          <span className="more">
            {list.length} 件
            {(chip !== '全部' || q) && (
              <button className="rh-clear tap" onClick={() => { setChip('全部'); setQ('') }}>清除</button>
            )}
          </span>
        </div>
        {list.length === 0 ? (
          <div className="empty"><div className="empty-ic"><Icon name="search" /></div>找不到{[chip !== '全部' && chip, q].filter(Boolean).join('・') || '任何'}的作品</div>
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
        {hasMore && (
          <div className="pad">
            <button className="b tap" onClick={loadMore} disabled={loading}>
              {loading ? '載入中…' : '載入更多作品'}
            </button>
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
