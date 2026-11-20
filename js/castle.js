'use strict';
// ===== 灰岩城：稅收、城主血盟專屬功能、王冠、入盟申請 =====
const TAX_RATES = [0.05, 0.1, 0.15, 0.2];
function castleData() {
  const p = G.player; if (!p || !p.castle || !p.castle.owned) return null;
  const c = p.castle;
  if (c.rate === undefined) c.rate = 0.1;
  c.taxAcc = c.taxAcc || 0;
  c.stats = c.stats || { kill: 0, trade: 0, npc: 0 };
  c.total = c.total || 0;
  return c;
}
// 對一筆金額抽稅，回傳稅額（只有你擁有灰岩城時才會收稅）
function castleTax(amount, source) {
  const c = castleData(); if (!c || !(amount > 0)) return 0;
  const t = Math.floor(amount * c.rate);
  if (t <= 0) return 0;
  c.taxAcc += t; c.total += t; c.stats[source] = (c.stats[source] || 0) + t;
  return t;
}
// 不在畫面附近的冒險者，用模擬的方式計算他們打怪與交易的稅收
function castleEconomyTick(dt) {
  const c = castleData(); if (!c) return;
  G.econT = (G.econT || 0) + dt;
  if (G.econT < 30) return;
  G.econT = 0;
  const p = G.player;
  for (const id of ['overworld', 'isle']) {
    const m = G.maps[id]; if (!m) continue;
    for (const a of m.actors) {
      if (a.kind !== 'fighter' || a.dead) continue;
      const near = G.map === m && dist(a.x, a.y, p.x, p.y) < 36;
      if (near) continue;
      castleTax(randi(20, 60) * (1 + a.level / 10), 'npc');
      if (Math.random() < 0.3) castleTax(randi(100, 400), 'npc');
    }
  }
}

// ===== 王冠旋轉效果 =====
function drawCrown(g, x, y, t, size = 1) {
  const sx = Math.cos(t * 2.2);
  g.save(); g.translate(x, y + Math.sin(t * 3) * 1.5); g.scale(size * (0.25 + 0.75 * Math.abs(sx)), size);
  const front = sx >= 0;
  const gr = g.createLinearGradient(-10, 0, 10, 0);
  gr.addColorStop(0, front ? '#a07010' : '#7a5008'); gr.addColorStop(0.5, front ? '#ffe680' : '#d8b040'); gr.addColorStop(1, front ? '#a07010' : '#7a5008');
  g.shadowColor = '#ffd040'; g.shadowBlur = 8;
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(-10, 4); g.lineTo(-10, -5); g.lineTo(-5, 0); g.lineTo(0, -8); g.lineTo(5, 0); g.lineTo(10, -5); g.lineTo(10, 4); g.closePath(); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = '#c08a10'; g.fillRect(-10, 2, 20, 3);
  g.fillStyle = front ? '#e03040' : '#902030'; g.beginPath(); g.arc(0, 0, 1.8, 0, 7); g.fill();
  g.fillStyle = front ? '#40a0ff' : '#2060a0'; g.beginPath(); g.arc(-6, 2, 1.3, 0, 7); g.arc(6, 2, 1.3, 0, 7); g.fill();
  for (const [px, py] of [[-10, -5], [0, -8], [10, -5]]) { g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(px, py, 1.2, 0, 7); g.fill(); }
  g.restore();
  // 閃光
  if (Math.random() < 0.08) { const a = Math.random() * 7; G.particles.push({ x: G.player.x + Math.cos(a) * 0.2, y: G.player.y + Math.sin(a) * 0.2, z: 78, vx: 0, vy: 0, vz: 15, life: 0.5, max: 0.5, color: '#fff2a0', size: 2 }); }
}

