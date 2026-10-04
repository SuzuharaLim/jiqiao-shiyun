import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg, PostCover, Avatar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { usePostsPaged, useWorksPaged } from '../hooks/useApi.js'
import { api } from '../api.js'
import { dayFor, todayOffset } from '../data/almanac.js'
import { stripEmoji } from '../lib/text.js'

// ============================================================================
// 探索・節氣冊（2026-10-04 改版：照片＋文章混排，市集獨立成一列）
//
// 貼文開放純文字文章之後，探索頁若仍只列市集作品（照片），文章就永遠不會被看見。
// 改成三層：
//   ① 本節氣市集（橫列）—— 給想買授權的人，第一眼就看到
//   ② 照片＋文章混排（主區）—— 給想逛的人
//   ③ 搜尋 —— 照片與文章都搜得到；有上架的排前面
//
// ★★★ 篩選軸**仍然只有節氣**。「照片／文章」切換是第二個篩選軸，會踩到站規
//   「探索頁切勿再加回第二個篩選軸」同一個坑（曾經加過「題材」又移除）。
//   市集那一列不是篩選：不用切換任何東西，兩種需求同時都看得到。
//
// ⚠️ 「本節氣市集」不寫「可購買」：works.price 0 在發文頁是「免費授權」，
//   標籤分成 NT$ 與「免費授權」兩種，不對使用者宣稱買得到其實不賣的東西。
// ============================================================================

const isText = (p) => !p.image

// 文章卡不要連在一起：整排都是文字卡時畫面會很平，也看不出這是攝影社群。
// 規則：不讓兩張文章卡相鄰；被延後的文章在下一張照片之後補上，盡量維持時間順序。
function spreadText(list) {
  const out = [], wait = []
  for (const p of list) {
    if (isText(p) && out.length && isText(out[out.length - 1])) { wait.push(p); continue }
    out.push(p)
    if (!isText(p) && wait.length) out.push(wait.shift())
  }
  return out.concat(wait)
}

const saleLabel = (price) => (price ? `NT$${price}` : '免費授權')

