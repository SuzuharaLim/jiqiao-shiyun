// 產生 VAPID 金鑰對：npm run push:keys
// 產生後把兩個值設成環境變數（正式環境請放 Secret Manager，勿進 git）。
import { generateKeys } from './push.js'

const k = generateKeys()
console.log('')
console.log('VAPID 金鑰已產生。請設為環境變數：')
console.log('')
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${k.privateKey}`)
console.log('')
console.log('⚠️ 私鑰等同推播的簽章權限，只能放 Secret Manager／環境變數，切勿提交進 git。')
console.log('   Cloud Run 設定範例（用 --update-* 不要用 --set-*）：')
console.log('   gcloud run services update jiqiao --update-secrets VAPID_PRIVATE_KEY=vapid-private:latest')
console.log('')
