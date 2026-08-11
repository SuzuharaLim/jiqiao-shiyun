import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================================
// ★★★ 放寬 MindAR 的比對門檻（建置期字串替換）
//
// 使用者的 Samsung Xclipse 540（ANGLE on Vulkan）實測：特徵點抓得到 185~231 個、
// 比對迴圈 18 輪/秒完全健康，但**比對成功 0 次**，而且連「網站內建的卡面圖」
// 走同一條管線也認不出來 ⇒ 與卡片、鏡頭、距離、光線全部無關，是這台裝置算出來的
// 特徵描述子與編譯進 `.mind` 的那份對不起來（GPU 精度／驅動差異）。
//
// 上游的判定門檻寫死在 `matching/matching.js`（跑在 worker 裡）：
//   HAMMING_THRESHOLD = 0.7   Lowe 比值檢定，**越大越寬鬆**
//   MIN_NUM_INLIERS   = 6     最少內點數，**越小越寬鬆**
//   INLIER_THRESHOLD  = 3     重投影誤差容忍（px），**越大越寬鬆**
//
// ⚠️ 我先前在 CLAUDE.md 寫過「MindAR 是 inlier 式判定，比對本身沒有分數可調」
//    ——**那句話是錯的**，這三個常數就是可調的門檻。已更正。
//
// 為什麼用建置期替換而不是把 matching.js 抄進專案：抄上游檔案正是 AR 這一層重寫時
// 特意擺脫的東西（要人工追蹤上游更新、每次都要比對改過哪幾行）。替換只碰三個
// 字面值，升級 mind-ar 時若上游改了寫法，**下面的斷言會讓建置直接失敗**，
// 而不是靜默地不生效——後者才是真正危險的（門檻沒放寬卻以為放寬了）。
//
// ⚠️ 放寬會提高誤判機率，所以 `src/ar/tracker.js` 的 `MATCH_CONFIRM = 2`
//    （要連續比對成功兩次才宣告認出）是配套，不可一起拿掉。
// ============================================================================
//
// ★★★ 只放寬 **Lowe 比值檢定** 這一個，另外兩個保持原值。實測出來的：
//
//   0.8 ＋ 內點 4 ＋ 重投影 5px → **誤判**：完全不是卡片的畫面（隨機色塊＋
//                                 文字狀橫條）也命中並跳轉。比掃不到更糟。
//
//   病灶是 `MIN_NUM_INLIERS = 4`：4 點正好是解出單應性矩陣的**最低數量**，
//   等於「任意四點碰巧對得上就算命中」，必然誤判。這個值絕不可低於 6。
//   `INLIER_THRESHOLD`（重投影誤差）放寬也只會讓更多雜點被算成內點，同樣危險。
//
// 而對「描述子有雜訊」的裝置真正對症的是比值檢定：描述子一髒，最佳與次佳的
// Hamming 距離會變接近，`best/second < 0.7` 就過不了關 ⇒ 候選配對變少 ⇒
// 內點不足。把它放寬到 0.75 讓略髒的描述子仍有機會進入 RANSAC，
// 而 RANSAC 與內點數門檻**原封不動**，誤判該擋的還是擋得住。
const MATCH_TUNING = [
  // [原字面值, 放寬後, 說明]
  ['const HAMMING_THRESHOLD = 0.7', 'const HAMMING_THRESHOLD = 0.75', 'Lowe 比值 0.7→0.75'],
]

// ⚠️ `matching.js` 只被 **worker** 用到（controller.worker.js → matcher.js →
//    matching.js），而 Vite 把 worker 當成**另一個獨立的 rollup 建置**。
//    所以這個外掛必須同時掛在 `plugins` 與 `worker.plugins`，而且「有沒有真的
//    套用到」的驗收不能寫在主建置的 buildEnd（那時 matching.js 根本不在主建置裡，
//    第一版就是這樣直接把建置擋掉的）。用模組層級的集合跨建置累計，
//    最後在主建置的 closeBundle 驗收。
const tuningApplied = new Set()

function relaxMindarMatching() {
  return {
    name: 'jq-relax-mindar-matching',
    enforce: 'pre',
    transform(code, id) {
      const path = id.split('\\').join('/')
      if (!path.includes('mind-ar') || !path.includes('matching/matching.js')) return null
      let out = code
      for (const [from, to, label] of MATCH_TUNING) {
        if (!out.includes(from)) {
          // ★ 靜默失效是這裡唯一真正危險的結果——寧可讓建置失敗
          throw new Error(
            `[jq-relax-mindar-matching] 在 ${id} 找不到「${from}」。`
            + ' mind-ar 可能改了寫法。請重新確認 matching/matching.js 的門檻常數，'
            + ' 不要讓它靜默地不生效（那會讓「已放寬門檻」變成假的）。')
        }
        out = out.replace(from, to)
        tuningApplied.add(label)
      }
      return { code: out, map: null }
    },
  }
}

/** 主建置結束時驗收：worker 建置會先跑完，所以這時一定看得到結果。 */
function assertMatchingTuned() {
  return {
    name: 'jq-assert-matching-tuned',
    closeBundle() {
      if (tuningApplied.size !== MATCH_TUNING.length) {
        throw new Error(
          '[jq-relax-mindar-matching] 沒有套用到 matching.js —— '
          + `預期 ${MATCH_TUNING.length} 項，實際 ${tuningApplied.size} 項。`
          + ' 若 mind-ar 的比對已不再經過該檔案，請一併更新這個外掛與 CLAUDE.md。')
      }
      console.log('  ✓ MindAR 比對門檻已放寬：' + [...tuningApplied].join('、'))
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), relaxMindarMatching(), assertMatchingTuned()],
  base: '/',   // 絕對路徑：深層網址（/AR、/post/p1…）也能正確載入 assets
  // ⚠️ worker 是獨立的 rollup 建置，主 plugins 不會自動套用到它
  worker: { plugins: () => [relaxMindarMatching()] },
  build: {
    rollupOptions: {
      output: {
        // 分離 react vendor：框架與應用碼分開快取（改版時使用者只需重載應用碼）
        manualChunks: { react: ['react', 'react-dom'] },
      },
    },
  },
  server: {
    // 開發時把 /api 轉給 Node 認證後端（同源 → Cookie 可正常運作）
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
