'use strict';
// ===== 遊戲主體：狀態、實體、戰鬥、AI、魔法、血盟、攻城 =====
const G = {
  maps: {}, map: null, world: null, player: null,
  projectiles: [], particles: [], texts: [], timers: [],
  t: 0, day: 0.3, cam: { x: 0, y: 0 }, hover: null,
  mouse: { x: 0, y: 0, down: false },
  running: false, autoHunt: false, uid: 1, targeting: null,
  siege: null,
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

// 會過期的仇恨名單（被誤打的冒險者一段時間後就不再追打）
class GrudgeSet {
  constructor() { this.m = new Map(); }
  add(id, ttl = 60) { this.m.set(id, G.t + ttl); }
  has(id) { const e = this.m.get(id); if (e === undefined) return false; if (G.t > e) { this.m.delete(id); return false; } return true; }
  delete(id) { this.m.delete(id); }
  clear() { this.m.clear(); }
}
const PINK_TIME = 20;        // 紫名秒數
const FIGHTER_GRUDGE = 8;    // 冒險者被誤打後追擊秒數
const GUARD_COOLDOWN = 120;  // 守衛處罰紅名後的冷卻秒數

// 所有非玩家的角色（怪物、冒險者、邪惡冒險者、守衛、盟友、村民、建築）
class Actor extends Entity {
  constructor(o) {
    super(o.x, o.y);
    Object.assign(this, {
      kind: 'monster', faction: 'monster', name: '', level: 1, maxHp: 10, ac: 0, mr: 0, er: 0,
      dmg: [1, 3], atkSpd: 1.2, range: 1.3, proj: null, magic: false, aggro: false, aggroR: 5, undead: false,
      sprite: 'human', look: null, clan: null, emblem: null, align: 0, boss: false, def: null,
      state: 'idle', target: null, thinkT: rand(0, 1.5), atkCd: 0, deadT: 0, grudge: new GrudgeSet(), slowT: 0, potT: 0,
    }, o);
    this.hp = this.maxHp;
    this.home = { x: this.x, y: this.y };
    this.scale = this.scale || (this.boss ? 1 : rand(0.94, 1.05));
    this.dir = rand(0, Math.PI * 2);
  }
}
function makeMonster(type, x, y, spawner) {
  const d = MONSTERS[type];
  const a = new Actor({
    x, y, kind: 'monster', faction: d.siege ? 'castle' : 'monster', type, def: d, name: d.name, level: d.lvl, maxHp: d.hp, ac: d.ac, mr: d.mr,
    dmg: d.dmg, atkSpd: d.atkSpd, range: d.range, proj: d.proj, magic: d.magic, aggro: d.aggro, aggroR: d.aggroR || 5,
    undead: !!d.undead, sprite: d.sprite, boss: !!d.boss, speed: d.speed, spawner,
  });
  if (d.siege) { a.leash = 18; a.clan = '灰岩騎士團'; }
  return a;
}
const FIGHTER_CLS = ['knight', 'mage', 'ranger', 'cleric'];
function makeFighter(x, y, lvl, evil) {
  const cls = pick(FIGHTER_CLS);
  const look = Object.assign({}, pick(FIGHTER_LOOKS[cls]));
  const ranged = cls === 'ranger' || cls === 'mage';
  const name = evil ? pick(PKER_NAMES) : pick(FIGHTER_NAMES);
  const a = new Actor({
    x, y, kind: evil ? 'pker' : 'fighter', faction: evil ? 'pker' : 'fighter', cls, name, level: lvl, look,
    maxHp: Math.round((cls === 'knight' ? 30 : cls === 'mage' ? 18 : 24) + lvl * (cls === 'knight' ? 11 : cls === 'mage' ? 6 : 8)),
    ac: Math.floor(lvl / 2) + (cls === 'knight' ? 4 : 1), mr: lvl, er: cls === 'ranger' ? 6 : 2,
    dmg: [2 + Math.floor(lvl / 2), 6 + lvl], atkSpd: cls === 'mage' ? 1.4 : 1.0, range: ranged ? (cls === 'mage' ? 5.5 : 6) : 1.35,
    proj: cls === 'ranger' ? 'arrow' : cls === 'mage' ? 'magic' : null, magic: cls === 'mage',
    aggro: true, aggroR: evil ? 8 : 6, speed: 3.1, sprite: 'human',
    align: evil ? -randi(2000, 20000) : randi(0, 4000),
    clan: !evil && Math.random() < 0.45 ? pick(NPC_CLANS) : evil && Math.random() < 0.5 ? ENEMY_CLAN : null,
  });
  if (a.clan) a.emblem = clanEmblemFor(a.clan);
  return a;
}
function clanEmblemFor(name) {
  let h = 0; for (const ch of name) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  return { shape: EMBLEM_SHAPES[h % EMBLEM_SHAPES.length], color: ['#ffd040', '#e0e8ff', '#ff6a4a', '#7ad0ff', '#a0f080'][(h >> 4) % 5], bg: ['#3a1a1a', '#1a2a3a', '#2a2a1a', '#2a1a3a'][(h >> 8) % 4] };
}

class NPC extends Entity {
  constructor(x, y, name, title, role, look, town) {
    super(x, y); this.name = name; this.title = title; this.role = role; this.look = look; this.town = town;
    this.dir = rand(0, 6); this.lineT = rand(6, 16);
  }
}

class Player extends Entity {
  constructor(d) {
    super(0, 0);
    Object.assign(this, {
      name: d.name, cls: d.cls, level: 1, exp: 0, base: Object.assign({}, d.stats), statPoints: 0,
      baseMaxHp: 10, baseMaxMp: 5, hp: 10, mp: 5, gold: 500, align: 0, inv: [], wh: [],
      equip: {}, spells: [], hotbar: [], buffs: {}, quest: { idx: 0, count: 0, active: false },
      kills: 0, pkCount: 0, clan: null, castle: null, homeTown: 'dawn', mapId: 'overworld',
      pinkT: 0, atkCd: 0, regenT: 0, castCd: 0, action: null, repathT: 0, nextStrike: false,
    });
    for (const s of SLOTS) this.equip[s] = null;
    this.speed = 3.6;
    this.d = {};
  }
  get maxHp() { return this.baseMaxHp + (this.d.hpB || 0); }
  get maxMp() { return this.baseMaxMp + (this.d.mpB || 0); }
  get haste() { return this.buffs.haste ? 1.33 : 1; }
  get weaponDef() { return this.equip.weapon ? ITEMS[this.equip.weapon.id] : { dmg: [1, 3], spd: 0.8, range: 1.2, name: '空手', wclass: 'fist' }; }
}

// ---------- 數值計算 ----------
function recalc(p = G.player) {
  const st = Object.assign({}, p.base);
  const d = { ac: 0, mr: 0, er: 0, sp: 0, hpB: 0, mpB: 0, hit: 0, dmgB: 0, weightB: 0, res: { earth: 0, water: 0, fire: 0, wind: 0 } };
  for (const s of SLOTS) {
    const inst = p.equip[s]; if (!inst) continue;
    const it = ITEMS[inst.id], e = inst.ench || 0;
    if (it.type === 'armor') d.ac += (it.ac || 0) + e;
    else if (it.ac) d.ac += it.ac;
    if (it.type === 'weapon') { d.hit += (it.hit || 0) + Math.floor(e / 2); d.dmgB += (it.dmgB || 0) + e; }
    d.mr += it.mr || 0; d.er += it.er || 0; d.sp += it.sp || 0; d.hpB += it.hp || 0; d.mpB += it.mp || 0; d.weightB += it.weight || 0;
    if (it.stat) for (const k in it.stat) st[k] += it.stat[k];
    if (it.res) for (const k in it.res) d.res[k] += it.res[k];
  }
  const B = p.buffs;
  if (B.shield) d.ac += 2;
  if (B.warcry) d.ac += 3;
  if (B.earthskin) d.ac += 5;
  if (B.blessarmor) { d.ac += 4; d.mr += 10; }
  d.st = st;
  d.ac += Math.max(0, Math.floor(statMod(st.dex) / 2)) + Math.floor(p.level / 6);
  d.er += 3 + statMod(st.dex) * 2;
  d.mr += Math.max(0, statMod(st.wis) * 3) + Math.floor(p.level / 2);
  d.mlevel = Math.max(0, Math.floor(p.level / CLASSES[p.cls].mlDiv));
  d.sp += statMod(st.int) + d.mlevel;
  d.weightMax = 1000 + (st.str + st.con) * 40 + d.weightB;
  d.weight = invWeight(p);
  p.d = d;
  if (p.hp > p.maxHp) p.hp = p.maxHp;
  if (p.mp > p.maxMp) p.mp = p.maxMp;
  return d;
}
function itemWeight(inst) { return (ITEMS[inst.id].w || 0) * (inst.qty || 1); }
function invWeight(p) {
  let w = 0;
  for (const i of p.inv) w += itemWeight(i);
  for (const s of SLOTS) if (p.equip[s]) w += itemWeight(p.equip[s]);
  return Math.round(w);
}
function weightPct(p = G.player) { return Math.round(100 * p.d.weight / p.d.weightMax); }

// ---------- 地圖 ----------
function getMap(id) {
  if (G.maps[id]) return G.maps[id];
  const w = new World(id, 20261115);
  const m = { id, world: w, actors: [], items: [], spawners: [], npcs: [] };
  G.maps[id] = m;
  if (id === 'overworld') populateOverworld(m); else populateCrypt(m);
  return m;
}
function setMap(id) {
  const m = getMap(id);
  G.map = m; G.world = m.world;
  Path.init(m.world.w, m.world.h);
  buildMinimapBase();
  G.projectiles.length = 0; G.particles.length = 0; G.texts.length = 0;
  if (G.player) G.player.mapId = id;
}
function changeMap(id, x, y) {
  const p = G.player;
  SFX.play('teleport');
  const from = G.map;
  setMap(id);
  const pos = G.world.nearestFree(x, y);
  p.x = pos.x; p.y = pos.y; p.path = []; p.action = null;
  G.cam.x = toScreen(p.x, p.y).x; G.cam.y = toScreen(p.x, p.y).y;
  UI.zone(G.world.zoneName(p.x, p.y), inSafe(p));
  bringCompanions(from, G.map);
  log(id === 'crypt' ? '你走進了陰冷的地下墓穴…' : '你回到了地面。', 'sys');
}

const NPC_NAMES = {
  general: ['露西亞', '米拉', '朵拉', '蘿絲'], smith: ['巴頓', '葛倫', '老鐵'], magic: ['賽琳', '奧斯卡'], teleport: ['艾琳', '諾娃', '薇拉', '妮可'],
  quest: ['雷恩'], clan: ['莫里斯'], warehouse: ['湯姆', '貝拉', '班恩', '漢克'], jewel: ['莉莉', '卡門'], pet: ['芙蘿', '傑克'], guard: ['村莊守衛'],
};
const NPC_TITLES = { general: '雜貨商人', smith: '武器防具商', magic: '魔法商人', teleport: '傳送師', quest: '守備隊長', clan: '血盟管理員', warehouse: '倉庫管理員', jewel: '飾品商人', pet: '寵物商人', guard: '守衛', herald: '攻城傳令官' };
const NPC_LOOKS = {
  general: { body: '#8a3a4a', robe: true, hair: '#6a3a1a', longHair: true, skin: '#f0cfa8' },
  smith: { body: '#5a4a3a', legs: '#3a2e24', hair: '#2a1a10', skin: '#d8a880', belt: '#2a1a10', weapon: 'axe' },
  magic: { body: '#3a2a6a', robe: true, hood: '#2a1a4a', skin: '#f0d0b0', weapon: 'staff' },
  teleport: { body: '#3a5a7a', robe: true, hood: '#2a3a5a', skin: '#f0d0b0', weapon: 'staff' },
  quest: { body: '#8a8f99', legs: '#4a4e58', helm: '#9aa0aa', skin: '#e0b890', cape: '#7a1a1a', trim: '#d0b050', plate: true, weapon: 'sword', shield: true },
  clan: { body: '#6a2a2a', robe: true, hair: '#c8c0b0', skin: '#e8c8a0', trim: '#d0b050' },
  warehouse: { body: '#6a5a3a', legs: '#4a3a2a', hair: '#8a6a3a', skin: '#e8c49a', belt: '#3a2614' },
  jewel: { body: '#2a6a5a', robe: true, hair: '#e8d070', longHair: true, skin: '#f0d0b0' },
  pet: { body: '#4a6a3a', legs: '#3a3a2a', hair: '#c87a3a', longHair: true, skin: '#f0d0b0', belt: '#6a4a2a', cape: '#3a5a2a' },
  herald: { body: '#5a5a7a', legs: '#3a3a4a', helm: '#b8a040', skin: '#e0b890', cape: '#2a2a6a', trim: '#d0b050', weapon: 'spear' },
};

function populateOverworld(m) {
  const W = m.world;
  // 村莊 NPC 與守衛
  for (const t of W.towns) {
    const used = {};
    t.npcs.forEach((role, k) => {
      const sp = t.spots[k] || { x: t.x + 2, y: t.y + 2 };
      if (role === 'guard') {
        const g = new Actor({ x: sp.x, y: sp.y, kind: 'townguard', faction: 'townguard', name: '村莊守衛', level: 30, maxHp: 2000, ac: 20, mr: 50,
          dmg: [20, 35], atkSpd: 1.0, range: 1.5, aggro: true, aggroR: 9, speed: 3.4, look: { body: '#8a929c', sleeve: '#6a7480', legs: '#3a3e4a', helm: '#9aa0aa', cape: '#2a4a8a', plate: true, weapon: 'spear', skin: '#e0b890' } });
        g.leash = 12; m.actors.push(g); return;
      }
      const names = NPC_NAMES[role]; used[role] = (used[role] || 0) + 1;
      const nm = names[(W.towns.indexOf(t) + used[role] - 1) % names.length];
      m.npcs.push(new NPC(sp.x, sp.y, nm, NPC_TITLES[role], role, NPC_LOOKS[role], t.id));
    });
    // 村民（可招募）
    const n = t.id === 'dawn' ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const p = { x: t.x + rand(-5, 5), y: t.y + rand(-5, 5) };
      if (W.blocked(p.x, p.y)) continue;
      const cls = pick(FIGHTER_CLS);
      const v = new Actor({ x: p.x, y: p.y, kind: 'villager', faction: 'villager', name: pick(FIGHTER_NAMES), cls, level: randi(3, 25), look: Object.assign({}, pick(FIGHTER_LOOKS[cls])), speed: rand(2.2, 3), town: t });
      if (Math.random() < 0.35) { v.clan = pick(NPC_CLANS); v.emblem = clanEmblemFor(v.clan); }
      v.lineT = rand(10, 40); v.waitT = rand(0, 4);
      m.actors.push(v);
    }
    if (t.id === 'dawn' || t.id === 'port') {
      const d = new Actor({ x: t.x + 1, y: t.y + 2, kind: 'dog', faction: 'villager', name: t.id === 'dawn' ? '小黃' : '阿花', look: { color: t.id === 'dawn' ? '#b88a4a' : '#3a3632' }, speed: 2.6, town: t });
      d.lineT = rand(10, 40); d.waitT = 0; m.actors.push(d);
    }
  }
  // 灰岩城：傳令官、城門、守護塔
  const C = W.castle;
  m.npcs.push(new NPC(C.herald.x, C.herald.y, '奧德里奇', NPC_TITLES.herald, 'herald', NPC_LOOKS.herald, 'castle'));
  const gy = C.gate.reduce((s, g) => s + g.y, 0) / C.gate.length;
  m.gate = new Actor({ x: C.x0 + 0.5, y: gy + 0.5, kind: 'struct', faction: 'castle', struct: 'gate', name: '灰岩城門', maxHp: 3500, ac: 10, mr: 100, speed: 0 });
  m.gate.open = true;
  m.tower = new Actor({ x: C.tower.x, y: C.tower.y, kind: 'struct', faction: 'castle', struct: 'tower', name: '守護之塔', maxHp: 3000, ac: 8, mr: 100, speed: 0 });
  m.actors.push(m.gate, m.tower);
  // 怪物出生點
  const table = [
    { b: BIOME.MEADOW, type: 'wolf', dmin: 14, dmax: 40, n: 14, max: 2 },
    { b: BIOME.MEADOW, type: 'goblin', dmin: 25, dmax: 70, n: 8, max: 3 },
    { b: BIOME.MEADOW, type: 'goblin_archer', dmin: 30, dmax: 70, n: 5, max: 2 },
    { b: BIOME.PLAIN, type: 'goblin', dmin: 0, dmax: 999, n: 6, max: 3 },
    { b: BIOME.PLAIN, type: 'werewolf', dmin: 50, dmax: 999, n: 4, max: 2 },
    { b: BIOME.FOREST, type: 'spider', dmin: 0, dmax: 45, n: 10, max: 3 },
    { b: BIOME.FOREST, type: 'treant', dmin: 30, dmax: 999, n: 10, max: 2 },
    { b: BIOME.FOREST, type: 'werewolf', dmin: 50, dmax: 999, n: 8, max: 2 },
    { b: BIOME.BONE, type: 'skeleton', dmin: 0, dmax: 70, n: 12, max: 3 },
    { b: BIOME.BONE, type: 'skeleton_archer', dmin: 50, dmax: 999, n: 6, max: 2 },
    { b: BIOME.BONE, type: 'ghoul', dmin: 60, dmax: 999, n: 8, max: 2 },
    { b: BIOME.CANYON, type: 'lizardman', dmin: 0, dmax: 999, n: 16, max: 3 },
    { b: BIOME.HIGHLAND, type: 'golem', dmin: 0, dmax: 999, n: 10, max: 2 },
    { b: BIOME.HIGHLAND, type: 'werewolf', dmin: 0, dmax: 999, n: 5, max: 2 },
    { b: BIOME.DESERT, type: 'scorpion', dmin: 0, dmax: 85, n: 12, max: 3 },
    { b: BIOME.DESERT, type: 'mummy', dmin: 70, dmax: 999, n: 8, max: 2 },
    { b: BIOME.DESERT, type: 'sandworm', dmin: 85, dmax: 999, n: 6, max: 1 },
  ];
  for (const s of table)
    for (let i = 0; i < s.n; i++) {
      const p = W.randomFreeTile((x, y) => {
        if (W.biomeAt(x, y) !== s.b) return false;
        const d = dist(x, y, 100, 100);
        if (d < s.dmin || d > s.dmax) return false;
        if (dist(x, y, W.nest.x, W.nest.y) < 12 || dist(x, y, C.cx, C.cy) < 18) return false;
        for (const t of W.towns) if (dist(x, y, t.x, t.y) < t.r + 6) return false;
        return true;
      });
      if (p) m.spawners.push({ type: s.type, x: p.x + 0.5, y: p.y + 0.5, max: s.max, alive: 0, timer: 0, respawn: 30 });
    }
  m.spawners.push({ type: 'wyvern', x: W.nest.x + 0.5, y: W.nest.y + 0.5, max: 1, alive: 0, timer: 0, respawn: MONSTERS.wyvern.respawn });
  for (const sp of m.spawners) for (let i = 0; i < sp.max; i++) spawnFrom(m, sp);
  m.fighterT = 0;
  for (let i = 0; i < 20; i++) spawnFighter(m, false);
  for (let i = 0; i < 5; i++) spawnFighter(m, true);
}
function populateCrypt(m) {
  const W = m.world;
  const groups = [['skeleton', 0, 35, 10, 3], ['skeleton_archer', 15, 60, 7, 2], ['ghoul', 20, 70, 6, 2], ['ghost', 30, 999, 7, 2], ['mummy', 45, 999, 5, 2]];
  for (const [type, dmin, dmax, n, max] of groups)
    for (let i = 0; i < n; i++) {
      const p = W.randomFreeTile((x, y) => { const d = dist(x, y, W.entry.x, W.entry.y); return d > Math.max(dmin, 8) && d < dmax && dist(x, y, W.bossRoom.x, W.bossRoom.y) > 8; });
      if (p) m.spawners.push({ type, x: p.x + 0.5, y: p.y + 0.5, max, alive: 0, timer: 0, respawn: 35 });
    }
  m.spawners.push({ type: 'lich', x: W.bossRoom.x + 0.5, y: W.bossRoom.y + 0.5, max: 1, alive: 0, timer: 0, respawn: MONSTERS.lich.respawn });
  for (const sp of m.spawners) for (let i = 0; i < sp.max; i++) spawnFrom(m, sp);
}
function spawnFrom(m, sp) {
  const W = m.world;
  for (let t = 0; t < 20; t++) {
    const x = Math.floor(sp.x + rand(-3, 3)), y = Math.floor(sp.y + rand(-3, 3));
    if (W.blocked(x, y) || W.isSafe(x, y) || !W.reach[W.idx(x, y)]) continue;
    const a = makeMonster(sp.type, x + 0.5, y + 0.5, sp);
    m.actors.push(a); sp.alive++;
    return a;
  }
  return null;
}
const FIELD_LEVELS = { [BIOME.MEADOW]: [2, 8], [BIOME.PLAIN]: [6, 16], [BIOME.FOREST]: [5, 16], [BIOME.BONE]: [8, 20], [BIOME.CANYON]: [12, 25], [BIOME.HIGHLAND]: [14, 26], [BIOME.DESERT]: [12, 26] };
function spawnFighter(m, evil) {
  const W = m.world;
  const p = W.randomFreeTile((x, y) => {
    const b = W.biomeAt(x, y);
    if (!FIELD_LEVELS[b]) return false;
    if (evil && (b === BIOME.MEADOW || dist(x, y, 100, 100) < 40)) return false;
    for (const t of W.towns) if (dist(x, y, t.x, t.y) < t.r + 4) return false;
    if (G.player && dist(x, y, G.player.x, G.player.y) < 15) return false;
    return true;
  });
  if (!p) return;
  const [a, b] = FIELD_LEVELS[W.biomeAt(p.x, p.y)];
  const f = makeFighter(p.x + 0.5, p.y + 0.5, randi(a, b) + (evil ? 3 : 0), evil);
  m.actors.push(f);
}

