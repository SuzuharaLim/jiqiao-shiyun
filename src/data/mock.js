// ==== 示範資料（mock）====  取材自《機巧時運 創業營運計畫書 v1》與 IG 介面稿

export const BRAND = '機巧時運'

// 今日農民曆
export const today = {
  term: '芒種',
  ganzhi: '丙午日',
  luckyHours: '辰時・未時',
  solar: '國曆 6/6',
  lunar: '農曆 五月十一',
  yi: ['祈福', '開市', '納財', '出行'],
  ji: ['動土', '安葬', '入宅'],
  stars: 4,
}

// 農民曆日曆頁（可前後翻日）—— 首頁曆頁主場資料
export const almanacDays = [
  {
    solar: '6 / 5', weekday: '週四', term: '芒種', ganzhi: '乙巳日',
    lunar: '農曆五月初十', zheng: '沖豬（己亥）煞東', wuxing: '覆燈火',
    luckyHours: '卯時・巳時', stars: 3,
    yi: ['沐浴', '掃舍', '祈福', '會親友'], ji: ['開市', '出行', '嫁娶'],
    proverb: '食緊弄破碗', season: '梅雨初起，宜備除濕',
  },
  {
    solar: '6 / 6', weekday: '週五', term: '芒種', ganzhi: '丙午日',
    lunar: '農曆五月十一', zheng: '沖鼠（庚子）煞北', wuxing: '天河水',
    luckyHours: '辰時・未時', stars: 4,
    yi: ['祈福', '開市', '納財', '出行'], ji: ['動土', '安葬', '入宅'],
    proverb: '有心拍石石成穿', season: '芒種插秧，芒果盛產',
  },
  {
    solar: '6 / 7', weekday: '週六', term: '芒種', ganzhi: '丁未日',
    lunar: '農曆五月十二', zheng: '沖牛（辛丑）煞西', wuxing: '天河水',
    luckyHours: '午時・酉時', stars: 5,
    yi: ['嫁娶', '訂盟', '祭祀', '立券', '交易'], ji: ['伐木', '作樑'],
    proverb: '天公疼憨人', season: '午時陽盛，宜辦喜事',
  },
]

// 首頁貼文
export const posts = [
  {
    id: 'p1', user: 'wang_photo', avatar: '🌾', avatarBg: '#cfe8d6',
    emoji: '🌾', bg: '#cfe3d3', term: '芒種', title: '芒種・田間',
    caption: '芒種的稻浪，風一吹就是一整片金黃。', tags: ['芒種', '田間'],
    likes: 128, comments: 12, time: '2 小時前', place: '台中・外埔',
  },
  {
    id: 'p2', user: 'lin_ocean', avatar: '🌊', avatarBg: '#dbeafe',
    emoji: '🌊', bg: '#cfe3f7', term: '夏至', title: '夏至・海線',
    caption: '夏至前的海，天亮得特別早。', tags: ['夏至', '海'],
    likes: 96, comments: 8, time: '5 小時前', place: '台南・七股',
  },
  {
    id: 'p3', user: 'flora.tw', avatar: '🌸', avatarBg: '#fce7f3',
    emoji: '🪷', bg: '#f6d6e4', term: '芒種', title: '荷風初起',
    caption: '植物園的荷花開了第一朵，記錄給明年的月曆。', tags: ['芒種', '荷花', '植物曆'],
    likes: 214, comments: 21, time: '昨天', place: '台北・植物園',
  },
]

// 探索市集網格
export const works = [
  { id: 'w1', emoji: '🌾', bg: '#dcfce7', term: '芒種', author: 'wang_photo', title: '芒種稻浪' },
  { id: 'w2', emoji: '🌊', bg: '#dbeafe', term: '夏至', author: 'lin_ocean', title: '七股晨海', price: 30 },
  { id: 'w3', emoji: '🌸', bg: '#fce7f3', term: '芒種', author: 'flora.tw', title: '初荷' },
  { id: 'w4', emoji: '🌅', bg: '#ffedd5', term: '夏至', author: 'sky_diary', title: '夏至日出', price: 45 },
  { id: 'w5', emoji: '🪷', bg: '#e9e3fb', term: '芒種', author: 'flora.tw', title: '池上蓮' },
  { id: 'w6', emoji: '🍃', bg: '#d3f0ec', term: '花卉', author: 'green_life', title: '蕨之呼吸' },
  { id: 'w7', emoji: '🏯', bg: '#fde9d0', term: '慶典', author: 'temple_walk', title: '廟埕', price: 30 },
  { id: 'w8', emoji: '🌾', bg: '#d7e9c9', term: '芒種', author: 'farm_note', title: '割稻' },
  { id: 'w9', emoji: '🌺', bg: '#f6d6e4', term: '花卉', author: 'flora.tw', title: '扶桑' },
  { id: 'w10', emoji: '⛰️', bg: '#cfe3f7', term: '海', author: 'hike_tw', title: '合歡' },
  { id: 'w11', emoji: '🌻', bg: '#f3e7c9', term: '花卉', author: 'sun_field', title: '向日葵田', price: 60 },
  { id: 'w12', emoji: '🌿', bg: '#dceae0', term: '芒種', author: 'green_life', title: '青草' },
]

