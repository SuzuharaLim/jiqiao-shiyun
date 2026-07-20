/**
 * 漫畫閱讀器 — Google Apps Script 後端
 * ------------------------------------------------------------
 * 功能：
 *   1. 代理抓取 manhuagui（伺服器端帶 Referer/UA，繞過瀏覽器跨域與防盜連）
 *   2. 解析：列表 / 搜尋 / 作品詳情(章節) / 章節圖片清單（含 LZString + packer 解碼）
 *   3. 圖片代理：把 i.hamreus.com 圖片轉 base64 回傳（瀏覽器 <img> 無法帶 Referer，故走這裡）
 *   4. Google Sheets 儲存：搜尋紀錄 / 觀看紀錄(含進度) / 最愛 / 自訂收藏夾
 *
 * 部署：見同目錄 README.md
 */

var BASE = 'https://tw.manhuagui.com';
var IMG_HOST = 'https://i.hamreus.com';
var REFERER = 'https://www.manhuagui.com/';
var UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ============================================================
// Web App 進入點
// ============================================================
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('漫畫閱讀器')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// HTTP 抓取工具
// ============================================================
function fetch_(url, extraHeaders) {
  var headers = {
    'User-Agent': UA,
    Referer: REFERER,
    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  };
  if (extraHeaders) for (var k in extraHeaders) headers[k] = extraHeaders[k];
  var resp = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true,
    followRedirects: true,
    validateHttpsCertificates: true
  });
  return resp;
}

function fetchText_(url) {
  var resp = fetch_(url);
  var code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error('抓取失敗 (' + code + ')：' + url + '。manhuagui 可能封鎖了 Google 伺服器 IP，或該頁不存在。');
  }
  return resp.getContentText('UTF-8');
}

// ============================================================
// HTML 小工具
// ============================================================
function decodeHtml_(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, function (_, n) {
      return String.fromCharCode(parseInt(n, 10));
    });
}

function stripTags_(s) {
  return decodeHtml_((s || '').replace(/<[^>]*>/g, '')).trim();
}

// 圖網址正規化：//cf.hamreus.com/... → https://...
function fixUrl_(u) {
  if (!u) return '';
  u = u.trim();
  if (u.indexOf('data:') === 0) return ''; // 佔位圖不要
  if (u.indexOf('//') === 0) return 'https:' + u;
  if (u.indexOf('http') === 0) return u;
  return 'https://tw.manhuagui.com' + u;
}

// 從 <img ...> 標籤挑真圖網址：優先 data-src（lazy 真圖），其次 src；
// 略過 data: 佔位圖。
function pickImg_(imgTag) {
  if (!imgTag) return '';
  var candidates = ['data-src', 'data-original', 'src'];
  for (var i = 0; i < candidates.length; i++) {
    var m = imgTag.match(new RegExp(candidates[i] + '="([^"]+)"'));
    if (m && m[1].indexOf('data:') !== 0) return fixUrl_(m[1]);
  }
  return '';
}

// ============================================================
// 解析：漫畫卡片（列表 / 搜尋 共用）
// ============================================================
function parseCards_(html) {
  var out = [],
    seen = {};
  // 列表與搜尋皆為 <a class="bcover" href="/comic/ID/" title="名稱"><img src="//..."> 結構。
  // 直接抓 bcover 錨點內緊接的 <img>，避免跨到下一張卡（每個 <li> 有兩個同 id 的 <a>）。
  var re = /<a[^>]*class="bcover"[^>]*href="\/comic\/(\d+)\/"[^>]*title="([^"]*)"[^>]*>\s*(<img[^>]*>)/g;
  var m;
  while ((m = re.exec(html))) {
    var id = m[1];
    if (seen[id]) continue;
    seen[id] = 1;
    out.push({ id: id, name: decodeHtml_(m[2]), cover: pickImg_(m[3]) });
  }
  // 後備：沒有 bcover 時，只抓 id + title
  if (out.length === 0) {
    var re2 = /<a[^>]*href="\/comic\/(\d+)\/"[^>]*title="([^"]*)"/g;
    while ((m = re2.exec(html))) {
      var id2 = m[1];
      if (seen[id2]) continue;
      seen[id2] = 1;
      out.push({ id: id2, name: decodeHtml_(m[2]), cover: '' });
    }
  }
  return out;
}