// ---------- 新角色 / 讀檔 ----------
function newCharacterData(name, cls, stats) {
  const c = CLASSES[cls];
  const p = new Player({ name, cls, stats });
  p.baseMaxHp = c.hp + Math.max(0, statMod(stats.con)) * 2;
  p.baseMaxMp = c.mp + Math.max(0, statMod(stats.wis)) * 2;
  p.hp = p.baseMaxHp; p.mp = p.baseMaxMp;
  for (const [id, qty, eq] of c.start) {
    const inst = mkItem(id, qty);
    if (eq) p.equip[ITEMS[id].type === 'weapon' ? 'weapon' : ITEMS[id].slot] = inst; else p.inv.push(inst);
  }
  p.spells = c.spells.slice();
  p.hotbar = defaultHotbar(cls);
  return serializePlayer(p);
}
function defaultHotbar(cls) {
  const it = (id) => ({ kind: 'item', id }), sp = (id) => ({ kind: 'spell', id });
  const bars = {
    knight: [it('red_potion'), it('orange_potion'), it('haste_potion'), sp('powerstrike'), sp('shield'), sp('glow'), sp('heal1'), it('return_scroll'), it('teleport_scroll'), { kind: 'auto' }],
    mage: [it('red_potion'), it('blue_potion'), sp('lightbolt'), sp('heal1'), sp('shield'), sp('icebolt'), sp('lightning'), sp('fireball'), it('return_scroll'), { kind: 'auto' }],
    ranger: [it('red_potion'), it('orange_potion'), it('haste_potion'), sp('heal1'), sp('shield'), sp('windshot'), sp('earthskin'), it('return_scroll'), it('teleport_scroll'), { kind: 'auto' }],
    cleric: [it('red_potion'), it('blue_potion'), sp('heal1'), sp('shield'), sp('lightbolt'), sp('holy'), sp('heal2'), sp('turnundead'), it('return_scroll'), { kind: 'auto' }],
  };
  return bars[cls];
}
function serializePlayer(p) {
  // 同步場上寵物的體力到項圈
  if (G.player === p && G.map) for (const a of companions('pet')) { a.pet.hp = Math.ceil(a.hp); a.pet.out = true; }
  return {
    v: 2, name: p.name, cls: p.cls, level: p.level, exp: p.exp, base: p.base, statPoints: p.statPoints,
    baseMaxHp: p.baseMaxHp, baseMaxMp: p.baseMaxMp, hp: Math.ceil(p.hp), mp: Math.floor(p.mp), gold: p.gold, align: p.align,
    inv: p.inv, wh: p.wh, equip: p.equip, spells: p.spells, hotbar: p.hotbar, quest: p.quest, kills: p.kills, pkCount: p.pkCount, petMode: p.petMode,
    clan: p.clan, castle: p.castle, homeTown: p.homeTown, mapId: p.mapId, x: p.x, y: p.y, day: G.day, created: p.created, playTime: p.playTime || 0,
  };
}
function loadPlayer(d) {
  const p = new Player({ name: d.name, cls: d.cls, stats: d.base });
  for (const k of ['level', 'exp', 'statPoints', 'baseMaxHp', 'baseMaxMp', 'hp', 'mp', 'gold', 'align', 'inv', 'wh', 'spells', 'hotbar', 'quest', 'kills', 'pkCount', 'petMode', 'clan', 'castle', 'homeTown', 'mapId', 'created', 'playTime'])
    if (d[k] !== undefined) p[k] = d[k];
  for (const s of SLOTS) p.equip[s] = (d.equip && d.equip[s]) || null;
  for (const i of p.inv) i.uid = G.uid++;
  if (!p.hotbar || p.hotbar.length < 10) p.hotbar = defaultHotbar(p.cls);
  return p;
}
function saveGame(silent) {
  const p = G.player; if (!p || !Net.session) return;
  const r = Net.chars.save(Net.session, serializePlayer(p));
  if (!silent) log(r.ok ? '遊戲已儲存。' : '儲存失敗。', r.ok ? 'sys' : 'warn');
}

function mkItem(id, qty = 1, ench = 0) { return { uid: G.uid++, id, qty, ench }; }
function canCarry(id, qty) { const p = G.player; return p.d.weight + (ITEMS[id].w || 0) * qty <= p.d.weightMax; }
function addItem(id, qty = 1, ench = 0, force) {
  const p = G.player, def = ITEMS[id];
  if (id === 'gold') { p.gold += qty; UI.refresh(); return true; }
  if (!force && !canCarry(id, qty)) { log('太重了，無法再拿更多東西。', 'warn'); SFX.play('error'); return false; }
  if (def.stack) {
    const ex = p.inv.find((i) => i.id === id);
    if (ex) { ex.qty += qty; recalc(); UI.refresh(); return true; }
  }
  if (p.inv.length >= 48) { log('背包已滿。', 'warn'); return false; }
  if (def.stack) p.inv.push(mkItem(id, qty, ench));
  else for (let i = 0; i < qty; i++) p.inv.push(mkItem(id, 1, ench));
  recalc(); UI.refresh();
  return true;
}
function countItem(id) { const it = G.player.inv.find((i) => i.id === id); return it ? it.qty : 0; }
function removeItem(inst, qty = 1) {
  const p = G.player;
  inst.qty -= qty;
  if (inst.qty <= 0) { const k = p.inv.indexOf(inst); if (k >= 0) p.inv.splice(k, 1); }
  recalc(); UI.refresh();
}
function itemName(inst) {
  const d = ITEMS[inst.id];
  return (inst.ench ? '+' + inst.ench + ' ' : '') + d.name + (d.stack && inst.qty > 1 ? ' (' + inst.qty + ')' : '');
}

// ---------- 訊息與特效 ----------
function log(text, cls = '') { UI.log(text, cls); }
function floatText(x, y, text, color, z = 50, size = 15) { G.texts.push({ x, y, z, text, color, t: 0, size }); }
function burst(x, y, z, color, n = 10, spd = 2, life = 0.6, size = 2.5, up = 2) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * spd;
    G.particles.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(0, up) * 30, life, max: life, color, size });
  }
}
function later(t, fn) { G.timers.push({ t, fn }); }
function shake(n) { G.shake = Math.max(G.shake || 0, n); }
function inSafe(e) { return G.world.isSafe(e.x, e.y); }
function zOf(e) { return e === G.player ? 26 : e.boss ? 60 : e.struct === 'tower' ? 50 : e.struct === 'gate' ? 30 : 24; }

