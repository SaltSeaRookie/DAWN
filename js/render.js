'use strict';
// ===== 繪製 =====
let darkCanvas = null, darkCtx = null, vignette = null, lowCanvas = null, lowCtx = null, mainCtx = null;
const Settings = { grade: true, autoPickup: true };
try { Object.assign(Settings, JSON.parse(localStorage.getItem('dawnlands_settings') || '{}')); } catch (e) { /* */ }
function saveSettings() { try { localStorage.setItem('dawnlands_settings', JSON.stringify(Settings)); } catch (e) { /* */ } }

const ARMOR_LOOK = {
  leather: { body: '#6a4a2e', sleeve: '#5a3e26' }, studded: { body: '#5a4030', sleeve: '#4a3426', trim: '#b8a070' },
  chainmail: { body: '#8a929c', sleeve: '#6a7480' }, plate: { body: '#c8d0da', sleeve: '#a8b0ba', plate: true },
  robe: { body: '#2a3a7a', robe: true, trim: '#c0a050' }, archmage_robe: { body: '#4a2a7a', robe: true, trim: '#e0c060' },
  ranger_leather: { body: '#3a5a2a', sleeve: '#2e4a22', trim: '#c8b880' }, scale_mail: { body: '#6a7a6a', sleeve: '#566456', trim: '#a0a890' },
  battle_robe: { body: '#3a2a5a', robe: true, trim: '#a080e0' }, holy_robe: { body: '#f0ead8', robe: true, trim: '#e0c060' },
  dragon_plate: { body: '#8a2a1a', sleeve: '#6a2014', plate: true, trim: '#e0a040' },
};
const WEAPON_SPRITE = { dagger: 'dagger', sword: 'sword', claymore: 'claymore', axe: 'axe', spear: 'spear', mace: 'mace', staff: 'staff', bow: 'bow' };

