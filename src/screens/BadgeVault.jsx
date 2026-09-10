import { useEffect, useState } from 'react'
import { useNav } from '../store/nav.jsx'
import { TopBar, SectionHead, Disclaimer, Link } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { api } from '../api.js'
import { loadBadges, BADGES_EVENT } from '../lib/arBadges.js'
import { ALL_BADGES, BADGES, GROUP_LABEL, SLOT_MAX, TIER_UNIQUE, isReleased } from '../data/badges.js'
import { taipeiToday } from '../data/almanac.js'
import { termFromDate } from '../data/lunisolar.js'

// 今天是哪個節氣——**只拿來顯示「現在正是」這個提示**。
// ⚠️ 真正的蓋印判定在伺服器（POST /api/badges/checkin）：這裡算的東西
//    使用者調系統時鐘就能改，不可拿來決定給不給徽章。
function currentTermName() {
  try {
    const d = taipeiToday()
    return termFromDate(d.getFullYear(), d.getMonth() + 1, d.getDate()).term
  } catch { return null }
}

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

  // ★★★★ 兩個來源**必須分開存**，最後才合併——絕不可用其中一份去覆蓋另一份。
  //   local  ＝ localStorage（訪客也有，但**刻意不含王座**，見 arBadges.save）
  //   remote ＝ /api/badges（含王座，那是後端獨有的）
  //
  //   先前寫成同一個 `owned`：API 回來時合併，但 BADGES_EVENT 一觸發就
  //   `setOwned(new Set(本機那份))` 把合併結果整個換掉 ⇒ **王座從畫面上消失**。
  //   而 syncBadges 正好會在登入還原時發那個事件，時機就在 API 回應前後，
  //   所以這不是理論上的競態，是實測必現的（API 回 13 枚、畫面只有 11 枚）。
  //   ⚠️ 兩個非同步來源寫同一格 state，就一定要問「誰後到誰贏」——
  //     只要答案不是「兩個都留著」，那就是 bug。
  const [local, setLocal] = useState(() => loadBadges())
  const [remote, setRemote] = useState([])
  const [board, setBoard] = useState({})
  const [slots, setSlots] = useState([])
  const [saving, setSaving] = useState(false)
  const owned = new Set([...local, ...remote])
  const nowTerm = currentTermName()

  useEffect(() => {
    const h = (e) => setLocal(Array.isArray(e.detail) ? e.detail : loadBadges())
    window.addEventListener(BADGES_EVENT, h)
    return () => window.removeEventListener(BADGES_EVENT, h)
  }, [])

  useEffect(() => {
    let alive = true
    // ⚠️ 訪客會拿到 401。那是**常態不是故障**（訪客沒有 session），
    //    所以整段靜靜略過，畫面仍用本機那份 —— 不可跳錯誤提示。
    api.badges().then(r => {
      if (!alive) return
      setRemote(r.badges.map(b => b.id))
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

  const groups = ['jieqi', 'quiz', 'term', 'ar']
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
          // ⚠️ 節氣卡那一組多數還沒發行，只寫「1 / 24」會看起來像做壞了。
          //    把「幾張已發行」講出來，那個數字才讀得懂。
          const live = g === 'term' ? list.filter(isReleased).length : list.length
          const extra = g === 'term' && live < list.length
            ? `${got} / ${live} 已發行 · 共 ${list.length}`
            : `${got} / ${list.length}`
          return (
            <section className="bv-group" key={g}>
              <SectionHead title={GROUP_LABEL[g] || g} extra={extra} />
              <div className="bv-grid">
                {list.map(b => (
                  <BadgeCard
                    key={b.id} b={b}
                    owned={owned.has(b.id)}
                    equipped={slots.includes(b.id)}
                    holder={board[b.id]}
                    locked={b.group === 'term' && !isReleased(b)}
                    now={b.group === 'jieqi' && b.term === nowTerm}
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

function BadgeCard({ b, owned, equipped, holder, disabled, onToggle, locked = false, now = false }) {
  const uniq = b.tier === TIER_UNIQUE
  // ⚠️ 未擁有的徽章**不可以整個藏起來或打馬賽克**：這一頁的用途就是告訴人
  //    「還有什麼可以拿、怎麼拿」。藏起來只會讓人以為自己漏掉了什麼。
  //    未擁有＝降低視覺重量（灰階、虛線框），名稱與取得方式照樣看得見。
  return (
    <button
      type="button"
      className={`bv-card${owned ? ' got' : ''}${uniq ? ' uniq' : ''}${equipped ? ' on' : ''}${locked ? ' locked' : ''}${now ? ' now' : ''}`}
      onClick={owned ? onToggle : undefined}
      disabled={disabled || !owned}
      aria-pressed={owned ? equipped : undefined}
      // 未擁有時它不是按鈕而是說明卡，講清楚為什麼按不動
      aria-label={owned
        ? `${b.name}，${equipped ? '已裝上名片，點一下拿下來' : '點一下裝上名片'}`
        : locked ? `${b.name}，這張卡片尚未發行`
        : `${b.name}，尚未取得：${b.how}`}
    >
      <span className="bv-glyph">{b.glyph}</span>
      <span className="bv-name">{b.name}</span>
      {uniq && <span className="bv-tag">唯一</span>}
      {/* ⚠️ 沒有這個標示，使用者不會知道 24 枚裡今天能蓋的是哪一枚——
          而「現在正是」正是這一組唯一的行動線索。 */}
      {now && <span className="bv-tag now">現在正是</span>}
      {/* ★★★ 卡片還沒發行時**不可以**照著 how 寫「去掃卡答對」——
          那是叫使用者去做一件現在做不到的事，而他會以為是自己找不到卡。
          目前官方卡只有一張（小寒），所以 24 枚裡有 23 枚是這一格。 */}
      <span className="bv-how">{locked ? '這張卡片尚未發行，敬請期待' : b.how}</span>
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
