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

// 稀有度：普通、精良、高級、稀有（依道具標記與價格判斷）
const RARITY_NAMES = ['普通', '精良', '高級', '稀有'];
function itemRarity(d) {
  if (d.rare) return 3;
  if (d.price >= 20000) return 2;
  if (d.price >= 2500) return 1;
  return 0;
}
const UI = {
  windows: {}, drag: null,
  init() {
    try { this.shopSort = localStorage.getItem('dawnlands_shopsort') || 'price'; } catch (e) { this.shopSort = 'price'; }
    const menu = [['btnInv', 'inv'], ['btnChar', 'char'], ['btnSpell', 'spell'], ['btnPet', 'pet'], ['btnClan', 'clan'], ['btnMap', 'map'], ['btnSet', 'settings']];
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
      if (e.key === 'Enter') { const v = ci.value.trim(); ci.value = ''; if (v) Chat.input(v); ci.blur(); }
      else if (e.key === 'Escape') ci.blur();
    });
    // 聊天欄大小：拖曳面板上緣或按 ▲▼
    const steps = [176, 250, 340, 440];
    $('#chatBig').onclick = () => setHudHeight(steps.find((s) => s > HUD_H() + 5) || steps[steps.length - 1], true);
    $('#chatSmall').onclick = () => setHudHeight(steps.slice().reverse().find((s) => s < HUD_H() - 5) || steps[0], true);
    const rz = $('#hudResize');
    let rs = null;
    rz.addEventListener('pointerdown', (e) => { rs = { y: e.clientY, h: HUD_H() }; rz.setPointerCapture(e.pointerId); e.preventDefault(); });
    rz.addEventListener('pointermove', (e) => { if (rs) setHudHeight(rs.h + (rs.y - e.clientY)); });
    rz.addEventListener('pointerup', () => { if (rs) { rs = null; setHudHeight(HUD_H(), true); } });
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
      d.ghost.appendChild(d.entry.kind === 'item' ? iconCanvas(d.entry.id, 34) : d.entry.kind === 'auto' ? iconCanvas('auto', 34, 'skill') : iconCanvas(d.entry.id, 34, 'spell'));
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
    for (const k of ['inv', 'char', 'spell', 'clan', 'shop', 'wh', 'pet', 'petshop', 'merc', 'buffer', 'stallview']) if (this.windows[k]) this['render' + k[0].toUpperCase() + k.slice(1)]();
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
      const sb = siegeBarHtml();
      if (sb) { st.style.display = 'block'; st.innerHTML = esc(sb); } else st.style.display = 'none';
      if (this.windows.map) drawWorldMap(this.windows.map.cv, this.windows.map.mapId);
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
  front(d) {
    // 視窗層級維持在 20～80 之間，避免蓋過提示框
    this.z = (this.z || 20) + 1;
    if (this.z > 80) { const ws = Object.values(this.windows).map((w) => w.el).sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0)); this.z = 20; for (const w of ws) w.style.zIndex = ++this.z; this.z++; }
    d.style.zIndex = this.z;
  },
  placeTip(t, target) {
    const r = target.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2, y = r.top - th - 8;
    if (y < 4) y = r.bottom + 8;                                  // 上方放不下改放下方
    if (y + th > window.innerHeight - 4) { y = Math.max(4, r.top + r.height / 2 - th / 2); x = r.right + 8; if (x + tw > window.innerWidth - 4) x = r.left - tw - 8; }
    t.style.left = clamp(x, 4, window.innerWidth - tw - 4) + 'px'; t.style.top = clamp(y, 4, window.innerHeight - th - 4) + 'px';
  },
  close(id) { const w = this.windows[id]; if (w) { w.el.remove(); delete this.windows[id]; if (w.onClose) { const f = w.onClose; w.onClose = null; f(); } } this.hideTip(); },
  closeAll() { for (const k in this.windows) this.close(k); },
  toggle(id) {
    if (this.windows[id]) { this.close(id); return; }
    const W = window.innerWidth;
    if (id === 'inv') { this.win('inv', '背包', W - 330, 60, 316); this.renderInv(); }
    if (id === 'char') { this.win('char', '角色資訊', 16, 60, 340); this.renderChar(); }
    if (id === 'spell') { this.win('spell', '魔法', W - 330 - (this.windows.inv ? 330 : 0), 60, 300); this.renderSpell(); }
    if (id === 'clan') { this.win('clan', '血盟', 370, 60, 320); this.renderClan(); }
    if (id === 'pet') { this.win('pet', '夥伴（寵物・召喚獸・迷魅）', 370, 60, 340); this.renderPet(); }
    if (id === 'settings') { this.win('settings', '設定', W / 2 - 160, 80, 320); this.renderSettings(); }
    if (id === 'map') {
      const w = Math.min(860, W - 20), h = Math.min(540, window.innerHeight - HUD_H() - 110);
      const win = this.win('map', '世界地圖', (W - w) / 2, 40, w);
      win.mapId = ['isle', 'volcano', 'oren'].includes(G.map.id) ? G.map.id : 'overworld';
      const tabs = el('div', 'tabs');
      const cv = makeCanvas(w - 22, h - 34); cv.className = 'mapcv';
      const note = el('div', 'dim small');
      const show = (id) => {
        win.mapId = id;
        tabs.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
        note.textContent = G.map.id === id ? '紅點為你的位置。' : G.map.id === 'crypt' ? '你目前在地下墓穴中。' : (id === 'isle' ? '在銀風港找船長搭船前往翡翠群島。' : id === 'oren' ? '從霜嶺高地北方的北境山道進入，傳送師也能直接送你到歐瑞城。' : id === 'volcano' ? '從赤岩峽谷深處的火山隘口進入，傳送師也能送你到隘口。' : '在珊瑚鎮找船長搭船回到大陸。');
        drawWorldMap(cv, id);
      };
      for (const [id, nm] of [['overworld', '晨曦大陸'], ['isle', '翡翠群島'], ['volcano', '熾焰火山'], ['oren', '北境・歐瑞城']]) { const b = el('button', 'tab', nm); b.dataset.id = id; b.onclick = () => show(id); tabs.appendChild(b); }
      win.body.appendChild(tabs); win.body.appendChild(cv); win.body.appendChild(note); win.cv = cv;
      show(win.mapId);
    }
  },

  slotEl(inst, onClick, opts = {}) {
    const s = el('div', 'slot');
    if (inst) {
      s.appendChild(iconCanvas(inst.id, opts.size || 34));
      if (inst.qty > 1) s.appendChild(el('span', 'qty', inst.qty > 9999 ? Math.floor(inst.qty / 1000) + 'k' : inst.qty));
      if (inst.ench) s.appendChild(el('span', 'ench', '+' + inst.ench));
      if (inst.pet) { s.appendChild(el('span', 'ench', 'Lv' + inst.pet.level)); if (inst.pet.dead) s.classList.add('deadpet'); if (inst.pet.out) s.classList.add('on'); }
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
    if (inst.pet) { const pd = inst.pet, st = petStats(pd); h += '<div>' + esc(pd.name) + '（' + PETS[pd.kind].name + '）Lv.' + pd.level + '・經驗 ' + Math.floor(100 * pd.exp / petExpNeed(pd.level)) + '%</div><div>體力 ' + (pd.dead ? '<span class="bad">已倒下</span>' : st.maxHp) + '　攻擊 ' + st.dmg[0] + '-' + st.dmg[1] + '</div><div class="dim">' + PETS[pd.kind].desc + '</div><div class="dim">點擊召喚／收回</div>'; }
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
    if (d.mpr) h += '<div>魔力回復 +' + d.mpr + '（每 3 秒）</div>';
    if (d.move) h += '<div>移動速度 +' + Math.round(d.move * 100) + '%</div>';
    if (d.slow) h += '<div>攻擊時 ' + Math.round(d.slow * 100) + '% 機率使敵人減速</div>';
    if (d.stat) h += '<div>' + Object.keys(d.stat).map((k) => STAT_NAMES[k] + ' +' + d.stat[k]).join('　') + '</div>';
    if (d.res) h += '<div>' + Object.keys(d.res).map((k) => ({ earth: '地', water: '水', fire: '火', wind: '風' }[k]) + '屬性抗性 +' + d.res[k] + '%').join('　') + '</div>';
    if (d.type === 'weapon' || d.type === 'armor') h += '<div class="dim">安全強化值 +' + d.safe + '</div>';
    if (d.cls) h += '<div class="' + (p && !d.cls.includes(p.cls) ? 'bad' : 'dim') + '">可使用：' + d.cls.map((c) => CLASSES[c].name).join('、') + '</div>';
    if (d.lvl) h += '<div class="' + (p && p.level < d.lvl ? 'bad' : 'dim') + '">需要等級 ' + d.lvl + '</div>';
    if (d.type === 'book' && p) { const need = SPELLS[d.spell].learn[p.cls]; h += '<div class="' + (need === undefined || p.level < need ? 'bad' : 'dim') + '">' + (need === undefined ? CLASSES[p.cls].name + '無法學習' : '學習等級 ' + need) + '</div>'; }
    if (d.desc) h += '<div class="dim">' + esc(d.desc) + '</div>';
    h += '<div class="dim">重量 ' + (Math.round(itemWeight(inst) * 10) / 10) + '　售價 ' + sellPrice(inst) + '</div>';
    const t = $('#tip'); t.innerHTML = h; t.style.display = 'block';
    this.placeTip(t, e.currentTarget || e.target);
  },
  hideTip() { $('#tip').style.display = 'none'; },

  renderInv() {
    const w = this.windows.inv; if (!w) return;
    const p = G.player;
    w.body.innerHTML = '';
    const grid = el('div', 'grid invgrid');
    for (let i = 0; i < INV_MAX; i++) {
      const inst = p.inv[i];
      grid.appendChild(this.slotEl(inst, (it) => {
        if (this.delMode) { this.delMode = false; this.askDelete(it); }
        else if (this.dropMode) { this.dropMode = false; this.askDrop(it); }
        else if (Trade.s) Trade.addMine(it);
        else if (G.player.stall && !G.player.stall.open) Stall.addItem(it);
        else useItem(it);
      }, { drag: true, right: (it) => this.askDrop(it) }));
    }
    w.body.appendChild(grid);
    const wp = weightPct(p);
    const foot = el('div', 'inv-foot2');
    foot.innerHTML = '<div class="wt"><span>負重 ' + p.d.weight + ' / ' + p.d.weightMax + '</span><div class="wtbar"><div class="' + (wp >= 100 ? 'over' : wp >= 50 ? 'heavy' : '') + '" style="width:' + Math.min(100, wp) + '%"></div></div></div>' +
      '<div class="gold">金幣 <b>' + p.gold.toLocaleString() + '</b></div>';
    const tools = el('div', 'inv-tools');
    const bSort = el('button', 'btn sm', '整理'); bSort.onclick = () => { p.inv.sort((a, b) => ({ weapon: 0, armor: 1, acc: 2, consume: 3, ammo: 4, book: 5, junk: 6 }[ITEMS[a.id].type] - { weapon: 0, armor: 1, acc: 2, consume: 3, ammo: 4, book: 5, junk: 6 }[ITEMS[b.id].type]) || a.id.localeCompare(b.id)); this.renderInv(); };
    const bDrop = el('button', 'btn sm' + (this.dropMode ? ' on' : ''), '🗑 丟棄'); bDrop.onclick = () => { this.dropMode = !this.dropMode; this.renderInv(); if (this.dropMode) this.log('點擊要丟棄的物品。', 'sys'); };
    const bDel = el('button', 'btn sm' + (this.delMode ? ' on' : ''), '🔥 刪除'); bDel.onclick = () => { this.delMode = !this.delMode; this.dropMode = false; this.renderInv(); if (this.delMode) this.log('點擊要刪除（銷毀）的物品。', 'sys'); };
    const bStall = el('button', 'btn sm' + (p.stall ? ' on' : ''), '🏪 擺攤'); bStall.onclick = () => Stall.toggleSetup();
    tools.appendChild(bSort); tools.appendChild(bDrop); tools.appendChild(bDel); tools.appendChild(bStall);
    tools.appendChild(el('span', 'dim small', (Trade.s ? '交易中：點擊物品放到交易欄・' : p.stall && !p.stall.open ? '擺攤準備中：點擊物品放上攤位・' : '') + '背包 ' + p.inv.length + ' / ' + INV_MAX + '・點擊使用／裝備・右鍵丟棄・拖曳到快捷列'));
    w.body.appendChild(foot); w.body.appendChild(tools);
  },
  askDelete(inst) {
    const nm = itemName(inst);
    let q = inst.qty;
    if (inst.qty > 1) { const v = prompt('要刪除多少個 ' + ITEMS[inst.id].name + '？（最多 ' + inst.qty + '，刪除後無法復原）', inst.qty); if (v === null) return; q = clamp(parseInt(v, 10) || 0, 0, inst.qty); if (!q) return; }
    else if (!confirm((inst.pet ? '項圈裡有寵物「' + inst.pet.name + '」，刪除後會永遠失去牠。\n' : '') + '確定要刪除「' + nm + '」嗎？刪除後無法復原。')) return;
    if (inst.pet) { const out = companions('pet').find((x) => x.pet === inst.pet); if (out) recallPet(out, true); }
    for (const sl of SLOTS) if (G.player.equip[sl] === inst) G.player.equip[sl] = null;
    removeItem(inst, q);
    SFX.play('enchantFail'); this.log('刪除了 ' + ITEMS[inst.id].name + (q > 1 ? ' ×' + q : '') + '。', 'sys');
  },
  askDrop(inst) {
    let q = inst.qty;
    if (inst.qty > 1) { const v = prompt('要丟棄多少個 ' + ITEMS[inst.id].name + '？（最多 ' + inst.qty + '）', inst.qty); if (v === null) return; q = clamp(parseInt(v, 10) || 0, 0, inst.qty); if (!q) return; }
    else if (inst.pet) { if (!confirm('項圈裡有寵物「' + inst.pet.name + '」，丟棄後會失去牠，確定嗎？')) return; const out = companions('pet').find((x) => x.pet === inst.pet); if (out) recallPet(out, true); }
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
      row('魔法等級', d.mlevel) + row('魔攻加成', (d.sp >= 0 ? '+' : '') + d.sp) + row('魔法防禦', d.mr + '%') + row('魔力回復', '+' + (d.mpr || 0)) + row('迴避 ER', d.er) +
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
    let lastC = 0;
    for (const id of list) {
      const s = SPELLS[id], has = p.spells.includes(id);
      if (s.circle !== lastC) { lastC = s.circle; grid.appendChild(el('div', 'circlehead', '第 ' + s.circle + ' 階' + (s.circle >= 6 ? ' <span class="dim">高階</span>' : ''))); }
      const c = el('div', 'slot' + (has ? '' : ' locked'));
      c.appendChild(iconCanvas(id, 34, 'spell'));
      c.appendChild(el('span', 'qty', s.mp));
      if (has && p.autoBuff && p.autoBuff[id] && autoBuffable(id)) c.appendChild(el('span', 'abadge', '自動'));
      c.addEventListener('mouseenter', (e) => {
        const t = $('#tip');
        t.innerHTML = '<b>' + s.name + '</b><div>第 ' + s.circle + ' 階　消耗 MP ' + s.mp + (s.aoe ? '　範圍 ' + s.aoe : '') + (s.cd ? '　冷卻 ' + s.cd + ' 秒' : '') + '</div><div>' + esc(s.desc) + '</div>' + (s.dur ? '<div class="dim">持續 ' + s.dur + ' 秒</div>' : '') +
          (has ? '<div class="dim">點擊施放・拖曳到快捷列' + (autoBuffable(id) ? '・右鍵切換自動施放' : '') + '</div>' : '<div class="bad">尚未學會（Lv.' + s.learn[p.cls] + ' 可學，需要魔法書' + (s.circle >= 7 ? '，只有強大的頭目會掉落' : s.circle >= 5 ? '，城堡御用商人或歐瑞城魔法商人有售' : '') + '）</div>');
        t.style.display = 'block'; this.placeTip(t, c);
      });
      c.addEventListener('mouseleave', () => this.hideTip());
      if (has) {
        c.addEventListener('pointerdown', (e) => { if (e.button === 0) this.dragStart(e, { kind: 'spell', id }); });
        c.addEventListener('click', () => { if (this.wasDrag()) return; this.hideTip(); castSpell(id); });
        if (autoBuffable(id)) c.addEventListener('contextmenu', (e) => { e.preventDefault(); this.toggleAutoBuff(id); });
      }
      grid.appendChild(c);
    }
    w.body.appendChild(grid);
    // 特殊功能：自動狩獵（被覆蓋時可以從這裡拖回快捷列）
    const sp2 = el('div', 'special');
    const au = el('div', 'slot' + (G.autoHunt ? ' on' : ''));
    au.appendChild(iconCanvas('auto', 34, 'skill'));
    au.title = '自動狩獵：點擊開關，拖曳到快捷列';
    au.addEventListener('pointerdown', (e) => { if (e.button === 0) this.dragStart(e, { kind: 'auto' }); });
    au.addEventListener('click', () => { if (this.wasDrag()) return; useHotbarEntry({ kind: 'auto' }); });
    sp2.appendChild(au);
    sp2.appendChild(el('div', 'dim small', '自動狩獵（可拖到快捷列，或輸入 /auto 開關）'));
    w.body.appendChild(sp2);
    // 自動施放增益魔法
    const ab = list.filter((id) => autoBuffable(id) && p.spells.includes(id));
    const abox = el('div', 'autobuff');
    abox.appendChild(el('div', 'lbl', '自動施放（效果快結束且魔力足夠時自動重新施放）'));
    if (!ab.length) abox.appendChild(el('div', 'dim small', '學會防護術、加速術、祝福鎧甲等持續型魔法後，可以在這裡設定自動施放。'));
    for (const id of ab) {
      const on = !!(p.autoBuff && p.autoBuff[id]);
      const b = el('button', 'btn sm' + (on ? ' on' : ''), (on ? '✓ ' : '') + SPELLS[id].name);
      b.onclick = () => this.toggleAutoBuff(id);
      abox.appendChild(b);
    }
    w.body.appendChild(abox);
    const f = el('div', 'spell-foot');
    f.innerHTML = '<span>S.power 魔攻 <b>' + p.d.sp + '</b></span><span>M.resist 魔防 <b>' + p.d.mr + '%</b></span><span>魔法等級 <b>' + p.d.mlevel + '</b></span>';
    w.body.appendChild(f);
    w.body.appendChild(el('div', 'dim small', '灰色為尚未學會的魔法。到魔法商人購買魔法書學習，高階魔法書需要從強大的怪物身上取得。'));
  },

  toggleAutoBuff(id) {
    const p = G.player; p.autoBuff = p.autoBuff || {};
    p.autoBuff[id] = !p.autoBuff[id];
    this.log('自動施放「' + SPELLS[id].name + '」：' + (p.autoBuff[id] ? '開啟' : '關閉'), 'sys');
    SFX.play('click'); this.renderSpell();
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
    opt('昏暗中世紀色調', Settings.grade, (v) => { Settings.grade = v; saveSettings(); });
    opt('自動拾取附近的物品', Settings.autoPickup !== false, (v) => { Settings.autoPickup = v; saveSettings(); });
    const bk = el('div', 'btnrow');
    const e1 = el('button', 'btn sm', '⬇ 匯出此角色'); e1.onclick = () => { saveGame(true); Backup.download([serializePlayer(G.player)], G.player.name); };
    const e2 = el('button', 'btn sm', '📋 複製存檔碼'); e2.onclick = async () => { saveGame(true); const r = await Backup.copyCode([serializePlayer(G.player)]); if (r.ok) this.log('存檔碼已複製到剪貼簿，可以貼到另一台裝置的「匯入角色」。', 'sys'); else prompt('請手動複製這段存檔碼：', r.code); };
    bk.appendChild(e1); bk.appendChild(e2);
    w.body.appendChild(el('div', 'dim small', '存檔備份與轉移'));
    w.body.appendChild(bk);
    const row = el('div', 'btnrow');
    const b0 = el('button', 'btn', '遊戲說明'); b0.onclick = () => this.help();
    const bh = el('button', 'btn', '重設快捷列'); bh.onclick = () => { if (confirm('把快捷列恢復成職業預設（含自動狩獵）？')) { G.player.hotbar = defaultHotbar(G.player.cls); this.buildHotbar(); } };
    row.appendChild(bh);
    const b1 = el('button', 'btn', '存檔'); b1.onclick = () => saveGame(false);
    const b2 = el('button', 'btn', '選擇角色'); b2.onclick = () => { exitWorld(); this.leaveGame(); Scenes.show('select'); };
    row.appendChild(b0); row.appendChild(b1); row.appendChild(b2);
    w.body.appendChild(row);
    w.body.appendChild(el('div', 'dim small', '版本 v' + GAME_VERSION + (Net.online ? '・模式：線上（資料儲存在伺服器' + (RemoteBackend.connected ? '' : '，目前斷線中') + '）。帳號：' : '・模式：本機（資料儲存在這個瀏覽器）。帳號：') + esc(Net.session ? Net.session.account : '')));
    const vb = el('button', 'btn sm link', '檢查更新'); vb.onclick = async () => { await Version.check(); if (!Version.remote) this.log('目前已是最新版本 v' + GAME_VERSION + '。', 'sys'); }; w.body.appendChild(vb);
  },

  // ---------- NPC ----------
  openNPC(npc) {
    if (npc.kind === 'villager' || npc.kind === 'dog' || npc.kind === 'fighter') return this.openVillager(npc);
    const role = npc.role;
    if (role === 'castleshop' && !ownsCastle()) { npc.speak('抱歉，我只服務灰岩城的城主血盟。', 3); this.log(npc.name + '：抱歉，我只服務灰岩城的城主血盟。', 'npc'); return; }
    if (role === 'general' || role === 'smith' || role === 'magic' || role === 'jewel' || role === 'coral' || role === 'castleshop') this.openShop(npc);
    else if (role === 'captain') this.openCaptain(npc);
    else if (role === 'teleport') this.openTeleport(npc);
    else if (role === 'quest') this.openQuest(npc);
    else if (role === 'clan') this.openClanNpc(npc);
    else if (role === 'warehouse') this.openWarehouse(npc);
    else if (role === 'herald') this.openHerald(npc);
    else if (role === 'merc') this.openMercCaptain(npc);
    else if (role === 'stall') this.openStallView(npc);
    else if (role === 'buffer') this.openBuffer(npc);
    else if (role === 'pet') this.openPetShop(npc);
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
    const greet = { castleshop: '城主大人，這些都是城堡御用的珍品。', coral: '歡迎來到珊瑚鎮！島上的特產都在這裡。', general: '歡迎光臨！藥水、卷軸、箭都在這裡。', smith: '看看我的武器和盔甲吧！', magic: '魔法的奧秘就在書頁之間。', jewel: '每一件飾品都是精心挑選的。' }[npc.role];
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
      // 排序：價格由低到高、由高到低、或依稀有度（同稀有度再依價格）
      const mode = this.shopSort || 'price';
      const sorts = el('div', 'shopsort');
      sorts.appendChild(el('span', 'dim small', '排序：'));
      for (const [k, l] of [['price', '價格 ↑'], ['priceDesc', '價格 ↓'], ['rarity', '稀有度']]) {
        const b = el('button', 'btn sm' + (mode === k ? ' on' : ''), l);
        b.onclick = () => { this.shopSort = k; try { localStorage.setItem('dawnlands_shopsort', k); } catch (e) { /* */ } this.renderShop(); };
        sorts.appendChild(b);
      }
      w.body.appendChild(sorts);
      const ids = ((npc.town === 'oren' && SHOPS['oren_' + npc.role]) || SHOPS[npc.role]).filter((id) => ITEMS[id]);
      const byPrice = (a, b) => ITEMS[a].price - ITEMS[b].price;
      ids.sort(mode === 'priceDesc' ? (a, b) => -byPrice(a, b) : mode === 'rarity' ? (a, b) => itemRarity(ITEMS[a]) - itemRarity(ITEMS[b]) || byPrice(a, b) : byPrice);
      let lastR = -1;
      for (const id of ids) {
        const d = ITEMS[id];
        const rr = itemRarity(d);
        if (mode === 'rarity' && rr !== lastR) { lastR = rr; list.appendChild(el('div', 'rarityhead r' + rr, RARITY_NAMES[rr])); }
        let sub = d.type === 'weapon' ? '攻擊 ' + d.dmg[0] + '-' + d.dmg[1] + (d.ranged ? ' 遠程' : '') : d.ac ? 'AC ' + d.ac : d.desc || '';
        let bad = false;
        if (d.cls && !d.cls.includes(p.cls)) { sub += '・' + CLASSES[p.cls].name + '不可用'; bad = true; }
        if (d.lvl) sub += '・Lv.' + d.lvl;
        if (d.type === 'book') { const need = SPELLS[d.spell].learn[p.cls]; if (need === undefined) { sub = CLASSES[p.cls].name + '無法學習'; bad = true; } else sub = (p.spells.includes(d.spell) ? '已學會' : '學習等級 ' + need); }
        const row = el('div', 'li' + (bad ? ' bad' : ''));
        row.appendChild(iconCanvas(id, 28));
        row.appendChild(el('div', 'li-n', '<b class="rn' + rr + '">' + d.name + '</b><span class="dim">' + esc(sub) + '</span>'));
        row.appendChild(el('div', 'price', d.price.toLocaleString()));
        row.addEventListener('mouseenter', (e) => this.showTip({ id, qty: 1, ench: 0 }, e));
        row.addEventListener('mouseleave', () => this.hideTip());
        const qtys = id === 'arrow' || id === 'silver_arrow' ? [100, 1000] : d.stack ? [1, 10] : [1];
        for (const q of qtys) {
          const b = el('button', 'btn sm', q > 1 ? '×' + q : '買');
          b.onclick = () => {
            const cost = d.price * q;
            if (p.gold < cost) { this.log('金幣不足。', 'warn'); SFX.play('error'); return; }
            if (addItem(id, q)) { p.gold -= cost; castleTax(cost, 'trade'); SFX.play('coin'); this.log('購買了 ' + d.name + (q > 1 ? ' ×' + q : '') + '。', 'loot'); this.refresh(); }
          };
          row.appendChild(b);
        }
        list.appendChild(row);
      }
    } else {
      const items = p.inv.filter((i) => !i.pet);
      if (!items.length) list.appendChild(el('div', 'dim', '沒有可以販賣的物品。'));
      for (const inst of items) {
        const d = ITEMS[inst.id], each = sellPrice(inst, true);
        const row = el('div', 'li');
        row.appendChild(iconCanvas(inst.id, 28));
        row.appendChild(el('div', 'li-n', '<b>' + esc(itemName(inst)) + '</b><span class="dim">每個 ' + each + ' 金幣</span>'));
        const sell = (q) => {
          if (!p.inv.includes(inst)) return;
          q = clamp(q, 1, inst.qty);
          if ((d.rare || inst.ench >= 5) && !confirm('確定要賣掉 ' + itemName(inst) + ' 嗎？')) return;
          p.gold += each * q; castleTax(each * q, 'trade'); removeItem(inst, q); SFX.play('coin');
          this.log('賣出 ' + d.name + (q > 1 ? ' ×' + q : '') + '，獲得 ' + (each * q).toLocaleString() + ' 金幣。', 'loot'); this.refresh();
        };
        if (inst.qty > 1) {
          const b1 = el('button', 'btn sm', '賣 1'); b1.onclick = () => sell(1);
          const b2 = el('button', 'btn sm', '數量'); b2.onclick = () => { const v = prompt('要賣幾個 ' + d.name + '？（最多 ' + inst.qty + '）', inst.qty); if (v !== null) sell(parseInt(v, 10) || 0); };
          const b3 = el('button', 'btn sm', '全賣'); b3.onclick = () => sell(inst.qty);
          row.appendChild(b1); row.appendChild(b2); row.appendChild(b3);
        } else { const b = el('button', 'btn sm', '賣'); b.onclick = () => sell(1); row.appendChild(b); }
        list.appendChild(row);
      }
      const junk = items.filter((i) => ITEMS[i.id].type === 'junk');
      if (junk.length) {
        const b = el('button', 'btn', '一鍵販賣所有戰利品');
        b.onclick = () => { let sum = 0; for (const inst of junk) { sum += sellPrice(inst, true) * inst.qty; removeItem(inst, inst.qty); } p.gold += sum; castleTax(sum, 'trade'); SFX.play('coin'); this.log('販賣了所有戰利品，獲得 ' + sum.toLocaleString() + ' 金幣。', 'loot'); this.refresh(); };
        w.body.appendChild(b);
      }
    }
    w.body.appendChild(list);
    w.body.appendChild(el('div', 'inv-foot', '<span>持有金幣 <b>' + p.gold.toLocaleString() + '</b></span><span>負重 ' + weightPct(p) + '%</span>'));
  },
  openCaptain(npc) {
    this.close('captain');
    const w = this.win('captain', npc.title, 16, 60, 320);
    const toIsle = G.map.id === 'overworld';
    w.body.innerHTML = this.dialogHead(npc, toIsle ? '要出海前往<b>翡翠群島</b>嗎？那裡有珊瑚鎮、叢林、海盜灣，還有傳說中的深海巨蛇。建議等級 15 以上。船費 500 金幣。' : '要回<b>銀風港</b>了嗎？船費 500 金幣。');
    const b = el('button', 'btn', toIsle ? '⛵ 出航前往翡翠群島（500）' : '⛵ 返回銀風港（500）');
    b.onclick = () => { const e = sail(toIsle ? 'isle' : 'overworld'); if (e) { this.log(e, 'warn'); SFX.play('error'); } else this.close('captain'); };
    w.body.appendChild(b);
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
    dests.push({ name: '火山隘口', sub: '熾焰火山・建議 Lv 23+', cost: 600, x: W.volcanoGate.x + 1, y: W.volcanoGate.y + 2 });
    if (G.map.id !== 'overworld') for (const d of dests) { d.map = 'overworld'; d.cost = Math.max(d.cost, 800); }
    if (npc.town !== 'oren') { const O = getMap('oren').world; dests.push({ name: '歐瑞城', sub: '北境・建議 Lv 16+', cost: 1000, x: O.city.x, y: O.city.y + 3, map: 'oren' }); }
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
        if (d.map && d.map !== G.map.id) changeMap(d.map, d.x, d.y); else teleportTo(d.x, d.y);
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
    w.npc = npc; w.tab = w.tab || 'me';
    this.renderWh();
    if (!this.windows.inv) this.toggle('inv');
  },
  renderWh() {
    const w = this.windows.wh; if (!w) return;
    const p = G.player;
    w.body.innerHTML = this.dialogHead(w.npc, '要寄放還是領取物品呢？個人倉庫與血盟倉庫在每個村莊都是共通的。');
    const tabs = el('div', 'tabs');
    for (const [k, label] of [['me', '個人倉庫'], ['clan', '血盟倉庫']]) { const t = el('button', 'tab' + (w.tab === k ? ' on' : ''), label); t.onclick = () => { w.tab = k; this.renderWh(); }; tabs.appendChild(t); }
    w.body.appendChild(tabs);
    if (w.tab === 'clan') { this.renderClanVault(w); return; }
    w.body.appendChild(el('div', 'dim small', '個人倉庫（點擊領取，最多 60 格）'));
    const g1 = el('div', 'grid');
    for (let i = 0; i < 30; i++) g1.appendChild(this.slotEl(p.wh[i], (inst) => {
      if (!canCarry(inst.id, inst.qty)) { this.log('太重了，無法領取。', 'warn'); return; }
      p.wh.splice(p.wh.indexOf(inst), 1); addItem(inst.id, inst.qty, inst.ench, true); this.refresh();
    }));
    w.body.appendChild(g1);
    w.body.appendChild(el('div', 'dim small', '背包（點擊寄放）'));
    const g2 = el('div', 'grid');
    for (let i = 0; i < INV_MAX; i++) g2.appendChild(this.slotEl(p.inv[i], (inst) => {
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
    const L = v.life;
    const line = L ? ({ hunt: pick(['正在練功中！', '這附近的怪還不錯打。', '你也是來練功的嗎？']), travel: '藥水快沒了，正要回村補給。', errand: '在買東西，等我一下～', rest: pick(['在篝火旁休息一下真舒服。', '休息完再出發！']), leave: '準備出發去練功了！' }[L.state] || '你好！')
      : pick(['今天天氣真好。', '你也是冒險者嗎？', '聽說灰岩城的守衛很強。', '我正在找一個好血盟。', '要不要一起去狩獵？']);
    w.body.innerHTML = this.dialogHead({ name: v.name, title: CLASSES[v.cls].name + ' Lv.' + v.level }, (v.clan ? '<span class="dim">[' + esc(v.clan) + ']</span><br>' : '') + line);
    const row = el('div', 'btnrow');
    if (p.clan && !v.clan) {
      const b = el('button', 'btn', '邀請加入血盟');
      b.onclick = () => { const e = recruit(v); if (e) { this.log(e, 'warn'); } this.close('vill'); };
      row.appendChild(b);
    }
    if (v.kind === 'fighter') { const tb = el('button', 'btn', '交易'); tb.onclick = () => { this.close('vill'); Trade.request(v); }; row.appendChild(tb); }
    if (v.kind === 'fighter') row.appendChild(el('div', 'dim small', '提示：按住 Ctrl 或 Shift 點擊才會強制攻擊（會變成紫名）。'));
    w.body.appendChild(row);
    v.face(p.x, p.y);
  },
  // 選擇要強化的裝備（身上與背包裡的都可以）
  chooseEnchant(list, scrollName, cb) {
    this.close('choose');
    const w = this.win('choose', '使用「' + scrollName + '」', window.innerWidth / 2 - 160, 120, 320);
    const box = el('div', 'list');
    for (const { inst, where } of list) {
      const row = el('div', 'li');
      row.appendChild(iconCanvas(inst.id, 28));
      row.appendChild(el('div', 'li-n', '<b>' + esc(itemName(inst)) + '</b><span class="dim">' + where + '・安全值 +' + ITEMS[inst.id].safe + ((inst.ench || 0) >= ITEMS[inst.id].safe ? '・<span class="bad">可能會消失</span>' : '') + '</span>'));
      const b = el('button', 'btn sm', '強化');
      b.onclick = () => { this.close('choose'); cb(inst); };
      row.appendChild(b);
      row.addEventListener('mouseenter', (e) => this.showTip(inst, e));
      row.addEventListener('mouseleave', () => this.hideTip());
      box.appendChild(row);
    }
    w.body.appendChild(box);
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
      <p><b>夥伴</b>：召喚術、迷魅術與寵物都會跟著你戰鬥。按 T 開啟夥伴視窗切換「攻擊我的目標／自由攻擊／待命／跟隨」。寵物在村莊的寵物商人購買，或用馴獸肉乾馴服體力低於一半的野狼。</p>
      <p><b>聊天</b>：在對話欄打字，附近的冒險者和 NPC 會回應你。輸入 /help 查看指令。</p>
      <p><b>快捷鍵</b>：1-0 快捷列・Tab／I 背包・C 角色・S 魔法・T 夥伴・P 血盟・M 世界地圖・N 小地圖・O 設定・Q 最近的怪物・Enter 聊天・Esc 關閉</p>
      <p><b>備份</b>：設定裡可以匯出角色檔案或複製存檔碼，在選擇角色畫面「匯入角色」即可轉移到其他裝置。</p>
      <p class="dim">遊戲每 30 秒自動存檔。</p></div>`;
  },
};

// ===== 夥伴與寵物介面 =====
Object.assign(UI, {
  renderPet() {
    const w = this.windows.pet; if (!w) return;
    const p = G.player, mode = petMode();
    w.body.innerHTML = '';
    const modes = el('div', 'tabs');
    for (const k in PET_MODES) { const b = el('button', 'tab' + (mode === k ? ' on' : ''), PET_MODES[k]); b.onclick = () => setPetMode(k); modes.appendChild(b); }
    w.body.appendChild(modes);
    w.body.appendChild(el('div', 'dim small', '攻擊我的目標：協助攻擊你正在打的敵人與攻擊你的敵人。自由攻擊：主動攻擊附近敵人。待命：留在原地。跟隨：只跟著你不戰鬥。安全區域內不會戰鬥。'));
    const list = el('div', 'list');
    const all = companions();
    const mc = ownsCastle() && p.castle.mercs && p.castle.mercs.length ? p.castle.mercs : null;
    if (mc) {
      const fol = mc.filter((e) => e.follow).length;
      const r = el('div', 'btnrow');
      r.appendChild(el('span', 'small', '傭兵：' + fol + ' 名跟隨中、' + (mc.length - fol) + ' 名在灰岩城駐守　'));
      const b1 = el('button', 'btn sm', '全部跟隨'); b1.onclick = () => { setMercFollow('all', true); this.renderPet(); };
      const b2 = el('button', 'btn sm', '全部回城'); b2.onclick = () => { setMercFollow('all', false); this.renderPet(); };
      r.appendChild(b1); r.appendChild(b2); w.body.appendChild(r);
    }
    if (!all.length) list.appendChild(el('div', 'dim', '目前沒有夥伴。'));
    for (const a of all) {
      const row = el('div', 'li');
      const kind = a.companion === 'pet' ? '寵物' : a.companion === 'summon' ? '召喚獸' : '迷魅';
      const left = a.expire ? Math.max(0, Math.ceil((a.expire - G.t) / 60)) + ' 分' : '';
      const expBar = a.pet ? '<div class="expmini" title="經驗值"><div style="width:' + Math.min(100, Math.round(100 * a.pet.exp / petExpNeed(a.pet.level))) + '%"></div></div>' : '';
      row.appendChild(el('div', 'li-n', '<b>' + esc(a.name) + ' <span class="dim">Lv.' + a.level + (a.pet ? '・經驗 ' + Math.floor(100 * a.pet.exp / petExpNeed(a.pet.level)) + '%' : '') + '</span></b><span class="dim">' + kind + (left ? '・剩 ' + left : '') +
        '</span><div class="hpmini"><div style="width:' + Math.round(100 * a.hp / a.maxHp) + '%"></div></div>' + expBar));
      if (a.companion === 'pet') {
        const b1 = el('button', 'btn sm', '改名'); b1.onclick = () => { const n = prompt('幫 ' + a.name + ' 取個新名字（1～8 字）：', a.name); if (n && n.trim()) { a.name = a.pet.name = n.trim().slice(0, 8); this.refresh(); } };
        const b2 = el('button', 'btn sm', '收回'); b2.onclick = () => { recallPet(a); this.refresh(); };
        row.appendChild(b1); row.appendChild(b2);
      } else {
        const b = el('button', 'btn sm', a.companion === 'charm' ? '解除' : '遣返'); b.onclick = () => { dismissCompanion(a, a.name + ' 離開了。'); this.refresh(); };
        row.appendChild(b);
      }
      list.appendChild(row);
    }
    w.body.appendChild(list);
    const collars = p.inv.filter((i) => i.pet);
    if (collars.length) {
      w.body.appendChild(el('div', 'dim small', '背包中的寵物項圈（點擊召喚／收回）'));
      const g = el('div', 'grid');
      for (const c of collars) g.appendChild(this.slotEl(c, (it) => useCollar(it)));
      w.body.appendChild(g);
    }
    w.body.appendChild(el('div', 'dim small', '召喚獸最多 ' + MAX_SUMMONS + ' 隻、迷魅最多 ' + MAX_CHARMS + ' 隻、寵物一次 1 隻。夥伴擊殺的經驗值一半歸你、一半歸夥伴。快捷鍵 T。'));
  },
  openPetShop(npc) {
    this.close('petshop');
    const w = this.win('petshop', npc.title, 16, 60, 360);
    w.npc = npc;
    this.renderPetshop();
  },
  renderPetshop() {
    const w = this.windows.petshop; if (!w) return;
    const p = G.player;
    w.body.innerHTML = this.dialogHead(w.npc, '要帶一隻寵物回家嗎？牠們會跟著你一起冒險、一起成長。');
    const list = el('div', 'list');
    for (const k in PETS) {
      const d = PETS[k];
      const row = el('div', 'li');
      const cv = makeCanvas(56, 48); const g = cv.getContext('2d'); g.translate(28, 42);
      const o = { dir: 0.4, moving: false, walk: 0, t: G.t, atk: -1, color: d.color, scale: 0.9 };
      ({ pwolf: () => drawWolf(g, 0, 0, Object.assign(o, { scale: 0.7 })), fox: () => drawFox(g, 0, 0, o), bear: () => drawBear(g, 0, 4, o), owl: () => drawOwl(g, 0, 10, o), boar: () => drawBoar(g, 0, 0, o), wisp: () => drawWisp(g, 0, 6, o) })[d.sprite]();
      cv.style.width = '42px'; cv.style.height = '36px';
      row.appendChild(cv);
      row.appendChild(el('div', 'li-n', '<b>' + d.name + '</b><span class="dim">' + d.desc + '</span>'));
      if (d.price) {
        row.appendChild(el('div', 'price', d.price.toLocaleString()));
        const b = el('button', 'btn sm', '購買');
        b.onclick = () => {
          if (p.gold < d.price) { this.log('金幣不足。', 'warn'); SFX.play('error'); return; }
          const n = prompt('幫你的' + d.name + '取個名字（1～8 字）：', d.name); if (n === null) return;
          const c = addPetCollar(newPetData(k, 1, (n.trim() || d.name).slice(0, 8)));
          if (c) { p.gold -= d.price; SFX.play('coin'); this.log('你買下了寵物「' + c.pet.name + '」！點擊背包裡的寵物項圈召喚牠。', 'level'); this.refresh(); }
        };
        row.appendChild(b);
      } else row.appendChild(el('div', 'dim small', '野外馴服'));
      list.appendChild(row);
    }
    w.body.appendChild(list);
    // 道具
    const it = el('div', 'li');
    it.appendChild(iconCanvas('tame_jerky', 28));
    it.appendChild(el('div', 'li-n', '<b>馴獸肉乾</b><span class="dim">' + ITEMS.tame_jerky.desc + '</span>'));
    it.appendChild(el('div', 'price', ITEMS.tame_jerky.price));
    for (const q of [1, 10]) { const b = el('button', 'btn sm', q > 1 ? '×10' : '買'); b.onclick = () => { const c = ITEMS.tame_jerky.price * q; if (p.gold < c) { SFX.play('error'); return; } if (addItem('tame_jerky', q)) { p.gold -= c; SFX.play('coin'); this.refresh(); } }; it.appendChild(b); }
    w.body.appendChild(el('div', 'list')).appendChild(it);
    // 復活
    const dead = p.inv.filter((i) => i.pet && i.pet.dead);
    if (dead.length) {
      w.body.appendChild(el('div', 'dim small', '復活倒下的寵物'));
      for (const c of dead) {
        const cost = 100 * c.pet.level;
        const row = el('div', 'li');
        row.appendChild(el('div', 'li-n', '<b>' + esc(c.pet.name) + ' Lv.' + c.pet.level + '</b><span class="dim">' + PETS[c.pet.kind].name + '</span>'));
        row.appendChild(el('div', 'price', cost));
        const b = el('button', 'btn sm', '復活');
        b.onclick = () => { if (p.gold < cost) { this.log('金幣不足。', 'warn'); SFX.play('error'); return; } p.gold -= cost; c.pet.dead = false; c.pet.hp = null; SFX.play('heal'); this.log(c.pet.name + ' 復活了！', 'level'); this.refresh(); };
        row.appendChild(b); w.body.appendChild(row);
      }
    }
    w.body.appendChild(el('div', 'inv-foot', '<span>持有金幣 <b>' + p.gold.toLocaleString() + '</b></span>'));
  },
});
function sellPrice(inst, forShop) {
  const d = ITEMS[inst.id];
  const base = d.type === 'junk' ? d.price : Math.floor(d.price * 0.4);
  return base + (inst.ench ? inst.ench * inst.ench * 30 : 0);
}
