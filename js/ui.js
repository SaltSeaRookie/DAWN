'use strict';
// ===== 介面 =====
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function iconCanvas(id, size, kind = 'item') {
  const c = makeCanvas(size * 2, size * 2);
  c.style.width = size + 'px'; c.style.height = size + 'px';
  const g = c.getContext('2d'); g.scale(2, 2);
  if (kind === 'item') drawItemIcon(g, id, 0, 0, size); else drawSkillIcon(g, id, 0, 0, size);
  return c;
}

const UI = {
  windows: {}, mmT: 0, logLines: [],
  init() {
    // 快捷列
    const hb = $('#hotbar');
    HOTBAR.forEach((h, i) => {
      const s = el('div', 'slot hot');
      const ic = h.kind === 'item' ? iconCanvas(h.id, 34) : iconCanvas(h.kind === 'auto' ? 'auto' : h.id, 34, 'skill');
      s.appendChild(ic);
      s.appendChild(el('span', 'key', String(i + 1)));
      const q = el('span', 'qty'); s.appendChild(q);
      s.title = h.kind === 'item' ? ITEMS[h.id].name : h.kind === 'skill' ? SKILLS[h.id].name + '（MP ' + SKILLS[h.id].mp + '，需等級 ' + SKILLS[h.id].lvl + '）' : '自動狩獵';
      s.addEventListener('click', () => useHotbar(i));
      hb.appendChild(s);
      h._el = s; h._q = q;
    });
    $('#btnInv').onclick = () => this.toggle('inv');
    $('#btnChar').onclick = () => this.toggle('char');
    $('#btnMap').onclick = () => this.toggleMinimap();
    $('#btnSave').onclick = () => saveGame(false);
    $('#btnHelp').onclick = () => this.help();
    // 聊天
    const ci = $('#chatInput');
    ci.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const v = ci.value.trim(); ci.value = '';
        if (v) this.chat(v);
        ci.blur();
      } else if (e.key === 'Escape') ci.blur();
    });
    // 音樂 / 音效開關
    const bm = $('#btnMusic'), bs = $('#btnSfx');
    const sync = () => {
      bm.classList.toggle('off', !Snd.musicOn); bm.title = '背景音樂：' + (Snd.musicOn ? '開' : '關');
      bs.classList.toggle('off', !Snd.sfxOn); bs.title = '音效：' + (Snd.sfxOn ? '開' : '關');
    };
    bm.onclick = () => { Snd.unlock(); Snd.setMusic(!Snd.musicOn); sync(); };
    bs.onclick = () => { Snd.unlock(); Snd.setSfx(!Snd.sfxOn); sync(); SFX.play('click'); };
    sync();
    // 開始畫面
    this.initStart();
  },

  initStart() {
    const save = loadSave();
    let cls = 'knight';
    const cards = document.querySelectorAll('.cls');
    cards.forEach((c) => c.addEventListener('click', () => { cards.forEach((x) => x.classList.remove('sel')); c.classList.add('sel'); cls = c.dataset.cls; }));
    // 職業預覽
    document.querySelectorAll('.cls canvas').forEach((cv) => {
      const g = cv.getContext('2d'); const k = cv.dataset.cls;
      cv.width = 160; cv.height = 180; g.scale(2, 2);
      let t = 0;
      const draw = () => {
        if (!$('#start').classList.contains('show')) return;
        t += 0.016;
        g.clearRect(0, 0, 80, 90);
        drawShadow(g, 40, 80, 14, 5);
        const look = Object.assign({}, PLAYER_LOOK[k], ARMOR_LOOK.leather, { weapon: k === 'knight' ? 'sword' : 'bow' });
        g.save(); g.translate(40, 80); g.scale(1.4, 1.4); g.translate(-40, -80);
        drawHumanoid(g, 40, 80, Object.assign(look, { dir: 0.3, moving: true, walk: t * 9, t, atk: -1 }));
        g.restore();
        requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    });
    if (save) {
      $('#continueBox').style.display = 'block';
      $('#continueInfo').textContent = save.name + '（' + CLASSES[save.cls].name + ' Lv.' + save.level + '）';
      $('#btnContinue').onclick = () => { $('#start').classList.remove('show'); startGame(save); };
      $('#btnDelete').onclick = () => { if (confirm('確定要刪除存檔嗎？')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } $('#continueBox').style.display = 'none'; } };
    }
    $('#btnStart').onclick = () => {
      const name = ($('#nameInput').value.trim() || '無名勇者').slice(0, 10);
      $('#start').classList.remove('show');
      startGame(null, name, cls);
    };
    $('#nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnStart').click(); });
  },

  log(text, cls) {
    if (!text) return;
    const box = $('#chatLog');
    const line = el('div', 'ln ' + (cls || ''));
    line.textContent = text;
    box.appendChild(line);
    while (box.children.length > 80) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  },
  chat(v) {
    const p = G.player;
    if (v === '/help') { this.help(); return; }
    if (v === '/save') { saveGame(false); return; }
    p.speak(v, 5);
    this.log(p.name + '：' + v, 'me');
    if (/飛龍/.test(v)) later(2, () => { const o = pick(G.others); if (o) { o.speak('飛龍很強，記得帶橙水！', 4); this.log(o.name + '：飛龍很強，記得帶橙水！', 'chat'); } });
    else if (/(哈囉|你好|嗨|hi|hello)/i.test(v)) later(1.5, () => { const o = pick(G.others.filter((x) => !x.isDog)); if (o) { o.speak('你好呀～', 3); this.log(o.name + '：你好呀～', 'chat'); } });
  },
  focusChat() { $('#chatInput').focus(); },
  blurChat() { $('#chatInput').blur(); },
  chatFocused() { return document.activeElement === $('#chatInput') || (document.activeElement && document.activeElement.tagName === 'INPUT'); },

  zone(name, safe) {
    $('#zoneLabel').textContent = name;
    const zt = $('#zoneType');
    zt.textContent = safe ? 'Safety zone · 安全區域' : 'Normal zone · 一般區域';
    zt.className = safe ? 'safe' : '';
    const big = $('#zoneBanner');
    big.textContent = name; big.classList.remove('show'); void big.offsetWidth; big.classList.add('show');
  },

  refresh() {
    const p = G.player; if (!p) return;
    $('#hpFill').style.width = (100 * p.hp / p.maxHp) + '%';
    $('#mpFill').style.width = (100 * p.mp / p.maxMp) + '%';
    $('#hpText').textContent = 'HP:' + Math.ceil(p.hp) + '/' + p.maxHp;
    $('#mpText').textContent = 'MP:' + Math.floor(p.mp) + '/' + p.maxMp;
    const need = expForLevel(p.level);
    $('#lvText').textContent = 'Lv.' + p.level;
    $('#expText').textContent = (100 * p.exp / need).toFixed(4) + '%';
    $('#expFill').style.width = (100 * p.exp / need) + '%';
    $('#acText').textContent = p.ac;
    $('#goldText').textContent = p.gold.toLocaleString();
    $('#honorText').textContent = p.honor;
    $('#honorFill').style.width = (100 * p.honor / 32767) + '%';
    HOTBAR.forEach((h) => {
      if (h.kind === 'item') { const n = countItem(h.id); h._q.textContent = n || ''; h._el.classList.toggle('empty', !n); }
      else if (h.kind === 'skill') { const ok = p.level >= SKILLS[h.id].lvl; h._el.classList.toggle('empty', !ok); h._q.textContent = ok ? '' : 'Lv' + SKILLS[h.id].lvl; }
      else { h._q.textContent = G.autoHunt ? 'ON' : ''; h._el.classList.toggle('on', G.autoHunt); }
    });
    if (this.windows.inv) this.renderInv();
    if (this.windows.char) this.renderChar();
    if (this.windows.shop) this.renderShop();
  },

  tick(dt) {
    const p = G.player;
    // 狀態圖示
    const bf = $('#buffs');
    const keys = Object.keys(p.buffs);
    const sig = keys.map((k) => k + Math.ceil(p.buffs[k])).join();
    if (sig !== this._buffSig) {
      this._buffSig = sig;
      bf.innerHTML = '';
      for (const k of keys) {
        const b = el('div', 'buff');
        b.appendChild(iconCanvas(k === 'haste' ? 'haste' : k, 30, 'skill'));
        b.appendChild(el('span', '', Math.ceil(p.buffs[k]) + 's'));
        b.title = { haste: '加速', holy: '神聖武器', shield: '防護罩' }[k];
        bf.appendChild(b);
      }
    }
    // 回復條等
    this.slowT = (this.slowT || 0) + dt;
    if (this.slowT > 0.25) {
      this.slowT = 0;
      $('#hpFill').style.width = (100 * p.hp / p.maxHp) + '%';
      $('#mpFill').style.width = (100 * p.mp / p.maxMp) + '%';
      $('#hpText').textContent = 'HP:' + Math.ceil(p.hp) + '/' + p.maxHp;
      $('#mpText').textContent = 'MP:' + Math.floor(p.mp) + '/' + p.maxMp;
      $('#hpFill').classList.toggle('low', p.hp / p.maxHp < 0.3);
      const b = daylight();
      $('#dayIcon').textContent = b > 0.45 ? '☀' : '☾';
      $('#dayFill').style.width = (G.day * 100) + '%';
      if (!$('#minimapWrap').classList.contains('hide')) drawMinimap($('#minimap'));
    }
  },

  toggleMinimap() { $('#minimapWrap').classList.toggle('hide'); },

  // ---------- 視窗 ----------
  win(id, title, x, y, w) {
    if (this.windows[id]) return this.windows[id];
    const d = el('div', 'win');
    d.style.left = x + 'px'; d.style.top = y + 'px'; if (w) d.style.width = w + 'px';
    const head = el('div', 'win-h', '<span>' + esc(title) + '</span>');
    const close = el('button', 'win-x', 'Close');
    close.onclick = () => { SFX.play('click'); this.close(id); };
    head.appendChild(close);
    const body = el('div', 'win-b');
    d.appendChild(head); d.appendChild(body);
    // 拖曳
    let drag = null;
    head.addEventListener('pointerdown', (e) => { if (e.target === close) return; drag = [e.clientX - d.offsetLeft, e.clientY - d.offsetTop]; head.setPointerCapture(e.pointerId); });
    head.addEventListener('pointermove', (e) => { if (drag) { d.style.left = clamp(e.clientX - drag[0], 0, window.innerWidth - 80) + 'px'; d.style.top = clamp(e.clientY - drag[1], 0, window.innerHeight - 40) + 'px'; } });
    head.addEventListener('pointerup', () => { drag = null; });
    $('#windows').appendChild(d);
    SFX.play('open');
    this.windows[id] = { el: d, body };
    return this.windows[id];
  },
  close(id) { const w = this.windows[id]; if (w) { w.el.remove(); delete this.windows[id]; } this.hideTip(); },
  closeAll() { for (const k in this.windows) this.close(k); },
  toggle(id) {
    if (this.windows[id]) { this.close(id); return; }
    const mob = window.innerWidth < 760;
    if (id === 'inv') { this.win('inv', '背包', mob ? 6 : window.innerWidth - 300, mob ? 50 : 70, 284); this.renderInv(); }
    if (id === 'char') { this.win('char', '角色資訊', mob ? 6 : 20, mob ? 50 : 70, 270); this.renderChar(); }
  },

  slotEl(inst, onClick) {
    const s = el('div', 'slot');
    if (inst) {
      s.appendChild(iconCanvas(inst.id, 34));
      if (inst.qty > 1) s.appendChild(el('span', 'qty', inst.qty));
      if (inst.ench) s.appendChild(el('span', 'ench', '+' + inst.ench));
      s.addEventListener('mouseenter', (e) => this.showTip(inst, e));
      s.addEventListener('mouseleave', () => this.hideTip());
      if (onClick) s.addEventListener('click', () => { this.hideTip(); onClick(inst); });
    }
    return s;
  },
  showTip(inst, e) {
    const d = ITEMS[inst.id];
    let h = '<b>' + esc(itemName(inst)) + '</b>';
    if (d.type === 'weapon') h += '<div>攻擊力 ' + (d.dmg[0] + (inst.ench || 0)) + '-' + (d.dmg[1] + (inst.ench || 0)) + '</div><div>' + (d.ranged ? '遠程，射程 ' + d.range : '近戰') + '</div>';
    if (d.type === 'armor') h += '<div>防禦 AC ' + (d.ac + (inst.ench || 0)) + '</div>';
    if (d.desc) h += '<div class="dim">' + esc(d.desc) + '</div>';
    h += '<div class="dim">售價 ' + Math.floor(d.price * (d.type === 'junk' ? 1 : 0.4)) + ' 金幣</div>';
    const t = $('#tip'); t.innerHTML = h; t.style.display = 'block';
    const r = e.target.getBoundingClientRect();
    t.style.left = clamp(r.left - 10, 4, window.innerWidth - 220) + 'px';
    t.style.top = Math.max(4, r.top - t.offsetHeight - 6) + 'px';
  },
  hideTip() { $('#tip').style.display = 'none'; },

  renderInv() {
    const w = this.windows.inv; if (!w) return;
    const p = G.player;
    w.body.innerHTML = '';
    const grid = el('div', 'grid');
    for (let i = 0; i < 40; i++) {
      const inst = p.inv[i];
      grid.appendChild(this.slotEl(inst, (it) => useItem(it)));
    }
    w.body.appendChild(grid);
    w.body.appendChild(el('div', 'inv-foot', '<span>金幣 <b>' + p.gold.toLocaleString() + '</b></span><span class="dim">點擊使用 / 裝備</span>'));
  },

  renderChar() {
    const w = this.windows.char; if (!w) return;
    const p = G.player, wp = p.weapon;
    const ench = p.equip.weapon ? p.equip.weapon.ench || 0 : 0;
    w.body.innerHTML = '';
    const info = el('div', 'stats', `
      <div class="row"><span>名稱</span><b>${esc(p.name)}</b></div>
      <div class="row"><span>職業</span><b>${CLASSES[p.cls].name}</b></div>
      <div class="row"><span>等級</span><b>${p.level}</b></div>
      <div class="row"><span>經驗值</span><b>${p.exp} / ${expForLevel(p.level)}</b></div>
      <div class="row"><span>體力</span><b>${Math.ceil(p.hp)} / ${p.maxHp}</b></div>
      <div class="row"><span>魔力</span><b>${Math.floor(p.mp)} / ${p.maxMp}</b></div>
      <div class="row"><span>攻擊力</span><b>${wp.dmg[0] + ench + Math.floor(p.level / 3)} - ${wp.dmg[1] + ench + Math.floor(p.level / 3)}</b></div>
      <div class="row"><span>攻擊方式</span><b>${wp.ranged ? '遠程（射程 ' + wp.range + '）' : '近戰'}</b></div>
      <div class="row"><span>防禦 AC</span><b>${p.ac}</b></div>
      <div class="row"><span>正義值</span><b>${p.honor}</b></div>
      <div class="row"><span>擊殺數</span><b>${p.kills}</b></div>`);
    w.body.appendChild(info);
    const eq = el('div', 'equip');
    for (const [slot, label] of [['weapon', '武器'], ['armor', '盔甲']]) {
      const box = el('div', 'eq');
      box.appendChild(el('div', 'dim', label));
      box.appendChild(this.slotEl(p.equip[slot], () => unequip(slot)));
      box.appendChild(el('div', 'eqn', p.equip[slot] ? esc(itemName(p.equip[slot])) : '（無）'));
      eq.appendChild(box);
    }
    w.body.appendChild(eq);
    w.body.appendChild(el('div', 'dim small', '點擊裝備可卸下'));
  },

  // ---------- NPC ----------
  openNPC(npc) {
    if (npc.role === 'general' || npc.role === 'smith') this.openShop(npc);
    else if (npc.role === 'teleport') this.openTeleport(npc);
    else if (npc.role === 'quest') this.openQuest(npc);
  },
  dialogHead(npc, text) {
    return '<div class="npc-head"><b>' + esc(npc.name) + '</b> <span class="dim">[' + esc(npc.title) + ']</span></div><div class="npc-text">' + text + '</div>';
  },
  openShop(npc) {
    this.close('shop');
    const w = this.win('shop', npc.title, window.innerWidth < 760 ? 6 : 20, window.innerWidth < 760 ? 50 : 70, 330);
    w.npc = npc; w.tab = 'buy';
    this.renderShop();
    if (!this.windows.inv) this.toggle('inv');
  },
  renderShop() {
    const w = this.windows.shop; if (!w) return;
    const p = G.player, npc = w.npc;
    w.body.innerHTML = this.dialogHead(npc, npc.role === 'general' ? '歡迎光臨！需要些什麼嗎？' : '看看我的武器和盔甲吧！');
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
        const row = el('div', 'li');
        row.appendChild(iconCanvas(id, 28));
        row.appendChild(el('div', 'li-n', '<b>' + d.name + '</b><span class="dim">' + (d.type === 'weapon' ? '攻擊 ' + d.dmg[0] + '-' + d.dmg[1] + (d.ranged ? ' 遠程' : '') : d.type === 'armor' ? 'AC ' + d.ac : esc(d.desc)) + '</span>'));
        row.appendChild(el('div', 'price', d.price.toLocaleString()));
        const qtys = d.stack ? [1, 10] : [1];
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
        const d = ITEMS[inst.id];
        const each = Math.floor(d.price * (d.type === 'junk' ? 1 : 0.4)) + (inst.ench ? inst.ench * 50 : 0);
        const row = el('div', 'li');
        row.appendChild(iconCanvas(inst.id, 28));
        row.appendChild(el('div', 'li-n', '<b>' + esc(itemName(inst)) + '</b><span class="dim">每個 ' + each + ' 金幣</span>'));
        const b = el('button', 'btn sm', inst.qty > 1 ? '全賣' : '賣');
        b.onclick = () => {
          const q = inst.qty;
          p.gold += each * q; removeItem(inst, q); SFX.play('coin');
          this.log('賣出 ' + d.name + (q > 1 ? ' ×' + q : '') + '，獲得 ' + each * q + ' 金幣。', 'loot');
          this.refresh();
        };
        row.appendChild(b);
        list.appendChild(row);
      }
      const junk = items.filter((i) => ITEMS[i.id].type === 'junk');
      if (junk.length) {
        const b = el('button', 'btn', '一鍵販賣所有戰利品');
        b.onclick = () => {
          let sum = 0;
          for (const inst of junk) { sum += ITEMS[inst.id].price * inst.qty; removeItem(inst, inst.qty); }
          p.gold += sum; SFX.play('coin'); this.log('販賣了所有戰利品，獲得 ' + sum + ' 金幣。', 'loot'); this.refresh();
        };
        w.body.appendChild(b);
      }
    }
    w.body.appendChild(list);
    w.body.appendChild(el('div', 'inv-foot', '<span>持有金幣 <b>' + p.gold.toLocaleString() + '</b></span>'));
  },
  openTeleport(npc) {
    this.close('tp');
    const w = this.win('tp', npc.title, window.innerWidth < 760 ? 6 : 20, window.innerWidth < 760 ? 50 : 70, 300);
    const W = G.world;
    const ends = W.roadEnds;
    // 道路上距離村莊約 28 格的點
    const along = (k, frac) => ({ x: lerp(W.cx, ends[k].x, frac), y: lerp(W.cy, ends[k].y, frac) });
    const dests = [
      { name: '碧波草原', lv: '建議 Lv 1-6', cost: 60, p: along(1, 0.32) },
      { name: '幽影森林', lv: '建議 Lv 4-12', cost: 120, p: along(2, 0.35) },
      { name: '骸骨荒原', lv: '建議 Lv 7-16', cost: 200, p: along(0, 0.35) },
      { name: '赤岩峽谷', lv: '建議 Lv 12+', cost: 320, p: along(3, 0.4) },
    ];
    w.body.innerHTML = this.dialogHead(npc, '要去哪裡呢？我可以用魔法送你一程。');
    const list = el('div', 'list');
    for (const d of dests) {
      const row = el('div', 'li');
      row.appendChild(el('div', 'li-n', '<b>' + d.name + '</b><span class="dim">' + d.lv + '</span>'));
      row.appendChild(el('div', 'price', d.cost));
      const b = el('button', 'btn sm', '傳送');
      b.onclick = () => {
        const p = G.player;
        if (p.gold < d.cost) { this.log('金幣不足。', 'warn'); SFX.play('error'); return; }
        let tx = Math.floor(d.p.x), ty = Math.floor(d.p.y);
        for (let r = 0; r < 5 && W.blocked(tx, ty); r++) { tx += randi(-1, 1); ty += randi(-1, 1); }
        if (W.blocked(tx, ty)) { this.log('傳送失敗。', 'warn'); return; }
        p.gold -= d.cost; this.close('tp');
        teleportTo(tx + 0.5, ty + 0.5);
        this.log('艾琳：祝你好運！', 'npc');
        this.refresh();
      };
      row.appendChild(b);
      list.appendChild(row);
    }
    w.body.appendChild(list);
  },
  openQuest(npc) {
    this.close('quest');
    const w = this.win('quest', npc.title, window.innerWidth < 760 ? 6 : 20, window.innerWidth < 760 ? 50 : 70, 320);
    const p = G.player, q = p.quest, Q = QUESTS[q.idx];
    let html, btn = null;
    if (!Q) html = '你已經完成了所有委託，真正的英雄！村子的和平都靠你了。';
    else if (!q.active) { html = Q.text + '<div class="reward">報酬：' + Q.gold + ' 金幣、' + Q.exp + ' 經驗值、' + ITEMS[Q.item[0]].name + ' ×' + Q.item[1] + '</div>'; btn = ['接受委託', () => { q.active = true; q.count = 0; SFX.play('quest'); this.log('【委託】接受：消滅 ' + MONSTERS[Q.target].name + ' ×' + Q.count, 'quest'); this.close('quest'); }]; }
    else if (q.count >= Q.count) {
      html = '做得好！這是你的報酬。';
      btn = ['領取報酬', () => {
        p.gold += Q.gold; SFX.play('quest'); addItem(Q.item[0], Q.item[1]); gainExp(Q.exp);
        this.log('【委託】完成！獲得 ' + Q.gold + ' 金幣、' + Q.exp + ' 經驗值、' + ITEMS[Q.item[0]].name + ' ×' + Q.item[1], 'quest');
        q.idx++; q.active = false; q.count = 0; saveGame(true); this.close('quest'); this.refresh();
      }];
    } else html = Q.text + '<div class="reward">進度：' + MONSTERS[Q.target].name + ' ' + q.count + ' / ' + Q.count + '</div>';
    w.body.innerHTML = this.dialogHead(npc, html);
    if (btn) { const b = el('button', 'btn', btn[0]); b.onclick = btn[1]; w.body.appendChild(b); }
  },

  showDeath() {
    const d = $('#death'); d.classList.add('show');
    $('#btnRespawn').onclick = () => { d.classList.remove('show'); respawn(); };
  },
  help() {
    this.close('help');
    const w = this.win('help', '遊戲說明', Math.max(6, window.innerWidth / 2 - 180), 60, 360);
    w.body.innerHTML = `<div class="help">
      <p><b>移動</b>：點擊地面（按住可持續移動）</p>
      <p><b>攻擊</b>：點擊怪物，會自動接近並攻擊</p>
      <p><b>撿取</b>：點擊地上的物品名稱</p>
      <p><b>對話</b>：點擊村裡的 NPC（商人、傳送師、守備隊長）</p>
      <p><b>1-9</b>：快捷列（藥水、魔法、回村卷軸、自動狩獵）</p>
      <p><b>I</b> 背包　<b>C</b> 角色　<b>M</b> 小地圖　<b>Tab</b> 選擇最近的怪物　<b>Enter</b> 聊天</p>
      <p>村莊是<b>安全區域</b>，怪物無法進入。越遠離村莊的地方怪物越強，峽谷深處住著赤鱗飛龍。</p>
      <p>強化卷軸可以強化裝備，但超過安全值可能會讓裝備消失！</p>
      <p class="dim">遊戲每 30 秒自動存檔於瀏覽器。</p></div>`;
  },
};
