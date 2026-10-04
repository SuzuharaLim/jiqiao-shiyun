import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Link } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'
import { CADENCES, CAL_LIMITS, defaultDesign } from '../data/calendarRules.js'
import { readLocalDesign, clearLocalDesign } from './CalDesign.jsx'
import { stripEmoji } from '../lib/text.js'

// ============================================================================
// 我的桌曆 `/app/calendar/make`（2026-10-04 取代舊的「做月曆工作室」）
//
// 舊的 MakeCalendar／CalendarPreview 是示範流程（選圖 → AI 排版 → 詩詞 → 預覽），
// 不存檔也不接單。新的設計器整個取代它——沿用同一個網址與畫面代號 makeCalendar，
// 站上所有「做月曆」的入口（首頁、個人頁、我的專案、明年預拍）都不用改就會進到這裡。
// ============================================================================
export default function CalStudio() {
  const { user, push, setToast, requireAccount } = useNav()
  const signedIn = !!user && !user.guest
  const [list, setList] = useState(null)
  const [local, setLocal] = useState(() => readLocalDesign())

  const load = () => {
    if (!signedIn) { setList([]); return }
    api.calDesigns().then(r => setList(r.designs || [])).catch(() => setList([]))
  }
  useEffect(load, [signedIn])   // eslint-disable-line react-hooks/exhaustive-deps

  const drafts = (list || []).filter(d => d.status === 'draft').length
  const full = drafts >= CAL_LIMITS.DRAFTS_PER_USER

  const create = async () => {
    if (!signedIn) { push('calDesign', { id: 'local' }); return }
    if (full) { setToast(`最多同時保留 ${CAL_LIMITS.DRAFTS_PER_USER} 份草稿，先刪掉一份再建立新的`); return }
    try {
      const r = await api.calCreate(defaultDesign())
      push('calDesign', { id: r.design.id })
    } catch (e) { setToast(e?.message || '建立失敗，請稍後再試') }
  }
  const remove = async (d) => {
    if (!window.confirm(`確定刪除「${stripEmoji(d.title)}」？刪除後無法復原。`)) return
    try { await api.calDelete(d.id); setToast('已刪除'); load() } catch { setToast('刪除失敗，請稍後再試') }
  }

  return (
    <>
      <TopBar title="我的桌曆" onBack />
      <div className="body cal-studio">
        <div className="cal-hero">
          <span className="cal-hero-k">桌曆設計器</span>
          <h2>設計一本自己的桌曆</h2>
          <p>選一頁放多久（一個月、一個節氣、一週或一季），放上自己的照片和一句話，用 3D 翻翻看成品。滿意了送出洽詢，我們會跟你聯絡印製。</p>
          <button className="btn-primary tap" onClick={create} disabled={signedIn && full}>＋ 新的桌曆設計</button>
          {signedIn && <p className="cal-note">草稿 {drafts} / {CAL_LIMITS.DRAFTS_PER_USER} 份 · {CAL_LIMITS.DRAFT_KEEP_DAYS} 天沒動過的草稿會自動清除（前 7 天寄信提醒）</p>}
          {!signedIn && <p className="cal-note">不用登入就能先玩版型與樣式；要放照片、分享或洽詢時再登入。</p>}
        </div>

        {local && (
          <div className="cal-item">
            <div className="cal-item-ic"><Icon name="scroll" /></div>
            <div className="cal-item-t">
              <b>{stripEmoji(local.title)}</b>
              <small>存在這個瀏覽器 · {CADENCES[local.cadence].label}</small>
            </div>
            <div className="cal-item-a">
              <Link screen="calDesign" params={{ id: 'local' }} className="b tap">繼續</Link>
              <button className="b tap" onClick={() => { if (window.confirm('確定丟掉這份存在瀏覽器裡的設計？')) { clearLocalDesign(); setLocal(null) } }}>丟掉</button>
            </div>
          </div>
        )}

        {signedIn && list === null && <div className="cal-skel ui-skeleton" aria-busy="true" />}
        {(list || []).map(d => (
          <div className="cal-item" key={d.id}>
            <div className="cal-item-ic" style={{ background: 'var(--tone-2)' }}><Icon name="scroll" /></div>
            <div className="cal-item-t">
              <b>{stripEmoji(d.title)}</b>
              <small>
                {d.status === 'submitted' ? '已送出洽詢' : '草稿'} · {CADENCES[d.design.cadence]?.label} · {new Date(d.updatedAt).toLocaleDateString('zh-TW')} 更新
              </small>
            </div>
            <div className="cal-item-a">
              <Link screen="calDesign" params={{ id: d.id }} className="b dark tap">打開</Link>
              <button className="b tap" onClick={() => remove(d)} aria-label={`刪除 ${stripEmoji(d.title)}`}>刪除</button>
            </div>
          </div>
        ))}
        {signedIn && list?.length === 0 && !local && (
          <p className="cal-note" style={{ textAlign: 'center', padding: '12px 0' }}>還沒有桌曆設計，按上面的按鈕開始第一本。</p>
        )}
        {!signedIn && !local && (
          <div className="cal-callout">
            <b>已經有帳號？</b>
            <p>登入後可以看到你存在帳號裡的設計。</p>
            <button className="b tap" onClick={() => requireAccount('查看你的桌曆設計')}>登入</button>
          </div>
        )}
      </div>
    </>
  )
}
