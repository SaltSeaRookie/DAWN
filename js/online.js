'use strict';
// ===== 多人連線（第一階段）：看得到彼此、共享聊天 =====
// 只同步玩家的位置、外觀與聊天；怪物、NPC 與戰鬥仍由每位玩家各自計算，
// 所以其他玩家看起來像是「同一個世界的旅人」，但不能互相攻擊或組隊。
class RemotePlayer extends Entity {
  constructor(d) {
    super(d.x || 0, d.y || 0);
    this.kind = 'remote'; this.rid = d.id; this.name = d.name;
    this.tx = this.x; this.ty = this.y;
    this.apply(d, d.look);
  }
  apply(s, look) {
    for (const k of ['map', 'level', 'cls', 'align', 'pink', 'crown', 'clan', 'emblem', 'dead', 'hp', 'stall']) if (s[k] !== undefined) this[k] = s[k];
    if (UI.windows.stallview && UI.windows.stallview.owner === this) UI.renderStallview();
    if (s.x !== undefined) { this.tx = s.x; this.ty = s.y; }
    if (s.dir !== undefined) this.netDir = s.dir / 100;
    this.netMoving = !!s.moving;
    if (s.atk && !this.netAtk) this.atkAnim = 0;
    this.netAtk = !!s.atk;
    if (look) this.look = look;
    if (!this.look) this.look = Object.assign({}, CLASSES[this.cls] ? CLASSES[this.cls].look : CLASSES.knight.look);
  }
  update(dt) {
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
    if (d > 6) { this.x = this.tx; this.y = this.ty; }                 // 傳送或換地圖：直接跳過去
    else if (d > 0.02) {
      const sp = Math.max(3, d * 6) * dt;
      if (d <= sp) { this.x = this.tx; this.y = this.ty; } else { this.x += dx / d * sp; this.y += dy / d * sp; }
      this.walk += dt * 9;
    }
    this.moving = this.netMoving || d > 0.08;
    if (this.netDir !== undefined) this.dir = this.netDir;
    if (this.atkAnim >= 0) { this.atkAnim += dt / 0.4; if (this.atkAnim > 1) this.atkAnim = this.netAtk ? 0 : -1; }
    if (this.sayT > 0) { this.sayT -= dt; if (this.sayT <= 0) this.say = null; }
    if (this.dead) this.deadT = Math.min(1, (this.deadT || 0) + dt); else this.deadT = 0;
  }
}