function buildMinimapBase() {
  const W = G.world;
  const c = makeCanvas(W.w, W.h); const g = c.getContext('2d');
  const img = g.createImageData(W.w, W.h);
  const col = {
    [TILE.GRASS]: [104, 136, 62], [TILE.DARKGRASS]: [70, 100, 46], [TILE.DIRT]: [140, 115, 82], [TILE.COBBLE]: [150, 140, 125],
    [TILE.SOIL]: [76, 62, 48], [TILE.WATER]: [40, 90, 130], [TILE.SAND]: [186, 166, 125], [TILE.CANYON]: [128, 106, 82],
    [TILE.LAVA]: [230, 80, 20], [TILE.ASH]: [70, 60, 56], [TILE.DESERT]: [200, 168, 110], [TILE.BRIDGE]: [120, 84, 46], [TILE.DUNGEON]: [70, 68, 64], [TILE.SEA]: [26, 58, 90], [TILE.SNOW]: [220, 224, 232], [TILE.ICE]: [168, 204, 224], 255: [8, 8, 8],
  };
  for (let i = 0; i < W.w * W.h; i++) {
    let c2 = col[W.tiles[i]] || [0, 0, 0];
    const o = W.objGrid[i] >= 0 ? W.objs[W.objGrid[i]] : null;
    if (o && o.kind === 'tree') c2 = [36, 62, 30];
    if (o && o.kind === 'pine') c2 = [40, 74, 62];
    else if (o && (o.kind === 'cliff' || o.kind === 'wall')) c2 = o.style === 3 ? [150, 156, 168] : o.kind === 'wall' ? [110, 106, 100] : [58, 50, 42];
    else if (o && o.kind === 'house') c2 = [150, 70, 50];
    img.data[i * 4] = c2[0]; img.data[i * 4 + 1] = c2[1]; img.data[i * 4 + 2] = c2[2]; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  G.minimapBase = c;
}

function render() {
  const W = G.world, p = G.player, m = G.map;
  const hud = HUD_H(), viewH = VH - hud;
  const px = 1;
  // 世界先繪製到離屏畫布，再套用色調
  mainCtx = canvas.getContext('2d');
  const LW = Math.ceil(VW * px), LH = Math.ceil(VH * px);
  if (!lowCanvas || lowCanvas.width !== LW || lowCanvas.height !== LH) { lowCanvas = makeCanvas(LW, LH); lowCtx = lowCanvas.getContext('2d'); }
  ctx = lowCtx;
  ctx.setTransform(px, 0, 0, px, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = '#060505'; ctx.fillRect(0, 0, VW, VH);

  const ps = toScreen(p.x, p.y);
  G.cam.x = lerp(G.cam.x, ps.x, 0.12); G.cam.y = lerp(G.cam.y, ps.y - 20, 0.12);
  let shx = 0, shy = 0;
  if (G.shake > 0) { shx = rand(-G.shake, G.shake); shy = rand(-G.shake, G.shake); }
  const snap = 1;
  const ox = Math.round((VW / 2 - G.cam.x + shx) / snap) * snap, oy = Math.round((viewH / 2 - G.cam.y + shy) / snap) * snap;
  const S = (x, y) => [(x - y) * HW + ox, (x + y) * HH + oy];
  G._S = S;

  const corners = [[0, -140], [VW, -140], [0, VH + 160], [VW, VH + 160]].map(([sx, sy]) => toWorld(sx - ox, sy - oy));
  const x0 = clamp(Math.floor(Math.min(...corners.map((c) => c.x))) - 2, 0, W.w - 1);
  const x1 = clamp(Math.ceil(Math.max(...corners.map((c) => c.x))) + 2, 0, W.w - 1);
  const y0 = clamp(Math.floor(Math.min(...corners.map((c) => c.y))) - 2, 0, W.h - 1);
  const y1 = clamp(Math.ceil(Math.max(...corners.map((c) => c.y))) + 2, 0, W.h - 1);

  // 地表
  const wph = Math.floor(G.t * 1.2);
  for (let j = y0; j <= y1; j++)
    for (let i = x0; i <= x1; i++) {
      const sx = (i - j) * HW + ox, sy = (i + j) * HH + oy;
      if (sx < -HW - 4 || sx > VW + HW + 4 || sy < -TH - 4 || sy > VH + 4) continue;
      const k = j * W.w + i, t = W.tiles[k];
      if (t === 255) continue;
      let v = W.variant[k];
      if (t === TILE.WATER || t === TILE.SEA || t === TILE.LAVA) v = (v + wph + ((i * 7 + j * 3) % 3)) % 6;
      ctx.drawImage(TEX[t][v], sx - HW - 1, sy - 1);
    }
  for (let j = y0; j <= y1; j++)
    for (let i = x0; i <= x1; i++) {
      const di = W.decoGrid[j * W.w + i]; if (di < 0) continue;
      const d = W.decos[di];
      const [sx, sy] = S(i + 0.5 + d.ox, j + 0.5 + d.oy);
      if (sx < -40 || sx > VW + 40 || sy < -40 || sy > VH + 40) continue;
      const s = SPR['deco_' + d.kind + d.v];
      ctx.drawImage(s.c, sx - s.ax, sy - s.ay);
    }
  // 傳送點光暈
  for (const pt of W.portals) {
    const [sx, sy] = S(pt.x, pt.y);
    const a = 0.25 + Math.sin(G.t * 3) * 0.1;
    ctx.fillStyle = 'rgba(160,120,255,' + a + ')'; ctx.beginPath(); ctx.ellipse(sx, sy, 30, 15, 0, 0, 7); ctx.fill();
    pt._bb = { x0: sx - 34, x1: sx + 34, y0: sy - 40, y1: sy + 18 };
  }
  if (G.clickFx) {
    const [sx, sy] = S(G.clickFx.x, G.clickFx.y);
    const t = G.clickFx.t / 0.6;
    ctx.strokeStyle = 'rgba(255,230,140,' + (1 - t) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 6 + t * 14, (6 + t * 14) / 2, 0, 0, 7); ctx.stroke();
  }
  for (const it of m.items) {
    const [sx, sy] = S(it.x, it.y);
    if (sx < -60 || sx > VW + 60 || sy < -60 || sy > VH + 40) { it._bb = null; continue; }
    drawShadow(ctx, sx, sy + 2, 8, 3, 0.3);
    drawItemIcon(ctx, it.id, sx - 10, sy - 14 + Math.sin(G.t * 3 + it.x) * 1, 20);
  }
  const tgt = p.action && (p.action.type === 'attack' || p.action.type === 'cast') ? p.action.target : null;
  if (tgt && !tgt.dead) {
    const [sx, sy] = S(tgt.x, tgt.y);
    const r = tgt.boss ? 40 : tgt.struct ? 34 : 18;
    ctx.strokeStyle = 'rgba(255,60,40,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, r, r / 2, 0, 0, 7); ctx.stroke();
  }
  // 魔法地面效果
  for (const r of G.rings || []) {
    const [sx, sy] = S(r.x, r.y); const k = r.t / 0.5, rr = r.r * HW * 1.4 * k;
    ctx.strokeStyle = 'rgba(' + r.col + ',' + (1 - k) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr / 2, 0, 0, 7); ctx.stroke();
  }

  for (const c of G.clouds || []) {
    const [sx, sy] = S(c.x, c.y), a = Math.min(1, (c.dur - c.t) / 0.6, c.t / 0.3);
    const rr = c.r * HW * 1.4;
    const gr = ctx.createRadialGradient(sx, sy - 10, 4, sx, sy - 10, rr);
    if (c.dark) { gr.addColorStop(0, 'rgba(150,70,220,' + 0.5 * a + ')'); gr.addColorStop(1, 'rgba(60,20,100,0)'); }
    else { gr.addColorStop(0, 'rgba(120,220,80,' + 0.45 * a + ')'); gr.addColorStop(1, 'rgba(60,140,40,0)'); }
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sx, sy - 10, rr, rr * 0.55, 0, 0, 7); ctx.fill();
    if (Math.random() < 0.4) G.particles.push({ x: c.x + rand(-c.r, c.r) * 0.7, y: c.y + rand(-c.r, c.r) * 0.7, z: 2, vx: 0, vy: 0, vz: 25, life: 0.8, max: 0.8, color: c.dark ? '#c890ff' : '#a8ff70', size: 3 });
  }
  for (const sn of G.snows || []) {
    const [sx, sy] = S(sn.x, sn.y), rr = sn.r * HW * 1.4;
    ctx.fillStyle = 'rgba(200,230,255,0.18)'; ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.55, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 6; i++) G.particles.push({ x: sn.x + rand(-sn.r, sn.r) * 0.75, y: sn.y + rand(-sn.r, sn.r) * 0.75, z: rand(80, 160), vx: 1.5, vy: 1.5, vz: -150, life: 0.8, max: 0.8, color: Math.random() < 0.5 ? '#ffffff' : '#bfe6ff', size: 2.5 });
  }

  drawHazards(S);

  // 深度排序
  const list = [];
  for (let j = y0; j <= y1; j++)
    for (let i = x0; i <= x1; i++) {
      const oi = W.objGrid[j * W.w + i]; if (oi < 0) continue;
      const o = W.objs[oi]; if (!o) continue;
      list.push({ d: i + j + 1 + (o.kind === 'ship' ? 3 : 0), o });
    }
  const ents = [p, ...m.npcs, ...m.actors, ...Online.visible()];
  for (const e of ents) {
    const [sx, sy] = S(e.x, e.y);
    if (sx < -160 || sx > VW + 160 || sy < -60 || sy > VH + 220) { e._bb = null; continue; }
    list.push({ d: e.x + e.y + (e.dead ? -0.5 : 0) + (e.struct === 'gate' ? 0.6 : 0), e });
  }
  list.sort((a, b) => a.d - b.d);
  const labels = [];
  for (const it of list) { if (it.o) drawObj(it.o, S); else drawEntity(it.e, S, labels); }

  // 投射物
  for (const pr of G.projectiles) drawProjectile(pr, S);
  for (const b of G.bolts || []) {
    const [sx, sy] = S(b.x, b.y); const a = 1 - b.t / 0.5;
    ctx.strokeStyle = 'rgba(220,235,255,' + a + ')'; ctx.lineWidth = 3; ctx.shadowColor = '#9ac0ff'; ctx.shadowBlur = 12;
    ctx.beginPath(); let yy = sy - 260, xx = sx + rand(-10, 10); ctx.moveTo(xx, yy);
    while (yy < sy - 20) { yy += rand(18, 30); xx = sx + rand(-14, 14); ctx.lineTo(xx, yy); }
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,255,' + a * 0.4 + ')'; ctx.beginPath(); ctx.ellipse(sx, sy, 30, 14, 0, 0, 7); ctx.fill();
  }
  for (const ch of G.chains || []) {
    const a = 1 - ch.t / ch.dur;
    ctx.strokeStyle = 'rgba(200,225,255,' + a + ')'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ch.pts.forEach(([x, y], i) => {
      const [sx, sy] = S(x, y);
      if (!i) { ctx.moveTo(sx, sy - 30); return; }
      const [px, py] = S(ch.pts[i - 1][0], ch.pts[i - 1][1]);
      for (let k = 1; k <= 4; k++) ctx.lineTo(lerp(px, sx, k / 5) + rand(-8, 8), lerp(py, sy, k / 5) - 30 + rand(-8, 8));
      ctx.lineTo(sx, sy - 30);
    });
    ctx.stroke();
  }
  for (const mt of G.meteors || []) {
    if (mt.t < 0) continue;
    const [sx, sy] = S(mt.x, mt.y); const k = mt.t / mt.dur;
    const zz = (1 - k) * 300;
    const R = mt.big ? 28 : 14, mx = sx + zz * 0.4, my = sy - zz;
    if (mt.big) {   // 拖曳的火焰尾巴
      const tg = ctx.createLinearGradient(mx, my, mx + 60, my - 150);
      tg.addColorStop(0, 'rgba(255,170,60,0.75)'); tg.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.strokeStyle = tg; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 60, my - 150); ctx.stroke(); ctx.lineCap = 'butt';
    }
    const gr = ctx.createRadialGradient(mx, my, 1, mx, my, R);
    gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.5, '#ff8a20'); gr.addColorStop(1, 'rgba(200,40,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill();
    if (k > 0.9) burst(mt.x, mt.y, 5, '#ff7020', mt.big ? 10 : 4, mt.big ? 5 : 3, 0.6, 3, 2);
  }
  for (const q of G.particles) {
    const [sx, sy] = S(q.x, q.y);
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    ctx.fillStyle = q.color;
    ctx.fillRect(sx - q.size / 2, sy - q.z - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  if (G.levelFx) {
    const [sx, sy] = S(p.x, p.y);
    const t = G.levelFx.t / 1.6;
    ctx.strokeStyle = 'rgba(255,220,120,' + (1 - t) + ')'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) { const r = 10 + t * 60 + k * 10; ctx.beginPath(); ctx.ellipse(sx, sy, r, r / 2, 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,240,180,' + (0.35 * (1 - t)) + ')'; ctx.fillRect(sx - 14, sy - 140, 28, 140);
  }
  drawDarkness(S);

  // 低解析度 → 主畫面
  ctx = mainCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lowCanvas, 0, 0, LW, LH, 0, 0, VW * DPR, VH * DPR);
  if (Settings.grade) {
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.16)'; ctx.fillRect(0, 0, VW * DPR, VH * DPR);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(242,232,214)'; ctx.fillRect(0, 0, VW * DPR, VH * DPR);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = true;

  // 文字（全解析度）
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '12px "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
  for (const it of m.items) {
    const [sx, sy] = S(it.x, it.y);
    if (sx < -60 || sx > VW + 60 || sy < -60 || sy > VH + 40) continue;
    const nm = it.id === 'gold' ? '金幣 (' + it.qty + ')' : enchTag(it.ench || 0) + ITEMS[it.id].name + (it.qty > 1 ? ' (' + it.qty + ')' : '');
    const w = ctx.measureText(nm).width + 10;
    const lx = sx - w / 2, ly = sy - 36;
    if (it.owner && it.t < LOOT_OWN_SEC) { ctx.font = '11px "Microsoft JhengHei", "PingFang TC", sans-serif'; outlineText('🔒 ' + it.owner + ' ' + Math.ceil(LOOT_OWN_SEC - it.t) + 's', sx, ly - 3, it.owner === p.name ? '#a0ffa0' : '#ff9a80'); ctx.font = '12px "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif'; }
    const hov = G.hover && G.hover.e === it;
    ctx.fillStyle = hov ? 'rgba(60,50,20,0.85)' : 'rgba(10,10,14,0.72)';
    ctx.fillRect(lx, ly, w, 17);
    ctx.strokeStyle = hov ? '#ffe08a' : 'rgba(230,230,230,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(lx + 0.5, ly + 0.5, w - 1, 16);
    const d = ITEMS[it.id];
    ctx.fillStyle = d.rare ? '#d8b8ff' : d.type === 'weapon' || d.type === 'armor' || d.type === 'acc' || d.type === 'book' ? '#9fd8ff' : '#f0f0f0';
    ctx.fillText(nm, sx, ly + 13);
    it._bb = { x0: Math.min(lx, sx - 12), x1: Math.max(lx + w, sx + 12), y0: ly, y1: sy + 4 };
  }
  for (const pt of W.portals) { const [sx, sy] = S(pt.x, pt.y); outlineText('▼ ' + pt.label, sx, sy - 46, '#d8c8ff'); }
  for (const L of labels) L();
  for (const t of G.texts) {
    const [sx, sy] = S(t.x, t.y);
    const k = t.t / 1.1;
    ctx.globalAlpha = 1 - k * k;
    ctx.font = 'bold ' + t.size + 'px Georgia, serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    const yy = sy - t.z - k * 30;
    ctx.strokeText(t.text, sx, yy); ctx.fillStyle = t.color; ctx.fillText(t.text, sx, yy);
  }
  ctx.globalAlpha = 1;
  if (vignette) ctx.drawImage(vignette, 0, 0, VW, viewH + 30);
  if (G.targeting) { ctx.font = 'bold 14px sans-serif'; outlineText(G.targeting === 'tame' ? '選擇要馴服的野狼' : '選擇「' + SPELLS[G.targeting].name + '」的目標', VW / 2, 70, '#ffe08a'); }
}