export const exploreChips = ['全部', '芒種', '夏至', '花卉', '海', '慶典']

// 占卜工具
export const fortuneTools = [
  { id: 'name', icon: '✍️', bg: '#ede9fe', title: '姓名・商店 命名吉凶', sub: '姓名筆畫 · 店名/品牌 吉凶', screen: 'nameFortune' },
  { id: 'match', icon: '💞', bg: '#fce7f3', title: '生肖・星座 婚配', sub: '兩人配對分數與建議', screen: 'matchmaking' },
  { id: 'deity', icon: '⛩️', bg: '#fee2c7', title: '臺灣神佛的生日', sub: '誕辰一覽 · 可設定提醒', screen: 'deities' },
  { id: 'zodiac', icon: '🐉', bg: '#dcfce7', title: '生肖運勢', sub: '今日 / 本週 / 本月', screen: 'zodiac' },
  { id: 'bone', icon: '⚖️', bg: '#dbeafe', title: '袁天罡秤骨神術', sub: '生辰秤骨 · 命格解析', screen: 'bone' },
  { id: 'dream', icon: '💤', bg: '#e9e3fb', title: '周公解夢', sub: '關鍵字查夢 · AI 延伸解析', screen: 'dream' },
]

// 文化 24 節氣
export const cultureTools = [
  { id: 'proverb', icon: '💬', bg: '#fef3c7', title: '台灣諺語', sub: '「食緊弄破碗」每日一句', screen: 'proverbs' },
  { id: 'festival', icon: '🎏', bg: '#ffe4e6', title: '臺灣特色慶典活動', sub: '時節慶典 · 地點與簡介', screen: 'festivals' },
  { id: 'flower', icon: '🌸', bg: '#fce7f3', title: '臺灣賞花景點', sub: '花期 · 地圖 · 打卡作品', screen: 'flowers' },
  { id: 'food', icon: '🍱', bg: '#dcfce7', title: '當季食材 陸・海・空', sub: '時令食材與食譜', screen: 'ingredients' },
  { id: 'column', icon: '🗓️', bg: '#dbeafe', title: '24 節氣專欄', sub: '由來 · 物候 · 文章卡', screen: 'solarterms' },
]

// 神佛生日
export const deities = [
  { id: 'mazu', icon: '⛩️', bg: '#fee2c7', name: '媽祖 天上聖母', date: '農曆 3/23', note: '還有 5 天' },
  { id: 'tudi', icon: '🛕', bg: '#fef3c7', name: '土地公 福德正神', date: '農曆 8/15' },
  { id: 'guan', icon: '⚔️', bg: '#ffe4e6', name: '關聖帝君', date: '農曆 6/24' },
  { id: 'xuan', icon: '🌙', bg: '#e9e3fb', name: '玄天上帝', date: '農曆 3/3' },
  { id: 'guanyin', icon: '🪷', bg: '#dcfce7', name: '觀世音菩薩', date: '農曆 2/19' },
  { id: 'cheng', icon: '🏮', bg: '#dbeafe', name: '城隍爺', date: '農曆 5/11' },
  { id: 'baosheng', icon: '💊', bg: '#d3f0ec', name: '保生大帝', date: '農曆 3/15' },
  { id: 'wangye', icon: '⚜️', bg: '#fde9d0', name: '五府千歲', date: '農曆 4/26' },
  { id: 'zhusheng', icon: '🌸', bg: '#f6d6e4', name: '註生娘娘', date: '農曆 3/20' },
  { id: 'yuelao', icon: '❤️', bg: '#ffe4e6', name: '月下老人', date: '農曆 8/15' },
  { id: 'wenchang', icon: '📖', bg: '#dbeafe', name: '文昌帝君', date: '農曆 2/3' },
  { id: 'shennong', icon: '🌾', bg: '#dcfce7', name: '神農大帝', date: '農曆 4/26' },
]

