import { useEffect, useState } from 'react'
import { useNav } from '../store/nav.jsx'
import { TopBar, SectionHead, Disclaimer, Link } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { api } from '../api.js'
import { loadBadges, BADGES_EVENT } from '../lib/arBadges.js'
import { ALL_BADGES, BADGES, GROUP_LABEL, SLOT_MAX, TIER_UNIQUE } from '../data/badges.js'

// ============================================================================
// 徽章收藏庫 `/badges`
//
// 三件事：看自己有哪些、看**還沒拿到**的怎麼拿、挑三枚裝上名片。
//
// ★★★ 為什麼要顯示還沒拿到的（而不是只列已擁有的）：
//   只列已擁有的話，這一頁對「還沒拿到任何徽章的人」是一片空白，而那正是
//   最需要被告訴「怎麼拿」的那群人。個人頁的徽章牆刻意「一枚都沒有就整塊
//   不顯示」是對的——那是個人頁；收藏庫是目錄，目錄本來就要列出全部。
//
// ★★★ 唯一徽章要顯示「現在在誰手上」。 空著的王座才有人想去挑戰；
//   已經被誰拿走也是資訊（知道要贏過誰、贏多少）。只寫「你沒有」
//   等於把一個可以爭取的東西講成一堵牆。
// ============================================================================

