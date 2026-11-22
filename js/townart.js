'use strict';
// ===== 村莊美術（v2.24）：各村莊風格的房屋與街景道具 =====
// 房屋共用同一套等角幾何，依村莊換牆面、屋頂樣式與細節；道具都預先畫成精靈圖。

// ---------- 房屋 ----------
const HOUSE_STYLES = {
  dawn:  { wall: '#c8b088', beams: '#4b3420', roof: 'gable', roofs: ['#9a3a24', '#b0502a', '#7a3a2a'], chimney: true, flower: true },
  leaf:  { wall: '#8a6a44', beams: '#3a2614', roof: 'steep', roofs: ['#4a6a2a', '#5a7a34', '#3e5a26'], moss: true, lantern: true },
  port:  { wall: '#e8e4da', beams: null, roof: 'gable', roofs: ['#2a5a8a', '#3a6a9a', '#2a4a6a'], shutters: '#3a7aaa', rope: true },
  anvil: { wall: '#8a8680', beams: null, stone: true, roof: 'gable', roofs: ['#3a3a44', '#4a4448', '#2e2e36'], chimney: true, bigChimney: true, soot: true },
  oasis: { wall: '#d8b47a', beams: null, roof: 'flat', roofs: ['#c89a5a', '#b8885a', '#d0a868'], dome: ['#3a8aa0', '#c0603a', '#e0c060'], awning: true },
  ridge: { wall: '#7a5232', logs: true, roof: 'steep', roofs: ['#5a4a3a', '#4a3a2a', '#6a5a48'], snow: true, chimney: true },
  oren:  { wall: '#9aa0aa', beams: null, stone: true, roof: 'steep', roofs: ['#3a4a6a', '#4a3a5a', '#2a4a5a'], snow: true, chimney: true },
  coral: { wall: '#f0d8b8', beams: null, roof: 'thatch', roofs: ['#c8a050', '#b89040', '#d8b060'], shell: true },
};
function buildHouseSprite(key, st, v) {
  const w = 3 * TW + 20, wallH = st.roof === 'flat' ? 40 : 48, roofH = st.roof === 'steep' ? 56 : st.roof === 'flat' ? 8 : 40, h = 3 * TH + wallH + roofH + 60;
  spr(key, w, h, w / 2, h - 3 * TH / 2 - 6, (g) => {
    const R = mulberry32(key.length * 97 + v * 13);
    const ox = w / 2, oy = h - 3 * TH / 2 - 6;
    const P = (x, y, z) => [ox + (x - y) * HW, oy + (x + y) * HH - z];
    const poly = (pts, fill, stroke) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); } };
    const line = (a, b, col, lw = 1) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); };
    const a = 1.4, wallC = st.wall, wallD = shade(st.wall, -0.22), rc = st.roofs[v % st.roofs.length];
    poly([P(-a - 0.2, a + 0.2, 0), P(a + 0.2, a + 0.2, 0), P(a + 0.2, -a - 0.2, 0), P(a + 1, -a, 0), P(a + 1, a + 1, 0), P(-a, a + 1, 0)], 'rgba(0,0,0,0.3)');
    // 牆
    poly([P(-a, a, 0), P(a, a, 0), P(a, a, wallH), P(-a, a, wallH)], wallC, 'rgba(40,30,20,0.6)');
    poly([P(a, a, 0), P(a, -a, 0), P(a, -a, wallH), P(a, a, wallH)], wallD, 'rgba(40,30,20,0.6)');
    if (st.stone) {   // 石砌
      for (let z = 8; z < wallH; z += 8) { line(P(-a, a, z), P(a, a, z), 'rgba(0,0,0,0.18)'); line(P(a, a, z), P(a, -a, z), 'rgba(0,0,0,0.22)'); }
      for (let z = 0; z < wallH; z += 8) for (let t = -a + ((z / 8) % 2) * 0.25; t < a; t += 0.5) { line(P(t, a, z), P(t, a, z + 8), 'rgba(0,0,0,0.14)'); line(P(a, t, z), P(a, t, z + 8), 'rgba(0,0,0,0.18)'); }
    }
    if (st.logs) {   // 原木
      for (let z = 6; z < wallH; z += 7) { line(P(-a, a, z), P(a, a, z), 'rgba(30,18,8,0.55)', 2); line(P(a, a, z), P(a, -a, z), 'rgba(30,18,8,0.6)', 2); }
      for (let z = 3; z < wallH; z += 7) { g.fillStyle = '#c8a070'; g.beginPath(); g.arc(...P(-a, a + 0.05, z), 2.5, 0, 7); g.fill(); }
    }
    if (st.beams) {   // 木樑
      g.strokeStyle = st.beams; g.lineWidth = 3;
      for (const t of [-a, 0, a]) line(P(t, a, 0), P(t, a, wallH), st.beams, 3);
      for (const t of [-a, a]) line(P(a, t, 0), P(a, t, wallH), st.beams, 3);
      line(P(-a, a, wallH / 2), P(a, a, wallH / 2), st.beams, 3); line(P(a, a, wallH / 2), P(a, -a, wallH / 2), st.beams, 3);
    }
    if (st.soot) poly([P(a, -a, wallH * 0.6), P(a, -0.4, wallH * 0.75), P(a, -0.4, wallH), P(a, -a, wallH)], 'rgba(20,20,20,0.25)');
    // 門
    const doorC = st.awning ? '#6a3a20' : '#4a2f1c';
    if (st.roof === 'flat') { g.fillStyle = doorC; g.beginPath(); const p0 = P(-0.35, a, 0), p1 = P(0.35, a, 0), pt = P(0, a, 34); g.moveTo(...p0); g.lineTo(...P(-0.35, a, 24)); g.quadraticCurveTo(pt[0], pt[1] - 6, ...P(0.35, a, 24)); g.lineTo(...p1); g.closePath(); g.fill(); }
    else poly([P(-0.35, a, 0), P(0.35, a, 0), P(0.35, a, 30), P(-0.35, a, 30)], doorC, 'rgba(0,0,0,0.4)');
    g.fillStyle = '#d0b050'; g.beginPath(); g.arc(...P(0.22, a, 15), 1.5, 0, 7); g.fill();
    // 窗戶
    const win = (y0, y1) => {
      poly([P(a, y0, 20), P(a, y1, 20), P(a, y1, 34), P(a, y0, 34)], '#2a2a3a', '#3a2a1a');
      poly([P(a, y0 + 0.05, 21), P(a, y1 - 0.05, 21), P(a, y1 - 0.05, 33), P(a, y0 + 0.05, 33)], 'rgba(255,200,110,0.35)');
      line(P(a, (y0 + y1) / 2, 20), P(a, (y0 + y1) / 2, 34), '#3a2a1a');
      if (st.shutters) { poly([P(a, y0 - 0.25, 20), P(a, y0, 20), P(a, y0, 34), P(a, y0 - 0.25, 34)], st.shutters); poly([P(a, y1, 20), P(a, y1 + 0.25, 20), P(a, y1 + 0.25, 34), P(a, y1, 34)], st.shutters); }
      if (st.flower) { poly([P(a, y0 - 0.05, 16), P(a, y1 + 0.05, 16), P(a, y1 + 0.05, 20), P(a, y0 - 0.05, 20)], '#6a4a2a'); for (let k = 0; k < 4; k++) { g.fillStyle = ['#e04a6a', '#f0d040', '#f0f0f0', '#e07ad0'][k]; g.beginPath(); g.arc(...P(a, y0 + (y1 - y0) * (k + 0.5) / 4, 21), 2, 0, 7); g.fill(); } }
    };
    win(-0.9, -0.3); win(0.3, 0.9);
    poly([P(-1.15, a, 20), P(-0.6, a, 20), P(-0.6, a, 32), P(-1.15, a, 32)], '#2a2a3a', '#3a2a1a');
    poly([P(-1.1, a, 21), P(-0.65, a, 21), P(-0.65, a, 31), P(-1.1, a, 31)], 'rgba(255,200,110,0.3)');
    // 屋頂
    const o = 0.35;
    if (st.roof === 'flat') {
      poly([P(-a - 0.1, -a - 0.1, wallH), P(a + 0.1, -a - 0.1, wallH), P(a + 0.1, a + 0.1, wallH), P(-a - 0.1, a + 0.1, wallH)], rc, 'rgba(60,40,20,0.5)');
      poly([P(-a - 0.1, a + 0.1, wallH), P(a + 0.1, a + 0.1, wallH), P(a + 0.1, a + 0.1, wallH + roofH), P(-a - 0.1, a + 0.1, wallH + roofH)], shade(rc, -0.1));
      poly([P(a + 0.1, a + 0.1, wallH), P(a + 0.1, -a - 0.1, wallH), P(a + 0.1, -a - 0.1, wallH + roofH), P(a + 0.1, a + 0.1, wallH + roofH)], shade(rc, -0.25));
      // 圓頂
      const dc = st.dome[v % st.dome.length], c = P(-0.2, -0.2, wallH + roofH);
      const gr = g.createRadialGradient(c[0] - 6, c[1] - 16, 2, c[0], c[1] - 8, 26); gr.addColorStop(0, shade(dc, 0.4)); gr.addColorStop(1, shade(dc, -0.3));
      g.fillStyle = gr; g.beginPath(); g.ellipse(c[0], c[1], 24, 12, 0, Math.PI, 0); g.quadraticCurveTo(c[0] + 22, c[1] - 30, c[0], c[1] - 34); g.quadraticCurveTo(c[0] - 22, c[1] - 30, c[0] - 24, c[1]); g.fill();
      g.fillStyle = '#e0c060'; g.fillRect(c[0] - 1, c[1] - 42, 2, 9); g.beginPath(); g.arc(c[0], c[1] - 43, 2.5, 0, 7); g.fill();
      if (st.awning) { const stripes = ['#c0403a', '#f0e0c0']; for (let k = 0; k < 4; k++) poly([P(-0.8 + k * 0.4, a, 34), P(-0.4 + k * 0.4, a, 34), P(-0.4 + k * 0.4, a + 0.6, 26), P(-0.8 + k * 0.4, a + 0.6, 26)], stripes[k % 2], 'rgba(0,0,0,0.2)'); }
    } else {
      const rh = roofH, ridgeA = P(-a - o, 0, wallH + rh), ridgeB = P(a + o, 0, wallH + rh);
      poly([P(-a - o, -a - o, wallH - 6), P(a + o, -a - o, wallH - 6), ridgeB, ridgeA], shade(rc, 0.15));
      poly([P(a, a, wallH), P(a, -a, wallH), P(a, 0, wallH + rh - 4)], wallD, 'rgba(40,30,20,0.6)');
      if (st.stone || st.logs) line(P(a, 0, wallH + 4), P(a, 0, wallH + rh - 10), 'rgba(0,0,0,0.2)');
      poly([P(-a - o, a + o, wallH - 6), P(a + o, a + o, wallH - 6), ridgeB, ridgeA], rc, 'rgba(20,10,5,0.5)');
      const rows = st.roof === 'thatch' ? 12 : 8;
      for (let i = 1; i < rows; i++) {
        const t = i / rows;
        line(P(-a - o, (a + o) * (1 - t), wallH - 6 + (rh + 6) * t), P(a + o, (a + o) * (1 - t), wallH - 6 + (rh + 6) * t), st.roof === 'thatch' ? 'rgba(90,60,10,0.35)' : 'rgba(0,0,0,0.18)');
      }
      if (st.roof === 'thatch') for (let k = 0; k < 30; k++) { const t = R() * 2 - 1; line(P(t * (a + o), a + o, wallH - 6), P(t * (a + o), a + o + 0.15, wallH - 12), 'rgba(110,80,20,0.6)'); }
      if (st.moss) for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(70,110,40,0.7)'; g.beginPath(); g.arc(...P(R() * 2 * a - a, (a + o) * R(), wallH + rh * R() * 0.8), 2 + R() * 3, 0, 7); g.fill(); }
      if (st.snow) {   // 屋頂積雪
        poly([P(-a - o, a * 0.35, wallH + rh * 0.66), P(a + o, a * 0.35, wallH + rh * 0.66), ridgeB, ridgeA], 'rgba(245,250,255,0.95)');
        for (let k = 0; k < 8; k++) { const t = -a - o + k * (2 * (a + o)) / 7; g.fillStyle = 'rgba(245,250,255,0.95)'; g.beginPath(); g.arc(...P(t, a * 0.35, wallH + rh * 0.66), 3, 0, Math.PI); g.fill(); }
        poly([P(-a - o, a + o, wallH - 6), P(a + o, a + o, wallH - 6), P(a + o, a + o, wallH - 3), P(-a - o, a + o, wallH - 3)], 'rgba(245,250,255,0.9)');
        for (let k = 0; k < 6; k++) { const t = -a + k * 0.55; line(P(t, a + o, wallH - 6), P(t, a + o, wallH - 12 - (k % 3) * 3), 'rgba(220,240,255,0.9)', 1.5); }
      }
      if (st.chimney) {
        const cw = st.bigChimney ? 0.6 : 0.4, ch = st.bigChimney ? 30 : 18;
        poly([P(-0.8, -0.5, wallH + 20), P(-0.8 + cw, -0.5, wallH + 20), P(-0.8 + cw, -0.5, wallH + rh + ch), P(-0.8, -0.5, wallH + rh + ch)], st.stone ? '#5a5652' : '#6b5a4a', 'rgba(0,0,0,0.3)');
        if (st.snow) poly([P(-0.85, -0.5, wallH + rh + ch), P(-0.75 + cw, -0.5, wallH + rh + ch), P(-0.75 + cw, -0.5, wallH + rh + ch + 3), P(-0.85, -0.5, wallH + rh + ch + 3)], '#f4f8ff');
      }
      if (st.lantern) { const lp = P(0.6, a + 0.2, 34); g.strokeStyle = '#3a2614'; g.beginPath(); g.moveTo(lp[0], lp[1] - 8); g.lineTo(lp[0], lp[1]); g.stroke(); g.fillStyle = '#e0602a'; g.beginPath(); g.ellipse(lp[0], lp[1] + 4, 4, 5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,200,120,0.6)'; g.beginPath(); g.ellipse(lp[0], lp[1] + 4, 2, 3, 0, 0, 7); g.fill(); }
      if (st.rope) { g.strokeStyle = '#c8b080'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(...P(-a, a, wallH - 2)); g.quadraticCurveTo(...P(0, a + 0.1, wallH - 10), ...P(a, a, wallH - 2)); g.stroke(); const lb = P(-0.9, a + 0.05, 8); g.fillStyle = '#c03a2a'; g.beginPath(); g.arc(lb[0], lb[1], 5, 0, 7); g.fill(); g.strokeStyle = '#f0f0f0'; g.lineWidth = 2; g.beginPath(); g.arc(lb[0], lb[1], 3.5, 0, 7); g.stroke(); }
      if (st.shell) for (let k = 0; k < 3; k++) { const sp = P(-0.9 + k * 0.6, a + 0.02, 40); g.fillStyle = ['#f0a0a0', '#f0e0c0', '#a0d0e0'][k]; g.beginPath(); g.arc(sp[0], sp[1], 3, Math.PI, 0); g.fill(); }
    }
  });
}

