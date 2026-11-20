'use strict';
// ===== 灰岩城的駐軍：常備守衛、傭兵、宮廷增益魔法師 =====
// 常備守衛：不論城主是誰，城門與守護之塔旁都有守衛站崗（攻城時之外不會攻擊一般人）。
//           城主可以花錢訓練守衛，提高人數與強度。陣亡後一段時間會補上。
// 傭兵：城主向傭兵隊長簽約（現實時間 24 小時），傭兵駐守在城內，與守衛一起對抗攻城的血盟。
// 增益魔法師：替勇者施放持續 10 分鐘的增益魔法；城主血盟免費。
const GUARD_TRAIN = [
  { name: '一般守衛', n: 4, mul: 1.0, cost: 0 },
  { name: '精銳守衛', n: 6, mul: 1.25, cost: 20000 },
  { name: '鐵衛軍', n: 8, mul: 1.55, cost: 50000 },
  { name: '皇家近衛', n: 10, mul: 1.9, cost: 100000 },
];
const GUARD_RESPAWN = 90;
const MERC_TYPES = {
  sword:  { name: '傭兵劍士', cls: 'knight', cost: 3000, mul: 1.0, desc: '近戰，體力與防禦均衡' },
  archer: { name: '傭兵弓手', cls: 'ranger', cost: 3500, mul: 1.0, desc: '從遠處射擊敵人' },
  mage:   { name: '傭兵法師', cls: 'mage', cost: 4500, mul: 1.1, desc: '魔法攻擊，傷害高但體力低' },
  knight: { name: '傭兵重騎士', cls: 'knight', cost: 8000, mul: 1.6, desc: '重裝騎士，非常耐打' },
};
const MERC_HOURS = 24, MERC_MAX = 8;
const MERC_NAMES = ['葛雷', '奧斯卡', '布蘭', '羅薇', '泰格', '艾德', '哈康', '莉絲', '維克', '索恩', '芮娜', '卡爾', '杜克', '茉拉', '班恩', '伊果'];
const BUFF_MENU = [
  { k: 'shield', name: '防護術', price: 300, desc: '防禦 +2' },
  { k: 'blessarmor', name: '祝福鎧甲', price: 800, desc: '防禦 +4、魔防 +10' },
  { k: 'earthskin', name: '大地之膚', price: 800, desc: '防禦 +5' },
  { k: 'might', name: '力量祝福', price: 700, desc: '物理傷害 +3' },
  { k: 'holy', name: '神聖武器', price: 600, desc: '傷害 +2、命中提升' },
  { k: 'haste', name: '加速術', price: 1000, desc: '移動與攻擊速度提升' },
  { k: 'fireres', name: '抗火結界', price: 900, desc: '火屬性抗性 +30%' },
];
const BUFF_DUR = 600;

function castleInfo() { const p = G.player; return ownsCastle() ? p.castle : null; }
function guardLevel() { const c = castleInfo(); return c ? (c.guardLv || 0) : 0; }

