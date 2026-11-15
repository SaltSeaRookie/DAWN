'use strict';
// ===== 遊戲主體 =====
const SAVE_KEY = 'dawnlands_save_v1';
const G = {
  world: null, player: null,
  monsters: [], npcs: [], others: [], items: [], projectiles: [], particles: [], texts: [], timers: [],
  spawners: [],
  t: 0, day: 0.3, cam: { x: 0, y: 0 }, hover: null, mouse: { x: 0, y: 0, down: false, wx: 0, wy: 0 },
  running: false, autoHunt: false, uid: 1,
};
let canvas, ctx, DPR = 1, VW = 0, VH = 0;
const HUD_H = () => (window.innerWidth < 760 ? 150 : 176);

// ---------- 實體 ----------
class Entity {
  constructor(x, y) {
    this.id = G.uid++;
    this.x = x; this.y = y; this.dir = 0.8;
    this.path = []; this.moving = false; this.walk = 0;
    this.speed = 3; this.atkAnim = -1; this.atkDur = 0.4; this.hurtT = 0;
    this.say = null; this.sayT = 0; this.dead = false;
  }
  moveAlong(dt, mul = 1) {
    if (!this.path || !this.path.length) { this.moving = false; return true; }
    const n = this.path[0];
    const dx = n.x - this.x, dy = n.y - this.y, d = Math.hypot(dx, dy);
    const sp = this.speed * dt * mul;
    if (d <= sp) { this.x = n.x; this.y = n.y; this.path.shift(); }
    else { this.x += (dx / d) * sp; this.y += (dy / d) * sp; }
    if (d > 0.01) this.dir = Math.atan2(dy, dx);
    this.moving = true; this.walk += dt * this.speed * 3 * mul;
    return false;
  }
  face(tx, ty) { this.dir = Math.atan2(ty - this.y, tx - this.x); }
  speak(text, t = 4) { this.say = text; this.sayT = t; }
}

class Player extends Entity {
  constructor(name, cls) {
    super(G.world.cx + 1.5, G.world.cy + 2.5);
    this.name = name; this.cls = cls;
    const c = CLASSES[cls];
    this.level = 1; this.exp = 0;
    this.maxHp = c.hp; this.hp = c.hp; this.maxMp = c.mp; this.mp = c.mp;
    this.gold = 300; this.honor = 0;
    this.inv = [];
    this.equip = { weapon: null, armor: null };
    this.buffs = {};
    this.speed = 3.6; this.atkCd = 0; this.regenT = 0;
    this.action = null; this.repathT = 0;
    this.quest = { idx: 0, count: 0, active: false };
    this.kills = 0;
  }
  get weapon() { return this.equip.weapon ? ITEMS[this.equip.weapon.id] : { dmg: [1, 3], spd: 0.8, range: 1.2, name: '空手' }; }
  get ac() {
    let a = 0;
    if (this.equip.armor) a += ITEMS[this.equip.armor.id].ac + (this.equip.armor.ench || 0);
    if (this.buffs.shield) a += 3;
    return a + Math.floor(this.level / 5);
  }
  get haste() { return this.buffs.haste ? 1.33 : 1; }
}

class Monster extends Entity {
  constructor(type, x, y, spawner) {
    super(x, y);
    const d = MONSTERS[type];
    this.type = type; this.def = d; this.name = d.name;
    this.maxHp = d.hp; this.hp = d.hp; this.speed = d.speed;
    this.home = { x, y }; this.spawner = spawner;
    this.state = 'idle'; this.thinkT = rand(0, 2); this.atkCd = 0; this.deadT = 0;
    this.dir = rand(0, Math.PI * 2);
    this.scale = d.boss ? 1 : rand(0.92, 1.06);
  }
}

class NPC extends Entity {
  constructor(x, y, name, title, role, look) {
    super(x, y); this.name = name; this.title = title; this.role = role; this.look = look; this.dir = 1.2;
    this.lineT = rand(6, 16);
  }
}

class Wanderer extends Entity {
  constructor(x, y, name, look, isDog) {
    super(x, y); this.name = name; this.look = look; this.isDog = isDog;
    this.speed = isDog ? 2.6 : rand(2.2, 3.2); this.waitT = rand(0, 4); this.lineT = rand(8, 30);
  }
}

// ---------- 初始化 ----------
function initWorld() {
  const seed = 20261115;
  G.world = new World(seed);
  Path.init(G.world.w, G.world.h);
  buildTileTextures();
  buildObjectSprites();
  buildMinimapBase();
}