// 生肖運勢
export const zodiacs = [
  { sign: '鼠', emoji: '🐭', score: 82, luck: '正財旺，午後宜談合作' },
  { sign: '牛', emoji: '🐮', score: 74, luck: '穩中求進，忌衝動決策' },
  { sign: '虎', emoji: '🐯', score: 90, luck: '貴人相助，宜主動出擊' },
  { sign: '兔', emoji: '🐰', score: 68, luck: '注意溝通，多聆聽' },
  { sign: '龍', emoji: '🐲', score: 88, luck: '事業有成，宜開市納財' },
  { sign: '蛇', emoji: '🐍', score: 71, luck: '守成為上，理財謹慎' },
  { sign: '馬', emoji: '🐴', score: 95, luck: '本命芒種日，諸事順遂' },
  { sign: '羊', emoji: '🐏', score: 66, luck: '情緒平穩，宜靜心' },
  { sign: '猴', emoji: '🐵', score: 79, luck: '靈感佳，適合創作' },
  { sign: '雞', emoji: '🐔', score: 73, luck: '人際熱絡，慎防口舌' },
  { sign: '狗', emoji: '🐶', score: 80, luck: '忠於本心，得長輩緣' },
  { sign: '豬', emoji: '🐷', score: 77, luck: '財氣平順，宜儲蓄' },
]

// 台灣諺語
// 宜／忌 詞彙白話解釋 —— 曆頁上每個詞可點擊查看意思（存 ref_items，可經管理後台 CMS 修改）
// term 需與 almanac.js 的 YI_POOL / JI_POOL / 建除樣本用詞一致，否則點了查不到解釋。
export const almanacTerms = [
  // ── 宜 ──
  { term: '祈福', type: 'yi', mean: '向神明祈求平安順遂，例如安太歲、點光明燈、還願。' },
  { term: '開市', type: 'yi', mean: '店面開張、公司開業，或年後第一次營業。' },
  { term: '納財', type: 'yi', mean: '收進錢財，例如收帳款、存錢、進貨。' },
  { term: '出行', type: 'yi', mean: '出遠門、旅行或出差。' },
  { term: '嫁娶', type: 'yi', mean: '結婚，包含迎娶與宴客。' },
  { term: '祭祀', type: 'yi', mean: '祭拜神明或祖先，例如上香、掃墓、普渡。' },
  { term: '安床', type: 'yi', mean: '安放或移動床位。新婚、搬家、久病換房時特別講究。' },
  { term: '入宅', type: 'yi', mean: '搬進新家、新居落成正式入住（俗稱入厝）。' },
  { term: '交易', type: 'yi', mean: '買賣成交、談生意。' },
  { term: '立券', type: 'yi', mean: '訂立契約、簽合約。與「交易」相近，但偏重書面文件。' },
  { term: '沐浴', type: 'yi', mean: '齋戒沐浴、潔淨身體，多用於祭祀前的準備。' },
  { term: '會親友', type: 'yi', mean: '拜訪親友、聚餐宴客。' },
  { term: '裁衣', type: 'yi', mean: '裁製新衣。傳統上特指婚禮禮服或壽衣的縫製。' },
  { term: '栽種', type: 'yi', mean: '種植作物花木、播種育苗。' },
  { term: '解除', type: 'yi', mean: '清除穢氣、消災解厄，例如大掃除、除舊佈新。' },
  { term: '求嗣', type: 'yi', mean: '求子、祈求生育。' },
  { term: '掃舍', type: 'yi', mean: '打掃房屋、清理居家環境。' },
  // ── 忌 ──
  { term: '動土', type: 'ji', mean: '房屋建築開工的第一鏟（陽宅用）。與墓地的「破土」不同。' },
  { term: '安葬', type: 'ji', mean: '舉行喪葬儀式、下葬入土。' },
  { term: '出火', type: 'ji', mean: '移動神明或祖先牌位，例如搬家時遷移神位。' },
  { term: '開倉', type: 'ji', mean: '開啟倉庫出貨，或大批取出存糧存貨。' },
  { term: '伐木', type: 'ji', mean: '砍伐樹木，古時也指取用建材。' },
  { term: '作樑', type: 'ji', mean: '架設房屋主樑（上樑），是建築中最關鍵的工序。' },
  { term: '行喪', type: 'ji', mean: '辦理喪事、出殯送葬。' },
  { term: '破土', type: 'ji', mean: '墓地動工（陰宅用）。與蓋房子的「動土」是不同的事。' },
  { term: '針灸', type: 'ji', mean: '針灸施針治療，引申也包含動刀手術。' },
  { term: '掘井', type: 'ji', mean: '開鑿水井、挖掘地下水源。' },
  { term: '諸事不宜', type: 'ji', mean: '這天多數事情都不適合進行，建議低調行事、不辦大事。' },
]

