'use strict';
// ===== 世界：地圖生成、地表貼圖、靜態物件 =====
const TW = 64, TH = 32, HW = 32, HH = 16;
const TILE = { GRASS: 0, DARKGRASS: 1, DIRT: 2, COBBLE: 3, SOIL: 4, WATER: 5, SAND: 6, CANYON: 7 };
const REGION = { TOWN: 0, MEADOW: 1, FOREST: 2, BONE: 3, CANYON: 4 };
const REGION_INFO = [
  { name: '晨風村', safe: true, mm: '#b9ab92' },
  { name: '碧波草原', mm: '#6f9a46' },
  { name: '幽影森林', mm: '#3e6a32' },
  { name: '骸骨荒原', mm: '#5b4a3a' },
  { name: '赤岩峽谷', mm: '#a07850' },
];

function toScreen(x, y) { return { x: (x - y) * HW, y: (x + y) * HH }; }
function toWorld(sx, sy) { return { x: (sx / HW + sy / HH) / 2, y: (sy / HH - sx / HW) / 2 }; }

class World {
  constructor(seed) {
    this.seed = seed;
    this.w = 160; this.h = 160;
    this.cx = 80; this.cy = 80;
    const n = this.w * this.h;
    this.tiles = new Uint8Array(n);
    this.variant = new Uint8Array(n);
    this.blockArr = new Uint8Array(n);
    this.region = new Uint8Array(n);
    this.objGrid = new Int32Array(n).fill(-1);
    this.decoGrid = new Int32Array(n).fill(-1);
    this.objs = [];
    this.decos = [];
    this.lights = [];
    this.generate();
  }
  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  blocked(x, y) { x |= 0; y |= 0; return !this.inBounds(x, y) || this.blockArr[y * this.w + x] !== 0; }
  isSafe(x, y) { x |= 0; y |= 0; return this.inBounds(x, y) && this.region[y * this.w + x] === REGION.TOWN; }
  regionAt(x, y) { x |= 0; y |= 0; return this.inBounds(x, y) ? this.region[y * this.w + x] : REGION.CANYON; }
  zoneName(x, y) {
    const r = this.regionAt(x, y);
    if (r === REGION.CANYON && dist(x, y, this.nest.x, this.nest.y) < 12) return '飛龍巢穴';
    return REGION_INFO[r].name;
  }

  addObj(o, blocks = true) {
    const i = this.objs.length; this.objs.push(o);
    this.objGrid[this.idx(o.tx, o.ty)] = i;
    if (blocks) this.blockArr[this.idx(o.tx, o.ty)] = 1;
    return o;
  }
  removeObjAt(x, y) {
    const k = this.idx(x, y); const i = this.objGrid[k];
    if (i >= 0) { this.objs[i] = null; this.objGrid[k] = -1; }
    this.blockArr[k] = 0;
  }
  addDeco(x, y, kind, v) {
    const k = this.idx(x, y);
    if (this.decoGrid[k] >= 0) return;
    this.decoGrid[k] = this.decos.length;
    this.decos.push({ tx: x, ty: y, kind, v, ox: rand(-0.25, 0.25), oy: rand(-0.25, 0.25) });
  }

  generate() {
    const S = this.seed, W = this.w, H = this.h, cx = this.cx, cy = this.cy;
    const R = mulberry32(S);
    // 區域與地表
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
        const warp = (fbm(x * 0.035, y * 0.035, S + 5) - 0.5) * 1.1;
        let ang = Math.atan2(dy, dx) + warp;
        ang = (ang + Math.PI * 4) % (Math.PI * 2);
        let reg;
        if (d < 14 + (fbm(x * 0.1, y * 0.1, S + 3) - 0.5) * 3) reg = REGION.TOWN;
        else {
          const sec = Math.floor(ang / (Math.PI / 2)) % 4;
          reg = [REGION.BONE, REGION.MEADOW, REGION.FOREST, REGION.CANYON][sec];
        }
        this.region[i] = reg;
        const n1 = fbm(x * 0.08, y * 0.08, S + 11);
        let t;
        switch (reg) {
          case REGION.TOWN: t = d < 10.5 ? TILE.COBBLE : TILE.GRASS; break;
          case REGION.MEADOW: {
            const lake = fbm(x * 0.045, y * 0.045, S + 9);
            if (d > 22 && lake > 0.64) t = TILE.WATER;
            else if (d > 22 && lake > 0.6) t = TILE.SAND;
            else t = TILE.GRASS;
            break;
          }
          case REGION.FOREST: t = n1 > 0.7 ? TILE.DIRT : TILE.DARKGRASS; break;
          case REGION.BONE: t = n1 > 0.72 ? TILE.DIRT : TILE.SOIL; break;
          default: t = n1 > 0.7 ? TILE.DIRT : TILE.CANYON;
        }
        this.tiles[i] = t;
        // 用平滑噪聲選貼圖變化，避免格狀感
        const vn = fbm(x * 0.12, y * 0.12, S + 77);
        this.variant[i] = clamp(Math.floor(vn * 6 + (R() - 0.5) * 1.6), 0, 5);
        if (t === TILE.WATER) this.blockArr[i] = 1;
      }

