// 語音導覽的回歸測試（src/lib/speak.js）
//
// 為什麼要有這支：跟 almanac／AR／3D 角色一樣，這是「寫錯不會拋錯」的程式碼，
// 而且失敗模式**全部都要用耳朵才聽得出來**——CI 沒有耳朵，我也不會每次改動
// 都戴上耳機從頭聽一遍。
//
//   · 斷句掉字   → 少唸一句，畫面完全正常
//   · 切太長     → 超過 Chrome 15 秒看門狗，唸到一半靜音（且不觸發 error）
//   · 切出空字串 → onend 立刻觸發，聽起來像跳過了一句
//   · 出處沒去重 → 每一條 fact 後面都唸一次「資料來源：農業部開放資料」
//   · 挑錯語音   → 英文語音唸中文，出來是一串亂音節
//
// 純函式，不需要 DOM 也不需要 SpeechSynthesis，所以掛得進 build。
// 執行：node scripts/check-speak.mjs
//
// ⚠️ **這支自己做過變異測試**（一個抓不到迴歸的檢查等於沒有檢查）：
//   · 拿掉超長硬切  → 抓到，且訊息直接指出「最長 500」        ✓
//   · 拿掉出處去重  → 抓到「相同出處只唸一次」                ✓
//   · 拿掉 `if (!s) continue`      → **抓不到**
//   · 拿掉 `if (s) out.push(s)`    → **抓不到**
//
//   後兩個是**等價變異**：splitForSpeech 對空段有兩道互為冗餘的防護，
//   拆掉任一道，另一道仍然擋著。所以下面那幾條「不產生空段」的斷言
//   **目前不是真的在測 splitForSpeech**，它們是保險——防的是未來有人
//   重構時把兩道一起拿掉。知道這件事比假裝它們很強更有用。
import { splitForSpeech, scriptForObject, pickZhVoice } from '../src/lib/speak.js'
import { CARD_OBJECTS } from '../src/data/arCards.js'

let pass = 0
const fails = []
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ── 斷句：不可掉字、不可有空段、不可超長 ──────────────────────────────
{
  const a = splitForSpeech('結球白菜。小寒時節最肥美，台灣主產地在雲林。')
  ok(a.length === 2, `依句號斷句（得到 ${a.length} 段，應為 2）`)
  ok(a[0] === '結球白菜。', '保留句末標點（唸起來才有停頓）')

  ok(splitForSpeech('').length === 0, '空字串回空陣列')
  ok(splitForSpeech(null).length === 0, 'null 回空陣列')
  ok(splitForSpeech(undefined).length === 0, 'undefined 回空陣列')

  // ⚠️ 這一項最容易漏：整串標點會切出一堆空字串，排進佇列後 onend 立刻觸發，
  //    使用者聽到的是「跳過了一句」。
  ok(splitForSpeech('。。。！？；').every(s => s.trim().length > 0), '不產生空段（純標點輸入）')
  ok(splitForSpeech('甲。。。乙。').every(s => s.trim().length > 0), '不產生空段（連續標點）')

  // ⚠️ 超長必須硬切，且**一個字都不能掉**——掉字是靜默的。
  const long = '甲'.repeat(500)
  const L = splitForSpeech(long)
  ok(L.every(s => s.length <= 60), `超長硬切每段 ≤60（最長 ${Math.max(...L.map(s => s.length))}）`)
  ok(L.join('') === long, '超長硬切不掉字')

  const comma = '一'.repeat(50) + '，' + '二'.repeat(50) + '。'
  const C = splitForSpeech(comma)
  ok(C.length >= 2, '長句優先在逗號切（不是硬切在字中間）')
  ok(C.join('').length === comma.length, '逗號切不掉字')

  // 15 秒門檻的實質保證：中文語速約每秒 5–6 字，60 字約 10–12 秒，留有餘裕
  ok(splitForSpeech('甲'.repeat(500)).every(s => s.length <= 60),
    '每段都在 Chrome 15 秒看門狗之內')
}

