import { TopBar, SectionHead, Breadcrumb, Link } from '../components/ui.jsx'
import { GLOSSARY } from '../data/glossary.js'

// ---------- 編輯政策 /editorial ----------
// ⚠️ 命理內容屬 Google 的 YMYL 範疇（可能影響人生決策），審查標準比一般網站嚴，
//    而 AI 生成內容的疑慮讓門檻更高。把「資料哪裡來、誰做的、AI 扮演什麼角色」
//    講清楚，不只是 SEO 加分，也是這個產品該有的誠實。
export function Editorial() {
  return (
    <>
      <TopBar title="編輯政策｜資料來源與校對流程" onBack />
      <div className="body">
        <Breadcrumb items={[{ label: '首頁', tab: 0 }, { label: '編輯政策' }]} />
        <p className="au-lead">
          機巧時運的內容分成三層，可信度與產生方式各不相同。這一頁說明每一層的來源、
          校對方式，以及 AI 在其中扮演什麼角色。
        </p>

        <SectionHead title="第一層：天文演算" extra="確定性、可驗證" />
        <div className="card">
          <p>
            農曆月日、二十四節氣交節時刻、年月日干支、納音。以 Meeus 演算法計算朔望月
            與太陽視黃經，UTC+8 為日界，零第三方相依。
          </p>
          <p>
            這一層<b>不是估算值</b>，可與中央氣象署的天文資料交叉驗證。已驗證項目包含
            2020–2030 年的春節日期、2025 閏六月、節氣交節日期，以及連續 400 天的干支連續性。
          </p>
        </div>

        <SectionHead title="第二層：傳統擇日" extra="規則明確，屬民俗" />
        <div className="card">
          <p>
            建除十二神、二十八星宿、黃道黑道十二神、宜忌、沖煞、胎神、彭祖百忌、
            吉神方位、犯太歲。規則有典據且可逐步推導，但<b>不同通書流派的判定可能相異</b>。
          </p>
          <p>
            凡有流派差異之處，本站一律在頁面標明採用的版本。例如財神方位採台灣通書
            通行版（丙丁西南），另有一派由「財＝我剋者」推得正西——兩說並存，我們不假裝
            只有一種答案。
          </p>
          <p>
            這一層另有一條內部規則：<b>宜忌欄必須與神煞對帳</b>。受死日的說明若寫著
            「惟入殮、安葬、畋獵可用」，宜欄就不能出現祭祀或交易。同一頁的兩段文字
            互相打架，是這類網站最常見也最不該有的錯誤。
          </p>
        </div>

        <SectionHead title="第三層：原典引用" extra="逐字引用，不確定就留空" />
        <div className="card">
          <p>
            《月令七十二候集解》的七十二候候名、《周公解夢》的斷語，皆為逐字引用。
          </p>
          <p>
            本站的規矩是：<b>沒有原典就不掛書名號</b>。查不到原典的條目只提供「現代參考」，
            並明確標示那不是古籍內容。<b>絕不自撰詩句冒充原文</b>——秤骨頁未收錄的
            《稱骨歌》批語、解夢查無資料的關鍵字，都是誠實說沒有，而不是生一段像古文的話。
          </p>
        </div>

        <SectionHead title="AI 在這裡做什麼" />
        <div className="card">
          <p>
            AI 只負責兩件事：把上述資料<b>翻譯成白話</b>，以及在守備範圍內回答使用者提問。
          </p>
          <p>
            <b>曆算與原典整理不經過 AI 生成</b>——數字來自演算法、引文來自古籍。
            AI 顧問的曆訊由伺服器端直接計算後提供，不採用前端傳來的字串（那是可竄改的輸入）。
            未接金鑰時，回覆會顯示「示範」徽章，不會偽裝成真實回覆。
          </p>
          <p>
            純確定性演算的頁面（生肖運勢、解夢、命名吉凶）已把免責文案中的「AI 生成」
            字樣移除——那些頁面沒有 AI 參與，寫上去就是不實陳述。
          </p>
        </div>

        <SectionHead title="已知的限制" />
        <div className="card">
          <p>
            <b>1929 年以前的日期可能差一日。</b>當時中國曆法以北京地方平時
            （UTC+7:45:40）定日界，1929 年後才改用 UTC+8。本站一律採現行 UTC+8 換算，
            因此該時期的農曆日期與當時的官曆可能相差一天（例如 1916-03-03，
            本站算正月廿九、歷史曆書為正月三十）。對現代使用影響極小，但仍如實說明。
          </p>
          <p>
            <b>《黃帝地母經》目前只收錄當年一則。</b>六十年份的全文尚未整理完，
            未收錄的年份不會顯示，而不是拿別年的內容頂替——地母經的卜曰首句會點出
            該年生肖，放錯年份是這類資料最常見的錯誤，我們加了自動校驗擋住它。
          </p>
          <p>
            <b>吉神宜趨／凶神宜忌尚未收錄。</b>歲德、六合、鳴吠、往亡、血支、天吏等
            神煞尚未整理，目前只有建除、二十八宿、黃道十二神與幾個常見的特殊日。
          </p>
        </div>

        <SectionHead title="校對與更新" />
        <div className="card">
          <p>
            曆算層有回歸測試（<code>scripts/check-almanac.mjs</code>）：任何改動都要通過
            六十干支納音、六十日胎神方位的快照比對，以及連續 400 天的一致性檢查
            （宜忌與神煞零矛盾、星等與評等一致、沖煞干支序數差恆為 6）。
          </p>
          <p>
            這些測試是有來由的：2026 年 7 月的一次外部資料稽核發現，納音表只有 12 筆
            （應為 30 筆）且索引公式與納音的定義無關，六十干支裡有 58 個是錯的——
            而 2026 年剛好是丙午，是碰巧算對的兩個之一，所以整年看起來都正常。
            靜態查表沒有演算法保護，寫壞了不會有任何錯誤訊息，只能靠測試擋。
          </p>
          <p>
            外部開放資料（農業部農糧署的當令農產）由建置腳本產生，不手動修改，
            重跑即取得最新版本。
          </p>
          <p>
            發現錯誤歡迎回報，我們會更正並在此說明。
            <Link screen="contact" className="td-more">回報內容錯誤 ›</Link>
          </p>
        </div>

        {/* Preferred sources：Google 2026 推出，使用者可自己指定偏好來源，
            被指定的網站更容易出現在 Top Stories，且 2026-05-27 起擴展到
            AI Overviews 與 AI Mode。農民曆是每日回訪型產品——有一批天天會打開
            的使用者，這在新聞媒體以外極少見，設定意願遠高於一般內容站。 */}
        <SectionHead title="把機巧時運設為偏好來源" extra="Google" />
        <div className="card">
          <p>
            如果你每天都會來看曆頁，可以在 Google 把「機巧時運」設為偏好來源——
            之後在 Google 搜尋相關內容時，我們的頁面會更容易出現，也會標上
            「偏好」標記。
          </p>
          <ol className="td-list">
            <li>在 Google 搜尋任一關鍵字（例如「今日宜忌」）</li>
            <li>點搜尋結果上方「Top Stories」區塊右上角的圖示</li>
            <li>搜尋並勾選「chengqi.tw」</li>
          </ol>
          <p className="muted td-note">
            ＊此功能由 Google 提供，僅支援網域層級，且各地區推出時程不同；
            設定與否不影響你在本站的使用。
          </p>
        </div>

        <SectionHead title="免責" />
        <div className="card">
          <p>
            本站的擇日、宜忌、命理內容屬<b>傳統民俗文化範疇</b>，僅供參考與文化認識，
            <b>不構成醫療、法律、財務、婚姻或投資建議</b>。
          </p>
          <p>
            婚嫁、動土、喪葬等重大事宜，建議另請專業擇日師並一併考量當事人的生辰；
            健康問題請就醫。
          </p>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// ---------- 常見誤解 /myths ----------
// 由術語表的 caveat 欄位彙整而成——主動澄清常見誤解，
// 這是本站相對於一般命理站的實質差異，也是 AI 最容易引用的段落。
export function Myths() {
  const items = GLOSSARY.filter(g => g.caveat)
  return (
    <>
      <TopBar title="國民曆的常見誤解｜逐項澄清" onBack />
      <div className="body">
        <Breadcrumb items={[{ label: '首頁', tab: 0 }, { label: '常見誤解' }]} />
        <p className="au-lead">
          傳統曆法有很多容易被誤讀、或是各家說法不一的地方。這一頁把我們在整理資料時
          遇到的誤解逐項寫下來——包含我們自己曾經算錯又修正的部分。
        </p>
        {items.map(g => (
          <div key={g.slug}>
            <SectionHead title={g.term} />
            <div className="card gl-caveat">
              <p>{g.caveat}</p>
              <Link screen="glossaryDetail" params={{ slug: g.slug }} className="td-more">
                看「{g.term}」的完整解釋 ›
              </Link>
            </div>
          </div>
        ))}
        <p className="muted" style={{ padding: '10px 16px 0', fontSize: 'var(--text-2xs)', lineHeight: 1.8 }}>
          ＊各流派對部分項目的判定本來就不同，這裡標出的是「明顯的錯誤」與「需要區分的概念」，
          不是主張只有一種正確答案。資料來源與校對流程見
          <Link screen="editorial" className="td-more">編輯政策</Link>。
        </p>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