    // 道路（村莊通往四個區域）
    const roadDirs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    this.roadEnds = [];
    for (const [ddx, ddy] of roadDirs) {
      let a = Math.atan2(ddy, ddx);
      let x = cx, y = cy;
      for (let s = 0; s < 70; s++) {
        a += (fbm(s * 0.08, ddx * 3 + ddy, S + 31) - 0.5) * 0.18;
        x += Math.cos(a); y += Math.sin(a);
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            const tx = Math.round(x) + ox, ty = Math.round(y) + oy;
            if (tx < 4 || ty < 4 || tx >= W - 4 || ty >= H - 4) continue;
            const k = ty * W + tx;
            this.blockArr[k] = 0;
            if (this.tiles[k] === TILE.WATER) this.tiles[k] = TILE.SAND;
            if (this.region[k] !== REGION.TOWN && (ox === 0 || oy === 0)) this.tiles[k] = TILE.DIRT;
            this.roadMask = this.roadMask || new Uint8Array(W * H);
            this.roadMask[k] = 1;
          }
      }
      this.roadEnds.push({ x: Math.round(x), y: Math.round(y) });
    }

    // 物件
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (this.blockArr[i] && this.tiles[i] === TILE.WATER) continue;
        const border = x < 3 || y < 3 || x >= W - 3 || y >= H - 3;
        const reg = this.region[i];
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const road = this.roadMask[i];
        if (border) { this.addObj({ kind: 'cliff', tx: x, ty: y, v: (R() * 4) | 0, style: reg === REGION.CANYON ? 0 : 1 }); continue; }
        if (road) continue;
        const r = R();
        switch (reg) {
          case REGION.TOWN:
            if (d > 11.5 && r < 0.05) this.addObj({ kind: 'tree', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (d < 10 && r < 0.02) this.addDeco(x, y, 'flower', (R() * 3) | 0);
            break;
          case REGION.MEADOW:
            if (this.tiles[i] === TILE.SAND || this.tiles[i] === TILE.WATER) { if (r < 0.03) this.addDeco(x, y, 'pebble', 0); break; }
            if (r < 0.025) this.addObj({ kind: 'tree', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.035) this.addObj({ kind: 'rock', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.12) this.addDeco(x, y, 'grass', (R() * 3) | 0);
            else if (r < 0.15) this.addDeco(x, y, 'flower', (R() * 3) | 0);
            break;
          case REGION.FOREST: {
            const dens = fbm(x * 0.09, y * 0.09, S + 41);
            if (dens > 0.55 && r < 0.3) this.addObj({ kind: 'tree', tx: x, ty: y, v: 3 + ((R() * 3) | 0) });
            else if (r < 0.035) this.addObj({ kind: 'tree', tx: x, ty: y, v: 3 + ((R() * 3) | 0) });
            else if (r < 0.2) this.addDeco(x, y, 'grass', (R() * 3) | 0);
            else if (r < 0.23) this.addDeco(x, y, 'mushroom', 0);
            break;
          }
          case REGION.BONE:
            if (r < 0.015) this.addObj({ kind: 'deadtree', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.025) this.addObj({ kind: 'tomb', tx: x, ty: y, v: (R() * 2) | 0 });
            else if (r < 0.033) this.addObj({ kind: 'cross', tx: x, ty: y, v: 0 });
            else if (r < 0.04) this.addObj({ kind: 'rock', tx: x, ty: y, v: 3 + ((R() * 2) | 0) });
            else if (r < 0.1) this.addDeco(x, y, 'bones', (R() * 3) | 0);
            else if (r < 0.13) this.addDeco(x, y, 'pebble', 0);
            break;
          case REGION.CANYON: {
            const ridge = Math.abs(fbm(x * 0.05, y * 0.05, S + 21) - 0.5);
            const ridge2 = Math.abs(fbm(x * 0.07, y * 0.07, S + 91) - 0.5);
            if (d > 20 && (ridge < 0.028 || ridge2 < 0.014)) this.addObj({ kind: 'cliff', tx: x, ty: y, v: (R() * 4) | 0, style: 0 });
            else if (r < 0.02) this.addObj({ kind: 'rock', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.025) this.addObj({ kind: 'deadtree', tx: x, ty: y, v: (R() * 3) | 0 });
            else if (r < 0.11) this.addDeco(x, y, 'rubble', (R() * 3) | 0);
            else if (r < 0.13) this.addDeco(x, y, 'bones', (R() * 3) | 0);
            break;
          }
        }
      }

    // 村莊建築
    const houses = [[-3, -11], [3, -11], [-11, -3], [7, 1], [-3, 7], [8, -5]];
    for (const [hx, hy] of houses) {
      const ox = cx + hx, oy = cy + hy;
      for (let y = oy; y < oy + 3; y++) for (let x = ox; x < ox + 3; x++) { this.removeObjAt(x, y); this.blockArr[this.idx(x, y)] = 1; }
      const o = { kind: 'house', tx: ox + 1, ty: oy + 1, v: (R() * 3) | 0 };
      this.objs.push(o); this.objGrid[this.idx(ox + 1, oy + 1)] = this.objs.length - 1;
    }
    // 中央篝火、路燈
    this.removeObjAt(cx, cy);
    this.addObj({ kind: 'brazier', tx: cx, ty: cy, v: 0 });
    this.lights.push({ x: cx + 0.5, y: cy + 0.5, r: 260 });
    for (const [lx, ly] of [[-4, -1], [4, 1], [1, -5], [-1, 4]]) {
      this.removeObjAt(cx + lx, cy + ly);
      this.addObj({ kind: 'lamp', tx: cx + lx, ty: cy + ly, v: 0 });
      this.lights.push({ x: cx + lx + 0.5, y: cy + ly + 0.5, r: 170 });
    }
    // 告示板
    this.removeObjAt(cx + 2, cy - 2);
    this.addObj({ kind: 'board', tx: cx + 2, ty: cy - 2, v: 0 });

    // 飛龍巢穴（峽谷最深處）
    let best = null, bd = 0;
    for (let y = 6; y < H - 6; y++)
      for (let x = 6; x < W - 6; x++)
        if (this.region[y * W + x] === REGION.CANYON) {
          const d = Math.hypot(x - cx, y - cy);
          if (d > bd && d < 72) { bd = d; best = { x, y }; }
        }
    this.nest = best;
    for (let y = best.y - 6; y <= best.y + 6; y++)
      for (let x = best.x - 6; x <= best.x + 6; x++) {
        if (!this.inBounds(x, y) || x < 3 || y < 3 || x >= W - 3 || y >= H - 3) continue;
        const d = Math.hypot(x - best.x, y - best.y);
        if (d < 5.5) { this.removeObjAt(x, y); this.tiles[this.idx(x, y)] = TILE.CANYON; if (R() < 0.15) this.addDeco(x, y, 'bones', (R() * 3) | 0); }
      }
    // 巢穴通往道路
    this.carveLine(best.x, best.y, this.roadEnds[3].x, this.roadEnds[3].y);

    // 可達性：從村莊 flood fill，封閉無法到達的空地
    const reach = new Uint8Array(W * H);
    const q = [cy * W + cx + 2];
    reach[q[0]] = 1;
    while (q.length) {
      const i = q.pop(); const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!this.inBounds(nx, ny)) continue;
        const j = ny * W + nx;
        if (!reach[j] && !this.blockArr[j]) { reach[j] = 1; q.push(j); }
      }
    }
    this.reach = reach;
    for (let i = 0; i < W * H; i++) if (!reach[i] && !this.blockArr[i]) this.blockArr[i] = 2;
  }

  carveLine(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= n; s++) {
      const x = Math.round(lerp(x0, x1, s / n)), y = Math.round(lerp(y0, y1, s / n));
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const tx = x + ox, ty = y + oy;
        if (tx < 3 || ty < 3 || tx >= this.w - 3 || ty >= this.h - 3) continue;
        this.removeObjAt(tx, ty);
        if (this.tiles[this.idx(tx, ty)] === TILE.WATER) this.tiles[this.idx(tx, ty)] = TILE.SAND;
      }
    }
  }

  randomFreeTile(filter, tries = 3000) {
    for (let t = 0; t < tries; t++) {
      const x = randi(4, this.w - 5), y = randi(4, this.h - 5);
      const i = this.idx(x, y);
      if (this.blockArr[i] || !this.reach[i]) continue;
      if (filter && !filter(x, y)) continue;
      return { x, y };
    }
    return null;
  }
}