function drawProjectile(pr, S) {
  const [sx, sy] = S(pr.x, pr.y);
  const sa = Math.atan2(Math.sin(pr.ang) * HH + Math.cos(pr.ang) * HH, (Math.cos(pr.ang) - Math.sin(pr.ang)) * HW);
  if (pr.kind === 'arrow') {
    ctx.save(); ctx.translate(sx, sy - pr.z); ctx.rotate(sa);
    ctx.strokeStyle = pr.holy ? '#fff2a0' : pr.wind ? '#b0ffc8' : '#d8c8a0'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(4, -2.5); ctx.lineTo(4, 2.5); ctx.fill();
    ctx.restore();
  } else {
    if (pr.kind === 'feather') { ctx.save(); ctx.translate(sx, sy - pr.z); ctx.rotate(sa); ctx.fillStyle = '#d8c8e8'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 2, 0, 0, 7); ctx.fill(); ctx.restore(); return; }
    const col = { fire: ['#fff6c0', '#ff9a20', 'rgba(255,60,0,0)', 16], fireball: ['#fff6c0', '#ff7a10', 'rgba(255,40,0,0)', 18], magic: ['#ffffff', '#fff2a0', 'rgba(255,230,120,0)', 10], ice: ['#ffffff', '#a8e8ff', 'rgba(120,200,255,0)', 11], dark: ['#e0c8ff', '#8a4aff', 'rgba(80,20,160,0)', 12] }[pr.kind];
    const gr = ctx.createRadialGradient(sx, sy - pr.z, 1, sx, sy - pr.z, col[3]);
    gr.addColorStop(0, col[0]); gr.addColorStop(0.4, col[1]); gr.addColorStop(1, col[2]);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy - pr.z, col[3], 0, 7); ctx.fill();
  }
}