export const proverbs = [
  { tw: '食緊弄破碗', mean: '欲速則不達，急躁反而壞事。' },
  { tw: '一兼二顧，摸蜊仔兼洗褲', mean: '一舉兩得，做一件事同時得到兩種好處。' },
  { tw: '天公疼憨人', mean: '老天爺會眷顧憨厚老實的人。' },
  { tw: '有心拍石石成穿', mean: '有恆心，滴水穿石，事竟成。' },
  { tw: '棚頂做到流汗，棚跤嫌到流瀾', mean: '台上辛苦付出，台下卻被百般挑剔。' },
  { tw: '田螺含水過冬', mean: '再艱難也要撐住、等待時機，比喻忍耐度過難關。' },
  { tw: '一枝草，一點露', mean: '天無絕人之路，每個人都有自己的活路與福分。' },
  { tw: '樹頭徛予在，毋驚樹尾做風颱', mean: '根基穩固，就不怕外來的風雨動搖。' },
  { tw: '緊紡無好紗，緊嫁無好大家', mean: '凡事太急就難有好結果，欲速則不達。' },
  { tw: '食果子拜樹頭', mean: '飲水思源，享受成果時勿忘根本與恩人。' },
  { tw: '三年一閏，好歹照輪', mean: '世事總會輪替，好壞都會輪到，順逆皆有時。' },
  { tw: '近廟欺神', mean: '越是熟悉親近，反而越不懂得珍惜尊重。' },
]

// 慶典
export const festivals = [
  { emoji: '🐉', name: '端午龍舟賽', time: '農曆 5/5', place: '鹿港・彰化', desc: '芒種前後，全台各地划龍舟、包粽、立蛋，紀念屈原。' },
  { emoji: '🏮', name: '鹽水蜂炮', time: '元宵 · 農曆 1/15', place: '台南・鹽水', desc: '武廟出巡遶境，萬炮齊發祈求平安，世界三大民俗慶典之一。' },
  { emoji: '⛩️', name: '大甲媽祖遶境', time: '農曆 3 月', place: '台中・大甲', desc: '九天八夜徒步進香，數十萬信眾隨行，無形文化資產。' },
  { emoji: '🕯️', name: '平溪天燈', time: '元宵前後', place: '新北・平溪', desc: '把心願寫上天燈放飛夜空，山城最浪漫的節氣風景。' },
  { emoji: '🎆', name: '東港迎王平安祭', time: '三年一科 · 秋季', place: '屏東・東港', desc: '燒王船送瘟祈安，南台灣最盛大的王爺信仰祭典。' },
  { emoji: '🏵️', name: '頭城搶孤', time: '農曆 7 月底', place: '宜蘭・頭城', desc: '中元普渡尾聲，攀孤棚搶旗，驚險刺激的民俗競技。' },
  { emoji: '🌾', name: '賽夏族矮靈祭', time: '農曆 10 月', place: '苗栗・南庄', desc: '兩年一小祭、十年一大祭，賽夏族最神聖的傳統祭儀。' },
  { emoji: '🏮', name: '野柳神明淨港', time: '元宵 · 農曆 1/15', place: '新北・野柳', desc: '神轎扛入海中淨港，祈求漁獲豐收、出海平安。' },
]

// 賞花
export const flowers = [
  { emoji: '🌸', name: '陽明山櫻花', period: '2–3 月', place: '台北・陽明山' },
  { emoji: '🌷', name: '中社花海鬱金香', period: '1–2 月', place: '台中・后里' },
  { emoji: '🪷', name: '台北植物園荷花', period: '6–8 月', place: '台北・南海路' },
  { emoji: '🌻', name: '桃園向日葵', period: '6–7 月', place: '桃園・觀音' },
  { emoji: '💜', name: '九月雪 · 韭菜花', period: '9–10 月', place: '桃園・大溪' },
  { emoji: '🌼', name: '銅鑼杭菊', period: '11 月', place: '苗栗・銅鑼' },
  { emoji: '🌺', name: '阿勃勒黃金雨', period: '5–6 月', place: '台南・多處' },
  { emoji: '🏵️', name: '武陵農場櫻花', period: '2 月', place: '台中・和平' },
  { emoji: '🌲', name: '落羽松秘境', period: '12–1 月', place: '南投・魚池' },
]

// 當季食材
export const ingredients = [
  { type: '陸', emoji: '🌽', items: ['竹筍', '玉米', '空心菜', '莧菜'], tip: '芒種濕熱，宜清熱利濕的瓜果青蔬。' },
  { type: '海', emoji: '🐟', items: ['午仔魚', '小卷', '白帶魚', '文蛤'], tip: '端午前後小卷肥美，產季鮮甜。' },
  { type: '空', emoji: '🍑', items: ['芒果', '荔枝', '鳳梨', '西瓜'], tip: '當令水果盛產，消暑但勿貪涼過量。' },
]

