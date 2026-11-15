'use strict';
// ===== 介面 =====
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mob = () => window.innerWidth < 760;

function iconCanvas(id, size, kind = 'item') {
  const c = makeCanvas(size * 2, size * 2);
  c.style.width = size + 'px'; c.style.height = size + 'px';
  const g = c.getContext('2d'); g.scale(2, 2);
  if (kind === 'item') drawItemIcon(g, id, 0, 0, size);
  else if (kind === 'spell') drawSkillIcon(g, SPELLS[id] ? SPELLS[id].icon : id, 0, 0, size);
  else drawSkillIcon(g, id, 0, 0, size);
  return c;
}

const UI = {
  windows: {}, drag: null,
  init() {
    const menu = [['btnInv', 'inv'], ['btnChar', 'char'], ['btnSpell', 'spell'], ['btnClan', 'clan'], ['btnMap', 'map'], ['btnSet', 'settings']];
    for (const [b, w] of menu) $('#' + b).onclick = () => { SFX.play('click'); this.toggle(w); };
    const bm = $('#btnMusic'), bs = $('#btnSfx');
    const sync = () => {
      bm.classList.toggle('off', !Snd.musicOn); bm.title = '背景音樂：' + (Snd.musicOn ? '開' : '關');
      bs.classList.toggle('off', !Snd.sfxOn); bs.title = '音效：' + (Snd.sfxOn ? '開' : '關');
      if (this.windows.settings) this.renderSettings();
    };
    this.syncAudio = sync;
    bm.onclick = () => { Snd.unlock(); Snd.setMusic(!Snd.musicOn); sync(); };
    bs.onclick = () => { Snd.unlock(); Snd.setSfx(!Snd.sfxOn); sync(); SFX.play('click'); };
    sync();
    const ci = $('#chatInput');
    ci.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const v = ci.value.trim(); ci.value = ''; if (v) this.chat(v); ci.blur(); }
      else if (e.key === 'Escape') ci.blur();
    });
    // 拖曳到快捷列
    window.addEventListener('pointermove', (e) => this.dragMove(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));
  },
  enterGame() {
    document.body.classList.add('in-game');
    $('#chatLog').innerHTML = '';
    this.buildHotbar();
    this._buffSig = null;
  },
  leaveGame() { document.body.classList.remove('in-game'); this.closeAll(); },

  // ---------- 快捷列 ----------
  buildHotbar() {
    const hb = $('#hotbar'); hb.innerHTML = '';
    const p = G.player;
    for (let i = 0; i < 10; i++) {
      const h = p.hotbar[i];
      const s = el('div', 'slot hot');
      s.dataset.hot = i;
      if (h) {
        if (h.kind === 'item') s.appendChild(iconCanvas(h.id, 34));
        else if (h.kind === 'spell') s.appendChild(iconCanvas(h.id, 34, 'spell'));
        else s.appendChild(iconCanvas('auto', 34, 'skill'));
        s.title = h.kind === 'item' ? ITEMS[h.id].name : h.kind === 'spell' ? SPELLS[h.id].name + '（MP ' + SPELLS[h.id].mp + '）' : '自動狩獵';
      } else s.title = '把背包或魔法視窗的圖示拖到這裡';
      s.appendChild(el('span', 'key', String((i + 1) % 10)));
      const q = el('span', 'qty'); s.appendChild(q);
      s.addEventListener('click', () => useHotbar(i));
      s.addEventListener('contextmenu', (e) => { e.preventDefault(); p.hotbar[i] = null; this.buildHotbar(); });
      hb.appendChild(s);
    }
    this.refreshHotbar();
  },
  refreshHotbar() {
    const p = G.player; if (!p) return;
    document.querySelectorAll('#hotbar .slot').forEach((s) => {
      const h = p.hotbar[+s.dataset.hot], q = s.querySelector('.qty');
      if (!h) { s.classList.add('empty'); q.textContent = ''; return; }
      if (h.kind === 'item') { const n = countItem(h.id); q.textContent = n || ''; s.classList.toggle('empty', !n); }
      else if (h.kind === 'spell') { const ok = p.spells.includes(h.id); s.classList.toggle('empty', !ok || p.mp < SPELLS[h.id].mp); q.textContent = ok ? '' : '未學'; }
      else { q.textContent = G.autoHunt ? 'ON' : ''; s.classList.toggle('on', G.autoHunt); s.classList.remove('empty'); }
    });
  },
  dragStart(e, entry, iconEl) {
    this.drag = { entry, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, iconEl };
  },
  dragMove(e) {
    const d = this.drag; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) {
      d.moved = true;
      d.ghost = el('div', 'drag-ghost');
      d.ghost.appendChild(d.entry.kind === 'item' ? iconCanvas(d.entry.id, 34) : iconCanvas(d.entry.id, 34, 'spell'));
      document.body.appendChild(d.ghost);
      this.hideTip();
    }
    if (d.ghost) { d.ghost.style.left = e.clientX - 18 + 'px'; d.ghost.style.top = e.clientY - 18 + 'px'; }
  },
  dragEnd(e) {
    const d = this.drag; if (!d) return;
    this.drag = null;
    if (d.ghost) {
      d.ghost.remove();
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const slot = t && t.closest('#hotbar .slot');
      if (slot) { G.player.hotbar[+slot.dataset.hot] = d.entry; this.buildHotbar(); SFX.play('click'); }
      d.cancelClick = true;
    }
    this.lastDrag = d;
  },
  wasDrag() { const d = this.lastDrag; this.lastDrag = null; return d && d.moved; },

  // ---------- 訊息 ----------
  log(text, cls) {
    if (!text) return;
    const box = $('#chatLog');
    const line = el('div', 'ln ' + (cls || ''));
    line.textContent = text;
    box.appendChild(line);
    while (box.children.length > 100) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  },
  chat(v) {
    const p = G.player;
    if (v === '/help') { this.help(); return; }
    if (v === '/save') { saveGame(false); return; }
    if (v === '/pos') { this.log(G.map.id + ' (' + p.x.toFixed(1) + ', ' + p.y.toFixed(1) + ')', 'sys'); return; }
    p.speak(v, 5);
    this.log(p.name + '：' + v, 'me');
    const near = G.map.actors.filter((a) => (a.kind === 'villager' || a.kind === 'fighter' || a.kind === 'ally') && !a.dead && dist(a.x, a.y, p.x, p.y) < 10);
    if (near.length && /(哈囉|你好|嗨|hi|hello|安安)/i.test(v)) later(1.5, () => { const o = pick(near); o.speak('你好呀～', 3); this.log(o.name + '：你好呀～', 'chat'); });
  },
  focusChat() { $('#chatInput').focus(); },
  blurChat() { $('#chatInput').blur(); },
  chatFocused() { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); },

  zone(name, safe) {
    $('#zoneLabel').textContent = name;
    const zt = $('#zoneType');
    zt.textContent = safe ? '安全區域' : G.world.ambient ? '危險區域' : '一般區域';
    zt.className = safe ? 'safe' : G.world.ambient ? 'danger' : '';
    const big = $('#zoneBanner');
    big.textContent = name; big.classList.remove('show'); void big.offsetWidth; big.classList.add('show');
  },

  refresh() {
    const p = G.player; if (!p || !p.d.st) return;
    $('#hpFill').style.width = (100 * p.hp / p.maxHp) + '%';
    $('#mpFill').style.width = (100 * p.mp / p.maxMp) + '%';
    $('#hpText').textContent = 'HP ' + Math.ceil(p.hp) + ' / ' + p.maxHp;
    $('#mpText').textContent = 'MP ' + Math.floor(p.mp) + ' / ' + p.maxMp;
    const need = expForLevel(p.level);
    $('#lvText').textContent = 'Lv.' + p.level;
    $('#expText').textContent = (100 * p.exp / need).toFixed(4) + '%';
    $('#expFill').style.width = (100 * p.exp / need) + '%';
    $('#acText').textContent = p.d.ac;
    $('#mrText').textContent = p.d.mr + '%';
    const wp = weightPct(p);
    $('#wtText').textContent = wp + '%';
    $('#wtFill').style.width = Math.min(100, wp) + '%';
    $('#wtFill').className = wp >= 100 ? 'over' : wp >= 50 ? 'heavy' : '';
    $('#goldText').textContent = p.gold.toLocaleString();
    $('#alignName').textContent = alignName(p.align);
    $('#alignName').style.color = alignColor(p.align);
    $('#alignText').textContent = p.align;
    const af = (p.align + 32768) / 65535;
    $('#alignFill').style.width = (af * 100) + '%';
    $('#alignFill').style.background = p.align < 0 ? 'linear-gradient(#b03020,#601008)' : 'linear-gradient(#3a6ab0,#1a3a70)';
    $('#btnChar').classList.toggle('alert', p.statPoints > 0);
    this.refreshHotbar();
    for (const k of ['inv', 'char', 'spell', 'clan', 'shop', 'wh']) if (this.windows[k]) this['render' + k[0].toUpperCase() + k.slice(1)]();
  },

  tick(dt) {
    const p = G.player;
    const keys = Object.keys(p.buffs);
    const sig = keys.map((k) => k + Math.ceil(p.buffs[k])).join() + '|' + Math.ceil(p.pinkT);
    if (sig !== this._buffSig) {
      this._buffSig = sig;
      const bf = $('#buffs'); bf.innerHTML = '';
      for (const k of keys) {
        const b = el('div', 'buff');
        b.appendChild(iconCanvas(SPELLS[k] ? SPELLS[k].icon : k, 30, 'skill'));
        const s = Math.ceil(p.buffs[k]);
        b.appendChild(el('span', '', s >= 60 ? Math.ceil(s / 60) + 'm' : s + 's'));
        b.title = SPELLS[k] ? SPELLS[k].name : k === 'haste' ? '加速' : k;
        bf.appendChild(b);
      }
      if (p.pinkT > 0) { const b = el('div', 'buff pink', '<em>PK</em>'); b.appendChild(el('span', '', Math.ceil(p.pinkT) + 's')); bf.appendChild(b); }
    }
    this.slowT = (this.slowT || 0) + dt;
    if (this.slowT > 0.25) {
      this.slowT = 0;
      $('#hpFill').style.width = (100 * p.hp / p.maxHp) + '%';
      $('#mpFill').style.width = (100 * p.mp / p.maxMp) + '%';
      $('#hpText').textContent = 'HP ' + Math.ceil(p.hp) + ' / ' + p.maxHp;
      $('#mpText').textContent = 'MP ' + Math.floor(p.mp) + ' / ' + p.maxMp;
      $('#hpFill').classList.toggle('low', p.hp / p.maxHp < 0.3);
      const b = daylight();
      $('#dayIcon').textContent = G.world.ambient ? '☗' : b > 0.45 ? '☀' : '☾';
      $('#dayFill').style.width = (G.day * 100) + '%';
      if (!$('#minimapWrap').classList.contains('hide')) drawMinimap($('#minimap'));
      this.refreshHotbar();
      // 攻城戰／突襲狀態
      const st = $('#siegeBar');
      const s = G.siege;
      if (s && s.active) {
        const m = G.maps.overworld;
        st.style.display = 'block';
        st.innerHTML = '⚔ 攻城戰 ' + Math.floor(s.t / 60) + ':' + String(Math.floor(s.t % 60)).padStart(2, '0') +
          '　城門 ' + (m.gate.broken ? '已攻破' : Math.ceil(100 * m.gate.hp / m.gate.maxHp) + '%') + '　守護之塔 ' + Math.ceil(100 * m.tower.hp / m.tower.maxHp) + '%';
      } else if (G.raid) {
        const m = G.maps.overworld;
        st.style.display = 'block'; st.innerHTML = '⚠ ' + ENEMY_CLAN + ' 突襲中！守護之塔 ' + Math.ceil(100 * m.tower.hp / m.tower.maxHp) + '%';
      } else st.style.display = 'none';
      if (this.windows.map) drawWorldMap(this.windows.map.cv);
    }
  },
  toggleMinimap() { $('#minimapWrap').classList.toggle('hide'); },

  // ---------- 視窗 ----------
  win(id, title, x, y, w) {
    if (this.windows[id]) return this.windows[id];
    const d = el('div', 'win');
    if (mob()) { x = 6; y = 50; w = Math.min(w || 300, window.innerWidth - 12); }
    d.style.left = clamp(x, 0, window.innerWidth - (w || 300)) + 'px'; d.style.top = y + 'px'; if (w) d.style.width = w + 'px';
    const head = el('div', 'win-h', '<span>' + esc(title) + '</span>');
    const close = el('button', 'win-x', 'Close');
    close.onclick = () => { SFX.play('click'); this.close(id); };
    head.appendChild(close);
    const body = el('div', 'win-b');
    d.appendChild(head); d.appendChild(body);
    let drag = null;
    head.addEventListener('pointerdown', (e) => { if (e.target === close) return; drag = [e.clientX - d.offsetLeft, e.clientY - d.offsetTop]; head.setPointerCapture(e.pointerId); this.front(d); });
    head.addEventListener('pointermove', (e) => { if (drag) { d.style.left = clamp(e.clientX - drag[0], 0, window.innerWidth - 80) + 'px'; d.style.top = clamp(e.clientY - drag[1], 0, window.innerHeight - 40) + 'px'; } });
    head.addEventListener('pointerup', () => { drag = null; });
    d.addEventListener('pointerdown', () => this.front(d));
    $('#windows').appendChild(d);
    this.front(d);
    SFX.play('open');
    this.windows[id] = { el: d, body };
    return this.windows[id];
  },
  front(d) { this.z = (this.z || 20) + 1; d.style.zIndex = this.z; },
  close(id) { const w = this.windows[id]; if (w) { w.el.remove(); delete this.windows[id]; } this.hideTip(); },
  closeAll() { for (const k in this.windows) this.close(k); },
  toggle(id) {
    if (this.windows[id]) { this.close(id); return; }
    const W = window.innerWidth;
    if (id === 'inv') { this.win('inv', '背包', W - 330, 60, 316); this.renderInv(); }
    if (id === 'char') { this.win('char', '角色資訊', 16, 60, 340); this.renderChar(); }
    if (id === 'spell') { this.win('spell', '魔法', W - 330 - (this.windows.inv ? 330 : 0), 60, 300); this.renderSpell(); }
    if (id === 'clan') { this.win('clan', '血盟', 370, 60, 320); this.renderClan(); }
    if (id === 'settings') { this.win('settings', '設定', W / 2 - 160, 80, 320); this.renderSettings(); }
    if (id === 'map') {
      const w = Math.min(860, W - 20), h = Math.min(540, window.innerHeight - HUD_H() - 110);
      const win = this.win('map', '世界地圖', (W - w) / 2, 40, w);
      const cv = makeCanvas(w - 22, h); cv.className = 'mapcv'; win.body.appendChild(cv); win.cv = cv;
      win.body.appendChild(el('div', 'dim small', G.map.id === 'overworld' ? '紅點為你的位置。' : '你目前在地下墓穴中。'));
      drawWorldMap(cv);
    }
  },

  slotEl(inst, onClick, opts = {}) {
    const s = el('div', 'slot');
    if (inst) {
      s.appendChild(iconCanvas(inst.id, opts.size || 34));
      if (inst.qty > 1) s.appendChild(el('span', 'qty', inst.qty > 9999 ? Math.floor(inst.qty / 1000) + 'k' : inst.qty));
      if (inst.ench) s.appendChild(el('span', 'ench', '+' + inst.ench));
      s.addEventListener('mouseenter', (e) => this.showTip(inst, e));
      s.addEventListener('mouseleave', () => this.hideTip());
      if (opts.drag) s.addEventListener('pointerdown', (e) => { if (e.button === 0) this.dragStart(e, { kind: 'item', id: inst.id }); });
      if (onClick) s.addEventListener('click', () => { if (this.wasDrag()) return; this.hideTip(); onClick(inst); });
      if (opts.right) s.addEventListener('contextmenu', (e) => { e.preventDefault(); this.hideTip(); opts.right(inst); });
    }
    return s;
  },
  showTip(inst, e) {
    const d = ITEMS[inst.id], p = G.player;
    let h = '<b class="' + (d.rare ? 'rare' : '') + '">' + esc(itemName(inst)) + '</b>';
    if (d.type === 'weapon') {
      h += '<div>攻擊力 ' + (d.dmg[0] + (inst.ench || 0)) + '-' + (d.dmg[1] + (inst.ench || 0)) + (d.dmgB ? '　額外傷害 +' + d.dmgB : '') + (d.hit ? '　命中 +' + d.hit : '') + '</div>';
      h += '<div>' + (d.ranged ? '遠程（射程 ' + d.range + '，需要箭）' : '近戰') + (d.twoHand ? '・雙手' : '・單手') + '　攻速 ' + d.spd + '</div>';
      if (d.undeadB) h += '<div>對亡靈 +' + d.undeadB + '</div>';
    }
    if (d.ac) h += '<div>防禦 AC ' + (d.ac + (d.type === 'armor' ? inst.ench || 0 : 0)) + '</div>';
    if (d.mr) h += '<div>魔法防禦 +' + d.mr + '</div>';
    if (d.sp) h += '<div>魔攻 +' + d.sp + '</div>';
    if (d.er) h += '<div>迴避 +' + d.er + '</div>';
    if (d.hp) h += '<div>體力上限 +' + d.hp + '</div>';
    if (d.mp) h += '<div>魔力上限 +' + d.mp + '</div>';
    if (d.weight) h += '<div>負重上限 +' + d.weight + '</div>';
    if (d.stat) h += '<div>' + Object.keys(d.stat).map((k) => STAT_NAMES[k] + ' +' + d.stat[k]).join('　') + '</div>';
    if (d.res) h += '<div>' + Object.keys(d.res).map((k) => ({ earth: '地', water: '水', fire: '火', wind: '風' }[k]) + '屬性抗性 +' + d.res[k] + '%').join('　') + '</div>';
    if (d.type === 'weapon' || d.type === 'armor') h += '<div class="dim">安全強化值 +' + d.safe + '</div>';
    if (d.cls) h += '<div class="' + (p && !d.cls.includes(p.cls) ? 'bad' : 'dim') + '">可使用：' + d.cls.map((c) => CLASSES[c].name).join('、') + '</div>';
    if (d.lvl) h += '<div class="' + (p && p.level < d.lvl ? 'bad' : 'dim') + '">需要等級 ' + d.lvl + '</div>';
    if (d.type === 'book' && p) { const need = SPELLS[d.spell].learn[p.cls]; h += '<div class="' + (need === undefined || p.level < need ? 'bad' : 'dim') + '">' + (need === undefined ? CLASSES[p.cls].name + '無法學習' : '學習等級 ' + need) + '</div>'; }
    if (d.desc) h += '<div class="dim">' + esc(d.desc) + '</div>';
    h += '<div class="dim">重量 ' + (Math.round(itemWeight(inst) * 10) / 10) + '　售價 ' + sellPrice(inst) + '</div>';
    const t = $('#tip'); t.innerHTML = h; t.style.display = 'block';
    const r = e.target.getBoundingClientRect();
    t.style.left = clamp(r.left - 10, 4, window.innerWidth - 240) + 'px';
    t.style.top = Math.max(4, r.top - t.offsetHeight - 6) + 'px';
  },
  hideTip() { $('#tip').style.display = 'none'; },

  renderInv() {
    const w = this.windows.inv; if (!w) return;
    const p = G.player;
    w.body.innerHTML = '';
    const grid = el('div', 'grid');
    for (let i = 0; i < 48; i++) {
      const inst = p.inv[i];
      grid.appendChild(this.slotEl(inst, (it) => { if (this.dropMode) { this.dropMode = false; this.askDrop(it); } else useItem(it); }, { drag: true, right: (it) => this.askDrop(it) }));
    }
    w.body.appendChild(grid);
    const wp = weightPct(p);
    const foot = el('div', 'inv-foot2');
    foot.innerHTML = '<div class="wt"><span>負重 ' + p.d.weight + ' / ' + p.d.weightMax + '</span><div class="wtbar"><div class="' + (wp >= 100 ? 'over' : wp >= 50 ? 'heavy' : '') + '" style="width:' + Math.min(100, wp) + '%"></div></div></div>' +
      '<div class="gold">金幣 <b>' + p.gold.toLocaleString() + '</b></div>';
    const tools = el('div', 'inv-tools');
    const bSort = el('button', 'btn sm', '整理'); bSort.onclick = () => { p.inv.sort((a, b) => ({ weapon: 0, armor: 1, acc: 2, consume: 3, ammo: 4, book: 5, junk: 6 }[ITEMS[a.id].type] - { weapon: 0, armor: 1, acc: 2, consume: 3, ammo: 4, book: 5, junk: 6 }[ITEMS[b.id].type]) || a.id.localeCompare(b.id)); this.renderInv(); };
    const bDrop = el('button', 'btn sm' + (this.dropMode ? ' on' : ''), '🗑 丟棄'); bDrop.onclick = () => { this.dropMode = !this.dropMode; this.renderInv(); if (this.dropMode) this.log('點擊要丟棄的物品。', 'sys'); };
    tools.appendChild(bSort); tools.appendChild(bDrop);
    tools.appendChild(el('span', 'dim small', '點擊使用／裝備・右鍵丟棄・拖曳到快捷列'));
    w.body.appendChild(foot); w.body.appendChild(tools);
  },
  askDrop(inst) {
    let q = inst.qty;
    if (inst.qty > 1) { const v = prompt('要丟棄多少個 ' + ITEMS[inst.id].name + '？（最多 ' + inst.qty + '）', inst.qty); if (v === null) return; q = clamp(parseInt(v, 10) || 0, 0, inst.qty); if (!q) return; }
    else if (ITEMS[inst.id].rare || inst.ench) { if (!confirm('確定要丟棄 ' + itemName(inst) + ' 嗎？')) return; }
    dropFromInv(inst, q);
  },

  renderChar() {
    const w = this.windows.char; if (!w) return;
    const p = G.player, d = p.d, wd = p.weaponDef, st = d.st;
    const ench = p.equip.weapon ? p.equip.weapon.ench || 0 : 0;
    w.body.innerHTML = '';
    const top = el('div', 'cw-top');
    const need = expForLevel(p.level);
    top.innerHTML = '<div class="cw-name"><b style="color:' + nameColor(p) + '">' + esc(p.name) + '</b><span>' + CLASSES[p.cls].name + '・Lv.' + p.level + '</span></div>' +
      '<div class="cw-exp"><div style="width:' + (100 * p.exp / need) + '%"></div><span>經驗值 ' + (100 * p.exp / need).toFixed(2) + '%</span></div>';
    w.body.appendChild(top);
    const cols = el('div', 'cw-cols');
    // 左：數值
    const left = el('div', 'cw-left');
    const row = (k, v, cls) => '<div class="row ' + (cls || '') + '"><span>' + k + '</span><b>' + v + '</b></div>';
    let h = row('體力', Math.ceil(p.hp) + ' / ' + p.maxHp) + row('魔力', Math.floor(p.mp) + ' / ' + p.maxMp) + row('防禦 AC', d.ac) + row('負重', weightPct(p) + '%');
    h += '<div class="sep"></div>';
    left.innerHTML = h;
    const stb = el('div', 'cw-stats');
    for (const s of STATS) {
      const r = el('div', 'row');
      const bonus = st[s] - p.base[s];
      r.innerHTML = '<span>' + STAT_SHORT[s] + ' <i>' + STAT_NAMES[s] + '</i></span><b>' + st[s] + (bonus ? '<em>+' + bonus + '</em>' : '') + '</b>';
      if (p.statPoints > 0 && p.base[s] < 30) {
        const b = el('button', 'plus', '＋'); b.title = '分配 1 點';
        b.onclick = () => { p.base[s]++; p.statPoints--; recalc(); SFX.play('click'); this.refresh(); };
        r.appendChild(b);
      }
      stb.appendChild(r);
    }
    left.appendChild(stb);
    if (p.statPoints > 0) left.appendChild(el('div', 'pts', '可分配點數：' + p.statPoints));
    const more = el('div');
    const dmgLo = wd.dmg[0] + d.dmgB + Math.floor(p.level / 4) + (wd.ranged ? Math.floor(statMod(st.dex) * 0.8) : statMod(st.str));
    more.innerHTML = '<div class="sep"></div>' + row('攻擊力', Math.max(1, dmgLo) + ' - ' + Math.max(1, dmgLo + wd.dmg[1] - wd.dmg[0])) + row('攻擊方式', wd.ranged ? '遠程' : '近戰') +
      row('魔法等級', d.mlevel) + row('魔攻加成', (d.sp >= 0 ? '+' : '') + d.sp) + row('魔法防禦', d.mr + '%') + row('迴避 ER', d.er) +
      '<div class="sep"></div><div class="res">' + [['earth', '地'], ['water', '水'], ['fire', '火'], ['wind', '風']].map(([k, n]) => '<span>' + n + ' <b>' + d.res[k] + '%</b></span>').join('') + '</div>' +
      '<div class="sep"></div>' + row('善惡值', '<i style="color:' + alignColor(p.align) + '">' + alignName(p.align) + ' ' + p.align + '</i>') + row('擊殺數', p.kills) + (p.pkCount ? row('PK 次數', p.pkCount, 'bad') : '');
    left.appendChild(more);
    // 右：裝備欄（紙娃娃）
    const right = el('div', 'cw-doll');
    const layout = { helm: [1, 0], amulet: [2, 0], cloak: [0, 1], armor: [1, 1], shield: [2, 1], weapon: [0, 2], gloves: [1, 2], belt: [2, 2], ring1: [0, 3], boots: [1, 3], ring2: [2, 3] };
    for (const s of SLOTS) {
      const [cx, cy] = layout[s];
      const box = el('div', 'eqs');
      box.style.gridColumn = cx + 1; box.style.gridRow = cy + 1;
      const sl = this.slotEl(p.equip[s], () => unequip(s));
      if (!p.equip[s]) sl.appendChild(el('span', 'eqlabel', SLOT_NAMES[s]));
      box.appendChild(sl);
      right.appendChild(box);
    }
    cols.appendChild(left); cols.appendChild(right);
    w.body.appendChild(cols);
    w.body.appendChild(el('div', 'dim small', '點擊裝備欄可卸下。每 5 級獲得 1 點能力值。'));
  },

  renderSpell() {
    const w = this.windows.spell; if (!w) return;
    const p = G.player;
    w.body.innerHTML = '';
    const grid = el('div', 'grid sgrid');
    const list = Object.keys(SPELLS).filter((s) => SPELLS[s].learn[p.cls] !== undefined).sort((a, b) => SPELLS[a].circle - SPELLS[b].circle || SPELLS[a].learn[p.cls] - SPELLS[b].learn[p.cls]);
    for (const id of list) {
      const s = SPELLS[id], has = p.spells.includes(id);
      const c = el('div', 'slot' + (has ? '' : ' locked'));
      c.appendChild(iconCanvas(id, 34, 'spell'));
      c.appendChild(el('span', 'qty', s.mp));
      c.addEventListener('mouseenter', (e) => {
        const t = $('#tip');
        t.innerHTML = '<b>' + s.name + '</b><div>第 ' + s.circle + ' 階　消耗 MP ' + s.mp + '</div><div>' + esc(s.desc) + '</div>' + (s.dur ? '<div class="dim">持續 ' + s.dur + ' 秒</div>' : '') +
          (has ? '<div class="dim">點擊施放・拖曳到快捷列</div>' : '<div class="bad">尚未學會（Lv.' + s.learn[p.cls] + ' 可學，需要魔法書）</div>');
        t.style.display = 'block'; const r = e.target.getBoundingClientRect();
        t.style.left = clamp(r.left - 10, 4, window.innerWidth - 240) + 'px'; t.style.top = Math.max(4, r.top - t.offsetHeight - 6) + 'px';
      });
      c.addEventListener('mouseleave', () => this.hideTip());
      if (has) {
        c.addEventListener('pointerdown', (e) => { if (e.button === 0) this.dragStart(e, { kind: 'spell', id }); });
        c.addEventListener('click', () => { if (this.wasDrag()) return; this.hideTip(); castSpell(id); });
      }
      grid.appendChild(c);
    }
    w.body.appendChild(grid);
    const f = el('div', 'spell-foot');
    f.innerHTML = '<span>S.power 魔攻 <b>' + p.d.sp + '</b></span><span>M.resist 魔防 <b>' + p.d.mr + '%</b></span><span>魔法等級 <b>' + p.d.mlevel + '</b></span>';
    w.body.appendChild(f);
    w.body.appendChild(el('div', 'dim small', '灰色為尚未學會的魔法。到魔法商人購買魔法書學習，高階魔法書需要從強大的怪物身上取得。'));
  },

  renderClan() {
    const w = this.windows.clan; if (!w) return;
    const p = G.player, c = p.clan;
    w.body.innerHTML = '';
    if (!c) {
      w.body.innerHTML = '<div class="npc-text">你還沒有加入血盟。<br>到<b>晨風村</b>找<b>血盟管理員 莫里斯</b>，等級 5 並支付 3000 金幣就能建立自己的血盟。<br><br>有了血盟後，可以在村莊裡邀請冒險者加入，並向<b>灰岩城</b>宣戰。</div>';
      return;
    }
    const head = el('div', 'clan-head');
    const cv = makeCanvas(48, 48); const g = cv.getContext('2d'); drawEmblem(g, c.emblem, 0, 0, 48);
    head.appendChild(cv);
    head.appendChild(el('div', '', '<b class="cname">' + esc(c.name) + '</b><div class="dim">盟主：' + esc(p.name) + '　成員 ' + (c.members.length + 1) + ' / ' + (clanCap() + 1) + '</div>' + (ownsCastle() ? '<div class="gold">♔ 灰岩城城主</div>' : '')));
    w.body.appendChild(head);
    const list = el('div', 'list');
    list.appendChild(el('div', 'li', '<div class="li-n"><b>' + esc(p.name) + '</b><span class="dim">盟主・' + CLASSES[p.cls].name + ' Lv.' + p.level + '</span></div>'));
    for (const m of c.members) list.appendChild(el('div', 'li', '<div class="li-n"><b>' + esc(m.name) + '</b><span class="dim">' + CLASSES[m.cls].name + ' Lv.' + Math.max(m.level, p.level - 2) + '</span></div>'));
    w.body.appendChild(list);
    const bar = el('div', 'btnrow');
    const b1 = el('button', 'btn', '召集盟友'); b1.title = '召喚最多 3 位成員前來助陣 3 分鐘（冷卻 5 分鐘）';
    b1.onclick = () => { const e = callAllies(); if (e) { this.log(e, 'warn'); SFX.play('error'); } };
    const b2 = el('button', 'btn link', '解散血盟');
    b2.onclick = () => { if (confirm('確定要解散血盟「' + c.name + '」嗎？' + (ownsCastle() ? '你將失去灰岩城！' : ''))) { for (const a of G.maps.overworld.actors) if (a.clan === c.name) { a.clan = null; a.emblem = null; } p.clan = null; p.castle = null; this.log('血盟已解散。', 'warn'); this.refresh(); } };
    bar.appendChild(b1); bar.appendChild(b2);
    w.body.appendChild(bar);
    w.body.appendChild(el('div', 'dim small', '在村莊點擊冒險者可以邀請他們加入。魅力越高，可招募人數越多、成功率也越高。'));
  },

  renderSettings() {
    const w = this.windows.settings; if (!w) return;
    w.body.innerHTML = '';
    const opt = (label, on, fn) => { const r = el('label', 'opt'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = on; cb.onchange = () => fn(cb.checked); r.appendChild(cb); r.appendChild(el('span', '', label)); w.body.appendChild(r); };
    opt('背景音樂', Snd.musicOn, (v) => { Snd.unlock(); Snd.setMusic(v); this.syncAudio(); });
    opt('音效', Snd.sfxOn, (v) => { Snd.unlock(); Snd.setSfx(v); this.syncAudio(); });
    opt('像素風格（低解析度）', Settings.pixel, (v) => { Settings.pixel = v; saveSettings(); });
    opt('昏暗中世紀色調', Settings.grade, (v) => { Settings.grade = v; saveSettings(); });
    const row = el('div', 'btnrow');
    const b0 = el('button', 'btn', '遊戲說明'); b0.onclick = () => this.help();
    const b1 = el('button', 'btn', '存檔'); b1.onclick = () => saveGame(false);
    const b2 = el('button', 'btn', '選擇角色'); b2.onclick = () => { exitWorld(); this.leaveGame(); Scenes.show('select'); };
    row.appendChild(b0); row.appendChild(b1); row.appendChild(b2);
    w.body.appendChild(row);
    w.body.appendChild(el('div', 'dim small', '模式：本機（資料儲存在這個瀏覽器）。帳號：' + esc(Net.session ? Net.session.account : '')));
  },

  // ---------- NPC ----------
  openNPC(npc) {
    if (npc.kind === 'villager' || npc.kind === 'dog') return this.openVillager(npc);
    const role = npc.role;
    if (role === 'general' || role === 'smith' || role === 'magic' || role === 'jewel') this.openShop(npc);
    else if (role === 'teleport') this.openTeleport(npc);
    else if (role === 'quest') this.openQuest(npc);
    else if (role === 'clan') this.openClanNpc(npc);
    else if (role === 'warehouse') this.openWarehouse(npc);
    else if (role === 'herald') this.openHerald(npc);
  },
  dialogHead(npc, text) {
    return '<div class="npc-head"><b>' + esc(npc.name) + '</b> <span class="dim">[' + esc(npc.title || '冒險者') + ']</span></div><div class="npc-text">' + text + '</div>';
  },
  openShop(npc) {
    this.close('shop');
    const w = this.win('shop', npc.title, 16, 60, 360);
    w.npc = npc; w.tab = 'buy';
    this.renderShop();
    if (!this.windows.inv) this.toggle('inv');
  },
  renderShop() {
    const w = this.windows.shop; if (!w) return;
    const p = G.player, npc = w.npc;
    const greet = { general: '歡迎光臨！藥水、卷軸、箭都在這裡。', smith: '看看我的武器和盔甲吧！', magic: '魔法的奧秘就在書頁之間。', jewel: '每一件飾品都是精心挑選的。' }[npc.role];
    w.body.innerHTML = this.dialogHead(npc, greet);
    const tabs = el('div', 'tabs');
    for (const [k, l] of [['buy', '購買'], ['sell', '販賣']]) {
      const b = el('button', 'tab' + (w.tab === k ? ' on' : ''), l);
      b.onclick = () => { w.tab = k; this.renderShop(); };
      tabs.appendChild(b);
    }
    w.body.appendChild(tabs);
    const list = el('div', 'list');
    if (w.tab === 'buy') {
      for (const id of SHOPS[npc.role]) {
        const d = ITEMS[id];
        let sub = d.type === 'weapon' ? '攻擊 ' + d.dmg[0] + '-' + d.dmg[1] + (d.ranged ? ' 遠程' : '') : d.ac ? 'AC ' + d.ac : d.desc || '';
        let bad = false;
        if (d.cls && !d.cls.includes(p.cls)) { sub += '・' + CLASSES[p.cls].name + '不可用'; bad = true; }
        if (d.lvl) sub += '・Lv.' + d.lvl;
        if (d.type === 'book') { const need = SPELLS[d.spell].learn[p.cls]; if (need === undefined) { sub = CLASSES[p.cls].name + '無法學習'; bad = true; } else sub = (p.spells.includes(d.spell) ? '已學會' : '學習等級 ' + need); }
        const row = el('div', 'li' + (bad ? ' bad' : ''));
        row.appendChild(iconCanvas(id, 28));
        row.appendChild(el('div', 'li-n', '<b>' + d.name + '</b><span class="dim">' + esc(sub) + '</span>'));
        row.appendChild(el('div', 'price', d.price.toLocaleString()));
        row.addEventListener('mouseenter', (e) => this.showTip({ id, qty: 1, ench: 0 }, e));
        row.addEventListener('mouseleave', () => this.hideTip());
        const qtys = id === 'arrow' || id === 'silver_arrow' ? [100, 1000] : d.stack ? [1, 10] : [1];
        for (const q of qtys) {
          const b = el('button', 'btn sm', q > 1 ? '×' + q : '買');
          b.onclick = () => {
            const cost = d.price * q;
            if (p.gold < cost) { this.log('金幣不足。', 'warn'); SFX.play('error'); return; }
            if (addItem(id, q)) { p.gold -= cost; SFX.play('coin'); this.log('購買了 ' + d.name + (q > 1 ? ' ×' + q : '') + '。', 'loot'); this.refresh(); }
          };
          row.appendChild(b);
        }
        list.appendChild(row);
      }
    } else {
      const items = p.inv.slice();
      if (!items.length) list.appendChild(el('div', 'dim', '沒有可以販賣的物品。'));
      for (const inst of items) {
        const d = ITEMS[inst.id], each = sellPrice(inst, true);
        const row = el('div', 'li');
        row.appendChild(iconCanvas(inst.id, 28));
        row.appendChild(el('div', 'li-n', '<b>' + esc(itemName(inst)) + '</b><span class="dim">每個 ' + each + ' 金幣</span>'));
        const b = el('button', 'btn sm', inst.qty > 1 ? '全賣' : '賣');
        b.onclick = () => {
          if ((d.rare || inst.ench >= 5) && !confirm('確定要賣掉 ' + itemName(inst) + ' 嗎？')) return;
          const q = inst.qty; p.gold += each * q; removeItem(inst, q); SFX.play('coin');
          this.log('賣出 ' + d.name + (q > 1 ? ' ×' + q : '') + '，獲得 ' + (each * q).toLocaleString() + ' 金幣。', 'loot'); this.refresh();
        };
        row.appendChild(b);
        list.appendChild(row);
      }
      const junk = items.filter((i) => ITEMS[i.id].type === 'junk');
      if (junk.length) {
        const b = el('button', 'btn', '一鍵販賣所有戰利品');
        b.onclick = () => { let sum = 0; for (const inst of junk) { sum += sellPrice(inst, true) * inst.qty; removeItem(inst, inst.qty); } p.gold += sum; SFX.play('coin'); this.log('販賣了所有戰利品，獲得 ' + sum.toLocaleString() + ' 金幣。', 'loot'); this.refresh(); };
        w.body.appendChild(b);
      }
    }
    w.body.appendChild(list);
    w.body.appendChild(el('div', 'inv-foot', '<span>持有金幣 <b>' + p.gold.toLocaleString() + '</b></span><span>負重 ' + weightPct(p) + '%</span>'));
  },
  openTeleport(npc) {
    this.close('tp');
    const w = this.win('tp', npc.title, 16, 60, 320);
    const W = getMap('overworld').world;
    const dests = W.towns.filter((t) => t.id !== npc.town).map((t) => ({ name: t.name, sub: '村莊', cost: Math.round(dist(t.x, t.y, npc.x, npc.y) * 4), x: t.x, y: t.y + 3 }));
    dests.push({ name: '灰岩城', sub: '城堡前', cost: 300, x: W.castle.x0 - 4, y: W.castle.cy });
    dests.push({ name: '地下墓穴入口', sub: '骸骨荒原・建議 Lv 10+', cost: 350, x: W.crypt.x - 2, y: W.crypt.y - 2 });
    dests.push({ name: '霜嶺高地', sub: '建議 Lv 15+', cost: 400, x: 36, y: 38 });
    dests.push({ name: '赤岩峽谷', sub: '建議 Lv 12+', cost: 380, x: 118, y: 44 });
    w.body.innerHTML = this.dialogHead(npc, '要去哪裡呢？我可以用魔法送你一程。');
    const list = el('div', 'list');
    for (const d of dests) {
      const row = el('div', 'li');
      row.appendChild(el('div', 'li-n', '<b>' + d.name + '</b><span class="dim">' + d.sub + '</span>'));
      row.appendChild(el('div', 'price', d.cost));
      const b = el('button', 'btn sm', '傳送');
      b.onclick = () => {
        const p = G.player;
        if (p.gold < d.cost) { this.log('金幣不足。', 'warn'); SFX.play('error'); return; }
        p.gold -= d.cost; this.close('tp');
        teleportTo(d.x, d.y);
        this.log(npc.name + '：祝你一路順風！', 'npc');
        this.refresh();
      };
      row.appendChild(b);
      list.appendChild(row);
    }
    w.body.appendChild(list);
  },
  openQuest(npc) {
    this.close('quest');
    const w = this.win('quest', npc.title, 16, 60, 340);
    const p = G.player, q = p.quest, Q = QUESTS[q.idx];
    let html, btn = null;
    if (!Q) html = '你已經完成了所有委託，真正的英雄！大陸的和平都靠你了。';
    else if (!q.active) { html = Q.text + '<div class="reward">報酬：' + Q.gold + ' 金幣、' + Q.exp + ' 經驗值、' + ITEMS[Q.item[0]].name + ' ×' + Q.item[1] + '</div>'; btn = ['接受委託', () => { q.active = true; q.count = 0; SFX.play('quest'); this.log('【委託】接受：消滅 ' + MONSTERS[Q.target].name + ' ×' + Q.count, 'quest'); this.close('quest'); }]; }
    else if (q.count >= Q.count) {
      html = '做得好！這是你的報酬。';
      btn = ['領取報酬', () => {
        p.gold += Q.gold; SFX.play('quest'); addItem(Q.item[0], Q.item[1], 0, true); gainExp(Q.exp);
        this.log('【委託】完成！獲得 ' + Q.gold + ' 金幣、' + Q.exp + ' 經驗值、' + ITEMS[Q.item[0]].name + ' ×' + Q.item[1], 'quest');
        q.idx++; q.active = false; q.count = 0; saveGame(true); this.close('quest'); this.refresh();
      }];
    } else html = Q.text + '<div class="reward">進度：' + MONSTERS[Q.target].name + ' ' + q.count + ' / ' + Q.count + '</div>';
    w.body.innerHTML = this.dialogHead(npc, html);
    if (btn) { const b = el('button', 'btn', btn[0]); b.onclick = btn[1]; w.body.appendChild(b); }
  },
  openClanNpc(npc) {
    this.close('clannpc');
    const w = this.win('clannpc', npc.title, 16, 60, 340);
    const p = G.player;
    if (p.clan) {
      w.body.innerHTML = this.dialogHead(npc, '血盟「' + esc(p.clan.name) + '」運作得還順利嗎？<br>在村莊點擊冒險者就能邀請他們加入。目前可招募上限：' + clanCap() + ' 人。');
      return;
    }
    w.body.innerHTML = this.dialogHead(npc, '想建立自己的血盟嗎？需要<b>等級 5</b> 與 <b>3000 金幣</b>。選一個名稱與徽章吧。');
    const form = el('div', 'clanform');
    const inp = el('input'); inp.placeholder = '血盟名稱（2～8 字）'; inp.maxLength = 8; inp.addEventListener('keydown', (e) => e.stopPropagation());
    form.appendChild(inp);
    const em = { shape: 'shield', color: '#ffd040', bg: '#3a1a1a' };
    const prev = makeCanvas(48, 48); prev.className = 'emprev';
    const redraw = () => { const g = prev.getContext('2d'); g.clearRect(0, 0, 48, 48); drawEmblem(g, em, 0, 0, 48); };
    const shapes = el('div', 'emrow');
    for (const s of EMBLEM_SHAPES) {
      const c = makeCanvas(24, 24); drawEmblem(c.getContext('2d'), { shape: s, color: '#ffd040', bg: '#2a2420' }, 0, 0, 24);
      c.onclick = () => { em.shape = s; redraw(); }; shapes.appendChild(c);
    }
    const colors = el('div', 'emrow');
    for (const c of ['#ffd040', '#e0e8ff', '#ff6a4a', '#7ad0ff', '#a0f080', '#d080ff']) { const b = el('span', 'swatch'); b.style.background = c; b.onclick = () => { em.color = c; redraw(); }; colors.appendChild(b); }
    const bgs = el('div', 'emrow');
    for (const c of ['#3a1a1a', '#1a2a3a', '#2a2a1a', '#2a1a3a', '#1a1a1a']) { const b = el('span', 'swatch'); b.style.background = c; b.onclick = () => { em.bg = c; redraw(); }; bgs.appendChild(b); }
    form.appendChild(el('div', 'dim small', '徽章圖案'));
    form.appendChild(shapes); form.appendChild(el('div', 'dim small', '圖案顏色')); form.appendChild(colors); form.appendChild(el('div', 'dim small', '底色')); form.appendChild(bgs);
    form.appendChild(prev); redraw();
    const b = el('button', 'btn', '建立血盟（3000 金幣）');
    b.onclick = () => { const err = createClan(inp.value.trim(), Object.assign({}, em)); if (err) { this.log(err, 'warn'); SFX.play('error'); } else { this.close('clannpc'); this.toggle('clan'); } };
    form.appendChild(b);
    w.body.appendChild(form);
  },
  openWarehouse(npc) {
    this.close('wh');
    const w = this.win('wh', npc.title, 16, 60, 330);
    w.npc = npc;
    this.renderWh();
    if (!this.windows.inv) this.toggle('inv');
  },
  renderWh() {
    const w = this.windows.wh; if (!w) return;
    const p = G.player;
    w.body.innerHTML = this.dialogHead(w.npc, '要寄放還是領取物品呢？倉庫在每個村莊都是共通的。（最多 60 格）');
    w.body.appendChild(el('div', 'dim small', '倉庫（點擊領取）'));
    const g1 = el('div', 'grid');
    for (let i = 0; i < 30; i++) g1.appendChild(this.slotEl(p.wh[i], (inst) => {
      if (!canCarry(inst.id, inst.qty)) { this.log('太重了，無法領取。', 'warn'); return; }
      p.wh.splice(p.wh.indexOf(inst), 1); addItem(inst.id, inst.qty, inst.ench, true); this.refresh();
    }));
    w.body.appendChild(g1);
    w.body.appendChild(el('div', 'dim small', '背包（點擊寄放）'));
    const g2 = el('div', 'grid');
    for (let i = 0; i < 48; i++) g2.appendChild(this.slotEl(p.inv[i], (inst) => {
      if (p.wh.length >= 60) { this.log('倉庫已滿。', 'warn'); return; }
      const ex = ITEMS[inst.id].stack && p.wh.find((x) => x.id === inst.id);
      if (ex) ex.qty += inst.qty; else p.wh.push({ id: inst.id, qty: inst.qty, ench: inst.ench || 0 });
      removeItem(inst, inst.qty); SFX.play('pickup'); this.refresh();
    }, { size: 28 }));
    w.body.appendChild(g2);
  },
  openHerald(npc) {
    this.close('herald');
    const w = this.win('herald', npc.title, 16, 60, 340);
    const p = G.player;
    let text;
    const row = el('div', 'btnrow');
    if (ownsCastle()) {
      const tax = Math.floor(p.castle.taxAcc || 0);
      text = '城主大人，灰岩城一切安好。目前累積的稅金為 <b>' + tax.toLocaleString() + '</b> 金幣。<br>小心' + ENEMY_CLAN + '隨時可能來犯！';
      const b = el('button', 'btn', '領取稅金');
      b.onclick = () => { const t = Math.floor(p.castle.taxAcc || 0); if (!t) return; p.gold += t; p.castle.taxAcc = 0; SFX.play('coin'); this.log('領取了 ' + t.toLocaleString() + ' 金幣的稅金。', 'loot'); this.close('herald'); this.refresh(); };
      row.appendChild(b);
    } else if (G.siege && G.siege.active) {
      text = '攻城戰正在進行中！擊破城門，摧毀城內的守護之塔！';
    } else {
      text = '灰岩城目前由<b>灰岩騎士團</b>駐守。<br>擁有血盟、等級 10 以上的勇者，可以向灰岩城宣戰。<br>攻城戰持續 10 分鐘，摧毀<b>守護之塔</b>即可佔領城堡。你的血盟成員會一同參戰。';
      const b = el('button', 'btn', '⚔ 宣戰');
      b.onclick = () => { const e = declareSiege(); if (e) { this.log(e, 'warn'); SFX.play('error'); } else this.close('herald'); };
      row.appendChild(b);
    }
    w.body.innerHTML = this.dialogHead(npc, text);
    w.body.appendChild(row);
  },
  openVillager(v) {
    this.close('vill');
    if (v.kind === 'dog') { v.speak('汪！', 2); SFX.play('bark', v.x, v.y); return; }
    const w = this.win('vill', v.name, 16, 60, 300);
    const p = G.player;
    const line = pick(['今天天氣真好。', '你也是冒險者嗎？', '聽說灰岩城的守衛很強。', '我正在找一個好血盟。', '要不要一起去狩獵？']);
    w.body.innerHTML = this.dialogHead({ name: v.name, title: CLASSES[v.cls].name + ' Lv.' + v.level }, (v.clan ? '<span class="dim">[' + esc(v.clan) + ']</span><br>' : '') + line);
    const row = el('div', 'btnrow');
    if (p.clan && !v.clan) {
      const b = el('button', 'btn', '邀請加入血盟');
      b.onclick = () => { const e = recruit(v); if (e) { this.log(e, 'warn'); } this.close('vill'); };
      row.appendChild(b);
    }
    w.body.appendChild(row);
    v.face(p.x, p.y);
  },
  chooseArmor(slots, cb) {
    this.close('choose');
    const w = this.win('choose', '選擇要強化的防具', window.innerWidth / 2 - 150, 120, 300);
    const p = G.player;
    const list = el('div', 'list');
    for (const s of slots) {
      const inst = p.equip[s];
      const row = el('div', 'li');
      row.appendChild(iconCanvas(inst.id, 28));
      row.appendChild(el('div', 'li-n', '<b>' + esc(itemName(inst)) + '</b><span class="dim">' + SLOT_NAMES[s] + '・安全值 +' + ITEMS[inst.id].safe + '</span>'));
      const b = el('button', 'btn sm', '強化');
      b.onclick = () => { this.close('choose'); cb(s); };
      row.appendChild(b); list.appendChild(row);
    }
    w.body.appendChild(list);
  },
  showDeath() {
    const d = $('#death'); d.classList.add('show');
    const p = G.player;
    $('#deathMsg').textContent = p.align < 0 ? '邪惡之人死後掉落了身上的物品…' : '失去了部分經驗值。';
    $('#btnRespawn').onclick = () => { d.classList.remove('show'); respawn(); };
  },
  help() {
    this.close('help');
    const w = this.win('help', '遊戲說明', Math.max(6, window.innerWidth / 2 - 200), 50, 400);
    w.body.innerHTML = `<div class="help">
      <p><b>移動</b>：點擊地面（按住可持續移動）。<b>攻擊</b>：點擊怪物。<b>撿取</b>：點擊地上的物品名稱。</p>
      <p><b>PK</b>：按住 Ctrl 或 Shift 點擊其他冒險者可強制攻擊，會變成紫名；殺死無辜者會變成邪惡（紅名），村莊守衛會攻擊你，死亡時會掉落物品。擊敗紅名可以提升善惡值。</p>
      <p><b>魔法</b>：按 S 開啟魔法視窗，到魔法商人購買魔法書學習。攻擊魔法會對目前目標施放，沒有目標時點擊要攻擊的對象。</p>
      <p><b>負重</b>：超過 50% 不會自然回復，超過 80% 移動變慢，滿了就無法再拿東西。可以把東西存進倉庫。</p>
      <p><b>強化</b>：強化卷軸可以強化裝備，超過安全值有機會失敗並讓裝備消失！</p>
      <p><b>血盟</b>：在晨風村找血盟管理員建立血盟，點擊村莊裡的冒險者邀請加入。按 P 開啟血盟視窗可召集盟友。</p>
      <p><b>攻城</b>：有血盟、等級 10 以上可在灰岩城外找攻城傳令官宣戰，摧毀守護之塔就能成為城主並收稅。</p>
      <p><b>快捷鍵</b>：1-0 快捷列・I 背包・C 角色・S 魔法・P 血盟・M 世界地圖・N 小地圖・O 設定・Tab 最近的怪物・Enter 聊天・Esc 關閉</p>
      <p class="dim">遊戲每 30 秒自動存檔。</p></div>`;
  },
};
function sellPrice(inst, forShop) {
  const d = ITEMS[inst.id];
  const base = d.type === 'junk' ? d.price : Math.floor(d.price * 0.4);
  return base + (inst.ench ? inst.ench * inst.ench * 30 : 0);
}