// ===== 入盟申請：其他冒險者（也包含別的血盟）會主動詢問加入 =====
function joinRequestTick(dt) {
  const p = G.player, c = p.clan;
  if (!c || p.dead || G.pendingJoin) return;
  G.joinT = (G.joinT === undefined ? rand(60, 120) : G.joinT) - dt;
  if (G.joinT > 0) return;
  G.joinT = rand(150, 260) - (ownsCastle() ? 60 : 0) - clanLevel() * 5;
  if (c.members.length >= clanCap()) return;
  const cands = G.map.actors.filter((a) => (a.kind === 'fighter' || a.kind === 'villager') && !a.dead && a.clan !== c.name && !a.target && dist(a.x, a.y, p.x, p.y) < 14 && !(a.refuseT && G.t < a.refuseT));
  if (!cands.length) return;
  const v = pick(cands);
  const from = v.clan;
  G.pendingJoin = v;
  const why = ownsCastle() ? '能加入灰岩城的城主血盟是我的榮幸' : from ? '我在「' + from + '」待得不太開心' : '我一直在找好的血盟';
  v.speak('請問我可以加入「' + c.name + '」嗎？', 6);
  UI.log(v.name + '：' + why + '，請問我可以加入「' + c.name + '」嗎？', 'chat');
  SFX.play('quest');
  UI.ask(v.name + '（' + CLASSES[v.cls].name + ' Lv.' + v.level + (from ? '・目前是「' + from + '」成員' : '') + '）想加入你的血盟。', '同意', '婉拒', (yes) => {
    G.pendingJoin = null;
    if (!yes) { v.refuseT = G.t + 300; v.speak('好吧，打擾了。', 3); return; }
    if (!p.clan || p.clan.members.length >= clanCap()) { UI.log('血盟人數已滿。', 'warn'); return; }
    v.clan = c.name; v.emblem = c.emblem; v.clanMember = true;
    c.members.push({ name: v.name, cls: v.cls, level: v.level, look: v.look, rank: 'member', joined: Date.now(), contrib: 0 });
    Names.add(v.name);
    v.speak('太好了！請多指教！', 4);
    log(v.name + ' 加入了血盟「' + c.name + '」！' + (from ? '（離開了「' + from + '」）' : ''), 'level');
    later(1.2, () => clanLog(v.name + '：大家好，請多指教！'));
    SFX.play('quest'); saveGame(true); UI.refresh();
  });
}