// ---------- 常備守衛 ----------
function guardPosts(C) {
  const gy = C.cy + 0.5;
  const posts = [
    { x: C.x0 - 1.5, y: gy - 2.2 }, { x: C.x0 - 1.5, y: gy + 2.2 },     // 城門外
    { x: C.x0 + 2.5, y: gy - 2 }, { x: C.x0 + 2.5, y: gy + 2 },         // 城門內
    { x: C.tower.x - 2, y: C.tower.y - 2 }, { x: C.tower.x - 2, y: C.tower.y + 2 }, // 守護之塔
  ];
  for (const s of C.guardSpots) posts.push(s);
  return posts;
}
function makeGuard(post, lv) {
  const T = GUARD_TRAIN[lv];
  const g = makeMonster('guard', post.x, post.y);
  g.garrison = 'guard'; g.home = { x: post.x, y: post.y }; g.leash = 10;
  g.maxHp = g.hp = Math.round(g.maxHp * T.mul); g.dmg = [Math.round(g.dmg[0] * T.mul), Math.round(g.dmg[1] * T.mul)];
  g.ac += lv * 2; g.level += lv * 4; g.trainLv = lv;
  if (lv > 0) g.name = T.name;
  return g;
}
function syncGuardLabels(m) {
  const owner = castleOwnerName(), em = ownsCastle() ? G.player.clan.emblem : realm().owner ? realm().owner.emblem : null;
  for (const a of m.actors) if (a.garrison === 'guard' && !a.dead) { a.clan = owner; a.emblem = em; }
}
function garrisonTick(dt) {
  G.garT = (G.garT || 0) - dt;
  if (G.garT > 0) return;
  G.garT = 2;
  mercFollowTick();
  if (G.map.id !== 'overworld') return;
  const m = G.map, W = m.world, C = W.castle;
  // 守衛
  const lv = guardLevel(), want = GUARD_TRAIN[lv].n;
  const posts = guardPosts(C);
  const alive = m.actors.filter((a) => a.garrison === 'guard' && !a.dead);
  // 訓練等級改變時換上新的守衛
  for (const g of alive) if (g.trainLv !== lv) { g.dead = true; g.deadT = 9; }
  const cur = m.actors.filter((a) => a.garrison === 'guard' && !a.dead);
  m.guardCd = m.guardCd || {};
  for (let i = 0; i < want; i++) {
    if (cur.some((g) => g.postIdx === i) || (m.guardCd[i] || 0) > G.t) continue;
    const q = W.nearestFree(posts[i % posts.length].x, posts[i % posts.length].y);
    const g = makeGuard(q, lv); g.postIdx = i;
    m.actors.push(g);
  }
  syncGuardLabels(m);
  // 傭兵
  mercTick(m);
}
// 守衛陣亡：記錄補員時間
function onGarrisonDeath(a) {
  const m = G.map;
  if (a.garrison === 'guard') { m.guardCd = m.guardCd || {}; m.guardCd[a.postIdx] = G.t + GUARD_RESPAWN; }
  if (a.mercId) {
    const c = castleInfo();
    if (c && c.mercs) c.mercs = c.mercs.filter((x) => x.id !== a.mercId);
    log('傭兵 ' + a.name + ' 陣亡了…', 'warn');
  }
}

