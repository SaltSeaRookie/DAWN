'use strict';
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
    [TILE.DESERT]: { base: ['#c4a46a', '#c7a76d', '#caaa70', '#cdad73', '#d0b076', '#d3b379'], fleck: ['#b08e58', '#dcc08a', '#a88654'], dunes: true },
    [TILE.BRIDGE]: { base: ['#6a4a2a', '#6d4c2b', '#704e2c', '#734f2d', '#76512e', '#79532f'], planks: true },
    [TILE.DUNGEON]: { base: ['#3a3836', '#3c3a38', '#3e3c3a', '#403e3b', '#42403d', '#44423f'], flags: true },
    [TILE.SEA]: { base: ['#1a3a5a', '#1b3c5c', '#1c3e5e', '#1d4060', '#1e4262', '#1f4464'], water: true },
    [TILE.LAVA]: { base: ['#d8400a', '#e04a0c', '#e8540e', '#f05e10', '#e04a0c', '#d8400a'], lava: true },
    [TILE.ASH]: { base: ['#3a3230', '#3d3532', '#403834', '#433a36', '#463d38', '#49403a'], fleck: ['#2a2422', '#5a4e48', '#6a3a2a', '#1a1614'], pebbles: true },
    [TILE.SNOW]: { base: ['#d8dce4', '#dadee6', '#dce0e8', '#dee2ea', '#e0e4ec', '#e2e6ee'], fleck: ['#c0c8d4', '#f0f4fa', '#b0b8c4'] },
    [TILE.ICE]: { base: ['#a8cce0', '#accfe2', '#b0d2e4', '#b4d5e6', '#b8d8e8', '#bcdbea'], fleck: ['#e8f6ff', '#8ab8d4', '#ffffff', '#9cc4dc'] },
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
      if (d.dunes) for (let i = 0; i < 4; i++) {
        g.strokeStyle = 'rgba(150,110,60,0.35)'; g.lineWidth = 1.2;
        const y = 6 + R() * 20; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(TW / 2, y - 4, TW, y + 2); g.stroke();
      }
      if (d.planks) {
        for (let i = -4; i < 10; i++) {
          g.strokeStyle = 'rgba(30,18,8,0.7)'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(i * 8, 0); g.lineTo(i * 8 + 32, 32); g.stroke();
          g.fillStyle = 'rgba(255,220,160,0.08)'; g.fillRect(i * 8 + 2, 0, 2, 32);
        }
      }
      if (d.flags) {
        g.strokeStyle = 'rgba(15,14,12,0.7)'; g.lineWidth = 1;
        for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 32, 16 + 16); g.stroke(); g.beginPath(); g.moveTo(i * 16 + 32, 0); g.lineTo(i * 16, 32); g.stroke(); }
        for (let i = 0; i < 30; i++) { g.fillStyle = R() < 0.5 ? 'rgba(80,78,72,0.5)' : 'rgba(20,20,18,0.4)'; g.fillRect(R() * TW, R() * TH, 1.5, 1.5); }
        if (R() < 0.4) { g.fillStyle = 'rgba(60,80,40,0.35)'; g.beginPath(); g.ellipse(R() * TW, R() * TH, 6, 3, 0, 0, 7); g.fill(); }
      }
      if (d.lava) {
        for (let i = 0; i < 7; i++) {
          g.strokeStyle = R() < 0.5 ? 'rgba(255,230,120,0.75)' : 'rgba(120,20,0,0.6)'; g.lineWidth = 1 + R() * 1.5;
          const x = R() * TW, y = R() * TH;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 3 + R() * 6, x + 12, y + (R() - 0.5) * 4); g.stroke();
        }
        for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(60,10,0,0.45)'; g.beginPath(); g.ellipse(R() * TW, R() * TH, 4 + R() * 5, 2 + R() * 2, 0, 0, 7); g.fill(); }
        for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,240,160,0.8)'; g.beginPath(); g.arc(R() * TW, R() * TH, 1 + R(), 0, 7); g.fill(); }
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
    { top: '#2e2c2a', side1: '#242220', side2: '#1a1918', lump: '#3a3734' },
    { top: '#c8ccd4', side1: '#7a808a', side2: '#5e646e', lump: '#e8ecf2' },
  ];
  for (let s = 0; s < 4; s++)
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

