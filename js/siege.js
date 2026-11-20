'use strict';
// ===== 攻城戰：固定攻城時間、冒險者自組血盟、電腦血盟宣戰 =====
// 攻城時間：每天（現實時間）從 0 點起每 2 小時開放一次，每次 20 分鐘。
// 只有在攻城時間內可以宣戰；電腦血盟也會在這段時間向灰岩城宣戰。
const SIEGE_EVERY_H = 2, SIEGE_WINDOW_MIN = 20, SIEGE_LEN = 600;
const MAX_WORLD_CLANS = 6;
const CLAN_PRE = ['赤焰', '蒼穹', '霜月', '雷鳴', '黎明', '暗影', '鐵血', '翠風', '金獅', '白狼', '夜鶯', '碧海', '烈陽', '星隕', '銀霧', '荒原'];
const CLAN_SUF = ['騎士團', '兄弟會', '戰團', '同盟', '之盾', '聯軍', '守望', '之刃', '旅團'];
const DEFAULT_OWNER = '灰岩騎士團';

// ---------- 攻城時間 ----------
function siegeSchedule(now = Date.now()) {
  if (G.siegeForceUntil && now < G.siegeForceUntil) return { open: true, start: G.siegeForceUntil - SIEGE_WINDOW_MIN * 60000, end: G.siegeForceUntil };
  const d = new Date(now); d.setMinutes(0, 0, 0); d.setHours(d.getHours() - (d.getHours() % SIEGE_EVERY_H));
  const start = d.getTime(), end = start + SIEGE_WINDOW_MIN * 60000;
  if (now < end) return { open: true, start, end };
  return { open: false, next: start + SIEGE_EVERY_H * 3600000 };
}
function hhmm(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function mmss(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function siegeTimeText() {
  const s = siegeSchedule();
  return s.open ? '攻城時間進行中（到 ' + hhmm(s.end) + '）' : '下次攻城時間：' + hhmm(s.next) + '（每 ' + SIEGE_EVERY_H + ' 小時一次，每次 ' + SIEGE_WINDOW_MIN + ' 分鐘）';
}

// ---------- 世界狀態：城主與冒險者血盟（跟著角色存檔）----------
function realm() {
  const p = G.player;
  if (!p.realm) p.realm = { owner: null, clans: [], lastWindow: 0 };
  return p.realm;
}
function castleOwnerName() { return ownsCastle() ? G.player.clan.name : realm().owner ? realm().owner.name : DEFAULT_OWNER; }
function worldClanNames() { return [...NPC_CLANS, ...realm().clans.map((c) => c.name)]; }
function worldClan(name) { return realm().clans.find((c) => c.name === name); }
function newClanName() {
  const used = new Set([...worldClanNames(), ENEMY_CLAN, DEFAULT_OWNER, G.player.clan ? G.player.clan.name : '']);
  for (let i = 0; i < 40; i++) { const n = pick(CLAN_PRE) + pick(CLAN_SUF); if (!used.has(n)) return n; }
  return null;
}
function worldLog(text) { log('📣 ' + text, 'world'); }

// 冒險者自己組血盟：等級夠高、沒有血盟的冒險者會創立血盟，並招募附近的冒險者
function clanFormTick(dt) {
  const R = realm();
  G.formT = (G.formT === undefined ? rand(90, 200) : G.formT) - dt;
  if (G.formT > 0) return;
  G.formT = rand(240, 480);
  // 現有血盟慢慢成長
  for (const c of R.clans) {
    c.power = Math.min(12, (c.power || 1) + (Math.random() < 0.6 ? 1 : 0)); c.members = Math.min(40, (c.members || 3) + randi(0, 2));
    const V = clanVault(c.name);
    if (V.gold >= 20000 && c.power < 12) { V.gold -= 20000; c.power++; vaultNote(V, '用金庫的錢招兵買馬，戰力提升了'); }
  }
  // 冒險者血盟的倉庫會隨著成員狩獵慢慢累積（不在畫面附近的成員）
  for (const n of worldClanNames()) { const V = clanVault(n); V.gold += randi(200, 900); }
  if (R.clans.length >= MAX_WORLD_CLANS || G.map.id !== 'overworld') return;
  const cands = G.map.actors.filter((a) => a.kind === 'fighter' && !a.dead && !a.clan && !a.clanMember && a.level >= 12);
  if (!cands.length) return;
  const leader = pick(cands), name = newClanName(); if (!name) return;
  const emblem = clanEmblemFor(name);
  leader.clan = name; leader.emblem = emblem;
  let n = 1;
  for (const a of G.map.actors) if (n < 4 && a !== leader && a.kind === 'fighter' && !a.dead && !a.clan && !a.clanMember && dist(a.x, a.y, leader.x, leader.y) < 40 && Math.random() < 0.6) { a.clan = name; a.emblem = emblem; n++; }
  R.clans.push({ name, emblem, leader: leader.name, power: 1, members: n + randi(2, 5), founded: Date.now() });
  worldLog('冒險者 ' + leader.name + ' 創立了血盟「' + name + '」！');
  addNews('clan', leader.name + ' 創立了血盟「' + name + '」', leader.name);
  if (dist(leader.x, leader.y, G.player.x, G.player.y) < 20) leader.speak('血盟「' + name + '」成立了！有興趣的人歡迎加入！', 5);
}

// ---------- 宣戰 ----------
function siegeAttackerPool() {
  const own = castleOwnerName(), mine = G.player.clan ? G.player.clan.name : null;
  const pool = [];
  for (const c of realm().clans) if (c.name !== own && c.name !== mine) pool.push({ name: c.name, power: c.power || 1, w: 2 + (c.power || 1) / 3 });
  for (const n of [...NPC_CLANS, ENEMY_CLAN]) if (n !== own && n !== mine) pool.push({ name: n, power: 5, w: n === ENEMY_CLAN ? 1.5 : 1 });
  return pool;
}
function pickWeighted(list) {
  const tot = list.reduce((s, x) => s + x.w, 0); let r = Math.random() * tot;
  for (const x of list) { r -= x.w; if (r <= 0) return x; }
  return list[0];
}
// 攻城時間開始時，電腦血盟決定要不要宣戰
function planNpcSiege() {
  const pool = siegeAttackerPool();
  const roll = Math.random(), n = roll < 0.15 ? 0 : roll < 0.75 ? 1 : 2;
  const chosen = [];
  for (let i = 0; i < n && pool.length; i++) { const c = pickWeighted(pool); chosen.push(c); pool.splice(pool.indexOf(c), 1); }
  if (!chosen.length) { worldLog('這次的攻城時間沒有血盟向灰岩城宣戰。'); return; }
  for (const c of chosen) worldLog('血盟「' + c.name + '」向灰岩城宣戰了！' + (ownsCastle() ? '城主請準備守城！' : ''));
  G.npcDecl = { at: G.t + rand(40, 80), clans: chosen };
  if (ownsCastle()) { SFX.play('roar'); UI.log('⚠ 敵對血盟將在約 1 分鐘後攻打灰岩城！', 'warn'); }
}

// 開始或加入攻城戰
function beginSiege(playerAtk) {
  const m = getMap('overworld'), W = m.world, C = W.castle, p = G.player;
  if (G.siege && G.siege.active) return G.siege;
  G.siege = { active: true, t: SIEGE_LEN, dur: SIEGE_LEN, playerAtk: !!playerAtk, attackers: [], awayT: 0, defender: castleOwnerName() };
  const gate = m.gate; gate.dead = false; gate.broken = false; gate.open = false; gate.hp = gate.maxHp; setGateBlock(true);
  const tw = m.tower; tw.dead = false; tw.hp = tw.maxHp; tw.ownerColor = ownsCastle() ? '#7ad0ff' : '#ff6a5a';
  for (const a of m.actors) if (a.faction === 'castle' && !a.struct && !a.garrison) { a.dead = true; a.deadT = 9; }
  // 守城的衛兵屬於目前的城主（常備守衛之外再加派）
  const owner = castleOwnerName(), em = ownsCastle() ? p.clan.emblem : realm().owner ? realm().owner.emblem : null;
  const guards = [];
  for (const s of C.guardSpots) { const g = makeMonster('guard', s.x, s.y); g.home = { x: s.x, y: s.y }; guards.push(g); }
  const cap = makeMonster('guard_captain', C.tower.x - 1.5, C.tower.y); cap.home = { x: cap.x, y: cap.y }; guards.push(cap);
  for (const g of guards) { g.clan = owner; g.emblem = em; m.actors.push(g); }
  if (ownsCastle() && G.map === m) for (const a of summonAllies(4 + clanLevel(), SIEGE_LEN, { x: C.cx, y: C.cy })) a.siegeAlly = true;
  return G.siege;
}
function spawnBesiegers(c) {
  const m = getMap('overworld'), C = m.world.castle, p = G.player;
  const n = Math.min(10, 4 + Math.floor((c.power || 1) / 2));
  const emblem = clanEmblemFor(c.name);
  for (let i = 0; i < n; i++) {
    const q = m.world.nearestFree(C.x0 - 9 + rand(-3, 2), C.cy + rand(-5, 5));
    const lvl = ownsCastle() ? clamp(p.level + randi(-3, 2), 12, 50) : randi(16, 30);
    const a = makeFighter(q.x, q.y, lvl, false);
    a.kind = 'besieger'; a.faction = 'besieger'; a.life = null; a.besieger = c.name;
    a.clan = c.name; a.emblem = emblem; a.aggroR = 10; a.leash = 120; a.align = 500;
    a.maxHp = a.hp = Math.round(a.maxHp * 1.3);
    a.home = { x: C.cx, y: C.cy };
    m.actors.push(a);
  }
  G.siege.attackers.push(c.name);
}
function startNpcSiege(clans) {
  const s = beginSiege(false);
  for (const c of clans) spawnBesiegers(c);
  log('⚔ 攻城戰開始！進攻的血盟：' + clans.map((c) => '「' + c.name + '」').join('、') + '（守城方：「' + s.defender + '」）', 'level');
  SFX.play('roar');
  UI.refresh();
}

// 玩家宣戰（只能在攻城時間內）
function declareSiege() {
  const p = G.player, m = G.map;
  if (m.id !== 'overworld') return '只能在灰岩城宣戰。';
  if (!p.clan) return '只有血盟才能宣戰。';
  if (ownsCastle()) return '你的血盟已經擁有灰岩城了。';
  if (p.level < 10) return '需要等級 10 才能宣戰。';
  const sc = siegeSchedule();
  if (!sc.open) return '現在不是攻城時間。' + siegeTimeText();
  if (G.siege && G.siege.active) {
    if (G.siege.playerAtk) return '你的血盟已經在攻城了。';
    G.siege.playerAtk = true;
  } else {
    if (Date.now() + SIEGE_LEN * 1000 > sc.end + 5 * 60000) return '這次的攻城時間快結束了，請等下一次攻城時間。';
    beginSiege(true);
  }
  G.siege.attackers.push(p.clan.name);
  const C = m.world.castle;
  for (const a of summonAllies(6 + clanLevel(), 0, { x: C.x0 - 4, y: C.cy })) a.siegeAlly = true;
  log('⚔ 血盟「' + p.clan.name + '」向灰岩城宣戰！摧毀城門，擊破守護之塔！', 'level');
  SFX.play('roar'); UI.refresh();
  return null;
}
function setGateBlock(closed) {
  const W = G.maps.overworld.world;
  for (const g of W.castle.gate) W.blockArr[W.idx(g.x, g.y)] = closed ? 3 : 0;
}
// ---------- 城主開關城門 ----------
function gateClosedPref() { return ownsCastle() && !!G.player.castle.gateClosed; }
function toggleGate(close) {
  const m = G.maps.overworld; if (!m) return '找不到城門。';
  const g = m.gate;
  if (!ownsCastle()) return '只有城主可以開關城門。';
  if (g.broken || g.dead) return '城門已經被攻破，要等攻城戰結束後才會修好。';
  if (close === undefined) close = g.open;
  g.open = !close; setGateBlock(close);
  G.player.castle.gateClosed = close;
  if (close) {   // 關門時把擋在門口的人推開
    const W = m.world;
    for (const e of [G.player, ...m.actors]) if (!e.dead && !e.struct && W.blocked(e.x, e.y)) { const q = W.nearestFree(e.x, e.y); e.x = q.x; e.y = q.y; e.path = []; }
  }
  SFX.play(close ? 'boom' : 'click', g.x, g.y); shake(close ? 3 : 0);
  log(close ? '城門緩緩關上了。（再點一次城門或向傳令官說話可以開啟）' : '城門打開了。', 'sys');
  UI.refresh();
  return null;
}
function gateClick(g) {
  const p = G.player;
  if (!ownsCastle()) { log(g.open ? '灰岩城門開著。只有城主可以開關城門。' : '灰岩城門關著。只有城主可以開關城門。', 'sys'); return; }
  if (dist(p.x, p.y, g.x, g.y) > 9) { log('請走近城門再開關。', 'sys'); return; }
  const e = toggleGate(); if (e) log(e, 'warn');
}
function endSiege() {
  const s = G.siege; if (s) s.active = false;
  const m = G.maps.overworld; if (!m) return;
  for (const a of m.actors) if ((a.faction === 'castle' && !a.struct && !a.garrison) || a.siegeAlly || a.kind === 'besieger') { a.dead = true; a.deadT = 9; }
  m.gate.open = true; m.gate.broken = false; m.gate.dead = false; m.gate.hp = m.gate.maxHp;
  m.tower.dead = false; m.tower.hp = m.tower.maxHp; setGateBlock(false);
  m.tower.ownerColor = ownsCastle() ? '#7ad0ff' : realm().owner ? '#ffb040' : null;
  if (gateClosedPref()) { m.gate.open = false; setGateBlock(true); }
  G.npcDecl = null;
  UI.refresh();
}
// 電腦血盟佔領城堡
function npcCapture(name, away) {
  const p = G.player, lost = ownsCastle();
  const wc = worldClan(name);
  realm().owner = { name, emblem: clanEmblemFor(name), since: Date.now() };
  if (wc) wc.power = Math.min(12, (wc.power || 1) + 2);
  if (lost) { p.castle = null; if (p.homeTown === 'castle') p.homeTown = 'dawn'; }
  endSiege();
  if (lost) log('守護之塔被摧毀了…' + (away ? '（你不在城裡）' : '') + '血盟「' + name + '」奪走了灰岩城。城堡倉庫的物品會保留，奪回城堡後就能再使用。', 'warn');
  worldLog('血盟「' + name + '」佔領了灰岩城！');
  addNews('capture', '血盟「' + name + '」佔領了灰岩城', name);
  SFX.play('boom'); saveGame(true);
}
function playerCapture() {
  const p = G.player;
  p.castle = { owned: true, taxAcc: 0, since: Date.now() };
  realm().owner = null;
  endSiege();
  later(2, () => log('工匠們連夜修好了灰岩城門，城門重新開啟。', 'sys'));
  log('★★ 血盟「' + p.clan.name + '」佔領了灰岩城！盟主 ' + p.name + ' 成為了城主！', 'loot');
  addNews('capture', '血盟「' + p.clan.name + '」佔領了灰岩城，城主是 ' + p.name, p.clan.name);
  gainExp(3000); SFX.play('levelup');
  saveGame(true);
}
function onStructDestroyed(s, src) {
  const p = G.player;
  SFX.play('boom', s.x, s.y); shake(10);
  burst(s.x, s.y, 40, '#c0a080', 40, 4, 1, 3, 4);
  if (s.struct === 'gate') { s.broken = true; setGateBlock(false); log('灰岩城門被攻破了！', 'level'); UI.refresh(); return; }
  if (s.struct !== 'tower') return;
  const sg = G.siege;
  const playerSide = src === p || (src && (src.faction === 'ally' || src.companion));
  if (sg && sg.active && sg.playerAtk && !ownsCastle() && playerSide) playerCapture();
  else if (src && src.besieger) npcCapture(src.besieger);
  else if (src && src.raider && ownsCastle()) npcCapture(ENEMY_CLAN);
  else { s.dead = false; s.hp = s.maxHp; }
  UI.refresh();
}

// ---------- 每格更新 ----------
function updateSiege(dt) {
  const p = G.player, R = realm();
  if (!G.realmInit) {
    G.realmInit = true;
    const m = getMap('overworld');
    m.tower.ownerColor = ownsCastle() ? '#7ad0ff' : R.owner ? '#ffb040' : null;
    if (gateClosedPref() && !(G.siege && G.siege.active)) { m.gate.open = false; setGateBlock(true); }
  }
  clanFormTick(dt);
  const sc = siegeSchedule();
  // 攻城時間開始
  if (sc.open && R.lastWindow !== sc.start) {
    R.lastWindow = sc.start;
    log('🏰 攻城時間開始了！到 ' + hhmm(sc.end) + ' 之前，擁有血盟、等級 10 以上的勇者可以向攻城傳令官宣戰。', 'level');
    SFX.play('quest');
    planNpcSiege();
  }
  if (!sc.open && sc.next - Date.now() < 60000 && G.preWarn !== sc.next) { G.preWarn = sc.next; log('🏰 攻城時間將在 1 分鐘後開始（' + hhmm(sc.next) + '）。', 'sys'); }
  // 電腦血盟的攻城開始
  if (G.npcDecl && G.t >= G.npcDecl.at) {
    const d = G.npcDecl; G.npcDecl = null;
    if (!G.siege || !G.siege.active) startNpcSiege(d.clans);
    else { for (const c of d.clans) spawnBesiegers(c); log('⚔ 血盟' + d.clans.map((c) => '「' + c.name + '」').join('、') + '加入了攻城戰！', 'level'); }
  }
  const s = G.siege;
  if (s && s.active) {
    s.t -= dt;
    if (G.map.id !== 'overworld') s.awayT += dt;
    if (s.t <= 0) {
      // 時間到：你不在場的話，用雙方兵力估算結果
      const npcAtk = s.attackers.filter((n) => n !== (p.clan && p.clan.name));
      if (npcAtk.length && s.awayT > s.dur * 0.5) {
        for (const n of npcAtk) if (Math.random() < (ownsCastle() ? 0.2 : 0.35)) { npcCapture(n, true); return; }
      }
      const held = ownsCastle();
      endSiege();
      if (held) { log('攻城戰結束，成功守住了灰岩城！', 'level'); gainExp(1500); addNews('defend', '「' + p.clan.name + '」守住了灰岩城'); }
      else if (s.playerAtk) log('攻城戰時間結束，未能攻下灰岩城。', 'warn');
      else { worldLog('攻城戰結束，「' + castleOwnerName() + '」守住了灰岩城。'); addNews('defend', '「' + castleOwnerName() + '」守住了灰岩城'); }
      log('灰岩城門已經修復。', 'sys');
    }
  }
  if (ownsCastle() && G.map.id === 'overworld') castleEconomyTick(dt);
}

// ---------- 介面 ----------
function siegeBarHtml() {
  const s = G.siege, m = G.maps.overworld;
  if (s && s.active && m) {
    return '⚔ 攻城戰 ' + mmss(s.t) + '　進攻：' + (s.attackers.join('、') || '—') + '　城門 ' + (m.gate.broken ? '已攻破' : Math.ceil(100 * m.gate.hp / m.gate.maxHp) + '%') + '　守護之塔 ' + Math.ceil(100 * m.tower.hp / m.tower.maxHp) + '%';
  }
  const sc = siegeSchedule();
  if (sc.open) return '🏰 攻城時間 剩 ' + mmss((sc.end - Date.now()) / 1000) + (G.npcDecl ? '　敵對血盟即將攻城！' : '');
  return null;
}