function setupNPCs() {
  const W = G.world, cx = W.cx, cy = W.cy;
  G.npcs = [
    new NPC(cx - 2.5, cy - 3.5, '露西亞', '雜貨商人', 'general', { body: '#8a3a4a', robe: true, hair: '#6a3a1a', longHair: true, skin: '#f0cfa8' }),
    new NPC(cx + 4.5, cy - 3.5, '巴頓', '武器防具商', 'smith', { body: '#5a4a3a', legs: '#3a2e24', hair: '#2a1a10', skin: '#d8a880', belt: '#2a1a10', weapon: 'claymore' }),
    new NPC(cx - 3.5, cy + 2.5, '艾琳', '傳送師', 'teleport', { body: '#3a5a7a', robe: true, hood: '#2a3a5a', skin: '#f0d0b0', weapon: 'staff' }),
    new NPC(cx + 2.5, cy - 1.5, '雷恩', '守備隊長', 'quest', { body: '#8a8f99', legs: '#4a4e58', helm: '#9aa0aa', skin: '#e0b890', cape: '#7a1a1a', trim: '#d0b050', plate: true, weapon: 'sword' }),
  ];
  G.npcs[0].dir = 0.8; G.npcs[1].dir = 2.2; G.npcs[2].dir = -0.5; G.npcs[3].dir = 2.5;
  G.npcLines = {
    general: ['藥水便宜賣喔～', '出門前記得帶回村卷軸！', '強化卷軸要小心使用呀'],
    smith: ['好武器才能打倒強敵！', '板金鎧甲可是我的得意之作', '劍要常磨才鋒利'],
    teleport: ['需要傳送服務嗎？', '峽谷深處很危險，請小心', '旅途平安'],
    quest: ['村子需要勇者的幫忙', '最近怪物越來越多了…', '來看看告示板上的委託吧'],
  };
  // 村民與冒險者
  G.others = [];
  const looks = [
    { body: '#2a3a6a', legs: '#1e2440', hair: '#e8d070', longHair: true, cape: '#1a2040', trim: '#d8d8e8', weapon: 'bow', skin: '#f0d0b0' },
    { body: '#b03a5a', legs: '#f0f0f0', hair: '#e8d070', longHair: true, trim: '#ffffff', weapon: 'bow', skin: '#f0d0b0' },
    { body: '#7a7f88', legs: '#4a4e58', helm: '#8a8f99', cape: '#3a4a7a', plate: true, weapon: 'sword', skin: '#e0b890' },
    { body: '#4a2a5a', robe: true, hood: '#3a1a4a', weapon: 'staff', skin: '#e8c8a8' },
    { body: '#5a6a3a', legs: '#3a3a2a', hair: '#3a2010', weapon: 'sword', belt: '#2a1a10', skin: '#d8a880' },
    { body: '#9a5a2a', legs: '#4a3a2a', hair: '#a02a1a', weapon: 'dagger', skin: '#f0c8a0' },
  ];
  const names = ADVENTURER_NAMES.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < 8; i++) {
    const p = W.randomFreeTile((x, y) => dist(x, y, cx, cy) < 9);
    G.others.push(new Wanderer(p.x + 0.5, p.y + 0.5, names[i], looks[i % looks.length], false));
  }
  for (let i = 0; i < 2; i++) {
    const p = W.randomFreeTile((x, y) => dist(x, y, cx, cy) < 9);
    G.others.push(new Wanderer(p.x + 0.5, p.y + 0.5, i ? '牧羊犬' : '小黃', { color: i ? '#3a3632' : '#b88a4a' }, true));
  }
}

function setupSpawners() {
  const W = G.world;
  const table = [
    { region: REGION.MEADOW, type: 'wolf', dmin: 17, dmax: 52, n: 13, max: 2 },
    { region: REGION.MEADOW, type: 'goblin', dmin: 38, dmax: 80, n: 8, max: 3 },
    { region: REGION.FOREST, type: 'goblin', dmin: 17, dmax: 42, n: 12, max: 3 },
    { region: REGION.FOREST, type: 'treant', dmin: 38, dmax: 80, n: 12, max: 2 },
    { region: REGION.BONE, type: 'skeleton', dmin: 17, dmax: 48, n: 14, max: 3 },
    { region: REGION.BONE, type: 'ghoul', dmin: 44, dmax: 80, n: 10, max: 2 },
    { region: REGION.CANYON, type: 'lizardman', dmin: 20, dmax: 64, n: 16, max: 3 },
  ];
  for (const s of table)
    for (let i = 0; i < s.n; i++) {
      const p = W.randomFreeTile((x, y) => {
        if (W.regionAt(x, y) !== s.region) return false;
        const d = dist(x, y, W.cx, W.cy);
        return d >= s.dmin && d <= s.dmax && dist(x, y, W.nest.x, W.nest.y) > 10;
      });
      if (p) G.spawners.push({ type: s.type, x: p.x + 0.5, y: p.y + 0.5, max: s.max, alive: 0, timer: 0, respawn: 25 });
    }
  G.spawners.push({ type: 'wyvern', x: W.nest.x + 0.5, y: W.nest.y + 0.5, max: 1, alive: 0, timer: 0, respawn: 180 });
  for (const sp of G.spawners) { for (let i = 0; i < sp.max; i++) spawnFrom(sp); }
}
function spawnFrom(sp) {
  const W = G.world;
  for (let t = 0; t < 20; t++) {
    const x = Math.floor(sp.x + rand(-3, 3)), y = Math.floor(sp.y + rand(-3, 3));
    if (W.blocked(x, y) || W.isSafe(x, y) || !W.reach[W.idx(x, y)]) continue;
    const m = new Monster(sp.type, x + 0.5, y + 0.5, sp);
    G.monsters.push(m); sp.alive++;
    return m;
  }
  return null;
}

function newGame(name, cls) {
  const p = new Player(name, cls);
  G.player = p;
  const c = CLASSES[cls];
  const w = mkItem(c.weapon), a = mkItem(c.armor);
  p.equip.weapon = w; p.equip.armor = a;
  addItem('red_potion', 15); addItem('return_scroll', 3); addItem('blue_potion', 3);
  log('歡迎來到' + GAME_TITLE + '，' + name + '！', 'sys');
  log('點擊地面移動，點擊怪物攻擊。數字鍵 1-9 使用快捷列。', 'sys');
  log('與村裡的守備隊長 雷恩 對話可以接受委託。', 'npc');
}