// ---------- 敵我判斷 ----------
function siegeHostile() { const s = G.siege; return !!(s && s.active && !ownsCastle()); }
function ownsCastle() { const p = G.player; return !!(p && p.castle && p.castle.owned); }
function combatant(e) { return e && !e.dead && (e === G.player || (e.kind !== 'villager' && e.kind !== 'dog')); }
// a 會不會主動攻擊 b
function isHostile(a, b) {
  if (!combatant(b) || a === b || a.dead) return false;
  const pl = G.player;
  if (b === pl && pl.dead) return false;
  const bSafe = inSafe(b);
  const bf = b === pl ? 'player' : b.faction;
  if (a.grudge && a.grudge.has(b.id) && !bSafe) return true;
  switch (a.faction) {
    case 'monster': return !bSafe && (bf === 'player' || bf === 'fighter' || bf === 'ally' || bf === 'pker');
    case 'fighter': return !bSafe && (bf === 'monster' || bf === 'pker' || (bf === 'player' && pl.pinkT > 0 && a.grudge.has(pl.id)));
    case 'pker': return !bSafe && (bf === 'player' || bf === 'fighter' || bf === 'ally' || (a.raider && b.struct === 'tower' && ownsCastle()));
    case 'ally': return !bSafe && (bf === 'monster' || bf === 'pker' || (bf === 'castle' && siegeHostile() && !(b.struct === 'gate' && b.open)));
    case 'townguard': return bf === 'pker' || (bf === 'player' && pl.align < 0 && G.t > (pl.guardSafeT || 0));
    case 'castle':
      if (b.struct) return false;
      if (bf === 'pker') return true;
      return siegeHostile() && (bf === 'player' || bf === 'ally');
  }
  return false;
}
// 玩家點擊能否攻擊（force=強制攻擊）
function playerCanAttack(e, force) {
  if (!combatant(e) || e === G.player) return false;
  if (inSafe(e) || inSafe(G.player)) return false;
  switch (e.faction) {
    case 'monster': case 'pker': return true;
    case 'fighter': return force || e.align < 0 || e.grudge.has(G.player.id);
    case 'castle': return siegeHostile() && !(e.struct === 'gate' && (e.open || e.broken));
  }
  return false;
}

// ---------- 傷害 ----------
function dealDamage(src, tgt, dmg, opt = {}) {
  if (tgt.dead || dmg <= 0) return;
  const pl = G.player;
  if (tgt === pl && pl.god) { floatText(pl.x, pl.y, '0', '#ffb040', 60, 13); return; }
  if (tgt === pl && src && src.kind === 'townguard') {
    if (G.t <= (pl.guardSafeT || 0)) return;
    pl.guardSafeT = G.t + GUARD_COOLDOWN;
    for (const a of G.map.actors) if (a.kind === 'townguard' && a.target === pl) { a.target = null; a.state = 'return'; }
    later(0.3, () => log('守衛：這次只是警告，邪惡之人！別在村裡惹事。', 'npc'));
  }
  if (tgt !== pl && tgt.kind === 'struct' && !siegeHostile() && !(src.raider)) return;
  tgt.hp -= dmg; tgt.hurtT = 0.2;
  const big = tgt.boss || tgt.struct;
  floatText(tgt.x, tgt.y, String(dmg), tgt === pl ? '#ff5050' : opt.crit ? '#ffd040' : opt.magic ? '#a8d8ff' : '#ffffff', big ? 100 : 60, opt.crit ? 20 : 15);
  if (tgt === pl) { SFX.play('hurt'); burst(pl.x, pl.y, 26, '#c01818', 6, 2, 0.4); if (dmg > pl.maxHp * 0.2) shake(4); }
  else {
    SFX.play(opt.crit ? 'crit' : 'hit', tgt.x, tgt.y);
    burst(tgt.x, tgt.y, zOf(tgt), tgt.undead && !tgt.sprite.includes('ghost') ? '#eee8d0' : tgt.struct ? '#b0a090' : tgt.sprite === 'treant' ? '#7a5a2a' : tgt.sprite === 'golem' ? '#8a847a' : '#c02020', 7, 2.5, 0.45);
  }
  if (src) {
    if (tgt !== pl) {
      if (src === pl) tgt.hitByPlayer = true;
      tgt.grudge.add(src.id, tgt.faction === 'fighter' && src === pl ? FIGHTER_GRUDGE : 60);
      if (!tgt.target || tgt.target.dead || (tgt.state !== 'chase' && !tgt.struct)) { tgt.target = src; tgt.state = 'chase'; tgt.thinkT = 0; }
      if (tgt.boss && !tgt.roared) { tgt.roared = true; SFX.play('roar', tgt.x, tgt.y); }
      // 被攻擊的冒險者會呼叫附近的同伴
      if (tgt.faction === 'fighter' && src === pl) {
        if (tgt.align >= 0 && pl.pinkT <= 0 && !tgt.grudge.has('pk' + pl.id)) { log('你攻擊了無辜的冒險者，名字變成了紫色！', 'warn'); }
        if (tgt.align >= 0) pl.pinkT = PINK_TIME;
        for (const o of G.map.actors) if (o.faction === 'fighter' && !o.dead && dist(o.x, o.y, tgt.x, tgt.y) < 7) { o.grudge.add(pl.id, FIGHTER_GRUDGE); if (!o.target) { o.target = pl; o.state = 'chase'; } }
      }
    } else {
      // 玩家被打：沒有行動時自動反擊
      if (!pl.action && !pl.dead && src !== pl && playerCanAttack(src, src.faction === 'fighter')) setAction({ type: 'attack', target: src });
    }
  }
  if (tgt.hp <= 0) {
    tgt.hp = 0;
    if (tgt === pl) playerDie(src);
    else killActor(tgt, src);
  }
  if (tgt === pl || src === pl) UI.refresh();
}

function physHit(att, tgt, mul = 1, extra = {}) {
  const pl = G.player;
  const aLvl = att === pl ? pl.level : att.level, tLvl = tgt === pl ? pl.level : tgt.level;
  const tAc = tgt === pl ? pl.d.ac : tgt.ac;
  const tEr = tgt === pl ? pl.d.er : tgt.er || 0;
  let hitB = extra.hit || 0;
  let chance = clamp(0.78 + (aLvl - tLvl) * 0.035 - tAc * 0.01 - (extra.ranged ? 0 : tEr * 0.01) + hitB, 0.15, 0.97);
  if (Math.random() > chance) { floatText(tgt.x, tgt.y, 'MISS', '#b8c0d0', 60, 13); SFX.play('miss'); return; }
  let dmg = (extra.base !== undefined ? extra.base : randi(att.dmg[0], att.dmg[1]));
  dmg = Math.round(dmg * mul);
  dmg -= tgt === pl ? Math.floor(tAc / 2) : Math.floor(tAc / 3);
  const crit = Math.random() < (extra.crit || 0.05);
  if (crit) dmg = Math.floor(dmg * 1.8);
  dealDamage(att, tgt, Math.max(1, dmg), { crit });
}
function magicHit(att, tgt, base, opt = {}) {
  const mr = tgt === G.player ? G.player.d.mr : tgt.mr || 0;
  let dmg = Math.round(base * (1 - clamp(mr, 0, 90) / 150));
  if (opt.element && tgt === G.player) dmg = Math.round(dmg * (1 - clamp(G.player.d.res[opt.element] || 0, 0, 80) / 100));
  dealDamage(att, tgt, Math.max(1, dmg), { magic: true });
}

function killActor(a, src) {
  const pl = G.player, m = G.map;
  a.dead = true; a.deadT = 0; a.moving = false; a.target = null;
  if (a.struct) { onStructDestroyed(a, src); return; }
  SFX.play(a.sprite === 'skeleton' ? 'bonebreak' : a.boss ? 'boom' : 'die', a.x, a.y);
  if (a.companion) { onCompanionDeath(a); UI.refresh(); return; }
  if (a.spawner) { a.spawner.alive--; a.spawner.timer = a.spawner.respawn * rand(0.8, 1.3); }
  const byComp = src && src.companion;
  const byPlayer = src === pl || (src && src.faction === 'ally') || a.hitByPlayer;
  if (a.kind === 'monster') {
    const d = a.def;
    if (byPlayer && !pl.dead) {
      const lvDiff = d.lvl - pl.level;
      const full = Math.max(1, Math.floor(d.exp * clamp(1 + lvDiff * 0.06, 0.25, 1.6)));
      // 夥伴擊殺：經驗值一半給主人、一半給夥伴自己
      if (byComp) { gainExp(Math.max(1, Math.floor(full / 2))); if (src.pet) petGainExp(src, Math.floor(full / 2)); }
      else gainExp(src === pl || a.hitByPlayer ? full : Math.floor(full / 2));
      if (pl.align < 32767) pl.align = Math.min(32767, pl.align + Math.max(1, d.lvl) * (pl.align < 0 ? 4 : 1));
      pl.kills++;
      const q = pl.quest, Q = QUESTS[q.idx];
      if (q.active && Q && Q.target === a.type) {
        q.count++;
        if (q.count <= Q.count) log('【委託】' + MONSTERS[Q.target].name + ' ' + q.count + '/' + Q.count, 'quest');
        if (q.count === Q.count) log('【委託】目標已完成，回晨風村找雷恩回報吧！', 'quest');
      }
    }
    dropItem(a.x, a.y, 'gold', randi(d.gold[0], d.gold[1]));
    for (const [id, ch, n] of d.loot) if (Math.random() < ch) dropItem(a.x + rand(-0.7, 0.7), a.y + rand(-0.7, 0.7), id, n || 1);
    if (d.boss) { log('★ ' + (byPlayer ? pl.name : '有人') + ' 擊敗了 ' + a.name + '！', 'loot'); shake(10); }
    if (d.captain) log('守城隊長倒下了！', 'level');
  } else if (a.kind === 'fighter' || a.kind === 'pker') {
    dropItem(a.x, a.y, 'gold', randi(10, 30) * a.level);
    if (Math.random() < 0.5) dropItem(a.x + rand(-0.5, 0.5), a.y + rand(-0.5, 0.5), pick(['red_potion', 'orange_potion', 'blue_potion', 'arrow']), randi(2, 8));
    if (a.kind === 'pker' && Math.random() < 0.35) dropItem(a.x, a.y + 0.4, pick(['ew_scroll', 'ea_scroll', 'studded', 'iron_helm', 'ring_guard', 'shadow_cloak']), 1);
    if (src === pl) {
      gainExp(a.level * 12);
      if (a.align < 0 || a.kind === 'pker') {
        pl.align = Math.min(32767, pl.align + 600);
        log('你擊敗了邪惡的 ' + a.name + '，正義值上升了！', 'level');
      } else if (a.grudge.has(pl.id) && pl.pinkT > 0) {
        pl.align = Math.max(-32768, (pl.align > 0 ? 0 : pl.align) - 1500);
        pl.pkCount++;
        log('你殺死了 ' + a.name + '！你成為了邪惡之人（善惡值 ' + pl.align + '），村莊守衛不會放過你。', 'warn');
      }
    }
    if (src && src.kind === 'pker') log(a.name + ' 被 ' + src.name + ' 殺死了！', 'warn');
  } else if (a.kind === 'ally') {
    log('盟友 ' + a.name + ' 倒下了。', 'warn');
  }
  UI.refresh();
}

function dropItem(x, y, id, qty) {
  const W = G.world;
  let fx = x, fy = y;
  if (W.blocked(fx, fy)) { const p = W.nearestFree(x, y); fx = p.x; fy = p.y; }
  G.map.items.push({ x: fx, y: fy, id, qty, t: 0, ench: 0 });
}
function pickup(it) {
  const items = G.map.items, k = items.indexOf(it); if (k < 0) return;
  if (addItem(it.id, it.qty, it.ench)) {
    items.splice(k, 1);
    SFX.play(it.id === 'gold' ? 'coin' : 'pickup');
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
    const c = CLASSES[p.cls], st = p.d.st || p.base;
    const hpG = randi(c.hpDie[0], c.hpDie[1]) + Math.max(0, statMod(st.con));
    const mpG = randi(c.mpDie[0], c.mpDie[1]) + Math.max(0, statMod(st.wis));
    p.baseMaxHp += hpG; p.baseMaxMp += mpG;
    recalc(); p.hp = p.maxHp; p.mp = p.maxMp;
    log('等級提升！你現在是 ' + p.level + ' 級。(體力 +' + hpG + '，魔力 +' + mpG + ')', 'level');
    if (p.level % 5 === 0) { p.statPoints++; log('獲得 1 點能力值點數，請在角色資訊中分配。', 'level'); }
    for (const s in SPELLS) if (SPELLS[s].learn[p.cls] === p.level && !p.spells.includes(s)) log('你現在可以學習「' + SPELLS[s].name + '」了，去魔法商人那裡購買魔法書吧。', 'level');
    G.levelFx = { t: 0 };
    SFX.play('levelup');
    burst(p.x, p.y, 20, '#ffe080', 30, 3, 1.2, 3, 4);
    saveGame(true);
  }
  UI.refresh();
}