// 24 節氣專欄（完整）
export const solarTermArticles = [
  { term: '立春', emoji: '🌱', sub: '第 1 個節氣 · 國曆 2/4 前後',
    body: '春之始。東風解凍、蟄蟲始振，萬物由此萌動。台灣此時仍有春寒，農諺「立春天氣晴，百物好收成」。\n\n養生宜順應生發之氣，早睡早起、舒展筋骨，飲食少酸多甘以養脾。' },
  { term: '雨水', emoji: '🌧️', sub: '第 2 個節氣 · 國曆 2/19 前後',
    body: '降水漸增，獺祭魚、鴻雁來。俗諺「雨水連綿是豐年」，是農田播種備耕的時節。\n\n乍暖還寒，宜「春捂」保暖、健脾祛濕，多食粥品與時蔬。' },
  { term: '驚蟄', emoji: '🐛', sub: '第 3 個節氣 · 國曆 3/6 前後',
    body: '春雷始鳴，蟄伏的昆蟲被驚醒。台灣有「驚蟄打小人」的民俗，也是春耕大忙的開始。\n\n肝氣旺盛，宜疏肝理氣、早睡早起，多食梨潤燥。' },
  { term: '春分', emoji: '🌸', sub: '第 4 個節氣 · 國曆 3/21 前後',
    body: '晝夜均分、寒暑平。玄鳥至、雷乃發聲，正是繁花盛開、踏青賞櫻的好時節。\n\n養生講究「陰陽平衡」，作息規律、情緒平和，飲食寒溫得中。' },
  { term: '清明', emoji: '🍃', sub: '第 5 個節氣 · 國曆 4/5 前後',
    body: '氣清景明，桐始華。既是節氣也是掃墓祭祖的節日，慎終追遠、踏青插柳。\n\n多雨潮濕，宜疏肝健脾、清淡飲食，潤餅、青草是應景之食。' },
  { term: '穀雨', emoji: '🌾', sub: '第 6 個節氣 · 國曆 4/20 前後',
    body: '雨生百穀，浮萍始生。春季最後一個節氣，正是採春茶、插秧的關鍵時刻。\n\n濕氣漸重，宜健脾祛濕、少食生冷，喝穀雨茶清火明目。' },
  { term: '立夏', emoji: '🌱', sub: '第 7 個節氣 · 國曆 5/6 前後',
    body: '夏之始，萬物並秀。螻蟈鳴、蚯蚓出，作物進入旺盛生長期。台灣有立夏「補夏」食俗。\n\n宜養心安神、晚睡早起，飲食清淡多酸以固表。' },
  { term: '小滿', emoji: '🌾', sub: '第 8 個節氣 · 國曆 5/21 前後',
    body: '麥類等夏熟作物籽粒漸滿但未熟，故名小滿。苦菜秀、麥秋至，寓意「滿而不盈」的知足。\n\n濕熱漸增，宜清熱利濕、少食甜膩油炸，多食苦味菜。' },
  { term: '芒種', emoji: '🌾', sub: '第 9 個節氣 · 國曆 6/6 前後',
    body: '有芒作物可種、麥類成熟。台灣進入梅雨與初夏之交，農諺「芒種夏至，樣仔落蒂」，芒果盛產、稻作插秧的忙碌時刻。\n\n三候：螳螂生、鵙始鳴、反舌無聲。濕熱之際，宜清淡、勤補水、午後小憩。' },
  { term: '夏至', emoji: '☀️', sub: '第 10 個節氣 · 國曆 6/21 前後',
    body: '太陽直射北回歸線，北半球白晝最長。台灣嘉義有北回歸線地標。俗諺「夏至風颱就出世」，颱風季將至。\n\n陽氣最盛，養生講究「養心」，宜靜心少怒、清補為主。' },
  { term: '小暑', emoji: '🌡️', sub: '第 11 個節氣 · 國曆 7/7 前後',
    body: '暑氣漸盛尚未至極。溫風至、蟋蟀居壁，正是消暑納涼、曬伏的時節。\n\n宜心靜自然涼、少動多靜，多補水電解質，飲食清爽開胃。' },
  { term: '大暑', emoji: '🔥', sub: '第 12 個節氣 · 國曆 7/23 前後',
    body: '一年最熱之時，腐草為螢、大雨時行。台灣常有午後雷陣雨與颱風。\n\n宜防中暑、清熱解毒，多食瓜果，綠豆湯、仙草是消暑良品。' },
  { term: '立秋', emoji: '🍂', sub: '第 13 個節氣 · 國曆 8/8 前後',
    body: '秋之始，涼風至、白露生。雖仍有「秋老虎」餘暑，但暑去涼來已現端倪。\n\n宜收斂養肺、滋陰潤燥，民間有「貼秋膘」適度進補之俗。' },
  { term: '處暑', emoji: '🌾', sub: '第 14 個節氣 · 國曆 8/23 前後',
    body: '「處」為終止，暑氣至此而止。鷹乃祭鳥、禾乃登，稻穀開始成熟。\n\n早晚轉涼，宜潤肺防燥、早睡早起，多食百合、銀耳。' },
  { term: '白露', emoji: '💧', sub: '第 15 個節氣 · 國曆 9/8 前後',
    body: '露凝而白，鴻雁來、玄鳥歸。晝夜溫差加大，秋意漸濃。俗諺「白露勿露身」。\n\n宜添衣防涼、養肺潤燥，避免貪食生冷瓜果。' },
  { term: '秋分', emoji: '🌕', sub: '第 16 個節氣 · 國曆 9/23 前後',
    body: '晝夜再度均分，雷始收聲、蟄蟲坏戶。豐收時節，也是中秋前後團圓賞月之時。\n\n宜陰陽調和、情緒平穩，飲食溫潤，慎防秋燥傷肺。' },
  { term: '寒露', emoji: '🌾', sub: '第 17 個節氣 · 國曆 10/8 前後',
    body: '露水寒冷將凝，鴻雁來賓、菊有黃華。天高氣爽，正是登高賞菊的好時節。\n\n宜足部保暖、滋陰潤肺，多食芝麻、核桃等溫潤之品。' },
  { term: '霜降', emoji: '🍁', sub: '第 18 個節氣 · 國曆 10/24 前後',
    body: '秋季最後一個節氣，霜始降、草木黃落。台灣楓紅漸起，柿子盛產，「霜降吃柿」之俗。\n\n宜平補潤燥、健脾養胃，注意保暖防燥邪。' },
  { term: '立冬', emoji: '🍁', sub: '第 19 個節氣 · 國曆 11/8 前後',
    body: '冬之始，水始冰、地始凍。台灣有立冬「補冬」進補之俗，薑母鴨、麻油雞暖身。\n\n宜早睡晚起、斂陽護陰，適度溫補以蓄養精氣。' },
  { term: '小雪', emoji: '❄️', sub: '第 20 個節氣 · 國曆 11/22 前後',
    body: '北方始飄小雪，虹藏不見、閉塞成冬。台灣雖不下雪，但冷氣團漸強、東北季風盛行。\n\n宜溫補防寒、養腎藏精，多食黑色食物與溫熱湯品。' },
  { term: '大雪', emoji: '⛄', sub: '第 21 個節氣 · 國曆 12/7 前後',
    body: '雪量增大，鶡鴠不鳴、荔挺出。是進補與醃曬臘味的時節，年味漸近。\n\n宜保暖護陽、早睡遲起，飲食溫熱、適度進補。' },
  { term: '冬至', emoji: '⛄', sub: '第 22 個節氣 · 國曆 12/22 前後',
    body: '陰極陽生，白晝最短。台灣「冬至圓」搓湯圓、圍爐，象徵團圓與添歲。\n\n一陽初生，宜養藏、安神，進補以固本培元。' },
  { term: '小寒', emoji: '❄️', sub: '第 23 個節氣 · 國曆 1/6 前後',
    body: '天氣寒冷但未至極，雁北鄉、鵲始巢。俗諺「小寒大寒，冷成冰團」，一年最冷時段將至。\n\n宜防風保暖、溫補腎陽，多食堅果與熱粥。' },
  { term: '大寒', emoji: '🥶', sub: '第 24 個節氣 · 國曆 1/20 前後',
    body: '一年最後一個節氣，天寒地凍至極而後回暖。雞始乳、征鳥厲疾，過此便是立春。\n\n宜蓄養防寒、調暢情志，迎接新春的生發之氣。' },
]