export default function BadgeVault() {
  const { user, setToast } = useNav()
  const isGuest = !user || user.guest

  // 初值讀本機那份：徽章存 localStorage，同步可得，沒有「載入中」這一格。
  // 後端那份（含王座）回來之後再合併——這樣有網路慢的人也不會先看到空畫面。
  const [owned, setOwned] = useState(() => new Set(loadBadges()))
  const [board, setBoard] = useState({})
  const [slots, setSlots] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const h = (e) => setOwned(new Set(Array.isArray(e.detail) ? e.detail : loadBadges()))
    window.addEventListener(BADGES_EVENT, h)
    return () => window.removeEventListener(BADGES_EVENT, h)
  }, [])

  useEffect(() => {
    let alive = true
    // ⚠️ 訪客會拿到 401。那是**常態不是故障**（訪客沒有 session），
    //    所以整段靜靜略過，畫面仍用本機那份 —— 不可跳錯誤提示。
    api.badges().then(r => {
      if (!alive) return
      setOwned(prev => new Set([...prev, ...r.badges.map(b => b.id)]))
      setBoard(r.board || {})
      setSlots(r.slots || [])
    }).catch(() => { /* 訪客／離線：用本機那份 */ })
    return () => { alive = false }
  }, [user?.id])

  const toggleSlot = async (id) => {
    if (isGuest) { setToast('訪客沒有名片可以裝徽章，註冊一個就能收藏'); return }
    const has = slots.includes(id)
    if (!has && slots.length >= SLOT_MAX) {
      setToast(`最多裝上 ${SLOT_MAX} 枚，先拿掉一枚再換`)
      return
    }
    const next = has ? slots.filter(x => x !== id) : [...slots, id]
    const prev = slots
    setSlots(next)          // 先動畫面：這是個開關，等網路來回會很鈍
    setSaving(true)
    try {
      const r = await api.setBadgeSlots(next)
      setSlots(r.slots)
    } catch {
      // ⚠️ 失敗一定要**還原**並說出來。留著樂觀更新的話，使用者會以為裝上了，
      //    下次重整卻發現沒有——而他不會知道是哪一次沒存成功。
      setSlots(prev)
      setToast('沒有存起來，請再試一次')
    } finally { setSaving(false) }
  }

  const groups = ['quiz', 'ar']
  const ownedCount = ALL_BADGES.filter(b => owned.has(b.id)).length

  return (
    <>
      <TopBar title="徽章收藏庫" onBack />
      <div className="body">

        <div className="bv-head">
          <div className="bv-count"><b>{ownedCount}</b><span> / {ALL_BADGES.length}</span></div>
          <p>
            {ownedCount === 0
              ? '還沒有徽章。玩一場節氣知識王，或掃一張節氣卡片答對小挑戰，第一枚就到手了。'
              : `已收集 ${ownedCount} 枚。點徽章可以裝上名片，最多 ${SLOT_MAX} 枚。`}
          </p>
          {!isGuest && (
            <Link screen="nameCard" params={{ handle: user.handle }} className="bv-cardlink">
              看我的名片<Icon name="chev" style={{ display: 'inline-block', verticalAlign: '-3px', width: 16, height: 16 }} />
            </Link>
          )}
        </div>

        {/* ⚠️ 訪客拿得到一般徽章（存在瀏覽器裡），但拿不到唯一徽章也沒有名片。
            這件事一定要**先講**，不可以讓他挑戰一個不可能拿到的東西之後才發現。 */}
        {isGuest && (
          <Disclaimer text="訪客的徽章只存在這個瀏覽器裡，換裝置就不見了；唯一徽章需要帳號才能持有。註冊後現有的徽章會自動合併過去。" />
        )}

        {groups.map(g => {
          const list = ALL_BADGES.filter(b => b.group === g)
          if (!list.length) return null
          const got = list.filter(b => owned.has(b.id)).length
          return (
            <section className="bv-group" key={g}>
              <SectionHead title={GROUP_LABEL[g] || g} extra={`${got} / ${list.length}`} />
              <div className="bv-grid">
                {list.map(b => (
                  <BadgeCard
                    key={b.id} b={b}
                    owned={owned.has(b.id)}
                    equipped={slots.includes(b.id)}
                    holder={board[b.id]}
                    disabled={saving}
                    onToggle={() => toggleSlot(b.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}

        <Disclaimer text="唯一徽章全站同時只有一個人持有，被超越就會易主，原持有者會收到通知。一般徽章拿到就是永久的。" />
      </div>
    </>
  )
}

function BadgeCard({ b, owned, equipped, holder, disabled, onToggle }) {
  const uniq = b.tier === TIER_UNIQUE
  // ⚠️ 未擁有的徽章**不可以整個藏起來或打馬賽克**：這一頁的用途就是告訴人
  //    「還有什麼可以拿、怎麼拿」。藏起來只會讓人以為自己漏掉了什麼。
  //    未擁有＝降低視覺重量（灰階、虛線框），名稱與取得方式照樣看得見。
  return (
    <button
      type="button"
      className={`bv-card${owned ? ' got' : ''}${uniq ? ' uniq' : ''}${equipped ? ' on' : ''}`}
      onClick={owned ? onToggle : undefined}
      disabled={disabled || !owned}
      aria-pressed={owned ? equipped : undefined}
      // 未擁有時它不是按鈕而是說明卡，講清楚為什麼按不動
      aria-label={owned
        ? `${b.name}，${equipped ? '已裝上名片，點一下拿下來' : '點一下裝上名片'}`
        : `${b.name}，尚未取得：${b.how}`}
    >
      <span className="bv-glyph">{b.glyph}</span>
      <span className="bv-name">{b.name}</span>
      {uniq && <span className="bv-tag">唯一</span>}
      <span className="bv-how">{b.how}</span>
      {uniq && (
        <span className="bv-holder">
          {holder
            ? `目前持有：${holder.name}（${holder.value} ${b.unit}）`
            : '目前無人持有 — 空著的王座'}
        </span>
      )}
      {equipped && <span className="bv-on">已裝上</span>}
    </button>
  )
}

/** 名片與個人資訊共用的「裝上的徽章」列。 */
export function BadgeSlots({ ids = [] }) {
  if (!ids.length) return null
  return (
    <div className="bv-slots">
      {ids.map(id => {
        const b = BADGES[id]
        // 查不到就顯示 slug 而不是藏起來——藏起來會變成「明明拿過卻看不到」，
        // 那比顯示一串 slug 更難查（arBadges.js 一直是這個原則）。
        if (!b) return <span className="bv-slot" key={id}><b>{id}</b></span>
        return (
          <span className={`bv-slot${b.tier === TIER_UNIQUE ? ' uniq' : ''}`} key={id}>
            <i>{b.glyph}</i><b>{b.name}</b>
          </span>
        )
      })}
    </div>
  )
}
