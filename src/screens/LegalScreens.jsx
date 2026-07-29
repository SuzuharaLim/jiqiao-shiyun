import { TopBar, SectionHead } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useNav } from '../store/nav.jsx'

// 法務與聯絡頁（上架合規：隱私權政策 / 服務條款 / 聯絡我們——取代原本的 toast 佔位）
// 文案為示範版本，正式上線前應由法務確認；聯絡資訊待業主提供後替換。

// Privacy / Terms 也會被登入頁以「覆蓋層」方式直接渲染（未登入時 App 只渲染 <Auth/>，
// 無法 push 畫面）。TopBar 的 onBack 可為 bare flag（true → 預設 pop）或函式；
// 故傳 `onClose || true`：有給關閉函式就用它，沒給就維持原本的返回行為。
const P = ({ children }) => <p className="article" style={{ padding: '4px 16px' }}>{children}</p>

export function Privacy({ onClose }) {
  return (
    <>
      <TopBar title="隱私權政策" onBack={onClose || true} />
      <div className="body">
        <SectionHead title="我們如何蒐集與使用資料" />
        <P>「機巧時運」（下稱本服務）重視你的隱私。本政策說明我們蒐集哪些資料、如何使用與你的權利。示範版本，正式上線前將由法務審閱。</P>
        <SectionHead title="蒐集項目" />
        <P>・帳號資料：Email、暱稱、密碼（以 bcrypt 雜湊儲存，永不明文）。<br />
          ・使用紀錄：登入時間、IP、裝置資訊（安全稽核用，保存於稽核日誌）。<br />
          ・你主動建立的內容：貼文、作品、月曆專案、訂單紀錄。<br />
          ・<b>相機影像：掃描明信片的辨識完全在你的裝置上運算，影像與辨識特徵不會上傳到伺服器。</b></P>
        <SectionHead title="使用方式" />
        <P>資料僅用於提供服務（登入、訂單、社群互動）、安全防護（異常登入偵測）與法定義務。我們不出售你的個人資料，也不會在未經同意下用於行銷。</P>
        <SectionHead title="Cookie 與追蹤" />
        <P>本服務僅使用必要的登入 Session Cookie（HttpOnly，無法被網頁腳本讀取），目前不使用任何第三方追蹤或廣告 Cookie。若未來導入分析工具，將先徵得你的同意。</P>
        <SectionHead title="你的權利（GDPR / 個資法）" />
        <P>你可以隨時於「設定 → 帳號安全」：<br />
          ・<b>匯出</b>我們持有的你的資料（資料可攜權）。<br />
          ・<b>刪除帳號</b>（被遺忘權）——刪除後帳號資料與登入 Session 立即銷毀，無法復原。</P>
        <SectionHead title="資料保存與安全" />
        <P>密碼以 bcrypt（cost 12）雜湊；Session 存於伺服器端並以 HttpOnly、SameSite=Strict Cookie 傳遞；全站 HTTPS。帳號刪除後個人資料即時移除。</P>
        <P>最後更新：2026 年 7 月。若有疑問請透過「聯絡我們」與我們聯繫。</P>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function Terms({ onClose }) {
  return (
    <>
      <TopBar title="服務條款" onBack={onClose || true} />
      <div className="body">
        <SectionHead title="服務內容" />
        <P>「機巧時運」提供互動農民曆、節氣攝影社群、月曆創作市集與 AI 時光顧問等服務。目前為展示原型：金流、AI 對話與部分內容為模擬，正式功能以上線公告為準。</P>
        <SectionHead title="帳號與使用規範" />
        <P>・你須年滿 13 歲方可註冊；未滿 18 歲請先取得法定代理人（家長／監護人）同意後使用。<br />
          ・你須妥善保管帳號密碼，帳號活動視為本人行為。<br />
          ・禁止上傳侵權、違法或不當內容；違者得移除內容或停權。<br />
          ・發現違規內容可於貼文／作品頁點「檢舉」，將由管理團隊審核處理。<br />
          ・禁止以自動化程式惡意存取本服務（我們設有速率限制與防護）。</P>
        <SectionHead title="創作者內容與授權" />
        <P>你上傳的攝影作品著作權仍歸你所有。將作品上架市集即表示你授權買家於「個人非商用」範圍內使用；平台就成交金額抽成 30%、創作者分潤 70%（示範值，正式費率以公告為準）。</P>
        <SectionHead title="占卜與文化內容之免責" />
        <P>本服務之干支、宜忌、運勢、解夢等內容結合傳統民俗文化與演算生成，<b>僅供參考娛樂，不構成醫療、法律、財務、婚姻或投資等專業建議</b>。</P>
        <SectionHead title="服務變更與終止" />
        <P>我們得於必要時調整或中止部分服務；重大變更將提前公告。你可隨時刪除帳號終止使用。</P>
        <P>最後更新：2026 年 7 月。本條款為示範版本，正式上線前將由法務審閱。</P>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function Contact() {
  const { push } = useNav()
  return (
    <>
      <TopBar title="聯絡我們" onBack />
      <div className="body">
        <SectionHead title="服務資訊" />
        <div className="kv" style={{ padding: '12px 16px' }}><span>服務名稱</span><b>機巧時運</b></div>
        <div className="kv" style={{ padding: '12px 16px' }}><span>營運團隊</span><span className="muted">承氣有限公司</span></div>
        <div className="kv" style={{ padding: '12px 16px' }}><span>所在地</span><span className="muted">彰化縣大村鄉（大葉大學）</span></div>
        <SectionHead title="聯絡方式" />
        {/* ⚠️ 這裡原本只放 hello@jiqiao.example —— 一個**不存在的網域**。
            客服是使用者最後一道防線，指向死信箱等於整條逃生路是斷的
            （AI 答不出來 → 叫你找客服 → 客服信箱寄不到）。
            站內表單是真的會寫進 support_messages 並通知我們的，扶正為主要路徑；
            公開信箱等實際申請好再放上來，不要先掛一個假的。 */}
        <button className="tool tap" onClick={() => push('dms')}>
          <div className="ti ti-line"><Icon name="mail" /></div>
          <div className="tn2"><b>傳訊息給我們</b><span>站內表單，會由專人回覆</span></div>
          <Icon name="chev" style={{ width: 18, stroke: 'var(--muted)' }} />
        </button>
        <div className="kv" style={{ padding: '12px 16px' }}><span>服務時間</span><span className="muted">週一至週五 09:00–17:00（國定假日除外）</span></div>
        <P>＊公開客服信箱與公司登記資訊將於正式上線前公告並更新本頁。在那之前，用上面的站內表單聯絡我們最快。</P>
        <SectionHead title="快速協助" />
        <P>・帳號問題（忘記密碼）：登入頁「忘記密碼」可自助重設。<br />
          ・訂單問題：「我的 → 我的訂單」查看狀態。<br />
          ・資料權利（匯出／刪除帳號）：「設定 → 帳號安全」。</P>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