// 通知
export const notifications = [
  { id: 'n1', emoji: '❤️', text: 'lin_ocean 等 128 人 說你的〈芒種稻浪〉讚', time: '2 小時前', to: 'postDetail', props: { id: 'p1' } },
  { id: 'n2', emoji: '🖼️', text: '你的作品〈初荷〉被選入 3 本植物月曆', time: '5 小時前', to: 'workDetail', props: { id: 'w3' } },
  { id: 'n3', emoji: '💰', text: '市集授權售出 ×2，入帳 NT$60', time: '昨天', to: 'wallet' },
  { id: 'n4', emoji: '⛩️', text: '媽祖聖誕還有 5 天，已為你開啟提醒', time: '昨天', to: 'deities' },
  { id: 'n5', emoji: '🎯', text: '「芒種攝影挑戰」剩 2 天，衝上排行榜！', time: '2 天前', to: 'challengesBoard' },
]

// 挑戰活動
export const challenges = [
  { id: 'c1', emoji: '🌾', title: '芒種攝影挑戰', prize: '前 3 名作品收錄官方月曆', join: 328, days: 2 },
  { id: 'c2', emoji: '🪷', title: '植物曆・夏花', prize: 'Premium 季訂 ×5', join: 156, days: 9 },
]

// 節氣（新貼文標記用）
export const solarTermNames = ['立夏', '小滿', '芒種', '夏至', '小暑', '大暑', '立秋']

