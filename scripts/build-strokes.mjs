// 由 Unicode Unihan 資料庫產生 src/data/strokes.js（姓名學用的康熙筆畫表）
//
// 為什麼需要這支腳本：
//   命名吉凶原本的「總筆畫」是 `5 + (字數 * 7) % 24`——根本沒查過筆畫表，
//   於是「一」（1 畫）和「王」（4 畫）都算成 12 畫，「abc」也有 26 畫，
//   連 emoji 都能拿到「大吉 94 分」。這是全站最嚴重的一個假資料。
//
// 康熙筆畫 ≠ 現代筆畫。姓名學一律用康熙筆畫，差別在於**部首要還原成本字**：
//   氵→水(4)、忄→心(4)、扌→手(4)、犭→犬(4)、艹→艸(6)、辶→辵(7)、
//   阝(左)→阜(8)、阝(右)→邑(7)、月(肉)→肉(6)、王→玉(5)、礻→示(5)、衤→衣(6)
//
// Unihan 剛好給了推導所需的兩個欄位：
//   kTotalStrokes —— 現代總筆畫
//   kRSUnicode    —— 「部首.剩餘筆畫」，例如 江 = 85.3（水部，剩 3 畫）
// 於是：康熙筆畫 = 剩餘筆畫 + 該部首的**康熙標準筆畫**
//   江 = 3 + 4 = 7 ✓（現代是 6）
//   泉 = 5 + 4 = 9 ✓（本來就寫全，不變）
//
// ⚠️ 剩餘筆畫為 0 時不可套用——那代表這個字**本身就是部首**，
//    此時算它自己的字形。最典型的是「王」：它的部首是玉，但姓名學的
//    王就是 4 畫不是 5 畫（5 畫是當作偏旁出現在別的字裡時，例如 珍＝玉5＋5）。
//    這一條漏掉的話，全台灣最大的姓氏就會從第一格開始就錯。
//
// 用法：node scripts/build-strokes.mjs
//   （產出檔已進版控，一般開發／部署不需連外網。）
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const SRC = 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip'
const TMP = process.env.TMPDIR || '/tmp'
const txt = `${TMP}/Unihan_IRGSources.txt`
if (!existsSync(txt)) {
  execSync(`curl -sL --max-time 300 -o ${TMP}/Unihan.zip "${SRC}" && cd ${TMP} && unzip -oq Unihan.zip Unihan_IRGSources.txt`,
    { stdio: 'inherit', shell: '/bin/bash' })
}

// 部首編號 → 康熙標準筆畫（只列「簡寫形與本字筆畫不同」的那些；其餘不需調整）
const KANGXI_RADICAL = {
  61: 4,   // 心 —— 忄寫 3
  64: 4,   // 手 —— 扌寫 3
  85: 4,   // 水 —— 氵寫 3
  94: 4,   // 犬 —— 犭寫 3
  96: 5,   // 玉 —— 偏旁作王寫 4
  113: 5,  // 示 —— 礻寫 4
  130: 6,  // 肉 —— 偏旁作月寫 4
  140: 6,  // 艸 —— 艹寫 3（部分字形寫 4）
  145: 6,  // 衣 —— 衤寫 5
  162: 7,  // 辵 —— 辶寫 3（部分字形寫 4）
  163: 7,  // 邑 —— 右阝寫 2
  170: 8,  // 阜 —— 左阝寫 2
}
// 數字國字依「數值」計，這是姓名學的成規，不是筆畫
const NUMERALS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }

const total = new Map(), rs = new Map()
for (const line of readFileSync(txt, 'utf8').split('\n')) {
  if (line[0] === '#' || !line.trim()) continue
  const [cp, field, val] = line.split('\t')
  const code = parseInt(cp.slice(2), 16)
  if (field === 'kTotalStrokes') total.set(code, parseInt(val.split(' ')[0], 10))
  else if (field === 'kRSUnicode') rs.set(code, val.split(' ')[0])
}

// 只收 CJK 基本區 U+4E00–U+9FFF（涵蓋所有常用繁體字）
const LO = 0x4E00, HI = 0x9FFF
let out = '', counted = 0, adjusted = 0
for (let c = LO; c <= HI; c++) {
  let n = total.get(c) ?? 0
  const r = rs.get(c)
  if (n && r) {
    const m = /^(\d+)'?\.(-?\d+)$/.exec(r)
    if (m) {
      const radical = Number(m[1]), residual = Number(m[2])
      const kang = KANGXI_RADICAL[radical]
      // ⚠️ residual > 0 才調整：residual 0 代表這個字本身就是部首（見檔頭「王」的說明）
      if (kang && residual > 0) {
        const written = n - residual          // 該字裡部首實際寫幾畫
        if (written !== kang) { n = residual + kang; adjusted++ }
      }
    }
  }
  const ch = String.fromCharCode(c)
  if (NUMERALS[ch]) n = NUMERALS[ch]
  if (n) counted++
  // 以 base36 單字元編碼（最大 35 畫，足夠涵蓋 U+4E00–9FFF）；0 代表無資料
  out += (n > 35 ? 35 : n).toString(36)
}

const header = `// ⚠️ 這個檔案由 scripts/build-strokes.mjs 自動產生，不要手改——下次重跑會被覆蓋。
// 姓名學用的**康熙筆畫**表，涵蓋 CJK 基本區 U+4E00–U+9FFF 共 ${HI - LO + 1} 字，
// 其中 ${counted} 字有筆畫資料、${adjusted} 字因部首還原而與現代筆畫不同。
// 來源：Unicode Unihan Database（kTotalStrokes + kRSUnicode 推導），推導規則見產生腳本。
//
// 編碼：一個 base36 字元代表一個字的筆畫，索引 = 字碼 - 0x4E00；'0' 代表查無資料。
const PACKED = '${out}'
const LO = 0x${LO.toString(16).toUpperCase()}, HI = 0x${HI.toString(16).toUpperCase()}

// 取單一漢字的康熙筆畫；非中文字或查無資料回傳 null（**不可回傳 0 或猜測值**）
export function strokesOf(ch) {
  const c = ch.codePointAt(0)
  if (c < LO || c > HI) return null
  const n = parseInt(PACKED[c - LO], 36)
  return n > 0 ? n : null
}
`
writeFileSync(new URL('../src/data/strokes.js', import.meta.url), header, 'utf8')
console.log(`strokes.js 已產生：${counted} 字有資料，${adjusted} 字套用康熙部首還原`)
