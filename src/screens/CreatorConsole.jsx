import { TopBar, ToolRow, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { creatorStats } from '../data/mock.js'

export default function CreatorConsole() {
  const { push, setToast, balance } = useNav()
  return (
    <>
      <TopBar title="創作者後台" onBack />
      <div className="body">
        <div className="pad" style={{ display: 'flex', gap: 8 }}>
          {[['本月成交', creatorStats.monthSales], ['被選用', creatorStats.licensed], ['粉絲', creatorStats.followers]].map(([l, v]) => (
            <div key={l} className="card" style={{ flex: 1, margin: 0, textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div>
              <div className="muted" style={{ fontSize: 11 }}>{l}</div>
            </div>
          ))}
        </div>

        <SectionHead title="經營工具" />
        <ToolRow icon="⬆️" bg="#dcfce7" title="上架新作品" sub="設定授權價 · 標記節氣" onClick={() => push('newPost')} />
        <ToolRow icon="🏷️" bg="#ffedd5" title="定價與授權" sub="市集分潤 70%" onClick={() => setToast('定價設定（Demo）')} />
        <ToolRow icon="💸" bg="#dbeafe" title="分潤提領" sub={`可提領 NT$${balance.toLocaleString()}`} onClick={() => push('wallet')} />
        <ToolRow icon="🎁" bg="#e9e3fb" title="企業客製接單" sub="B2B2C 客製月曆／手帳" onClick={() => setToast('企業客製詢價（Demo）')} />

        <SectionHead title="近期入帳" />
        {creatorStats.rows.map((r, i) => (
          <div key={i} className="kv" style={{ padding: '12px 16px' }}><span>{r.name}</span><b style={{ color: 'var(--yi)' }}>+NT${r.amount}</b></div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