// ===== 地表貼圖 =====
const TEX = {};
function diamondPath(ctx, w, h) {
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w, h / 2); ctx.lineTo(w / 2, h); ctx.lineTo(0, h / 2); ctx.closePath();
}
function buildTileTextures() {
  const defs = {
    [TILE.GRASS]: { base: ['#5d7a33', '#617f36', '#66853a', '#6a883b', '#6e8c3e', '#729142'], fleck: ['#7fa04a', '#4d6a2a', '#88a852'], blades: true },
    [TILE.DARKGRASS]: { base: ['#3f5a28', '#425e2a', '#46622c', '#4a662e', '#4d6a31', '#516e33'], fleck: ['#5f7e3a', '#33491f', '#6a8a40'], blades: true },
    [TILE.DIRT]: { base: ['#7c6447', '#80684a', '#856c4d', '#8a7150', '#8e7553', '#937a57'], fleck: ['#6a533a', '#9c8462', '#5c4732'], pebbles: true },
    [TILE.COBBLE]: { base: ['#6d6559', '#71695c', '#756c5f', '#787062', '#7c7466', '#80786a'], cobble: true },
    [TILE.SOIL]: { base: ['#3e3328', '#42362a', '#46392c', '#493c2e', '#4c3f30', '#504233'], fleck: ['#2f261d', '#5a4b39', '#625240'], pebbles: true },
    [TILE.WATER]: { base: ['#24506e', '#25536f', '#275672', '#285874', '#2a5b77', '#2c5e79'], water: true },
    [TILE.SAND]: { base: ['#b29d74', '#b5a077', '#b8a37a', '#bba67d', '#bea980', '#c1ac83'], fleck: ['#a08b62', '#cbb88f'] },
    [TILE.CANYON]: { base: ['#76624c', '#7a654e', '#7e6951', '#826c53', '#866f56', '#8a7359'], fleck: ['#655341', '#968066', '#5a4a3a', '#a08a70'], pebbles: true },
  };
  for (const k in defs) {
    const d = defs[k]; TEX[k] = [];
    for (let v = 0; v < 6; v++) {
      const c = makeCanvas(TW + 2, TH + 2);
      const g = c.getContext('2d');
      const R = mulberry32(k * 100 + v * 7 + 1);
      g.translate(1, 1);
      g.save();
      diamondPath(g, TW, TH); g.clip();
      g.fillStyle = d.base[v]; g.fillRect(-2, -2, TW + 4, TH + 4);
      if (d.fleck) for (let i = 0; i < 70; i++) {
        g.fillStyle = d.fleck[(R() * d.fleck.length) | 0];
        g.globalAlpha = 0.35 + R() * 0.4;
        g.fillRect(R() * TW, R() * TH, 1 + R() * 2, 1 + R() * 1.5);
      }
      g.globalAlpha = 1;
      if (d.blades) for (let i = 0; i < 26; i++) {
        const x = R() * TW, y = R() * TH;
        g.strokeStyle = R() < 0.5 ? '#86a957' : '#3d5622'; g.globalAlpha = 0.5;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - 2 - R() * 3); g.stroke();
      }
      if (d.pebbles) for (let i = 0; i < 5; i++) {
        const x = R() * TW, y = R() * TH, r = 0.8 + R() * 1.6;
        g.globalAlpha = 0.7; g.fillStyle = 'rgba(30,22,15,0.5)';
        g.beginPath(); g.ellipse(x + 0.6, y + 0.6, r, r * 0.6, 0, 0, 7); g.fill();
        g.fillStyle = rgbJitter('#9b8a74', 25, R);
        g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
      }
      if (d.cobble) {
        for (let i = 0; i < 16; i++) {
          const x = R() * TW, y = R() * TH, rx = 5 + R() * 4, ry = rx * 0.5;
          g.globalAlpha = 1;
          g.fillStyle = rgbJitter('#8a8274', 18, R);
          g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
          g.strokeStyle = 'rgba(40,35,28,0.55)'; g.lineWidth = 1; g.stroke();
          g.fillStyle = 'rgba(255,255,240,0.12)'; g.beginPath(); g.ellipse(x - 1, y - 1, rx * 0.6, ry * 0.5, 0, 0, 7); g.fill();
        }
      }
      if (d.water) {
        g.globalAlpha = 0.3;
        for (let i = 0; i < 6; i++) {
          g.strokeStyle = '#7fb3d0';
          const x = R() * TW, y = R() * TH;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - 2, x + 9, y); g.stroke();
        }
      }
      g.restore();
      TEX[k].push(c);
    }
  }
}