// ---------- 傭兵 ----------
function mercStats(t, lvl) {
  const T = MERC_TYPES[t], cls = T.cls;
  return {
    maxHp: Math.round((40 + lvl * (cls === 'knight' ? 12 : cls === 'mage' ? 7 : 9)) * T.mul),
    ac: Math.floor(lvl / 2) + (cls === 'knight' ? 5 : 2) + (t === 'knight' ? 6 : 0),
    dmg: [Math.round((3 + lvl / 2) * T.mul), Math.round((8 + lvl) * T.mul)],
  };
}
function mercTick(m) {
  const c = castleInfo();
  // 失去城堡或合約到期：傭兵離開
  for (const a of m.actors) {
    if (!a.mercId || a.dead) continue;
    const e = c && c.mercs && c.mercs.find((x) => x.id === a.mercId);
    if (!e || Date.now() > e.until) { a.dead = true; a.deadT = 9; burst(a.x, a.y, 20, '#c8c0a0', 14, 2, 0.6); if (e) log('傭兵 ' + a.name + ' 的合約到期，離開了灰岩城。', 'sys'); }
  }
  if (!c || !c.mercs) return;
  c.mercs = c.mercs.filter((e) => Date.now() <= e.until);
  const C = m.world.castle;
  for (const e of c.mercs) {
    if (e.follow || m.actors.some((a) => a.mercId === e.id && !a.dead)) continue;
    spawnMercActor(m, e, m.world.nearestFree(C.cx - 3 + rand(-3, 3), C.cy + rand(-4, 4)));
  }
}
function spawnMercActor(m, e, post) {
  const T = MERC_TYPES[e.type], st = mercStats(e.type, e.lvl);
    const a = new Actor({
      x: post.x, y: post.y, kind: 'merc', faction: 'ally', name: e.name, cls: T.cls, level: e.lvl, look: e.look,
      maxHp: st.maxHp, ac: st.ac, mr: e.lvl, er: 4, dmg: st.dmg, atkSpd: T.cls === 'mage' ? 1.4 : 1.0,
      range: T.cls === 'ranger' ? 6 : T.cls === 'mage' ? 5.5 : 1.4, proj: T.cls === 'ranger' ? 'arrow' : T.cls === 'mage' ? 'magic' : null, magic: T.cls === 'mage',
      aggro: true, aggroR: 8, speed: 3.1, clan: G.player.clan.name, emblem: G.player.clan.emblem, align: 1000,
    });
    a.mercId = e.id; a.mercType = e.type; a.home = { x: post.x, y: post.y }; a.leash = 16;
    if (e.follow) { a.follow = true; a.leash = 99; }
    if (e.hp) a.hp = Math.min(a.maxHp, e.hp);
    m.actors.push(a);
    return a;
}
// 跟隨玩家的傭兵：跟著玩家換地圖；駐守的傭兵留在灰岩城
function mercFollowTick() {
  const c = castleInfo(), p = G.player; if (!p) return;
  if (c && c.mercs) {
    const gone = c.mercs.filter((e) => Date.now() > e.until);
    for (const e of gone) log('傭兵 ' + e.name + ' 的合約到期，離開了。', 'sys');
    if (gone.length) c.mercs = c.mercs.filter((e) => Date.now() <= e.until);
  }
  const list = c && c.mercs ? c.mercs : [];
  for (const id in G.maps) {
    const m = G.maps[id];
    m.actors = m.actors.filter((a) => {
      if (!a.mercId || a.dead) return true;
      const e = list.find((x) => x.id === a.mercId);
      if (e) e.hp = Math.ceil(a.hp);
      // 跟隨的傭兵在別的地圖、駐守的傭兵不在灰岩城、合約已結束：移除（之後會在正確的地方出現）
      return !(!e || (e.follow && m !== G.map) || (!e.follow && (id !== 'overworld' || a.follow)));
    });
  }
  if (p.dead) return;
  for (const e of list) {
    if (!e.follow || G.map.actors.some((a) => a.mercId === e.id && !a.dead)) continue;
    spawnMercActor(G.map, e, G.world.nearestFree(p.x + rand(-2, 2), p.y + rand(-2, 2)));
  }
}
function setMercFollow(id, follow) {
  const c = castleInfo(); if (!c || !c.mercs) return;
  for (const e of c.mercs) if (id === 'all' || e.id === id) e.follow = follow;
  G.garT = 0;
  log(follow ? '傭兵開始跟隨你。（傭兵會跟著你到各地，戰鬥經驗歸你）' : '傭兵回到灰岩城駐守。', 'sys');
}
function hireMerc(type) {
  const p = G.player, c = castleInfo(), T = MERC_TYPES[type];
  if (!c) return '只有城主血盟可以雇用傭兵。';
  c.mercs = c.mercs || [];
  if (c.mercs.length >= MERC_MAX) return '傭兵已經滿編了（最多 ' + MERC_MAX + ' 名）。';
  if (p.gold < T.cost) return '金幣不足。';
  p.gold -= T.cost;
  const used = new Set(c.mercs.map((x) => x.name));
  const name = MERC_NAMES.find((n) => !used.has(n) && !Names.used.has(n)) || ('傭兵' + randi(10, 99));
  const lvl = Math.max(15, p.level) + (type === 'knight' ? 3 : 0);
  c.mercs.push({ id: 'm' + Date.now().toString(36) + randi(10, 99), type, name, lvl, look: Object.assign({}, pick(FIGHTER_LOOKS[T.cls])), until: Date.now() + MERC_HOURS * 3600000 });
  G.garT = 0;
  SFX.play('coin'); log('雇用了' + T.name + '「' + name + '」（Lv.' + lvl + '，合約 ' + MERC_HOURS + ' 小時）。', 'loot');
  saveGame(true);
  return null;
}
function renewMerc(id) {
  const p = G.player, c = castleInfo(); if (!c) return '只有城主血盟可以續約。';
  const e = (c.mercs || []).find((x) => x.id === id); if (!e) return '找不到這位傭兵。';
  const cost = Math.round(MERC_TYPES[e.type].cost * 0.8);
  if (p.gold < cost) return '金幣不足（續約需要 ' + cost.toLocaleString() + ' 金幣）。';
  p.gold -= cost; e.until = Math.max(e.until, Date.now()) + MERC_HOURS * 3600000; e.lvl = Math.max(e.lvl, Math.max(15, p.level));
  SFX.play('coin'); log(e.name + ' 的合約延長了 ' + MERC_HOURS + ' 小時。', 'loot');
  return null;
}
function dismissMerc(id) {
  const c = castleInfo(); if (!c) return;
  c.mercs = (c.mercs || []).filter((x) => x.id !== id);
  G.garT = 0;
}
function trainGuards() {
  const p = G.player, c = castleInfo();
  if (!c) return '只有城主血盟可以訓練守衛。';
  const lv = c.guardLv || 0;
  if (lv >= GUARD_TRAIN.length - 1) return '守衛已經是最高等級了。';
  const T = GUARD_TRAIN[lv + 1];
  if (p.gold < T.cost) return '金幣不足（需要 ' + T.cost.toLocaleString() + ' 金幣）。';
  p.gold -= T.cost; c.guardLv = lv + 1; G.garT = 0;
  SFX.play('levelup'); log('灰岩城的守衛訓練完成：' + T.name + '（' + T.n + ' 名）！', 'level');
  saveGame(true);
  return null;
}

