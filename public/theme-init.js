// 在 React 掛載前套用記住的主題，避免深色使用者看到白色閃爍（外部檔以符合 CSP script-src 'self'）
try { var t = localStorage.getItem('jq-theme'); if (t) document.documentElement.setAttribute('data-theme', t) } catch (e) {}
