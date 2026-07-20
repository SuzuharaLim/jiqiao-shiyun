// 把某個「已註冊的真實帳號」升級成管理者，並可停用預設的 admin@jiqiao.local。
//
//   npm run make:admin -- you@gmail.com                    # 升級為管理者
//   npm run make:admin -- you@gmail.com --disable-default  # 同時把預設 admin 降為一般使用者
//
// 正式站（透過 Cloud SQL Proxy）：
//   DATABASE_URL="postgresql://..." npm run make:admin -- you@gmail.com --disable-default
//
// 為什麼需要這支：預設管理者 admin@jiqiao.local 的網域是假的，收不到驗證信，
// 也無法用「忘記密碼」重設，而其預設密碼又寫在文件裡。改用你自己的真實信箱最安全。
import db from './db.js'

const args = process.argv.slice(2)
const email = (args.find(a => !a.startsWith('--')) || '').toLowerCase().trim()
const disableDefault = args.includes('--disable-default')

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('\n用法：npm run make:admin -- you@gmail.com [--disable-default]')
  console.error('（該 Email 必須已經在網站註冊過）')
  process.exit(1)
}

const u = await db.get('SELECT id,email,name,handle,role,email_verified_at FROM users WHERE email=?', [email])
if (!u) {
  console.error(`\n❌ 找不到帳號：${email}`)
  console.error('   請先到網站用這個信箱註冊，再執行本指令。')
  process.exit(1)
}

if (u.role === 'admin') {
  console.log(`\n✓ ${email} 已經是管理者了（@${u.handle}）`)
} else {
  await db.run('UPDATE users SET role=?, updated_at=? WHERE id=?', ['admin', new Date().toISOString(), u.id])
  console.log(`\n✅ 已將 ${email}（@${u.handle}）從 ${u.role} 升級為管理者`)
}
if (!u.email_verified_at) {
  console.log('   ⚠️ 此帳號的 Email 尚未驗證——建議登入後點驗證信完成驗證。')
}

if (disableDefault) {
  const d = await db.get("SELECT id,role FROM users WHERE email='admin@jiqiao.local'")
  if (!d) {
    console.log('   （找不到預設 admin@jiqiao.local，可能已移除）')
  } else if (d.id === u.id) {
    console.log('   （你指定的就是預設帳號，略過降級）')
  } else {
    // 降級而非刪除：保留其歷史關聯，且隨時可再升回來
    await db.run('UPDATE users SET role=?, updated_at=? WHERE id=?', ['user', new Date().toISOString(), d.id])
    // 一併作廢它現有的登入 session，避免有人正拿著舊 session 操作
    await db.run('DELETE FROM sessions WHERE user_id=?', [d.id])
    console.log('   ✅ 預設 admin@jiqiao.local 已降為一般使用者，其登入 session 已全部作廢')
  }
}

const admins = await db.all("SELECT email,handle FROM users WHERE role='admin' ORDER BY email")
console.log('\n目前的管理者：')
for (const a of admins) console.log(`   ${a.email}（@${a.handle}）`)
console.log('')
process.exit(0)
