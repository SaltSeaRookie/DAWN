'use strict';
// ===== 版本檢查 =====
// 發佈新版時：同時更新這裡的 GAME_VERSION 與根目錄 version.json 的 version（以及 index.html 的 ?v= 參數）。
// 遊戲會定期讀取伺服器上的 version.json，發現比自己新的版本就自動存檔並提醒玩家重新整理。
const GAME_VERSION = '2.14.0';
const Version = {
  remote: null, notified: false,
  newer(a, b) { // a 是否比 b 新
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
    return false;
  },
  async check() {
    if (location.protocol === 'file:') return;
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.version && this.newer(d.version, GAME_VERSION)) this.notify(d);
    } catch (e) { /* 離線或找不到檔案就略過 */ }
  },
  notify(d) {
    this.remote = d;
    const inGame = typeof G !== 'undefined' && G.running;
    if (inGame) saveGame(true);
    const bar = document.getElementById('updateBar');
    bar.innerHTML = '<span>🔔 有新版本 <b>v' + d.version + '</b>（目前 v' + GAME_VERSION + '）' + (d.notes ? '：' + String(d.notes).replace(/[<>&]/g, '') : '') +
      '。' + (inGame ? '遊戲已自動存檔，' : '') + '請重新整理以更新。</span><button class="btn sm" id="btnReload">立即重新整理</button><button class="btn sm link" id="btnLater">稍後</button>';
    bar.classList.add('show');
    document.getElementById('btnReload').onclick = () => this.reload();
    document.getElementById('btnLater').onclick = () => bar.classList.remove('show');
    if (!this.notified && inGame) { UI.log('發現新版本 v' + d.version + '，遊戲已自動存檔，請重新整理頁面。', 'gm'); SFX.play('quest'); }
    this.notified = true;
  },
  reload() {
    if (typeof G !== 'undefined' && G.running) saveGame(true);
    location.reload();
  },
  start() {
    document.querySelectorAll('.verLabel').forEach((e) => { e.textContent = 'v' + GAME_VERSION; });
    this.check();
    setInterval(() => this.check(), 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(); });
  },
};
window.addEventListener('load', () => Version.start());
