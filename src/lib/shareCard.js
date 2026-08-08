// ============================================================================
// 成果圖卡 —— 答對小挑戰之後產生一張可以存下來的圖
//
// 全部用 canvas 畫，零外部素材（與站上其他地方同一個原則）。
//
// ⚠️ 內容紀律：這張圖會被貼到別人的動態牆上，所以**只畫真的東西**——
//    徽章名稱、節氣、日期，以及一句有出處的事實。不放「我贏了」「第 N 名」
//    這種站上根本沒有的概念，也不放營養宣稱（未經食藥署核對）。
// ============================================================================

const W = 1080, H = 1080

// 站上的品牌色（與 tokens.css 同步；canvas 讀不到 CSS 變數）
const C = {
  paper: '#FFFFFF',
  ink: '#1A1815',
  primary: '#123962',   // 深藍：主色
  teal: '#39C5BB',
  orange: '#E07227',
  gold: '#A85513',
  line: '#E4DED4',
  muted: '#7A736A',
}

/** 圓角矩形（Safari 15 以前沒有 roundRect，自己畫比較保險） */
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 斷行：canvas 沒有自動換行，中文又不能靠空白切 */
function wrap(ctx, text, maxW) {
  const lines = []
  let cur = ''
  for (const ch of String(text)) {
    if (ch === '\n') { lines.push(cur); cur = ''; continue }
    const t = cur + ch
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = ch } else cur = t
  }
  if (cur) lines.push(cur)
  return lines
}

/**
 * 畫一張成果圖卡。
 * @param o.badgeName 徽章名稱（例：小寒 · 結球白菜）
 * @param o.term      節氣
 * @param o.fact      一句有出處的事實
 * @param o.source    那句話的出處
 * @param o.dateText  取得日期（顯示用字串）
 * @returns {Promise<Blob|null>}
 */
export async function renderShareCard(o = {}) {
  // ⚠️ 要等字型載完再畫，否則 canvas 會用 fallback 字型量寬度與繪製，
  //    斷行位置與實際看到的不一樣（中文尤其明顯）。
  try { await document.fonts?.ready } catch { /* 不支援就直接畫 */ }

  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  const FONT = '"Noto Serif TC","Songti TC","PingFang TC","Microsoft JhengHei",serif'
  const SANS = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif'

  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, W, H)

  // 外框：與實體卡同一套語彙（深色細框）
  ctx.strokeStyle = C.primary
  ctx.lineWidth = 6
  ctx.strokeRect(40, 40, W - 80, H - 80)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.strokeRect(62, 62, W - 124, H - 124)

  // 印章：實心方章 ＋ 鏤空「機」（與 favicon 同一個語彙）
  const sealX = W / 2 - 54, sealY = 132
  ctx.fillStyle = C.orange
  rrect(ctx, sealX, sealY, 108, 108, 16)
  ctx.fill()
  ctx.fillStyle = C.paper
  ctx.font = `600 66px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('機', W / 2, sealY + 58)

  // 節氣
  ctx.fillStyle = C.muted
  ctx.font = `500 34px ${SANS}`
  ctx.fillText(o.term ? `節氣 · ${o.term}` : '節氣', W / 2, 300)

  // 徽章名（主角）
  ctx.fillStyle = C.ink
  ctx.font = `700 76px ${FONT}`
  const nameLines = wrap(ctx, o.badgeName || '節氣徽章', W - 220)
  nameLines.forEach((l, i) => ctx.fillText(l, W / 2, 392 + i * 92))
  let y = 392 + nameLines.length * 92

  // 「獲得節氣徽章」小標
  ctx.fillStyle = C.gold
  ctx.font = `600 32px ${SANS}`
  ctx.fillText('獲得節氣徽章', W / 2, y + 24)
  y += 90

  // 一句有出處的事實
  if (o.fact) {
    ctx.fillStyle = '#FBFAF7'
    rrect(ctx, 120, y, W - 240, 200, 20)
    ctx.fill()
    ctx.strokeStyle = C.line; ctx.lineWidth = 2
    rrect(ctx, 120, y, W - 240, 200, 20)
    ctx.stroke()

    ctx.fillStyle = C.ink
    ctx.font = `400 34px ${SANS}`
    const factLines = wrap(ctx, o.fact, W - 320).slice(0, 3)
    factLines.forEach((l, i) => ctx.fillText(l, W / 2, y + 62 + i * 46))
    if (o.source) {
      ctx.fillStyle = C.muted
      ctx.font = `400 24px ${SANS}`
      ctx.fillText(`資料來源：${o.source}`, W / 2, y + 168)
    }
    y += 240
  }

  // 日期
  if (o.dateText) {
    ctx.fillStyle = C.muted
    ctx.font = `400 28px ${SANS}`
    ctx.fillText(o.dateText, W / 2, y + 20)
  }

  // 頁尾：站名與網址
  ctx.fillStyle = C.primary
  ctx.font = `600 40px ${FONT}`
  ctx.fillText('機巧時運', W / 2, H - 170)
  ctx.fillStyle = C.muted
  ctx.font = `400 30px ${SANS}`
  ctx.fillText('chengqi.tw', W / 2, H - 120)

  return new Promise(res => cv.toBlob(res, 'image/png'))
}

/**
 * 把圖存起來／分享出去。
 *
 * ⚠️ **iOS Safari 不支援 `<a download>`**：點了只會在同一個分頁開啟那張圖，
 *    使用者以為壞掉了。所以順序是：
 *      ① Web Share API（帶檔案）——手機上最好的路徑，直接進系統分享選單
 *      ② `<a download>`——桌機瀏覽器
 *      ③ 開新分頁——最後手段，並告訴使用者「長按圖片即可儲存」
 *
 * ⚠️ Web Share 必須在**使用者手勢的同一個 tick 附近**呼叫，否則會被擋。
 *    所以圖要先畫好再呼叫這支，不可在這裡才 await 繪製。
 *
 * @returns {Promise<'shared'|'downloaded'|'opened'|'cancelled'|'failed'>}
 */
export async function saveOrShare(blob, filename = '機巧時運-節氣徽章.png') {
  if (!blob) return 'failed'
  // ⚠️ 檔名要消毒：徽章名稱是內容資料，未來可能含 `/ : ? * " < > |` 這些在
  //    Windows 上非法的字元。不處理的話下載會靜默失敗或存成怪名字。
  //    也順手把 `·` 與連續空白收成單一底線，避免檔名裡出現一長串空格。
  const safe = String(filename)
    // 反斜線也要收（Windows 路徑分隔符），用 String.raw 避免多層跳脫時掉字元
    .replace(new RegExp(String.raw`[\\/:*?"<>|]`, 'g'), '-')
    .replace(/[·・\s]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120) || '機巧時運-節氣徽章.png'
  const file = new File([blob], safe, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '機巧時運 · 節氣徽章' })
      return 'shared'
    } catch (e) {
      // 使用者按取消不是錯誤，不可跳「失敗」的提示
      if (e?.name === 'AbortError') return 'cancelled'
      // 其他錯誤往下走 fallback
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    if ('download' in a) {
      a.href = url; a.download = safe
      document.body.appendChild(a); a.click(); a.remove()
      return 'downloaded'
    }
    window.open(url, '_blank')
    return 'opened'
  } catch {
    return 'failed'
  } finally {
    // ⚠️ 不可立刻 revoke：下載/開啟是非同步的，馬上撤銷會讓檔案變成 0 bytes。
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
}