// ---------- 街景道具 ----------
function buildTownSprites() {
  buildCastleSprites();
  for (const k in HOUSE_STYLES) for (let v = 0; v < 3; v++) buildHouseSprite('house_' + k + v, HOUSE_STYLES[k], v);
  const sh = (g, x, y, rx, ry) => { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
  const lg = (g, x0, x1, c) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, shade(c, -0.3)); gr.addColorStop(0.45, shade(c, 0.25)); gr.addColorStop(1, shade(c, -0.4)); return gr; };
  // 噴泉
  spr('fountain0', 110, 90, 55, 62, (g) => {
    sh(g, 56, 64, 46, 18);
    g.fillStyle = '#8a8a90'; g.beginPath(); g.ellipse(55, 58, 44, 18, 0, 0, 7); g.fill();
    g.fillStyle = '#6a6a72'; g.fillRect(11, 52, 88, 7); g.beginPath(); g.ellipse(55, 59, 44, 18, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#3a7aaa'; g.beginPath(); g.ellipse(55, 54, 38, 14, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(200,230,255,0.5)'; g.beginPath(); g.ellipse(46, 50, 14, 4, 0, 0, 7); g.fill();
    g.fillStyle = lg(g, 48, 62, '#a0a0a8'); g.fillRect(49, 22, 12, 32);
    g.fillStyle = '#9a9aa2'; g.beginPath(); g.ellipse(55, 24, 16, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#5a9aca'; g.beginPath(); g.ellipse(55, 23, 12, 4, 0, 0, 7); g.fill();
    g.fillStyle = lg(g, 51, 59, '#b0b0b8'); g.fillRect(52, 8, 6, 16); g.fillStyle = '#c0c0c8'; g.beginPath(); g.arc(55, 8, 5, 0, 7); g.fill();
  });
  // 雕像（王冠廣場）
  spr('statue0', 70, 120, 35, 104, (g) => {
    sh(g, 36, 104, 26, 10);
    g.fillStyle = '#7a7a82'; g.fillRect(14, 82, 42, 22); g.fillStyle = '#9a9aa2'; g.fillRect(12, 78, 46, 6);
    g.fillStyle = lg(g, 24, 46, '#b8bcc4'); g.beginPath(); g.moveTo(26, 78); g.lineTo(28, 40); g.lineTo(42, 40); g.lineTo(44, 78); g.closePath(); g.fill();
    g.beginPath(); g.arc(35, 32, 8, 0, 7); g.fill();
    g.fillStyle = '#e0c060'; g.beginPath(); g.moveTo(27, 26); g.lineTo(29, 18); g.lineTo(32, 23); g.lineTo(35, 16); g.lineTo(38, 23); g.lineTo(41, 18); g.lineTo(43, 26); g.closePath(); g.fill();
    g.strokeStyle = '#a8acb4'; g.lineWidth = 3; g.beginPath(); g.moveTo(42, 48); g.lineTo(54, 20); g.stroke();
  });
  // 市集攤棚（三種顏色）
  ['#c0403a', '#3a7ac0', '#d0a030'].forEach((c, v) => spr('stall' + v, 90, 90, 45, 70, (g) => {
    sh(g, 46, 70, 34, 12);
    g.fillStyle = '#5a3a20'; for (const x of [14, 76]) g.fillRect(x, 30, 3, 40);
    g.fillStyle = '#7a5430'; g.beginPath(); g.moveTo(10, 54); g.lineTo(46, 40); g.lineTo(82, 54); g.lineTo(46, 68); g.closePath(); g.fill();
    g.fillStyle = '#5a3a20'; g.fillRect(10, 54, 72, 6);
    const goods = [['#e04030', '#f0a020', '#60a030'], ['#c0c8d0', '#80a0c0', '#e0e0e0'], ['#e0c060', '#a06030', '#f0e0b0']][v];
    for (let k = 0; k < 9; k++) { g.fillStyle = goods[k % 3]; g.beginPath(); g.arc(24 + (k % 5) * 11, 50 + Math.floor(k / 5) * 6 - (k % 5) * 1.5, 4, 0, 7); g.fill(); }
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#f0e8d8' : c; g.beginPath(); g.moveTo(8 + k * 13, 34 - k * 0); g.lineTo(21 + k * 13, 34); g.lineTo(18 + k * 13, 14); g.lineTo(6 + k * 13, 14); g.closePath(); g.fill(); }
    g.fillStyle = shade(c, -0.2); for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(14.5 + k * 13, 34, 6.5, 0, Math.PI); g.fill(); }
  }));
  // 木桶
  for (let v = 0; v < 2; v++) spr('barrel' + v, 40, 50, 20, 42, (g) => {
    sh(g, 21, 42, 13, 5);
    g.fillStyle = lg(g, 8, 32, v ? '#6a4a2a' : '#8a5a30'); g.beginPath(); g.moveTo(9, 40); g.quadraticCurveTo(5, 26, 9, 12); g.lineTo(31, 12); g.quadraticCurveTo(35, 26, 31, 40); g.closePath(); g.fill();
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; for (const y of [16, 26, 36]) { g.beginPath(); g.moveTo(7, y); g.lineTo(33, y); g.stroke(); }
    g.fillStyle = shade(v ? '#6a4a2a' : '#8a5a30', 0.1); g.beginPath(); g.ellipse(20, 12, 11, 4, 0, 0, 7); g.fill();
    if (v) { g.fillStyle = '#c0c8d0'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(15 + k * 5, 10, 4, 2, 0.4, 0, 7); g.fill(); } }
  });
  // 乾草堆
  spr('hay0', 60, 50, 30, 40, (g) => {
    sh(g, 31, 40, 24, 8);
    const gr = g.createRadialGradient(26, 20, 2, 30, 28, 26); gr.addColorStop(0, '#f0d070'); gr.addColorStop(1, '#a8802a');
    g.fillStyle = gr; g.beginPath(); g.moveTo(6, 40); g.quadraticCurveTo(8, 8, 30, 6); g.quadraticCurveTo(52, 8, 54, 40); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,80,20,0.5)'; for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(10 + k * 3, 38); g.lineTo(14 + k * 2.4, 14 + Math.abs(k - 7) * 2); g.stroke(); }
  });
  // 水井
  spr('well0', 70, 80, 35, 62, (g) => {
    sh(g, 36, 62, 26, 10);
    g.fillStyle = '#8a8680'; g.beginPath(); g.ellipse(35, 52, 22, 9, 0, 0, 7); g.fill(); g.fillRect(13, 44, 44, 9);
    g.fillStyle = '#6a6660'; g.beginPath(); g.ellipse(35, 53, 22, 9, 0, 0, Math.PI); g.fill();
    for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(14 + k * 8, 45); g.lineTo(14 + k * 8, 56); g.stroke(); }
    g.fillStyle = '#1a2a3a'; g.beginPath(); g.ellipse(35, 44, 17, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#5a3a20'; g.fillRect(15, 14, 4, 32); g.fillRect(51, 14, 4, 32);
    g.fillStyle = '#7a3a2a'; g.beginPath(); g.moveTo(8, 18); g.lineTo(35, 4); g.lineTo(62, 18); g.lineTo(58, 20); g.lineTo(35, 9); g.lineTo(12, 20); g.closePath(); g.fill();
    g.strokeStyle = '#c8b080'; g.beginPath(); g.moveTo(35, 18); g.lineTo(35, 34); g.stroke(); g.fillStyle = '#6a4a2a'; g.fillRect(31, 34, 8, 6);
  });
  // 手推車
  spr('cart0', 80, 60, 40, 46, (g) => {
    sh(g, 40, 46, 30, 9);
    g.fillStyle = '#8a5a30'; g.beginPath(); g.moveTo(12, 30); g.lineTo(52, 18); g.lineTo(68, 26); g.lineTo(28, 38); g.closePath(); g.fill();
    g.fillStyle = '#6a4224'; g.beginPath(); g.moveTo(12, 30); g.lineTo(28, 38); g.lineTo(28, 30); g.lineTo(12, 22); g.closePath(); g.fill();
    g.fillStyle = '#e0c060'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(26 + k * 7, 25 - k * 1.5, 4, 0, 7); g.fill(); }
    for (const [x, y] of [[22, 40], [54, 30]]) { g.strokeStyle = '#3a2614'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 7, 8, 0, 0, 7); g.stroke(); }
    g.strokeStyle = '#5a3a20'; g.lineWidth = 3; g.beginPath(); g.moveTo(66, 26); g.lineTo(78, 36); g.stroke();
  });
  // 長椅
  spr('bench0', 60, 40, 30, 30, (g) => {
    sh(g, 30, 30, 22, 6);
    g.fillStyle = '#7a5430'; g.beginPath(); g.moveTo(8, 22); g.lineTo(46, 10); g.lineTo(52, 13); g.lineTo(14, 25); g.closePath(); g.fill();
    g.fillStyle = '#5a3a20'; g.beginPath(); g.moveTo(8, 14); g.lineTo(46, 2); g.lineTo(46, 8); g.lineTo(8, 20); g.closePath(); g.fill();
    g.fillStyle = '#3a2a1a'; for (const [x, y] of [[10, 24], [44, 13], [14, 27], [48, 16]]) g.fillRect(x, y, 2, 7);
  });
  // 紙燈籠柱（林語村）
  spr('lantern0', 30, 90, 15, 84, (g) => {
    sh(g, 16, 84, 8, 3);
    g.fillStyle = '#4a3020'; g.fillRect(13, 20, 4, 64); g.fillRect(13, 18, 14, 3);
    g.strokeStyle = '#3a2614'; g.beginPath(); g.moveTo(24, 21); g.lineTo(24, 26); g.stroke();
    const gr = g.createRadialGradient(24, 34, 1, 24, 34, 9); gr.addColorStop(0, '#ffd080'); gr.addColorStop(1, '#d0502a');
    g.fillStyle = gr; g.beginPath(); g.ellipse(24, 34, 6, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#3a2614'; g.fillRect(21, 25, 6, 2); g.fillRect(21, 41, 6, 2);
  });
  // 柴堆
  spr('logpile0', 60, 44, 30, 34, (g) => {
    sh(g, 30, 34, 24, 7);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) {
      const x = 12 + k * 11 + r * 5.5, y = 28 - r * 9;
      g.fillStyle = '#6a4224'; g.fillRect(x - 5, y - 4, 10, 8);
      g.fillStyle = '#c8a070'; g.beginPath(); g.ellipse(x - 5, y, 3, 4, 0, 0, 7); g.fill();
      g.strokeStyle = '#8a6a40'; g.beginPath(); g.arc(x - 5, y, 1.5, 0, 7); g.stroke();
    }
  });
  // 蜂箱
  spr('beehive0', 40, 50, 20, 42, (g) => {
    sh(g, 20, 42, 12, 4);
    g.fillStyle = '#5a3a20'; g.fillRect(8, 34, 24, 4);
    g.fillStyle = '#d0a040'; g.beginPath(); g.ellipse(20, 22, 12, 13, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a6020'; for (const y of [14, 20, 26, 32]) { g.beginPath(); g.moveTo(9, y); g.lineTo(31, y); g.stroke(); }
    g.fillStyle = '#3a2614'; g.beginPath(); g.arc(20, 30, 2.5, 0, 7); g.fill();
  });
  // 森之祠
  spr('shrine0', 80, 100, 40, 84, (g) => {
    sh(g, 40, 84, 30, 10);
    g.fillStyle = '#8a8680'; g.fillRect(16, 72, 48, 12);
    g.fillStyle = '#7a3a2a'; g.fillRect(20, 30, 5, 44); g.fillRect(55, 30, 5, 44);
    g.fillStyle = '#9a4a30'; g.fillRect(12, 26, 56, 6); g.fillRect(16, 36, 48, 4);
    g.fillStyle = '#3a5a2a'; g.beginPath(); g.moveTo(6, 28); g.quadraticCurveTo(40, 12, 74, 28); g.lineTo(70, 22); g.quadraticCurveTo(40, 6, 10, 22); g.closePath(); g.fill();
    g.fillStyle = '#c8c0b0'; g.fillRect(34, 54, 12, 18); g.fillStyle = '#e0e0d0'; g.beginPath(); g.arc(40, 52, 7, 0, 7); g.fill();
    g.fillStyle = '#e04a3a'; g.fillRect(36, 60, 8, 2);
  });
  // 曬網架（港口）
  spr('netrack0', 90, 70, 45, 56, (g) => {
    sh(g, 46, 56, 34, 9);
    g.fillStyle = '#5a3a20'; g.fillRect(12, 10, 4, 46); g.fillRect(74, 10, 4, 46); g.fillRect(10, 10, 70, 3);
    g.strokeStyle = 'rgba(200,190,150,0.85)'; g.lineWidth = 1;
    for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(16 + k * 7, 13); g.quadraticCurveTo(18 + k * 7, 34, 14 + k * 7, 46); g.stroke(); }
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(16, 18 + k * 5); g.quadraticCurveTo(45, 22 + k * 6, 74, 18 + k * 5); g.stroke(); }
    g.fillStyle = '#d0a040'; for (const x of [30, 52]) { g.beginPath(); g.arc(x, 26, 3, 0, 7); g.fill(); }
  });
  // 船錨
  spr('anchor0', 50, 60, 25, 50, (g) => {
    sh(g, 26, 50, 16, 5);
    g.strokeStyle = '#4a4e56'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(25, 10); g.lineTo(25, 44); g.stroke();
    g.beginPath(); g.arc(25, 32, 14, 0.2, Math.PI - 0.2); g.stroke();
    g.beginPath(); g.moveTo(16, 16); g.lineTo(34, 16); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(25, 7, 4, 0, 7); g.stroke(); g.lineCap = 'butt';
    g.strokeStyle = '#a08a60'; g.lineWidth = 2; g.beginPath(); g.moveTo(25, 4); g.quadraticCurveTo(40, 0, 44, 20); g.stroke();
  });
  // 曬魚架
  spr('fishrack0', 60, 60, 30, 48, (g) => {
    sh(g, 30, 48, 22, 7);
    g.fillStyle = '#5a3a20'; g.fillRect(8, 12, 3, 36); g.fillRect(50, 12, 3, 36); g.fillRect(6, 12, 50, 3);
    for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#9aa8b0' : '#b0a080'; g.beginPath(); g.ellipse(16 + k * 8, 26, 3, 8, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(13 + k * 8, 35); g.lineTo(19 + k * 8, 35); g.lineTo(16 + k * 8, 31); g.fill(); }
  });
  // 鐵砧
  spr('anvilobj0', 50, 40, 25, 32, (g) => {
    sh(g, 25, 32, 16, 5);
    g.fillStyle = '#5a3a20'; g.fillRect(16, 20, 18, 12);
    g.fillStyle = lg(g, 8, 44, '#5a5e66'); g.beginPath(); g.moveTo(6, 12); g.lineTo(44, 12); g.lineTo(40, 18); g.lineTo(30, 18); g.lineTo(30, 22); g.lineTo(20, 22); g.lineTo(20, 18); g.lineTo(12, 18); g.closePath(); g.fill();
    g.fillStyle = '#8a8e96'; g.fillRect(6, 10, 38, 3);
    g.fillStyle = '#7a7e86'; g.fillRect(36, 4, 3, 8); g.fillStyle = '#5a3a20'; g.fillRect(33, 2, 9, 3);
  });
  // 熔爐
  spr('forge0', 90, 110, 45, 90, (g) => {
    sh(g, 46, 90, 36, 12);
    g.fillStyle = '#6a625a'; g.beginPath(); g.moveTo(12, 90); g.lineTo(12, 50); g.quadraticCurveTo(45, 30, 78, 50); g.lineTo(78, 90); g.closePath(); g.fill();
    for (let y = 56; y < 90; y += 8) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(12, y); g.lineTo(78, y); g.stroke(); }
    g.fillStyle = '#2a1a10'; g.beginPath(); g.moveTo(30, 90); g.lineTo(30, 66); g.quadraticCurveTo(45, 56, 60, 66); g.lineTo(60, 90); g.closePath(); g.fill();
    const gr = g.createRadialGradient(45, 82, 2, 45, 80, 16); gr.addColorStop(0, '#fff0a0'); gr.addColorStop(0.5, '#ff7020'); gr.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(45, 82, 14, 9, 0, 0, 7); g.fill();
    g.fillStyle = '#5a524a'; g.fillRect(52, 6, 14, 40); g.fillStyle = '#3a3430'; g.fillRect(50, 4, 18, 5);
  });
  // 礦車
  spr('orecart0', 70, 56, 35, 44, (g) => {
    sh(g, 35, 44, 26, 7);
    g.strokeStyle = '#4a3a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(2, 50); g.lineTo(68, 30); g.moveTo(8, 54); g.lineTo(68, 36); g.stroke();
    g.fillStyle = lg(g, 14, 56, '#6a6a70'); g.beginPath(); g.moveTo(12, 22); g.lineTo(58, 12); g.lineTo(54, 36); g.lineTo(18, 44); g.closePath(); g.fill();
    g.fillStyle = '#8a7a6a'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(20 + k * 6, 22 - k * 1.5, 5, 0, 7); g.fill(); }
    g.fillStyle = '#c0a050'; g.beginPath(); g.arc(36, 16, 3, 0, 7); g.fill();
    g.fillStyle = '#2a2a2e'; for (const [x, y] of [[22, 44], [50, 37]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  });
  // 帳篷（綠洲）
  ['#c0503a', '#e0c070'].forEach((c, v) => spr('tent' + v, 100, 90, 50, 72, (g) => {
    sh(g, 50, 72, 40, 13);
    g.fillStyle = shade(c, -0.25); g.beginPath(); g.moveTo(50, 10); g.lineTo(92, 64); g.lineTo(50, 78); g.closePath(); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(50, 10); g.lineTo(8, 64); g.lineTo(50, 78); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(50, 10); g.lineTo(8 + k * 10.5, 64 + k * 3.5); g.stroke(); }
    g.fillStyle = '#2a1a10'; g.beginPath(); g.moveTo(40, 75); g.lineTo(50, 40); g.lineTo(58, 77); g.closePath(); g.fill();
    g.fillStyle = '#5a3a20'; g.fillRect(49, 4, 2, 8); g.fillStyle = '#e04030'; g.beginPath(); g.moveTo(51, 4); g.lineTo(60, 7); g.lineTo(51, 10); g.fill();
  }));
  // 陶罐
  spr('pots0', 50, 44, 25, 36, (g) => {
    sh(g, 25, 36, 18, 6);
    for (const [x, y, r, c] of [[16, 26, 9, '#b8683a'], [33, 28, 8, '#a8582a'], [25, 32, 6, '#c8885a']]) {
      g.fillStyle = lg(g, x - r, x + r, c); g.beginPath(); g.ellipse(x, y, r, r * 1.1, 0, 0, 7); g.fill();
      g.fillStyle = shade(c, -0.3); g.fillRect(x - r * 0.4, y - r * 1.3, r * 0.8, 4);
      g.strokeStyle = '#f0d8a0'; g.beginPath(); g.moveTo(x - r * 0.8, y); g.lineTo(x + r * 0.8, y); g.stroke();
    }
  });
  // 獵人的皮架（霜嶺村）
  spr('huntrack0', 70, 80, 35, 64, (g) => {
    sh(g, 36, 64, 26, 8);
    g.fillStyle = '#5a3a20'; g.fillRect(10, 10, 4, 54); g.fillRect(56, 10, 4, 54); g.fillRect(8, 10, 54, 4);
    g.fillStyle = '#a07a50'; g.beginPath(); g.moveTo(18, 14); g.lineTo(50, 14); g.lineTo(54, 30); g.lineTo(46, 46); g.lineTo(34, 52); g.lineTo(22, 46); g.lineTo(14, 30); g.closePath(); g.fill();
    g.strokeStyle = '#6a4a30'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(20 + k * 5, 18); g.lineTo(22 + k * 4, 44); g.stroke(); }
    g.strokeStyle = '#c8b080'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, 40); g.lineTo(18, 30); g.moveTo(60, 40); g.lineTo(52, 30); g.stroke();
  });
  // 小船（碼頭邊）
  for (let v = 0; v < 2; v++) spr('boat' + v, 90, 50, 45, 30, (g) => {
    g.fillStyle = 'rgba(0,40,80,0.25)'; g.beginPath(); g.ellipse(45, 34, 38, 11, -0.35, 0, 7); g.fill();
    const c = v ? '#3a6a9a' : '#8a5a30';
    g.fillStyle = shade(c, -0.25); g.beginPath(); g.moveTo(8, 30); g.quadraticCurveTo(40, 44, 84, 18); g.lineTo(78, 10); g.quadraticCurveTo(40, 28, 12, 20); g.closePath(); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(12, 20); g.quadraticCurveTo(40, 28, 78, 10); g.lineTo(76, 6); g.quadraticCurveTo(40, 20, 14, 15); g.closePath(); g.fill();
    g.fillStyle = '#5a3a20'; g.beginPath(); g.moveTo(16, 19); g.quadraticCurveTo(42, 26, 74, 10); g.quadraticCurveTo(42, 20, 16, 16); g.fill();
    g.fillStyle = '#f0f0e8'; g.fillRect(24, 20, 30, 2);
    if (v) { g.fillStyle = '#5a3a20'; g.fillRect(44, -2 + 4, 2, 18); g.fillStyle = '#f0ece0'; g.beginPath(); g.moveTo(46, 4); g.lineTo(62, 14); g.lineTo(46, 18); g.closePath(); g.fill(); }
  });
  // 燈塔
  spr('lighthouse0', 90, 220, 45, 196, (g) => {
    sh(g, 46, 196, 34, 12);
    g.fillStyle = '#7a7a82'; g.beginPath(); g.ellipse(45, 190, 32, 12, 0, 0, 7); g.fill();
    for (let k = 0; k < 6; k++) {
      const y0 = 186 - k * 22, w0 = 22 - k * 1.6, w1 = 22 - (k + 1) * 1.6;
      g.fillStyle = k % 2 ? '#c03a2a' : '#f0ece4'; g.beginPath(); g.moveTo(45 - w0, y0); g.lineTo(45 - w1, y0 - 22); g.lineTo(45 + w1, y0 - 22); g.lineTo(45 + w0, y0); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.moveTo(45 + w0 * 0.3, y0); g.lineTo(45 + w1 * 0.3, y0 - 22); g.lineTo(45 + w1, y0 - 22); g.lineTo(45 + w0, y0); g.closePath(); g.fill();
    }
    g.fillStyle = '#3a3a42'; g.fillRect(28, 50, 34, 5);
    g.fillStyle = '#ffe890'; g.fillRect(32, 30, 26, 20); g.strokeStyle = '#3a3a42'; g.lineWidth = 2; for (const x of [32, 41, 50, 58]) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 50); g.stroke(); }
    g.fillStyle = '#c03a2a'; g.beginPath(); g.moveTo(26, 30); g.lineTo(45, 10); g.lineTo(64, 30); g.closePath(); g.fill();
    g.fillStyle = '#3a3a42'; g.fillRect(44, 4, 2, 7);
    g.fillStyle = '#3a2a1a'; g.fillRect(40, 168, 10, 18);
  });
}

