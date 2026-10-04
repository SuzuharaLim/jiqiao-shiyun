import { useEffect, useState, lazy, Suspense } from 'react'
import Icon from './Icon.jsx'
import { SectionHead } from './ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { CADENCES, CAL_LIMITS } from '../data/calendarRules.js'
import { buildPages } from '../data/calendarLayout.js'

const CalView = lazy(() => import('../screens/CalView.jsx'))

// ============================================================================
// 管理後台：客製洽詢（2026-10-04）
//
// 排序：新進 → 洽談中 → 已結案；同組內**等最久的在最上面**。
// 年底旺季三個人處理不完時，最重要的資訊是「誰已經等超過承諾的工作天數」。
//
// ★ 這裡是唯一拿得到印刷用原圖的地方（後端 requireRole('moderator')）。
// ⚠️ 狀態改成「已成交／未成交」會開始計時清原圖：未成交 60 天、成交保留到隔年年底。
// ============================================================================
const STATUS = { new: '新進', talking: '洽談中', won: '已成交', lost: '未成交' }

// 從送出到現在經過幾個工作天（週一到週五；國定假日不扣，寧可提早提醒）
function workdaysSince(iso) {
  const d = new Date(iso), end = new Date()
  let n = 0
  for (const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); x <= end; x.setDate(x.getDate() + 1)) {
    if (x.getDay() !== 0 && x.getDay() !== 6) n++
  }
  return n
}