function playerDie(src) {
  const p = G.player;
  p.dead = true; p.action = null; p.path = []; p.moving = false; G.targeting = null;
  const lose = Math.floor(expForLevel(p.level) * 0.05);
  p.exp = Math.max(0, p.exp - lose);
  log('你被 ' + (src ? src.name : '未知的力量') + ' 殺死了。失去了 ' + lose + ' 點經驗值。', 'warn');
  // 邪惡之人死亡會掉落物品
  if (p.align < 0) {
    const n = 1 + (p.align < -10000 ? 2 : p.align < -3000 ? 1 : 0);
    for (let i = 0; i < n && p.inv.length; i++) {
      const inst = pick(p.inv); const q = inst.qty;
      p.inv.splice(p.inv.indexOf(inst), 1);
      G.map.items.push({ x: p.x + rand(-0.5, 0.5), y: p.y + rand(-0.5, 0.5), id: inst.id, qty: q, ench: inst.ench || 0, t: 0 });
      log('你掉落了 ' + itemName(Object.assign({}, inst, { qty: q })) + '！', 'warn');
    }
    if (Math.random() < 0.15) {
      const slots = SLOTS.filter((s) => p.equip[s]);
      if (slots.length) { const s = pick(slots), inst = p.equip[s]; p.equip[s] = null; G.map.items.push({ x: p.x, y: p.y + 0.4, id: inst.id, qty: 1, ench: inst.ench || 0, t: 0 }); log('你身上的 ' + itemName(inst) + ' 掉落了！', 'warn'); }
    }
    recalc();
  }
  G.autoHunt = false;
  SFX.play('death');
  UI.showDeath();
}
function respawn() {
  const p = G.player;
  p.dead = false; p.buffs = {}; p.pinkT = 0;
  recalc();
  p.hp = Math.ceil(p.maxHp * 0.5); p.mp = Math.ceil(p.maxMp * 0.5);
  goHome();
  UI.refresh();
}
function goHome() {
  const t = getMap('overworld').world.towns.find((t) => t.id === G.player.homeTown) || getMap('overworld').world.towns[0];
  if (G.map.id !== 'overworld') changeMap('overworld', t.x, t.y + 2);
  else teleportTo(t.x + rand(-1, 1), t.y + 2);
}
function teleportTo(x, y) {
  const p = G.player;
  SFX.play('teleport');
  burst(p.x, p.y, 20, '#9fd0ff', 24, 2, 0.8, 3, 4);
  const pos = G.world.nearestFree(x, y);
  p.x = pos.x; p.y = pos.y; p.path = []; p.action = null;
  for (const a of G.map.actors) if (a.target === p) { a.target = null; a.state = 'return'; a.thinkT = 0; }
  burst(p.x, p.y, 20, '#9fd0ff', 24, 2, 0.8, 3, 4);
  bringCompanions(null, G.map);
  G.cam.x = toScreen(p.x, p.y).x; G.cam.y = toScreen(p.x, p.y).y - 20;
}

// ---------- 玩家行為 ----------
function setAction(a) {
  const p = G.player;
  if (p.dead) return;
  p.action = a; p.repathT = 0;
  if (a.type === 'move') {
    const path = Path.find(G.world, p.x, p.y, a.x, a.y, 8000);
    p.path = path || [];
    if (path && path.length && !G.world.blocked(a.x, a.y)) path[path.length - 1] = { x: a.x, y: a.y };
    G.clickFx = { x: a.x, y: a.y, t: 0 };
  }
}
function attackRange(p = G.player) { return p.weaponDef.range || 1.3; }
const SPELL_RANGE = 7;

function updatePlayer(dt) {
  const p = G.player;
  if (p.dead) return;
  p.atkCd -= dt; if (p.atkAnim >= 0) { p.atkAnim += dt / p.atkDur; if (p.atkAnim >= 1) p.atkAnim = -1; }
  if (p.pinkT > 0) { p.pinkT -= dt; if (p.pinkT <= 0) log('你的紫名狀態解除了。', 'sys'); }
  p.playTime = (p.playTime || 0) + dt;
  // 回復（負重 50% 以上不會自然回復）
  p.regenT += dt;
  if (p.regenT >= 3) {
    p.regenT = 0;
    const wp = weightPct(p);
    if (wp < 50) {
      const safe = inSafe(p);
      const con = statMod(p.d.st.con), wis = statMod(p.d.st.wis);
      p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.floor(p.maxHp * (safe ? 0.06 : 0.02)) + Math.max(0, con)));
      p.mp = Math.min(p.maxMp, p.mp + Math.max(1, Math.floor(p.maxMp * (safe ? 0.08 : 0.03)) + Math.max(0, wis)));
    } else if (!p.weightWarned) { p.weightWarned = true; log('負重超過 50%，體力與魔力不會自然恢復。', 'warn'); }
    if (wp < 50) p.weightWarned = false;
  }
  if (p.buffs.sanctuary) { p.sancT = (p.sancT || 0) + dt; if (p.sancT >= 1) { p.sancT = 0; const h = 5 + p.d.sp; p.hp = Math.min(p.maxHp, p.hp + h); } }
  let changed = false;
  for (const k in p.buffs) {
    p.buffs[k] -= dt;
    if (p.buffs[k] <= 0) {
      delete p.buffs[k]; changed = true;
      const msg = { haste: '你的動作恢復正常速度。', holy: '武器上神聖的氣息消失了。', shield: '防護術的效果消失了。', glow: '身邊的光芒消失了。', might: '力量祝福的效果消失了。', warcry: '戰吼的效果消失了。', earthskin: '大地之膚的效果消失了。', blessarmor: '祝福鎧甲的效果消失了。', sanctuary: '神聖光環消失了。' }[k];
      if (msg) log(msg, 'sys');
    }
  }
  if (changed) { recalc(); UI.refresh(); }
  const wp = weightPct(p);
  const mul = p.haste * (wp >= 100 ? 0.5 : wp >= 80 ? 0.8 : 1) * (p.gmSpeed || 1);
  const a = p.action;
  if (!a) { p.moveAlong(dt, mul); return; }
  if (a.type === 'move') { if (p.moveAlong(dt, mul)) p.action = null; return; }
  let tx, ty, range;
  if (a.type === 'attack' || a.type === 'cast') {
    const t = a.target;
    if (!t || t.dead || (t !== p && !G.map.actors.includes(t))) { p.action = null; p.moving = false; if (G.autoHunt) autoNext(); return; }
    if (a.type === 'attack' && !playerCanAttack(t, a.force)) { p.action = null; return; }
    tx = t.x; ty = t.y;
    const big = t.boss ? 0.8 : t.struct === 'gate' ? 1.4 : t.struct ? 0.6 : 0;
    range = a.type === 'attack' ? attackRange() + big : (SPELLS[a.spell].melee ? attackRange() + big : SPELL_RANGE + big);
  } else if (a.type === 'pickup') {
    if (!G.map.items.includes(a.item)) { p.action = null; return; }
    tx = a.item.x; ty = a.item.y; range = 0.9;
  } else if (a.type === 'talk') { tx = a.npc.x; ty = a.npc.y; range = 1.9; }
  else if (a.type === 'portal') { tx = a.portal.x; ty = a.portal.y; range = 1.6; }
  const d = dist(p.x, p.y, tx, ty);
  if (d <= range) {
    p.path = []; p.moving = false;
    if (a.type === 'attack') { p.face(tx, ty); if (p.atkCd <= 0) playerStrike(a.target, a.strikeMul || 1); }
    else if (a.type === 'cast') { p.action = null; doCast(a.spell, a.target); }
    else if (a.type === 'pickup') { pickup(a.item); p.action = null; }
    else if (a.type === 'talk') { p.face(tx, ty); if (a.npc.face) a.npc.face(p.x, p.y); UI.openNPC(a.npc); p.action = null; }
    else if (a.type === 'portal') { p.action = null; usePortal(a.portal); }
    return;
  }
  p.repathT -= dt;
  if (p.repathT <= 0 || !p.path.length) {
    p.repathT = 0.35;
    p.path = Path.find(G.world, p.x, p.y, tx, ty, 3000) || [];
  }
  p.moveAlong(dt, mul);
}
function usePortal(pt) {
  if (pt.to === 'crypt') { const w = getMap('crypt').world; changeMap('crypt', w.entry.x + 1, w.entry.y); }
  else { const w = getMap('overworld').world; changeMap('overworld', w.crypt.x + 0.5, w.crypt.y - 2); }
}

// 自動拾取：走過的物品直接撿起；閒置時自動走去撿附近的物品
function autoPickup(dt) {
  const p = G.player, items = G.map.items;
  G.pickFail = G.pickFail || new WeakSet();
  const ok = (it) => !G.pickFail.has(it) && (it.id === 'gold' || canCarry(it.id, it.qty));
  for (const it of items.slice()) {
    if (dist(p.x, p.y, it.x, it.y) < 0.9) { if (ok(it)) pickup(it); else G.pickFail.add(it); }
  }
  const fighting = G.map.actors.some((a) => !a.dead && a.target === p && dist(a.x, a.y, p.x, p.y) < 4);
  if (!p.action && !p.moving && !fighting) {
    G.idleT = (G.idleT || 0) + dt;
    if (G.idleT > 0.35) {
      G.idleT = 0;
      let best = null, bd = 5.5;
      for (const it of items) { const d = dist(p.x, p.y, it.x, it.y); if (d < bd && ok(it)) { bd = d; best = it; } }
      if (best) setAction({ type: 'pickup', item: best });
    }
  } else G.idleT = 0;
}
function autoNext() {
  const p = G.player;
  let best = null, bd = 9;
  for (const a of G.map.actors) {
    if (a.dead || (a.faction !== 'monster' && a.faction !== 'pker') || inSafe(a)) continue;
    const d = dist(p.x, p.y, a.x, a.y);
    if (d < bd) { bd = d; best = a; }
  }
  if (best) setAction({ type: 'attack', target: best });
}

function pickArrow(target) {
  const p = G.player;
  const silver = p.inv.find((i) => i.id === 'silver_arrow'), normal = p.inv.find((i) => i.id === 'arrow');
  if (target && target.undead && silver) return silver;
  return normal || silver || null;
}
function playerStrike(t, mul = 1) {
  const p = G.player, w = p.weaponDef;
  let arrow = null;
  if (w.ranged) {
    arrow = pickArrow(t);
    if (!arrow) { log('沒有箭了！', 'warn'); SFX.play('error'); p.action = null; return; }
  }
  p.atkCd = w.spd / p.haste;
  p.atkDur = Math.min(0.42, p.atkCd * 0.8);
  p.atkAnim = 0;
  const st = p.d.st;
  const ench = p.equip.weapon ? p.equip.weapon.ench || 0 : 0;
  const strikeMul = p.nextStrike ? 2 : mul; p.nextStrike = false;
  const roll = (extraMul = 1) => {
    if (t.dead) return;
    const statB = w.ranged ? Math.floor(statMod(st.dex) * 0.8) : statMod(st.str);
    let base = randi(w.dmg[0], w.dmg[1]) + p.d.dmgB + Math.floor(p.level / 4) + Math.max(-2, statB) + (p.buffs.holy ? 2 : 0) + (p.buffs.might ? 3 : 0);
    if (t.undead) base += (w.undeadB || 0) + (p.buffs.holy ? 3 : 0);
    if (arrow) { const ad = ITEMS[arrow.id]; base += ad.dmgB || 0; if (t.undead) base += ad.undeadB || 0; }
    const hitB = (p.d.hit + (w.ranged ? statMod(st.dex) : statMod(st.str)) + (p.buffs.holy ? 2 : 0) + ench * 0.5) * 0.02;
    physHit(p, t, strikeMul * extraMul, { base, hit: hitB, ranged: w.ranged, crit: 0.05 + Math.max(0, statMod(st.dex)) * 0.01 });
  };
  if (w.ranged) {
    removeItem(arrow, 1);
    SFX.play('bow');
    later(p.atkDur * 0.55, () => G.projectiles.push({ kind: 'arrow', x: p.x, y: p.y, z: 26, target: t, speed: 14, onHit: () => roll(), holy: !!p.buffs.holy }));
  } else {
    SFX.play('swing');
    later(p.atkDur * 0.5, () => roll());
  }
}