// ============================================================
// API：列表（依分類/排序/頁）
// path 例：/list/view.html 或 /list/rieriji/view_p2.html
// ============================================================
function apiList(path) {
  path = path || '/list/view.html';
  if (path.indexOf('/') !== 0) path = '/' + path;
  try {
    var html = fetchText_(BASE + path);
    return { items: parseCards_(html), path: path };
  } catch (e) {
    return { items: [], path: path, error: String((e && e.message) || e) };
  }
}

// ============================================================
// API：搜尋
// ============================================================
function apiSearch(keyword) {
  keyword = (keyword || '').trim();
  if (!keyword) return { items: [], keyword: keyword };
  try {
    var url = BASE + '/s/' + encodeURIComponent(keyword) + '.html';
    var html = fetchText_(url);
    var cards = parseCards_(html);
    logSearch_(keyword, cards.length); // 寫入搜尋紀錄（失敗不影響搜尋結果）
    return { items: cards, keyword: keyword };
  } catch (e) {
    return { items: [], keyword: keyword, error: String((e && e.message) || e) };
  }
}

// ============================================================
// API：作品詳情（含章節）
// ============================================================
function apiComic(comicId) {
  comicId = String(comicId).replace(/\D/g, '');
  var url = BASE + '/comic/' + comicId + '/';
  var html = fetchText_(url);

  var name = stripTags_((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
  var cover = pickImg_((html.match(/class="hcover"[\s\S]*?(<img[^>]*>)/) || [])[1] || '');
  var intro = stripTags_((html.match(/id="intro-all"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '');
  if (!intro) intro = stripTags_((html.match(/class="intro-total"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '');

  // 章節：正常在 .chapter-list；章節多時會被壓進 #__VIEWSTATE (LZString base64)
  var listHtml = '';
  var vs = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/);
  if (vs) {
    try {
      listHtml = LZString.decompressFromBase64(vs[1]) || '';
    } catch (e) {
      listHtml = '';
    }
  }
  if (!listHtml) listHtml = html; // 未壓縮時整頁掃

  var chapters = [];
  var seen = {};
  // 只抓「本作品」的章節：comic id 必須等於 comicId，否則會誤抓頁面側欄
  // 「其他漫畫／最新更新」推薦連結（例：/comic/60551/xxxx.html）造成點了 404。
  var cre = new RegExp('<a[^>]*href="/comic/' + comicId + '/(\\d+)\\.html"[^>]*title="([^"]*)"', 'g');
  var m;
  while ((m = cre.exec(listHtml))) {
    var cid = m[1];
    if (seen[cid]) continue;
    seen[cid] = 1;
    chapters.push({ id: cid, name: decodeHtml_(m[2]) });
  }
  // manhuagui 章節在頁面是新→舊，這裡轉成舊→新(第1話在前)方便閱讀
  chapters.reverse();

  return {
    id: comicId,
    name: name,
    cover: cover,
    intro: intro,
    chapters: chapters
  };
}

// ============================================================
// packer 解碼（dean edwards p,a,c,k,e,d）
// ============================================================
function _enc(c, a) {
  return (c < a ? '' : _enc(parseInt(c / a, 10), a)) +
    ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
}

function _unpack(p, a, c, k) {
  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp('\\b' + _enc(c, a) + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

// ============================================================
// API：章節圖片清單（只回 URL，不回 base64）
// ============================================================
function apiChapter(comicId, chapterId) {
  comicId = String(comicId).replace(/\D/g, '');
  chapterId = String(chapterId).replace(/\D/g, '');
  var url = BASE + '/comic/' + comicId + '/' + chapterId + '.html';
  var html = fetchText_(url);

  // manhuagui 打包呼叫： }('P',A,C,'K'<split>,0,{})
  // <split> 可能是明碼 .split('|')，或混淆的 ['\x73...']('\x7c')（split/pipe 皆 hex 轉義）。
  // K 若為混淆(中括號)形式則是 LZString.decompressFromBase64 壓縮過的關鍵字字典。
  var re =
    /\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'((?:\.\w+)|(?:\[[\s\S]*?\]))\([\s\S]*?\),0,\{\}\)/;
  var m = html.match(re);
  if (!m) {
    throw new Error('無法解析章節圖片資料（頁面結構可能改版）。');
  }
  var p = m[1],
    a = parseInt(m[2], 10),
    c = parseInt(m[3], 10),
    kstr = m[4],
    delim = m[5];

  var k;
  if (delim.charAt(0) === '.') {
    // 明碼 .split('|')：K 就是 pipe 串接的關鍵字
    k = kstr.split('|');
  } else {
    // 混淆形式：K 為 LZString base64
    var dec = LZString.decompressFromBase64(kstr);
    if (dec == null || dec === '') dec = LZString.decompressFromEncodedURIComponent(kstr) || '';
    k = dec.split('|');
  }

  var unpacked = _unpack(p, a, c, k);
  var jm =
    unpacked.match(/SMH\.imgData\(([\s\S]*?)\)\.preInit/) ||
    unpacked.match(/imgData\(([\s\S]*?)\)/);
  if (!jm) throw new Error('解析成功但找不到圖片資料物件。');

  var data = JSON.parse(jm[1]);
  var path = data.path || '';
  var sl = data.sl || {};
  var qs = '?e=' + sl.e + '&m=' + sl.m;
  var files = (data.files || []).map(function (f) {
    // path 與檔名可能含中文，需 URL 編碼（hamreus 期待編碼後的路徑）
    return IMG_HOST + encodeURI(path + f) + qs;
  });

  return {
    comicId: comicId,
    chapterId: chapterId,
    comicName: data.bname || '',
    chapterName: data.cname || '',
    prevId: data.prevId ? String(data.prevId) : '',
    nextId: data.nextId ? String(data.nextId) : '',
    count: files.length,
    files: files
  };
}

// ============================================================
// API：圖片代理 → base64 data URI（含封面圖）
// ============================================================
function apiImage(url) {
  if (!url || !/(hamreus\.com|mhcdn|mhgui|manhuagui)/i.test(url)) {
    throw new Error('不允許的圖片來源');
  }
  var resp = fetch_(url, { Referer: REFERER, Accept: 'image/webp,image/*,*/*;q=0.8' });
  if (resp.getResponseCode() !== 200) {
    throw new Error('圖片抓取失敗 (' + resp.getResponseCode() + ')');
  }
  var blob = resp.getBlob();
  var type = blob.getContentType() || 'image/webp';
  if (type.indexOf('image') !== 0) {
    // 有些回 application/octet-stream，依副檔名補
    if (/\.webp/i.test(url)) type = 'image/webp';
    else if (/\.png/i.test(url)) type = 'image/png';
    else type = 'image/jpeg';
  }
  return 'data:' + type + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

// ============================================================
// Google Sheets 儲存層
// ============================================================
var PROP = PropertiesService.getUserProperties();

function getSS_() {
  var id = PROP.getProperty('SS_ID');
  var ss;
  if (id) {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (e) {
      ss = null;
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('漫畫閱讀器 · 資料庫');
    PROP.setProperty('SS_ID', ss.getId());
  }
  return ss;
}

function sheet_(name, headers) {
  var ss = getSS_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

var SH = {
  search: function () {
    return sheet_('搜尋紀錄', ['時間', '關鍵字', '結果數']);
  },
  view: function () {
    return sheet_('觀看紀錄', [
      '時間', '作品ID', '作品名', '章節ID', '章節名', '封面', '進度%'
    ]);
  },
  fav: function () {
    return sheet_('最愛', ['作品ID', '作品名', '封面', '加入時間']);
  },
  col: function () {
    return sheet_('收藏夾', ['收藏夾', '作品ID', '作品名', '封面', '加入時間']);
  },
  colName: function () {
    return sheet_('收藏夾名稱', ['名稱', '建立時間']);
  }
};

function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function readAll_(sh) {
  var v = sh.getDataRange().getValues();
  if (v.length <= 1) return [];
  return v.slice(1);
}

// ---- 搜尋紀錄 ----
function logSearch_(keyword, count) {
  try {
    SH.search().appendRow([now_(), keyword, count]);
  } catch (e) {}
}
function getSearchHistory() {
  var rows = readAll_(SH.search());
  return rows
    .map(function (r) {
      return { time: r[0], keyword: r[1], count: r[2] };
    })
    .reverse()
    .slice(0, 100);
}

// ---- 觀看紀錄（含閱讀進度，去重：同作品+章節更新最新一筆）----
function logView(v) {
  var sh = SH.view();
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(v.comicId) && String(rows[i][3]) === String(v.chapterId)) {
      sh.getRange(i + 1, 1, 1, 7).setValues([
        [now_(), v.comicId, v.comicName, v.chapterId, v.chapterName, v.cover || '', v.progress || 0]
      ]);
      return true;
    }
  }
  sh.appendRow([now_(), v.comicId, v.comicName, v.chapterId, v.chapterName, v.cover || '', v.progress || 0]);
  return true;
}
function getViewHistory() {
  var rows = readAll_(SH.view());
  return rows
    .map(function (r) {
      return {
        time: r[0], comicId: String(r[1]), comicName: r[2],
        chapterId: String(r[3]), chapterName: r[4], cover: r[5], progress: r[6]
      };
    })
    .reverse()
    .slice(0, 200);
}
// 取某作品最後閱讀章節與進度（續讀用）
function getResume(comicId) {
  var rows = readAll_(SH.view());
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1]) === String(comicId)) {
      return { chapterId: String(rows[i][3]), chapterName: rows[i][4], progress: rows[i][6] };
    }
  }
  return null;
}

// ---- 最愛 ----
function getFavorites() {
  var rows = readAll_(SH.fav());
  return rows.map(function (r) {
    return { id: String(r[0]), name: r[1], cover: r[2], time: r[3] };
  }).reverse();
}
function isFavorite(comicId) {
  var rows = readAll_(SH.fav());
  return rows.some(function (r) {
    return String(r[0]) === String(comicId);
  });
}
function toggleFavorite(comic) {
  var sh = SH.fav();
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(comic.id)) {
      sh.deleteRow(i + 1);
      return { favorited: false };
    }
  }
  sh.appendRow([comic.id, comic.name, comic.cover || '', now_()]);
  return { favorited: true };
}

// ---- 收藏夾 ----
function getCollectionNames() {
  var rows = readAll_(SH.colName());
  return rows.map(function (r) {
    return { name: r[0], time: r[1] };
  });
}
function createCollection(name) {
  name = (name || '').trim();
  if (!name) throw new Error('請輸入收藏夾名稱');
  var rows = readAll_(SH.colName());
  if (rows.some(function (r) { return r[0] === name; })) {
    throw new Error('已有同名收藏夾');
  }
  SH.colName().appendRow([name, now_()]);
  return getCollectionNames();
}
function deleteCollection(name) {
  // 刪名稱 + 該收藏夾底下所有項目
  var nsh = SH.colName();
  var nrows = nsh.getDataRange().getValues();
  for (var i = nrows.length - 1; i >= 1; i--) {
    if (nrows[i][0] === name) nsh.deleteRow(i + 1);
  }
  var csh = SH.col();
  var crows = csh.getDataRange().getValues();
  for (var j = crows.length - 1; j >= 1; j--) {
    if (crows[j][0] === name) csh.deleteRow(j + 1);
  }
  return getCollections();
}
function addToCollection(name, comic) {
  var csh = SH.col();
  var rows = readAll_(csh);
  var exists = rows.some(function (r) {
    return r[0] === name && String(r[1]) === String(comic.id);
  });
  if (!exists) {
    csh.appendRow([name, comic.id, comic.name, comic.cover || '', now_()]);
  }
  return getCollections();
}
function removeFromCollection(name, comicId) {
  var csh = SH.col();
  var rows = csh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === name && String(rows[i][1]) === String(comicId)) {
      csh.deleteRow(i + 1);
    }
  }
  return getCollections();
}
// 回傳 { 名稱: [items] } 結構（含空收藏夾）
function getCollections() {
  var names = getCollectionNames();
  var out = {};
  names.forEach(function (n) {
    out[n.name] = [];
  });
  var rows = readAll_(SH.col());
  rows.forEach(function (r) {
    var cn = r[0];
    if (!out[cn]) out[cn] = [];
    out[cn].push({ id: String(r[1]), name: r[2], cover: r[3], time: r[4] });
  });
  return { names: names.map(function (n) { return n.name; }), map: out };
}