// ===== 擴充物件：城牆、樓梯、仙人掌、船、火把 =====
function buildExtraSprites() {
  // 城牆方塊
  for (let v = 0; v < 2; v++) {
    const Hh = 64, extra = 14;
    spr('wall' + v, TW + 4, TH + Hh + extra, (TW + 4) / 2, Hh + extra + TH / 2, (g) => {
      const R = mulberry32(1500 + v);
      g.translate(2, extra);
      const stone = (x0, y0, w, h, col) => { g.fillStyle = col; g.fillRect(x0, y0, w, h); };
      g.fillStyle = '#6a6660'; g.beginPath(); g.moveTo(0, TH / 2); g.lineTo(HW, TH); g.lineTo(HW, TH + Hh); g.lineTo(0, TH / 2 + Hh); g.closePath(); g.fill();
      g.fillStyle = '#4e4b46'; g.beginPath(); g.moveTo(TW, TH / 2); g.lineTo(HW, TH); g.lineTo(HW, TH + Hh); g.lineTo(TW, TH / 2 + Hh); g.closePath(); g.fill();
      // 石磚紋
      g.strokeStyle = 'rgba(25,22,20,0.55)'; g.lineWidth = 1;
      for (let row = 0; row < 8; row++) {
        const yy = TH / 2 + row * 8;
        g.beginPath(); g.moveTo(0, yy); g.lineTo(HW, yy + HH); g.lineTo(TW, yy); g.stroke();
        for (let k = 0; k < 4; k++) {
          const xx = 4 + k * 8 + (row % 2) * 4;
          g.beginPath(); g.moveTo(xx, yy + xx / 2); g.lineTo(xx, yy + xx / 2 + 8); g.stroke();
          const xr = TW - xx; g.beginPath(); g.moveTo(xr, yy + xx / 2); g.lineTo(xr, yy + xx / 2 + 8); g.stroke();
        }
      }
      // 頂面與城垛
      g.fillStyle = '#7e7a72'; diamondPath(g, TW, TH); g.fill();
      for (const [cx, cy] of [[16, 8], [48, 8], [16, 24], [48, 24], [32, 4], [32, 28]]) {
        g.fillStyle = '#5a5650'; g.fillRect(cx - 5, cy - 9, 10, 9);
        g.fillStyle = '#8a867e'; g.fillRect(cx - 5, cy - 12, 10, 4);
      }
      for (let i = 0; i < 20; i++) { g.fillStyle = R() < 0.5 ? 'rgba(60,80,40,0.4)' : 'rgba(0,0,0,0.15)'; g.fillRect(R() * TW, TH / 2 + R() * Hh, 2, 2); }
    });
  }
  // 下樓梯（地洞）
  spr('stairs0', 90, 60, 45, 30, (g) => {
    const gr = g.createRadialGradient(45, 30, 4, 45, 30, 36); gr.addColorStop(0, '#000'); gr.addColorStop(0.7, '#1a1410'); gr.addColorStop(1, 'rgba(40,30,20,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(45, 30, 40, 22, 0, 0, 7); g.fill();
    g.strokeStyle = '#5a5048'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(30 + i * 3, 22 + i * 4); g.lineTo(60 - i * 3, 22 + i * 4); g.stroke(); }
    g.fillStyle = '#6a625a';
    for (const [x, y] of [[10, 28], [80, 30], [44, 6], [46, 52], [20, 14], [70, 46]]) { g.beginPath(); g.ellipse(x, y, 8, 5, 0, 0, 7); g.fill(); }
  });
  // 上樓梯
  spr('stairsup0', 70, 80, 35, 64, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(36, 64, 26, 9, 0, 0, 7); g.fill();
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? '#5a5650' : '#6a665e';
      g.fillRect(14 + i * 2, 60 - i * 9, 42 - i * 4, 9);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(14 + i * 2, 60 - i * 9, 42 - i * 4, 2);
    }
    g.fillStyle = 'rgba(255,240,200,0.35)'; g.beginPath(); g.moveTo(26, 6); g.lineTo(44, 6); g.lineTo(52, 0); g.lineTo(18, 0); g.fill();
  });
  // 仙人掌
  for (let v = 0; v < 2; v++) spr('cactus' + v, 50, 80, 25, 72, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(28, 72, 14, 5, 0, 0, 7); g.fill();
    const col = v ? '#4a7a3a' : '#5a8a3a';
    g.fillStyle = col; g.beginPath(); g.roundRect(20, 18, 10, 56, 5); g.fill();
    g.beginPath(); g.roundRect(8, 34, 7, 22, 4); g.fill(); g.fillRect(10, 50, 12, 6);
    g.beginPath(); g.roundRect(35, 28, 7, 20, 4); g.fill(); g.fillRect(28, 42, 12, 6);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(22, 20, 2, 50);
    if (v) { g.fillStyle = '#e870a0'; g.beginPath(); g.arc(25, 18, 3, 0, 7); g.fill(); }
  });
  // 帆船
  spr('ship0', 260, 220, 130, 170, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(130, 175, 110, 30, 0, 0, 7); g.fill();
    g.fillStyle = '#5a3a1e'; g.beginPath(); g.moveTo(30, 140); g.lineTo(230, 120); g.lineTo(210, 175); g.lineTo(60, 185); g.closePath(); g.fill();
    g.fillStyle = '#7a5230'; g.beginPath(); g.moveTo(30, 140); g.lineTo(230, 120); g.lineTo(226, 132); g.lineTo(34, 152); g.closePath(); g.fill();
    g.strokeStyle = '#3a2410'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * 2, 155 + i * 7); g.lineTo(220 - i * 3, 136 + i * 9); g.stroke(); }
    g.fillStyle = '#3a2410'; g.fillRect(118, 20, 6, 120); g.fillRect(178, 50, 5, 80);
    g.fillStyle = '#e8e0c8'; g.beginPath(); g.moveTo(124, 26); g.quadraticCurveTo(170, 60, 124, 110); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(118, 30); g.quadraticCurveTo(80, 70, 118, 118); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(183, 56); g.quadraticCurveTo(215, 80, 183, 116); g.closePath(); g.fill();
    g.fillStyle = '#a02020'; g.beginPath(); g.moveTo(124, 20); g.lineTo(144, 26); g.lineTo(124, 32); g.fill();
  });
  // 椰子樹
  for (let v = 0; v < 2; v++) spr('palm' + v, 110, 150, 55, 138, (g) => {
    const R = mulberry32(1700 + v);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(64, 138, 30, 10, 0, 0, 7); g.fill();
    // 彎曲的樹幹
    const lean = v ? -14 : 16;
    g.strokeStyle = '#7a5a34'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(55, 138); g.quadraticCurveTo(55 + lean * 0.2, 90, 55 + lean, 48); g.stroke();
    g.strokeStyle = '#5a4024'; g.lineWidth = 1.5;
    for (let k = 0; k < 9; k++) { const t = k / 9, x = 55 + lean * t * t, y = 138 - t * 90; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y - 2); g.stroke(); }
    const tx = 55 + lean, ty = 46;
    // 葉子
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + R() * 0.3, len = 34 + R() * 10;
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + 10;
      g.strokeStyle = k % 2 ? '#3a7a2a' : '#4e9a34'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + ex) / 2, ty - 14, ex, ey); g.stroke();
      g.strokeStyle = '#2a5a1e'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + ex) / 2, ty - 14, ex, ey); g.stroke();
    }
    g.fillStyle = '#6a4a20'; for (const [dx, dy] of [[-4, 4], [3, 6], [0, 9]]) { g.beginPath(); g.arc(tx + dx, ty + dy, 4, 0, 7); g.fill(); }
  });
  // 火山洞口
  spr('cave0', 120, 100, 60, 78, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(62, 80, 52, 16, 0, 0, 7); g.fill();
    const rock = g.createLinearGradient(0, 10, 0, 80); rock.addColorStop(0, '#5a4a40'); rock.addColorStop(1, '#2a2220');
    g.fillStyle = rock; g.beginPath(); g.moveTo(8, 80); g.quadraticCurveTo(10, 30, 40, 18); g.quadraticCurveTo(62, 6, 84, 18); g.quadraticCurveTo(112, 30, 114, 80); g.closePath(); g.fill();
    const glow = g.createRadialGradient(60, 66, 2, 60, 66, 34); glow.addColorStop(0, '#ffd070'); glow.addColorStop(0.4, '#e04a10'); glow.addColorStop(1, '#2a0800');
    g.fillStyle = glow; g.beginPath(); g.moveTo(34, 80); g.quadraticCurveTo(36, 40, 60, 36); g.quadraticCurveTo(84, 40, 86, 80); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(20,14,12,0.6)'; g.lineWidth = 2;
    for (const [x0, y0, x1, y1] of [[20, 50, 30, 70], [96, 46, 90, 66], [50, 20, 56, 30], [74, 22, 70, 32]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  });
  // 牆上火把
  spr('torch0', 20, 60, 10, 56, (g) => {
    g.fillStyle = '#3a2a1a'; g.fillRect(8, 20, 4, 36);
    g.fillStyle = '#2a2622'; g.fillRect(5, 18, 10, 5);
  });
  // 帳篷（港口／村莊點綴）
  spr('crate0', 50, 50, 25, 40, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(27, 40, 18, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#8a6a3a'; g.beginPath(); g.moveTo(10, 22); g.lineTo(25, 30); g.lineTo(25, 44); g.lineTo(10, 36); g.fill();
    g.fillStyle = '#6a4a28'; g.beginPath(); g.moveTo(40, 22); g.lineTo(25, 30); g.lineTo(25, 44); g.lineTo(40, 36); g.fill();
    g.fillStyle = '#a08050'; g.beginPath(); g.moveTo(10, 22); g.lineTo(25, 14); g.lineTo(40, 22); g.lineTo(25, 30); g.fill();
    g.strokeStyle = '#3a2814'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 22); g.lineTo(25, 30); g.lineTo(40, 22); g.moveTo(25, 30); g.lineTo(25, 44); g.stroke();
  });
  // 月影之門：古老的石拱門，門內是流動的月光
  spr('moongate0', 120, 150, 60, 128, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(60, 130, 48, 14, 0, 0, 7); g.fill();
    const st = (x, w) => { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#5a5868'); gr.addColorStop(1, '#3a3848'); g.fillStyle = gr; g.fillRect(x, 40, w, 90); g.fillStyle = 'rgba(255,255,255,0.08)'; for (let y = 48; y < 128; y += 14) g.fillRect(x, y, w, 2); };
    st(18, 20); st(82, 20);
    g.fillStyle = '#4a4858'; g.beginPath(); g.moveTo(14, 46); g.quadraticCurveTo(60, -6, 106, 46); g.lineTo(98, 50); g.quadraticCurveTo(60, 8, 22, 50); g.closePath(); g.fill();
    const mg = g.createRadialGradient(60, 86, 4, 60, 86, 34); mg.addColorStop(0, 'rgba(230,220,255,0.95)'); mg.addColorStop(0.5, 'rgba(150,120,255,0.55)'); mg.addColorStop(1, 'rgba(80,40,180,0.1)');
    g.fillStyle = mg; g.beginPath(); g.moveTo(38, 130); g.lineTo(38, 54); g.quadraticCurveTo(60, 26, 82, 54); g.lineTo(82, 130); g.closePath(); g.fill();
    g.fillStyle = '#c8b8ff'; g.font = 'bold 14px serif'; g.textAlign = 'center'; g.fillText('☾', 60, 30);
  });
  // 月之碑
  for (let v = 0; v < 3; v++) spr('stele' + v, 70, 110, 35, 92, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(35, 94, 26, 9, 0, 0, 7); g.fill();
    g.fillStyle = '#4a4a58'; g.fillRect(14, 82, 42, 12);
    const gr = g.createLinearGradient(20, 0, 50, 0); gr.addColorStop(0, '#6a6a7e'); gr.addColorStop(1, '#3e3e4e');
    g.fillStyle = gr; g.beginPath(); g.moveTo(20, 84); g.lineTo(20, 22); g.quadraticCurveTo(35, 8, 50, 22); g.lineTo(50, 84); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(180,170,255,0.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(35, 36, 7, 0.6, Math.PI * 2 - 0.6); g.stroke();
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(25, 52 + k * 6); g.lineTo(45 - (k % 2) * 6, 52 + k * 6); g.stroke(); }
  });
  // 月光水晶
  for (let v = 0; v < 3; v++) spr('crystal' + v, 60, 80, 30, 66, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(30, 68, 18, 6, 0, 0, 7); g.fill();
    const cols = [['#b8a8ff', '#6a50d0'], ['#a8d8ff', '#4a80d0'], ['#e0b8ff', '#9a50c8']][v];
    const shard = (x, h, w, a) => { g.save(); g.translate(x, 68); g.rotate(a); const gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); g.fillStyle = gr; g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w * 0.6, -h); g.lineTo(0, -h - 8); g.lineTo(w * 0.6, -h); g.lineTo(w, 0); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-w * 0.3, -h, 2, h - 4); g.restore(); };
    shard(22, 26, 6, -0.3); shard(40, 22, 5, 0.35); shard(30, 42, 8, 0);
  });
  // 雪松（北境）
  for (let v = 0; v < 3; v++) spr('pine' + v, 90, 150, 45, 138, (g) => {
    const R = mulberry32(900 + v), hgt = 100 + v * 12;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(50, 140, 26, 9, 0, 0, 7); g.fill();
    g.fillStyle = '#4a3424'; g.fillRect(41, 112, 8, 28);
    const layers = 4;
    for (let k = 0; k < layers; k++) {
      const y0 = 140 - 22 - k * (hgt / layers) * 0.85, wdt = 38 - k * 7, top = y0 - hgt / layers * 1.15;
      g.fillStyle = ['#1f3f34', '#24493b', '#2a5242'][v]; g.beginPath(); g.moveTo(45 - wdt, y0); g.lineTo(45, top); g.lineTo(45 + wdt, y0); g.closePath(); g.fill();
      g.fillStyle = '#16302a'; g.beginPath(); g.moveTo(45, top); g.lineTo(45 + wdt, y0); g.lineTo(45 + wdt * 0.2, y0); g.closePath(); g.fill();
      // 積雪
      g.fillStyle = '#eef4fa'; g.beginPath(); g.moveTo(45 - wdt * 0.55, top + (y0 - top) * 0.55); g.lineTo(45, top); g.lineTo(45 + wdt * 0.5, top + (y0 - top) * 0.5); g.quadraticCurveTo(45, top + (y0 - top) * 0.7 + R() * 4, 45 - wdt * 0.55, top + (y0 - top) * 0.55); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(45 - wdt + 3, y0 - 3, wdt * 0.6, 2);
    }
  });
  // 冰岩（高地）
  spr('snowrock0', 90, 70, 45, 52, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(48, 54, 32, 11, 0, 0, 7); g.fill();
    g.fillStyle = '#7a8290'; g.beginPath(); g.moveTo(15, 52); g.lineTo(30, 20); g.lineTo(50, 12); g.lineTo(72, 30); g.lineTo(78, 52); g.closePath(); g.fill();
    g.fillStyle = '#eef2f8'; g.beginPath(); g.moveTo(26, 28); g.lineTo(30, 20); g.lineTo(50, 12); g.lineTo(70, 28); g.lineTo(58, 26); g.lineTo(44, 30); g.closePath(); g.fill();
  });
}