// ---------- 使用道具 ----------
function canEquip(it) {
  const p = G.player;
  if (it.cls && !it.cls.includes(p.cls)) return CLASSES[p.cls].name + '無法使用這個裝備。';
  if (it.lvl && p.level < it.lvl) return '需要等級 ' + it.lvl + '。';
  return null;
}
function useItem(inst) {
  const p = G.player; if (p.dead) return;
  const d = ITEMS[inst.id];
  if (d.type === 'weapon' || d.type === 'armor' || d.type === 'acc') { equipItem(inst); return; }
  if (d.type === 'collar') { useCollar(inst); return; }
  if (inst.id === 'tame_jerky') { G.targeting = 'tame'; log('請點擊要馴服的野狼（體力需低於一半）。Esc 取消', 'sys'); return; }
  if (d.type === 'book') {
    const s = SPELLS[d.spell], need = s.learn[p.cls];
    if (p.spells.includes(d.spell)) { log('你已經學會「' + s.name + '」了。', 'sys'); return; }
    if (need === undefined) { log(CLASSES[p.cls].name + '無法學習「' + s.name + '」。', 'warn'); SFX.play('error'); return; }
    if (p.level < need) { log('「' + s.name + '」需要等級 ' + need + ' 才能學習。', 'warn'); SFX.play('error'); return; }
    p.spells.push(d.spell); removeItem(inst, 1);
    log('你學會了魔法「' + s.name + '」！', 'level'); SFX.play('enchantOk');
    UI.refresh(); return;
  }
  if (d.type !== 'consume') { log(d.name + (d.desc ? '：' + d.desc : '：可以賣給商人。'), 'sys'); return; }
  const heal = (n, col) => {
    if (p.hp >= p.maxHp) { log('體力已經全滿了。', 'sys'); return false; }
    p.hp = Math.min(p.maxHp, p.hp + n); SFX.play('potion');
    floatText(p.x, p.y, '+' + n, '#60ff80', 60); burst(p.x, p.y, 20, col, 10, 1, 0.6, 2, 3);
    return true;
  };
  switch (inst.id) {
    case 'red_potion': if (!heal(30, '#ff6060')) return; break;
    case 'orange_potion': if (!heal(70, '#ffa040')) return; break;
    case 'clear_potion': if (!heal(150, '#ffffff')) return; break;
    case 'blue_potion':
      if (p.mp >= p.maxMp) { log('魔力已經全滿了。', 'sys'); return; }
      p.mp = Math.min(p.maxMp, p.mp + 30); SFX.play('potion'); burst(p.x, p.y, 20, '#6090ff', 10, 1, 0.6, 2, 3); break;
    case 'haste_potion':
      p.buffs.haste = Math.max(p.buffs.haste || 0, 300); SFX.play('potion'); SFX.play('buff'); burst(p.x, p.y, 20, '#80ff80', 16, 2, 0.8, 2, 3);
      log('你的動作突然變快。', 'sys'); break;
    case 'return_scroll':
      log('你使用了回村卷軸。', 'sys'); goHome(); break;
    case 'teleport_scroll': {
      const t = G.world.randomFreeTile(null);
      if (t) { teleportTo(t.x + 0.5, t.y + 0.5); log('你被傳送到了未知的地方。', 'sys'); }
      break;
    }
    case 'ew_scroll': case 'bew_scroll': {
      const w = p.equip.weapon;
      if (!w) { log('你沒有裝備武器。', 'warn'); return; }
      enchant(w, inst.id === 'bew_scroll');
      break;
    }
    case 'ea_scroll': case 'bea_scroll': {
      const list = SLOTS.filter((s) => p.equip[s] && ITEMS[p.equip[s].id].type === 'armor');
      if (!list.length) { log('你沒有穿著可以強化的防具。', 'warn'); return; }
      UI.chooseArmor(list, (slot) => { if (!p.inv.includes(inst)) return; enchant(p.equip[slot], inst.id === 'bea_scroll'); removeItem(inst, 1); });
      return;
    }
  }
  removeItem(inst, 1);
  UI.refresh();
}
function enchant(inst, blessed) {
  const p = G.player, it = ITEMS[inst.id];
  const nm = it.name, cur = inst.ench || 0, safe = it.safe || 0;
  let add = 1;
  if (blessed) { const r = Math.random(); add = r < 0.15 ? 3 : r < 0.5 ? 2 : 1; }
  const ok = cur < safe || Math.random() < Math.max(0.1, 0.5 - (cur - safe) * 0.1);
  if (ok) {
    inst.ench = cur + add;
    log('+' + cur + ' ' + nm + ' 發出了一陣' + (add > 1 ? '耀眼的' : '') + '藍色光芒。(+' + inst.ench + ')', 'level');
    SFX.play('enchantOk'); burst(p.x, p.y, 30, '#80c0ff', 24, 2, 1, 3, 3);
    if (inst.ench >= 9) log('★ ' + p.name + ' 成功將 ' + nm + ' 強化到了 +' + inst.ench + '！', 'loot');
  } else {
    log('+' + cur + ' ' + nm + ' 發出強烈的光芒後就消失了…', 'warn');
    SFX.play('enchantFail');
    for (const s of SLOTS) if (p.equip[s] === inst) p.equip[s] = null;
    burst(p.x, p.y, 30, '#ffffff', 30, 3, 1, 3, 3); shake(5);
  }
  recalc(); UI.refresh();
}
function equipItem(inst) {
  const p = G.player, d = ITEMS[inst.id];
  const err = canEquip(d);
  if (err) { log(err, 'warn'); SFX.play('error'); return; }
  let slot = d.type === 'weapon' ? 'weapon' : d.slot;
  if (slot === 'ring') slot = !p.equip.ring1 ? 'ring1' : !p.equip.ring2 ? 'ring2' : 'ring1';
  if (slot === 'shield' && p.equip.weapon && ITEMS[p.equip.weapon.id].twoHand) { log('使用雙手武器時無法裝備盾牌。', 'warn'); SFX.play('error'); return; }
  const k = p.inv.indexOf(inst); if (k >= 0) p.inv.splice(k, 1);
  if (p.equip[slot]) p.inv.push(p.equip[slot]);
  p.equip[slot] = inst;
  if (slot === 'weapon' && d.twoHand && p.equip.shield) { p.inv.push(p.equip.shield); p.equip.shield = null; log('雙手武器：已卸下盾牌。', 'sys'); }
  log('裝備了 ' + itemName(inst) + '。', 'sys');
  SFX.play('click');
  recalc(); UI.refresh();
}
function unequip(slot) {
  const p = G.player;
  if (!p.equip[slot]) return;
  if (p.inv.length >= 48) { log('背包已滿。', 'warn'); return; }
  p.inv.push(p.equip[slot]); log('卸下了 ' + itemName(p.equip[slot]) + '。', 'sys');
  p.equip[slot] = null; recalc(); UI.refresh();
}
function dropFromInv(inst, qty) {
  const p = G.player; qty = qty || inst.qty;
  if (inSafe(p) === false || true) {
    G.map.items.push({ x: p.x + rand(-0.4, 0.4), y: p.y + rand(-0.4, 0.4), id: inst.id, qty, ench: inst.ench || 0, t: 0 });
    log('丟棄了 ' + ITEMS[inst.id].name + (qty > 1 ? ' ×' + qty : '') + '。', 'sys');
    removeItem(inst, qty);
  }
}

// ---------- 魔法 ----------
function castSpell(id) {
  const p = G.player; if (p.dead) return;
  const s = SPELLS[id];
  if (!p.spells.includes(id)) { log('你還沒有學會「' + s.name + '」。', 'warn'); SFX.play('error'); return; }
  if (s.target === 'enemy') {
    const cur = p.action && (p.action.type === 'attack' || p.action.type === 'cast') ? p.action.target : null;
    if (cur && !cur.dead && playerCanAttack(cur, true)) { setAction({ type: 'cast', spell: id, target: cur }); return; }
    G.targeting = id;
    log('請選擇「' + s.name + '」的目標。（Esc 取消）', 'sys');
    return;
  }
  doCast(id, null);
}
function doCast(id, target) {
  const p = G.player, s = SPELLS[id];
  if (p.castCd > G.t) return;
  if (p.mp < s.mp) { log('魔力不足。', 'warn'); SFX.play('error'); return; }
  if (s.bow && !p.weaponDef.ranged) { log('需要裝備弓。', 'warn'); SFX.play('error'); return; }
  if (inSafe(p) && s.target === 'enemy') { log('安全區域內無法攻擊。', 'warn'); return; }
  p.castCd = G.t + 0.8;
  p.mp -= s.mp;
  p.atkAnim = 0; p.atkDur = 0.35;
  if (target) p.face(target.x, target.y);
  const sp = p.d.sp;
  const healOne = (t, n) => {
    t.hp = Math.min(t.maxHp, t.hp + n); floatText(t.x, t.y, '+' + n, '#60ff80', 60);
    for (let i = 0; i < 18; i++) G.particles.push({ x: t.x + rand(-0.4, 0.4), y: t.y + rand(-0.4, 0.4), z: rand(0, 20), vx: 0, vy: 0, vz: rand(30, 60), life: 1, max: 1, color: '#c8f0ff', size: 2.5 });
  };
  // 治癒術會補給自己與附近夥伴中體力比例最低的一位
  const heal = (n) => {
    let t = p, low = p.hp / p.maxHp;
    for (const a of companions()) if (dist(a.x, a.y, p.x, p.y) < 7 && a.hp / a.maxHp < low) { low = a.hp / a.maxHp; t = a; }
    healOne(t, n); SFX.play('heal');
    if (t !== p) log('治癒術恢復了 ' + t.name + ' 的體力。', 'sys');
  };
  const buff = (k, msg, col) => { p.buffs[k] = s.dur; log(msg, 'sys'); burst(p.x, p.y, 30, col, 20, 2, 0.9, 2.5, 3); SFX.play('buff'); recalc(); };
  const aoeHit = (cx, cy, r, base, filter) => {
    for (const a of G.map.actors.slice()) if (!a.dead && dist(a.x, a.y, cx, cy) <= r && playerCanAttack(a, false) && (!filter || filter(a))) magicHit(p, a, base());
  };
  switch (id) {
    case 'heal1': heal(12 + sp * 2 + randi(0, 6)); break;
    case 'heal2': heal(40 + sp * 4 + randi(0, 10)); break;
    case 'heal3': heal(90 + sp * 6 + randi(0, 20)); break;
    case 'shield': buff('shield', '你的身體被魔法防護包圍。', '#a0d0ff'); break;
    case 'glow': buff('glow', '你的身邊出現了柔和的光芒。', '#fff2b0'); break;
    case 'holy': buff('holy', '在你的武器上附著神聖的氣息。', '#ffe880'); break;
    case 'haste': buff('haste', '你的動作突然變快。', '#80ff80'); break;
    case 'earthskin': buff('earthskin', '你的皮膚變得像岩石一樣堅硬。', '#c8a060'); break;
    case 'blessarmor': buff('blessarmor', '你的鎧甲受到了祝福。', '#e0e8ff'); break;
    case 'sanctuary': buff('sanctuary', '神聖光環籠罩著你。', '#fff0a0'); break;
    case 'powerstrike': p.nextStrike = true; p.atkCd = 0; SFX.play('buff'); setAction({ type: 'attack', target }); break;
    case 'lightbolt': SFX.play('cast'); G.projectiles.push({ kind: 'magic', x: p.x, y: p.y, z: 30, target, speed: 12, onHit: () => magicHit(p, target, randi(6, 12) + sp * 2) }); break;
    case 'icebolt': SFX.play('cast'); G.projectiles.push({ kind: 'ice', x: p.x, y: p.y, z: 30, target, speed: 11, onHit: () => { magicHit(p, target, randi(12, 22) + sp * 3); target.slowT = 4; } }); break;
    case 'lightning':
      SFX.play('thunder');
      G.bolts = G.bolts || []; G.bolts.push({ x: target.x, y: target.y, t: 0 });
      later(0.08, () => magicHit(p, target, randi(25, 40) + sp * 3)); break;
    case 'windshot': {
      for (let i = 0; i < 3; i++) {
        const ar = pickArrow(target); if (!ar) break; removeItem(ar, 1);
        later(i * 0.12, () => { SFX.play('bow'); G.projectiles.push({ kind: 'arrow', x: p.x, y: p.y, z: 26, target, speed: 16, wind: true, onHit: () => physHit(p, target, 0.85, { base: randi(p.weaponDef.dmg[0], p.weaponDef.dmg[1]) + p.d.dmgB + statMod(p.d.st.dex), hit: 0.1, ranged: true }) }); });
      }
      break;
    }
    case 'fireball': SFX.play('fire'); G.projectiles.push({ kind: 'fireball', x: p.x, y: p.y, z: 30, target, speed: 10, onHit: () => { SFX.play('boom', target.x, target.y); burst(target.x, target.y, 20, '#ff8020', 30, 4, 0.7, 3, 3); aoeHit(target.x, target.y, s.aoe, () => randi(30, 50) + sp * 3); } }); break;
    case 'meteor': {
      const tx = target.x, ty = target.y;
      G.meteors = G.meteors || [];
      for (let i = 0; i < 6; i++) G.meteors.push({ x: tx + rand(-2.5, 2.5), y: ty + rand(-2.5, 2.5), t: -i * 0.12, dur: 0.7 });
      SFX.play('fire');
      later(0.9, () => { SFX.play('boom', tx, ty); shake(8); aoeHit(tx, ty, s.aoe, () => randi(60, 100) + sp * 5); });
      break;
    }
    case 'flamering': {
      SFX.play('fire'); G.rings = G.rings || []; G.rings.push({ x: p.x, y: p.y, t: 0, r: s.aoe, col: '255,140,40' });
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; G.particles.push({ x: p.x + Math.cos(a) * 1.2, y: p.y + Math.sin(a) * 1.2, z: 6, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: 20, life: 0.6, max: 0.6, color: i % 2 ? '#ffb030' : '#ff5010', size: 3 }); }
      aoeHit(p.x, p.y, s.aoe, () => randi(8, 14) + sp * 2); break;
    }
    case 'frostnova': {
      SFX.play('cast'); G.rings = G.rings || []; G.rings.push({ x: p.x, y: p.y, t: 0, r: s.aoe, col: '170,230,255' });
      for (let i = 0; i < 30; i++) { const a = Math.random() * 7; G.particles.push({ x: p.x, y: p.y, z: 8, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, vz: 10, life: 0.7, max: 0.7, color: '#d8f4ff', size: 2.5 }); }
      for (const a of G.map.actors.slice()) if (!a.dead && dist(a.x, a.y, p.x, p.y) <= s.aoe && playerCanAttack(a, false)) { magicHit(p, a, randi(10, 18) + sp * 2); a.slowT = 5; }
      break;
    }
    case 'holylight': {
      SFX.play('heal'); G.rings = G.rings || []; G.rings.push({ x: target.x, y: target.y, t: 0, r: s.aoe, col: '255,240,170' });
      burst(target.x, target.y, 30, '#fff6c0', 24, 2, 0.8, 3, 4);
      for (const a of G.map.actors.slice()) if (!a.dead && dist(a.x, a.y, target.x, target.y) <= s.aoe && playerCanAttack(a, false)) magicHit(p, a, (randi(10, 16) + sp * 2) * (a.undead ? 2 : 1));
      break;
    }
    case 'arrowrain': {
      const tx = target.x, ty = target.y; let n = 0;
      for (let i = 0; i < 5; i++) { const ar = pickArrow(target); if (!ar) break; removeItem(ar, 1); n++; }
      if (!n) { log('沒有箭了！', 'warn'); break; }
      SFX.play('bow');
      for (let i = 0; i < 14; i++) later(i * 0.04, () => { const ax = tx + rand(-1.8, 1.8), ay = ty + rand(-1.8, 1.8); G.projectiles.push({ kind: 'arrow', x: ax - 2.5, y: ay - 2.5, z: 140, target: { x: ax, y: ay, dead: false, rain: true }, speed: 16, onHit: () => burst(ax, ay, 2, '#c8b890', 3, 1, 0.3, 2, 1) }); });
      later(0.55, () => { for (const a of G.map.actors.slice()) if (!a.dead && dist(a.x, a.y, tx, ty) <= s.aoe && playerCanAttack(a, false)) physHit(p, a, 0.5 + n * 0.12, { base: randi(p.weaponDef.dmg[0], p.weaponDef.dmg[1]) + p.d.dmgB + statMod(p.d.st.dex), hit: 0.1, ranged: true }); });
      break;
    }
    case 'whirlwind': {
      if (p.weaponDef.ranged) { log('旋風斬需要近戰武器。', 'warn'); p.mp += s.mp; break; }
      SFX.play('swing'); later(0.12, () => SFX.play('swing'));
      p.spinT = 0.5; G.rings = G.rings || []; G.rings.push({ x: p.x, y: p.y, t: 0, r: s.aoe, col: '230,230,255' });
      later(0.15, () => { for (const a of G.map.actors.slice()) if (!a.dead && dist(a.x, a.y, p.x, p.y) <= s.aoe && playerCanAttack(a, false)) physHit(p, a, 1.1, { base: randi(p.weaponDef.dmg[0], p.weaponDef.dmg[1]) + p.d.dmgB + statMod(p.d.st.str) + Math.floor(p.level / 4), hit: 0.05 }); });
      break;
    }
    case 'poison': {
      SFX.play('cast'); G.clouds = G.clouds || [];
      G.clouds.push({ x: target.x, y: target.y, r: s.aoe, t: 0, dur: 6, tick: 0, dmg: () => randi(5, 9) + sp });
      break;
    }
    case 'chainlightning': {
      SFX.play('thunder');
      const hit = [target], pts = [[p.x, p.y], [target.x, target.y]];
      let cur = target;
      for (let k = 0; k < 3; k++) {
        let nx = null, bd = 4.5;
        for (const a of G.map.actors) if (!a.dead && !hit.includes(a) && playerCanAttack(a, false)) { const d = dist(a.x, a.y, cur.x, cur.y); if (d < bd) { bd = d; nx = a; } }
        if (!nx) break; hit.push(nx); pts.push([nx.x, nx.y]); cur = nx;
      }
      G.chains = G.chains || []; G.chains.push({ pts, t: 0, dur: 0.5 });
      hit.forEach((a, i) => later(0.05 + i * 0.08, () => { if (!a.dead) magicHit(p, a, Math.round((randi(20, 32) + sp * 3) * Math.pow(0.8, i))); }));
      break;
    }
    case 'blizzard': {
      const tx = target.x, ty = target.y;
      G.snows = G.snows || []; G.snows.push({ x: tx, y: ty, r: s.aoe, t: 0, dur: 1.8 });
      SFX.play('cast');
      for (let w = 0; w < 3; w++) later(0.3 + w * 0.5, () => { for (const a of G.map.actors.slice()) if (!a.dead && dist(a.x, a.y, tx, ty) <= s.aoe && playerCanAttack(a, false)) { magicHit(p, a, randi(22, 36) + sp * 3); a.slowT = 4; } });
      break;
    }
    case 'groupheal': {
      const n = 30 + sp * 4 + randi(0, 10);
      healOne(p, n);
      for (const a of companions()) if (dist(a.x, a.y, p.x, p.y) < 7) healOne(a, n);
      for (const a of G.map.actors) if (a.kind === 'ally' && !a.dead && dist(a.x, a.y, p.x, p.y) < 7) healOne(a, n);
      G.rings = G.rings || []; G.rings.push({ x: p.x, y: p.y, t: 0, r: 7, col: '170,255,190' });
      SFX.play('heal'); break;
    }
    case 'might': buff('might', '一股力量湧入你的身體。（傷害 +3）', '#ff9a60'); break;
    case 'warcry': {
      buff('warcry', '你發出了震天的戰吼！（防禦 +3）', '#ffd080'); SFX.play('roar');
      for (const a of G.map.actors) if (!a.dead && a.kind === 'monster' && dist(a.x, a.y, p.x, p.y) < 5 && !inSafe(a)) { a.target = p; a.state = 'chase'; a.grudge.add(p.id); }
      break;
    }
    case 'blink': {
      const mw = screenToWorld(G.mouse.x, G.mouse.y);
      let tx = mw.x, ty = mw.y;
      const d = dist(p.x, p.y, tx, ty);
      if (d > 8) { tx = p.x + (tx - p.x) / d * 8; ty = p.y + (ty - p.y) / d * 8; }
      if (G.world.blocked(tx, ty)) { const q = G.world.nearestFree(tx, ty); tx = q.x; ty = q.y; }
      teleportTo(tx, ty); break;
    }
    case 'trueshot': {
      if (!p.weaponDef.ranged) { log('需要裝備弓。', 'warn'); p.mp += s.mp; break; }
      const ar = pickArrow(target); if (!ar) { log('沒有箭了！', 'warn'); break; }
      removeItem(ar, 1); SFX.play('bow');
      G.projectiles.push({ kind: 'arrow', x: p.x, y: p.y, z: 26, target, speed: 22, holy: true, onHit: () => { physHit(p, target, 2.5, { base: randi(p.weaponDef.dmg[0], p.weaponDef.dmg[1]) + p.d.dmgB + statMod(p.d.st.dex), hit: 0.25, ranged: true, crit: 0.25 }); burst(target.x, target.y, 26, '#fff2a0', 14, 3, 0.5); } });
      break;
    }
    case 'summon_wolf': case 'summon_golem': case 'summon_fire': SFX.play('cast'); castSummon(s.summon); break;
    case 'charm': SFX.play('cast'); castCharm(target); break;
    case 'turnundead':
      SFX.play('heal'); G.rings = G.rings || []; G.rings.push({ x: p.x, y: p.y, t: 0, r: s.aoe, col: '255,240,170' });
      aoeHit(p.x, p.y, s.aoe, () => randi(40, 70) + sp * 4, (a) => a.undead);
      break;
  }
  UI.refresh();
}

