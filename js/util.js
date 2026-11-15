'use strict';
// ===== 共用工具 =====
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, seed, oct = 4) {
  let s = 0, amp = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += valueNoise(x * f, y * f, seed + i * 17) * amp;
    n += amp; amp *= 0.5; f *= 2;
  }
  return s / n;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const lerp = (a, b, t) => a + (b - a) * t;

function shade(hex, amt) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
function rgbJitter(hex, j, rnd) {
  let c = hex.replace('#', '');
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const k = (rnd() - 0.5) * 2 * j;
  return 'rgb(' + clamp(r + k, 0, 255) + ',' + clamp(g + k, 0, 255) + ',' + clamp(b + k, 0, 255) + ')';
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  return c;
}

// ===== 二元堆積 A* 尋路（8 方向，不切角）=====
const Path = {
  init(w, h) {
    this.w = w; this.h = h;
    this.g = new Float32Array(w * h);
    this.from = new Int32Array(w * h);
    this.stamp = new Uint32Array(w * h);
    this.closed = new Uint32Array(w * h);
    this.cur = 1;
  },
  find(world, sx, sy, tx, ty, maxNodes = 4000, avoidSafe = false) {
    const W = this.w, H = this.h;
    sx |= 0; sy |= 0; tx |= 0; ty |= 0;
    if (sx === tx && sy === ty) return [];
    const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !world.blocked(x, y) && !(avoidSafe && world.isSafe(x, y));
    if (!ok(tx, ty)) {
      // 找目標附近可走格
      let best = null, bd = 1e9;
      for (let r = 1; r <= 3 && !best; r++)
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const nx = tx + dx, ny = ty + dy;
            if (ok(nx, ny)) { const d = Math.hypot(nx - sx, ny - sy); if (d < bd) { bd = d; best = [nx, ny]; } }
          }
      if (!best) return null;
      tx = best[0]; ty = best[1];
      if (sx === tx && sy === ty) return [];
    }
    const stamp = ++this.cur;
    const g = this.g, from = this.from, st = this.stamp, cl = this.closed;
    const heap = [];
    const push = (f, i) => {
      heap.push([f, i]); let k = heap.length - 1;
      while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
    };
    const pop = () => {
      const top = heap[0]; const last = heap.pop();
      if (heap.length) {
        heap[0] = last; let k = 0;
        for (;;) {
          const l = 2 * k + 1, r = l + 1; let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m;
        }
      }
      return top;
    };
    const hfn = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const s = sy * W + sx;
    g[s] = 0; st[s] = stamp; from[s] = -1;
    push(hfn(sx, sy), s);
    let bestI = s, bestH = hfn(sx, sy), n = 0;
    const goal = ty * W + tx;
    while (heap.length && n < maxNodes) {
      const [, i] = pop();
      if (cl[i] === stamp) continue;
      cl[i] = stamp; n++;
      if (i === goal) { bestI = i; break; }
      const x = i % W, y = (i / W) | 0;
      const hh = hfn(x, y);
      if (hh < bestH) { bestH = hh; bestI = i; }
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (!ok(nx, ny)) continue;
          if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;
          const j = ny * W + nx;
          if (cl[j] === stamp) continue;
          const ng = g[i] + (dx && dy ? 1.414 : 1);
          if (st[j] !== stamp || ng < g[j]) {
            st[j] = stamp; g[j] = ng; from[j] = i;
            push(ng + hfn(nx, ny), j);
          }
        }
    }
    const path = [];
    let c = bestI;
    while (c !== s && c !== -1) { path.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5 }); c = from[c]; }
    path.reverse();
    return path;
  },
};