function drawObj(o, S) {
  const [sx, sy] = S(o.tx + 0.5, o.ty + 0.5);
  let s;
  switch (o.kind) {
    case 'cliff': s = SPR['cliff' + o.style + '_' + o.v]; break;
    case 'wall': s = SPR['wall' + o.v]; break;
    case 'tree': s = SPR['tree' + o.v]; break;
    case 'deadtree': s = SPR['deadtree' + o.v]; break;
    case 'rock': s = SPR['rock' + o.v]; break;
    case 'tomb': s = SPR['tomb' + o.v]; break;
    case 'cross': s = SPR.cross0; break;
    case 'house': s = SPR['house' + o.v]; break;
    case 'lamp': s = SPR.lamp0; break;
    case 'board': s = SPR.board0; break;
    case 'brazier': s = SPR.brazier0; break;
    case 'cactus': s = SPR['cactus' + o.v]; break;
    case 'ship': s = SPR.ship0; break;
    case 'stairs': s = SPR.stairs0; break;
    case 'stairsup': s = SPR.stairsup0; break;
    case 'torch': s = SPR.torch0; break;
    case 'crate': s = SPR.crate0; break;
    case 'snowrock': s = SPR.snowrock0; break;
    case 'pine': s = SPR['pine' + o.v]; break;
    case 'moongate': s = SPR.moongate0; break;
    case 'stele': s = SPR['stele' + o.v]; break;
    case 'crystal': s = SPR['crystal' + o.v]; break;
    case 'palm': s = SPR['palm' + o.v]; break;
    case 'cave': s = SPR.cave0; break;
  }
  if (!s) return;
  if (sx < -s.c.width || sx > VW + s.c.width || sy < -40 || sy > VH + s.c.height) return;
  let alpha = 1;
  if ((o.kind === 'tree' || o.kind === 'pine' || o.kind === 'house' || o.kind === 'deadtree' || o.kind === 'wall' || o.kind === 'cliff') && G.player) {
    const p = G.player;
    if (o.tx + o.ty + 1 > p.x + p.y) {
      const ps = S(p.x, p.y);
      const left = sx - s.ax * 0.8, right = sx + (s.c.width - s.ax) * 0.8, topY = sy - s.ay;
      if (ps[0] > left && ps[0] < right && ps[1] - 30 > topY && ps[1] - 30 < sy) alpha = 0.45;
    }
  }
  ctx.globalAlpha = alpha;
  if (o.big) { ctx.save(); ctx.translate(sx, sy); ctx.scale(1.3, 1.3); ctx.drawImage(s.c, -s.ax, -s.ay); ctx.restore(); }
  else ctx.drawImage(s.c, Math.round(sx - s.ax), Math.round(sy - s.ay));
  ctx.globalAlpha = 1;
  if (o.kind === 'brazier') drawFire(sx, sy - 24, 1);
  if (o.kind === 'crystal' || o.kind === 'moongate') glowUnder(sx, sy - (o.kind === 'moongate' ? 40 : 20), o.kind === 'moongate' ? 46 : 26 + Math.sin(G.t * 2 + o.tx) * 3, 'rgba(170,140,255,0.28)');
  if (o.kind === 'stele' && typeof Story !== 'undefined' && Story.steleLit(o.v)) { glowUnder(sx, sy - 40, 40 + Math.sin(G.t * 3) * 4, 'rgba(160,200,255,0.55)'); if (Math.random() < 0.3) G.particles.push({ x: o.tx + 0.5 + rand(-0.4, 0.4), y: o.ty + 0.5 + rand(-0.4, 0.4), z: rand(10, 60), vx: 0, vy: 0, vz: rand(20, 40), life: 1.2, max: 1.2, color: '#c8d8ff', size: 2 }); }
  if (o.kind === 'torch') drawFire(sx, sy - 40, 0.55);
  if (o.kind === 'lamp') { const f = 0.8 + Math.sin(G.t * 9 + o.tx) * 0.1; ctx.fillStyle = 'rgba(255,210,120,' + 0.25 * f + ')'; ctx.beginPath(); ctx.arc(sx, sy - 68, 12, 0, 7); ctx.fill(); }
}
function drawFire(x, y, s) {
  for (let i = 0; i < 6; i++) {
    const ph = G.t * 8 + i * 1.7;
    const fx = x + Math.sin(ph) * 4 * s + (i - 2.5) * 3 * s;
    const fh = (14 + Math.sin(ph * 1.3) * 5) * s;
    const gr = ctx.createLinearGradient(fx, y, fx, y - fh);
    gr.addColorStop(0, 'rgba(255,200,60,0.9)'); gr.addColorStop(0.6, 'rgba(255,90,20,0.7)'); gr.addColorStop(1, 'rgba(200,30,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(fx - 4 * s, y); ctx.quadraticCurveTo(fx, y - fh * 1.2, fx + 4 * s, y); ctx.fill();
  }
}

function playerLook(e) {
  const c = CLASSES[e.cls];
  const L = Object.assign({}, c.look);
  const ar = e.equip.armor ? ARMOR_LOOK[e.equip.armor.id] : null;
  Object.assign(L, ar || { body: '#7a6a5a', sleeve: '#6a5a4a' });
  if (e.equip.helm) { const h = e.equip.helm.id; const hoods = { wizard_hat: '#2a2a5a', sage_hood: '#4a3a6a', ranger_hood: '#2e4a22' }; if (hoods[h]) L.hood = hoods[h]; else L.helm = h === 'iron_helm' ? '#9aa0aa' : h === 'horned_helm' ? '#b0a890' : '#6a4a2e'; }
  if (e.equip.cloak) L.cape = { shadow_cloak: '#2a1a3a', magic_cloak: '#2a3a7a', guard_cloak: '#7a6a3a' }[e.equip.cloak.id] || '#5a4a3a';
  if (e.equip.shield) { L.shield = true; L.shieldCol = { tower_shield: '#6a7480', kite_shield: '#3a4a7a', dragon_shield: '#8a2a1a' }[e.equip.shield.id] || '#6a5a3a'; }
  if (e.equip.boots) L.boots = e.equip.boots.id === 'iron_boots' ? '#8a929c' : '#4a3020';
  const w = e.equip.weapon;
  L.weapon = w ? WEAPON_SPRITE[ITEMS[w.id].wclass] : null;
  L.holy = !!e.buffs.holy; L.ench = w ? w.ench || 0 : 0;
  return L;
}
function nameColor(e) {
  if (e === G.player) return e.pinkT > 0 ? '#d070ff' : alignColor(e.align);
  if (e.kind === 'remote') return e.pink ? '#d070ff' : alignColor(e.align || 0);
  if (e.kind === 'merc') return '#8affa0';
  if (e.kind === 'besieger') return ownsCastle() ? '#ff7a4a' : '#ffd0a0';
  if (e.kind === 'pker') return '#ff4a3a';
  if (e.kind === 'fighter') return e.grudge.has(G.player.id) && G.player.pinkT > 0 ? '#ff9a5a' : e.align < 0 ? '#ff4a3a' : '#c8d8ff';
  if (e.kind === 'ally') return '#8affa0';
  return '#ffffff';
}

function drawEntity(e, S, labels) {
  const [sx, sy] = S(e.x, e.y);
  const p = G.player;
  let top = sy - 52, bb = [sx - 14, sy - 54, sx + 14, sy + 4];
  if (e.struct) {
    if (e.struct === 'gate') { drawGate(ctx, sx, sy, e); top = sy - 70; bb = [sx - 50, sy - 80, sx + 50, sy + 20]; }
    else { drawTower(ctx, sx, sy, e, G.t); top = sy - 96; bb = [sx - 20, sy - 90, sx + 20, sy + 6]; }
    e._bb = e.broken || (e.open && !(e.struct === 'gate' && ownsCastle())) ? null : { x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3] };
    const show = G.siege && G.siege.active || (e.struct === 'tower' && (ownsCastle() || G.raid));
    if (show && !e.open && !e.broken) labels.push(() => { ctx.font = 'bold 13px sans-serif'; outlineText(e.name, sx, top - 8, '#ffe0a0'); hpBar(sx, top - 4, 70, e.hp / e.maxHp, '#d06a20'); });
    return;
  }
  if (e.companion && !e.def) return drawCompanionEntity(e, sx, sy, labels);
  if (e.def) {
    const d = e.def;
    const fade = e.dead ? clamp(1 - (e.deadT - 1.5) / 1.5, 0, 1) : 1;
    ctx.globalAlpha = fade;
    const o = { dir: e.dir, moving: e.moving, walk: e.walk, t: G.t + e.id, atk: e.atkAnim, color: d.color, scale: e.scale };
    if (e.dead) { ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.55); ctx.rotate(Math.PI / 2 * 0.9); ctx.translate(-sx, -sy); }
    if (e.slowT > 0 && !e.dead) frostUnder(sx, sy);
    if (e.companion === 'charm') glowUnder(sx, sy, 26 + Math.sin(G.t * 4) * 3, 'rgba(255,110,200,0.45)');
    if (e.ringSummon) glowUnder(sx, sy, 30 + Math.sin(G.t * 4) * 3, 'rgba(180,140,255,0.45)');
    const H = (opts, h, w = 14) => { drawShadow(ctx, sx, sy, 11, 4); drawHumanoid(ctx, sx, sy, Object.assign(o, opts)); top = sy - h; bb = [sx - w, sy - h + 2, sx + w, sy + 4]; };
    switch (d.sprite) {
      case 'wolf': { const k = d.scaleUp || 1; drawShadow(ctx, sx, sy, 16 * k, 6 * k); drawWolf(ctx, sx, sy, Object.assign(o, { scale: e.scale * k, eye: d.eye })); top = sy - 34 * k; bb = [sx - 24 * k, sy - 34 * k, sx + 24 * k, sy + 4]; break; }
      case 'slime': drawSlime(ctx, sx, sy, o); top = sy - 40; bb = [sx - 22, sy - 38, sx + 22, sy + 4]; break;
      case 'firedragon': { o.breath = e.breathing || 0; drawFireDragon(ctx, sx, sy, o); top = sy - 210; bb = [sx - 110, sy - 200, sx + 110, sy + 20]; break; }
      case 'goblin': H({ kind: 'goblin', body: '#6a5a3a', skin: '#7a9a3a', legs: '#4a3a24', boots: '#3a2a18', weapon: d.bow ? 'bow' : 'club', scale: 0.82, draw: e.atkAnim >= 0 && e.atkAnim < 0.6 }, 48); break;
      case 'skeleton': H({ kind: 'skeleton', body: '#e6e0cc', legs: '#e6e0cc', sleeve: '#e6e0cc', weapon: d.bow ? 'bow' : 'rusty', draw: e.atkAnim >= 0 && e.atkAnim < 0.6, shield: !d.bow && e.id % 2 === 0, shieldCol: '#5a4a3a' }, 56); break;
      case 'ghoul': H({ kind: 'ghoul', body: '#5a6250', skin: '#8e9e83', legs: '#4a4a3a', boots: '#6e7a62', sleeve: '#8e9e83' }, 52, 16); break;
      case 'lizard': { const c = d.color || '#4f8a46'; H({ kind: 'lizard', body: c, skin: c, legs: shade(c, -0.2), boots: shade(c, -0.4), sleeve: c, belt: '#6a4a2a', weapon: 'spear', scale: d.scaleUp || (d.color ? 1.25 : 1.1) }, 62 * (d.scaleUp || 1), 18); break; }
      case 'pirate': H(d.captainLook
        ? { body: '#2a2a4a', legs: '#1a1a2a', hair: '#1a1010', cape: '#8a1a1a', trim: '#e0c060', belt: '#5a3a1a', weapon: 'claymore', skin: '#c89070', scale: 1.3 }
        : { body: '#e8e0d0', sleeve: '#a02a2a', legs: '#2a2a3a', hood: '#a02a2a', belt: '#5a3a1a', weapon: 'sword', skin: '#c89070' }, d.captainLook ? 70 : 56, 16); break;
      case 'elf': H({ body: '#3a2a5a', sleeve: '#2a1a4a', legs: '#2a2238', hood: '#24163e', skin: '#d8c8f0', belt: '#6a5a8a', weapon: 'bow', draw: e.atkAnim >= 0 && e.atkAnim < 0.6, eye: '#c080ff' }, 58); break;
      case 'eclipse': { drawShadow(ctx, sx, sy, 22, 8); glowUnder(sx, sy, 60 + Math.sin(G.t * 2) * 6, 'rgba(120,60,220,0.35)'); drawHumanoid(ctx, sx, sy, Object.assign(o, { kind: 'lich', body: '#1a1028', robe: true, bone: '#d8d0f0', skin: '#d8d0f0', sleeve: '#2a1a40', weapon: 'staff', crown: true, scale: 1.9, eye: '#d060ff', cape: '#3a1a5a' })); top = sy - 116; bb = [sx - 30, sy - 112, sx + 30, sy + 4]; break; }
      case 'yeti': H({ kind: 'werewolf', body: '#e8eef4', skin: '#dfe7ee', legs: '#c8d4de', boots: '#a8b4c0', sleeve: '#e8eef4', scale: 1.35 }, 74, 20); break;
      case 'troll': { const k = d.big || 1; H({ kind: 'ghoul', body: '#4a6a8a', skin: '#8ab0c8', legs: '#3a4a5a', boots: '#2a3a4a', sleeve: '#8ab0c8', belt: '#5a4a3a', weapon: 'club', crown: d.frostKing, scale: 1.4 * k, eye: d.frostKing ? '#80e0ff' : null }, 66 * k, 18 * k); if (d.frostKing) glowUnder(sx, sy, 50, 'rgba(140,210,255,0.3)'); break; }
      case 'werewolf': H({ kind: 'werewolf', body: '#5a4a3a', skin: '#6a5a48', legs: '#4a3a2a', boots: '#3a2a1a', sleeve: '#6a5a48', scale: 1.15 }, 64, 18); break;
      case 'mummy': H({ kind: 'mummy', body: '#c8b890', skin: '#d8c8a0', legs: '#c0b088', boots: '#a89870', sleeve: '#d0c098', belt: '#8a7a5a' }, 56); break;
      case 'lich': drawShadow(ctx, sx, sy, 16, 6); drawHumanoid(ctx, sx, sy, Object.assign(o, { kind: 'lich', body: '#2a1a3a', robe: true, bone: '#e6e0cc', skin: '#e6e0cc', sleeve: '#3a2a4a', weapon: 'staff', crown: true, scale: 1.35, eye: '#9a4aff' })); top = sy - 82; bb = [sx - 22, sy - 80, sx + 22, sy + 4];
        ctx.fillStyle = 'rgba(140,80,255,0.15)'; ctx.beginPath(); ctx.ellipse(sx, sy, 34, 15, 0, 0, 7); ctx.fill(); break;
      case 'guard': if (d.dark) { H({ body: '#2a2a34', sleeve: '#1a1a24', legs: '#141418', helm: '#3a3a48', cape: '#4a1a5a', plate: true, weapon: 'claymore', skin: '#8a8aa0', scale: 1.1 }, 60, 16); break; }
        H({ body: '#8a929c', sleeve: '#6a7480', legs: '#3a3e4a', helm: '#9aa0aa', cape: d.captain ? '#a01a1a' : '#5a1a1a', plate: true, weapon: d.captain ? 'claymore' : 'spear', shield: !d.captain, shieldCol: '#5a1a1a', skin: '#e0b890', scale: d.captain ? 1.2 : 1 }, d.captain ? 66 : 56, 16); break;
      case 'treant': drawShadow(ctx, sx, sy, 20, 7); drawTreant(ctx, sx, sy, o); top = sy - 84; bb = [sx - 24, sy - 80, sx + 24, sy + 4]; break;
      case 'spider': drawShadow(ctx, sx, sy, 18, 6); drawSpider(ctx, sx, sy, o); top = sy - 30; bb = [sx - 22, sy - 28, sx + 22, sy + 4]; break;
      case 'golem': { const k = d.big || 1; drawShadow(ctx, sx, sy, 22 * k, 8 * k); drawGolem(ctx, sx, sy, Object.assign(o, { scale: k })); top = sy - 66 * k; bb = [sx - 24 * k, sy - 62 * k, sx + 24 * k, sy + 4]; break; }
      case 'fireelem': { drawShadow(ctx, sx, sy, 14, 5, 0.25); const h = drawFireElemental(ctx, sx, sy, o); top = sy - h - 52; bb = [sx - 16, sy - h - 50, sx + 16, sy + 4]; break; }
      case 'scorpion': drawShadow(ctx, sx, sy, 20, 7); drawScorpion(ctx, sx, sy, o); top = sy - 44; bb = [sx - 24, sy - 40, sx + 24, sy + 4]; break;
      case 'worm': drawShadow(ctx, sx, sy, 20, 7); drawWorm(ctx, sx, sy, o); top = sy - 70; bb = [sx - 22, sy - 64, sx + 22, sy + 4]; break;
      case 'ghost': { drawShadow(ctx, sx, sy, 12, 4, 0.2); const h = drawGhost(ctx, sx, sy, o); top = sy - h - 54; bb = [sx - 16, sy - h - 52, sx + 16, sy + 4]; break; }
      case 'wyvern': { const k = d.scaleUp || 1; const h = drawWyvern(ctx, sx, sy, Object.assign(o, { big: k })); top = sy - h - 100 * k; bb = [sx - 60 * k, sy - h - 90 * k, sx + 60 * k, sy + 10]; break; }
    }
    if (e.hurtT > 0 && !e.dead) hitFlash(sx, (sy + top) / 2 + 6, Math.min(40, (sy - top) * 0.45), e.hurtT / 0.2);
    if (e.dead) ctx.restore();
    ctx.globalAlpha = 1;
    e._bb = e.dead ? null : { x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3] };
    if (!e.dead) {
      const targeted = p.action && p.action.target === e;
      const hovered = G.hover && G.hover.e === e;
      labels.push(() => {
        if (e.companion === 'summon') {
          ctx.font = '12px "Microsoft JhengHei", "PingFang TC", sans-serif';
          outlineText(e.name, sx, top - 8, '#c8b0ff');
          hpBar(sx, top - 4, 34, e.hp / e.maxHp, '#40c060');
        } else if (e.companion === 'charm') {
          ctx.font = '12px "Microsoft JhengHei", "PingFang TC", sans-serif';
          outlineText(e.name, sx, top - 8, '#ff9ad8');
          ctx.font = 'bold 15px sans-serif'; outlineText('♥', sx, top - 22 + Math.sin(G.t * 4) * 2, '#ff6ac0');
          hpBar(sx, top - 4, 34, e.hp / e.maxHp, '#40c060');
        } else {
          if (targeted || hovered || e.boss) {
            ctx.font = (e.boss ? 'bold 14px' : '12px') + ' "Microsoft JhengHei", "PingFang TC", sans-serif';
            const col = e.level > p.level + 4 ? '#ff7060' : e.level < p.level - 4 ? '#a0a0a0' : '#ffffff';
            outlineText(e.name + (hovered ? ' Lv.' + e.level : ''), sx, top - 8, col);
          }
          if (e.hp < e.maxHp || targeted) hpBar(sx, top - 4, e.boss ? 70 : 34, e.hp / e.maxHp, '#d02a20');
        }
        if (e.say && e.sayT > 0) bubble(e.say, sx, top - 22);
      });
    }
    return;
  }
  // 人形：玩家、NPC、冒險者、守衛、盟友、村民、狗
  if (e.kind === 'dog') {
    drawShadow(ctx, sx, sy, 12, 4);
    drawWolf(ctx, sx, sy, { dir: e.dir, moving: e.moving, walk: e.walk, t: G.t, atk: -1, color: e.look.color, scale: 0.72, eye: '#222' });
    top = sy - 28; e._bb = { x0: sx - 18, y0: sy - 28, x1: sx + 18, y1: sy + 4 };
  } else {
    const isP = e === p;
    const fade = e.dead ? clamp(1 - (e.deadT - 1) / 1.5, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = isP && p.dead ? 0.6 : fade;
    drawShadow(ctx, sx, sy, 11, 4.5);
    const look = isP ? playerLook(e) : e.look;
    const atk = e.atkAnim !== undefined ? e.atkAnim : -1;
    if (isP && (p.buffs.shield || p.buffs.blessarmor || p.buffs.earthskin)) {
      const col = p.buffs.blessarmor ? '220,230,255' : p.buffs.earthskin ? '200,160,90' : '150,200,255';
      ctx.strokeStyle = 'rgba(' + col + ',' + (0.25 + Math.sin(G.t * 4) * 0.1) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy - 24, 18, 30, 0, 0, 7); ctx.stroke();
    }
    if (isP && p.buffs.sanctuary) { ctx.fillStyle = 'rgba(255,240,170,' + (0.15 + Math.sin(G.t * 3) * 0.05) + ')'; ctx.beginPath(); ctx.ellipse(sx, sy, 30, 14, 0, 0, 7); ctx.fill(); }
    if (e.dead && !isP) { ctx.translate(sx, sy); ctx.scale(1, 0.55); ctx.rotate(Math.PI / 2 * 0.9); ctx.translate(-sx, -sy); }
    drawHumanoid(ctx, sx, sy, Object.assign({}, look, { dir: e.dir, moving: e.moving, walk: e.walk, t: G.t + e.id, atk, draw: atk >= 0 && atk < 0.6 }));
    if (e.hurtT > 0) hitFlash(sx, sy - 26, 20, e.hurtT / 0.25, isP ? '255,120,120' : null);
    ctx.restore();
    if (isP && p.buffs.haste && e.moving && Math.random() < 0.3) G.particles.push({ x: e.x, y: e.y, z: rand(5, 30), vx: 0, vy: 0, vz: 0, life: 0.3, max: 0.3, color: '#a0ffa0', size: 2 });
    e._bb = e.dead ? null : { x0: sx - 14, y0: sy - 54, x1: sx + 14, y1: sy + 4 };
  }
  if (e.dead) return;
  labels.push(() => {
    ctx.font = '12px "Microsoft JhengHei", "PingFang TC", sans-serif';
    let y = top - 8;
    if (e instanceof NPC) {
      if (e.role === 'stall' && e.stall) { stallSign(e.stall.title, sx, y - 2); y -= 20; }
      if (e.role === 'story' && Story.hasTalk(e)) { ctx.font = 'bold 22px Georgia, serif'; outlineText('!', sx, y - 34 + Math.sin(G.t * 4) * 2, '#ffd040'); ctx.font = '12px "Microsoft JhengHei", "PingFang TC", sans-serif'; }
      outlineText('[' + e.title + ']', sx, y, '#ffe9a0'); y -= 14;
      outlineText(e.name, sx, y, '#ffffff'); npcBadge(sx + ctx.measureText(e.name).width / 2 + 3, y); y -= 6;
      if (e.role === 'quest') {
        const q = p.quest, Q = QUESTS[q.idx];
        const mark = !Q ? null : !q.active ? '!' : q.count >= Q.count ? '?' : null;
        if (mark) { ctx.font = 'bold 20px Georgia, serif'; outlineText(mark, sx, y - 8, '#ffd040'); y -= 22; ctx.font = '12px sans-serif'; }
      }
    } else if (e.kind !== 'dog') {
      if (e === p) hpBar(sx, top - 2, 36, p.hp / p.maxHp, '#d02a20');
      else if (e.kind === 'fighter' || e.kind === 'pker' || e.kind === 'ally' || e.kind === 'townguard' || e.kind === 'besieger' || e.kind === 'merc') { if (e.hp < e.maxHp) hpBar(sx, top - 2, 30, e.hp / e.maxHp, '#d02a20'); }
      else if (e.kind === 'remote' && e.hp < 1) hpBar(sx, top - 2, 30, e.hp, '#d02a20');
      const nm = e.name;
      const clan = e === p ? (p.clan ? p.clan.name : null) : e.clan;
      const em = e === p ? (p.clan ? p.clan.emblem : null) : e.emblem;
      const w = ctx.measureText(nm).width;
      const yy = e === p ? y - 4 : y;
      outlineText(nm, sx + (em ? 8 : 0), yy, nameColor(e));
      if (em) drawEmblem(ctx, em, sx - w / 2 - 10, yy - 11, 13);
      if (e !== p && e.kind !== 'remote') npcBadge(sx + (em ? 8 : 0) + w / 2 + 3, yy);
      y = yy - 14;
      if (clan) { ctx.font = '11px sans-serif'; outlineText('[' + clan + ']', sx, y, '#b8e0a8'); y -= 13; }
      if (e === p && p.title) { ctx.font = '11px sans-serif'; outlineText('《' + p.title + '》', sx, y, '#c8d8ff'); y -= 13; }
      if ((e === p && ownsCastle()) || (e.kind === 'remote' && e.crown)) { drawCrown(ctx, sx, y - 6, G.t, 1.1); y -= 20; }
      const stl = e === p ? (p.stall && p.stall.open ? p.stall : null) : e.kind === 'remote' ? e.stall : null;
      if (stl) { stallSign(stl.title, sx, y - 2); y -= 22; }
    }
    if (e.say && e.sayT > 0) bubble(e.say, sx, y - 4);
  });
}