function useHotbar(i) {
  const h = G.player.hotbar[i]; if (!h || !G.player) return;
  if (h.kind === 'item') {
    const inst = G.player.inv.find((it) => it.id === h.id);
    if (!inst) { log('沒有 ' + ITEMS[h.id].name + '。', 'warn'); return; }
    useItem(inst);
  } else if (h.kind === 'spell') castSpell(h.id);
  else if (h.kind === 'auto') {
    G.autoHunt = !G.autoHunt;
    log(G.autoHunt ? '自動狩獵：開啟（自動攻擊附近的怪物）' : '自動狩獵：關閉', 'sys');
    if (G.autoHunt && (!G.player.action || G.player.action.type !== 'attack')) autoNext();
    UI.refresh();
  }
}

// ---------- AI ----------
function findTarget(a) {
  const pl = G.player;
  const R = a.kind === 'ally' ? 9 : a.faction === 'castle' ? (a.aggroR || 6) : a.aggro ? a.aggroR : 0;
  let best = null, bd = R;
  const consider = (b) => {
    const d = dist(a.x, a.y, b.x, b.y);
    if (d < bd && (isHostile(a, b) && (a.aggro || a.grudge.has(b.id) || a.kind === 'ally' || a.kind === 'townguard'))) { bd = d; best = b; }
  };
  if (!pl.dead) consider(pl);
  for (const b of G.map.actors) if (b !== a && !b.dead) consider(b);
  // 盟友優先攻擊玩家的目標
  if (a.kind === 'ally') {
    const pt = pl.action && pl.action.target;
    if (pt && !pt.dead && isHostile(a, pt)) return pt;
    if (!best && siegeHostile()) { const gt = G.map.gate; best = gt && !gt.dead && !gt.open ? gt : G.map.tower && !G.map.tower.dead ? G.map.tower : null; }
  }
  if (a.raider && !best && G.map.tower && !G.map.tower.dead && ownsCastle()) best = G.map.tower;
  return best;
}
function actorAttack(a, t) {
  a.atkCd = a.atkSpd * (a.slowT > 0 ? 1.5 : 1); a.atkAnim = 0; a.face(t.x, t.y);
  if (a.proj) {
    const kind = a.proj;
    if (kind === 'arrow') SFX.play('bow', a.x, a.y);
    G.projectiles.push({ kind, x: a.x, y: a.y, z: a.boss ? 60 : 26, target: t, speed: kind === 'arrow' ? 13 : 9, from: a,
      onHit: () => { if (a.magic) magicHit(a, t, randi(a.dmg[0], a.dmg[1])); else physHit(a, t, 1, { ranged: true }); } });
  } else {
    const range = a.range;
    later(0.22, () => { if (!a.dead && !t.dead && dist(a.x, a.y, t.x, t.y) <= range + 0.8 + (t.struct ? 1 : 0)) physHit(a, t, 1); });
  }
}
function updateActor(a, dt) {
  const pl = G.player, W = G.world;
  if (a.dead) { a.deadT += dt; return; }
  if (a.kind === 'struct') return;
  if (a.companion) {
    if (a.atkAnim >= 0) { a.atkAnim += dt / 0.45; if (a.atkAnim >= 1) a.atkAnim = -1; }
    return updateCompanion(a, dt);
  }
  if (a.atkAnim >= 0) { a.atkAnim += dt / 0.45; if (a.atkAnim >= 1) a.atkAnim = -1; }
  a.atkCd -= dt; a.thinkT -= dt; a.hurtT -= dt; a.sayT -= dt; if (a.slowT > 0) a.slowT -= dt;
  const dp = dist(a.x, a.y, pl.x, pl.y);
  if (a.kind === 'villager' || a.kind === 'dog') return updateVillager(a, dt, dp);
  if (a.companion) return updateCompanion(a, dt);
  if (dp > 36 && !a.target && a.kind !== 'ally') return;
  const spMul = a.slowT > 0 ? 0.5 : 1;
  // 冒險者喝水
  if ((a.kind === 'fighter' || a.kind === 'pker' || a.kind === 'ally') && a.hp < a.maxHp * 0.35 && G.t > a.potT) {
    a.potT = G.t + 6; a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.3)); burst(a.x, a.y, 20, '#ff8080', 8, 1, 0.5, 2, 2);
  }
  // 盟友時效
  if (a.kind === 'ally' && a.expire && G.t > a.expire) { a.dead = true; a.deadT = 9; burst(a.x, a.y, 20, '#9fd0ff', 16, 2, 0.6); return; }
  // 選目標
  if (a.target && (a.target.dead || !isHostile(a, a.target) || (a.target !== pl && !G.map.actors.includes(a.target)))) { a.target = null; if (a.state === 'chase') a.state = 'idle'; }
  if (!a.target && a.thinkT <= 0 && a.state !== 'return') {
    a.thinkT = 0.5 + Math.random() * 0.3;
    const t = findTarget(a);
    if (t) { a.target = t; a.state = 'chase'; if (a.boss && !a.roared) { a.roared = true; SFX.play('roar', a.x, a.y); } if (a.kind === 'pker' && t === pl) { a.speak(pick(['嘿嘿，你的裝備是我的了！', '受死吧！', '新手？正好！']), 3); } }
  }
  const leash = a.leash || (a.boss ? 18 : a.kind === 'fighter' || a.kind === 'pker' ? 30 : a.kind === 'ally' ? 99 : 14);
  if (a.state === 'chase' && a.target) {
    const t = a.target;
    if (a.kind !== 'ally' && dist(a.x, a.y, a.home.x, a.home.y) > leash) { a.state = 'return'; a.target = null; a.thinkT = 0; return; }
    if (a.kind === 'townguard' && !W.isSafe(t.x, t.y) && dist(a.x, a.y, a.home.x, a.home.y) > 8) { a.state = 'return'; a.target = null; return; }
    const range = a.range + (a.boss ? 0.4 : 0) + (t.struct === 'gate' ? 1.4 : t.struct ? 0.6 : 0);
    const dt2 = dist(a.x, a.y, t.x, t.y);
    // 特殊能力
    if (a.def && a.def.breath && dt2 < 6 && dt2 > 2.5 && a.atkCd <= 0 && Math.random() < 0.02) {
      a.face(t.x, t.y); a.atkAnim = 0; a.atkCd = a.atkSpd * 1.6; a.path = [];
      SFX.play('fire', a.x, a.y);
      G.projectiles.push({ kind: 'fire', x: a.x, y: a.y, z: 70, target: t, speed: 7, from: a, onHit: () => { magicHit(a, t, Math.round(randi(a.dmg[0], a.dmg[1]) * 1.4), { element: 'fire' }); SFX.play('boom', t.x, t.y); burst(t.x, t.y, 20, '#ff8020', 20, 3, 0.6, 3, 2); } });
      return;
    }
    if (a.def && a.def.summon && G.t > (a.summonT || 0) && a.hp < a.maxHp * 0.9) {
      a.summonT = G.t + 16;
      a.speak('起來吧，我的僕從們！', 3);
      for (let i = 0; i < 2; i++) { const s = makeMonster(a.def.summon, a.x + rand(-2, 2), a.y + rand(-2, 2)); if (!W.blocked(s.x, s.y)) { s.summoned = true; s.target = t; s.state = 'chase'; G.map.actors.push(s); burst(s.x, s.y, 10, '#8a4aff', 14, 2, 0.6); } }
    }
    if (dt2 <= range) {
      a.path = []; a.moving = false; a.face(t.x, t.y);
      if (a.atkCd <= 0) actorAttack(a, t);
    } else {
      if (a.thinkT <= 0 || !a.path.length) {
        a.thinkT = 0.5 + Math.random() * 0.3;
        if (dt2 < 2.5 && !W.blocked(t.x, t.y)) a.path = [{ x: t.x, y: t.y }];
        else a.path = Path.find(W, a.x, a.y, t.x, t.y, 700, a.kind !== 'townguard' && a.kind !== 'ally') || [];
      }
      a.moveAlong(dt, spMul);
    }
  } else if (a.state === 'return') {
    if (a.thinkT <= 0 || !a.path.length) { a.thinkT = 1; a.path = Path.find(W, a.x, a.y, a.home.x, a.home.y, 1500, a.kind === 'monster') || []; }
    a.moveAlong(dt, 1.3);
    if (a.kind === 'monster' || a.faction === 'castle') a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.2 * dt);
    if (dist(a.x, a.y, a.home.x, a.home.y) < 1.5 || !a.path.length) { a.state = 'idle'; a.path = []; if (a.kind === 'monster') a.hp = a.maxHp; a.grudge.clear(); }
  } else {
    // 閒置行為
    if (a.kind === 'ally') {
      if (dp > 3 && (a.thinkT <= 0 || !a.path.length)) { a.thinkT = 0.6; a.path = Path.find(W, a.x, a.y, pl.x + rand(-1.5, 1.5), pl.y + rand(-1.5, 1.5), 900) || []; }
      if (dp > 12 && !pl.dead) { const q = W.nearestFree(pl.x + 1, pl.y + 1); a.x = q.x; a.y = q.y; a.path = []; }
      if (a.path.length) a.moveAlong(dt, 1.1); else a.moving = false;
      return;
    }
    if (a.path.length) a.moveAlong(dt, (a.kind === 'fighter' || a.kind === 'pker' ? 0.8 : 0.5) * spMul);
    else {
      a.moving = false;
      if (a.thinkT <= 0) {
        a.thinkT = rand(2, 6);
        const r = a.kind === 'fighter' || a.kind === 'pker' ? 10 : a.kind === 'townguard' ? 2 : 4;
        if (a.kind === 'fighter' || a.kind === 'pker') { a.home.x = clamp(a.home.x + rand(-6, 6), 6, W.w - 6); a.home.y = clamp(a.home.y + rand(-6, 6), 6, W.h - 6); }
        const tx = a.home.x + rand(-r, r), ty = a.home.y + rand(-r, r);
        const avoid = a.kind !== 'townguard';
        if (!W.blocked(tx, ty) && !(avoid && W.isSafe(tx, ty))) a.path = Path.find(W, a.x, a.y, tx, ty, 300, avoid) || [];
      }
      if (a.kind === 'fighter' && Math.random() < 0.0008 && dp < 14) { const l = pick(CHAT_LINES); a.speak(l, 4); log(a.name + '：' + l, 'chat'); }
    }
  }
}
function separate(list) {
  const W = G.world;
  for (let i = 0; i < list.length; i++) {
    const m = list[i]; if (m.dead || m.kind === 'struct' || m.speed === 0) continue;
    for (let j = i + 1; j < list.length; j++) {
      const o = list[j]; if (o.dead || o.kind === 'struct') continue;
      const dx = m.x - o.x, dy = m.y - o.y; if (Math.abs(dx) > 0.6 || Math.abs(dy) > 0.6) continue;
      const d = Math.hypot(dx, dy);
      if (d < 0.6 && d > 0.001) {
        const push = (0.6 - d) * 0.25, nx = dx / d * push, ny = dy / d * push;
        if (!W.blocked(m.x + nx, m.y + ny)) { m.x += nx; m.y += ny; }
        if (!W.blocked(o.x - nx, o.y - ny)) { o.x -= nx; o.y -= ny; }
      }
    }
  }
}
function updateVillager(o, dt, dp) {
  const W = G.world, t = o.town;
  o.lineT -= dt;
  if (o.path.length) o.moveAlong(dt);
  else {
    o.moving = false; o.waitT -= dt;
    if (o.waitT <= 0) {
      o.waitT = rand(2, o.kind === 'dog' ? 5 : 9);
      const p = { x: t.x + rand(-t.r + 3, t.r - 3), y: t.y + rand(-t.r + 3, t.r - 3) };
      if (!W.blocked(p.x, p.y)) o.path = Path.find(W, o.x, o.y, p.x, p.y, 500) || [];
    }
  }
  if (o.lineT <= 0) {
    o.lineT = rand(20, 50);
    if (dp > 14) return;
    if (o.kind === 'dog') { o.speak('汪！汪！', 2.5); SFX.play('bark', o.x, o.y); log(o.name + '：汪！汪！', 'chat'); }
    else { const l = pick(CHAT_LINES); o.speak(l, 5); log(o.name + '：' + l, 'chat'); }
  }
}