// 授權價帶（單張授權分級）
export const licenseTiers = [0, 30, 45, 60]

// 挑戰排行榜（依讚數排序）
export const leaderboard = [
  { rank: 1, user: 'flora.tw', emoji: '🪷', bg: '#f6d6e4', title: '初荷', likes: 214, workId: 'w3' },
  { rank: 2, user: 'wang_photo', emoji: '🌾', bg: '#cfe3d3', title: '芒種稻浪', likes: 128, workId: 'w1' },
  { rank: 3, user: 'sky_diary', emoji: '🌅', bg: '#ffedd5', title: '夏至日出', likes: 96, workId: 'w4' },
  { rank: 4, user: 'farm_note', emoji: '🌾', bg: '#d7e9c9', title: '割稻', likes: 74, workId: 'w8' },
  { rank: 5, user: 'green_life', emoji: '🍃', bg: '#d3f0ec', title: '蕨之呼吸', likes: 61, workId: 'w6' },
]

// 私訊對話（示範腳本）
export const dmThreads = {
  'flora.tw': { emoji: '🌸', bg: '#fce7f3', msgs: [
    { who: 'them', text: '嗨～你的〈初荷〉可以授權給我做月曆嗎？' },
    { who: 'them', text: '想放在六月芒種那頁 🌾' },
  ], reply: '沒問題！市集就能直接授權，單張 NT$30，分潤 70% 給我，你放心用 😊' },
  'lin_ocean': { emoji: '🌊', bg: '#dbeafe', msgs: [
    { who: 'them', text: '芒種攝影挑戰一起衝！' },
  ], reply: '好啊！我今天剛拍了一組稻浪，等等就投稿 🌾' },
  '機巧時運 小編': { emoji: '🤖', bg: '#ede9fe', msgs: [
    { who: 'them', text: '恭喜你的作品入選官方植物月曆 🎉' },
    { who: 'them', text: '分潤已入帳，可到錢包查看。' },
  ], reply: '太開心了，謝謝小編！' },
}

// 節氣詩詞池（月曆換詩詞用）
export const poemPool = [
  '耕耘有時，靜待花開', '穗實低垂，虛心向地', '芒種忙種，汗滴禾下',
  '梅雨初歇，稻香滿田', '一分耕耘，一分收穫', '時雨及芒，物候更新',
  '螳螂初生，鵙鳴其陽', '晝長夜短，暑氣將至', '插秧趁時，農事正酣',
]

// 我的專案
export const projects = [
  { id: 'pr1', emoji: '🗓️', name: '2026 植物月曆', status: '草稿 · 已選 8/12', color: '#dcfce7' },
  { id: 'pr2', emoji: '📔', name: '芒種手帳內頁', status: '已完成 · 待下單', color: '#ffedd5' },
  { id: 'pr3', emoji: '🎁', name: '企業客製 · 大葉大學', status: '報價中', color: '#e9e3fb' },
]

// 商店品項 —— 灌入 ref_items('storeProducts')，可由管理後台 CMS 編輯。
// （原本硬編在 Store.jsx 檔案裡，是最後一個寫死在畫面檔的內容清單。）
export const storeProducts = [
  { id: 's1', e: '📔', bg: '#f3e7c9', name: '植物萬年曆手帳（無時效）', desc: '鋼筆防透墨紙材 · 24 節氣植物插畫', price: 800 },
  { id: 's2', e: '🖊️', bg: '#dbeafe', name: '時光訊息典藏套組', desc: '手帳 ＋ 自立式鋼筆 ＋ 皮革收納', price: 1280 },
  { id: 's3', e: '🎁', bg: '#e9e3fb', name: '企業客製版', desc: '封面壓印 LOGO · 專屬 AI 歡迎語', price: null },
  { id: 's4', e: '✨', bg: '#fce7f3', name: '數位手帳素材包', desc: '節慶貼紙 · 電子模板（邊際成本近零）', price: 120 },
]