// 「NPC」小標籤：讓玩家分辨電腦角色與真實玩家
function npcBadge(x, y) {
  ctx.save(); ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
  const w = ctx.measureText('NPC').width + 5;
  ctx.fillStyle = 'rgba(70,70,80,0.9)'; ctx.fillRect(x, y - 10, w, 11);
  ctx.strokeStyle = 'rgba(200,200,210,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y - 9.5, w - 1, 10);
  ctx.fillStyle = '#d8d8e0'; ctx.fillText('NPC', x + 2.5, y - 1.5);
  ctx.restore();
}
function outlineText(t, x, y, col) {
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(t, x, y);
  ctx.fillStyle = col; ctx.fillText(t, x, y);
}
function hpBar(x, y, w, f, col) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x - w / 2, y, w, 3);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 3);
}
function bubble(text, x, y) {
  ctx.font = '12px "Microsoft JhengHei", "PingFang TC", sans-serif';
  const w = Math.min(220, ctx.measureText(text).width + 14);
  ctx.fillStyle = 'rgba(15,15,20,0.78)';
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - 18, w, 20, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillText(text, x, y - 4, 210);
}

function daylight() { return (1 - Math.cos(G.day * Math.PI * 2)) / 2; }
function drawDarkness(S) {
  const W = G.world;
  const b = daylight();
  let a = W.ambient || clamp((0.5 - b) * 1.3, 0, 0.62);
  if (!W.ambient) {
    const dusk = clamp(1 - Math.abs(b - 0.42) / 0.15, 0, 1) * 0.12;
    if (dusk > 0) { ctx.fillStyle = 'rgba(255,120,40,' + dusk + ')'; ctx.fillRect(0, 0, VW, VH); }
  }
  if (a <= 0.01) return;
  const LW = lowCanvas.width, LH = lowCanvas.height, sc = LW / VW;
  if (!darkCanvas || darkCanvas.width !== LW || darkCanvas.height !== LH) { darkCanvas = makeCanvas(LW, LH); darkCtx = darkCanvas.getContext('2d'); }
  const g = darkCtx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, LW, LH);
  g.fillStyle = W.ambient ? 'rgba(4,4,10,' + a + ')' : 'rgba(6,10,32,' + a + ')'; g.fillRect(0, 0, LW, LH);
  g.setTransform(sc, 0, 0, sc, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, k = 1) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,' + k + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  };
  const p = G.player;
  { const [x, y] = S(p.x, p.y); light(x, y - 20, p.buffs.glow ? 330 : W.ambient ? 140 : 170, 0.9); }
  for (const L of W.lights) { const [x, y] = S(L.x, L.y); if (x > -300 && x < VW + 300 && y > -300 && y < VH + 300) light(x, y - 30, L.r * (0.95 + Math.sin(G.t * 7 + L.x) * 0.04)); }
  for (const pr of G.projectiles) if (pr.kind !== 'arrow') { const [x, y] = S(pr.x, pr.y); light(x, y - pr.z, 90); }
  for (const b2 of G.bolts || []) { const [x, y] = S(b2.x, b2.y); light(x, y - 40, 260); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(darkCanvas, 0, 0); ctx.restore();
  // 亮光處加一點暖色
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const L of W.lights) {
    const [x, y] = S(L.x, L.y); if (x < -200 || x > VW + 200 || y < -200 || y > VH + 200) continue;
    const gr = ctx.createRadialGradient(x, y - 30, 0, x, y - 30, L.r * 0.6);
    gr.addColorStop(0, 'rgba(255,150,60,' + 0.12 * a + ')'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - 30, L.r * 0.6, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function buildVignette() {
  vignette = makeCanvas(400, 300);
  const g = vignette.getContext('2d');
  const gr = g.createRadialGradient(200, 150, 90, 200, 150, 260);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = gr; g.fillRect(0, 0, 400, 300);
}
window.addEventListener('load', buildVignette);

// ===== 小地圖 =====
function drawMinimap(mc) {
  const g = mc.getContext('2d');
  const w = mc.width, h = mc.height;
  const p = G.player, s = 2.4;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0c0b0a'; g.fillRect(0, 0, w, h);
  const ox = w / 2 - (p.x - p.y) * s, oy = h / 2 - (p.x + p.y) * s / 2;
  g.imageSmoothingEnabled = false;
  g.setTransform(s, s / 2, -s, s / 2, ox, oy);
  g.drawImage(G.minimapBase, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const P = (x, y) => [(x - y) * s + ox, (x + y) * s / 2 + oy];
  for (const a of G.map.actors) {
    if (a.dead || a.kind === 'villager' || a.kind === 'dog' || a.struct) continue;
    const [x, y] = P(a.x, a.y);
    if (x < 0 || y < 0 || x > w || y > h) continue;
    g.fillStyle = a.companion ? '#80ffb0' : a.boss ? '#ff40ff' : a.kind === 'monster' ? '#ff3a2a' : a.kind === 'pker' ? '#ff0000' : a.kind === 'ally' ? '#60ff80' : a.faction === 'castle' ? '#ff9a40' : '#80b0ff';
    g.fillRect(x - 1.5, y - 1.5, a.boss ? 5 : 3, a.boss ? 5 : 3);
  }
  for (const n of G.map.npcs) { const [x, y] = P(n.x, n.y); g.fillStyle = '#ffd040'; g.fillRect(x - 1.5, y - 1.5, 3, 3); }
  for (const pt of G.world.portals) { const [x, y] = P(pt.x, pt.y); g.fillStyle = '#c0a0ff'; g.fillRect(x - 2.5, y - 2.5, 5, 5); }
  const [px, py] = P(p.x, p.y);
  // 主線目標 ★
  const tg = Story.target();
  if (tg && tg.map === G.map.id) { const [tx, ty] = P(tg.x, tg.y); starMark(g, clamp(tx, 6, w - 6), clamp(ty, 6, h - 6), 6); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 3, 0, 7); g.fill();
  g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
}
function starMark(g, x, y, r) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#ffd040'; g.strokeStyle = '#5a3a00'; g.lineWidth = 1.2;
  g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke();
  g.restore();
}

// ===== 世界地圖（羊皮紙風格）=====
function drawWorldMap(cv, mapId = 'overworld') {
  const g = cv.getContext('2d');
  const W = getMap(mapId).world;
  const w = cv.width, h = cv.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  // 羊皮紙底
  const bg = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, '#e8d8b0'); bg.addColorStop(0.75, '#cdb88a'); bg.addColorStop(1, '#8a7148');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const R = mulberry32(7);
  for (let i = 0; i < 1500; i++) { g.fillStyle = 'rgba(90,60,30,' + R() * 0.08 + ')'; g.fillRect(R() * w, R() * h, 2, 2); }
  // 等角變換
  const s = Math.min(w / (W.w * 2), h / W.w) * 0.98;
  const ox = w / 2, oy = (h - W.w * s) / 2;
  const P = (x, y) => [(x - y) * s + ox, (x + y) * s / 2 + oy];
  // 地形（以手繪色調重新上色）
  const cell = 2;
  for (let y = 0; y < W.h; y += cell) for (let x = 0; x < W.w; x += cell) {
    const i = W.idx(x, y), t = W.tiles[i], o = W.objGrid[i] >= 0 ? W.objs[W.objGrid[i]] : null;
    let c;
    if (t === TILE.LAVA) c = 'rgba(220,70,20,0.8)';
    else if (t === TILE.ASH) c = 'rgba(60,50,45,0.35)';
    else if (t === TILE.SEA) c = 'rgba(70,110,140,0.55)';
    else if (t === TILE.WATER) c = 'rgba(60,100,140,0.8)';
    else if (o && (o.kind === 'cliff')) c = 'rgba(110,80,50,0.55)';
    else if (o && o.kind === 'tree') c = 'rgba(70,100,50,0.45)';
    else if (o && o.kind === 'pine') c = 'rgba(40,80,70,0.55)';
    else if (o && o.kind === 'wall') c = 'rgba(90,80,70,0.8)';
    else if (t === TILE.ICE) c = 'rgba(130,190,230,0.55)';
    else if (t === TILE.SNOW) c = 'rgba(250,250,250,0.55)';
    else if (t === TILE.DESERT) c = 'rgba(220,180,110,0.35)';
    else if (t === TILE.SOIL) c = 'rgba(90,70,50,0.3)';
    else if (t === TILE.DIRT || t === TILE.BRIDGE) c = 'rgba(140,100,60,0.4)';
    else c = null;
    if (!c) continue;
    const [a, b] = P(x, y);
    g.fillStyle = c;
    g.beginPath(); g.moveTo(a, b); g.lineTo(a + cell * s, b + cell * s / 2); g.lineTo(a, b + cell * s); g.lineTo(a - cell * s, b + cell * s / 2); g.closePath(); g.fill();
  }
  // 地點標籤
  g.font = 'bold 13px "Microsoft JhengHei", "PingFang TC", sans-serif'; g.textAlign = 'center';
  const icon = (kind, x, y) => {
    g.save(); g.translate(x, y);
    if (kind === 'town') { g.fillStyle = '#6a3a2a'; g.fillRect(-6, -4, 5, 5); g.fillRect(1, -6, 6, 7); g.fillStyle = '#3a2a1a'; g.beginPath(); g.moveTo(-7, -4); g.lineTo(-3.5, -8); g.lineTo(0, -4); g.moveTo(0, -6); g.lineTo(4, -10); g.lineTo(8, -6); g.fill(); }
    else if (kind === 'castle') { g.fillStyle = '#5a5050'; g.fillRect(-9, -8, 18, 10); for (let k = -9; k < 9; k += 4) g.fillRect(k, -11, 2, 3); g.fillStyle = '#2a2020'; g.fillRect(-2, -4, 4, 6); }
    else if (kind === 'dungeon') { g.fillStyle = '#1a1410'; g.beginPath(); g.ellipse(0, -2, 8, 4, 0, 0, 7); g.fill(); }
    else if (kind === 'boss') { g.fillStyle = '#8a1a1a'; g.beginPath(); g.arc(0, -4, 5, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(-2, -5, 1.5, 1.5); g.fillRect(1, -5, 1.5, 1.5); }
    else { g.fillStyle = '#4a3a2a'; g.beginPath(); g.arc(0, -3, 3, 0, 7); g.fill(); }
    g.restore();
  };
  for (const pl of W.places) {
    const [x, y] = P(pl.x, pl.y);
    icon(pl.kind, x, y);
    const tw = g.measureText(pl.name).width + 12;
    g.fillStyle = 'rgba(250,244,228,0.92)'; g.strokeStyle = '#6a5030'; g.lineWidth = 1;
    g.beginPath(); g.roundRect(x - tw / 2, y - 34, tw, 19, 4); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - 4, y - 15); g.lineTo(x, y - 9); g.lineTo(x + 4, y - 15); g.fill();
    g.fillStyle = '#2a1e10'; g.fillText(pl.name, x, y - 20);
  }
  // 主線目標
  const tg = Story.target();
  if (tg && tg.map === mapId) { const [x, y] = P(tg.x, tg.y); starMark(g, x, y - 4, 10 + Math.sin(G.t * 4) * 1.5); }
  // 玩家位置
  if (G.map.id === mapId) {
    const [x, y] = P(G.player.x, G.player.y);
    g.fillStyle = '#c01818'; g.beginPath(); g.arc(x, y, 5 + Math.sin(G.t * 5), 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  }
  // 羅盤
  g.save(); g.translate(w - 50, h - 50); g.strokeStyle = '#5a4020'; g.fillStyle = '#5a4020'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(0, 0, 26, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(0, -24); g.lineTo(5, 0); g.lineTo(0, 24); g.lineTo(-5, 0); g.closePath(); g.fill();
  g.font = 'bold 11px serif'; g.fillText('北', 0, -30);
  g.restore();
}

function glowUnder(x, y, r, col) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, 7); ctx.fill();
}
// 召喚獸與寵物
function drawCompanionEntity(e, sx, sy, labels) {
  const fade = e.dead ? clamp(1 - e.deadT / 0.8, 0, 1) : 1;
  ctx.save(); ctx.globalAlpha = fade;
  const o = { dir: e.dir, moving: e.moving, walk: e.walk, t: G.t + e.id, atk: e.atkAnim, color: e.look ? e.look.color : null, scale: 1 };
  let top = sy - 40, bb = [sx - 18, sy - 36, sx + 18, sy + 4];
  if (e.petMagic && !e.dead) glowUnder(sx, sy, 22 + Math.sin(G.t * 3) * 2, e.petMagic);
  switch (e.sprite) {
    case 'spiritwolf':
      glowUnder(sx, sy - 6, 30, 'rgba(120,180,255,0.45)');
      ctx.globalAlpha = fade * 0.8;
      drawShadow(ctx, sx, sy, 16, 6, 0.2); drawWolf(ctx, sx, sy, Object.assign(o, { color: '#a8d0ff', eye: '#ffffff', scale: 1.05 })); top = sy - 36; bb = [sx - 24, sy - 34, sx + 24, sy + 4]; break;
    case 'sgolem':
      glowUnder(sx, sy, 34, 'rgba(120,200,255,0.35)');
      drawShadow(ctx, sx, sy, 22, 8); drawGolem(ctx, sx, sy, o); top = sy - 66; bb = [sx - 24, sy - 62, sx + 24, sy + 4]; break;
    case 'fireelem': { drawShadow(ctx, sx, sy, 14, 5, 0.25); const h = drawFireElemental(ctx, sx, sy, o); top = sy - h - 52; bb = [sx - 16, sy - h - 50, sx + 16, sy + 4]; break; }
    case 'pwolf': drawShadow(ctx, sx, sy, 15, 5); drawWolf(ctx, sx, sy, Object.assign(o, { color: o.color || '#8a8a90', eye: '#80d0ff', scale: 0.92 })); top = sy - 32;
      ctx.fillStyle = '#c03030'; break;
    case 'fox': drawShadow(ctx, sx, sy, 12, 4); drawFox(ctx, sx, sy, o); top = sy - 30; bb = [sx - 18, sy - 28, sx + 18, sy + 4]; break;
    case 'bear': drawShadow(ctx, sx, sy, 20, 7); drawBear(ctx, sx, sy, o); top = sy - 42; bb = [sx - 24, sy - 40, sx + 24, sy + 4]; break;
    case 'owl': { const h = drawOwl(ctx, sx, sy, o); top = sy - h - 24; bb = [sx - 14, sy - h - 22, sx + 14, sy + 4]; break; }
    case 'boar': drawShadow(ctx, sx, sy, 15, 5); drawBoar(ctx, sx, sy, o); top = sy - 34; bb = [sx - 20, sy - 30, sx + 20, sy + 4]; break;
    case 'wisp': { const h = drawWisp(ctx, sx, sy, o); top = sy - h - 16; bb = [sx - 14, sy - h - 16, sx + 14, sy + 4]; break; }
  }
  ctx.restore();
  if (e.hurtT > 0 && !e.dead) hitFlash(sx, (sy + top) / 2 + 6, 20, e.hurtT / 0.2);
  e._bb = e.dead ? null : { x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3] };
  if (e.dead) return;
  labels.push(() => {
    ctx.font = '12px "Microsoft JhengHei", "PingFang TC", sans-serif';
    const tag = e.companion === 'pet' ? e.name + ' Lv.' + e.level : e.name;
    outlineText(tag, sx, top - 8, e.companion === 'pet' ? '#ffd890' : '#9fd8ff');
    hpBar(sx, top - 4, 32, e.hp / e.maxHp, '#40c060');
    if (e.say && e.sayT > 0) bubble(e.say, sx, top - 22);
  });
}

// 受擊閃光與減速霜環（取代逐角色的 CSS 濾鏡，效能好很多）
function hitFlash(x, y, r, k, col) {
  const a = clamp(k, 0, 1) * 0.55;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, 'rgba(' + (col || '255,255,240') + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + (col || '255,255,240') + ',0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.restore();
}
function frostUnder(x, y) {
  ctx.fillStyle = 'rgba(150,210,255,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, 18, 8, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(220,240,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 18, 8, 0, 0, 7); ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = G.t * 2 + i * 1.57; ctx.fillStyle = '#e8f6ff'; ctx.fillRect(x + Math.cos(a) * 16 - 1, y + Math.sin(a) * 7 - 1, 2, 2); }
}

// 攤位招牌
function stallSign(title, x, y) {
  ctx.font = 'bold 12px "Microsoft JhengHei", "PingFang TC", sans-serif';
  const t = '🏪 ' + title, w = ctx.measureText(t).width + 16;
  ctx.fillStyle = 'rgba(70,40,14,0.92)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 17, w, 20, 4); ctx.fill();
  ctx.strokeStyle = '#d8a850'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#ffe4a0'; ctx.fillText(t, x, y - 3);
}