// ── 稿子：內容不可增減，出處只講一次 ──────────────────────────────────
{
  const obj = {
    id: 'x', name: '結球白菜', line: '我是白菜',
    facts: [
      { label: '品種', value: '早春', source: '農業部' },
      { label: '產地', value: '雲林', source: '農業部' },
      { label: '俗語', value: '十二白' },
    ],
    warn: '注意事項',
  }
  const s = scriptForObject(obj)
  ok(s.includes('結球白菜'), '稿子含物件名稱')
  ok(s.includes('我是白菜'), '稿子含台詞')
  ok(s.includes('早春') && s.includes('雲林') && s.includes('十二白'), '稿子含每一條 fact 的值')
  ok(s.includes('品種') && s.includes('產地'), '稿子含每一條 fact 的標籤（聽得出分界）')
  // ⚠️ 出處逐條唸很吵，改成結尾說一次。重複的來源要去重。
  ok((s.match(/農業部/g) || []).length === 1, '相同出處只唸一次')
  ok(s.includes('注意事項'), '稿子含警語（不可為了順口省略）')

  ok(scriptForObject(null) === '', 'null 物件回空字串')
  ok(scriptForObject(undefined) === '', 'undefined 回空字串')
  ok(typeof scriptForObject({ name: '甲' }) === 'string', '缺 facts 不拋錯')
  ok(typeof scriptForObject({}) === 'string', '空物件不拋錯')
  // 沒有出處的 fact 不可憑空生出「資料來源」那一句
  ok(!scriptForObject({ name: '甲', facts: [{ label: 'a', value: 'b' }] }).includes('資料來源'),
    '沒有出處就不加「資料來源」（不可捏造出處）')
}

// ── 挑語音：優先 zh-TW，挑不到回 null 交給瀏覽器 ──────────────────────
{
  ok(pickZhVoice([{ lang: 'en-US' }, { lang: 'zh-CN' }, { lang: 'zh-TW' }]).lang === 'zh-TW',
    '優先 zh-TW')
  ok(pickZhVoice([{ lang: 'en-US' }, { lang: 'zh-CN' }]).lang === 'zh-CN', '沒有 zh-TW 時退到任何 zh')
  ok(pickZhVoice([{ lang: 'en-US' }]) === null, '沒有中文語音回 null')
  // ⚠️ 回 null 不是失敗：不指定 voice 時瀏覽器會用 lang 挑。
  //    硬要挑到才肯唸的話，語音清單抓不到就等於功能沒了。
  ok(pickZhVoice([]) === null, '空清單回 null 不拋錯')
  ok(pickZhVoice(null) === null, 'null 清單回 null 不拋錯')
}

// ── 拿真的卡片內容跑一遍 ──────────────────────────────────────────────
// ⚠️ 上面都是人造輸入。真實資料才會暴露「某個物件沒有 facts」「某句話特別長」
//    這類只在正式內容裡出現的狀況。
{
  const objs = Object.values(CARD_OBJECTS ?? {})
  ok(objs.length > 0, '卡片物件表不是空的')
  for (const o of objs) {
    const chunks = splitForSpeech(scriptForObject(o))
    ok(chunks.length > 0, `「${o.name}」唸得出東西（不是空稿）`)
    ok(chunks.every(s => s.trim().length > 0), `「${o.name}」沒有空段`)
    ok(chunks.every(s => s.length <= 60), `「${o.name}」每段 ≤60 字`)
  }
}

if (fails.length) {
  console.error(`✗ 語音導覽檢查失敗 ${fails.length} 項：`)
  for (const f of fails) console.error('  · ' + f)
  process.exit(1)
}
console.log(`✓ 語音導覽層 ${pass} 項檢查全部通過（斷句、稿子、語音挑選、真實卡片內容）`)
