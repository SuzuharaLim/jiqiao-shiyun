import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 錢包／收益 —— 帳目全部來自 ledger 資料表（訂單成立時記帳）。
//
// ⚠️ 金流尚未簽約：提領只會建立 requested 狀態的申請紀錄，不會真的匯款。
// 這是刻意的設計（先記帳、後付款）——帳目歷史完整保留，簽約後只要在
// payout 處理流程接上金流 API 即可，不需要回頭補資料。
//
// 金額以「分」為單位存整數（避免浮點誤差），顯示時才除 100。
const nt = (cents) => `NT$${(cents / 100).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`

const KIND_LABEL = { license: '作品授權', calendar: '月曆選用', bonus: '獎勵', adjust: '調整' }
const STATUS_LABEL = { pending: '待確認', available: '可提領', paid: '已撥款', void: '已作廢' }
const PAYOUT_LABEL = { requested: '已申請', processing: '處理中', paid: '已撥款', rejected: '未通過' }

export default function Wallet() {
  const { setToast, user } = useNav()
  const [data, setData] = useState(null)   // null=載入中
  const [busy, setBusy] = useState(false)

  const load = () => api.ledger().then(setData).catch(() => setData({ error: true }))
  useEffect(() => { if (user && !user.guest) load() }, [user?.handle, user?.guest])

  // 訪客沒有後端帳號，這裡的數字與功能都不成立 → 直接擋下並引導註冊
  if (!user || user.guest) {
    return (
      <>
        <TopBar title="錢包 / 收益" onBack />
        <div className="body">
          <div className="empty">
            <div className="empty-ic"><Icon name="coin" /></div>
            錢包與收益需要註冊帳號<br />
            <span style={{ fontSize: 'var(--text-xs)' }}>訪客模式沒有帳號資料，註冊後才能上架作品與結算分潤</span>
          </div>
        </div>
      </>
    )
  }

  const requestPayout = async () => {
    if (busy) return
    setBusy(true)
    try {
      const r = await api.requestPayout()
      setToast(r.message || '提領申請已建立')
      await load()
    } catch (e) {
      setToast(e?.message || '提領申請失敗')
    } finally { setBusy(false) }
  }

  const bal = data?.balance
  const entries = data?.entries || []
  const payouts = data?.payouts || []

  return (
    <>
      <TopBar title="錢包 / 收益" onBack />
      <div className="body">
        <div className="aicard">
          <div className="t" style={{ fontSize: 'var(--text-xs)' }}>可提領餘額</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--acard-t)', margin: '4px 0 4px' }}>
            {data === null ? '—' : nt(bal?.available || 0)}
          </div>
          {bal?.pending > 0 && (
            <div className="muted" style={{ fontSize: 'var(--text-2xs)', marginBottom: 10 }}>
              另有 {nt(bal.pending)} 待確認（訂單完成後轉為可提領）
            </div>
          )}
          <button className="go tap" onClick={requestPayout} disabled={busy || !bal?.available}
            style={!bal?.available ? { opacity: .5 } : null}>
            {busy ? '申請中…' : bal?.available ? '申請提領' : '尚無可提領金額'}
          </button>
        </div>

        {/* 分潤比例與撥款狀態說明——使用者有權知道錢怎麼算、什麼時候拿到 */}
        <div className="note" style={{ borderLeft: '3px solid var(--cinnabar)' }}>
          <span style={{ fontSize: 'var(--text-xs)', lineHeight: 1.7 }}>
            作品售出的分潤比例為 <b>{data?.rate ?? 70}%</b>。
            {data?.settlementReady === false && '　金流服務尚未簽約完成，提領申請會先建立紀錄，實際撥款於上線後處理。'}
          </span>
        </div>

        <SectionHead title="收益明細" extra={data === null ? '載入中' : `${entries.length} 筆`} />
        {data === null && <div className="empty">載入中…</div>}
        {data?.error && <div className="empty"><div className="big"><Icon name="wallet" /></div>載入失敗，請稍後再試</div>}
        {data && !data.error && entries.length === 0 && (
          <div className="empty">
            <div className="empty-ic"><Icon name="coin" /></div>
            還沒有收益紀錄<br />
            <span style={{ fontSize: 'var(--text-xs)' }}>作品被授權或選入月曆後，分潤會出現在這裡</span>
          </div>
        )}
        {entries.map(e => (
          <div key={e.id} className="kv" style={{ padding: '12px 16px' }}>
            <span>
              {KIND_LABEL[e.kind] || e.kind}
              <small className="muted" style={{ display: 'block', fontSize: 'var(--text-2xs)', marginTop: 2 }}>
                成交 {nt(e.gross)} · 分潤 {e.rate}% · {STATUS_LABEL[e.status] || e.status} · {e.time}
              </small>
            </span>
            <b style={{ color: e.status === 'void' ? 'var(--muted)' : 'var(--yi)' }}>
              {e.status === 'void' ? '—' : `+${nt(e.amount)}`}
            </b>
          </div>
        ))}

        {payouts.length > 0 && (
          <>
            <SectionHead title="提領紀錄" />
            {payouts.map(p => (
              <div key={p.id} className="kv" style={{ padding: '12px 16px' }}>
                <span>{nt(p.amount)}
                  <small className="muted" style={{ display: 'block', fontSize: 'var(--text-2xs)', marginTop: 2 }}>{p.time}</small>
                </span>
                <span className={p.status === 'paid' ? 'ad-good' : 'muted'} style={{ fontSize: 'var(--text-xs)' }}>
                  {PAYOUT_LABEL[p.status] || p.status}
                </span>
              </div>
            ))}
          </>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
