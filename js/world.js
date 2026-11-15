'use strict';
// ===== 世界：地圖生成（原創大陸＋地下城）=====
const TW = 64, TH = 32, HW = 32, HH = 16;
const TILE = { GRASS: 0, DARKGRASS: 1, DIRT: 2, COBBLE: 3, SOIL: 4, WATER: 5, SAND: 6, CANYON: 7, DESERT: 8, BRIDGE: 9, DUNGEON: 10, SEA: 11, SNOW: 12 };
const BIOME = { TOWN: 0, MEADOW: 1, FOREST: 2, BONE: 3, CANYON: 4, DESERT: 5, COAST: 6, CASTLE: 7, HIGHLAND: 8, PLAIN: 9, CRYPT: 10 };
const BIOME_INFO = [
  { name: '村莊' }, { name: '碧波草原' }, { name: '幽影森林' }, { name: '骸骨荒原' }, { name: '赤岩峽谷' },
  { name: '灰燼沙漠' }, { name: '銀砂海岸' }, { name: '灰岩城' }, { name: '霜嶺高地' }, { name: '灰岩平原' }, { name: '地下墓穴' },
];
const WATER_TILES = new Set([TILE.WATER, TILE.SEA]);

function toScreen(x, y) { return { x: (x - y) * HW, y: (x + y) * HH }; }
function toWorld(sx, sy) { return { x: (sx / HW + sy / HH) / 2, y: (sy / HH - sx / HW) / 2 }; }