// ---- 清除紀錄 ----
function clearHistory(type) {
  var sh = type === 'search' ? SH.search() : SH.view();
  var last = sh.getLastRow();
  if (last > 1) sh.deleteRows(2, last - 1);
  return true;
}

// ---- 首次載入：一次拉回書架/歷史所需狀態 ----
function bootstrap() {
  return {
    favorites: getFavorites(),
    collections: getCollections(),
    ssUrl: getSS_().getUrl()
  };
}


/**
 * lz-string 1.4.4 (decompress subset) — © 2013 pieroxy, WTFPL/MIT。
 * manhuagui 章節頁把「圖片檔名字典」用 LZString.decompressFromBase64 壓縮，
 * 所以解章節圖片一定要用到這支。這裡只保留解壓相關函式（伺服器端不需壓縮）。
 */
var LZString = (function () {
  var f = String.fromCharCode;
  var keyStrBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var keyStrUriSafe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
  var baseReverseDic = {};

  function getBaseValue(alphabet, character) {
    if (!baseReverseDic[alphabet]) {
      baseReverseDic[alphabet] = {};
      for (var i = 0; i < alphabet.length; i++) {
        baseReverseDic[alphabet][alphabet.charAt(i)] = i;
      }
    }
    return baseReverseDic[alphabet][character];
  }

  var LZString = {
    decompressFromBase64: function (input) {
      if (input == null) return '';
      if (input == '') return null;
      return LZString._decompress(input.length, 32, function (index) {
        return getBaseValue(keyStrBase64, input.charAt(index));
      });
    },

    decompressFromEncodedURIComponent: function (input) {
      if (input == null) return '';
      if (input == '') return null;
      input = input.replace(/ /g, '+');
      return LZString._decompress(input.length, 32, function (index) {
        return getBaseValue(keyStrUriSafe, input.charAt(index));
      });
    },

    decompress: function (compressed) {
      if (compressed == null) return '';
      if (compressed == '') return null;
      return LZString._decompress(compressed.length, 32768, function (index) {
        return compressed.charCodeAt(index);
      });
    },

    _decompress: function (length, resetValue, getNextValue) {
      var dictionary = [],
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = '',
        result = [],
        i,
        w,
        bits,
        resb,
        maxpower,
        power,
        c,
        data = { val: getNextValue(0), position: resetValue, index: 1 };

      for (i = 0; i < 3; i += 1) dictionary[i] = i;

      bits = 0;
      maxpower = Math.pow(2, 2);
      power = 1;
      while (power != maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = f(bits);
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = f(bits);
          break;
        case 2:
          return '';
      }
      dictionary[3] = c;
      w = c;
      result.push(c);
      while (true) {
        if (data.index > length) return '';

        bits = 0;
        maxpower = Math.pow(2, numBits);
        power = 1;
        while (power != maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }

        switch ((c = bits)) {
          case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            dictionary[dictSize++] = f(bits);
            c = dictSize - 1;
            enlargeIn--;
            break;
          case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            dictionary[dictSize++] = f(bits);
            c = dictSize - 1;
            enlargeIn--;
            break;
          case 2:
            return result.join('');
        }

        if (enlargeIn == 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }

        if (dictionary[c]) {
          entry = dictionary[c];
        } else {
          if (c === dictSize) {
            entry = w + w.charAt(0);
          } else {
            return null;
          }
        }
        result.push(entry);

        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;

        w = entry;

        if (enlargeIn == 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }
      }
    }
  };
  return LZString;
})();
