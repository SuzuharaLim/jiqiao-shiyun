import { useEffect, useState } from 'react'
import { useNav } from '../store/nav.jsx'
import { TopBar, Avatar, Seal, Link, Empty, Disclaimer } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { api } from '../api.js'
import { BADGES, TIER_UNIQUE } from '../data/badges.js'
import { stripEmoji } from '../lib/text.js'

// ============================================================================
// 個人名片 `/card/:handle`（2026-09-10）
//
// 一張可以分享出去的卡片：頭像、名字、handle、一句自介、三枚裝上的徽章。
//
// ★★★ 這一頁**不需要登入**，因為名片的用途就是給別人看。
//   ⇒ 所以它一個私密欄位都不能有（email、訂單、私密貼文全部不在這裡），
//     而且走的是 `/api/card/:handle` 這支輕端點，不是 `/api/users/:handle`
//     （那一支會回 60 篇貼文＋60 件作品——一張分享出去的卡片拉 120 筆內容
//     是白費的）。
//
// ★★★ RWD：卡片本體用 `width: min(100%, 420px)` 而**不是** max-width。
//   `.screen .body` 是 flex column，用 `max-width + margin:auto` 置中會關閉
//   stretch、卡片縮成內容寬（站規記過三次的同一個坑）。
//
// ⚠️ 分享用 Web Share API，失敗才退回複製網址。**不做「存成圖片」**：
//   那需要另一條 canvas 繪製路徑（shareCard.js 是 1080×1080 的徽章圖卡，
//   欄位完全不同），而網址本身就會被 server/seo.js 產生預覽卡——
//   貼到 LINE／Threads 看到的就是這張卡的縮圖。
// ============================================================================

export default function NameCard({ handle }) {
  const { user, setToast } = useNav()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const who = String(handle || '').trim()
  const isMe = !!user && !user.guest && user.handle?.toLowerCase() === who.toLowerCase()

  useEffect(() => {
    let alive = true
    if (!who) { setErr('nohandle'); return }
    setData(null); setErr(null)
    api.card(who)
      .then(r => { if (alive) setData(r) })
      .catch(e => { if (alive) setErr(e?.status === 404 ? 'notfound' : 'net') })
    return () => { alive = false }
  }, [who])

  const share = async () => {
    const url = `${location.origin}/card/${encodeURIComponent(who)}`
    const title = data ? `${stripEmoji(data.user.name)} · 機巧時運` : '機巧時運'
    try {
      if (navigator.share) { await navigator.share({ title, url }); return }
    } catch (e) {
      // ⚠️ 使用者按取消是 AbortError，**不是錯誤**，不可跳失敗提示。
      if (e?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      setToast('名片網址已複製')
    } catch {
      setToast(url)   // 連剪貼簿都不給：至少把網址顯示出來讓人自己複製
    }
  }

  if (err === 'notfound' || err === 'nohandle') {
    return (
      <>
        <TopBar title="名片" onBack />
        <div className="body">
          <Empty iconName="user" title="找不到這張名片"
            hint="這個帳號可能已經改過代號或不存在了。" />
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="名片" onBack />
      <div className="body nc-body">
        {!data ? (
          err === 'net'
            ? <Empty iconName="user" title="讀不到這張名片" hint="網路好像不太順，稍後再試一次。" />
            : <div className="nc-card ui-skeleton" style={{ minHeight: 260 }} aria-hidden="true" />
        ) : (
          <>
            <article className="nc-card">
              <header className="nc-top">
                <Seal className="nc-seal" badge />
                <span className="nc-brand">機巧時運</span>
              </header>

              <div className="nc-who">
                <span className="nc-av" style={{ background: data.user.avatarBg || 'var(--tone-1)' }}>
                  <Avatar imageId={data.user.avatarImageId} emoji={data.user.avatar} name={data.user.name} />
                </span>
                <div className="nc-id">
                  <h1 className="nc-name">{stripEmoji(data.user.name)}</h1>
                  <p className="nc-handle">@{data.user.handle}</p>
                </div>
              </div>

              {/* ★★★ 名字與自介來自資料庫，正式站的舊資料仍帶 emoji（實測種子帳號的
                  bio 是「記錄二十四節氣 🌿　台中」）。全站禁用 emoji 的第二道防線
                  就是「所有印出 DB 字串的地方都要過 stripEmoji」——新做的畫面
                  最容易漏掉這一條，因為本機測試資料看起來往往是乾淨的。 */}
              {stripEmoji(data.user.bio || '').trim() &&
                <p className="nc-bio">{stripEmoji(data.user.bio)}</p>}

              <dl className="nc-stats">
                <div><dt>作品</dt><dd>{data.stats.works}</dd></div>
                <div><dt>貼文</dt><dd>{data.stats.posts}</dd></div>
                <div><dt>粉絲</dt><dd>{data.stats.followers}</dd></div>
                <div><dt>徽章</dt><dd>{data.badgeCount}</dd></div>
              </dl>

              {/* ⚠️ 一枚都沒裝時**不留空框**。空的展示欄只會讓人覺得「這裡壞了」，
                  而對本人要給的是可以動作的下一步（去裝），不是一塊空白。 */}
              {data.badges.length > 0 ? (
                <div className="nc-badges">
                  {data.badges.map(id => {
                    const b = BADGES[id]
                    return (
                      <span className={`nc-badge${b?.tier === TIER_UNIQUE ? ' uniq' : ''}`} key={id}>
                        <i>{b?.glyph ?? '章'}</i>
                        <b>{b?.name ?? id}</b>
                        {b?.tier === TIER_UNIQUE && <em>全站唯一</em>}
                      </span>
                    )
                  })}
                </div>
              ) : isMe ? (
                <Link screen="badges" className="nc-empty-cta">
                  還沒裝上徽章，去收藏庫挑三枚
                  <Icon name="chev" style={{ display: 'inline-block', verticalAlign: '-3px', width: 16, height: 16 }} />
                </Link>
              ) : null}
            </article>

            <div className="nc-acts">
              <button type="button" className="btn-primary nc-share" onClick={share}>
                分享這張名片
              </button>
              <Link screen="creatorPage" params={{ user: data.user.handle }} className="nc-more">
                看完整個人頁
              </Link>
              {isMe && <Link screen="badges" className="nc-more">管理徽章</Link>}
            </div>

            {data.isPrivate && (
              <Disclaimer text="這是私密帳號，名片只顯示公開的基本資料與徽章。" />
            )}
          </>
        )}
      </div>
    </>
  )
}