const Online = {
  players: new Map(),   // 伺服器 id -> RemotePlayer
  myId: null, inWorld: false, sendT: 0, beatT: 0, last: '', lastLook: '', retrying: false,
  get active() { return Net.online && RemoteBackend.connected && this.inWorld; },
  init() {
    const R = RemoteBackend;
    R.on('join', (m) => { this.add(m.p); if (G.running) UI.log('★ ' + m.p.name + ' 上線了。', 'sys'); });
    R.on('part', (m) => { this.players.delete(m.id); if (G.running && !m.quiet) UI.log(m.name + ' 下線了。', 'sys'); });
    R.on('st', (m) => {
      const r = this.players.get(m.id);
      if (!r) { this.add(Object.assign({ id: m.id, look: m.look }, m.s)); return; }
      if (m.mapChange) { r.x = m.s.x; r.y = m.s.y; }
      r.apply(m.s, m.look);
    });
    R.on('chat', (m) => this.onChat(m));
    R.on('relay', (m) => { if (!G.running || !m.data) return; Trade.onRelay(m.from, m.fromName, m.data); Stall.onRelay(m.from, m.fromName, m.data); });
    R.on('kicked', (m) => { RemoteBackend.token = null; alert(m.reason || '你已被伺服器中斷連線。'); location.reload(); });
    R.on('close', () => this.onClose());
  },
  add(d) {
    if (!d || d.id === this.myId) return;
    const r = new RemotePlayer(d);
    this.players.set(d.id, r);
    if (typeof Names !== 'undefined') Names.add(d.name);
  },
  // 目前地圖上看得到的其他玩家
  visible() {
    if (!this.active) return [];
    const out = [];
    for (const r of this.players.values()) if (r.map === G.map.id) out.push(r);
    return out;
  },
  find(name) { const low = String(name).toLowerCase(); for (const r of this.players.values()) if (r.name.toLowerCase() === low) return r; return null; },
  snapshot() {
    const p = G.player;
    return {
      map: G.map.id, x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, dir: Math.round(p.dir * 100), moving: !!p.moving,
      atk: p.atkAnim >= 0 && p.atkAnim < 1, dead: !!p.dead, level: p.level, cls: p.cls, align: p.align, pink: p.pinkT > 0,
      crown: typeof ownsCastle === 'function' && ownsCastle(), clan: p.clan ? p.clan.name : null, emblem: p.clan ? p.clan.emblem : null,
      hp: Math.round(p.hp / p.maxHp * 100) / 100,
      stall: p.stall && p.stall.open ? { title: p.stall.title, items: p.stall.items.map((it) => ({ k: it.k, id: it.id, qty: it.qty, ench: it.ench, price: it.price })) } : null,
    };
  },
  async enter() {
    if (!Net.online) return;
    this.players.clear(); this.inWorld = false;
    const r = await RemoteBackend.call('enter', { name: G.player.name, state: this.snapshot(), look: playerLook(G.player) });
    if (!r.ok) { UI.log('無法進入線上世界：' + r.error, 'warn'); return; }
    this.myId = r.id; this.inWorld = true;
    this.lastLook = JSON.stringify(playerLook(G.player));
    for (const d of r.players) this.add(d);
    const n = r.players.length;
    UI.log('已連線到伺服器。目前線上還有 ' + n + ' 位玩家' + (n ? '：' + r.players.slice(0, 8).map((d) => d.name).join('、') + (n > 8 ? '…' : '') : '') + '。', 'sys');
    UI.log('一般聊天會傳給附近的玩家；/all 訊息 是全頻、/w 名字 訊息 是悄悄話、/who 查看線上玩家。', 'sys');
  },
  leave() {
    if (!Net.online) return;
    this.inWorld = false; this.players.clear();
    RemoteBackend.call('leave', {});
  },
  tick(dt) {
    for (const r of this.players.values()) r.update(dt);
    if (!this.active) return;
    this.sendT -= dt; this.beatT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 0.12;
    const s = this.snapshot(), key = JSON.stringify(s);
    const lookKey = JSON.stringify(playerLook(G.player));
    const lookChanged = lookKey !== this.lastLook;
    if (key === this.last && !lookChanged && this.beatT > 0) return;
    this.last = key; this.beatT = 3;
    const msg = { s };
    if (lookChanged) { this.lastLook = lookKey; msg.look = JSON.parse(lookKey); }
    RemoteBackend.post('state', msg);
  },
  relay(to, data) { if (this.active) RemoteBackend.post('relay', { to, data }); },
  // ---------- 聊天 ----------
  say(text) { if (this.active) RemoteBackend.post('chat', { ch: 'say', text }); },
  world(text) {
    if (!this.active) { UI.log('全頻聊天需要連線到伺服器。', 'warn'); return; }
    RemoteBackend.post('chat', { ch: 'world', text });
    UI.log('[全頻] ' + G.player.name + '：' + text, 'world');
  },
  whisper(name, text) {
    if (!this.active) return false;
    RemoteBackend.post('chat', { ch: 'whisper', to: name, text });
    return true;
  },
  clan(text) { if (this.active && G.player.clan) RemoteBackend.post('chat', { ch: 'clan', text }); },
  onChat(m) {
    if (!G.running) return;
    if (m.ch === 'sys') { UI.log(m.text, 'warn'); return; }
    const r = this.players.get(m.id);
    if (m.ch === 'say') { if (r) r.speak(m.text, 5); UI.log(m.from + '：' + m.text, 'chat'); }
    else if (m.ch === 'world') UI.log('[全頻] ' + m.from + '：' + m.text, 'world');
    else if (m.ch === 'whisper') { UI.log('（悄悄話）' + m.from + '：' + m.text, 'whisper'); G.lastWhisper = m.from; SFX.play('click'); }
    else if (m.ch === 'clan') UI.log('[血盟] ' + m.from + '：' + m.text, 'clan');
  },
  async who() {
    const r = await RemoteBackend.call('who', {});
    if (!r.ok) return null;
    return r.players;
  },
  // ---------- 斷線與重新連線 ----------
  async onClose() {
    if (!Net.online) return;
    const wasIn = this.inWorld;
    this.inWorld = false; this.players.clear();
    if (!G.running && !Scenes.cur) return;
    if (this.retrying) return;
    this.retrying = true;
    if (G.running) UI.log('與伺服器的連線中斷了，正在重新連線…（遊戲可以繼續，存檔會在連上後上傳）', 'warn');
    for (let i = 0; i < 20; i++) {
      await new Promise((res) => setTimeout(res, Math.min(15000, 1500 * (i + 1))));
      if (await RemoteBackend.reconnect()) {
        this.retrying = false;
        if (G.running && G.player) {
          UI.log('已重新連線到伺服器。', 'sys');
          if (wasIn || G.running) { await this.enter(); saveGame(true); }
        }
        return;
      }
    }
    this.retrying = false;
    if (G.running) UI.log('無法重新連線到伺服器。請稍後重新整理頁面（重新整理前可以先在設定中匯出角色）。', 'warn');
  },
};