export default function AdminCalInquiries({ isAdmin }) {
  const { setToast } = useNav()
  const [list, setList] = useState(null)
  const [storage, setStorage] = useState(null)
  const [view, setView] = useState(null)
  const [notes, setNotes] = useState({})

  const load = () => {
    api.adminCalInquiries().then(r => setList(r.inquiries || [])).catch(() => setList([]))
    if (isAdmin) api.adminCalStorage().then(setStorage).catch(() => {})
  }
  useEffect(load, [isAdmin])   // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (q, status) => {
    if ((status === 'won' || status === 'lost') && !window.confirm(
      status === 'lost' ? `標成未成交後，原圖會在 ${CAL_LIMITS.LOST_KEEP_DAYS} 天後自動清除。確定？` : '標成已成交後，原圖會保留到隔年年底（續曆包用）。確定？')) return
    try { await api.adminCalUpdate(q.id, { status }); setToast('已更新'); load() } catch (e) { setToast(e?.message || '更新失敗') }
  }
  const saveNote = async (q) => {
    try { await api.adminCalUpdate(q.id, { staffNote: notes[q.id] ?? q.staffNote }); setToast('備註已儲存') } catch { setToast('儲存失敗') }
  }

  // 預覽浮層：Esc 關閉（站規：浮層要有 Esc）
  useEffect(() => {
    if (!view) return
    const onKey = (e) => { if (e.key === 'Escape') setView(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [view])

  const open = (list || []).filter(q => q.status === 'new' || q.status === 'talking').length
  return (
    <>
      <SectionHead title="桌曆客製洽詢" extra={list ? `處理中 ${open} 筆` : '載入中'} />
      {storage && storage.ready === false && (
        <p className="cal-warn" style={{ padding: '0 var(--space-4)' }}>
          原圖儲存還沒設定（Cloud Run 缺少 PRINT_BUCKET 環境變數）：客人送出時原圖存不進來，只會有預覽圖。設定方式見 docs/部署-CloudRun-PostgreSQL.md「桌曆原圖儲存」。
        </p>
      )}
      {storage && (
        <p className="cal-note" style={{ padding: '0 var(--space-4)' }}>
          原圖儲存：{storage.usage?.error ? `讀取失敗（${storage.usage.error}）` : `${(storage.usage.bytes / 1048576).toFixed(1)} MB／${storage.usage.objects} 個檔案（${storage.usage.kind === 'gcs' ? 'Cloud Storage' : '本機磁碟'}）`}
          　· 全站設計 {storage.designs} 份
        </p>
      )}
      {list === null && <div className="empty">載入中…</div>}
      {list?.length === 0 && <div className="empty"><div className="empty-ic"><Icon name="scroll" /></div>目前沒有洽詢</div>}
      {list?.map(q => {
        const n = CADENCES[q.design.cadence]?.pages || 12
        const pages = buildPages(q.design)
        const waited = workdaysSince(q.createdAt)
        const late = q.status === 'new' && waited > CAL_LIMITS.REPLY_WORKDAYS
        const printed = Object.keys(q.print || {}).map(Number).sort((a, b) => a - b)
        const imgPages = Object.entries(q.design.pages || {}).filter(([i, p]) => p.img && Number(i) < n).map(([i]) => Number(i))
        return (
          <div key={q.id} className={`card inq-card${late ? ' late' : ''}`}>
            <div className="inq-hd">
              <span className={`inq-st s-${q.status}`}>{STATUS[q.status]}</span>
              <b>{q.name}</b>
              <span className="muted">@{q.handle}</span>
              <span className={`inq-wait${late ? ' late' : ''}`}>{late ? `已等 ${waited} 個工作天（超過承諾）` : `送出後第 ${waited} 個工作天`}</span>
            </div>
            <div className="kv"><span>聯絡</span><span><a className="acc" href={`mailto:${q.email}?subject=${encodeURIComponent('機巧時運｜你的桌曆客製洽詢')}`}>{q.email}</a>{q.phone && <> · <a className="acc" href={`tel:${q.phone}`}>{q.phone}</a></>}</span></div>
            <div className="kv"><span>數量</span><b>{q.qty} 本</b></div>
            <div className="kv"><span>設計</span><span>{CADENCES[q.design.cadence]?.label} · {pages[0]?.label}（{pages[0]?.sub}）起 · {n} 頁 · 照片 {imgPages.length} 頁</span></div>
            {q.note && <div className="ad-note" style={{ whiteSpace: 'pre-wrap' }}>{q.note}</div>}
            <div className="inq-flags">
              {q.flags?.lowres?.length > 0 && <span className="inq-flag warn">低解析：第 {q.flags.lowres.map(i => i + 1).join('、')} 頁</span>}
              {q.flags?.missing?.length > 0 && <span className="inq-flag warn">缺原圖（只有預覽）：第 {q.flags.missing.map(i => i + 1).join('、')} 頁</span>}
              {(() => {
                // 客人調過照片的縮放／位置：印刷時要照 3D 預覽的取景，不是預設置中
                const adj = Object.entries(q.design.pages || {}).filter(([i, p]) => p.img?.crop && Number(i) < n).map(([i]) => Number(i) + 1)
                return adj.length > 0 && <span className="inq-flag">照片已調整位置／縮放：第 {adj.join('、')} 頁（以預覽取景為準）</span>
              })()}
              {q.flags?.folk && <span className="inq-flag">含每日宜（民俗內容）</span>}
              {q.flags?.unverified && <span className="inq-flag">Email 未驗證</span>}
              <span className="inq-flag">客人已勾選照片使用權——報價前仍請人工確認</span>
              <span className="inq-flag">國定假日請對照人事行政總處公告</span>
            </div>
            <div className="inq-acts">
              <button className="b dark tap" onClick={() => setView(q)}>看 3D 預覽</button>
              {q.purged
                ? <span className="cal-note">原圖已依保留期限清除</span>
                : printed.map(i => (
                  <a key={i} className="b tap" href={`/api/admin/calinquiries/${q.id}/print/${i}`} target="_blank" rel="noopener">
                    第 {i + 1} 頁原圖
                  </a>
                ))}
            </div>
            <div className="inq-acts">
              {Object.entries(STATUS).map(([k, l]) => (
                <button key={k} className={`chip tap${q.status === k ? ' on' : ''}`} aria-pressed={q.status === k} onClick={() => q.status !== k && setStatus(q, k)}>{l}</button>
              ))}
            </div>
            <label className="cal-label" htmlFor={`note-${q.id}`}>內部備註（客人看不到）</label>
            <textarea id={`note-${q.id}`} className="cal-input cal-area" rows={2} maxLength={2000}
              value={notes[q.id] ?? q.staffNote} onChange={e => setNotes({ ...notes, [q.id]: e.target.value })} />
            <button className="b tap" onClick={() => saveNote(q)}>儲存備註</button>
          </div>
        )
      })}

      {view && (
        <div className="inq-viewer" role="dialog" aria-modal="true" aria-label={`${view.name} 的桌曆 3D 預覽`}>
          <Suspense fallback={<div className="cal3d cal3d-loading">載入中…</div>}>
            <CalView design={view.design} title={`${view.name} 的桌曆`} onClose={() => setView(null)} />
          </Suspense>
        </div>
      )}
    </>
  )
}