function mkItem(id, qty = 1, ench = 0) { return { uid: G.uid++, id, qty, ench }; }
function addItem(id, qty = 1, ench = 0) {
  const p = G.player, def = ITEMS[id];
  if (id === 'gold') { p.gold += qty; return true; }
  if (def.stack) {
    const ex = p.inv.find((i) => i.id === id);
    if (ex) { ex.qty += qty; UI.refresh(); return true; }
  }
  if (p.inv.length >= 40) { log('背包已滿。', 'warn'); return false; }
  if (def.stack) p.inv.push(mkItem(id, qty, ench));
  else for (let i = 0; i < qty; i++) p.inv.push(mkItem(id, 1, ench));
  UI.refresh();
  return true;
}
function countItem(id) { const it = G.player.inv.find((i) => i.id === id); return it ? it.qty : 0; }
function removeItem(inst, qty = 1) {
  const p = G.player;
  inst.qty -= qty;
  if (inst.qty <= 0) { const k = p.inv.indexOf(inst); if (k >= 0) p.inv.splice(k, 1); }
  UI.refresh();
}
function itemName(inst) {
  const d = ITEMS[inst.id];
  return (inst.ench ? '+' + inst.ench + ' ' : '') + d.name + (d.stack && inst.qty > 1 ? ' (' + inst.qty + ')' : '');
}

// ---------- 存檔 ----------
function saveGame(silent) {
  const p = G.player; if (!p) return;
  const data = {
    name: p.name, cls: p.cls, level: p.level, exp: p.exp, hp: p.hp, mp: p.mp, maxHp: p.maxHp, maxMp: p.maxMp,
    gold: p.gold, honor: p.honor, inv: p.inv, equip: p.equip, quest: p.quest, kills: p.kills,
    x: p.x, y: p.y, day: G.day,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); if (!silent) log('遊戲已儲存。', 'sys'); } catch (e) { /* 無法存檔 */ }
}
function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function continueGame(d) {
  const p = new Player(d.name, d.cls);
  G.player = p;
  Object.assign(p, { level: d.level, exp: d.exp, hp: d.hp, mp: d.mp, maxHp: d.maxHp, maxMp: d.maxMp, gold: d.gold, honor: d.honor, inv: d.inv || [], equip: d.equip || { weapon: null, armor: null }, quest: d.quest || p.quest, kills: d.kills || 0 });
  for (const i of p.inv) i.uid = G.uid++;
  if (!G.world.blocked(d.x, d.y)) { p.x = d.x; p.y = d.y; }
  G.day = d.day || 0.3;
  log('歡迎回來，' + p.name + '。', 'sys');
}

// ---------- 訊息 ----------
function log(text, cls = '') { UI.log(text, cls); }
function floatText(x, y, text, color, z = 50, size = 15) { G.texts.push({ x, y, z, text, color, t: 0, size }); }
function burst(x, y, z, color, n = 10, spd = 2, life = 0.6, size = 2.5, up = 2) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * spd;
    G.particles.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(0, up) * 30, life, max: life, color, size });
  }
}
function later(t, fn) { G.timers.push({ t, fn }); }

// ---------- 玩家行為 ----------
function inSafe(e) { return G.world.isSafe(e.x, e.y); }

function setAction(a) {
  const p = G.player;
  if (p.dead) return;
  p.action = a; p.repathT = 0;
  if (a.type === 'move') {
    const path = Path.find(G.world, p.x, p.y, a.x, a.y, 6000);
    p.path = path || [];
    if (path && !G.world.blocked(a.x, a.y) && path.length) {
      path[path.length - 1] = { x: a.x, y: a.y };
    }
    G.clickFx = { x: a.x, y: a.y, t: 0 };
  }
}

function playerAttackRange() { return G.player.weapon.range || 1.3; }

function updatePlayer(dt) {
  const p = G.player;
  if (p.dead) return;
  p.atkCd -= dt; if (p.atkAnim >= 0) { p.atkAnim += dt / p.atkDur; if (p.atkAnim >= 1) p.atkAnim = -1; }
  // 回復
  p.regenT += dt;
  if (p.regenT >= 3) {
    p.regenT = 0;
    const safe = inSafe(p);
    const hpR = Math.max(1, Math.floor(p.maxHp * (safe ? 0.06 : 0.02)));
    const mpR = Math.max(1, Math.floor(p.maxMp * (safe ? 0.08 : 0.04)));
    p.hp = Math.min(p.maxHp, p.hp + hpR); p.mp = Math.min(p.maxMp, p.mp + mpR);
  }
  // 狀態效果
  for (const k in p.buffs) {
    p.buffs[k] -= dt;
    if (p.buffs[k] <= 0) {
      delete p.buffs[k];
      log({ haste: '你的動作恢復正常速度。', holy: '武器上神聖的氣息消失了。', shield: '防護罩的效果消失了。' }[k] || '', 'sys');
    }
  }
  const a = p.action;
  const hm = p.haste;
  if (!a) { p.moveAlong(dt, hm); return; }
  if (a.type === 'move') {
    if (p.moveAlong(dt, hm)) p.action = null;
    return;
  }
  // 需要接近目標的行為
  let tx, ty, range;
  if (a.type === 'attack') {
    const m = a.target;
    if (!m || m.dead) { p.action = null; p.moving = false; if (G.autoHunt) autoNext(); return; }
    if (inSafe(m)) { p.action = null; return; }
    tx = m.x; ty = m.y; range = playerAttackRange() + (m.def.boss ? 0.8 : 0);
  } else if (a.type === 'pickup') {
    if (!G.items.includes(a.item)) { p.action = null; return; }
    tx = a.item.x; ty = a.item.y; range = 0.9;
  } else if (a.type === 'talk') { tx = a.npc.x; ty = a.npc.y; range = 1.9; }
  const d = dist(p.x, p.y, tx, ty);
  if (d <= range) {
    p.path = []; p.moving = false;
    if (a.type === 'attack') {
      p.face(tx, ty);
      if (p.atkCd <= 0) playerStrike(a.target);
    } else if (a.type === 'pickup') { pickup(a.item); p.action = null; }
    else if (a.type === 'talk') { p.face(tx, ty); a.npc.face(p.x, p.y); UI.openNPC(a.npc); p.action = null; }
    return;
  }
  p.repathT -= dt;
  if (p.repathT <= 0 || !p.path.length) {
    p.repathT = 0.35;
    p.path = Path.find(G.world, p.x, p.y, tx, ty, 3000) || [];
  }
  p.moveAlong(dt, hm);
}