// ===== 靜態物件精靈（預先繪製）=====
const SPR = {};
function spr(key, w, h, ax, ay, fn) {
  const c = makeCanvas(w, h); const g = c.getContext('2d');
  fn(g, w, h);
  SPR[key] = { c, ax, ay };
}
function buildObjectSprites() {
  // 樹（0-2 一般綠樹，3-5 森林深色樹）
  const treeCols = [
    ['#4f7a2f', '#6a9a3e', '#3a5c22'], ['#5a8434', '#78a648', '#3f6326'], ['#4a7430', '#5f8d3c', '#34561f'],
    ['#2f5228', '#426b35', '#203a1b'], ['#355a2b', '#4b7a3a', '#22401d'], ['#2c4d2a', '#3e6638', '#1d361b'],
  ];
  for (let v = 0; v < 6; v++) {
    const big = v >= 3;
    const w = big ? 120 : 100, h = big ? 170 : 130;
    spr('tree' + v, w, h, w / 2, h - 12, (g) => {
      const R = mulberry32(500 + v);
      const [mid, hi, lo] = treeCols[v];
      const bx = w / 2, by = h - 12;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(bx + 8, by, 34, 13, 0, 0, 7); g.fill();
      // 樹幹
      const tg = g.createLinearGradient(bx - 7, 0, bx + 7, 0); tg.addColorStop(0, '#3b2a1b'); tg.addColorStop(0.5, '#6b4c30'); tg.addColorStop(1, '#2e2015');
      g.fillStyle = tg;
      g.beginPath(); g.moveTo(bx - 8, by); g.lineTo(bx - 4, by - (big ? 70 : 52)); g.lineTo(bx + 4, by - (big ? 70 : 52)); g.lineTo(bx + 9, by); g.closePath(); g.fill();
      // 樹冠
      const top = by - (big ? 100 : 76);
      const blobs = [];
      for (let i = 0; i < 22; i++) {
        const a = R() * Math.PI * 2, rr = R();
        blobs.push({ x: bx + Math.cos(a) * rr * (big ? 40 : 34), y: top + Math.sin(a) * rr * (big ? 44 : 30), r: (big ? 18 : 15) + R() * 10 });
      }
      blobs.sort((a, b) => a.y - b.y);
      for (const b of blobs) {
        g.fillStyle = lo; g.beginPath(); g.arc(b.x + 2, b.y + 3, b.r, 0, 7); g.fill();
      }
      for (const b of blobs) {
        const gr = g.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.5, 2, b.x, b.y, b.r);
        gr.addColorStop(0, hi); gr.addColorStop(0.7, mid); gr.addColorStop(1, lo);
        g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r * 0.92, 0, 7); g.fill();
      }
      for (let i = 0; i < 90; i++) {
        g.fillStyle = R() < 0.5 ? hi : lo; g.globalAlpha = 0.5;
        g.fillRect(bx - 45 + R() * 90, top - 40 + R() * 80, 2, 2);
      }
      g.globalAlpha = 1;
    });
  }
  // 枯樹
  for (let v = 0; v < 3; v++) {
    spr('deadtree' + v, 90, 130, 45, 118, (g) => {
      const R = mulberry32(900 + v);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(50, 118, 22, 8, 0, 0, 7); g.fill();
      g.lineCap = 'round';
      const branch = (x, y, a, len, wdt, depth) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.strokeStyle = depth > 2 ? '#3a2e24' : '#4a3b2e'; g.lineWidth = wdt;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        if (depth < 4) {
          branch(x2, y2, a - 0.4 - R() * 0.4, len * 0.68, wdt * 0.62, depth + 1);
          if (R() < 0.8) branch(x2, y2, a + 0.35 + R() * 0.4, len * 0.6, wdt * 0.6, depth + 1);
        }
      };
      branch(45, 118, -Math.PI / 2 + (R() - 0.5) * 0.2, 42, 9, 0);
    });
  }
  // 岩石 (0-2 峽谷/草原，3-4 荒原暗色)
  const rockCols = ['#857560', '#8a7d6c', '#7b6e5c', '#5c534b', '#655b51'];
  for (let v = 0; v < 5; v++) {
    spr('rock' + v, 90, 70, 45, 52, (g) => {
      const R = mulberry32(300 + v);
      g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(50, 54, 34, 12, 0, 0, 7); g.fill();
      const n = 3 + ((R() * 3) | 0);
      for (let k = 0; k < n; k++) {
        const cx = 45 + (R() - 0.5) * 36, cy = 46 + (R() - 0.5) * 10, r = 12 + R() * 12;
        const pts = []; const m = 9;
        for (let i = 0; i < m; i++) { const a = (i / m) * Math.PI * 2; const rr = r * (0.75 + R() * 0.35); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7 - (Math.sin(a) < 0 ? r * 0.3 : 0)]); }
        const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        gr.addColorStop(0, shade(rockCols[v], 0.25)); gr.addColorStop(0.6, rockCols[v]); gr.addColorStop(1, shade(rockCols[v], -0.45));
        g.fillStyle = gr; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(30,25,20,0.5)'; g.lineWidth = 1; g.stroke();
        for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(30,25,20,0.35)'; g.beginPath(); const sx = cx + (R() - 0.5) * r; g.moveTo(sx, cy - r * 0.4); g.lineTo(sx + (R() - 0.5) * 8, cy + r * 0.3); g.stroke(); }
      }
    });
  }
  // 峭壁方塊（立體岩壁）
  const cliffStyles = [
    { top: '#7f6c56', side1: '#5d4d3c', side2: '#4a3d30', lump: '#8a7862' },
    { top: '#6c6a5e', side1: '#4f4c43', side2: '#3c3a33', lump: '#7a776a' },
  ];
  for (let s = 0; s < 2; s++)
    for (let v = 0; v < 4; v++) {
      const Hh = 30 + v * 6;
      const extra = 26;
      spr('cliff' + s + '_' + v, TW + 8, TH + Hh + extra, (TW + 8) / 2, Hh + extra + TH / 2, (g) => {
        const R = mulberry32(700 + s * 10 + v);
        const st = cliffStyles[s];
        g.translate(4, extra);
        // 左面
        g.fillStyle = st.side1;
        g.beginPath(); g.moveTo(0, TH / 2); g.lineTo(HW, TH); g.lineTo(HW, TH + Hh); g.lineTo(0, TH / 2 + Hh); g.closePath(); g.fill();
        // 右面
        g.fillStyle = st.side2;
        g.beginPath(); g.moveTo(TW, TH / 2); g.lineTo(HW, TH); g.lineTo(HW, TH + Hh); g.lineTo(TW, TH / 2 + Hh); g.closePath(); g.fill();
        // 裂紋
        for (let i = 0; i < 10; i++) {
          g.strokeStyle = 'rgba(20,15,10,0.4)'; g.lineWidth = 1;
          const x = R() * TW, y0 = TH / 2 + R() * Hh * 0.6 + (x < HW ? x / 2 : (TW - x) / 2);
          g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (R() - 0.5) * 6, y0 + 6 + R() * 10); g.stroke();
        }
        // 頂面
        g.fillStyle = st.top; diamondPath(g, TW, TH); g.fill();
        // 頂部碎岩塊
        for (let i = 0; i < 7; i++) {
          const x = 10 + R() * (TW - 20), y = 6 + R() * (TH - 12);
          if (Math.abs(x - HW) / HW + Math.abs(y - HH) / HH > 0.85) continue;
          const r = 5 + R() * 8;
          const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
          gr.addColorStop(0, shade(st.lump, 0.2)); gr.addColorStop(1, shade(st.lump, -0.4));
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(x - r, y); g.lineTo(x - r * 0.4, y - r * (0.8 + R() * 0.8)); g.lineTo(x + r * 0.5, y - r * (0.6 + R() * 0.7)); g.lineTo(x + r, y); g.lineTo(x, y + r * 0.4); g.closePath(); g.fill();
        }
        // 植被點綴
        if (R() < 0.6) for (let i = 0; i < 8; i++) {
          g.fillStyle = R() < 0.5 ? '#4f6a2c' : '#3b5222'; g.globalAlpha = 0.8;
          g.beginPath(); g.arc(8 + R() * (TW - 16), TH / 2 + R() * Hh * 0.5 + 6, 2 + R() * 3, 0, 7); g.fill();
        }
        g.globalAlpha = 1;
      });
    }
  // 墓碑
  for (let v = 0; v < 2; v++) spr('tomb' + v, 40, 50, 20, 44, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(22, 44, 14, 5, 0, 0, 7); g.fill();
    const gr = g.createLinearGradient(10, 0, 30, 0); gr.addColorStop(0, '#8d8a84'); gr.addColorStop(1, '#55524d');
    g.fillStyle = gr;
    if (v === 0) { g.beginPath(); g.moveTo(10, 44); g.lineTo(10, 20); g.arc(20, 20, 10, Math.PI, 0); g.lineTo(30, 44); g.closePath(); g.fill(); }
    else { g.fillRect(16, 10, 8, 34); g.fillRect(9, 18, 22, 7); }
    g.strokeStyle = 'rgba(30,30,30,0.6)'; g.beginPath(); g.moveTo(15, 28); g.lineTo(25, 28); g.moveTo(15, 33); g.lineTo(23, 33); g.stroke();
  });
  // 木十字
  spr('cross0', 70, 60, 35, 46, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(38, 46, 22, 6, 0, 0, 7); g.fill();
    g.save(); g.translate(35, 40); g.rotate(-0.35);
    g.fillStyle = '#5e3c22'; g.fillRect(-28, -5, 56, 9); g.fillRect(-6, -20, 9, 40);
    g.fillStyle = '#7a5130'; g.fillRect(-28, -5, 56, 3); g.fillRect(-6, -20, 3, 40);
    g.restore();
  });
  // 房屋
  const roofCols = ['#7a3a2a', '#4a5a6e', '#6a5432'];
  for (let v = 0; v < 3; v++) {
    const w = 3 * TW + 20, wallH = 48, roofH = 40, h = 3 * TH + wallH + roofH + 30;
    // 錨點：中心格的地面中心
    spr('house' + v, w, h, w / 2, h - 3 * TH / 2 - 6, (g) => {
      const R = mulberry32(1200 + v);
      const ox = w / 2, oy = h - 3 * TH / 2 - 6; // 中心點
      const P = (x, y, z) => [ox + (x - y) * HW, oy + (x + y) * HH - z]; // x,y 相對中心(-1.5..1.5)
      const poly = (pts, fill, stroke) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.stroke(); } };
      const a = 1.4;
      poly([P(-a - 0.2, a + 0.2, 0), P(a + 0.2, a + 0.2, 0), P(a + 0.2, -a - 0.2, 0), P(a + 1, -a, 0), P(a + 1, a + 1, 0), P(-a, a + 1, 0)], 'rgba(0,0,0,0.3)');
      // 牆：+y 面（左下）與 +x 面（右下）
      const wallC = '#b8a382', wallD = '#8f7b5e';
      poly([P(-a, a, 0), P(a, a, 0), P(a, a, wallH), P(-a, a, wallH)], wallC, 'rgba(40,30,20,0.6)');
      poly([P(a, a, 0), P(a, -a, 0), P(a, -a, wallH), P(a, a, wallH)], wallD, 'rgba(40,30,20,0.6)');
      // 木樑
      g.strokeStyle = '#4b3420'; g.lineWidth = 3;
      for (const t of [-a, 0, a]) { g.beginPath(); g.moveTo(...P(t, a, 0)); g.lineTo(...P(t, a, wallH)); g.stroke(); }
      for (const t of [-a, a]) { g.beginPath(); g.moveTo(...P(a, t, 0)); g.lineTo(...P(a, t, wallH)); g.stroke(); }
      g.beginPath(); g.moveTo(...P(-a, a, wallH / 2)); g.lineTo(...P(a, a, wallH / 2)); g.lineTo(...P(a, -a, wallH / 2)); g.stroke();
      // 門
      poly([P(-0.35, a, 0), P(0.35, a, 0), P(0.35, a, 30), P(-0.35, a, 30)], '#4a2f1c');
      // 窗
      poly([P(a, -0.7, 20), P(a, -0.1, 20), P(a, -0.1, 34), P(a, -0.7, 34)], '#2a2a3a', '#4b3420');
      g.fillStyle = 'rgba(255,200,100,0.25)'; poly([P(a, -0.65, 21), P(a, -0.15, 21), P(a, -0.15, 33), P(a, -0.65, 33)], 'rgba(255,200,110,0.3)');
      // 屋頂（屋脊沿 x 軸）
      const o = 0.35;
      const rc = roofCols[v];
      const ridgeA = P(-a - o, 0, wallH + roofH), ridgeB = P(a + o, 0, wallH + roofH);
      // 後坡
      poly([P(-a - o, -a - o, wallH - 6), P(a + o, -a - o, wallH - 6), ridgeB, ridgeA], shade(rc, 0.15));
      // 山牆
      poly([P(a, a, wallH), P(a, -a, wallH), P(a, 0, wallH + roofH - 4)], wallD, 'rgba(40,30,20,0.6)');
      // 前坡
      poly([P(-a - o, a + o, wallH - 6), P(a + o, a + o, wallH - 6), ridgeB, ridgeA], rc, 'rgba(20,10,5,0.5)');
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const t = i / 8;
        const p1 = P(-a - o, (a + o) * (1 - t), wallH - 6 + (roofH + 6) * t), p2 = P(a + o, (a + o) * (1 - t), wallH - 6 + (roofH + 6) * t);
        g.beginPath(); g.moveTo(...p1); g.lineTo(...p2); g.stroke();
      }
      // 煙囪
      poly([P(-0.8, -0.5, wallH + 20), P(-0.4, -0.5, wallH + 20), P(-0.4, -0.5, wallH + roofH + 18), P(-0.8, -0.5, wallH + roofH + 18)], '#6b5a4a');
      g.globalAlpha = 1; void R;
    });
  }
  // 告示板
  spr('board0', 60, 70, 30, 60, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(32, 60, 18, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#4a3220'; g.fillRect(14, 30, 4, 30); g.fillRect(42, 30, 4, 30);
    g.fillStyle = '#7a5430'; g.fillRect(8, 10, 44, 28); g.strokeStyle = '#3a2614'; g.lineWidth = 2; g.strokeRect(8, 10, 44, 28);
    g.fillStyle = '#e8dcb8'; g.fillRect(13, 14, 14, 10); g.fillRect(31, 16, 16, 12); g.fillRect(16, 26, 12, 9);
    g.fillStyle = '#f0c040'; g.font = 'bold 14px sans-serif'; g.fillText('!', 27, 9);
  });
  // 路燈柱
  spr('lamp0', 30, 90, 15, 84, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(17, 84, 9, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#2e2a26'; g.fillRect(13, 22, 4, 62); g.fillRect(9, 80, 12, 5);
    g.fillStyle = '#3a342c'; g.fillRect(8, 8, 14, 16);
    g.fillStyle = '#ffd27a'; g.fillRect(10, 11, 10, 10);
    g.fillStyle = '#2e2a26'; g.beginPath(); g.moveTo(6, 9); g.lineTo(15, 2); g.lineTo(24, 9); g.closePath(); g.fill();
  });
  // 篝火盆
  spr('brazier0', 50, 50, 25, 42, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(26, 42, 18, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2622'; g.fillRect(14, 26, 3, 16); g.fillRect(33, 26, 3, 16); g.fillRect(23, 28, 3, 15);
    const gr = g.createLinearGradient(8, 0, 42, 0); gr.addColorStop(0, '#3a332c'); gr.addColorStop(0.5, '#6a5c4c'); gr.addColorStop(1, '#2a241e');
    g.fillStyle = gr; g.beginPath(); g.ellipse(25, 24, 17, 7, 0, 0, Math.PI); g.lineTo(8, 22); g.closePath(); g.fill();
    g.fillStyle = '#5a1a08'; g.beginPath(); g.ellipse(25, 22, 16, 5, 0, 0, 7); g.fill();
  });
  // 地面裝飾
  const decoDraw = {
    grass: (g, R) => { for (let i = 0; i < 9; i++) { const x = 10 + R() * 20, y = 18; g.strokeStyle = R() < 0.5 ? '#7da04a' : '#4e6e2c'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 6, y - 6, x + (R() - 0.5) * 10, y - 8 - R() * 6); g.stroke(); } },
    flower: (g, R) => { const cols = ['#e8d84a', '#e06a8a', '#f0f0f0', '#9a7ae8']; for (let i = 0; i < 5; i++) { const x = 8 + R() * 24, y = 10 + R() * 9; g.strokeStyle = '#4e6e2c'; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y); g.stroke(); g.fillStyle = cols[(R() * 4) | 0]; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); } },
    bones: (g, R) => { g.strokeStyle = '#ddd6c0'; g.lineWidth = 2; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const x = 8 + R() * 22, y = 8 + R() * 10, a = R() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 4); g.stroke(); } if (R() < 0.6) { g.fillStyle = '#e6dfc8'; g.beginPath(); g.arc(20, 12, 4, 0, 7); g.fill(); g.fillStyle = '#222'; g.fillRect(18, 11, 1.5, 1.5); g.fillRect(21, 11, 1.5, 1.5); } },
    rubble: (g, R) => { for (let i = 0; i < 6; i++) { const x = 6 + R() * 26, y = 8 + R() * 10, r = 1.5 + R() * 3.5; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 1, y + 1, r, r * 0.6, 0, 0, 7); g.fill(); g.fillStyle = rgbJitter('#9a8a76', 25, R); g.beginPath(); g.moveTo(x - r, y); g.lineTo(x - r * 0.3, y - r); g.lineTo(x + r, y - r * 0.3); g.lineTo(x + r * 0.6, y + r * 0.5); g.closePath(); g.fill(); } },
    pebble: (g, R) => { for (let i = 0; i < 4; i++) { const x = 8 + R() * 24, y = 10 + R() * 8, r = 1 + R() * 2; g.fillStyle = rgbJitter('#8f8576', 20, R); g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill(); } },
    mushroom: (g, R) => { for (let i = 0; i < 3; i++) { const x = 10 + R() * 20, y = 14 + R() * 4; g.fillStyle = '#e8dcc0'; g.fillRect(x - 1, y - 4, 2, 4); g.fillStyle = R() < 0.5 ? '#b83a2a' : '#c89a4a'; g.beginPath(); g.arc(x, y - 4, 3, Math.PI, 0); g.fill(); } },
  };
  for (const k in decoDraw)
    for (let v = 0; v < 3; v++) spr('deco_' + k + v, 40, 26, 20, 16, (g) => decoDraw[k](g, mulberry32(k.length * 31 + v * 5 + 7)));
}
