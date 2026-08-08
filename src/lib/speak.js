// ============================================================================
// 語音導覽 —— Web Speech API（SpeechSynthesis），零第三方相依
//
// 改版文件 §3 P2 的「語音導覽」。用途是讓使用者在**拿著實體卡、眼睛看著卡面**
// 的時候也能聽內容——那個姿勢下低頭讀螢幕是彆扭的。
//
// ⚠️ **絕不自動朗讀**。這頁可能在公共場合被打開，突然出聲是很糟的體驗，
//    而且 iOS/Chrome 本來就會擋掉沒有使用者手勢的發聲（我們會拿到一個
//    靜默失敗的 utterance，看起來像功能壞了）。一律由按鈕觸發。
//
// ⚠️ 這是**輔助**不是替代：畫面上該有的字一個都不能少。語音只是多一條路徑。
// ============================================================================

/** 這台裝置支援語音合成嗎。 */
export function speechSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function'
}

/**
 * 取得中文（台灣優先）的語音。
 *
 * ⚠️ **`getVoices()` 第一次呼叫常常回空陣列**：語音清單是非同步載入的，
 *    Chrome 尤其明顯。只呼叫一次就放棄的話，症狀是「第一次點沒有聲音或講英文腔，
 *    第二次才正常」——而使用者不會再點第二次。
 *    所以要等 `voiceschanged`，並且加一個逾時（有些瀏覽器**永遠不發**這個事件，
 *    死等會讓按鈕一直卡在「準備中」）。
 */
let voicesPromise = null
export function loadVoices(timeoutMs = 1500) {
  if (!speechSupported()) return Promise.resolve([])
  if (voicesPromise) return voicesPromise
  voicesPromise = new Promise(resolve => {
    const synth = window.speechSynthesis
    const got = synth.getVoices()
    if (got.length) { resolve(got); return }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      synth.removeEventListener?.('voiceschanged', finish)
      resolve(synth.getVoices())
    }
    synth.addEventListener?.('voiceschanged', finish)
    // ⚠️ 逾時是必要的：部分 WebView 不發 voiceschanged 也不填清單，
    //    這時回空陣列讓呼叫端走「用系統預設語音」的路，仍然唸得出來。
    setTimeout(finish, timeoutMs)
  })
  return voicesPromise
}

/**
 * 從語音清單挑一個唸中文的。
 * 優先序：zh-TW → zh-HK → 任何 zh → null（交給系統預設）。
 *
 * ⚠️ 回 null 不是失敗：不指定 voice 時瀏覽器會用 lang 屬性去挑，
 *    多數情況仍然正確。硬要挑到才肯唸的話，語音清單抓不到就等於功能沒了。
 */
export function pickZhVoice(voices) {
  const list = voices || []
  const by = (re) => list.find(v => re.test(v.lang || '') || re.test(v.name || ''))
  return by(/zh[-_]TW|cmn[-_]Hant|台灣|Taiwan/i)
    ?? by(/zh[-_]HK|yue/i)
    ?? by(/^zh/i)
    ?? null
}

/**
 * 把要唸的內容切成句子。
 *
 * ⚠️ **Chrome 桌機有一個長年的 bug：單一 utterance 唸超過約 15 秒就會靜音中斷**
 *    （合成引擎的看門狗把它砍掉，且不會觸發 error 事件——聽起來就是「講到一半
 *    突然停掉」）。常見的繞法是每隔幾秒 pause()/resume()，但那會在句中造成
 *    可聽見的頓挫。這裡改成**切成短句依序排隊**：每個 utterance 都遠短於 15 秒，
 *    自然就不會被砍，而且在句子邊界斷句本來就比較好聽。
 *
 * ⚠️ 中文沒有空白可切，要靠標點。切完的空字串要濾掉，
 *    否則會排進一個唸不出東西的 utterance，`onend` 立刻觸發，
 *    看起來像跳過了一句。
 */
export function splitForSpeech(text, maxLen = 60) {
  const raw = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!raw) return []
  // 在中文句末標點之後斷開（保留標點，唸起來才有停頓）
  const rough = raw.split(/(?<=[。！？；\n])/)
  const out = []
  for (const piece of rough) {
    let s = piece.trim()
    if (!s) continue
    // 還是太長就用逗號再切一次；仍然太長只好硬切
    while (s.length > maxLen) {
      const cut = s.lastIndexOf('，', maxLen)
      const at = cut > maxLen * 0.4 ? cut + 1 : maxLen
      const head = s.slice(0, at).trim()
      if (head) out.push(head)
      s = s.slice(at).trim()
    }
    if (s) out.push(s)
  }
  return out
}

