import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, ToolRow, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { api } from '../api.js'

// 創作者後台。
// ⚠️ 原本三個數字全來自 mock.js 的 creatorStats（本月成交 42／被選用 18／粉絲 310）。
// 現在：粉絲與市集上架數改抓真實資料（同 Profile 用的 /api/users/:handle）；
// 「本月成交」屬於尚未建置的分潤結算系統，顯示「—」而不是編一個數字。
export default function CreatorConsole() {
  const { push, setToast, balance, user } = useNav()
  const [my, setMy] = useState(null)   // { stats: { posts, works, followers, following } }

  useEffect(() => {
    if (!user || user.guest || !user.handle) { setMy(null); return }
    let alive = true
    api.userProfile(user.handle).then(r => { if (alive) setMy(r) }).catch(() => {})
    return () => { alive = false }
  }, [user?.handle, user?.guest])

  const stats = [
    ['本月成交', '—'],                                  // 尚未有成交系統
    ['市集上架', my ? my.stats.works : 0],
    ['粉絲', my ? my.stats.followers : 0],
  ]

  // 訪客沒有後端帳號，這裡的數字與功能都不成立 → 直接擋下並引導註冊
  if (!user || user.guest) {
    return (
      <>
        <TopBar title="創作者後台" onBack />
        <div className="body">
          <div className="empty">
            <div className="empty-ic"><Icon name="palette" /></div>
            創作者後台需要註冊帳號<br />
            <span style={{ fontSize: 12 }}>訪客模式沒有帳號資料，註冊後才能上架作品與結算分潤</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="創作者後台" onBack />
      <div className="body">
        <div className="pad" style={{ display: 'flex', gap: 8 }}>
          {stats.map(([l, v]) => (
            <div key={l} className="card" style={{ flex: 1, margin: 0, textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div>
              <div className="muted" style={{ fontSize: 11 }}>{l}</div>
            </div>
          ))}
        </div>

        <SectionHead title="經營工具" />
        <ToolRow iconName="plus" title="上架新作品" sub="設定授權價 · 標記節氣" onClick={() => push('newPost')} />
        <ToolRow iconName="coin" title="定價與授權" sub="市集分潤 70%" onClick={() => setToast('定價設定仍在開發中')} />
        <ToolRow iconName="coin" title="分潤提領" sub={`可提領 NT$${balance.toLocaleString()}`} onClick={() => push('wallet')} />
        <ToolRow iconName="gift" title="企業客製接單" sub="B2B2C 客製月曆／手帳" onClick={() => setToast('企業客製詢價仍在開發中')} />

        <SectionHead title="近期入帳" />
        <div className="empty">
          <div className="empty-ic"><Icon name="chart" /></div>
          還沒有入帳紀錄<br />
          <span style={{ fontSize: 12 }}>作品被授權或選入月曆後會顯示在這裡</span>
        </div>
        <p className="muted" style={{ padding: '0 16px', fontSize: 11, lineHeight: 1.7 }}>
          ＊成交與分潤結算功能仍在開發中（尚未串接金流）。
        </p>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