function autoNext() {
  const p = G.player;
  let best = null, bd = 9;
  for (const m of G.monsters) {
    if (m.dead || inSafe(m)) continue;
    const d = dist(p.x, p.y, m.x, m.y);
    if (d < bd) { bd = d; best = m; }
  }
  if (best) setAction({ type: 'attack', target: best });
}

function hitChance(atkLvl, defLvl, defAc, bonus = 0) {
  return clamp(0.78 + (atkLvl - defLvl) * 0.035 - defAc * 0.012 + bonus, 0.2, 0.96);
}

function playerStrike(m) {
  const p = G.player, w = p.weapon;
  p.atkCd = w.spd / p.haste;
  p.atkDur = Math.min(0.42, p.atkCd * 0.8);
  p.atkAnim = 0;
  const ench = p.equip.weapon ? p.equip.weapon.ench || 0 : 0;
  const roll = () => {
    if (m.dead) return;
    const hit = Math.random() < hitChance(p.level, m.def.lvl, m.def.ac, (p.buffs.holy ? 0.06 : 0) + ench * 0.01);
    if (!hit) { floatText(m.x, m.y, 'MISS', '#b8c0d0', 60, 13); return; }
    let dmg = randi(w.dmg[0], w.dmg[1]) + ench + Math.floor(p.level / 3) + (p.buffs.holy ? 2 : 0) - Math.floor(m.def.ac / 3);
    const crit = Math.random() < 0.06;
    if (crit) dmg = Math.floor(dmg * 1.8);
    dmg = Math.max(1, dmg);
    damageMonster(m, dmg, crit);
  };
  if (w.ranged) {
    later(p.atkDur * 0.55, () => {
      G.projectiles.push({ kind: 'arrow', x: p.x, y: p.y, z: 26, target: m, speed: 14, onHit: roll, holy: !!p.buffs.holy });
    });
  } else later(p.atkDur * 0.5, roll);
}

function damageMonster(m, dmg, crit) {
  m.hp -= dmg; m.hurtT = 0.2;
  floatText(m.x, m.y, String(dmg), crit ? '#ffd040' : '#ffffff', m.def.boss ? 110 : 60, crit ? 20 : 15);
  burst(m.x, m.y, m.def.boss ? 60 : 26, m.type === 'skeleton' ? '#eee8d0' : m.type === 'treant' ? '#7a5a2a' : '#c02020', 7, 2.5, 0.45);
  if (m.state !== 'chase' && !m.dead) { m.state = 'chase'; m.thinkT = 0; }
  if (m.hp <= 0) killMonster(m);
}

function killMonster(m) {
  const p = G.player;
  m.dead = true; m.deadT = 0; m.hp = 0; m.moving = false;
  if (m.spawner) { m.spawner.alive--; m.spawner.timer = m.spawner.respawn * rand(0.8, 1.3); }
  const lvDiff = m.def.lvl - p.level;
  const expGain = Math.max(1, Math.floor(m.def.exp * clamp(1 + lvDiff * 0.06, 0.25, 1.6)));
  gainExp(expGain);
  p.honor = Math.min(32767, p.honor + m.def.lvl * 2);
  p.kills++;
  // 掉落
  dropItem(m.x, m.y, 'gold', randi(m.def.gold[0], m.def.gold[1]));
  for (const [id, ch] of m.def.loot) if (Math.random() < ch) dropItem(m.x + rand(-0.6, 0.6), m.y + rand(-0.6, 0.6), id, 1);
  // 委託
  const q = p.quest;
  if (q.active && QUESTS[q.idx] && QUESTS[q.idx].target === m.type) {
    q.count++;
    const Q = QUESTS[q.idx];
    if (q.count <= Q.count) log('【委託】' + MONSTERS[Q.target].name + ' ' + Math.min(q.count, Q.count) + '/' + Q.count, 'quest');
    if (q.count === Q.count) log('【委託】目標已完成，回村莊找雷恩回報吧！', 'quest');
  }
  if (m.def.boss) {
    log('★ ' + p.name + ' 擊敗了 ' + m.name + '！', 'loot');
    shake(10);
  }
  UI.refresh();
}

function dropItem(x, y, id, qty) {
  let fx = x, fy = y;
  if (G.world.blocked(fx, fy)) { fx = G.player.x; fy = G.player.y; }
  G.items.push({ x: fx, y: fy, id, qty, t: 0, ench: 0 });
}

function pickup(it) {
  const k = G.items.indexOf(it); if (k < 0) return;
  if (addItem(it.id, it.qty, it.ench)) {
    G.items.splice(k, 1);
    const nm = it.id === 'gold' ? '金幣 (' + it.qty + ')' : ITEMS[it.id].name + (it.qty > 1 ? ' (' + it.qty + ')' : '');
    log('獲得了 ' + nm + '。', 'loot');
  }
}