function updateSpawners(dt) {
  const m = G.map, pl = G.player;
  for (const sp of m.spawners) {
    if (sp.alive < sp.max) {
      sp.timer -= dt;
      if (sp.timer <= 0) { if (dist(pl.x, pl.y, sp.x, sp.y) > 8) spawnFrom(m, sp); sp.timer = sp.respawn; }
    }
  }
  // 冒險者補充
  if (m.id === 'overworld') {
    m.fighterT -= dt;
    if (m.fighterT <= 0) {
      m.fighterT = 20;
      const nF = m.actors.filter((a) => a.kind === 'fighter' && !a.dead).length, nP = m.actors.filter((a) => a.kind === 'pker' && !a.dead && !a.raider).length;
      if (nF < 20) spawnFighter(m, false);
      if (nP < 5) spawnFighter(m, true);
    }
  }
  for (let i = m.actors.length - 1; i >= 0; i--) { const a = m.actors[i]; if (a.dead && a.deadT > 3 && a.kind !== 'struct') m.actors.splice(i, 1); }
}

// ---------- 血盟 ----------
function clanCap() { return 2 + Math.floor((G.player.d.st || G.player.base).cha / 3); }
function createClan(name, emblem) {
  const p = G.player;
  if (p.clan) return '你已經有血盟了。';
  if (p.level < 5) return '需要等級 5 才能建立血盟。';
  if (p.gold < 3000) return '建立血盟需要 3000 金幣。';
  if (!name || name.length < 2 || name.length > 8) return '血盟名稱需為 2～8 個字。';
  if (NPC_CLANS.includes(name) || name === ENEMY_CLAN || name === '灰岩騎士團') return '這個名稱已經被使用了。';
  p.gold -= 3000;
  p.clan = { name, emblem, members: [], founded: Date.now() };
  log('血盟「' + name + '」成立了！你是血盟的盟主。', 'level'); SFX.play('quest');
  saveGame(true); UI.refresh();
  return null;
}
function recruit(v) {
  const p = G.player;
  if (!p.clan) return '你還沒有血盟。';
  if (v.clan) return v.name + ' 已經是「' + v.clan + '」的成員了。';
  if (p.clan.members.length >= clanCap()) return '血盟人數已達上限（魅力越高，能招募的人越多）。';
  if (v.refuseT && G.t < v.refuseT) return v.name + ' 不想再談這件事了。';
  const cha = p.d.st.cha;
  const chance = clamp(0.35 + (cha - 10) * 0.06 + p.level * 0.01 + (p.align >= 500 ? 0.1 : p.align < 0 ? -0.25 : 0), 0.05, 0.9);
  if (Math.random() < chance) {
    v.clan = p.clan.name; v.emblem = p.clan.emblem;
    p.clan.members.push({ name: v.name, cls: v.cls, level: v.level, look: v.look });
    v.speak('好啊！以後請多指教！', 4);
    log(v.name + ' 加入了血盟「' + p.clan.name + '」！', 'level'); SFX.play('quest');
    saveGame(true); UI.refresh();
    return null;
  }
  v.refuseT = G.t + 60;
  v.speak(pick(['再考慮看看吧…', '我還是喜歡一個人。', '你的血盟有什麼好處？']), 4);
  return v.name + ' 拒絕了你的邀請。';
}
function summonAllies(n, ttl, near) {
  const p = G.player, list = p.clan ? p.clan.members.slice(0, n) : [];
  const spawned = [];
  for (const mbr of list) {
    const base = near || p;
    const pos = G.world.nearestFree(base.x + rand(-2, 2), base.y + rand(-2, 2));
    const cls = mbr.cls;
    const lvl = Math.max(mbr.level, p.level - 2);
    const a = new Actor({
      x: pos.x, y: pos.y, kind: 'ally', faction: 'ally', name: mbr.name, cls, level: lvl, look: mbr.look || pick(FIGHTER_LOOKS[cls]),
      maxHp: 30 + lvl * 10, ac: Math.floor(lvl / 2) + 3, mr: lvl, er: 4, dmg: [2 + Math.floor(lvl / 2), 6 + lvl], atkSpd: 1.0,
      range: cls === 'ranger' ? 6 : cls === 'mage' ? 5.5 : 1.35, proj: cls === 'ranger' ? 'arrow' : cls === 'mage' ? 'magic' : null, magic: cls === 'mage',
      aggro: true, aggroR: 9, speed: 3.4, clan: p.clan.name, emblem: p.clan.emblem, align: 1000,
    });
    a.expire = ttl ? G.t + ttl : 0;
    G.map.actors.push(a); spawned.push(a);
    burst(a.x, a.y, 20, '#9fd0ff', 16, 2, 0.6);
  }
  return spawned;
}
function callAllies() {
  const p = G.player;
  if (!p.clan || !p.clan.members.length) return '你的血盟還沒有成員。';
  if (inSafe(p)) return '在安全區域內無法召集盟友。';
  if (p.callT && G.t < p.callT) return '召集令冷卻中（還有 ' + Math.ceil(p.callT - G.t) + ' 秒）。';
  p.callT = G.t + 300;
  const s = summonAllies(3, 180);
  log('你召集了 ' + s.length + ' 位盟友前來助陣！（3 分鐘）', 'level'); SFX.play('quest');
  return null;
}

// ---------- 攻城戰 ----------
function declareSiege() {
  const p = G.player, m = G.map;
  if (m.id !== 'overworld') return '只能在灰岩城宣戰。';
  if (!p.clan) return '只有血盟才能宣戰。';
  if (ownsCastle()) return '你的血盟已經擁有灰岩城了。';
  if (G.siege && G.siege.active) return '攻城戰正在進行中。';
  if (p.level < 10) return '需要等級 10 才能宣戰。';
  const W = m.world, C = W.castle;
  G.siege = { active: true, t: 600, startT: G.t };
  // 關城門、重置守護塔、生成守軍
  const gate = m.gate; gate.dead = false; gate.broken = false; gate.open = false; gate.hp = gate.maxHp; setGateBlock(true);
  const tw = m.tower; tw.dead = false; tw.hp = tw.maxHp; tw.ownerColor = '#ff6a5a';
  for (const a of m.actors) if (a.faction === 'castle' && !a.struct) a.dead = true;
  for (const s of C.guardSpots) { const g = makeMonster('guard', s.x, s.y); g.home = { x: s.x, y: s.y }; m.actors.push(g); }
  const cap = makeMonster('guard_captain', C.tower.x - 1.5, C.tower.y); cap.home = { x: cap.x, y: cap.y }; m.actors.push(cap);
  // 血盟成員全員集結
  const allies = summonAllies(6, 0, { x: C.x0 - 4, y: C.cy });
  for (const a of allies) a.siegeAlly = true;
  log('⚔ 血盟「' + p.clan.name + '」向灰岩城宣戰！攻城戰開始（10 分鐘）。摧毀城門，擊破守護之塔！', 'level');
  SFX.play('roar');
  UI.refresh();
  return null;
}
function setGateBlock(closed) {
  const W = G.maps.overworld.world;
  for (const g of W.castle.gate) W.blockArr[W.idx(g.x, g.y)] = closed ? 3 : 0;
}
function onStructDestroyed(s, src) {
  const m = G.map, p = G.player;
  SFX.play('boom', s.x, s.y); shake(10);
  burst(s.x, s.y, 40, '#c0a080', 40, 4, 1, 3, 4);
  if (s.struct === 'gate') {
    s.broken = true; setGateBlock(false);
    log('灰岩城門被攻破了！', 'level');
  } else if (s.struct === 'tower') {
    if (G.siege && G.siege.active && !ownsCastle()) {
      G.siege.active = false;
      p.castle = { owned: true, taxAcc: 0, since: Date.now() };
      for (const a of m.actors) if (a.faction === 'castle' && !a.struct) { a.dead = true; a.deadT = 9; }
      for (const a of m.actors) if (a.siegeAlly) a.expire = G.t + 30;
      s.dead = false; s.hp = s.maxHp; s.ownerColor = '#7ad0ff';
      m.gate.open = true; m.gate.broken = false; m.gate.hp = m.gate.maxHp; m.gate.dead = false; setGateBlock(false);
      log('★★ 血盟「' + p.clan.name + '」佔領了灰岩城！盟主 ' + p.name + ' 成為了城主！', 'loot');
      gainExp(3000); SFX.play('levelup');
      saveGame(true);
    } else if (ownsCastle() && src && src.raider) {
      p.castle = null;
      s.dead = false; s.hp = s.maxHp; s.ownerColor = '#ff6a5a';
      log('守護之塔被' + ENEMY_CLAN + '摧毀了… 你失去了灰岩城。', 'warn');
      G.raid = null; saveGame(true);
    }
  }
  UI.refresh();
}
function updateSiege(dt) {
  const s = G.siege, p = G.player;
  if (s && s.active) {
    s.t -= dt;
    if (s.t <= 0) {
      s.active = false;
      const m = G.maps.overworld;
      for (const a of m.actors) if ((a.faction === 'castle' && !a.struct) || a.siegeAlly) { a.dead = true; a.deadT = 9; }
      m.gate.open = true; m.gate.broken = false; m.gate.dead = false; m.gate.hp = m.gate.maxHp; m.tower.hp = m.tower.maxHp; m.tower.ownerColor = null; setGateBlock(false);
      log('攻城戰時間結束，未能攻下灰岩城。', 'warn');
    }
  }
  // 城主：稅收與敵對血盟突襲
  if (ownsCastle() && G.map.id === 'overworld') {
    p.castle.taxAcc = (p.castle.taxAcc || 0) + dt * 0.8;
    G.raidT = (G.raidT === undefined ? 600 : G.raidT) - dt;
    if (G.raidT <= 0 && !G.raid) {
      G.raidT = 900;
      const W = G.world, C = W.castle;
      G.raid = { t: 240 };
      for (let i = 0; i < 5; i++) {
        const f = makeFighter(C.x0 - 6 + rand(-2, 2), C.cy + rand(-3, 3), p.level + randi(-2, 3), true);
        f.raider = true; f.clan = ENEMY_CLAN; f.emblem = clanEmblemFor(ENEMY_CLAN); f.aggroR = 14; f.leash = 60;
        G.map.actors.push(f);
      }
      summonAllies(4, 240, { x: C.cx, y: C.cy });
      log('⚠ ' + ENEMY_CLAN + ' 正在突襲灰岩城！保護守護之塔！', 'warn'); SFX.play('roar');
    }
  }
  if (G.raid) {
    G.raid.t -= dt;
    const left = G.maps.overworld.actors.filter((a) => a.raider && !a.dead).length;
    if (!left && G.raid) { G.raid = null; if (ownsCastle()) { log('成功擊退了' + ENEMY_CLAN + '的突襲！', 'level'); gainExp(1000); } }
    else if (G.raid.t <= 0) { G.raid = null; for (const a of G.maps.overworld.actors) if (a.raider) { a.dead = true; a.deadT = 9; } }
  }
}