/**
 * 把一個物件（白菜、臘八粥…）整理成一段適合「用聽的」稿子。
 *
 * ⚠️ 唸出來的稿子與畫面上的字**不會完全一樣**，這是刻意的：
 *    · `（資料來源：農業部開放資料）` 這種括號註記唸出來很吵，改成整段結尾說一次
 *    · `dt/dd` 的對照表用眼睛掃很快，唸的時候要補「，」才聽得懂分界
 *    但**內容不可增減**——不能為了順口加上畫面上沒有的說法。
 */
export function scriptForObject(obj) {
  if (!obj) return ''
  const parts = []
  if (obj.name) parts.push(`${obj.name}。`)
  if (obj.line) parts.push(obj.line.endsWith('。') ? obj.line : `${obj.line}。`)
  const sources = new Set()
  for (const f of obj.facts ?? []) {
    if (!f?.label || !f?.value) continue
    parts.push(`${f.label}，${f.value}。`)
    if (f.source) sources.add(f.source)
  }
  if (obj.warn) parts.push(`${obj.warn}`)
  if (sources.size) parts.push(`以上資料來源：${[...sources].join('、')}。`)
  return parts.join('')
}

/**
 * 依序唸完一段稿子。
 *
 * @returns {{ cancel: () => void }} 呼叫 cancel 立刻停止（元件卸載時務必呼叫）
 *
 * ⚠️ **`speechSynthesis` 是全域單例，跨頁面存活**。不在卸載時 cancel 的話，
 *    使用者按上一頁離開這個畫面，聲音**還會繼續唸完**——而畫面上已經沒有
 *    任何東西能停下它了。這是這個 API 最容易漏掉的一點。
 *
 * ⚠️ 開始前一定要先 `cancel()` 清掉佇列：連點兩次會變成兩段同時唸，
 *    而 SpeechSynthesis 沒有「取代目前這段」的語意，只有一個全域佇列。
 */
export function speak(text, { onState } = {}) {
  const chunks = splitForSpeech(text)
  if (!speechSupported() || !chunks.length) {
    onState?.('idle')
    return { cancel() {} }
  }
  const synth = window.speechSynthesis
  let cancelled = false
  synth.cancel()   // 清掉可能還在排隊的上一段

  const run = async () => {
    const voice = pickZhVoice(await loadVoices())
    if (cancelled) return
    onState?.('speaking')
    let i = 0
    const next = () => {
      if (cancelled) return
      if (i >= chunks.length) { onState?.('idle'); return }
      const u = new window.SpeechSynthesisUtterance(chunks[i++])
      // ⚠️ lang 一定要設。不設的話多數瀏覽器用「頁面語言或系統語言」，
      //    英文系統會用英文語音去唸中文，出來是一串亂七八糟的音節。
      u.lang = voice?.lang || 'zh-TW'
      // ⚠️ 指定 voice 要包 try：規格要求它必須是原生的 SpeechSynthesisVoice，
      //    塞別的東西進去 Chrome 會丟 TypeError。指定失敗不是致命的
      //    ——上面的 lang 已經夠瀏覽器挑到中文語音了，所以吞掉繼續唸。
      if (voice) { try { u.voice = voice } catch { /* 用 lang 挑就好 */ } }
      u.rate = 1
      u.onend = next
      // ⚠️ onerror 也要接著往下走，不可整段中止：某一句唸不出來
      //    （罕見字、引擎暫時性錯誤）不該讓後面全部消失。
      u.onerror = () => { if (!cancelled) next() }
      synth.speak(u)
    }
    next()
  }
  // ⚠️ **狀態不可依賴合成引擎不出錯**。run() 裡只要拋一次（建構 utterance 失敗、
  //    某些 WebView 的 speak() 直接丟），狀態就永遠停在 'speaking'：
  //    按鈕寫著「停止朗讀」、卻一個字都沒唸，而使用者無從得知已經壞了。
  //    這與站上「動畫只負責怎麼出現、不可負責是否存在」是同一條原則
  //    ——失效時要退回可用的狀態，不是卡在中間態。
  run().catch(() => { if (!cancelled) onState?.('idle') })

  return {
    cancel() {
      cancelled = true
      try { synth.cancel() } catch { /* 有些 WebView 在卸載期間會丟 */ }
      onState?.('idle')
    },
  }
}