function gainExp(n) {
  const p = G.player;
  p.exp += n;
  while (p.exp >= expForLevel(p.level)) {
    p.exp -= expForLevel(p.level);
    p.level++;
    const c = CLASSES[p.cls];
    const hpG = randi(c.hpLv[0], c.hpLv[1]), mpG = randi(c.mpLv[0], c.mpLv[1]);
    p.maxHp += hpG; p.maxMp += mpG; p.hp = p.maxHp; p.mp = p.maxMp;
    log('等級提升！你現在是 ' + p.level + ' 級。(體力 +' + hpG + '，魔力 +' + mpG + ')', 'level');
    G.levelFx = { t: 0 };
    burst(p.x, p.y, 20, '#ffe080', 30, 3, 1.2, 3, 4);
    for (const s in SKILLS) if (SKILLS[s].lvl === p.level) log('你學會了新魔法：' + SKILLS[s].name + '！', 'level');
    saveGame(true);
  }
  UI.refresh();
}

function playerDie() {
  const p = G.player;
  p.dead = true; p.action = null; p.path = []; p.moving = false;
  const lose = Math.floor(expForLevel(p.level) * 0.05);
  p.exp = Math.max(0, p.exp - lose);
  log('你死了。失去了 ' + lose + ' 點經驗值。', 'warn');
  G.autoHunt = false;
  UI.showDeath();
}
function respawn() {
  const p = G.player;
  p.dead = false; p.hp = Math.ceil(p.maxHp * 0.5); p.mp = Math.ceil(p.maxMp * 0.5);
  p.buffs = {};
  teleportTo(G.world.cx + 1.5, G.world.cy + 2.5);
  UI.refresh();
}
function teleportTo(x, y) {
  const p = G.player;
  burst(p.x, p.y, 20, '#9fd0ff', 24, 2, 0.8, 3, 4);
  p.x = x; p.y = y; p.path = []; p.action = null;
  for (const m of G.monsters) if (m.state === 'chase') { m.state = 'return'; m.thinkT = 0; }
  burst(p.x, p.y, 20, '#9fd0ff', 24, 2, 0.8, 3, 4);
  G.cam.x = toScreen(x, y).x; G.cam.y = toScreen(x, y).y - 20;
}

// ---------- 使用物品與魔法 ----------
function useItem(inst) {
  const p = G.player; if (p.dead) return;
  const d = ITEMS[inst.id];
  if (d.type === 'weapon' || d.type === 'armor') { equipItem(inst); return; }
  if (d.type !== 'consume') { log(d.name + '：' + d.desc, 'sys'); return; }
  switch (inst.id) {
    case 'red_potion': case 'orange_potion': {
      if (p.hp >= p.maxHp) { log('體力已經全滿了。', 'sys'); return; }
      const h = inst.id === 'red_potion' ? 30 : 80;
      p.hp = Math.min(p.maxHp, p.hp + h);
      floatText(p.x, p.y, '+' + h, '#60ff80', 60); burst(p.x, p.y, 20, '#ff6060', 10, 1, 0.6, 2, 3);
      log('你覺得舒服多了。', 'sys');
      break;
    }
    case 'blue_potion':
      if (p.mp >= p.maxMp) { log('魔力已經全滿了。', 'sys'); return; }
      p.mp = Math.min(p.maxMp, p.mp + 25); burst(p.x, p.y, 20, '#6090ff', 10, 1, 0.6, 2, 3);
      log('你的魔力恢復了。', 'sys');
      break;
    case 'haste_potion':
      p.buffs.haste = 300; burst(p.x, p.y, 20, '#80ff80', 16, 2, 0.8, 2, 3);
      log('你的動作突然變快。', 'sys');
      break;
    case 'return_scroll':
      log('你被傳送回晨風村。', 'sys');
      teleportTo(G.world.cx + rand(-1, 2), G.world.cy + 2.5);
      break;
    case 'ew_scroll': {
      const w = p.equip.weapon;
      if (!w) { log('你沒有裝備武器。', 'warn'); return; }
      enchant(w, 6, '武器');
      break;
    }
    case 'ea_scroll': {
      const a = p.equip.armor;
      if (!a) { log('你沒有穿著盔甲。', 'warn'); return; }
      enchant(a, 4, '盔甲');
      break;
    }
  }
  removeItem(inst, 1);
  UI.refresh();
}
function enchant(inst, safe, label) {
  const p = G.player;
  const nm = ITEMS[inst.id].name;
  const cur = inst.ench || 0;
  const ok = cur < safe || Math.random() < Math.max(0.12, 0.45 - (cur - safe) * 0.08);
  if (ok) {
    const add = cur < 3 && Math.random() < 0.25 ? 2 : 1;
    inst.ench = cur + add;
    log('+' + cur + ' ' + nm + ' 發出了一陣' + (add > 1 ? '耀眼的' : '') + '藍色光芒。(+' + inst.ench + ')', 'level');
    burst(p.x, p.y, 30, '#80c0ff', 24, 2, 1, 3, 3);
  } else {
    log('+' + cur + ' ' + nm + ' 發出強烈的光芒後就消失了…', 'warn');
    if (label === '武器') p.equip.weapon = null; else p.equip.armor = null;
    burst(p.x, p.y, 30, '#ffffff', 30, 3, 1, 3, 3);
  }
}
function equipItem(inst) {
  const p = G.player, d = ITEMS[inst.id];
  const slot = d.type;
  const k = p.inv.indexOf(inst);
  if (k >= 0) p.inv.splice(k, 1);
  if (p.equip[slot]) p.inv.push(p.equip[slot]);
  p.equip[slot] = inst;
  log('裝備了 ' + itemName(inst) + '。', 'sys');
  if (p.action && p.action.type === 'attack') p.atkCd = 0.3;
  UI.refresh();
}
function unequip(slot) {
  const p = G.player;
  if (!p.equip[slot]) return;
  if (p.inv.length >= 40) { log('背包已滿。', 'warn'); return; }
  p.inv.push(p.equip[slot]); log('卸下了 ' + itemName(p.equip[slot]) + '。', 'sys');
  p.equip[slot] = null; UI.refresh();
}
function castSkill(id) {
  const p = G.player; if (p.dead) return;
  const s = SKILLS[id];
  if (p.level < s.lvl) { log(s.name + ' 需要等級 ' + s.lvl + '。', 'warn'); return; }
  if (p.mp < s.mp) { log('魔力不足。', 'warn'); return; }
  if (p.castCd > G.t) return;
  p.castCd = G.t + 0.6;
  p.mp -= s.mp;
  if (id === 'heal') {
    const h = 14 + p.level * 2 + randi(0, 8);
    p.hp = Math.min(p.maxHp, p.hp + h);
    floatText(p.x, p.y, '+' + h, '#60ff80', 60);
    for (let i = 0; i < 18; i++) G.particles.push({ x: p.x + rand(-0.4, 0.4), y: p.y + rand(-0.4, 0.4), z: rand(0, 20), vx: 0, vy: 0, vz: rand(30, 60), life: 1, max: 1, color: '#c8f0ff', size: 2.5 });
  } else if (id === 'holy') {
    p.buffs.holy = s.dur; log('在你的武器上附著神聖的氣息。', 'sys');
    burst(p.x, p.y, 30, '#ffe880', 20, 2, 0.9, 2.5, 3);
  } else if (id === 'shield') {
    p.buffs.shield = s.dur; log('你的身體被魔法防護罩包圍。', 'sys');
    burst(p.x, p.y, 25, '#a0d0ff', 20, 2, 0.9, 2.5, 3);
  }
  p.atkAnim = 0; p.atkDur = 0.35;
  UI.refresh();
}
function useHotbar(i) {
  const h = HOTBAR[i]; if (!h || !G.player) return;
  if (h.kind === 'item') {
    const inst = G.player.inv.find((it) => it.id === h.id);
    if (!inst) { log('沒有 ' + ITEMS[h.id].name + '。', 'warn'); return; }
    useItem(inst);
  } else if (h.kind === 'skill') castSkill(h.id);
  else if (h.kind === 'auto') {
    G.autoHunt = !G.autoHunt;
    log(G.autoHunt ? '自動狩獵：開啟（自動攻擊附近的怪物）' : '自動狩獵：關閉', 'sys');
    if (G.autoHunt && (!G.player.action || G.player.action.type !== 'attack')) autoNext();
    UI.refresh();
  }
}

