// MindAR 接線層的回歸測試
//
// ⚠️ 這一層**不能在 Node 裡跑真的偵測**（mind-ar 的 Controller 要 WebGL 與 video），
//    所以這裡驗的是「純數學」與「不可退回的決策」。真偵測的驗證見檔尾的說明。
import fs from 'node:fs'
import { OFFICIAL_CARDS, objectForHotspot } from '../src/data/arCards.js'

let pass = 0
const fails = []
const ok = (c, l) => { if (c) pass++; else fails.push(l) }

const src = fs.readFileSync(new URL('../src/lib/mindTrack.js', import.meta.url), 'utf8')
// ⚠️ 「某個舊寫法不可出現」的檢查要先剝註解——說明它為什麼不行的註解本身就含那段程式。
//    這個專案已經踩過三次（check-ar 兩次、check-char 一次）。
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ── ★★ 1. 不可再做 y 翻轉 ──
//
// 一般 clip space 的 y 向上、畫面座標向下，所以直覺會寫 `1 - (ndcY*0.5+0.5)`。
// **實測是錯的**：MindAR 的 worldMatrix 已經是 y 向下。
// 用 640×480 的合成畫面（卡片畫在 x 90..550、y 72..408）手動驅動單幀量到：
//    有 y 翻轉：四角 (93,406)(552,407)(551,71)(89,72) → 最大誤差 337px
//               x 對得很準（93 vs 90、552 vs 550），只有 y 整個鏡像
//               而且**四角的順序也跟著顛倒**（got[0] 對到 truth[3]）
//    去掉翻轉：480 − 406 = 74，與真值 72 一致
// ⚠️ 這個錯誤的症狀特別惡毒：模型不會消失、大小也對，只是上下顛倒＋角序反了。
//    正對著卡片、又是接近對稱的版面時，肉眼很可能看不出來。
ok(!/1 - \(ndcY/.test(code), '★★ 不可對 ndcY 做翻轉（MindAR 的 worldMatrix 已是 y 向下，實測誤差 337px）')
ok(/\(ndcY \* 0\.5 \+ 0\.5\) \* vh/.test(code), 'y 直接線性映射到畫面座標')
ok(/\(ndcX \* 0\.5 \+ 0\.5\) \* vw/.test(code), 'x 直接線性映射到畫面座標')

// ── 2. 在相機背後的角要整組作廢 ──
// ⚠️ w <= 0 時投影會產生鏡像的鬼影（座標算得出來但完全錯位）。
ok(/if \(!\(clip\[3\] > 1e-6\)\) return null/.test(code), '★ w<=0（在相機背後）時整組作廢')

// ── 3. 輸出必須與舊路線同形 ──
// ⚠️ 下游（arHotspot 的 screenToCard/hitTest、ARScene 的 matrix3d、
//    ARCharacter 的 pose）吃的都是 H，不是 worldMatrix。少了這層轉換就得把
//    三個下游模組全部改成 MindAR 專用，之後要換回去也回不去。
for (const k of ['corners', 'H', 'matrix3d', 'pose', 'via']) {
  ok(new RegExp(`\\b${k}[,:]`).test(code), `輸出要有 ${k}（與自研路線同形）`)
}
ok(/homography\(UNIT_SQUARE, corners\)/.test(code), '★★ 要由四角回推 H（下游吃的是 H）')
ok(/aspect: mw \/ mh/.test(code),
  '★ pose 要餵真實 aspect（poseFromHomography 假設單位正方形，不給會讓角色落在卡片外）')
// ⚠️ MindAR 沒有「相似度分數」——它是 inlier 式判定。硬編一個假分數會讓診斷面板
//    顯示一個沒有意義的數字，比留空更糟。
ok(/score: null/.test(code), '★ 不可硬編假的相似度分數（MindAR 沒有這個概念）')

// ── 4. 生命週期 ──
// ⚠️ Controller 持有 WebGL context 與 TFJS tensor。行動裝置的 context 上限常見
//    8~16，反覆進出這一頁不釋放的症狀是「第 N 次打開變成空白」而前面幾次都正常。
ok(/dispose\(\)/.test(code), '★ 要有 dispose（Controller 持有 WebGL context 與 TFJS tensor）')
ok(/dummyRun/.test(code), '★ 要 dummyRun 暖機（少了它第一次偵測會卡住幾百毫秒）')

// ── 5. 卡片資料 ──
const card = OFFICIAL_CARDS[0]
ok(!!card.mindTarget, 'arCards 要有 mindTarget')
ok(/\.mind$/.test(card.mindTarget || ''), 'mindTarget 副檔名要是 .mind')
const mindPath = new URL(`../public${card.mindTarget}`, import.meta.url)
ok(fs.existsSync(mindPath), `★★ ${card.mindTarget} 必須真的存在（缺檔時 MindAR 會靜默退回自研版）`)
if (fs.existsSync(mindPath)) {
  const kb = fs.statSync(mindPath).size / 1024
  // ⚠️ .mind 太小代表編譯失敗或用了紋理不足的圖。實測這張是 773 KB。
  ok(kb > 100, `.mind 大小合理（${kb.toFixed(0)} KB，過小代表編譯失敗或圖沒有紋理）`)
}

// ── 6. Scan.jsx 的接線 ──
const scan = fs.readFileSync(new URL('../src/screens/Scan.jsx', import.meta.url), 'utf8')
const scanCode = scan.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
// ⚠️ 動態 import：mind-ar 帶 TFJS，controller chunk 約 1.7 MB。
//    靜態 import 會讓它進主 bundle——首頁不該為了要開相機才用到的功能多背 1.7 MB。
ok(/await import\('\.\.\/lib\/mindTrack\.js'\)/.test(scanCode),
  '★★ mindTrack 必須動態 import（靜態會把 1.7 MB 的 TFJS 打進主 bundle）')
// ⚠️ 兩條路不可同時跑：自研版每幀 grabFrame+getImageData+四角偵測是最貴的部分，
//    MindAR 已經在處理 video，再跑一次等於白花一倍 CPU（手機直接掉幀）。
ok(/if \(mind\) \{/.test(scanCode), '★★ MindAR 就緒時要 early-return，不可兩條路都跑')
ok(/mindRef\.current = null/.test(scanCode), '★ 卸載時要清掉 tracker 參考')
// ⚠️ 熱區換算要用與 corners 同一組尺寸。自研版是取樣畫面、MindAR 是顯示框，
//    傳錯會讓熱區整體偏移——而畫面上看起來只是「點不太準」。
ok(/applyHotspot\(res, vw, vh\)/.test(scanCode), '★ MindAR 路徑的熱區要用顯示框尺寸換算')
ok(/applyHotspot\(res, frame\.w, frame\.h\)/.test(scanCode), '★ 自研路徑的熱區要用取樣畫面尺寸換算')
// 失敗要看得見
ok(/console\.error\('\[AR\] MindAR 載入失敗/.test(scan),
  '★ MindAR 載入失敗要留下錯誤紀錄（靜默退回會讓人完全查不到原因）')

// ── ★★ 6b. 3D 角色不可綁「目前選中的熱區」 ──
//
// 使用者最自然的動作是把整張卡擺在畫面正中央 → 畫面中心對到卡面 (0.5, 0.5)。
// 下面用真的熱區資料算一次：那個點落在哪個熱區、那一區有沒有模型。
// 實測 2027 小寒卡：落在「身體保健」，而那一區**沒有** model
// → 3D 若綁選中的熱區，白菜就永遠不會出現（而卡面上印著「掃描主物件：結球白菜」）。
{
  const card = OFFICIAL_CARDS[0]
  const inRect = (r, u, v) => u >= r.x && u <= r.x + r.w && v >= r.y && v <= r.y + r.h
  const atCentre = card.hotspots.find(h => inRect(h.rect, 0.5, 0.5)) || null
  const centreObj = atCentre ? objectForHotspot(atCentre) : null
  const primary = card.hotspots.find(h => h.primary) || null

  ok(!!primary, '卡片要有 primary 熱區（3D 的退路）')
  ok(!!objectForHotspot(primary)?.model,
    '★ primary 熱區的物件必須有 model，否則那個退路沒有意義')
  // 這一項不是要求，而是把「為什麼需要退路」的事實釘住：
  // 若哪天版面改成中心就是主物件，這項會失敗，提醒回來重新評估上面的邏輯。
  ok(atCentre && !centreObj?.model,
    `★ 記錄事實：畫面中心 (0.5,0.5) 落在「${atCentre?.label ?? '無'}」且該區沒有 model` +
    '——這正是 3D 不可綁選中熱區的理由')
  ok(/h => h\.primary/.test(scanCode) && /anchorUV=\{\[spot\.rect/.test(scanCode),
    '★★ 選中的熱區沒有 model 時，3D 要退回卡片主物件並錨在主物件的熱區上')
}

// ⚠️ MindAR 是 inlier 式判定、沒有「相似度」，score 恆為 null。
//    照舊寫死 `相似度 {track.score}%` 會顯示「相似度 %」——空的數字比不顯示更像壞掉。
ok(/track\.score != null/.test(scanCode),
  '★ 顯示相似度前要判斷 score 不是 null（MindAR 沒有這個數字）')

// ── 7. 已移除的功能不可回來 ──
ok(!/bindLocalTarget/.test(scanCode), '「指定本機圖片當目標」已移除，不可回來')
// ⚠️ 這裡要用**剝過註解**的 scanCode。我第一版寫成 `scan`（原始檔），結果抓到
//    自己解釋「為什麼移除」的那段註解——這個專案第四次踩同一個坑
//    （check-ar 兩次、check-char 一次、這裡一次），而我就在這支檔案的開頭
//    才剛寫下「要先剝註解」。所以規則是：**只要是「某段文字不可出現」的檢查，
//    一律用剝過註解的版本**，沒有例外。
ok(!/指定本機圖片/.test(scanCode), '相關文案也要清掉（畫面上的字，不含解釋移除原因的註解）')

if (fails.length) {
  console.error(`\n✗ MindAR 層檢查失敗 ${fails.length} 項：`)
  for (const f of fails) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`✓ MindAR 層 ${pass} 項檢查全部通過（四角投影約定、輸出同形、生命週期、接線、.mind 存在）

⚠️ 這一層**沒有**在 CI 裡跑真的偵測（Controller 要 WebGL 與 video）。
   真偵測已在瀏覽器手動驗過（1280×960 合成畫面、卡片佔 55%）：
     · 收邊版目標圖 12/12、未收邊原稿也 12/12（MindAR 的特徵點對多一圈外框不敏感）
     · ★ 四角回推**已用產品程式碼 cornersFromWorldMatrix 對過真值：最大誤差 1.6px**
       （有 y 翻轉時是 337px）——「y 不翻轉」現在是**實測確認**，不再是算術推導。
   ⚠️ 仍未驗：真實相機下的追蹤穩定度、手機實際幀率、4G 下 1.7MB 的等待時間。`)