// ---------- 增益魔法師 ----------
function buyBuff(list, npc, price) {
  const p = G.player, free = ownsCastle();
  const cost = free ? 0 : price !== undefined ? price : list.reduce((s, b) => s + b.price, 0);
  if (p.gold < cost) return '金幣不足。';
  p.gold -= cost;
  if (cost && G.player.castle) castleTax(cost, 'trade');
  for (const b of list) { p.buffs[b.k] = BUFF_DUR; if (b.k === 'haste') hasteCompanions(BUFF_DUR); }
  recalc(); SFX.play('buff');
  burst(p.x, p.y, 40, '#e0d0ff', 30, 3, 1, 3, 4);
  if (npc) { npc.speak(pick(['願光芒守護你。', '魔力已經注入你的身體。', '去吧，勇者！']), 3); npc.face(p.x, p.y); }
  log('宮廷魔法師為你施放了' + list.map((b) => '「' + b.name + '」').join('') + '（' + BUFF_DUR / 60 + ' 分鐘）' + (cost ? '，花費 ' + cost.toLocaleString() + ' 金幣。' : '。（城主血盟免費）'), 'sys');
  UI.refresh();
  return null;
}

// ---------- 介面 ----------
Object.assign(UI, {
  openMercCaptain(npc) {
    this.close('merc');
    const w = this.win('merc', npc.title, 16, 60, 380);
    w.npc = npc; this.renderMerc();
  },
  renderMerc() {
    const w = this.windows.merc; if (!w) return;
    const p = G.player, c = castleInfo();
    const lv = guardLevel();
    w.body.innerHTML = this.dialogHead(w.npc, c ? '城主大人，灰岩城的守備由我負責。要訓練守衛，或是雇用傭兵嗎？傭兵會駐守在城內，和守衛一起對抗來犯的血盟。' :
      '灰岩城目前由<b>' + esc(castleOwnerName()) + '</b>統治，我只聽命於城主。<br>城門與守護之塔有常備守衛站崗，攻城戰之外他們不會攻擊一般人。');
    const box = el('div', 'taxbox');
    box.appendChild(el('div', 'row', '<span>常備守衛</span><b>' + GUARD_TRAIN[lv].name + '・' + GUARD_TRAIN[lv].n + ' 名</b>'));
    const alive = (G.maps.overworld ? G.maps.overworld.actors : []).filter((a) => a.garrison === 'guard' && !a.dead).length;
    box.appendChild(el('div', 'row', '<span>目前在崗</span><b>' + alive + ' 名</b>'));
    w.body.appendChild(box);
    if (!c) return;
    if (lv < GUARD_TRAIN.length - 1) {
      const T = GUARD_TRAIN[lv + 1];
      const b = el('button', 'btn', '訓練為「' + T.name + '」（' + T.n + ' 名，' + T.cost.toLocaleString() + ' 金幣）');
      b.onclick = () => { const e = trainGuards(); if (e) { this.log(e, 'warn'); SFX.play('error'); } this.renderMerc(); this.refresh(); };
      w.body.appendChild(b);
    }
    c.mercs = c.mercs || [];
    w.body.appendChild(el('div', 'lbl', '傭兵（' + c.mercs.length + ' / ' + MERC_MAX + '）・合約 ' + MERC_HOURS + ' 小時，等級依你的等級而定'));
    for (const e of c.mercs) {
      const T = MERC_TYPES[e.type], left = Math.max(0, e.until - Date.now());
      const row = el('div', 'mercrow', '<span><b>' + esc(e.name) + '</b> ' + T.name + ' Lv.' + e.lvl + '</span><span class="dim small">剩 ' + Math.floor(left / 3600000) + ' 小時 ' + Math.floor(left % 3600000 / 60000) + ' 分</span>');
      const r = el('button', 'btn sm', '續約 ' + Math.round(T.cost * 0.8).toLocaleString());
      r.onclick = () => { const er = renewMerc(e.id); if (er) { this.log(er, 'warn'); SFX.play('error'); } this.renderMerc(); this.refresh(); };
      const f = el('button', 'btn sm' + (e.follow ? ' on' : ''), e.follow ? '跟隨中' : '駐守中');
      f.title = '切換：跟隨你／在灰岩城駐守';
      f.onclick = () => { setMercFollow(e.id, !e.follow); this.renderMerc(); };
      row.appendChild(f);
      const d = el('button', 'btn sm', '解約');
      d.onclick = () => { dismissMerc(e.id); this.log(e.name + ' 離開了灰岩城。', 'sys'); this.renderMerc(); };
      row.appendChild(r); row.appendChild(d);
      w.body.appendChild(row);
    }
    if (c.mercs.length) {
      const all = el('div', 'btnrow');
      const b1 = el('button', 'btn sm', '全部跟隨我'); b1.onclick = () => { setMercFollow('all', true); this.renderMerc(); };
      const b2 = el('button', 'btn sm', '全部回城駐守'); b2.onclick = () => { setMercFollow('all', false); this.renderMerc(); };
      all.appendChild(b1); all.appendChild(b2); w.body.appendChild(all);
    }
    const hire = el('div', 'merchire');
    for (const t in MERC_TYPES) {
      const T = MERC_TYPES[t];
      const b = el('button', 'btn sm', T.name + '<br><span class="dim">' + T.cost.toLocaleString() + ' 金</span>');
      b.title = T.desc;
      b.onclick = () => { const er = hireMerc(t); if (er) { this.log(er, 'warn'); SFX.play('error'); } this.renderMerc(); this.refresh(); };
      hire.appendChild(b);
    }
    w.body.appendChild(hire);
  },
  openBuffer(npc) {
    this.close('buffer');
    const w = this.win('buffer', npc.title, 16, 60, 340);
    w.npc = npc; this.renderBuffer();
  },
  renderBuffer() {
    const w = this.windows.buffer; if (!w) return;
    const p = G.player, free = ownsCastle();
    w.body.innerHTML = this.dialogHead(w.npc, (free ? '城主大人，宮廷的魔法隨時為您效勞，不收任何費用。' : '我是灰岩城的宮廷魔法師。付一點謝禮，我就為你施放增益魔法。') + '<br>效果持續 ' + BUFF_DUR / 60 + ' 分鐘。');
    const list = el('div', 'list');
    for (const b of BUFF_MENU) {
      const on = p.buffs[b.k] > 0;
      const r = el('button', 'btn buffrow', '<span>' + b.name + ' <span class="dim small">' + b.desc + '</span></span><b>' + (free ? '免費' : b.price.toLocaleString() + ' 金') + (on ? ' ✓' : '') + '</b>');
      r.onclick = () => { const e = buyBuff([b], w.npc); if (e) { this.log(e, 'warn'); SFX.play('error'); } this.renderBuffer(); };
      list.appendChild(r);
    }
    w.body.appendChild(list);
    const all = BUFF_MENU.reduce((s, b) => s + b.price, 0), pack = Math.round(all * 0.8);
    const b = el('button', 'btn', '✨ 全套祝福（' + (free ? '免費' : pack.toLocaleString() + ' 金幣，八折') + '）');
    b.onclick = () => { const e = buyBuff(BUFF_MENU, w.npc, pack); if (e) { this.log(e, 'warn'); SFX.play('error'); } this.renderBuffer(); };
    w.body.appendChild(b);
  },
});