// ---------- 投射物、粒子 ----------
function updateFx(dt) {
  for (let i = G.timers.length - 1; i >= 0; i--) { const t = G.timers[i]; t.t -= dt; if (t.t <= 0) { G.timers.splice(i, 1); t.fn(); } }
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i], tg = pr.target;
    const dx = tg.x - pr.x, dy = tg.y - pr.y, d = Math.hypot(dx, dy);
    pr.z = lerp(pr.z, zOf(tg), 0.1);
    pr.ang = Math.atan2(dy, dx);
    if (pr.kind === 'fire' || pr.kind === 'fireball') burst(pr.x, pr.y, pr.z, Math.random() < 0.5 ? '#ffb030' : '#ff5010', 2, 0.6, 0.4, 3, 1);
    if (pr.kind === 'ice') burst(pr.x, pr.y, pr.z, '#c8f0ff', 1, 0.3, 0.4, 2, 0);
    if (pr.kind === 'dark') burst(pr.x, pr.y, pr.z, '#8a4aff', 1, 0.3, 0.4, 2.5, 0);
    if (pr.kind === 'magic') burst(pr.x, pr.y, pr.z, '#fff6c0', 1, 0.3, 0.3, 2, 0);
    if (d < pr.speed * dt || tg.dead) {
      G.projectiles.splice(i, 1);
      if (!tg.dead) pr.onHit();
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
  const items = G.map.items;
  for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; it.t += dt; if (it.t > 180) items.splice(i, 1); }
  for (const c of G.clouds || []) {
    c.tick -= dt;
    if (c.tick <= 0) { c.tick = 1; for (const a of G.map.actors.slice()) if (!a.dead && dist(a.x, a.y, c.x, c.y) <= c.r && playerCanAttack(a, false)) magicHit(G.player, a, c.dmg()); }
  }
  for (const k of ['bolts', 'rings', 'meteors', 'clouds', 'chains', 'snows']) if (G[k]) { for (const b of G[k]) b.t += dt; G[k] = G[k].filter((b) => b.t < (b.dur || 0.5)); }
  if (G.clickFx) { G.clickFx.t += dt; if (G.clickFx.t > 0.6) G.clickFx = null; }
  if (G.levelFx) { G.levelFx.t += dt; if (G.levelFx.t > 1.6) G.levelFx = null; }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
}

// ---------- NPC 對話台詞 ----------
const NPC_LINES = {
  general: ['藥水便宜賣喔～', '出門前記得帶回村卷軸！', '箭也是我這裡賣的'],
  smith: ['好武器才能打倒強敵！', '板金鎧甲可是我的得意之作', '小心別背太重的東西'],
  magic: ['想學魔法嗎？', '魔法書都在這裡', '高階魔法書只有強大的怪物身上才有'],
  teleport: ['需要傳送服務嗎？', '峽谷深處很危險，請小心', '旅途平安'],
  quest: ['村子需要勇者的幫忙', '最近怪物越來越多了…', '來看看委託吧'],
  clan: ['要建立自己的血盟嗎？', '有夥伴才能攻下灰岩城'],
  warehouse: ['東西太重可以寄放在這裡', '倉庫在每個村莊都通用喔'],
  jewel: ['戒指和項鍊能讓你更強大', '這些可是稀有的飾品'],
  pet: ['可愛的寵物在等你喔～', '寵物倒下了就帶回來給我吧', '馴獸肉乾可以馴服野狼'],
  herald: ['灰岩城等待著真正的主人', '有血盟就能向灰岩城宣戰！'],
};
function updateNPCs(dt) {
  for (const n of G.map.npcs) {
    n.lineT -= dt; n.sayT -= dt;
    if (n.lineT <= 0) { n.lineT = rand(16, 34); if (dist(n.x, n.y, G.player.x, G.player.y) < 12) n.speak(pick(NPC_LINES[n.role] || ['…']), 4); }
  }
}

// ---------- 主迴圈 ----------
let lastT = 0, saveT = 0, zoneShown = '', townShown = null;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016);
  lastT = ts;
  if (G.running) {
    G.t += dt;
    if (G.map.id === 'overworld') G.day = (G.day + dt / 480) % 1;
    const p = G.player;
    p.sayT -= dt; p.hurtT -= dt;
    if (G.mouse.down && G.mouse.holdMove && !p.dead) {
      G.mouse.holdT = (G.mouse.holdT || 0) - dt;
      if (G.mouse.holdT <= 0) { G.mouse.holdT = 0.25; const w = screenToWorld(G.mouse.x, G.mouse.y); setAction({ type: 'move', x: w.x, y: w.y }); }
    }
    updatePlayer(dt);
    const acts = G.map.actors;
    for (let i = 0; i < acts.length; i++) updateActor(acts[i], dt);
    separate(acts.filter((a) => !a.dead && dist(a.x, a.y, p.x, p.y) < 30));
    updateNPCs(dt);
    updateSpawners(dt);
    updateSiege(dt);
    updateFx(dt);
    if (Settings.autoPickup !== false && !p.dead) autoPickup(dt);
    if (G.autoHunt && !p.action && !p.dead) { G.autoT = (G.autoT || 0) - dt; if (G.autoT <= 0) { G.autoT = 0.5; autoNext(); } }
    if (G.autoHunt && !p.dead && p.hp < p.maxHp * 0.4 && (G.potT || 0) < G.t) {
      G.potT = G.t + 1;
      const pot = p.inv.find((i) => i.id === 'clear_potion' && p.maxHp - p.hp >= 120) || p.inv.find((i) => i.id === 'orange_potion' && p.maxHp - p.hp >= 60) || p.inv.find((i) => i.id === 'red_potion') || p.inv.find((i) => i.id === 'orange_potion' || i.id === 'clear_potion');
      if (pot) useItem(pot);
    }
    // 區域提示、記錄最近村莊
    const zn = G.world.zoneName(p.x, p.y);
    if (zn !== zoneShown) { zoneShown = zn; UI.zone(zn, inSafe(p)); }
    if (G.map.id === 'overworld') { const t = G.world.townAt(p.x, p.y); if (t && t !== townShown) { p.homeTown = t.id; } townShown = t; }
    saveT += dt; if (saveT > 30) { saveT = 0; saveGame(true); }
    UI.tick(dt);
    render();
  } else if (typeof Scenes !== 'undefined') Scenes.frame(dt);
  requestAnimationFrame(frame);
}
function screenToWorld(mx, my) {
  const sx = mx - VW / 2 + G.cam.x, sy = my - (VH - HUD_H()) / 2 + G.cam.y;
  return toWorld(sx, sy);
}

// ---------- 輸入 ----------
function pickAt(mx, my) {
  let best = null, bd = -1e9;
  const test = (e, kind) => {
    const b = e._bb; if (!b) return;
    if (mx >= b.x0 && mx <= b.x1 && my >= b.y0 && my <= b.y1) {
      const depth = e.x + e.y + (kind === 'item' ? 100 : 0);
      if (depth > bd) { bd = depth; best = { kind, e }; }
    }
  };
  for (const a of G.map.actors) if (!a.dead) test(a, a.kind === 'villager' || a.kind === 'dog' ? 'villager' : 'actor');
  for (const n of G.map.npcs) test(n, 'npc');
  for (const it of G.map.items) test(it, 'item');
  for (const pt of G.world.portals) test(pt, 'portal');
  for (const o of G.boards || []) test(o, 'board');
  return best;
}
function onPointerDown(e) {
  if (!G.running) return;
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  G.mouse.x = mx; G.mouse.y = my; G.mouse.down = true; G.mouse.holdMove = false;
  UI.blurChat(); UI.hideTip();
  const p = G.player; if (p.dead) return;
  const force = e.ctrlKey || e.shiftKey || e.button === 2;
  const hit = pickAt(mx, my);
  if (G.targeting === 'tame') {
    G.targeting = null;
    if (hit && hit.kind === 'actor') tameTarget(hit.e); else log('取消馴服。', 'sys');
    return;
  }
  if (G.targeting) {
    const sp = G.targeting; G.targeting = null;
    if (hit && hit.kind === 'actor' && playerCanAttack(hit.e, true)) Net.intent('cast', { spell: sp, target: hit.e });
    else log('取消施法。', 'sys');
    return;
  }
  if (hit) {
    if (hit.kind === 'actor') {
      const a = hit.e;
      if (playerCanAttack(a, force)) Net.intent('attack', { target: a, force });
      else if (a.faction === 'fighter' || a.faction === 'ally' || a.kind === 'townguard') { a.speak(a.kind === 'townguard' ? '保持秩序。' : pick(['你好！', '一起加油吧！', '嗨～']), 2.5); if (a.faction === 'fighter') log('提示：按住 Ctrl 或 Shift 點擊可以強制攻擊其他冒險者（會變成紫名）。', 'sys'); }
      return;
    }
    if (hit.kind === 'npc') { Net.intent('talk', { npc: hit.e }); return; }
    if (hit.kind === 'villager') { Net.intent('talk', { npc: hit.e }); return; }
    if (hit.kind === 'item') { Net.intent('pickup', { item: hit.e }); return; }
    if (hit.kind === 'portal') { Net.intent('portal', { portal: hit.e }); return; }
    if (hit.kind === 'board') { Net.intent('talk', { npc: hit.e.npc }); return; }
  }
  const w = screenToWorld(mx, my);
  Net.intent('move', { x: w.x, y: w.y });
  G.mouse.holdMove = true; G.mouse.holdT = 0.3;
}
function onPointerMove(e) {
  const r = canvas.getBoundingClientRect();
  G.mouse.x = e.clientX - r.left; G.mouse.y = e.clientY - r.top;
  if (!G.running) return;
  const h = pickAt(G.mouse.x, G.mouse.y);
  G.hover = h;
  canvas.style.cursor = G.targeting ? 'crosshair' : h ? (h.kind === 'actor' && playerCanAttack(h.e, false) ? 'crosshair' : 'pointer') : 'default';
}
function onKey(e) {
  if (!G.running) return;
  if (UI.chatFocused()) return;
  const k = e.key;
  if (/^[0-9]$/.test(k)) { useHotbar(k === '0' ? 9 : +k - 1); e.preventDefault(); return; }
  switch (k.toLowerCase()) {
    case 'i': UI.toggle('inv'); break;
    case 'c': UI.toggle('char'); break;
    case 's': UI.toggle('spell'); break;
    case 'p': UI.toggle('clan'); break;
    case 'm': UI.toggle('map'); break;
    case 'n': UI.toggleMinimap(); break;
    case 'o': UI.toggle('settings'); break;
    case 't': UI.toggle('pet'); break;
    case 'escape': if (G.targeting) { G.targeting = null; log('取消施法。', 'sys'); } else UI.closeAll(); break;
    case 'tab': e.preventDefault(); autoNext(); break;
    case 'enter': UI.focusChat(); e.preventDefault(); break;
  }
}
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = VW * DPR; canvas.height = VH * DPR;
  canvas.style.width = VW + 'px'; canvas.style.height = VH + 'px';
}

// 本機伺服器：處理玩家指令（將來可移到伺服器端）
Net.on('move', (d) => setAction({ type: 'move', x: d.x, y: d.y }));
Net.on('attack', (d) => setAction({ type: 'attack', target: d.target, force: d.force }));
Net.on('cast', (d) => setAction({ type: 'cast', spell: d.spell, target: d.target }));
Net.on('pickup', (d) => setAction({ type: 'pickup', item: d.item }));
Net.on('talk', (d) => setAction({ type: 'talk', npc: d.npc }));
Net.on('portal', (d) => setAction({ type: 'portal', portal: d.portal }));

function enterWorld(saveData) {
  const p = loadPlayer(saveData);
  G.player = p;
  G.maps = {}; G.siege = null; G.raid = null; G.raidT = undefined; G.autoHunt = false;
  G.day = saveData.day || 0.3;
  setMap(saveData.mapId === 'crypt' ? 'crypt' : 'overworld');
  recalc(p);
  if (saveData.x && !G.world.blocked(saveData.x, saveData.y)) { p.x = saveData.x; p.y = saveData.y; }
  else { const t = G.world.towns[0] || { x: G.world.entry.x, y: G.world.entry.y - 2 }; const q = G.world.nearestFree(t.x + 1, t.y + 2); p.x = q.x; p.y = q.y; }
  if (ownsCastle()) { const m = getMap('overworld'); m.tower.ownerColor = '#7ad0ff'; }
  const ow = getMap('overworld').world;
  G.boards = ow.objs.filter((o) => o && o.kind === 'board').map((o) => ({ x: o.tx + 0.5, y: o.ty + 0.5, npc: getMap('overworld').npcs.find((n) => n.role === 'quest') }));
  const s = toScreen(p.x, p.y); G.cam.x = s.x; G.cam.y = s.y;
  zoneShown = '';
  G.running = true;
  UI.enterGame();
  log('歡迎來到' + GAME_TITLE + '，' + p.name + '！', 'sys');
  if (!saveData.playTime) {
    log('點擊地面移動，點擊怪物攻擊。數字鍵 1-0 使用快捷列，可以把背包或魔法視窗的圖示拖到快捷列。', 'sys');
    log('與晨風村的守備隊長 雷恩 對話可以接受委託。', 'npc');
  }
  Music.play('field');
  for (const inst of p.inv) if (inst.pet && inst.pet.out) { inst.pet.out = false; if (!companions('pet').length) spawnPet(inst); }
  UI.refresh();
}
function exitWorld() {
  saveGame(true);
  G.running = false; G.player = null;
  UI.closeAll();
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
  window.addEventListener('pointerdown', () => Snd.unlock(), true);
  window.addEventListener('keydown', () => Snd.unlock(), true);
  window.addEventListener('beforeunload', () => { if (G.running) saveGame(true); });
  buildTileTextures(); buildObjectSprites(); buildExtraSprites();
  UI.init();
  Scenes.init();
  requestAnimationFrame(frame);
});