class World {
  constructor(id, seed) {
    this.id = id; this.seed = seed;
    this.objs = []; this.decos = []; this.lights = [];
    this.towns = []; this.places = []; this.portals = []; this.npcSpots = []; this.gates = [];
    this.ambient = 0;
    if (id === 'crypt') this.genCrypt(); else this.genOverworld();
  }
  alloc(w, h) {
    this.w = w; this.h = h; const n = w * h;
    this.tiles = new Uint8Array(n); this.variant = new Uint8Array(n);
    this.blockArr = new Uint8Array(n); this.biome = new Uint8Array(n); this.safe = new Uint8Array(n);
    this.objGrid = new Int32Array(n).fill(-1); this.decoGrid = new Int32Array(n).fill(-1);
    this.road = new Uint8Array(n);
  }
  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  blocked(x, y) { x |= 0; y |= 0; return !this.inBounds(x, y) || this.blockArr[y * this.w + x] !== 0; }
  isSafe(x, y) { x |= 0; y |= 0; return this.inBounds(x, y) && this.safe[y * this.w + x] === 1; }
  biomeAt(x, y) { x |= 0; y |= 0; return this.inBounds(x, y) ? this.biome[y * this.w + x] : BIOME.MEADOW; }
  townAt(x, y) { for (const t of this.towns) if (dist(x, y, t.x, t.y) < t.r + 1) return t; return null; }
  zoneName(x, y) {
    const t = this.townAt(x, y); if (t) return t.name;
    for (const p of this.places) if (p.zone && dist(x, y, p.x, p.y) < p.zone) return p.name;
    return BIOME_INFO[this.biomeAt(x, y)].name;
  }
  addObj(o, blocks = true) {
    const k = this.idx(o.tx, o.ty);
    if (this.objGrid[k] >= 0) this.objs[this.objGrid[k]] = null;
    this.objGrid[k] = this.objs.length; this.objs.push(o);
    if (blocks) this.blockArr[k] = 1;
    return o;
  }
  removeObjAt(x, y) {
    if (!this.inBounds(x, y)) return;
    const k = this.idx(x, y), i = this.objGrid[k];
    if (i >= 0) { this.objs[i] = null; this.objGrid[k] = -1; }
    if (!WATER_TILES.has(this.tiles[k])) this.blockArr[k] = 0;
  }
  addDeco(x, y, kind, v) {
    const k = this.idx(x, y); if (this.decoGrid[k] >= 0) return;
    this.decoGrid[k] = this.decos.length;
    this.decos.push({ tx: x, ty: y, kind, v, ox: rand(-0.25, 0.25), oy: rand(-0.25, 0.25) });
  }
  setTile(x, y, t) { if (!this.inBounds(x, y)) return; const k = this.idx(x, y); this.tiles[k] = t; if (WATER_TILES.has(t)) this.blockArr[k] = 1; }
  clearArea(cx, cy, r, tile) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (!this.inBounds(x, y) || dist(x + 0.5, y + 0.5, cx, cy) > r) continue;
      this.removeObjAt(x, y);
      const k = this.idx(x, y); this.decoGrid[k] = -1;
      if (tile !== undefined) { this.tiles[k] = tile; this.blockArr[k] = 0; }
    }
  }
  carveRoad(x0, y0, x1, y1, R) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    const ph = R() * 10;
    for (let s = 0; s <= n; s++) {
      const t = s / n;
      const nx = -(y1 - y0) / n, ny = (x1 - x0) / n;
      const wob = Math.sin(t * Math.PI) * (Math.sin(t * 9 + ph) * 3 + Math.sin(t * 23 + ph) * 1.2);
      const x = Math.round(lerp(x0, x1, t) + nx * wob), y = Math.round(lerp(y0, y1, t) + ny * wob);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const tx = x + ox, ty = y + oy;
        if (tx < 4 || ty < 4 || tx >= this.w - 4 || ty >= this.h - 4) continue;
        const k = this.idx(tx, ty);
        if (this.tiles[k] === TILE.SEA) continue;
        this.removeObjAt(tx, ty);
        if (this.tiles[k] === TILE.WATER) { this.tiles[k] = TILE.BRIDGE; this.blockArr[k] = 0; }
        else if (this.safe[k]) { /* 村內保持石板 */ }
        else if (ox === 0 || oy === 0) this.tiles[k] = this.biome[k] === BIOME.HIGHLAND ? TILE.SNOW : TILE.DIRT;
        this.road[k] = 1; this.decoGrid[k] = -1;
      }
    }
  }
  floodReach(sx, sy) {
    const W = this.w, H = this.h, reach = new Uint8Array(W * H);
    const q = [sy * W + sx]; reach[q[0]] = 1;
    while (q.length) {
      const i = q.pop(), x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!this.inBounds(nx, ny)) continue;
        const j = ny * W + nx;
        if (!reach[j] && !this.blockArr[j]) { reach[j] = 1; q.push(j); }
      }
    }
    this.reach = reach;
    for (let i = 0; i < W * H; i++) if (!reach[i] && !this.blockArr[i]) this.blockArr[i] = 2;
  }
  randomFreeTile(filter, tries = 4000) {
    for (let t = 0; t < tries; t++) {
      const x = randi(4, this.w - 5), y = randi(4, this.h - 5), i = this.idx(x, y);
      if (this.blockArr[i] || !this.reach[i] || this.safe[i]) continue;
      if (filter && !filter(x, y)) continue;
      return { x, y };
    }
    return null;
  }
  nearestFree(x, y) {
    x |= 0; y |= 0;
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
      if (!this.blocked(x + dx, y + dy)) return { x: x + dx + 0.5, y: y + dy + 0.5 };
    return { x: x + 0.5, y: y + 0.5 };
  }

  // ================= 大陸 =================
  genOverworld() {
    this.alloc(200, 200);
    const S = this.seed, W = this.w, H = this.h, R = mulberry32(S);
    const seeds = [
      [BIOME.MEADOW, 100, 100], [BIOME.MEADOW, 86, 118], [BIOME.MEADOW, 118, 94], [BIOME.MEADOW, 108, 128], [BIOME.MEADOW, 124, 112],
      [BIOME.FOREST, 60, 82], [BIOME.FOREST, 70, 56], [BIOME.FOREST, 44, 100], [BIOME.FOREST, 48, 64], [BIOME.FOREST, 84, 70],
      [BIOME.HIGHLAND, 26, 30], [BIOME.HIGHLAND, 44, 22], [BIOME.HIGHLAND, 20, 52],
      [BIOME.CANYON, 118, 40], [BIOME.CANYON, 150, 28], [BIOME.CANYON, 176, 22], [BIOME.CANYON, 96, 24],
      [BIOME.PLAIN, 148, 72], [BIOME.PLAIN, 170, 84], [BIOME.PLAIN, 132, 82],
      [BIOME.DESERT, 172, 126], [BIOME.DESERT, 186, 152], [BIOME.DESERT, 160, 150], [BIOME.DESERT, 182, 104],
      [BIOME.BONE, 130, 162], [BIOME.BONE, 110, 174], [BIOME.BONE, 146, 182],
    ];
    // 河流折線
    this.river = [[70, 2], [78, 24], [83, 48], [80, 70], [86, 86], [80, 104], [70, 122], [60, 140], [50, 160]];
    const segDist = (x, y) => {
      let best = 1e9;
      for (let i = 0; i < this.river.length - 1; i++) {
        const [ax, ay] = this.river[i], [bx, by] = this.river[i + 1];
        const vx = bx - ax, vy = by - ay, t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0, 1);
        best = Math.min(best, Math.hypot(x - ax - vx * t, y - ay - vy * t));
      }
      return best;
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const wx = x + (fbm(x * 0.03, y * 0.03, S + 1) - 0.5) * 30, wy = y + (fbm(x * 0.03, y * 0.03, S + 2) - 0.5) * 30;
        let best = 0, bd = 1e9;
        for (const [b, sx, sy] of seeds) { const d = Math.hypot(wx - sx, wy - sy); if (d < bd) { bd = d; best = b; } }
        const coast = (y - x) + (fbm(x * 0.05, y * 0.05, S + 3) - 0.5) * 16;
        if (coast > 96) best = BIOME.COAST;
        this.biome[i] = best;
        const n1 = fbm(x * 0.08, y * 0.08, S + 11);
        let t;
        switch (best) {
          case BIOME.MEADOW: t = TILE.GRASS; break;
          case BIOME.PLAIN: t = n1 > 0.62 ? TILE.DIRT : TILE.GRASS; break;
          case BIOME.FOREST: t = n1 > 0.7 ? TILE.DIRT : TILE.DARKGRASS; break;
          case BIOME.BONE: t = n1 > 0.72 ? TILE.DIRT : TILE.SOIL; break;
          case BIOME.CANYON: t = n1 > 0.7 ? TILE.DIRT : TILE.CANYON; break;
          case BIOME.DESERT: t = TILE.DESERT; break;
          case BIOME.HIGHLAND: t = n1 > 0.66 ? TILE.CANYON : TILE.SNOW; break;
          case BIOME.COAST: t = coast > 104 ? TILE.SEA : TILE.SAND; break;
        }
        // 河流
        const rd = segDist(x + 0.5, y + 0.5) + (fbm(x * 0.1, y * 0.1, S + 7) - 0.5) * 1.5;
        if (best !== BIOME.COAST && rd < 1.9) t = TILE.WATER;
        else if (best !== BIOME.COAST && best !== BIOME.DESERT && rd < 3 && t !== TILE.SNOW) t = TILE.SAND;
        // 草原的湖
        if (best === BIOME.MEADOW && fbm(x * 0.045, y * 0.045, S + 9) > 0.7 && Math.hypot(x - 100, y - 100) > 20) t = TILE.WATER;
        // 綠洲
        if (best === BIOME.DESERT && Math.hypot(x - 178, y - 138) < 4 + fbm(x * 0.2, y * 0.2, S) * 2) t = TILE.WATER;
        this.tiles[i] = t;
        this.variant[i] = clamp(Math.floor(fbm(x * 0.12, y * 0.12, S + 77) * 6 + (R() - 0.5) * 1.6), 0, 5);
        if (WATER_TILES.has(t)) this.blockArr[i] = 1;
      }

    // 村莊與重要地點
    const town = (id, name, x, y, r, npcs, houses) => {
      const t = { id, name, x: x + 0.5, y: y + 0.5, r, npcs, houses };
      this.towns.push(t);
      for (let yy = y - r - 1; yy <= y + r + 1; yy++) for (let xx = x - r - 1; xx <= x + r + 1; xx++) {
        if (!this.inBounds(xx, yy)) continue;
        const d = dist(xx, yy, x, y), k = this.idx(xx, yy);
        if (d <= r + 0.5) { this.safe[k] = 1; this.biome[k] = BIOME.TOWN; this.tiles[k] = d < r - 2 ? TILE.COBBLE : TILE.GRASS; this.blockArr[k] = 0; }
      }
      this.places.push({ name, x, y, kind: 'town' });
      return t;
    };
    const towns = [
      town('dawn', '晨風村', 100, 100, 12, ['general', 'smith', 'magic', 'teleport', 'quest', 'clan', 'warehouse', 'pet', 'guard', 'guard'], 6),
      town('leaf', '林語村', 52, 74, 9, ['general', 'magic', 'teleport', 'warehouse', 'guard'], 4),
      town('port', '銀風港', 74, 146, 10, ['general', 'smith', 'jewel', 'teleport', 'warehouse', 'pet', 'guard'], 5),
      town('anvil', '鐵砧鎮', 158, 118, 9, ['general', 'smith', 'jewel', 'teleport', 'warehouse', 'guard'], 4),
    ];
    // 灰岩城
    const C = this.castle = { x0: 140, y0: 60, size: 22, name: '灰岩城' };
    C.cx = C.x0 + C.size / 2; C.cy = C.y0 + C.size / 2;
    this.places.push({ name: '灰岩城', x: C.cx, y: C.cy, kind: 'castle', zone: 14 });
    // 其他地點
    this.crypt = { x: 132, y: 166 };
    this.places.push({ name: '地下墓穴', x: this.crypt.x, y: this.crypt.y, kind: 'dungeon' });
    this.places.push({ name: '綠洲', x: 178, y: 138, kind: 'spot' });
    this.places.push({ name: '霜嶺高地', x: 30, y: 34, kind: 'spot' });

    // 道路
    const D = towns[0];
    this.carveRoad(D.x, D.y, towns[1].x, towns[1].y, R);
    this.carveRoad(D.x, D.y, towns[2].x, towns[2].y, R);
    this.carveRoad(D.x, D.y, towns[3].x, towns[3].y, R);
    this.carveRoad(D.x, D.y, C.x0 - 4, C.cy, R);
    this.carveRoad(towns[3].x, towns[3].y, C.cx, C.y0 + C.size + 3, R);
    this.carveRoad(D.x, D.y, this.crypt.x - 2, this.crypt.y - 2, R);
    this.carveRoad(D.x, D.y, 118, 42, R);
    this.carveRoad(towns[1].x, towns[1].y, 36, 36, R);
    this.carveRoad(towns[1].x, towns[1].y, towns[2].x, towns[2].y, R);

    // 物件
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (this.blockArr[i] || this.safe[i] || this.road[i]) continue;
        const b = this.biome[i], t = this.tiles[i];
        const border = x < 3 || y < 3 || x >= W - 3 || y >= H - 3;
        if (border) { if (t !== TILE.SEA) this.addObj({ kind: 'cliff', tx: x, ty: y, v: (R() * 4) | 0, style: b === BIOME.HIGHLAND ? 3 : b === BIOME.CANYON ? 0 : 1 }); continue; }
        const r = R();
        if (t === TILE.SAND) { if (r < 0.03) this.addDeco(x, y, 'pebble', 0); continue; }
        switch (b) {
          case BIOME.MEADOW: case BIOME.PLAIN:
            if (r < 0.022) this.addObj({ kind: 'tree', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.032) this.addObj({ kind: 'rock', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.12) this.addDeco(x, y, 'grass', (R() * 3) | 0);
            else if (r < 0.15) this.addDeco(x, y, 'flower', (R() * 3) | 0);
            break;
          case BIOME.FOREST: {
            const dens = fbm(x * 0.09, y * 0.09, S + 41);
            if (dens > 0.55 && r < 0.3) this.addObj({ kind: 'tree', tx: x, ty: y, v: 3 + ((R() * 3) | 0) });
            else if (r < 0.04) this.addObj({ kind: 'tree', tx: x, ty: y, v: 3 + ((R() * 3) | 0) });
            else if (r < 0.2) this.addDeco(x, y, 'grass', (R() * 3) | 0);
            else if (r < 0.23) this.addDeco(x, y, 'mushroom', 0);
            break;
          }
          case BIOME.BONE:
            if (r < 0.015) this.addObj({ kind: 'deadtree', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.025) this.addObj({ kind: 'tomb', tx: x, ty: y, v: (R() * 2) | 0 });
            else if (r < 0.033) this.addObj({ kind: 'cross', tx: x, ty: y, v: 0 });
            else if (r < 0.04) this.addObj({ kind: 'rock', tx: x, ty: y, v: 3 + ((R() * 2) | 0) });
            else if (r < 0.1) this.addDeco(x, y, 'bones', (R() * 3) | 0);
            break;
          case BIOME.CANYON: {
            const ridge = Math.abs(fbm(x * 0.05, y * 0.05, S + 21) - 0.5), ridge2 = Math.abs(fbm(x * 0.07, y * 0.07, S + 91) - 0.5);
            if (ridge < 0.028 || ridge2 < 0.014) this.addObj({ kind: 'cliff', tx: x, ty: y, v: (R() * 4) | 0, style: 0 });
            else if (r < 0.02) this.addObj({ kind: 'rock', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.025) this.addObj({ kind: 'deadtree', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.11) this.addDeco(x, y, 'rubble', (R() * 3) | 0);
            break;
          }
          case BIOME.DESERT:
            if (r < 0.012) this.addObj({ kind: 'cactus', tx: x, ty: y, v: (R() * 2) | 0 });
            else if (r < 0.02) this.addObj({ kind: 'rock', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.05) this.addDeco(x, y, 'bones', (R() * 3) | 0);
            else if (r < 0.08) this.addDeco(x, y, 'pebble', 0);
            break;
          case BIOME.HIGHLAND: {
            const ridge = Math.abs(fbm(x * 0.06, y * 0.06, S + 55) - 0.5);
            if (ridge < 0.03) this.addObj({ kind: 'cliff', tx: x, ty: y, v: (R() * 4) | 0, style: 3 });
            else if (r < 0.03) this.addObj({ kind: 'snowrock', tx: x, ty: y, v: 0 });
            else if (r < 0.05) this.addObj({ kind: 'deadtree', tx: x, ty: y, v: (R() * 3) | 0 });
            break;
          }
        }
      }
    // 河邊的樹
    // 村莊建設
    for (const t of towns) this.buildTown(t, R);
    this.buildCastle(R);
    // 港口的船
    this.addObj({ kind: 'ship', tx: 58, ty: 168, v: 0 }, false);
    // 地下墓穴入口
    this.clearArea(this.crypt.x + 0.5, this.crypt.y + 0.5, 3, TILE.SOIL);
    this.addObj({ kind: 'stairs', tx: this.crypt.x, ty: this.crypt.y, v: 0 }, false);
    this.portals.push({ x: this.crypt.x + 0.5, y: this.crypt.y + 0.5, to: 'crypt', label: '地下墓穴' });
    // 飛龍巢穴：峽谷最遠處
    let best = null, bd = 0;
    for (let y = 8; y < H - 8; y++) for (let x = 8; x < W - 8; x++)
      if (this.biome[y * W + x] === BIOME.CANYON) { const d = dist(x, y, 100, 100); if (d > bd) { bd = d; best = { x, y }; } }
    this.nest = best;
    this.clearArea(best.x + 0.5, best.y + 0.5, 6, TILE.CANYON);
    this.carveRoad(best.x, best.y, 118, 42, R);
    this.places.push({ name: '飛龍巢穴', x: best.x, y: best.y, kind: 'boss', zone: 9 });
    for (let k = 0; k < 14; k++) this.addDeco(best.x + randi(-5, 5), best.y + randi(-5, 5), 'bones', randi(0, 2));
    // 可達性
    this.floodReach(100, 103);
  }

  buildTown(t, R) {
    const cx = Math.floor(t.x), cy = Math.floor(t.y);
    // 房屋：繞中心擺放
    const placed = [];
    let tries = 0;
    while (placed.length < t.houses && tries++ < 400) {
      const a = R() * Math.PI * 2, d = t.r * (0.45 + R() * 0.35);
      const hx = Math.round(cx + Math.cos(a) * d) - 1, hy = Math.round(cy + Math.sin(a) * d) - 1;
      let ok = true;
      for (let y = hy - 1; y < hy + 4 && ok; y++) for (let x = hx - 1; x < hx + 4 && ok; x++) {
        const k = this.idx(x, y);
        if (!this.safe[k] || this.road[k] || this.blockArr[k] || WATER_TILES.has(this.tiles[k])) ok = false;
      }
      for (const p of placed) if (Math.abs(p[0] - hx) < 5 && Math.abs(p[1] - hy) < 5) ok = false;
      if (dist(hx + 1, hy + 1, cx, cy) < 4) ok = false;
      if (!ok) continue;
      placed.push([hx, hy]);
      for (let y = hy; y < hy + 3; y++) for (let x = hx; x < hx + 3; x++) { this.removeObjAt(x, y); this.blockArr[this.idx(x, y)] = 1; }
      const o = { kind: 'house', tx: hx + 1, ty: hy + 1, v: (R() * 3) | 0 };
      this.objGrid[this.idx(hx + 1, hy + 1)] = this.objs.length; this.objs.push(o);
    }
    // 中央篝火與路燈
    this.removeObjAt(cx, cy);
    this.addObj({ kind: 'brazier', tx: cx, ty: cy, v: 0 });
    this.lights.push({ x: cx + 0.5, y: cy + 0.5, r: 260 });
    for (const [lx, ly] of [[-4, -1], [4, 1], [1, -4], [-1, 4]]) {
      if (this.blocked(cx + lx, cy + ly)) continue;
      this.addObj({ kind: 'lamp', tx: cx + lx, ty: cy + ly, v: 0 });
      this.lights.push({ x: cx + lx + 0.5, y: cy + ly + 0.5, r: 170 });
    }
    // 告示板（只有晨風村）
    if (t.id === 'dawn' && !this.blocked(cx + 2, cy - 2)) this.addObj({ kind: 'board', tx: cx + 2, ty: cy - 2, v: 0 });
    // 木箱點綴
    for (let k = 0; k < 3; k++) {
      const a = R() * 7, d = t.r - 2;
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (!this.blocked(x, y) && !this.road[this.idx(x, y)]) this.addObj({ kind: 'crate', tx: x, ty: y, v: 0 });
    }
    // NPC 站位：在廣場周圍找空格
    t.spots = [];
    const ring = [];
    for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 6; x++) {
      const d = dist(x, y, cx, cy);
      if (d >= 2.5 && d <= 6 && !this.blocked(x, y) && !this.blocked(x + 1, y) && !this.blocked(x, y + 1)) ring.push({ x: x + 0.5, y: y + 0.5, a: Math.atan2(y - cy, x - cx), d });
    }
    ring.sort((a, b) => a.a - b.a);
    const step = Math.max(1, Math.floor(ring.length / t.npcs.length));
    for (let k = 0; k < t.npcs.length; k++) t.spots.push(ring[(k * step) % ring.length]);
  }

  buildCastle(R) {
    const C = this.castle, n = C.size;
    // 清空並鋪石板
    for (let y = C.y0 - 3; y <= C.y0 + n + 3; y++) for (let x = C.x0 - 3; x <= C.x0 + n + 3; x++) {
      this.removeObjAt(x, y); const k = this.idx(x, y); this.decoGrid[k] = -1;
      if (WATER_TILES.has(this.tiles[k])) { this.tiles[k] = TILE.DIRT; this.blockArr[k] = 0; }
      const inside = x >= C.x0 && x < C.x0 + n && y >= C.y0 && y < C.y0 + n;
      if (inside) { this.tiles[k] = TILE.COBBLE; this.biome[k] = BIOME.CASTLE; }
    }
    C.gate = [];
    for (let i = 0; i < n; i++) {
      for (const [x, y] of [[C.x0 + i, C.y0], [C.x0 + i, C.y0 + n - 1], [C.x0, C.y0 + i], [C.x0 + n - 1, C.y0 + i]]) {
        const isGate = x === C.x0 && Math.abs(y - (C.y0 + n / 2)) <= 1.01;
        if (isGate) { C.gate.push({ x, y }); continue; }
        this.addObj({ kind: 'wall', tx: x, ty: y, v: (R() * 2) | 0 });
      }
    }
    // 內堡（大房子）與守護塔位置
    const kx = C.x0 + n - 6, ky = Math.floor(C.cy) - 1;
    for (let y = ky; y < ky + 3; y++) for (let x = kx; x < kx + 3; x++) { this.removeObjAt(x, y); this.blockArr[this.idx(x, y)] = 1; }
    const o = { kind: 'house', tx: kx + 1, ty: ky + 1, v: 1, big: true };
    this.objGrid[this.idx(kx + 1, ky + 1)] = this.objs.length; this.objs.push(o);
    C.tower = { x: C.x0 + n - 9.5, y: C.cy + 0.5 };
    C.herald = { x: C.x0 - 2.5, y: C.cy - 3.5 };
    C.guardSpots = [];
    for (let k = 0; k < 8; k++) C.guardSpots.push({ x: C.x0 + 3 + R() * (n - 8), y: C.y0 + 3 + R() * (n - 6) });
    for (const [lx, ly] of [[3, 3], [3, n - 4], [n - 4, 3], [n - 4, n - 4]]) {
      this.addObj({ kind: 'lamp', tx: C.x0 + lx, ty: C.y0 + ly, v: 0 });
      this.lights.push({ x: C.x0 + lx + 0.5, y: C.y0 + ly + 0.5, r: 170 });
    }
    this.addObj({ kind: 'brazier', tx: C.x0 - 2, ty: Math.floor(C.cy) + 3, v: 0 });
    this.lights.push({ x: C.x0 - 1.5, y: C.cy + 3.5, r: 220 });
  }

  // ================= 地下墓穴 =================
  genCrypt() {
    this.alloc(90, 90);
    this.ambient = 0.62;
    const W = this.w, H = this.h, R = mulberry32(this.seed + 99);
    let g = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = R() < 0.44 ? 1 : 0;
    const wall = (x, y) => x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || g[y * W + x];
    for (let it = 0; it < 5; it++) {
      const ng = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (wall(x + dx, y + dy)) c++;
        ng[y * W + x] = c >= 5 ? 1 : 0;
      }
      g = ng;
    }
    // 開鑿主通道，確保連通
    let px = 8, py = 45;
    const pts = [[8, 45], [30, 30], [45, 60], [62, 28], [80, 50]];
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay));
      for (let k = 0; k <= n; k++) {
        const x = Math.round(lerp(ax, bx, k / n)), y = Math.round(lerp(ay, by, k / n));
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (x + ox > 2 && y + oy > 2 && x + ox < W - 3 && y + oy < H - 3) g[(y + oy) * W + x + ox] = 0;
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      this.biome[i] = BIOME.CRYPT;
      this.tiles[i] = TILE.DUNGEON;
      this.variant[i] = (R() * 6) | 0;
      if (wall(x, y)) {
        // 只在靠近通道處放牆方塊，其餘留黑
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (!wall(x + dx, y + dy)) { near = true; break; }
        if (near) this.addObj({ kind: 'cliff', tx: x, ty: y, v: (R() * 4) | 0, style: 2 });
        else { this.blockArr[i] = 1; this.tiles[i] = 255; }
      } else if (R() < 0.06) this.addDeco(x, y, 'bones', (R() * 3) | 0);
      else if (R() < 0.04) this.addDeco(x, y, 'rubble', (R() * 3) | 0);
    }
    this.entry = { x: px + 0.5, y: py + 0.5 };
    this.clearArea(px + 0.5, py + 0.5, 2.5, TILE.DUNGEON);
    this.addObj({ kind: 'stairsup', tx: px - 1, ty: py, v: 0 }, true);
    this.portals.push({ x: px - 0.5, y: py + 0.5, to: 'overworld', label: '回到地面' });
    this.lights.push({ x: px + 0.5, y: py + 0.5, r: 220 });
    this.floodReach(px, py);
    // 火把
    for (let k = 0; k < 40; k++) {
      const x = randi(4, W - 5), y = randi(4, H - 5), i = this.idx(x, y);
      if (this.blockArr[i] || !this.reach[i]) continue;
      if (!this.blocked(x - 1, y) && !this.blocked(x, y - 1)) continue;
      this.addObj({ kind: 'torch', tx: x, ty: y, v: 0 }, false);
      this.lights.push({ x: x + 0.5, y: y + 0.5, r: 190, torch: true });
    }
    // 領主之間：最遠的可達點
    let best = null, bd = 0;
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (this.reach[this.idx(x, y)]) { const d = dist(x, y, px, py); if (d > bd) { bd = d; best = { x, y }; } }
    this.bossRoom = best;
    this.places.push({ name: '領主之間', x: best.x, y: best.y, kind: 'boss', zone: 7 });
    this.lights.push({ x: best.x + 0.5, y: best.y + 0.5, r: 260 });
  }
}
