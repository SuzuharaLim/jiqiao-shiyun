// ════════════════════════════════════════════════════════════════════════
// 大葉大學生態區 —— 校園植物名錄（2026-11-22 使用者指定）
// ════════════════════════════════════════════════════════════════════════
// 來源：大葉大學校園植物圖鑑 https://plants.dyu.edu.tw/a2803/
//   原站依「喬木／灌木／草花」三類列出校園植物，每一種各有一頁介紹
//   （中英文名、學名、科屬、別名、原產地、用途、習性、形態）。
//
// ★ 授權（2026-11-22）：使用者表示大葉已同意授權使用原站的照片與介紹文字。
//   scripts/build-dyu.mjs 把照片與介紹抓進本站：public/dyu/、src/data/dyuDetails.js、dyuPhotos.js。
//   ⚠️ 不可直接引用原站圖片網址（CSP 是 `img-src 'self'`）。
//   ⚠️ 每一頁都必須保留出處並連回原站那一頁。
//   這個檔只放名錄（名稱＋原站檔名＝slug）；FEATURED 那三筆的一句話是自己寫的摘要。
// ⚠️ 名稱照原站用字（含「鳯」這種異體字），不要「順手修正」——
//    與原站一致，對照時才找得到。

export const DYU_BASE = 'https://plants.dyu.edu.tw/a2803/'
export const DYU_INDEX = DYU_BASE + 'index.html'

export const DYU_GROUPS = [
  {
    key: 'tree', label: '喬木',
    items: [
      ['福木', 'common'], ['楓香', 'formosan'], ['銀樺', 'silver'], ['蒲葵', 'fan_palm'],
      ['龍柏', 'dragon'], ['榕樹', 'marabutan'], ['竹柏', 'formosa'], ['黃槐', 'shower'],
      ['樟樹', 'comphor'], ['木棉', 'bombax'], ['茄冬', 'autummn'], ['杏桃', 'aoricot'],
      ['山櫻花', 'cherry'], ['五葉松', 'pine'], ['光蠟樹', 'formosan_ash'], ['相思樹', 'acacia'],
      ['火焰木', 'fountain'], ['黃連木', 'pistache'], ['落羽松', 'cypress'], ['盾柱木', 'rusty'],
      ['象牙木', 'philippine'], ['烏心石', 'michelia'], ['白千層', 'cajuput'], ['凰鳯木', 'flame_tree'],
      ['黑板樹', 'palimara'], ['阿勃勒', 'shower_tree'], ['串錢柳', 'bottle_brush'], ['藍花楹', 'ebony'],
      ['水黃皮', 'poongaoil'], ['羅漢松', 'podocarpus'], ['欖仁樹', 'indian'], ['緬梔花', 'mexican'],
      ['珊瑚刺桐', 'coral'], ['小葉欖仁', 'madagascar'], ['大花紫薇', 'queen'], ['大王椰子', 'royal'],
      ['大葉山欖', 'formosan_nato'], ['三角椰子', 'triangle_palm'], ['桃花心木', 'mahogany'], ['印度紫檀', 'burma_coast'],
      ['吉貝木棉', 'kapok'], ['台灣欒樹', 'golden_rain'], ['黃花風鈴木', 'trumpet_tree'], ['小葉南洋杉', 'norfolk_island'],
      ['洋紅風鈴木', 'lapacho'], ['印度橡膠樹', 'india_rubber'],
    ],
  },
  {
    key: 'shrub', label: '灌木',
    items: [
      ['蘇鐡', 'sago_palm'], ['矮仙丹', 'ixora'], ['七里香', 'jasmin_orange'], ['南天竹', 'nandina'],
      ['變葉木', 'spotted_leaf'], ['金露花', 'dewdrop'], ['春不老', 'ceylon'], ['胡椒木', 'pepper'],
      ['茉莉花', 'arabian'], ['煙火花', 'starburst'], ['馬纓丹', 'lantana'], ['鵝掌藤', 'scandent'],
      ['醉嬌花', 'texas'], ['大王仙丹', 'king_ixora'], ['香水合歡', 'pink_powderpuff'], ['南美朱槿', 'wax_mallow'],
      ['紅粉撲花', 'powder-puff'], ['長穗鐵莧', 'cattail'], ['翅果鐵刀木', 'ringworm'], ['厚葉石斑木', 'yedda'],
      ['錫蘭葉下珠', 'cyelon'], ['羅比親王海棗', 'roebelin'],
    ],
  },
  {
    key: 'herb', label: '草花',
    items: [
      ['睡蓮', 'water-lily'], ['蚌蘭', 'boat_lily'], ['針藺', 'bulrush'], ['蔓花生', 'arachis'],
      ['翠蘆莉', 'britton'], ['美人蕉', 'canna'], ['一串紅', 'scarlet'], ['鳯仙花', 'touch_me_not'],
      ['金針花', 'daylily'], ['水金英', 'poppy'], ['白鷺莞', 'sedge'], ['石菖蒲', 'sweetflag'],
    ],
  },
].map(g => ({ ...g, items: g.items.map(([name, slug]) => ({ name, slug, url: `${DYU_BASE}${slug}.html` })) }))

export const DYU_TOTAL = DYU_GROUPS.reduce((n, g) => n + g.items.length, 0)

// 三筆精選：逐頁讀過原站後的極短摘要（自己的話，只寫原站明寫的事）
export const DYU_FEATURED = [
  {
    name: '楓香', group: '喬木', sci: 'Liquidambar formosana', family: '金縷梅科 楓香屬',
    note: '落葉喬木，秋天轉紅；常作園景樹與行道樹。',
    slug: 'formosan', url: DYU_BASE + 'formosan.html',
  },
  {
    name: '福木', group: '喬木', sci: 'Garcinia subelliptica', family: '藤黃科 福木屬',
    note: '常綠中喬木，枝葉茂密；常作園景樹，也用來防風、隔音。',
    slug: 'common', url: DYU_BASE + 'common.html',
  },
  {
    name: '睡蓮', group: '草花', sci: 'Nymphaea', family: '睡蓮科 睡蓮屬',
    note: '多年生水生草本；白天開花的品種，花到夜間會閉合。',
    slug: 'water-lily', url: DYU_BASE + 'water-lily.html',
  },
]
