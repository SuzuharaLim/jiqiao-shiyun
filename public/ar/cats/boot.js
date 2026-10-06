// boot.js — first script of every embedded 節氣貓 page (kept external for the site's CSP)
(function () {
  var q = location.search, h = document.documentElement;
  if (/[?&]embed=1/.test(q)) h.classList.add('embed');
  if (/[?&]shot=/.test(q)) h.classList.add('shot');
  if (/[?&]shot=/.test(q) && /[?&]bg=0/.test(q)) h.classList.add('alpha');
  window.addEventListener('error', function (e) {
    window.__NEKO_ERROR = String(e.message);
    if (document.body) document.body.setAttribute('data-error', e.message + (e.lineno ? ' (line ' + e.lineno + ')' : ''));
    var s = document.getElementById('status');
    if (s) { s.hidden = false; s.textContent = '3D 模型載入失敗：' + e.message; }
    try { if (window.parent !== window) window.parent.postMessage({ type: 'neko:error', message: String(e.message) }, location.origin); } catch (x) { /* ignore */ }
  });
})();