// ===== 王城美術（v2.25）：宮殿、塔樓、旗幟、紅毯、樹籬、騎士雕像、王家路燈 =====
function buildCastleSprites() {
  const sh = (g, x, y, rx, ry, a = 0.3) => { g.fillStyle = 'rgba(0,0,0,' + a + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
  const lg = (g, x0, x1, c) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, shade(c, -0.35)); gr.addColorStop(0.4, shade(c, 0.2)); gr.addColorStop(1, shade(c, -0.45)); return gr; };
  const flag = (g, x, y, h, col = '#a01828') => {
    g.fillStyle = '#3a3028'; g.fillRect(x - 1, y - h, 2, h);
    g.fillStyle = '#e0c060'; g.beginPath(); g.arc(x, y - h, 2.5, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(x + 1, y - h + 3); g.quadraticCurveTo(x + 12, y - h, x + 22, y - h + 5); g.quadraticCurveTo(x + 12, y - h + 10, x + 1, y - h + 13); g.closePath(); g.fill();
    g.fillStyle = '#f0d060'; g.beginPath(); g.arc(x + 10, y - h + 8, 2.2, 0, 7); g.fill();
  };
  // 圓形塔樓（城角）與城門塔
  const tower = (key, H, r, roofH) => spr(key, r * 2 + 40, H + roofH + 60, r + 20, H + roofH + 40, (g) => {
    const cx = r + 20, by = H + roofH + 40;
    sh(g, cx + 4, by, r + 8, (r + 8) * 0.45);
    g.fillStyle = lg(g, cx - r, cx + r, '#8a867e'); g.fillRect(cx - r, by - H, r * 2, H);
    g.beginPath(); g.ellipse(cx, by, r, r * 0.45, 0, 0, Math.PI); g.fill();
    g.strokeStyle = 'rgba(30,25,20,0.45)'; g.lineWidth = 1;
    for (let y = by - H + 10; y < by; y += 10) { g.beginPath(); g.ellipse(cx, y, r, r * 0.45, 0, 0, Math.PI); g.stroke(); }
    for (let y = by - H + 10, row = 0; y < by; y += 10, row++) for (let k = -3; k <= 3; k++) { const x = cx + Math.sin((k + (row % 2) * 0.5) / 3.6 * 1.4) * r; g.beginPath(); g.moveTo(x, y + r * 0.45 * Math.cos((k / 3.6) * 1.4)); g.lineTo(x, y + 10 + r * 0.45 * Math.cos((k / 3.6) * 1.4)); g.stroke(); }
    // 箭窗與王家紋章
    g.fillStyle = '#1a1612'; g.fillRect(cx - 3, by - H * 0.55, 6, 16); g.fillRect(cx - 3, by - H * 0.85, 6, 12);
    g.fillStyle = '#a01828'; g.beginPath(); g.moveTo(cx - 10, by - H * 0.42); g.lineTo(cx + 10, by - H * 0.42); g.lineTo(cx + 10, by - H * 0.42 + 22); g.lineTo(cx, by - H * 0.42 + 30); g.lineTo(cx - 10, by - H * 0.42 + 22); g.closePath(); g.fill();
    g.strokeStyle = '#e0c060'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#f0d060'; g.beginPath(); const qy = by - H * 0.42 + 8; g.moveTo(cx - 6, qy + 6); g.lineTo(cx - 6, qy); g.lineTo(cx - 3, qy + 3); g.lineTo(cx, qy - 2); g.lineTo(cx + 3, qy + 3); g.lineTo(cx + 6, qy); g.lineTo(cx + 6, qy + 6); g.closePath(); g.fill();
    // 城垛
    g.fillStyle = '#9a968e'; g.beginPath(); g.ellipse(cx, by - H, r + 3, (r + 3) * 0.45, 0, 0, 7); g.fill();
    for (let k = 0; k < 8; k++) { const a = Math.PI * (0.05 + k / 7 * 0.9), x = cx + Math.cos(a) * (r + 1), y = by - H + Math.sin(a) * (r + 1) * 0.45; g.fillStyle = '#7a766e'; g.fillRect(x - 4, y - 9, 8, 9); g.fillStyle = '#a8a49c'; g.fillRect(x - 4, y - 11, 8, 3); }
    // 尖頂（藍瓦金邊）
    const rg = g.createLinearGradient(cx - r, 0, cx + r, 0); rg.addColorStop(0, '#1a3a7a'); rg.addColorStop(0.45, '#4a7ad0'); rg.addColorStop(1, '#14285a');
    g.fillStyle = rg; g.beginPath(); g.moveTo(cx - r - 4, by - H - 4); g.lineTo(cx, by - H - roofH); g.lineTo(cx + r + 4, by - H - 4); g.quadraticCurveTo(cx, by - H + (r + 4) * 0.45, cx - r - 4, by - H - 4); g.fill();
    g.strokeStyle = '#e0c060'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - r - 4, by - H - 4); g.quadraticCurveTo(cx, by - H + (r + 4) * 0.45, cx + r + 4, by - H - 4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(cx, by - H - roofH); g.lineTo(cx - r - 4 + k * (2 * r + 8) / 5, by - H - 2 + Math.sin(k / 5 * Math.PI) * 8); g.stroke(); }
    flag(g, cx, by - H - roofH + 2, 26);
  });
  tower('ctower0', 120, 26, 54);
  tower('gtower0', 96, 20, 42);
  // 城牆上的王家旗幟（疊在城牆左面）
  spr('banner0', 30, 70, 15, 4, (g) => {
    g.fillStyle = '#3a2a1a'; g.fillRect(2, 2, 26, 3);
    const gr = g.createLinearGradient(4, 0, 26, 0); gr.addColorStop(0, '#701020'); gr.addColorStop(0.5, '#b01c30'); gr.addColorStop(1, '#701020');
    g.fillStyle = gr; g.beginPath(); g.moveTo(5, 5); g.lineTo(25, 5); g.lineTo(25, 56); g.lineTo(15, 66); g.lineTo(5, 56); g.closePath(); g.fill();
    g.strokeStyle = '#e0c060'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#f0d060'; g.beginPath(); g.moveTo(9, 30); g.lineTo(9, 22); g.lineTo(12, 26); g.lineTo(15, 18); g.lineTo(18, 26); g.lineTo(21, 22); g.lineTo(21, 30); g.closePath(); g.fill();
    g.fillRect(9, 31, 12, 2); g.beginPath(); g.arc(15, 42, 3, 0, 7); g.fill();
  });
  // 紅毯（0 中間、1 北側金邊、2 南側金邊）
  for (let v = 0; v < 5; v++) spr('deco_carpet' + v, TW + 2, TH + 2, HW + 1, HH + 1, (g) => {
    g.translate(1, 1);
    g.fillStyle = '#9a1424'; diamondPath(g, TW, TH); g.fill();
    g.strokeStyle = 'rgba(255,200,120,0.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(HW * 0.5, HH * 1.5); g.lineTo(HW * 1.5, HH * 0.5); g.stroke();
    g.fillStyle = 'rgba(240,200,90,0.5)'; g.beginPath(); g.arc(HW, HH, 2, 0, 7); g.fill();
    g.strokeStyle = '#e0b840'; g.lineWidth = 3;
    if (v === 1) { g.beginPath(); g.moveTo(HW, 1); g.lineTo(TW - 1, HH); g.stroke(); }
    if (v === 2) { g.beginPath(); g.moveTo(1, HH); g.lineTo(HW, TH - 1); g.stroke(); }
    if (v === 3) { g.beginPath(); g.moveTo(1, HH); g.lineTo(HW, 1); g.stroke(); }
    if (v === 4) { g.beginPath(); g.moveTo(TW - 1, HH); g.lineTo(HW, TH - 1); g.stroke(); }
  });
  // 修剪整齊的樹籬
  spr('hedge0', TW + 4, TH + 40, HW + 2, 40 + HH, (g) => {
    g.translate(2, 0);
    const top = 14, hgt = 24;
    g.fillStyle = '#2e5a24'; g.beginPath(); g.moveTo(0, top + HH); g.lineTo(HW, top + TH); g.lineTo(HW, top + TH + hgt); g.lineTo(0, top + HH + hgt); g.closePath(); g.fill();
    g.fillStyle = '#244a1c'; g.beginPath(); g.moveTo(TW, top + HH); g.lineTo(HW, top + TH); g.lineTo(HW, top + TH + hgt); g.lineTo(TW, top + HH + hgt); g.closePath(); g.fill();
    g.fillStyle = '#4a8a34'; g.beginPath(); g.moveTo(HW, top); g.lineTo(TW, top + HH); g.lineTo(HW, top + TH); g.lineTo(0, top + HH); g.closePath(); g.fill();
    const R = mulberry32(77); for (let k = 0; k < 40; k++) { g.fillStyle = R() < 0.5 ? 'rgba(120,180,80,0.5)' : 'rgba(20,50,15,0.4)'; g.fillRect(R() * TW, top + R() * (TH + hgt), 2, 2); }
  });
  // 騎士雕像
  spr('knightstatue0', 70, 140, 35, 124, (g) => {
    sh(g, 36, 124, 24, 9);
    g.fillStyle = '#7a7a82'; g.fillRect(14, 100, 42, 24); g.fillStyle = '#9a9aa2'; g.fillRect(11, 96, 48, 6); g.fillStyle = '#e0c060'; g.fillRect(20, 108, 30, 3);
    const st = lg(g, 22, 48, '#c8ccd4');
    g.fillStyle = st; g.fillRect(27, 66, 6, 30); g.fillRect(37, 66, 6, 30);
    g.beginPath(); g.moveTo(24, 70); g.lineTo(26, 38); g.lineTo(44, 38); g.lineTo(46, 70); g.closePath(); g.fill();
    g.beginPath(); g.arc(35, 30, 8, 0, 7); g.fill();
    g.fillStyle = '#9aa0a8'; g.fillRect(29, 28, 12, 3);
    g.fillStyle = '#b8bcc4'; g.beginPath(); g.moveTo(35, 22); g.quadraticCurveTo(46, 14, 44, 26); g.fill();
    // 雙手握劍立於身前
    g.fillStyle = '#d8dce4'; g.fillRect(34, 40, 3, 52); g.fillStyle = '#e0c060'; g.fillRect(28, 46, 15, 3); g.fillRect(33, 40, 5, 6);
    g.fillStyle = '#a8acb4'; g.beginPath(); g.moveTo(14, 44); g.lineTo(26, 42); g.lineTo(26, 70); g.lineTo(20, 76); g.lineTo(14, 70); g.closePath(); g.fill();
    g.fillStyle = '#a01828'; g.fillRect(17, 52, 6, 12);
  });
  // 王家路燈
  spr('rlamp0', 40, 110, 20, 102, (g) => {
    sh(g, 21, 102, 11, 4);
    g.fillStyle = '#2a2420'; g.fillRect(14, 96, 12, 6); g.fillStyle = lg(g, 16, 24, '#6a5a3a'); g.fillRect(18, 30, 4, 68);
    g.fillStyle = '#c8a040'; g.fillRect(16, 60, 8, 3); g.fillRect(16, 90, 8, 3);
    g.fillStyle = '#3a3028'; g.fillRect(10, 18, 20, 3); g.fillRect(12, 34, 16, 3);
    g.fillStyle = '#ffe08a'; g.fillRect(12, 21, 16, 13); g.strokeStyle = '#3a3028'; g.lineWidth = 2; g.strokeRect(12, 21, 16, 13); g.beginPath(); g.moveTo(20, 21); g.lineTo(20, 34); g.stroke();
    g.fillStyle = '#e0c060'; g.beginPath(); g.moveTo(10, 18); g.lineTo(20, 8); g.lineTo(30, 18); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(15, 8); g.lineTo(15, 2); g.lineTo(17.5, 5); g.lineTo(20, 0); g.lineTo(22.5, 5); g.lineTo(25, 2); g.lineTo(25, 8); g.closePath(); g.fill();
  });
  // 宮殿
  const W5 = 5 * TW + 40, H5 = 5 * TH + 300;
  spr('palace0', W5, H5, W5 / 2, H5 - 5 * TH / 2 - 10, (g) => {
    const ox = W5 / 2, oy = H5 - 5 * TH / 2 - 10;
    const P = (x, y, z) => [ox + (x - y) * HW, oy + (x + y) * HH - z];
    const poly = (pts, fill, stroke, lw = 1) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
    const line = (a, b, col, lw = 1) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); };
    const a = 2.3, H = 96;
    poly([P(-a - 0.4, a + 0.4, 0), P(a + 0.4, a + 0.4, 0), P(a + 0.4, -a - 0.4, 0), P(a + 1.4, -a, 0), P(a + 1.4, a + 1.4, 0), P(-a, a + 1.4, 0)], 'rgba(0,0,0,0.32)');
    // 台基
    poly([P(-a - 0.3, a + 0.3, 0), P(a + 0.3, a + 0.3, 0), P(a + 0.3, a + 0.3, 10), P(-a - 0.3, a + 0.3, 10)], '#8a8680');
    poly([P(a + 0.3, a + 0.3, 0), P(a + 0.3, -a - 0.3, 0), P(a + 0.3, -a - 0.3, 10), P(a + 0.3, a + 0.3, 10)], '#6a6660');
    // 大理石牆
    poly([P(-a, a, 10), P(a, a, 10), P(a, a, H), P(-a, a, H)], '#ece6da', 'rgba(60,50,40,0.5)');
    poly([P(a, a, 10), P(a, -a, 10), P(a, -a, H), P(a, a, H)], '#c8c0b0', 'rgba(60,50,40,0.5)');
    for (let z = 22; z < H; z += 14) { line(P(-a, a, z), P(a, a, z), 'rgba(0,0,0,0.06)'); line(P(a, a, z), P(a, -a, z), 'rgba(0,0,0,0.08)'); }
    // 金色腰線與簷口
    for (const z of [H * 0.52, H]) { poly([P(-a, a, z - 3), P(a, a, z - 3), P(a, a, z + 2), P(-a, a, z + 2)], '#d8b040'); poly([P(a, a, z - 3), P(a, -a, z - 3), P(a, -a, z + 2), P(a, a, z + 2)], '#b08a20'); }
    // 柱廊（正面）
    for (let k = 0; k < 7; k++) {
      const t = -a + 0.35 + k * (2 * a - 0.7) / 6;
      poly([P(t - 0.09, a + 0.25, 10), P(t + 0.09, a + 0.25, 10), P(t + 0.09, a + 0.25, H * 0.5), P(t - 0.09, a + 0.25, H * 0.5)], '#f6f2ea', 'rgba(80,70,60,0.35)');
      poly([P(t - 0.13, a + 0.25, H * 0.5 - 3), P(t + 0.13, a + 0.25, H * 0.5 - 3), P(t + 0.13, a + 0.25, H * 0.5), P(t - 0.13, a + 0.25, H * 0.5)], '#d8b040');
    }
    // 正門（拱門、金色門框）
    poly([P(-0.45, a, 10), P(0.45, a, 10), P(0.45, a, 44), P(-0.45, a, 44)], '#4a1a1a', '#d8b040', 2);
    { const c = P(0, a, 44); g.fillStyle = '#4a1a1a'; g.beginPath(); g.arc(c[0], c[1], 14, Math.PI, 0); g.fill(); g.strokeStyle = '#d8b040'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#f0d060'; g.beginPath(); g.arc(...P(0.15, a, 26), 2, 0, 7); g.fill(); }
    // 彩繪玻璃窗
    const win = (fx, fy, z, side) => {
      const pts = side ? [P(a, fy - 0.22, z), P(a, fy + 0.22, z), P(a, fy + 0.22, z + 18), P(a, fy - 0.22, z + 18)] : [P(fx - 0.22, a, z), P(fx + 0.22, a, z), P(fx + 0.22, a, z + 18), P(fx - 0.22, a, z + 18)];
      const gr = g.createLinearGradient(...pts[0], ...pts[2]); gr.addColorStop(0, '#3a6ac0'); gr.addColorStop(0.5, '#e0b040'); gr.addColorStop(1, '#a02030');
      poly(pts, gr, '#d8b040', 1.5);
    };
    for (const fx of [-1.6, -0.9, 0.9, 1.6]) win(fx, 0, H * 0.62, false);
    for (const fy of [-1.6, -0.6, 0.6, 1.6]) { win(0, fy, H * 0.62, true); win(0, fy, 24, true); }
    // 屋頂（深藍）
    poly([P(-a - 0.2, -a - 0.2, H + 2), P(a + 0.2, -a - 0.2, H + 2), P(a + 0.2, a + 0.2, H + 2), P(-a - 0.2, a + 0.2, H + 2)], '#2a3a6a', '#d8b040', 2);
    // 中央金色圓頂
    const dc = P(0, 0, H + 2);
    g.fillStyle = '#e6ded0'; g.fillRect(dc[0] - 34, dc[1] - 30, 68, 30);
    for (let k = 0; k < 6; k++) { g.fillStyle = '#c8c0b0'; g.fillRect(dc[0] - 32 + k * 12.5, dc[1] - 28, 4, 26); }
    const dg = g.createRadialGradient(dc[0] - 12, dc[1] - 70, 4, dc[0], dc[1] - 46, 46); dg.addColorStop(0, '#fff6c0'); dg.addColorStop(0.45, '#e0b840'); dg.addColorStop(1, '#8a6010');
    g.fillStyle = dg; g.beginPath(); g.moveTo(dc[0] - 38, dc[1] - 30); g.quadraticCurveTo(dc[0] - 38, dc[1] - 82, dc[0], dc[1] - 88); g.quadraticCurveTo(dc[0] + 38, dc[1] - 82, dc[0] + 38, dc[1] - 30); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,80,10,0.5)'; g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(dc[0] + k * 14, dc[1] - 30); g.quadraticCurveTo(dc[0] + k * 9, dc[1] - 78, dc[0], dc[1] - 88); g.stroke(); }
    g.fillStyle = '#e0c060'; g.fillRect(dc[0] - 2, dc[1] - 104, 4, 18);
    g.beginPath(); const ky = dc[1] - 112; g.moveTo(dc[0] - 9, ky + 8); g.lineTo(dc[0] - 9, ky); g.lineTo(dc[0] - 4.5, ky + 4); g.lineTo(dc[0], ky - 4); g.lineTo(dc[0] + 4.5, ky + 4); g.lineTo(dc[0] + 9, ky); g.lineTo(dc[0] + 9, ky + 8); g.closePath(); g.fill();
    // 兩側尖塔
    for (const [tx, ty] of [[-a, a], [a, -a], [a, a]]) {
      const b = P(tx, ty, H), r = 14;
      g.fillStyle = lg(g, b[0] - r, b[0] + r, '#e6ded0'); g.fillRect(b[0] - r, b[1] - 40, r * 2, 44);
      g.fillStyle = '#d8b040'; g.fillRect(b[0] - r, b[1] - 42, r * 2, 4);
      g.fillStyle = '#1a1612'; g.fillRect(b[0] - 3, b[1] - 32, 6, 12);
      const rg = g.createLinearGradient(b[0] - r, 0, b[0] + r, 0); rg.addColorStop(0, '#1a3a7a'); rg.addColorStop(0.45, '#4a7ad0'); rg.addColorStop(1, '#14285a');
      g.fillStyle = rg; g.beginPath(); g.moveTo(b[0] - r - 3, b[1] - 42); g.lineTo(b[0], b[1] - 92); g.lineTo(b[0] + r + 3, b[1] - 42); g.closePath(); g.fill();
      g.strokeStyle = '#d8b040'; g.lineWidth = 2; g.beginPath(); g.moveTo(b[0] - r - 3, b[1] - 42); g.lineTo(b[0] + r + 3, b[1] - 42); g.stroke();
      flag(g, b[0], b[1] - 90, 22);
    }
    // 正門前的階梯與紅毯
    for (let k = 0; k < 3; k++) poly([P(-0.7, a + 0.3 + k * 0.25, 10 - k * 3.3), P(0.7, a + 0.3 + k * 0.25, 10 - k * 3.3), P(0.7, a + 0.55 + k * 0.25, 10 - k * 3.3), P(-0.7, a + 0.55 + k * 0.25, 10 - k * 3.3)], k % 2 ? '#d8d0c0' : '#c8c0b0');
    poly([P(-0.35, a + 0.3, 10.5), P(0.35, a + 0.3, 10.5), P(0.35, a + 1.1, 1), P(-0.35, a + 1.1, 1)], '#9a1424');
  });
}