// ===== 介面 =====
Object.assign(UI, {
  // 不會擋住遊戲的詢問框
  ask(text, yesLabel, noLabel, cb) {
    const old = document.getElementById('askBox'); if (old) old.remove();
    const box = el('div', '', '<div class="ask-t">' + esc(text) + '</div>');
    box.id = 'askBox';
    const y = el('button', 'btn sm', yesLabel), n = el('button', 'btn sm', noLabel);
    let done = false;
    const fin = (v) => { if (done) return; done = true; box.remove(); cb(v); };
    y.onclick = () => fin(true); n.onclick = () => fin(false);
    box.appendChild(y); box.appendChild(n);
    document.body.appendChild(box);
    setTimeout(() => fin(false), 25000);
  },
  openHerald(npc) {
    this.close('herald');
    const w = this.win('herald', npc.title, 16, 60, 360);
    const p = G.player;
    const row = el('div', 'btnrow');
    const c = castleData();
    if (c) {
      const s = c.stats;
      w.body.innerHTML = this.dialogHead(npc, '城主大人，灰岩城一切安好。') +
        '<div class="taxbox"><div class="row"><span>目前稅率</span><b>' + Math.round(c.rate * 100) + '%</b></div>' +
        '<div class="row"><span>勇者打怪的金幣</span><b>' + s.kill.toLocaleString() + '</b></div>' +
        '<div class="row"><span>商店交易</span><b>' + s.trade.toLocaleString() + '</b></div>' +
        '<div class="row"><span>各地冒險者的活動</span><b>' + s.npc.toLocaleString() + '</b></div>' +
        '<div class="row total"><span>可領取稅金</span><b>' + Math.floor(c.taxAcc).toLocaleString() + '</b></div>' +
        '<div class="row"><span>累計稅收</span><b>' + Math.floor(c.total).toLocaleString() + '</b></div></div>';
      const b = el('button', 'btn', '領取稅金');
      b.onclick = () => { const t = Math.floor(c.taxAcc); if (!t) return; p.gold += t; c.taxAcc = 0; c.stats = { kill: 0, trade: 0, npc: 0 }; SFX.play('coin'); this.log('領取了 ' + t.toLocaleString() + ' 金幣的稅金。', 'loot'); this.openHerald(npc); this.refresh(); };
      row.appendChild(b);
      w.body.appendChild(row);
      const rates = el('div', 'btnrow');
      rates.appendChild(el('span', 'dim small', '調整稅率：'));
      for (const r of TAX_RATES) { const rb = el('button', 'btn sm' + (c.rate === r ? ' on' : ''), Math.round(r * 100) + '%'); rb.onclick = () => { c.rate = r; this.log('稅率調整為 ' + Math.round(r * 100) + '%。', 'sys'); this.openHerald(npc); }; rates.appendChild(rb); }
      w.body.appendChild(rates);
      const home = el('button', 'btn', p.homeTown === 'castle' ? '✓ 復活點：灰岩城' : '把復活點設在灰岩城（回村卷軸也能回城）');
      home.onclick = () => { p.homeTown = p.homeTown === 'castle' ? 'dawn' : 'castle'; this.log(p.homeTown === 'castle' ? '復活點改為灰岩城。' : '復活點改回晨風村。', 'sys'); this.openHerald(npc); };
      w.body.appendChild(home);
      const gm = G.maps.overworld && G.maps.overworld.gate;
      if (gm) {
        const gb = el('button', 'btn', gm.broken ? '城門已被攻破' : gm.open ? '🚪 關閉城門' : '🚪 開啟城門');
        gb.onclick = () => { const e = toggleGate(); if (e) this.log(e, 'warn'); this.openHerald(npc); };
        w.body.appendChild(gb);
      }
      w.body.appendChild(el('div', 'dim small', '城主血盟專屬：城內的地下要塞練功副本、城堡御用商人（祝福卷軸、王家秘藥）、狩獵經驗 +10%、城門守衛保護。稅收來自所有勇者（包含電腦冒險者）打怪掉落的金幣與商店交易。'));
      w.body.appendChild(el('div', 'npc-text', '🏰 ' + siegeTimeText() + '<br>攻城時間內，其他血盟可能會向灰岩城宣戰，請準備守城！不在城裡時，守軍會替你防守，但有可能失守。'));
      w.body.appendChild(this.clanPowers());
      return;
    }
    const s = G.siege, sc = siegeSchedule();
    let text = '灰岩城目前由<b>' + esc(castleOwnerName()) + '</b>佔領。<br>🏰 ' + siegeTimeText() + '<br>';
    if (s && s.active) text += '<b>攻城戰正在進行中！</b>進攻方：' + esc(s.attackers.join('、')) + '。' + (s.playerAtk ? '擊破城門，摧毀城內的守護之塔！' : '你的血盟也可以加入攻城。');
    else text += '擁有血盟、等級 10 以上的勇者，可以在攻城時間內宣戰。攻城戰持續 10 分鐘，摧毀<b>守護之塔</b>即可佔領城堡。<br>城主可以向各地的狩獵與交易收稅，並使用城內的地下要塞。';
    if (!(s && s.active && s.playerAtk)) {
      const b = el('button', 'btn' + (sc.open ? '' : ' off'), sc.open ? (s && s.active ? '⚔ 加入攻城' : '⚔ 宣戰') : '⚔ 宣戰（' + hhmm(sc.next) + ' 開放）');
      b.onclick = () => { const e = declareSiege(); if (e) { this.log(e, 'warn'); SFX.play('error'); } else this.close('herald'); };
      row.appendChild(b);
    }
    w.body.innerHTML = this.dialogHead(npc, text);
    w.body.appendChild(row);
    w.body.appendChild(this.clanPowers());
  },
  // 大陸上的血盟勢力
  clanPowers() {
    const R = realm(), box = el('div', 'taxbox');
    box.appendChild(el('div', 'dim small', '大陸上的血盟勢力'));
    const own = castleOwnerName();
    const rows = [...R.clans.map((c) => ({ name: c.name, info: '盟主 ' + c.leader + '・約 ' + (c.members || 3) + ' 人・戰力 ' + '★'.repeat(Math.max(1, Math.ceil((c.power || 1) / 3))) + vaultInfo(c.name) })), ...NPC_CLANS.map((n) => ({ name: n, info: '老牌血盟' + vaultInfo(n) })), { name: ENEMY_CLAN, info: '邪惡血盟' + vaultInfo(ENEMY_CLAN) }];
    for (const r of rows) box.appendChild(el('div', 'row', '<span>' + (r.name === own ? '👑 ' : '') + esc(r.name) + '</span><b class="dim" style="font-weight:normal">' + esc(r.info) + '</b>'));
    return box;
  },
  // ===== 血盟倉庫：各村莊的倉庫管理員與灰岩城的倉庫管理員都能使用 =====
  renderClanVault(w) {
    const p = G.player;
    if (!p.clan) { w.body.appendChild(el('div', 'npc-text', '你還沒有加入血盟。加入或建立血盟後，就能使用血盟專屬的倉庫。')); return; }
    const V = clanVault(p.clan.name), CAP = clanVaultCap();
    w.body.appendChild(el('div', 'dim small', '血盟「' + esc(p.clan.name) + '」的倉庫（' + V.items.length + ' / ' + CAP + '，點擊領取）・容量隨血盟等級增加' + (ownsCastle() ? '，城主血盟額外 +50' : '')));
    const g1 = el('div', 'grid vaultgrid');
    const n = Math.max(24, Math.ceil((V.items.length + 1) / 6) * 6);
    for (let i = 0; i < n; i++) g1.appendChild(this.slotEl(V.items[i], (inst) => {
      if (!canCarry(inst.id, inst.qty)) { this.log('太重了，無法領取。', 'warn'); return; }
      V.items.splice(V.items.indexOf(inst), 1); addItem(inst.id, inst.qty, inst.ench, true);
      vaultNote(V, p.name + ' 領取了 ' + ITEMS[inst.id].name + (inst.qty > 1 ? '×' + inst.qty : '')); this.refresh();
    }));
    w.body.appendChild(g1);
    const gr = el('div', 'btnrow');
    gr.appendChild(el('span', 'small', '血盟金庫：<b>' + V.gold.toLocaleString() + '</b> 金幣　'));
    const amt = el('input', 'vaultamt'); amt.type = 'number'; amt.min = 1; amt.placeholder = '金額';
    amt.addEventListener('keydown', (e) => e.stopPropagation());
    const dep = el('button', 'btn sm', '存入'), wd = el('button', 'btn sm', '領出');
    const val = (max) => { const v = Math.floor(+amt.value || 0); return v > 0 ? Math.min(v, max) : max; };
    dep.onclick = () => { const v = val(p.gold); if (!v) return; p.gold -= v; V.gold += v; vaultNote(V, p.name + ' 存入 ' + v.toLocaleString() + ' 金幣'); SFX.play('coin'); this.log('存入 ' + v.toLocaleString() + ' 金幣到血盟金庫。', 'loot'); this.refresh(); };
    wd.onclick = () => { const v = val(V.gold); if (!v) return; V.gold -= v; p.gold += v; vaultNote(V, p.name + ' 領出 ' + v.toLocaleString() + ' 金幣'); SFX.play('coin'); this.log('從血盟金庫領出 ' + v.toLocaleString() + ' 金幣。', 'loot'); this.refresh(); };
    gr.appendChild(amt); gr.appendChild(dep); gr.appendChild(wd);
    w.body.appendChild(gr);
    if (V.log && V.log.length) w.body.appendChild(el('div', 'dim small vaultlog', V.log.slice(-4).map(esc).join('<br>')));
    w.body.appendChild(el('div', 'dim small', '背包（點擊存放；金額空白＝全部）'));
    const g2 = el('div', 'grid');
    for (let i = 0; i < 48; i++) g2.appendChild(this.slotEl(p.inv[i], (inst) => {
      if (inst.pet) { this.log('寵物項圈不能放進倉庫。', 'warn'); return; }
      const ex = ITEMS[inst.id].stack && V.items.find((x) => x.id === inst.id);
      if (!ex && V.items.length >= CAP) { this.log('血盟倉庫已滿。', 'warn'); return; }
      if (ex) ex.qty += inst.qty; else V.items.push({ id: inst.id, qty: inst.qty, ench: inst.ench || 0 });
      vaultNote(V, p.name + ' 存入了 ' + ITEMS[inst.id].name + (inst.qty > 1 ? '×' + inst.qty : ''));
      removeItem(inst, inst.qty); SFX.play('pickup'); this.refresh();
    }, { size: 28 }));
    w.body.appendChild(g2);
  },
});