// 結帳明細
export const checkoutItems = [
  { id: 'ck1', name: '植物月曆 ×1（12 張）', price: 480 },
  { id: 'ck2', name: '市集照片授權 ×3', price: 90 },
  { id: 'ck3', name: '高階印刷 ＋ 運費', price: 60 },
]

// 訂閱方案（免費＝基礎 AI 模型，付費＝高階 AI 模型；月費 NT$150。實際供應商上線時再標示）
export const plans = {
  free: {
    name: 'Free',
    price: 0,
    feats: ['掃描手帳看當日宜忌', '基礎植物百科 · 氣象', 'AI 顧問每日 3 次對話', '公眾假期倒數'],
  },
  premium: {
    name: 'Premium',
    price: 150,
    feats: ['AI 深度情感陪伴・無限對話', '切換高階 AI 模型', '進階星象 × 東方命理交叉分析', '年度生涯發展計畫建議', '結帳 9 折・數位手帳素材包'],
  },
}

// 創作者後台收益
export const creatorStats = {
  balance: 1840, monthSales: 42, licensed: 18, followers: 310,
  rows: [
    { name: '〈初荷〉授權 ×6', amount: 180 },
    { name: '〈芒種稻浪〉月曆選用 ×4', amount: 120 },
    { name: '〈池上蓮〉授權 ×3', amount: 90 },
  ],
}

// 個人檔案
export const profile = {
  handle: 'lim_suzuhara',
  name: '蕭・節氣攝影',
  bio: '記錄二十四節氣 🌿　台中',
  avatar: '🌾', avatarBg: '#dcfce7',
  works: 24, followers: 310, chosen: 18,
  grid: works.slice(0, 6),
}

// AI 時光顧問：示範對話腳本（依關鍵字回覆，其餘走預設）
// ⚠️ 開場白與快速鍵曾經寫死「芒種／丙午日」，但 App 開在真實今日，
// 於是使用者在大暑當天會看到 AI 說「今天是芒種」。改成依實際日期生成。
export const aiOpenFor = (d) =>
  `今天是「${d.term.replace('（交節）', '')}」，${d.ganzhi.replace('日', '')}日 🌾
想問今日運勢、宜忌，還是抽支籤、解個夢？我都在。`
export const aiQuickRepliesFor = (d) =>
  ['今天適合簽約嗎？', '幫我抽一支今日運勢籤', `${d.term.replace('（交節）', '')}要注意什麼？`, '解夢：夢到下雨']
export const aiScript = [
  { keys: ['簽約', '合約', '開市', '生意'], reply: '今日「宜開市、納財」，午後尤佳 ✨\n重要簽約建議排在 13–15 時（未時），並避開正沖屬鼠者。要我幫你記到行事曆嗎？' },
  { keys: ['籤', '抽'], reply: '🎋 為你抽得「中吉・芒種第七籤」：\n『耕耘有時，靜待花開；心誠則靈，秋來滿載。』\n\n解：此籤宜守成積累，勿急於一時。近期的努力會在秋收時見效。' },
  { keys: ['芒種', '節氣', '注意'], reply: '芒種濕熱、梅雨交替 🌦️\n養生三提醒：① 勤補水、飲食清淡；② 午後小憩養心；③ 收好除濕，衣物勿積潮。\n農諺說「芒種逢雷美亦然」，這幾天若打雷反是好兆頭喔。' },
  { keys: ['夢', '解夢'], reply: '夢到「下雨」多主財與情緒的洗滌 🌧️\n《周公解夢》云：雨降主潤澤、有財氣將至；但若夢中淋雨狼狽，則提醒近期別把事情攬太滿。你夢裡的雨是大是小呢？' },
  { keys: ['運勢', '今天', '今日'], reply: '今日運勢 ⭐⭐⭐⭐☆（丙午日）\n總體：宜開市納財、出行祈福；忌動土安葬。\n貼心話：火氣偏旺的一天，說話放慢半拍，貴人自來。' },
]
// day 為選填：帶入時會把腳本裡寫死的節氣／干支換成真實的今日值，
// 否則訪客會在大暑當天收到「芒種第七籤」「丙午日運勢」這種明顯過期的內容。
export function aiReply(text, day) {
  const hit = aiScript.find(s => s.keys.some(k => text.includes(k)))
  if (hit) {
    if (!day) return hit.reply
    const term = day.term.replace('（交節）', '')
    const gz = day.ganzhi.replace('日', '')
    return hit.reply.replaceAll('芒種', term).replaceAll('丙午', gz)
  }
  return '我聽見了 🌿 這題我可以結合農民曆與你的近況幫你細看。\n（Demo 示範：實際版本會由 AI 時光顧問依你的問題與歷史紀錄，給出個人化的宜忌、運勢與生活建議。）'
}