// ---------- 怪物 AI ----------
function updateMonster(m, dt) {
  const p = G.player, W = G.world;
  if (m.dead) { m.deadT += dt; return; }
  if (m.atkAnim >= 0) { m.atkAnim += dt / 0.45; if (m.atkAnim >= 1) m.atkAnim = -1; }
  m.atkCd -= dt; m.thinkT -= dt; m.hurtT -= dt;
  const dp = dist(m.x, m.y, p.x, p.y);
  if (dp > 34 && m.state !== 'chase') return; // 遠處的怪物休眠
  const pSafe = inSafe(p);
  if (m.state === 'idle' && !p.dead && m.def.aggro && dp < m.def.aggroR && !pSafe) { m.state = 'chase'; m.thinkT = 0; }
  if (m.state === 'chase') {
    const leash = m.def.boss ? 16 : 13;
    if (p.dead || pSafe || dist(m.x, m.y, m.home.x, m.home.y) > leash) { m.state = 'return'; m.thinkT = 0; return; }
    const range = m.def.range + (m.def.boss ? 0.4 : 0);
    if (m.def.breath && dp < 6 && dp > 2.5 && m.atkCd <= 0 && Math.random() < 0.02) {
      // 火焰吐息
      m.face(p.x, p.y); m.atkAnim = 0; m.atkCd = m.def.atkSpd * 1.6; m.path = [];
      G.projectiles.push({ kind: 'fire', x: m.x, y: m.y, z: 70, target: p, speed: 7, from: m, onHit: () => monsterHit(m, 1.3) });
      return;
    }
    if (dp <= range) {
      m.path = []; m.moving = false; m.face(p.x, p.y);
      if (m.atkCd <= 0) {
        m.atkCd = m.def.atkSpd; m.atkAnim = 0;
        later(0.22, () => { if (!m.dead && !p.dead && dist(m.x, m.y, p.x, p.y) <= range + 0.6) monsterHit(m, 1); });
      }
    } else {
      if (m.thinkT <= 0 || !m.path.length) {
        m.thinkT = 0.5 + Math.random() * 0.3;
        if (dp < 2.5 && !W.blocked(p.x, p.y)) m.path = [{ x: p.x, y: p.y }];
        else m.path = Path.find(W, m.x, m.y, p.x, p.y, 700, true) || [];
      }
      m.moveAlong(dt);
    }
  } else if (m.state === 'return') {
    if (m.thinkT <= 0 || !m.path.length) { m.thinkT = 1; m.path = Path.find(W, m.x, m.y, m.home.x, m.home.y, 1500, true) || []; }
    m.moveAlong(dt, 1.3);
    m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.2 * dt);
    if (dist(m.x, m.y, m.home.x, m.home.y) < 1.5 || !m.path.length) { m.state = 'idle'; m.path = []; m.hp = m.maxHp; }
  } else {
    // 閒晃
    if (m.path.length) m.moveAlong(dt, 0.5);
    else { m.moving = false; if (m.thinkT <= 0) {
      m.thinkT = rand(2, 6);
      const tx = m.home.x + rand(-4, 4), ty = m.home.y + rand(-4, 4);
      if (!W.blocked(tx, ty) && !W.isSafe(tx, ty)) m.path = Path.find(W, m.x, m.y, tx, ty, 200, true) || [];
    } }
  }
  // 互相推開
  for (const o of G.monsters) {
    if (o === m || o.dead) continue;
    const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy);
    if (d < 0.6 && d > 0.001) {
      const push = (0.6 - d) * 0.5;
      const nx = m.x + (dx / d) * push, ny = m.y + (dy / d) * push;
      if (!W.blocked(nx, ny)) { m.x = nx; m.y = ny; }
    }
  }
}

