// 清除示範（Demo）資料 —— 只刪 is_seed=1 的示範作者及其連帶內容，真人帳號與上傳完全不動。
//
//   npm run purge:demo            # 本機 SQLite
//   DATABASE_URL="..." npm run purge:demo    # 正式站（透過 Cloud SQL Proxy）
//
// 刪除範圍：
//   * users where is_seed=1  → 其 posts / works / comments / post_likes / follows 由 FK CASCADE 連帶清除
//   * 種子產生的示範通知（id 為 n1..n5 這種短 id；真實通知是 36 碼 UUID）
// 不會動到：真人帳號與其內容、ref_items（濾鏡/諺語/宜忌解釋等參考清單）、訂單。
import db from './db.js'

const n = (row) => Number(row?.c ?? 0)

const count = async (sql, params = []) => n(await db.get(sql, params))

const before = {
  seedUsers: await count('SELECT COUNT(*) AS c FROM users WHERE is_seed=1'),
  posts: await count('SELECT COUNT(*) AS c FROM posts'),
  works: await count('SELECT COUNT(*) AS c FROM works'),
  realUsers: await count('SELECT COUNT(*) AS c FROM users WHERE is_seed=0'),
  notis: await count('SELECT COUNT(*) AS c FROM notifications'),
}

console.log(`\n[purge] 資料庫：${db.kind}`)
console.log('── 清除前 ──────────────────────────')
console.log(`  示範作者   ${before.seedUsers}`)
console.log(`  真人帳號   ${before.realUsers}（不會被動到）`)
console.log(`  貼文/作品  ${before.posts} / ${before.works}`)
console.log(`  通知       ${before.notis}`)

if (before.seedUsers === 0) {
  console.log('\n✓ 已經沒有示範作者了，無需清除。')
  process.exit(0)
}

const r = await db.run('DELETE FROM users WHERE is_seed=1')
// 示範通知：種子用短 id（n1、n2…），真實通知是 36 碼 UUID
const rn = await db.run('DELETE FROM notifications WHERE length(id) < 10')

const after = {
  posts: await count('SELECT COUNT(*) AS c FROM posts'),
  works: await count('SELECT COUNT(*) AS c FROM works'),
  realUsers: await count('SELECT COUNT(*) AS c FROM users WHERE is_seed=0'),
  notis: await count('SELECT COUNT(*) AS c FROM notifications'),
  refItems: await count('SELECT COUNT(*) AS c FROM ref_items'),
}

console.log('── 清除後 ──────────────────────────')
console.log(`  已刪示範作者 ${r.changes} 位、示範通知 ${rn.changes} 則`)
console.log(`  貼文/作品    ${after.posts} / ${after.works}（剩下的都是真人上傳）`)
console.log(`  真人帳號     ${after.realUsers} ${after.realUsers === before.realUsers ? '✓ 未受影響' : '⚠ 數量有變，請檢查'}`)
console.log(`  參考清單     ${after.refItems} 筆 ✓ 保留（濾鏡/諺語/宜忌解釋）`)
console.log('\n✅ 完成。')
process.exit(0)