export default function Explore() {
  const { push, setToast } = useNav()
  const nowTerm = dayFor(todayOffset()).term.replace('（交節）', '')   // 真實當前節氣（與 Feed 同源）
  const [chip, setChip] = useState('全部')
  const [openTerm, setOpenTerm] = useState(false)     // 節氣選單
  const [q, setQ] = useState('')
  const termArg = chip === '全部' ? null : chip

  // 節氣交給後端篩（伺服器端分頁才正確）；搜尋仍在前端做（即時回饋）
  const { items: posts, hasMore, loading, loadMore } = usePostsPaged(termArg)
  const { items: works, hasMore: worksMore, loadMore: worksLoadMore } = useWorksPaged(termArg)

  // ⚠️ 件數必須用獨立統計端點——從「已篩選的清單」算會讓選了某節氣後其他全變 0，
  //    而且分頁後清單只含當前頁，件數也會不對。改版後統計的是**貼文**（照片＋文章）。
  const [termCounts, setTermCounts] = useState({})
  useEffect(() => {
    let alive = true
    api.postTermCounts().then(r => { if (alive) setTermCounts(r.counts || {}) }).catch(() => {})
    return () => { alive = false }
  }, [posts.length])

  // ⚠️ 曾經有「題材」作為第二個篩選維度，已移除（見檔頭）。標籤保留在資料裡，
  //    繼續參與「搜尋」比對：它是搜尋的輔助，不是導覽軸。
  // 人氣創作者由真實貼文聚合（依發文數），不用示範假名
  const creators = Object.values(posts.reduce((m, p) => {
    const k = p.user
    if (!m[k]) m[k] = { user: p.user, emoji: p.avatar || p.emoji, bg: p.avatarBg || p.bg, n: 0 }
    m[k].n++
    return m
  }, {})).sort((a, b) => b.n - a.n).slice(0, 8)

  const needle = q.trim()
  const matched = posts.filter(p => !needle
    || [p.title, p.caption, p.user, p.term, p.place].some(x => String(x || '').includes(needle))
    || (p.tags || []).some(t => t.includes(needle)))
  // 搜尋時，有上架市集的排前面（Array.sort 是穩定排序，同組內維持時間順序）
  const ordered = needle ? [...matched].sort((a, b) => (b.sale ? 1 : 0) - (a.sale ? 1 : 0)) : matched
  const list = spreadText(ordered)

  return (
    <>
      <TopBar title="探索・節氣冊"
        right={<button className="iconbtn tap" aria-label="分享" onClick={() => {
          const url = location.href
          if (navigator.share) navigator.share({ title: '機巧時運 · 探索', url }).catch(() => {})
          else { try { navigator.clipboard.writeText(url) } catch { /* ignore */ } setToast('已複製連結') }
        }}><Icon name="share" /></button>} />

      <div className="body ex-body">
        {/* 版面分三區：ex-top(搜尋+篩選) / ex-main(市集列＋貼文) / ex-side(挑戰+創作者)。
            手機上三個包裝層都是 display:contents（版面=原本的直向堆疊），
            ≥900px 變成雙欄 grid：貼文是這頁的主角，佔主欄；挑戰與創作者收進側欄。 */}
        <div className="ex-top">
        <div className="search">
          <Icon name="search" style={{ width: 17, height: 17, stroke: 'var(--muted)' }} />
          <input placeholder="搜尋節氣、文章、植物、創作者" aria-label="搜尋節氣、文章、植物、創作者" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {/* 篩選選單列：平常只顯示「目前選了什麼」，點開才出現選項。 */}
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

        <div className="ex-main">
        {/* ── ① 本節氣市集：給想買授權的人。搜尋時收起來（那時使用者要的是結果）── */}
        {!needle && works.length > 0 && (
          <section className="ex-market" aria-labelledby="ex-market-h">
            <div className="railhd">
              <div className="t" id="ex-market-h">{chip === '全部' ? '節氣市集' : `〈${chip}〉市集`}</div>
              <span className="more">可授權使用的照片</span>
            </div>
            <div className="ex-mrail">
              {works.map(w => (
                <button key={w.id} className="ex-mcard tap" onClick={() => push('workDetail', { id: w.id })}
                  aria-label={`${stripEmoji(w.title)}，${saleLabel(w.price)}`}>
                  <span className="ph" style={{ background: w.bg }}>
                    {w.image ? <PhotoImg src={w.image} alt="" /> : <Icon name="image" className="ph-ic" />}
                    <span className="gbadge">{saleLabel(w.price)}</span>
                  </span>
                  <span className="ex-mcap">{stripEmoji(w.title)}<small>@{w.author}</small></span>
                </button>
              ))}
              {worksMore && (
                <button className="ex-mmore tap" onClick={worksLoadMore}>看更多<Icon name="chev" /></button>
              )}
            </div>
          </section>
        )}

        {/* ── ② 照片＋文章混排 ── */}
        <div className="railhd">
          <div className="t">
            {chip === '全部' && !needle ? '大家的節氣紀錄' : (
              <>{chip !== '全部' && <>〈<small>{chip}</small>〉</>}{needle ? '搜尋結果' : '節氣紀錄'}</>
            )}
          </div>
          <span className="more">
            {list.length} 則
            {(chip !== '全部' || needle) && (
              <button className="rh-clear tap" onClick={() => { setChip('全部'); setQ('') }}>清除</button>
            )}
          </span>
        </div>
        {loading && list.length === 0 ? (
          /* ⚠️ 載入中不可顯示空狀態——資料還在路上時就說「找不到」，對剛起步的社群最傷。 */
          <div className="album" aria-busy="true" aria-label="載入中">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="it">
                <div className="ph ui-skeleton" />
                <div className="cap"><div className="ui-skeleton sk-line" /><div className="ui-skeleton sk-line short" /></div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          /* 空狀態是「這裡在等你」，不是「這裡沒東西」——那顆入口比會浮動的圖示值錢。 */
          <div className="empty">
            <div className="empty-ic"><Icon name="search" /></div>
            <div className="empty-t">找不到{[chip !== '全部' && chip, needle].filter(Boolean).join('・') || '任何'}的紀錄</div>
            <div className="empty-h">{needle ? '換個關鍵字試試看' : '這個節氣還沒有人留下紀錄'}</div>
            {!needle && (
              <button className="b dark tap empty-cta" onClick={() => push('newPost')}>
                ＋ 成為第一個記下{chip !== '全部' ? chip : '此刻'}的人
              </button>
            )}
          </div>
        ) : (
          <div className="album">
            {list.map(p => (
              <button key={p.id} className={`it tap${isText(p) ? ' is-text' : ''}`} onClick={() => push('postDetail', { id: p.id })}>
                <div className="ph" style={{ background: p.bg, position: 'relative', overflow: 'hidden' }}>
                  <PostCover image={p.image} alt={`${p.title}｜${p.term || '節氣'}攝影，攝影者 @${p.user}`}
                    title={p.title} caption={p.caption} term={p.term} />
                  {p.sale && <div className="gbadge">{saleLabel(p.sale.price)}</div>}
                </div>
                <div className="cap">{stripEmoji(p.title)}<small>@{p.user} · {p.term}</small></div>
              </button>
            ))}
          </div>
        )}
        {hasMore && (
          <div className="pad">
            <button className="b tap" onClick={loadMore} disabled={loading}>
              {loading ? '載入中…' : '載入更多'}
            </button>
          </div>
        )}
        </div>

        {/* ── 側欄：輔助內容（桌機在右側；手機排在貼文後面）── */}
        <div className="ex-side">
          <button className="ex-chal tap" onClick={() => push('challenges')}>
            <div className="xc-t">{nowTerm}攝影挑戰</div>
            <div className="xc-d">拍下你的{nowTerm}，前 3 名收錄官方植物月曆</div>
            <span className="xc-go">參加投稿 ›</span>
          </button>

          <div className="railhd"><div className="t">本月人氣創作者</div><span className="more">依發文數</span></div>
          <div className="ex-creators">
            {creators.map((c, i) => (
              <button key={c.user} className="ex-cr tap"
                onClick={() => push('creatorPage', { user: c.user, avatar: c.emoji, avatarBg: c.bg })}>
                <span className="xr-rank">{i + 1}</span>
                <span className="xr-ava" style={{ background: c.bg }}><Avatar name={c.user} /></span>
                <span className="xr-name">@{c.user}</span>
                <span className="xr-n">{c.n} 則</span>
              </button>
            ))}
            {creators.length === 0 && <div className="empty" style={{ padding: '20px var(--space-4)' }}>還沒有創作者發文</div>}
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