function monsterHit(m, mul) {
  const p = G.player; if (p.dead) return;
  const hit = Math.random() < hitChance(m.def.lvl, p.level, p.ac, 0.05);
  if (!hit) { floatText(p.x, p.y, 'MISS', '#b8c0d0', 60, 13); return; }
  let dmg = Math.round(randi(m.def.dmg[0], m.def.dmg[1]) * mul) - Math.floor(p.ac / 2);
  dmg = Math.max(1, dmg);
  p.hp -= dmg; p.hurtT = 0.25;
  floatText(p.x, p.y, String(dmg), '#ff5050', 60, 15);
  burst(p.x, p.y, 26, '#c01818', 6, 2, 0.4);
  if (dmg > p.maxHp * 0.2) shake(4);
  if (p.hp <= 0) { p.hp = 0; playerDie(); }
  // 被打就反擊（沒有其他行動時）
  if (!p.action && !p.dead) setAction({ type: 'attack', target: m });
  UI.refresh();
}

function updateSpawners(dt) {
  for (const sp of G.spawners) {
    if (sp.alive < sp.max) {
      sp.timer -= dt;
      if (sp.timer <= 0) {
        const p = G.player;
        if (dist(p.x, p.y, sp.x, sp.y) > 12 || sp.type !== 'wyvern') { if (dist(p.x, p.y, sp.x, sp.y) > 7) spawnFrom(sp); }
        sp.timer = sp.respawn;
      }
    }
  }
  G.monsters = G.monsters.filter((m) => !(m.dead && m.deadT > 3));
}

// ---------- NPC、村民 ----------
function updateTown(dt) {
  const W = G.world;
  for (const n of G.npcs) {
    n.lineT -= dt; n.sayT -= dt;
    if (n.lineT <= 0) { n.lineT = rand(14, 30); if (dist(n.x, n.y, G.player.x, G.player.y) < 12) n.speak(pick(G.npcLines[n.role]), 4); }
  }
  for (const o of G.others) {
    o.sayT -= dt; o.lineT -= dt;
    if (o.path.length) o.moveAlong(dt);
    else {
      o.moving = false; o.waitT -= dt;
      if (o.waitT <= 0) {
        o.waitT = rand(2, o.isDog ? 5 : 9);
        const p = W.randomFreeTile((x, y) => dist(x, y, W.cx, W.cy) < 10 && dist(x, y, o.x, o.y) < 8, 50);
        if (p) o.path = Path.find(W, o.x, o.y, p.x + 0.5, p.y + 0.5, 500, false) || [];
      }
    }
    if (o.lineT <= 0) {
      o.lineT = rand(18, 45);
      const near = dist(o.x, o.y, G.player.x, G.player.y) < 14;
      if (o.isDog) { if (near) { o.speak('汪！汪！', 2.5); log(o.name + '：汪！汪！', 'chat'); } }
      else if (near || Math.random() < 0.3) { const l = pick(ADVENTURER_LINES); o.speak(l, 5); log(o.name + '：' + l, 'chat'); }
    }
  }
}

// ---------- 投射物、粒子 ----------
function updateFx(dt) {
  for (let i = G.timers.length - 1; i >= 0; i--) { const t = G.timers[i]; t.t -= dt; if (t.t <= 0) { G.timers.splice(i, 1); t.fn(); } }
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    const tg = pr.target;
    const tz = tg === G.player ? 26 : (tg.def && tg.def.boss ? 60 : 24);
    const dx = tg.x - pr.x, dy = tg.y - pr.y, d = Math.hypot(dx, dy);
    pr.z = lerp(pr.z, tz, 0.1);
    pr.ang = Math.atan2(dy, dx);
    if (pr.kind === 'fire') burst(pr.x, pr.y, pr.z, Math.random() < 0.5 ? '#ffb030' : '#ff5010', 2, 0.6, 0.4, 3, 1);
    if (d < pr.speed * dt || (tg.dead && tg !== G.player)) {
      G.projectiles.splice(i, 1);
      if (!tg.dead || tg === G.player) pr.onHit();
      if (pr.kind === 'fire') burst(tg.x, tg.y, 20, '#ff8020', 20, 3, 0.6, 3, 2);
      continue;
    }
    pr.x += (dx / d) * pr.speed * dt; pr.y += (dy / d) * pr.speed * dt;
  }
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const q = G.particles[i];
    q.life -= dt; if (q.life <= 0) { G.particles.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= 60 * dt;
    if (q.z < 0) { q.z = 0; q.vz = 0; q.vx *= 0.8; q.vy *= 0.8; }
  }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.t += dt; if (t.t > 1.1) G.texts.splice(i, 1); }
  for (let i = G.items.length - 1; i >= 0; i--) { const it = G.items[i]; it.t += dt; if (it.t > 150) G.items.splice(i, 1); }
  if (G.clickFx) { G.clickFx.t += dt; if (G.clickFx.t > 0.6) G.clickFx = null; }
  if (G.levelFx) { G.levelFx.t += dt; if (G.levelFx.t > 1.6) G.levelFx = null; }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
}
function shake(n) { G.shake = Math.max(G.shake || 0, n); }

// ---------- 主迴圈 ----------
let lastT = 0, saveT = 0, zoneShown = '';
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016);
  lastT = ts;
  if (G.running) {
    G.t += dt;
    G.day = (G.day + dt / 480) % 1;
    const p = G.player;
    p.sayT -= dt; p.hurtT -= dt;
    // 按住滑鼠持續移動
    if (G.mouse.down && G.mouse.holdMove && !p.dead) {
      G.mouse.holdT = (G.mouse.holdT || 0) - dt;
      if (G.mouse.holdT <= 0) { G.mouse.holdT = 0.25; const w = screenToWorld(G.mouse.x, G.mouse.y); setAction({ type: 'move', x: w.x, y: w.y }); }
    }
    updatePlayer(dt);
    for (const m of G.monsters) updateMonster(m, dt);
    updateTown(dt);
    updateSpawners(dt);
    updateFx(dt);
    if (G.autoHunt && !p.action && !p.dead) { G.autoT = (G.autoT || 0) - dt; if (G.autoT <= 0) { G.autoT = 0.5; autoNext(); } }
    const zn = G.world.zoneName(p.x, p.y);
    if (zn !== zoneShown) { zoneShown = zn; UI.zone(zn, inSafe(p)); }
    saveT += dt; if (saveT > 30) { saveT = 0; saveGame(true); }
    UI.tick(dt);
    render();
  }
  requestAnimationFrame(frame);
}

function screenToWorld(mx, my) {
  const sx = mx - VW / 2 + G.cam.x, sy = my - (VH - HUD_H()) / 2 + G.cam.y;
  return toWorld(sx, sy);
}

// ---------- 輸入 ----------
function pickAt(mx, my) {
  // 由前往後檢查可點擊物
  let best = null, bd = -1e9;
  const test = (e, kind) => {
    const b = e._bb; if (!b) return;
    if (mx >= b.x0 && mx <= b.x1 && my >= b.y0 && my <= b.y1) {
      const depth = e.x + e.y + (kind === 'item' ? 100 : 0);
      if (depth > bd) { bd = depth; best = { kind, e }; }
    }
  };
  for (const m of G.monsters) if (!m.dead) test(m, 'monster');
  for (const n of G.npcs) test(n, 'npc');
  for (const it of G.items) test(it, 'item');
  for (const o of G.objs || []) test(o, 'board');
  return best;
}

function onPointerDown(e) {
  if (!G.running) return;
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  G.mouse.x = mx; G.mouse.y = my; G.mouse.down = true; G.mouse.holdMove = false;
  UI.blurChat();
  const p = G.player; if (p.dead) return;
  const hit = pickAt(mx, my);
  if (hit) {
    if (hit.kind === 'monster') setAction({ type: 'attack', target: hit.e });
    else if (hit.kind === 'npc') setAction({ type: 'talk', npc: hit.e });
    else if (hit.kind === 'item') setAction({ type: 'pickup', item: hit.e });
    else if (hit.kind === 'board') setAction({ type: 'talk', npc: hit.e.npc });
    return;
  }
  const w = screenToWorld(mx, my);
  setAction({ type: 'move', x: w.x, y: w.y });
  G.mouse.holdMove = true; G.mouse.holdT = 0.3;
}
function onPointerMove(e) {
  const r = canvas.getBoundingClientRect();
  G.mouse.x = e.clientX - r.left; G.mouse.y = e.clientY - r.top;
  if (!G.running) return;
  const h = pickAt(G.mouse.x, G.mouse.y);
  G.hover = h;
  canvas.style.cursor = h ? (h.kind === 'monster' ? 'crosshair' : 'pointer') : 'default';
}
function onKey(e) {
  if (!G.running) return;
  if (UI.chatFocused()) return;
  const k = e.key;
  if (k >= '1' && k <= '9') { useHotbar(+k - 1); e.preventDefault(); }
  else if (k === 'i' || k === 'I') UI.toggle('inv');
  else if (k === 'c' || k === 'C') UI.toggle('char');
  else if (k === 'm' || k === 'M') UI.toggleMinimap();
  else if (k === 'Escape') UI.closeAll();
  else if (k === 'Tab') { e.preventDefault(); autoNext(); }
  else if (k === 'Enter') { UI.focusChat(); e.preventDefault(); }
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = VW * DPR; canvas.height = VH * DPR;
  canvas.style.width = VW + 'px'; canvas.style.height = VH + 'px';
}

function startGame(saveData, name, cls) {
  if (saveData) continueGame(saveData); else newGame(name, cls);
  setupNPCs();
  // 告示板也可點擊（開委託）
  G.objs = G.world.objs.filter((o) => o && o.kind === 'board').map((o) => ({ x: o.tx + 0.5, y: o.ty + 0.5, npc: G.npcs[3] }));
  setupSpawners();
  const s = toScreen(G.player.x, G.player.y);
  G.cam.x = s.x; G.cam.y = s.y;
  G.running = true;
  UI.refresh();
  saveGame(true);
}

window.addEventListener('load', () => {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', () => { G.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', onKey);
  window.addEventListener('beforeunload', () => { if (G.running) saveGame(true); });
  initWorld();
  UI.init();
  requestAnimationFrame(frame);
});
