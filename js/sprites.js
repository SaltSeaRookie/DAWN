'use strict';
// ===== 角色與怪物繪製（程序化）=====
function drawShadow(ctx, x, y, rx, ry, a = 0.35) {
  ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function screenFacing(dir) {
  const c = Math.cos(dir), s = Math.sin(dir);
  return { sx: c - s, sy: (c + s) * 0.5 };
}
function limb(ctx, x, y, len, w, ang, col, col2) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.roundRect(-w / 2, -w / 4, w, len + w / 4, w / 2); ctx.fill();
  if (col2) { ctx.fillStyle = col2; ctx.fillRect(-w / 2, len * 0.55, w, len * 0.45); }
  ctx.restore();
}
function handPos(x, y, len, ang) { return [x - Math.sin(ang) * len, y + Math.cos(ang) * len]; }

function drawWeapon(ctx, type, x, y, ang, o) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  if (type === 'sword' || type === 'dagger' || type === 'claymore') {
    const L = type === 'dagger' ? 12 : type === 'claymore' ? 30 : 21;
    ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1.5, -4, 3, 5);
    ctx.fillStyle = '#c9a33a'; ctx.fillRect(-5, 0, 10, 2.5);
    const gr = ctx.createLinearGradient(-2, 0, 2, 0); gr.addColorStop(0, '#f4f8ff'); gr.addColorStop(1, '#8a96a6');
    ctx.fillStyle = o.holy ? '#fff8d0' : gr;
    ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(2, 2); ctx.lineTo(1.5, L); ctx.lineTo(0, L + 4); ctx.lineTo(-1.5, L); ctx.closePath(); ctx.fill();
    if (o.holy) { ctx.shadowColor = '#ffe880'; ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(255,240,150,0.8)'; ctx.stroke(); ctx.shadowBlur = 0; }
    if (o.ench >= 7) { ctx.strokeStyle = 'rgba(120,200,255,0.7)'; ctx.lineWidth = 1; ctx.stroke(); }
  } else if (type === 'bow') {
    ctx.strokeStyle = '#7a4d22'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(0, 12, 15, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,240,240,0.8)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(0, o.draw ? -6 : 0); ctx.lineTo(15, 0); ctx.stroke();
    if (o.draw) { ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 16); ctx.stroke(); }
  } else if (type === 'club') {
    ctx.fillStyle = '#6b4a2a'; ctx.beginPath(); ctx.moveTo(-1.5, -2); ctx.lineTo(1.5, -2); ctx.lineTo(4, 16); ctx.lineTo(-4, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3018'; ctx.beginPath(); ctx.arc(0, 15, 4.5, 0, 7); ctx.fill();
  } else if (type === 'spear') {
    ctx.fillStyle = '#5a4026'; ctx.fillRect(-1, -14, 2, 40);
    ctx.fillStyle = '#b8c0c8'; ctx.beginPath(); ctx.moveTo(-3, 26); ctx.lineTo(3, 26); ctx.lineTo(0, 36); ctx.closePath(); ctx.fill();
  } else if (type === 'rusty') {
    ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1.5, -4, 3, 5);
    ctx.fillStyle = '#8a7a64'; ctx.beginPath(); ctx.moveTo(-2, 1); ctx.lineTo(2, 1); ctx.lineTo(1, 20); ctx.lineTo(-1, 22); ctx.closePath(); ctx.fill();
  } else if (type === 'mace') {
    ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1.3, -3, 2.6, 18);
    ctx.fillStyle = o.holy ? '#fff0b0' : '#9aa0a8'; ctx.beginPath(); ctx.arc(0, 16, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a7078'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.fillRect(Math.cos(a) * 5 - 1, 16 + Math.sin(a) * 5 - 1, 2, 2); }
  } else if (type === 'axe') {
    ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1.3, -3, 2.6, 24);
    ctx.fillStyle = '#b8c0c8'; ctx.beginPath(); ctx.moveTo(1, 14); ctx.quadraticCurveTo(11, 16, 10, 26); ctx.lineTo(1, 22); ctx.closePath(); ctx.fill();
  } else if (type === 'staff') {
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(-1.2, -16, 2.4, 44);
    ctx.fillStyle = '#7ad0ff'; ctx.beginPath(); ctx.arc(0, -17, 3.5, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// 通用人形
function drawHumanoid(ctx, x, y, o) {
  const f = screenFacing(o.dir);
  const flip = f.sx < 0, back = f.sy < -0.05;
  const k = o.kind || 'human';
  const sc = o.scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -sc : sc, sc);
  const sw = o.moving ? Math.sin(o.walk) * 0.65 : 0;
  const bob = o.moving ? -Math.abs(Math.cos(o.walk)) * 1.6 : Math.sin(o.t * 2) * 0.4;
  const hunch = k === 'ghoul' ? 5 : 0;
  ctx.translate(0, bob);
  const thin = k === 'skeleton';
  const legW = thin ? 2.6 : 4.6, armW = thin ? 2.4 : 3.8;
  const hipY = -17, shY = -31;
  const skin = o.skin || '#e8c49a';

  // 攻擊動畫
  let armA, backArmA = 0.25 - sw * 0.6;
  const wtype = o.weapon;
  const atk = o.atk; // 0..1 或 -1
  const isBow = wtype === 'bow';
  if (atk >= 0) {
    if (isBow) { armA = -Math.PI / 2 + 0.05; backArmA = -Math.PI / 2 - 0.3 + atk * 0.2; }
    else if (k === 'ghoul' || !wtype) { armA = lerp(-2.4, -0.3, Math.min(1, atk * 1.6)); }
    else if (wtype === 'spear') { armA = lerp(-1.2, -1.75, Math.sin(atk * Math.PI)); }
    else armA = lerp(-2.7, -0.5, Math.min(1, atk * 1.5));
  } else {
    armA = isBow ? -0.35 : (o.moving ? sw * 0.7 - 0.15 : -0.25 + Math.sin(o.t * 2) * 0.03);
    if (wtype === 'spear') armA = -0.9;
  }

  // 尾巴（蜥蜴人）
  if (k === 'lizard') {
    ctx.strokeStyle = shade(o.body, -0.2); ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, hipY + 2); ctx.quadraticCurveTo(-14, hipY + 8 + sw * 3, -22, -2); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, -3); ctx.lineTo(-27, 0); ctx.stroke();
  }
  // 披風（正面時在身後）
  if (o.cape && !back) {
    ctx.fillStyle = shade(o.cape, -0.25);
    ctx.beginPath(); ctx.moveTo(-5, shY + 1); ctx.lineTo(4, shY + 1); ctx.lineTo(-2 - sw * 3, -3); ctx.lineTo(-12 - sw * 4, -4); ctx.closePath(); ctx.fill();
  }
  // 後臂
  limb(ctx, -2, shY + 2 + hunch, 13, armW, backArmA, back ? (o.sleeve || o.body) : shade(o.sleeve || o.body, -0.3), thin ? null : (back ? skin : shade(skin, -0.3)));
  // 後腿與前腿
  const legC = o.legs || '#3a3a4a', bootC = o.boots || '#2a1e16';
  if (o.robe) {
    ctx.fillStyle = shade(o.body, -0.15);
    ctx.beginPath(); ctx.moveTo(-6, hipY - 2); ctx.lineTo(6, hipY - 2); ctx.lineTo(8 + sw * 2, 0); ctx.lineTo(-8 + sw * 2, 0); ctx.closePath(); ctx.fill();
  } else {
    limb(ctx, -1.5, hipY, 17, legW, -sw, shade(legC, -0.25), thin ? null : shade(bootC, -0.2));
    limb(ctx, 1.5, hipY, 17, legW, sw, legC, thin ? null : bootC);
  }
  // 軀幹
  ctx.save(); ctx.translate(hunch * 0.6, hunch * 0.4);
  if (thin) {
    ctx.strokeStyle = o.body; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(0, shY); ctx.lineTo(0, hipY); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, shY + 3 + i * 3, 5 - i * 0.5, 1.2, 0, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, hipY, 4, 2, 0, 0, 7); ctx.stroke();
  } else {
    const bw = k === 'goblin' ? 6 : 6.5;
    const gr = ctx.createLinearGradient(-bw, 0, bw, 0);
    gr.addColorStop(0, shade(o.body, -0.3)); gr.addColorStop(0.45, o.body); gr.addColorStop(1, shade(o.body, -0.35));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(-bw, shY); ctx.lineTo(bw, shY); ctx.lineTo(bw - 1.5, hipY + 1); ctx.lineTo(-bw + 1.5, hipY + 1); ctx.closePath(); ctx.fill();
    if (o.trim) { ctx.strokeStyle = o.trim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, shY + 1); ctx.lineTo(0, hipY); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-bw, shY + 0.6); ctx.lineTo(bw, shY + 0.6); ctx.stroke(); }
    if (o.belt) { ctx.fillStyle = o.belt; ctx.fillRect(-bw + 1, hipY - 2, bw * 2 - 2, 2.5); }
    if (o.plate) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-bw + 1.5, shY + 2, 3, 9); }
  }
  ctx.restore();
  // 頭
  const hx = 1 + hunch, hy = shY - 7 + hunch * 0.6;
  if (k === 'skeleton' || k === 'lich') {
    ctx.fillStyle = o.bone || o.body; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); ctx.fill();
    ctx.fillRect(hx - 2, hy + 3, 7, 4);
    if (!back) { ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(hx + 2.5, hy - 0.5, 1.7, 0, 7); ctx.fill(); ctx.fillStyle = o.eye || '#ff3a2a'; ctx.fillRect(hx + 2, hy - 1, 1.2, 1.2); ctx.fillStyle = '#1a1010'; ctx.fillRect(hx + 1, hy + 4, 4, 1); }
  } else if (k === 'werewolf') {
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(hx, hy, 6, 5.5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 3, hy - 2); ctx.lineTo(hx + 12, hy + 1); ctx.lineTo(hx + 3, hy + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(skin, -0.3); ctx.beginPath(); ctx.moveTo(hx - 4, hy - 3); ctx.lineTo(hx - 3, hy - 11); ctx.lineTo(hx + 1, hy - 4); ctx.fill();
    if (!back) { ctx.fillStyle = '#ffd040'; ctx.fillRect(hx + 2.5, hy - 2, 2, 1.6); ctx.fillStyle = '#111'; ctx.fillRect(hx + 11, hy, 2, 2); }
  } else if (k === 'mummy') {
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,40,0.6)'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i += 2.5) { ctx.beginPath(); ctx.moveTo(hx - 6, hy + i); ctx.lineTo(hx + 6, hy + i - 1.5); ctx.stroke(); }
    if (!back) { ctx.fillStyle = '#7af0ff'; ctx.fillRect(hx + 2, hy - 1.5, 2.2, 1.6); }
  } else if (k === 'lizard') {
    ctx.fillStyle = o.body; ctx.beginPath(); ctx.ellipse(hx + 1, hy, 5.5, 5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 6, hy + 1.5, 5, 3, 0.15, 0, 7); ctx.fill();
    ctx.fillStyle = shade(o.body, -0.3); ctx.beginPath(); ctx.moveTo(hx - 4, hy - 4); ctx.lineTo(hx - 1, hy - 9); ctx.lineTo(hx + 2, hy - 4); ctx.fill();
    if (!back) { ctx.fillStyle = '#f0d040'; ctx.fillRect(hx + 3, hy - 2, 2, 1.6); }
  } else {
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(hx, hy, k === 'goblin' ? 6.5 : 5.8, 0, 7); ctx.fill();
    if (k === 'goblin') {
      ctx.beginPath(); ctx.moveTo(hx - 3, hy - 2); ctx.lineTo(hx - 12, hy - 7); ctx.lineTo(hx - 3, hy + 2); ctx.fill();
      if (!back) { ctx.fillStyle = '#ffde40'; ctx.fillRect(hx + 2.5, hy - 1.5, 2, 2); ctx.fillStyle = shade(skin, -0.3); ctx.beginPath(); ctx.moveTo(hx + 5, hy); ctx.lineTo(hx + 9, hy + 2); ctx.lineTo(hx + 5, hy + 2.5); ctx.fill(); }
    } else if (k === 'ghoul') {
      if (!back) { ctx.fillStyle = '#ffef8a'; ctx.fillRect(hx + 2, hy - 1.5, 2, 1.5); ctx.fillStyle = '#3a1a1a'; ctx.fillRect(hx + 1, hy + 2.5, 5, 1.5); }
      ctx.fillStyle = '#4a4a3a'; ctx.beginPath(); ctx.arc(hx - 1, hy - 2, 5, Math.PI * 1.0, Math.PI * 1.9); ctx.fill();
    } else {
      if (!back) { ctx.fillStyle = '#2a2030'; ctx.fillRect(hx + 2.4, hy - 1, 1.6, 1.8); }
      // 頭髮 / 頭盔
      if (o.helm) {
        ctx.fillStyle = o.helm; ctx.beginPath(); ctx.arc(hx, hy - 0.5, 6.4, Math.PI * 0.95, Math.PI * 2.08); ctx.fill();
        ctx.fillRect(hx - 6.4, hy - 1, 3, 6);
      } else if (o.hair) {
        ctx.fillStyle = o.hair;
        ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1, 6.3, Math.PI * 0.85, Math.PI * 2.05); ctx.fill();
        if (back) { ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); ctx.fill(); }
        if (o.longHair) { ctx.beginPath(); ctx.moveTo(hx - 6, hy - 2); ctx.lineTo(hx - 1, hy - 2); ctx.lineTo(hx - 2, hy + 12); ctx.lineTo(hx - 7, hy + 10); ctx.closePath(); ctx.fill(); }
      }
      if (o.hood) { ctx.fillStyle = o.hood; ctx.beginPath(); ctx.arc(hx - 0.5, hy - 0.5, 7, Math.PI * 0.7, Math.PI * 2.1); ctx.fill(); }
    }
  }
  // 披風（背面時在前）
  if (o.cape && back) {
    ctx.fillStyle = o.cape;
    ctx.beginPath(); ctx.moveTo(-7, shY); ctx.lineTo(7, shY); ctx.lineTo(8 + sw * 2, -4); ctx.lineTo(-8 + sw * 2, -4); ctx.closePath(); ctx.fill();
  }
  // 前臂與武器
  const fx = 2 + hunch, fy = shY + 2 + hunch;
  const armLen = k === 'ghoul' ? 16 : 13;
  if (wtype && back) { const [hx2, hy2] = handPos(fx, fy, armLen, armA); drawWeapon(ctx, wtype, hx2, hy2, armA, o); }
  limb(ctx, fx, fy, armLen, armW, armA, o.sleeve || o.body, thin ? null : skin);
  if (k === 'ghoul') { const [cx2, cy2] = handPos(fx, fy, armLen, armA); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + i * 2 - Math.sin(armA) * 4, cy2 + Math.cos(armA) * 4); ctx.stroke(); } }
  if (wtype && !back) { const [hx2, hy2] = handPos(fx, fy, armLen, armA); drawWeapon(ctx, wtype, hx2, hy2, armA, o); }
  if (o.shield) {
    ctx.save(); ctx.translate(back ? 3 : -5, shY + 9 + hunch);
    ctx.fillStyle = back ? '#4a3a28' : (o.shieldCol || '#6a5a3a');
    ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(5, -7); ctx.lineTo(5, 2); ctx.quadraticCurveTo(0, 10, -5, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c0a050'; ctx.lineWidth = 1; ctx.stroke();
    if (!back) { ctx.fillStyle = '#c0a050'; ctx.fillRect(-0.7, -5, 1.4, 9); }
    ctx.restore();
  }
  if (o.crown) { ctx.fillStyle = '#d8b040'; const cx2 = hx, cy2 = hy - 6; ctx.beginPath(); ctx.moveTo(cx2 - 5, cy2 + 2); ctx.lineTo(cx2 - 5, cy2 - 3); ctx.lineTo(cx2 - 2.5, cy2); ctx.lineTo(cx2, cy2 - 4); ctx.lineTo(cx2 + 2.5, cy2); ctx.lineTo(cx2 + 5, cy2 - 3); ctx.lineTo(cx2 + 5, cy2 + 2); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

function drawWolf(ctx, x, y, o) {
  const f = screenFacing(o.dir);
  const flip = f.sx < 0;
  const sc = o.scale || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -sc : sc, sc);
  const ph = o.walk * 1.4;
  const sw = o.moving ? Math.sin(ph) * 0.6 : 0;
  const lunge = o.atk >= 0 ? Math.sin(o.atk * Math.PI) * 6 : 0;
  ctx.translate(lunge, 0);
  const c = o.color, dk = shade(c, -0.35);
  // 尾
  ctx.strokeStyle = dk; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-12, -15); ctx.quadraticCurveTo(-20, -18 + sw * 2, -24, -10); ctx.stroke();
  // 腿
  const leg = (lx, a, col) => limb(ctx, lx, -11, 11, 3.2, a, col);
  leg(-8, sw, dk); leg(7, -sw, dk);
  // 身
  const gr = ctx.createLinearGradient(0, -22, 0, -8); gr.addColorStop(0, shade(c, 0.15)); gr.addColorStop(1, dk);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -15, 14, 6.5, 0, 0, 7); ctx.fill();
  leg(-6, -sw, c); leg(9, sw, c);
  // 頭
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.ellipse(13, -20, 6, 5, -0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(15, -22); ctx.lineTo(24, -18); ctx.lineTo(16, -15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(9, -23); ctx.lineTo(11, -30); ctx.lineTo(14, -24); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(23, -19, 2, 2);
  ctx.fillStyle = o.eye || '#ffcc33'; ctx.fillRect(15, -22, 2, 1.5);
  ctx.restore();
}

function drawTreant(ctx, x, y, o) {
  const f = screenFacing(o.dir);
  const flip = f.sx < 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1);
  const sw = o.moving ? Math.sin(o.walk * 0.7) * 0.4 : 0;
  const sway = Math.sin(o.t * 1.5) * 1.5;
  // 根腳
  ctx.strokeStyle = '#3e2a18'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const [lx, s] of [[-6, sw], [6, -sw]]) { ctx.beginPath(); ctx.moveTo(lx, -14); ctx.lineTo(lx + s * 10, 0); ctx.stroke(); }
  // 樹幹身體
  const gr = ctx.createLinearGradient(-12, 0, 12, 0); gr.addColorStop(0, '#3a2716'); gr.addColorStop(0.5, '#6a4a2c'); gr.addColorStop(1, '#2e1e10');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(-11, -12); ctx.lineTo(-9, -46); ctx.lineTo(9, -46); ctx.lineTo(11, -12); ctx.closePath(); ctx.fill();
  // 臉
  ctx.fillStyle = '#1a0e06'; ctx.beginPath(); ctx.ellipse(1, -36, 2.5, 2, 0, 0, 7); ctx.ellipse(7, -36, 2, 2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffb030'; ctx.fillRect(0.5, -36.5, 1.5, 1.5); ctx.fillRect(6.5, -36.5, 1.5, 1.5);
  ctx.fillStyle = '#1a0e06'; ctx.beginPath(); ctx.ellipse(4, -28, 4, 2, 0, 0, 7); ctx.fill();
  // 手臂樹枝
  const atk = o.atk >= 0 ? Math.sin(o.atk * Math.PI) : 0;
  ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(8, -40); ctx.quadraticCurveTo(18 + atk * 6, -44 + atk * 14, 22 + atk * 8, -30 + atk * 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, -40); ctx.quadraticCurveTo(-18, -46, -20, -34); ctx.stroke();
  // 樹冠
  const blobs = [[-10, -54, 11], [8, -56, 12], [0, -64, 13], [-14, -62, 8], [14, -64, 8]];
  for (const [bx, by, r] of blobs) { ctx.fillStyle = '#23401c'; ctx.beginPath(); ctx.arc(bx + sway + 1, by + 2, r, 0, 7); ctx.fill(); }
  for (const [bx, by, r] of blobs) {
    const g2 = ctx.createRadialGradient(bx + sway - 3, by - 4, 1, bx + sway, by, r);
    g2.addColorStop(0, '#5c8a3c'); g2.addColorStop(1, '#2c4a22');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(bx + sway, by, r * 0.9, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawWyvern(ctx, x, y, o) {
  const f = screenFacing(o.dir);
  const flip = f.sx < 0;
  const big = o.big || 1, hover = (34 + Math.sin(o.t * 2.2) * 5) * big, k = 1.25 * big;
  drawShadow(ctx, x, y, 46 * big, 15 * big, 0.3);
  ctx.save(); ctx.translate(x, y - hover); ctx.scale(flip ? -k : k, k);
  const flap = Math.sin(o.t * 5.5);
  const c = o.color, dk = shade(c, -0.4), lt = shade(c, 0.2);
  // 後翼
  ctx.fillStyle = shade(c, -0.5);
  ctx.beginPath(); ctx.moveTo(-2, -18); ctx.lineTo(-18, -48 - flap * 18); ctx.lineTo(-40, -36 - flap * 22); ctx.lineTo(-30, -22 - flap * 8); ctx.lineTo(-14, -14); ctx.closePath(); ctx.fill();
  // 尾巴
  ctx.strokeStyle = dk; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, -12); ctx.quadraticCurveTo(-34, -2 + flap * 3, -48, 6); ctx.stroke();
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(-48, 2); ctx.lineTo(-58, 8); ctx.lineTo(-47, 11); ctx.fill();
  // 腳
  ctx.strokeStyle = dk; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-2, 6); ctx.moveTo(6, -8); ctx.lineTo(9, 5); ctx.stroke();
  // 身體
  const gr = ctx.createLinearGradient(0, -28, 0, -2); gr.addColorStop(0, lt); gr.addColorStop(1, dk);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -14, 17, 11, -0.15, 0, 7); ctx.fill();
  ctx.fillStyle = shade(c, 0.35); ctx.beginPath(); ctx.ellipse(4, -8, 10, 4, -0.1, 0, 7); ctx.fill();
  // 脖子與頭
  const atk = o.atk >= 0 ? Math.sin(o.atk * Math.PI) : 0;
  ctx.strokeStyle = c; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(12, -20); ctx.quadraticCurveTo(22, -40 + atk * 8, 28 + atk * 8, -40 + atk * 14); ctx.stroke();
  const hx = 30 + atk * 8, hy = -42 + atk * 14;
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(hx, hy, 8, 5.5, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 4, hy - 3); ctx.lineTo(hx + 16, hy + 2); ctx.lineTo(hx + 4, hy + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(hx - 4, hy - 3); ctx.lineTo(hx - 12, hy - 12); ctx.lineTo(hx - 1, hy - 5); ctx.fill();
  ctx.fillStyle = '#ffdd33'; ctx.fillRect(hx + 2, hy - 2.5, 2.5, 2);
  // 前翼
  const wg = ctx.createLinearGradient(0, -70, 0, -10); wg.addColorStop(0, shade(c, 0.1)); wg.addColorStop(1, shade(c, -0.3));
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.moveTo(2, -20);
  ctx.lineTo(-6, -58 - flap * 22); ctx.lineTo(-34, -64 - flap * 26);
  ctx.quadraticCurveTo(-30, -44 - flap * 14, -40, -34 - flap * 10);
  ctx.quadraticCurveTo(-24, -30 - flap * 6, -24, -20);
  ctx.quadraticCurveTo(-10, -22, 2, -14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dk; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(2, -20); ctx.lineTo(-6, -58 - flap * 22); ctx.lineTo(-34, -64 - flap * 26); ctx.moveTo(-6, -58 - flap * 22); ctx.lineTo(-40, -34 - flap * 10); ctx.moveTo(-6, -58 - flap * 22); ctx.lineTo(-24, -20); ctx.stroke();
  ctx.restore();
  return hover;
}

// ===== 新增怪物 =====
function drawSpider(ctx, x, y, o) {
  const f = screenFacing(o.dir), flip = f.sx < 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1);
  const ph = o.walk * 2;
  const c = o.color || '#3a3030';
  ctx.strokeStyle = shade(c, -0.2); ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const sw = o.moving ? Math.sin(ph + i * 1.3) * 3 : 0;
    for (const s of [-1, 1]) {
      const bx = -4 + i * 4, by = -8;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + s * 6 + sw, by - 7); ctx.lineTo(bx + s * 11 + sw, 0); ctx.stroke();
    }
  }
  const lunge = o.atk >= 0 ? Math.sin(o.atk * Math.PI) * 5 : 0;
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-8, -10, 10, 8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#a02020'; ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-6, -12); ctx.lineTo(-10, -8); ctx.fill();
  ctx.fillStyle = shade(c, 0.15); ctx.beginPath(); ctx.ellipse(5 + lunge, -9, 6, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff3030'; for (const [a, b] of [[8, -11], [10, -10], [8, -8]]) ctx.fillRect(a + lunge, b, 1.6, 1.6);
  ctx.restore();
}
function drawGolem(ctx, x, y, o) {
  const f = screenFacing(o.dir), flip = f.sx < 0, k = 1.15 * (o.scale && o.scale > 1.2 ? o.scale : 1);
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -k : k, k);
  const B = o.color || '#7a7468';
  const sw = o.moving ? Math.sin(o.walk * 0.7) * 0.35 : 0;
  const atk = o.atk >= 0 ? Math.sin(o.atk * Math.PI) : 0;
  const stone = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(px - w / 2, py); ctx.lineTo(px - w / 2 + 2, py - h); ctx.lineTo(px + w / 2 - 1, py - h + 1); ctx.lineTo(px + w / 2, py); ctx.closePath(); ctx.fill(); };
  stone(-6 + sw * 8, 0, 9, 16, shade(B, -0.22)); stone(6 - sw * 8, 0, 9, 16, shade(B, -0.1));
  stone(0, -14, 26, 24, B);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-12, -28, 4, 12);
  ctx.strokeStyle = '#4a4640'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(-2, -26); ctx.lineTo(4, -30); ctx.stroke();
  stone(-14, -18, 9, 20, shade(B, -0.18));
  ctx.save(); ctx.translate(13, -34); ctx.rotate(-0.3 - atk * 1.2); stone(0, 22, 10, 22, shade(B, -0.1)); ctx.restore();
  stone(2, -38, 14, 11, shade(B, 0.1));
  ctx.fillStyle = '#ff9a30'; ctx.fillRect(4, -45, 3, 2); ctx.fillRect(-1, -45, 3, 2);
  ctx.fillStyle = 'rgba(255,150,50,0.6)'; ctx.beginPath(); ctx.arc(0, -24, 3, 0, 7); ctx.fill();
  ctx.restore();
}
function drawScorpion(ctx, x, y, o) {
  const f = screenFacing(o.dir), flip = f.sx < 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1.1 : 1.1, 1.1);
  const c = o.color || '#b08040', dk = shade(c, -0.35);
  const ph = o.walk * 2;
  ctx.strokeStyle = dk; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const sw = o.moving ? Math.sin(ph + i) * 2 : 0; ctx.beginPath(); ctx.moveTo(-4 + i * 5, -6); ctx.lineTo(-6 + i * 5 + sw, 0); ctx.stroke(); }
  // 尾巴
  const atk = o.atk >= 0 ? Math.sin(o.atk * Math.PI) : 0;
  ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.quadraticCurveTo(-24, -20, -14 + atk * 10, -32 + atk * 6); ctx.stroke();
  ctx.fillStyle = '#3a2010'; ctx.beginPath(); ctx.moveTo(-14 + atk * 10, -32 + atk * 6); ctx.lineTo(-6 + atk * 14, -30 + atk * 10); ctx.lineTo(-12 + atk * 10, -27 + atk * 6); ctx.fill();
  const gr = ctx.createLinearGradient(0, -14, 0, -2); gr.addColorStop(0, shade(c, 0.2)); gr.addColorStop(1, dk);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -8, 12, 5.5, 0, 0, 7); ctx.fill();
  // 鉗子
  ctx.fillStyle = c;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(14 + atk * 3, -8 + s * 4, 5, 3, s * 0.4, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#111'; ctx.fillRect(9, -11, 1.6, 1.6); ctx.fillRect(9, -8, 1.6, 1.6);
  ctx.restore();
}
function drawWorm(ctx, x, y, o) {
  const f = screenFacing(o.dir), flip = f.sx < 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1);
  const c = o.color || '#b8905a';
  const atk = o.atk >= 0 ? Math.sin(o.atk * Math.PI) : 0;
  const rise = 20 + Math.sin(o.t * 2) * 3 + atk * 10;
  // 沙堆
  ctx.fillStyle = 'rgba(150,110,60,0.6)'; ctx.beginPath(); ctx.ellipse(0, -2, 20, 7, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const t = i / 6, sx = Math.sin(t * 2.2 + o.t) * 4 + t * 8 * (1 + atk), sy = -t * rise * 2;
    ctx.fillStyle = i % 2 ? shade(c, -0.15) : c;
    ctx.beginPath(); ctx.ellipse(sx, sy - 4, 10 - t * 3, 6 - t * 1.5, 0, 0, 7); ctx.fill();
  }
  const hx = 8 * (1 + atk) + Math.sin(2.2 + o.t) * 4, hy = -rise * 2 - 6;
  ctx.fillStyle = '#5a2a1a'; ctx.beginPath(); ctx.ellipse(hx + 4, hy, 5, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#f0e8d0'; for (let i = 0; i < 5; i++) { const a = i * 1.25; ctx.fillRect(hx + 4 + Math.cos(a) * 4, hy + Math.sin(a) * 3, 1.5, 1.5); }
  ctx.restore();
}
function drawGhost(ctx, x, y, o) {
  const f = screenFacing(o.dir), flip = f.sx < 0;
  const hover = 10 + Math.sin(o.t * 2.5) * 3;
  ctx.save(); ctx.translate(x, y - hover); ctx.scale(flip ? -1 : 1, 1);
  ctx.globalAlpha *= 0.75;
  const gr = ctx.createLinearGradient(0, -44, 0, 6); gr.addColorStop(0, o.color || 'rgba(200,220,255,0.95)'); gr.addColorStop(1, 'rgba(120,140,200,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(-10, -30); ctx.quadraticCurveTo(0, -52, 10, -30);
  for (let i = 0; i <= 4; i++) { const xx = 10 - i * 5, yy = 4 + Math.sin(o.t * 6 + i) * 3; ctx.lineTo(xx, yy); }
  ctx.closePath(); ctx.fill();
  const atk = o.atk >= 0 ? Math.sin(o.atk * Math.PI) : 0;
  ctx.strokeStyle = 'rgba(200,220,255,0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(6, -26); ctx.quadraticCurveTo(14 + atk * 6, -24, 16 + atk * 8, -18); ctx.stroke();
  ctx.fillStyle = '#101830'; ctx.beginPath(); ctx.ellipse(2, -36, 2, 3, 0, 0, 7); ctx.ellipse(7, -36, 1.6, 2.6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#9ad8ff'; ctx.fillRect(1.5, -37, 1.2, 1.2); ctx.fillRect(6.5, -37, 1.2, 1.2);
  ctx.beginPath(); ctx.fillStyle = '#101830'; ctx.ellipse(4, -29, 2.5, 3, 0, 0, 7); ctx.fill();
  ctx.restore();
  return hover;
}

// ===== 城門與守護塔 =====
function drawGate(ctx, sx, sy, g) {
  // sx,sy：城門中段地面中心
  const hpF = g.hp / g.maxHp;
  ctx.save();
  // 拱門（開著或關著都畫）
  const Q = (dx, dy, z) => [sx + (dx - dy) * HW, sy + (dx + dy) * HH - z];
  const poly2 = (pts, fill, stroke) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts) ctx.lineTo(...p); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } };
  const arch = () => {
    poly2([Q(-0.5, -1.6, 58), Q(-0.5, 1.6, 58), Q(-0.5, 1.6, 74), Q(-0.5, -1.6, 74)], '#6a6660', 'rgba(20,18,16,0.6)');
    poly2([Q(-0.5, -1.6, 74), Q(-0.5, 1.6, 74), Q(0.5, 1.6, 74), Q(0.5, -1.6, 74)], '#7e7a72');
    ctx.fillStyle = '#c0a050'; const c = Q(-0.5, 0, 66); ctx.beginPath(); ctx.arc(c[0], c[1], 4, 0, 7); ctx.fill();
  };
  if (g.open) {
    // 開啟的城門：兩扇門板向內打開、鐵柵升起
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(sx, sy, 34, 12, 0, 0, 7); ctx.fill();
    for (const side of [-1.5, 1.5]) {
      poly2([Q(0, side, 0), Q(1.3, side, 0), Q(1.3, side, 56), Q(0, side, 56)], '#5a3a1e', '#2a1a0a');
      ctx.strokeStyle = '#6a6a70'; ctx.lineWidth = 2.5;
      for (const z of [12, 30, 46]) { ctx.beginPath(); ctx.moveTo(...Q(0, side, z)); ctx.lineTo(...Q(1.3, side, z)); ctx.stroke(); }
    }
    ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 2;
    for (let k = -1.4; k <= 1.41; k += 0.35) { ctx.beginPath(); ctx.moveTo(...Q(-0.5, k, 62)); ctx.lineTo(...Q(-0.5, k, 74)); ctx.stroke(); }
    arch();
    ctx.restore(); return;
  }
  if (g.broken) {
    ctx.fillStyle = '#3a2a1a';
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(sx - 20 + i * 8, sy - 2 + (i % 2) * 4); ctx.rotate(i * 0.7); ctx.fillRect(-10, -2, 20, 4); ctx.restore(); }
    arch();
    ctx.restore(); return;
  }
  // 城門板（沿 y 方向的牆面，朝 -x）
  const P = (dy, z) => [sx - dy * HW, sy + dy * HH - z];
  const poly = (pts, fill) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts) ctx.lineTo(...p); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  poly([P(-1.5, 0), P(1.5, 0), P(1.5, 58), P(-1.5, 58)], '#5a3a1e');
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2;
  for (let k = -1; k <= 1; k += 0.5) { ctx.beginPath(); ctx.moveTo(...P(k, 0)); ctx.lineTo(...P(k, 58)); ctx.stroke(); }
  ctx.strokeStyle = '#6a6a70'; ctx.lineWidth = 3;
  for (const z of [12, 30, 48]) { ctx.beginPath(); ctx.moveTo(...P(-1.5, z)); ctx.lineTo(...P(1.5, z)); ctx.stroke(); }
  if (hpF < 0.6) { ctx.strokeStyle = '#1a0e04'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...P(-0.4, 50)); ctx.lineTo(...P(0.2, 30)); ctx.lineTo(...P(-0.2, 12)); ctx.stroke(); }
  if (hpF < 0.3) { ctx.beginPath(); ctx.moveTo(...P(0.8, 40)); ctx.lineTo(...P(0.4, 20)); ctx.stroke(); }
  arch();
  ctx.restore();
}
function drawTower(ctx, sx, sy, tw, t) {
  drawShadow(ctx, sx, sy, 22, 8);
  ctx.save();
  const pulse = 0.6 + Math.sin(t * 3) * 0.2;
  ctx.fillStyle = '#4a4a52'; ctx.beginPath(); ctx.moveTo(sx - 16, sy); ctx.lineTo(sx - 10, sy - 14); ctx.lineTo(sx + 10, sy - 14); ctx.lineTo(sx + 16, sy); ctx.closePath(); ctx.fill();
  const owner = tw.ownerColor || '#6ab0ff';
  ctx.shadowColor = owner; ctx.shadowBlur = 20 * pulse;
  const gr = ctx.createLinearGradient(sx - 10, 0, sx + 10, 0); gr.addColorStop(0, shade(owner, -0.3)); gr.addColorStop(0.5, shade(owner, 0.5)); gr.addColorStop(1, shade(owner, -0.4));
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(sx, sy - 80 - Math.sin(t * 2) * 3); ctx.lineTo(sx + 10, sy - 40); ctx.lineTo(sx, sy - 16); ctx.lineTo(sx - 10, sy - 40); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ===== 物品圖示 =====
function itemColor(id) {
  const it = ITEMS[id];
  if (POTION_COLORS[id]) return POTION_COLORS[id];
  if (SCROLL_COLORS[id]) return SCROLL_COLORS[id];
  if (it.rare) return '#d8b8ff';
  const palette = { sword: '#dfe6ee', dagger: '#cfd6dc', claymore: '#f2f2ff', axe: '#c8ccd2', spear: '#c0c8d0', mace: '#a8b0b8', staff: '#8a6a3a', bow: '#8a5a2a',
    helm: '#9aa0aa', armor: '#8a929c', cloak: '#5a3a6a', shield: '#7a5a3a', gloves: '#7a5a3a', boots: '#6a4a2a', belt: '#7a5230', ring: '#e0c050', amulet: '#e0c050' };
  if (palette[it.icon]) {
    if (/leather|robe|travel/.test(id)) return it.icon === 'armor' ? '#8a5a32' : palette[it.icon];
    if (/plate|iron/.test(id)) return '#c8d0da';
    return palette[it.icon];
  }
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return 'hsl(' + (h % 360) + ',35%,60%)';
}
function drawItemIcon(ctx, id, x, y, s) {
  const it = ITEMS[id]; if (!it) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32);
  const c = itemColor(id);
  const blade = (L, w, col) => { ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1.5, 6, 3, 7); ctx.fillStyle = '#c9a33a'; ctx.fillRect(-w - 2, 5, (w + 2) * 2, 2.5); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-w, 5); ctx.lineTo(-w, -L); ctx.lineTo(0, -L - 3); ctx.lineTo(w, -L); ctx.lineTo(w, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-0.5, -L, 1, L + 4); };
  const rot = (fn) => { ctx.save(); ctx.translate(16, 16); ctx.rotate(-Math.PI / 4); fn(); ctx.restore(); };
  switch (it.icon) {
    case 'potion': {
      ctx.fillStyle = 'rgba(220,230,240,0.35)'; ctx.fillRect(13, 4, 6, 8);
      ctx.fillStyle = '#7a5434'; ctx.fillRect(12.5, 2, 7, 4);
      const gr = ctx.createRadialGradient(13, 17, 1, 16, 20, 10); gr.addColorStop(0, shade(c, 0.5)); gr.addColorStop(1, shade(c, -0.3));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(16, 20, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(12.5, 16.5, 2, 3, -0.5, 0, 7); ctx.fill();
      break;
    }
    case 'scroll': {
      ctx.fillStyle = shade(c, 0.1); ctx.fillRect(7, 8, 18, 16);
      ctx.fillStyle = shade(c, -0.3); ctx.beginPath(); ctx.ellipse(7, 16, 3, 8, 0, 0, 7); ctx.ellipse(25, 16, 3, 8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(80,40,20,0.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(11, 12 + i * 4); ctx.lineTo(21, 12 + i * 4); ctx.stroke(); }
      ctx.fillStyle = /^b/.test(id) ? '#ffd040' : '#b02020'; ctx.beginPath(); ctx.arc(16, 24, 2.5, 0, 7); ctx.fill();
      break;
    }
    case 'book': {
      ctx.fillStyle = '#5a2a3a'; ctx.fillRect(7, 5, 18, 23); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(9, 7, 15, 20); ctx.fillStyle = '#6a3040'; ctx.fillRect(7, 5, 16, 21);
      ctx.strokeStyle = '#d0b050'; ctx.lineWidth = 1; ctx.strokeRect(9.5, 7.5, 11, 16);
      ctx.save(); ctx.translate(9, 9); ctx.scale(0.4, 0.4); drawSkillIcon(ctx, SPELLS[it.spell].icon, 0, 0, 32); ctx.restore();
      break;
    }
    case 'dagger': rot(() => blade(8, 1.8, c)); break;
    case 'sword': rot(() => blade(12, 2, c)); break;
    case 'claymore': rot(() => blade(15, 2.6, c)); break;
    case 'axe': rot(() => { ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1.5, -14, 3, 28); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(1, -14); ctx.quadraticCurveTo(12, -12, 11, -2); ctx.lineTo(1, -4); ctx.fill(); }); break;
    case 'spear': rot(() => { ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1, -10, 2, 26); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(0, -17); ctx.lineTo(3, -10); ctx.fill(); }); break;
    case 'mace': rot(() => { ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1.5, -4, 3, 18); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -7, 6, 0, 7); ctx.fill(); ctx.fillStyle = shade(c, -0.3); for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.fillRect(Math.cos(a) * 7 - 1, -7 + Math.sin(a) * 7 - 1, 2.5, 2.5); } }); break;
    case 'staff': rot(() => { ctx.fillStyle = '#6a4a28'; ctx.fillRect(-1.3, -12, 2.6, 28); const gem = id === 'oak_staff' ? '#7ad070' : id === 'star_staff' ? '#ffe070' : '#7ad0ff'; ctx.fillStyle = gem; ctx.shadowColor = gem; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(0, -14, 4, 0, 7); ctx.fill(); }); break;
    case 'bow':
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(8, 4); ctx.quadraticCurveTo(28, 16, 8, 28); ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(8, 28); ctx.stroke(); break;
    case 'arrow':
      for (const o of [-3, 0, 3]) { ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6 + o, 26); ctx.lineTo(24 + o, 8); ctx.stroke(); ctx.fillStyle = id === 'silver_arrow' ? '#f0f4ff' : '#9aa0a8'; ctx.beginPath(); ctx.moveTo(26 + o, 6); ctx.lineTo(21 + o, 8); ctx.lineTo(24 + o, 11); ctx.fill(); ctx.fillStyle = '#e8e0d0'; ctx.fillRect(5 + o, 24, 3, 3); }
      break;
    case 'helm': { const gr = ctx.createLinearGradient(6, 0, 26, 0); gr.addColorStop(0, shade(c, -0.3)); gr.addColorStop(0.5, shade(c, 0.3)); gr.addColorStop(1, shade(c, -0.4)); ctx.fillStyle = gr; if (id === 'wizard_hat') { ctx.fillStyle = '#3a2a6a'; ctx.beginPath(); ctx.moveTo(16, 3); ctx.lineTo(24, 22); ctx.lineTo(8, 22); ctx.fill(); ctx.fillRect(4, 22, 24, 4); } else { ctx.beginPath(); ctx.arc(16, 18, 10, Math.PI, 0); ctx.lineTo(26, 24); ctx.lineTo(6, 24); ctx.closePath(); ctx.fill(); if (/iron/.test(id)) { ctx.fillStyle = '#222'; ctx.fillRect(10, 17, 12, 2); } } break; }
    case 'armor': case 'cloak': {
      const gr = ctx.createLinearGradient(6, 0, 26, 0); gr.addColorStop(0, shade(c, -0.3)); gr.addColorStop(0.5, shade(c, 0.2)); gr.addColorStop(1, shade(c, -0.3));
      ctx.fillStyle = gr;
      if (it.icon === 'cloak') { ctx.beginPath(); ctx.moveTo(11, 4); ctx.lineTo(21, 4); ctx.lineTo(27, 28); ctx.lineTo(5, 28); ctx.closePath(); ctx.fill(); }
      else if (/robe/.test(id)) { ctx.beginPath(); ctx.moveTo(11, 4); ctx.lineTo(21, 4); ctx.lineTo(26, 10); ctx.lineTo(24, 29); ctx.lineTo(8, 29); ctx.lineTo(6, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d0b050'; ctx.fillRect(15, 6, 2, 22); }
      else { ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(22, 5); ctx.lineTo(27, 10); ctx.lineTo(24, 14); ctx.lineTo(23, 27); ctx.lineTo(9, 27); ctx.lineTo(8, 14); ctx.lineTo(5, 10); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke(); break;
    }
    case 'shield': ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(26, 5); ctx.lineTo(26, 16); ctx.quadraticCurveTo(16, 30, 6, 16); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d0b050'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#d0b050'; ctx.fillRect(15, 7, 2, 16); break;
    case 'gloves': ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(9, 10, 13, 16, 3); ctx.fill(); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(9 + i * 3.3, 4 + Math.abs(i - 1.5), 3, 9, 1.5); ctx.fill(); } ctx.beginPath(); ctx.roundRect(21, 14, 6, 4, 2); ctx.fill(); break;
    case 'boots': ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(18, 4); ctx.lineTo(18, 20); ctx.lineTo(27, 23); ctx.lineTo(27, 28); ctx.lineTo(10, 28); ctx.closePath(); ctx.fill(); ctx.fillStyle = shade(c, -0.4); ctx.fillRect(10, 26, 17, 2); break;
    case 'belt': ctx.fillStyle = c; ctx.fillRect(3, 13, 26, 7); ctx.fillStyle = '#d0b050'; ctx.strokeStyle = '#d0b050'; ctx.lineWidth = 2; ctx.strokeRect(13, 12, 7, 9); break;
    case 'ring': { ctx.strokeStyle = '#d8b040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(16, 19, 8, 7, 0, 0, 7); ctx.stroke(); const gem = { ring_str: '#e03030', ring_dex: '#30c060', ring_int: '#4070ff', ring_fire: '#ff8020', ring_guard: '#c0c8d0' }[id] || '#fff'; ctx.fillStyle = gem; ctx.shadowColor = gem; ctx.shadowBlur = 5; ctx.beginPath(); ctx.moveTo(16, 5); ctx.lineTo(20, 10); ctx.lineTo(16, 14); ctx.lineTo(12, 10); ctx.fill(); break; }
    case 'amulet': { ctx.strokeStyle = '#d8b040'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(16, 8, 10, 0.2, Math.PI - 0.2); ctx.stroke(); const gem = { amulet_wis: '#6080ff', amulet_guard: '#e0e0f0', amulet_earth: '#60a040' }[id] || '#fff'; ctx.fillStyle = '#d8b040'; ctx.beginPath(); ctx.arc(16, 21, 6, 0, 7); ctx.fill(); ctx.fillStyle = gem; ctx.beginPath(); ctx.arc(16, 21, 4, 0, 7); ctx.fill(); break; }
    case 'jerky':
      ctx.fillStyle = '#7a3a1a'; ctx.beginPath(); ctx.moveTo(6, 20); ctx.quadraticCurveTo(10, 8, 22, 7); ctx.quadraticCurveTo(28, 12, 24, 20); ctx.quadraticCurveTo(14, 28, 6, 20); ctx.fill();
      ctx.strokeStyle = '#a85a30'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 4, 18); ctx.lineTo(14 + i * 4, 11); ctx.stroke(); }
      break;
    case 'collar':
      ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(16, 15, 10, 7, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = '#d8b040'; ctx.beginPath(); ctx.arc(16, 24, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#c0c8d0'; for (const a of [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]) ctx.fillRect(16 + Math.cos(a) * 10 - 1, 15 + Math.sin(a) * 7 - 1, 2, 2);
      break;
    case 'gold':
      for (const [a, b] of [[12, 20], [20, 21], [16, 15]]) { ctx.fillStyle = '#a07a10'; ctx.beginPath(); ctx.ellipse(a, b + 1, 6, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#f2cc40'; ctx.beginPath(); ctx.ellipse(a, b, 6, 3.5, 0, 0, 7); ctx.fill(); }
      break;
    default: { // 戰利品
      const gr = ctx.createRadialGradient(13, 12, 1, 16, 16, 12); gr.addColorStop(0, shade(c.startsWith('#') ? c : '#a08060', 0.4)); gr.addColorStop(1, c.startsWith('#') ? shade(c, -0.3) : c);
      ctx.fillStyle = gr;
      if (/scale|gem|core/.test(id)) { ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(27, 14); ctx.lineTo(16, 28); ctx.lineTo(5, 14); ctx.closePath(); ctx.fill(); }
      else if (/fang|tooth|claw|tail/.test(id)) { ctx.beginPath(); ctx.moveTo(10, 6); ctx.quadraticCurveTo(26, 10, 20, 28); ctx.quadraticCurveTo(14, 16, 10, 6); ctx.fill(); }
      else if (/bone/.test(id)) { ctx.strokeStyle = '#e8e3d0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(8, 24); ctx.lineTo(24, 8); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(6, 10); ctx.lineTo(24, 6); ctx.lineTo(27, 22); ctx.lineTo(9, 27); ctx.closePath(); ctx.fill(); }
    }
  }
  if (it.rare) { ctx.strokeStyle = 'rgba(200,160,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(1, 1, 30, 30); }
  ctx.restore();
}

// ===== 魔法圖示 =====
function drawSkillIcon(ctx, id, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32);
  const glow = (c, b = 6) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
  switch (id) {
    case 'heal': case 'heal2': case 'heal3': {
      const col = { heal: '#f4f8ff', heal2: '#c8ffd0', heal3: '#fff2a0' }[id];
      ctx.fillStyle = col; glow('#9fd8ff'); ctx.fillRect(12, 5, 8, 22); ctx.fillRect(5, 12, 22, 8);
      if (id !== 'heal') { ctx.shadowBlur = 0; ctx.fillStyle = '#4a8a4a'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(id === 'heal2' ? 'II' : 'III', 21, 30); }
      break;
    }
    case 'light': glow('#fff6a0', 10); ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(5, 27); ctx.lineTo(27, 5); ctx.stroke(); ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.moveTo(28, 4); ctx.lineTo(20, 7); ctx.lineTo(25, 12); ctx.fill(); break;
    case 'shield': ctx.fillStyle = '#7ab0e8'; glow('#bfe0ff'); ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(27, 8); ctx.quadraticCurveTo(27, 22, 16, 29); ctx.quadraticCurveTo(5, 22, 5, 8); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#e8f4ff'; ctx.fillRect(14.5, 9, 3, 14); ctx.fillRect(10, 13, 12, 3); break;
    case 'strike': glow('#ff8040'); ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(10, 22, 16, -1.4, -0.2); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(22, 4); ctx.lineTo(28, 10); ctx.lineTo(12, 26); ctx.lineTo(8, 24); ctx.closePath(); ctx.fill(); break;
    case 'glow': { const gr = ctx.createRadialGradient(16, 16, 1, 16, 16, 14); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#ffe8a0'); gr.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(16, 16, 14, 0, 7); ctx.fill(); break; }
    case 'ice': glow('#a0e0ff'); ctx.fillStyle = '#d8f4ff'; ctx.beginPath(); ctx.moveTo(4, 28); ctx.lineTo(26, 4); ctx.lineTo(28, 8); ctx.lineTo(8, 28); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#7ac8f0'; ctx.beginPath(); ctx.moveTo(28, 3); ctx.lineTo(20, 6); ctx.lineTo(26, 12); ctx.fill(); break;
    case 'holy': glow('#ffe070', 8); ctx.strokeStyle = '#ffeaa0'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(8 + i * 6, 26); ctx.lineTo(16 + i * 6, 6); ctx.stroke(); } break;
    case 'wind': glow('#a0ffc0'); ctx.strokeStyle = '#c8ffd8'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(4, 10 + i * 7); ctx.quadraticCurveTo(16, 4 + i * 7, 28, 10 + i * 7); ctx.stroke(); } break;
    case 'bolt': glow('#a0c0ff', 10); ctx.fillStyle = '#f0f4ff'; ctx.beginPath(); ctx.moveTo(18, 2); ctx.lineTo(8, 18); ctx.lineTo(15, 18); ctx.lineTo(11, 30); ctx.lineTo(24, 12); ctx.lineTo(17, 12); ctx.closePath(); ctx.fill(); break;
    case 'haste': ctx.strokeStyle = '#8ef08a'; glow('#8ef08a'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, 8); ctx.lineTo(15, 16); ctx.lineTo(6, 24); ctx.moveTo(15, 8); ctx.lineTo(24, 16); ctx.lineTo(15, 24); ctx.stroke(); break;
    case 'earth': ctx.fillStyle = '#a07840'; glow('#d0a060'); ctx.beginPath(); ctx.moveTo(4, 26); ctx.lineTo(10, 12); ctx.lineTo(16, 18); ctx.lineTo(22, 6); ctx.lineTo(28, 26); ctx.closePath(); ctx.fill(); break;
    case 'fire': { const gr = ctx.createRadialGradient(16, 18, 1, 16, 18, 13); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.4, '#ff9a20'); gr.addColorStop(1, '#a01800'); ctx.fillStyle = gr; glow('#ff6020', 8); ctx.beginPath(); ctx.arc(16, 18, 11, 0, 7); ctx.fill(); break; }
    case 'bless': ctx.fillStyle = '#d0d8ff'; glow('#ffffff', 8); ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(22, 5); ctx.lineTo(27, 10); ctx.lineTo(23, 27); ctx.lineTo(9, 27); ctx.lineTo(5, 10); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.arc(16, 15, 4, 0, 7); ctx.fill(); break;
    case 'turn': glow('#fff6c0', 10); ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(16 + Math.cos(a) * 5, 16 + Math.sin(a) * 5); ctx.lineTo(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13); ctx.stroke(); } ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(16, 16, 4, 0, 7); ctx.fill(); break;
    case 'meteor': for (const [a, b, r] of [[22, 8, 5], [12, 14, 4], [20, 22, 6]]) { const gr = ctx.createRadialGradient(a, b, 1, a, b, r); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(1, '#d03000'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,140,40,0.6)'; ctx.lineWidth = r * 0.8; ctx.beginPath(); ctx.moveTo(a - r * 0.6, b - r * 0.6); ctx.lineTo(a - r * 2.4, b - r * 2.4); ctx.stroke(); } break;
    case 'sanct': ctx.strokeStyle = '#fff2b0'; glow('#ffe070', 10); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(16, 9, 9, 3, 0, 0, 7); ctx.stroke(); ctx.fillStyle = '#fff8e0'; ctx.fillRect(14, 13, 4, 15); ctx.fillRect(9, 17, 14, 3); break;
    case 'fring': { glow('#ff7020', 8); ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(16, 18, 12, 8, 0, 0, 7); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i * 1.05; const x = 16 + Math.cos(a) * 12, y = 18 + Math.sin(a) * 8; ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.quadraticCurveTo(x, y - 9, x + 2, y); ctx.fill(); } break; }
    case 'whirl': glow('#c0d0ff', 6); ctx.strokeStyle = '#e8eeff'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(16, 16, 5 + i * 4, i * 2, i * 2 + 4); ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.fillRect(15, 4, 2, 10); break;
    case 'hlight': glow('#fff0a0', 10); ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.moveTo(12, 3); ctx.lineTo(20, 3); ctx.lineTo(24, 24); ctx.lineTo(8, 24); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffe080'; ctx.beginPath(); ctx.ellipse(16, 25, 12, 4, 0, 0, 7); ctx.fill(); break;
    case 'arrows': ctx.strokeStyle = '#e0d0a8'; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const x = 6 + i * 5; ctx.beginPath(); ctx.moveTo(x - 3, 4); ctx.lineTo(x + 3, 24); ctx.stroke(); ctx.fillStyle = '#c0c8d0'; ctx.beginPath(); ctx.moveTo(x + 4, 28); ctx.lineTo(x + 1, 22); ctx.lineTo(x + 5, 22); ctx.fill(); } break;
    case 'frost': glow('#a0e0ff', 8); ctx.strokeStyle = '#e0f6ff'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(16, 16); ctx.lineTo(16 + Math.cos(a) * 12, 16 + Math.sin(a) * 12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(16 + Math.cos(a) * 7, 16 + Math.sin(a) * 7); ctx.lineTo(16 + Math.cos(a + 0.5) * 10, 16 + Math.sin(a + 0.5) * 10); ctx.stroke(); } break;
    case 'blink': glow('#c0a0ff', 8); ctx.strokeStyle = '#d8c8ff'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(6, 24); ctx.quadraticCurveTo(16, 2, 26, 12); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(26, 12, 4, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(200,180,255,0.6)'; ctx.beginPath(); ctx.arc(6, 24, 4, 0, 7); ctx.fill(); break;
    case 'warcry': glow('#ffc060', 6); ctx.fillStyle = '#e8c080'; ctx.beginPath(); ctx.arc(11, 16, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffd890'; ctx.lineWidth = 2; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(14, 16, 5 + i * 4, -0.7, 0.7); ctx.stroke(); } break;
    case 'poison': glow('#80ff60', 8); for (const [x, y, r] of [[12, 18, 7], [20, 15, 6], [17, 22, 6]]) { ctx.fillStyle = 'rgba(130,220,80,0.85)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } ctx.fillStyle = '#1a3a10'; ctx.fillRect(13, 15, 2, 2); ctx.fillRect(18, 15, 2, 2); break;
    case 'might': glow('#ff9050', 8); ctx.fillStyle = '#ffb080'; ctx.beginPath(); ctx.moveTo(8, 26); ctx.lineTo(8, 14); ctx.quadraticCurveTo(10, 6, 16, 8); ctx.lineTo(22, 6); ctx.quadraticCurveTo(26, 10, 24, 16); ctx.lineTo(24, 26); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a04020'; ctx.fillRect(12, 16, 8, 2); break;
    case 'trueshot': glow('#fff2a0', 10); ctx.strokeStyle = '#fff2c0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(3, 29); ctx.lineTo(25, 7); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(29, 3); ctx.lineTo(21, 7); ctx.lineTo(25, 11); ctx.fill(); ctx.strokeStyle = '#ff6040'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(22, 10, 7, 0, 7); ctx.stroke(); break;
    case 'chain': glow('#a0c0ff', 10); ctx.strokeStyle = '#f0f4ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(12, 14); ctx.lineTo(9, 18); ctx.lineTo(20, 22); ctx.lineTo(17, 26); ctx.lineTo(28, 28); ctx.stroke(); for (const [x, y] of [[4, 6], [20, 22], [28, 28]]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); } break;
    case 'gheal': glow('#a0ffb0', 8); ctx.fillStyle = '#d8ffe0'; for (const [x, y, s] of [[16, 10, 1], [8, 21, 0.7], [24, 21, 0.7]]) { ctx.fillRect(x - 2.5 * s, y - 7 * s, 5 * s, 14 * s); ctx.fillRect(x - 7 * s, y - 2.5 * s, 14 * s, 5 * s); } break;
    case 'blizz': glow('#c0e8ff', 8); ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.ellipse(16, 10, 12, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(7 + i * 4.5, 17); ctx.lineTo(4 + i * 4.5, 28); ctx.stroke(); } break;
    case 'fireres': glow('#ff7020', 8); ctx.fillStyle = '#4a6a9a'; ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(27, 8); ctx.quadraticCurveTo(27, 22, 16, 29); ctx.quadraticCurveTo(5, 22, 5, 8); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#ff8a30'; ctx.beginPath(); ctx.moveTo(16, 9); ctx.quadraticCurveTo(22, 15, 19, 22); ctx.quadraticCurveTo(16, 25, 13, 22); ctx.quadraticCurveTo(10, 15, 16, 9); ctx.fill(); break;
    case 'expboost': glow('#a0ff80', 8); ctx.fillStyle = '#d8ffb0'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#3a6a20'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('XP', 10, 19); break;
    case 'charm': glow('#ff80d0', 8); ctx.fillStyle = '#ff9ad8'; ctx.beginPath(); ctx.moveTo(16, 27); ctx.bezierCurveTo(2, 17, 6, 5, 16, 11); ctx.bezierCurveTo(26, 5, 30, 17, 16, 27); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(16, 16, 3, 0, 5); ctx.stroke(); break;
    case 'swolf': glow('#80c0ff', 8); ctx.fillStyle = '#b8dcff'; ctx.beginPath(); ctx.moveTo(6, 22); ctx.lineTo(10, 8); ctx.lineTo(14, 14); ctx.lineTo(20, 14); ctx.lineTo(24, 8); ctx.lineTo(27, 22); ctx.lineTo(16, 28); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#1a3a6a'; ctx.fillRect(11, 17, 3, 2); ctx.fillRect(19, 17, 3, 2); break;
    case 'sgolem': glow('#80c0ff', 6); ctx.fillStyle = '#8a847a'; ctx.fillRect(8, 8, 16, 18); ctx.fillRect(4, 11, 5, 12); ctx.fillRect(23, 11, 5, 12); ctx.fillStyle = '#7ad0ff'; ctx.fillRect(12, 12, 3, 2); ctx.fillRect(17, 12, 3, 2); ctx.fillRect(14, 18, 4, 4); break;
    case 'sfire': { const gr = ctx.createRadialGradient(16, 20, 1, 16, 18, 14); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.5, '#ff8a20'); gr.addColorStop(1, '#a01800'); ctx.fillStyle = gr; glow('#ff6020', 8); ctx.beginPath(); ctx.moveTo(16, 3); ctx.quadraticCurveTo(28, 14, 24, 24); ctx.quadraticCurveTo(16, 31, 8, 24); ctx.quadraticCurveTo(4, 14, 16, 3); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#3a0a00'; ctx.fillRect(12, 17, 2.5, 2.5); ctx.fillRect(18, 17, 2.5, 2.5); break; }
    case 'load': {
      // 羽毛與秤錘：負重強化
      ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.moveTo(9, 26); ctx.lineTo(23, 26); ctx.lineTo(20, 17); ctx.lineTo(12, 17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a7a6a'; ctx.fillRect(14, 13, 4, 4);
      glow('#ffffff', 6); ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, 14); ctx.quadraticCurveTo(14, 2, 27, 4); ctx.stroke();
      ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.moveTo(27, 4); ctx.quadraticCurveTo(18, 6, 12, 12); ctx.quadraticCurveTo(20, 10, 27, 4); ctx.fill();
      break;
    }
    case 'auto':
      ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(16, 16, 9, 0.3, Math.PI * 1.7); ctx.stroke();
      ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.moveTo(25, 6); ctx.lineTo(26, 14); ctx.lineTo(18, 11); ctx.fill();
      ctx.beginPath(); ctx.moveTo(13, 11); ctx.lineTo(21, 16); ctx.lineTo(13, 21); ctx.closePath(); ctx.fill(); break;
    default:
      // 高階魔法：「rune:字:顏色」符文圖示
      if (typeof id === 'string' && id.startsWith('rune:')) {
        const [, ch, col] = id.split(':');
        const gr = ctx.createRadialGradient(16, 14, 2, 16, 16, 15);
        gr.addColorStop(0, shade(col, 0.35)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, -0.6));
        glow(col, 8); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(16, 16, 13, 0, 7); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,240,200,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(16, 16, 13, 0, 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(16, 16, 10, 0, 7); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.fillStyle = 'rgba(255,250,220,0.85)'; ctx.fillRect(16 + Math.cos(a) * 11.5 - 0.7, 16 + Math.sin(a) * 11.5 - 0.7, 1.4, 1.4); }
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px "Microsoft JhengHei", "PingFang TC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(ch, 16, 17); ctx.fillText(ch, 16, 17);
      }
  }
  ctx.restore();
}

// 血盟徽章
const EMBLEM_SHAPES = ['shield', 'star', 'cross', 'moon', 'crown', 'sword', 'tree', 'flame'];
function drawEmblem(ctx, em, x, y, s) {
  if (!em) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 16, s / 16);
  ctx.fillStyle = '#1a1612'; ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = em.bg || '#3a2a1a'; ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = em.color || '#ffd040'; ctx.strokeStyle = em.color || '#ffd040'; ctx.lineWidth = 1.6;
  switch (em.shape) {
    case 'shield': ctx.beginPath(); ctx.moveTo(4, 3); ctx.lineTo(12, 3); ctx.lineTo(12, 8); ctx.quadraticCurveTo(8, 14, 4, 8); ctx.closePath(); ctx.fill(); break;
    case 'star': ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.4 : 6, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(8 + Math.cos(a) * r, 8.5 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); break;
    case 'cross': ctx.fillRect(6.5, 2.5, 3, 11); ctx.fillRect(3.5, 5.5, 9, 3); break;
    case 'moon': ctx.beginPath(); ctx.arc(8, 8, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = em.bg || '#3a2a1a'; ctx.beginPath(); ctx.arc(10.5, 6.5, 4.5, 0, 7); ctx.fill(); break;
    case 'crown': ctx.beginPath(); ctx.moveTo(3, 12); ctx.lineTo(3, 5); ctx.lineTo(5.5, 8); ctx.lineTo(8, 3.5); ctx.lineTo(10.5, 8); ctx.lineTo(13, 5); ctx.lineTo(13, 12); ctx.closePath(); ctx.fill(); break;
    case 'sword': ctx.fillRect(7.2, 2, 1.6, 10); ctx.fillRect(4.5, 10, 7, 1.6); ctx.fillRect(7, 11.5, 2, 3); break;
    case 'tree': ctx.beginPath(); ctx.moveTo(8, 2.5); ctx.lineTo(13, 10); ctx.lineTo(3, 10); ctx.closePath(); ctx.fill(); ctx.fillRect(7, 10, 2, 4); break;
    case 'flame': ctx.beginPath(); ctx.moveTo(8, 2); ctx.quadraticCurveTo(14, 8, 11, 13); ctx.quadraticCurveTo(8, 15, 5, 13); ctx.quadraticCurveTo(2, 8, 8, 2); ctx.fill(); break;
  }
  ctx.restore();
}

// ===== 寵物與召喚獸（原創）=====
function petFlip(o) { return screenFacing(o.dir).sx < 0; }
function drawFox(ctx, x, y, o) {
  ctx.save(); ctx.translate(x, y); ctx.scale(petFlip(o) ? -0.9 : 0.9, 0.9);
  const sw = o.moving ? Math.sin(o.walk * 1.6) * 0.6 : 0;
  const c = o.color || '#eef2f6', dk = o.color ? shade(o.color, -0.25) : '#b8c4d0';
  // 大尾巴（焰狐的尾巴尖端是火焰）
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(-28, -26 + sw * 4, -24, -10); ctx.quadraticCurveTo(-20, -4, -10, -9); ctx.fill();
  if (o.color) { const fl = 1 + Math.sin((o.t || 0) * 14) * 0.25; ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.ellipse(-25, -22 + sw * 3, 4 * fl, 6 * fl, 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(-25, -21 + sw * 3, 2, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-25, -20 + sw * 3, 3.5, 0, 7); ctx.fill(); }
  for (const [lx, a, col] of [[-7, sw, dk], [6, -sw, dk], [-5, -sw, c], [8, sw, c]]) limb(ctx, lx, -9, 9, 2.6, a, col);
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -12, 11, 5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11, -17, 5, 4.5, -0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(13, -19); ctx.lineTo(21, -15); ctx.lineTo(13, -13); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7, -20); ctx.lineTo(8, -28); ctx.lineTo(12, -21); ctx.fill(); ctx.beginPath(); ctx.moveTo(11, -21); ctx.lineTo(14, -28); ctx.lineTo(15, -20); ctx.fill();
  ctx.fillStyle = '#2a3a5a'; ctx.fillRect(13, -19, 2, 2); ctx.fillStyle = '#222'; ctx.fillRect(20, -16, 2, 2);
  ctx.fillStyle = '#c03030'; ctx.fillRect(6, -15, 6, 2);
  ctx.restore();
}
function drawBear(ctx, x, y, o) {
  ctx.save(); ctx.translate(x, y); ctx.scale(petFlip(o) ? -1.15 : 1.15, 1.15);
  const sw = o.moving ? Math.sin(o.walk * 1.1) * 0.45 : 0;
  const lunge = o.atk >= 0 ? Math.sin(o.atk * Math.PI) * 4 : 0;
  ctx.translate(lunge, 0);
  const c = '#6a4a30', dk = '#4a3020';
  for (const [lx, a, col] of [[-9, sw, dk], [7, -sw, dk], [-6, -sw, c], [10, sw, c]]) limb(ctx, lx, -11, 11, 5, a, col);
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -17, 15, 9, 0, 0, 7); ctx.fill();
  // 皮甲背心
  ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.ellipse(-1, -20, 10, 6, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#c0a050'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(8, -20); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(14, -22, 7, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(20, -20, 4, 3, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -28, 2.5, 0, 7); ctx.arc(16, -29, 2.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1010'; ctx.fillRect(15, -24, 2, 2); ctx.fillRect(22, -21, 2, 2);
  ctx.restore();
}
function drawOwl(ctx, x, y, o) {
  const hover = 26 + Math.sin(o.t * 3) * 3;
  drawShadow(ctx, x, y, 8, 3, 0.25);
  ctx.save(); ctx.translate(x, y - hover); ctx.scale(petFlip(o) ? -1 : 1, 1);
  const flap = Math.sin(o.t * 12);
  const oc = o.color, wing = oc ? shade(oc, -0.35) : '#4a3a5a', body = oc ? shade(oc, -0.1) : '#6a5a7a', belly = oc ? shade(oc, 0.35) : '#c8b8d8';
  ctx.fillStyle = wing;
  ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(-16, -14 - flap * 8); ctx.lineTo(-10, -2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(14, -16 - flap * 8); ctx.lineTo(9, -2); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -6, 7, 9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(1, -3, 4, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(-6, -19); ctx.lineTo(-2, -15); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, -15); ctx.lineTo(7, -19); ctx.lineTo(6, -13); ctx.fill();
  ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(-1, -11, 2.2, 0, 7); ctx.arc(4, -11, 2.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(-1.5, -11.5, 1.2, 1.2); ctx.fillRect(3.5, -11.5, 1.2, 1.2);
  ctx.fillStyle = '#e0a030'; ctx.beginPath(); ctx.moveTo(1, -9); ctx.lineTo(3, -9); ctx.lineTo(2, -6.5); ctx.fill();
  ctx.restore();
  return hover;
}
function drawBoar(ctx, x, y, o) {
  ctx.save(); ctx.translate(x, y); ctx.scale(petFlip(o) ? -1 : 1, 1);
  const sw = o.moving ? Math.sin(o.walk * 1.5) * 0.5 : 0;
  const lunge = o.atk >= 0 ? Math.sin(o.atk * Math.PI) * 6 : 0;
  ctx.translate(lunge, 0);
  const c = '#7a5a4a', dk = '#5a3e30';
  for (const [lx, a, col] of [[-8, sw, dk], [6, -sw, dk], [-5, -sw, c], [9, sw, c]]) limb(ctx, lx, -8, 8, 3.4, a, col);
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -13, 13, 7, 0, 0, 7); ctx.fill();
  // 背刺
  ctx.fillStyle = '#d8d0c0';
  for (let i = 0; i < 6; i++) { const bx = -10 + i * 4; ctx.beginPath(); ctx.moveTo(bx - 2, -18); ctx.lineTo(bx, -27 + Math.abs(i - 2.5)); ctx.lineTo(bx + 2, -18); ctx.fill(); }
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(12, -12, 6, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#c89a8a'; ctx.beginPath(); ctx.ellipse(17, -11, 3, 2.6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#f0ead8'; ctx.beginPath(); ctx.moveTo(15, -9); ctx.lineTo(19, -15); ctx.lineTo(16, -8); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(12, -15, 1.8, 1.8);
  ctx.restore();
}
function drawFireElemental(ctx, x, y, o) {
  const hover = 8 + Math.sin(o.t * 4) * 2;
  ctx.save(); ctx.translate(x, y - hover);
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(0, -20, 2, 0, -20, 34);
  gl.addColorStop(0, 'rgba(255,180,60,0.55)'); gl.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -20, 34, 0, 7); ctx.fill();
  for (let i = 0; i < 9; i++) {
    const ph = o.t * 7 + i * 1.3, fx = Math.sin(ph) * 6 + (i - 4) * 2.5, fh = 34 + Math.sin(ph * 1.4) * 8 + (4 - Math.abs(i - 4)) * 5;
    const gr = ctx.createLinearGradient(fx, 0, fx, -fh);
    gr.addColorStop(0, 'rgba(255,220,90,0.9)'); gr.addColorStop(0.5, 'rgba(255,110,20,0.7)'); gr.addColorStop(1, 'rgba(200,30,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(fx - 6, 0); ctx.quadraticCurveTo(fx, -fh * 1.2, fx + 6, 0); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#3a0a00'; ctx.fillRect(-5, -30, 3, 3); ctx.fillRect(3, -30, 3, 3);
  ctx.restore();
  return hover;
}

// ===== 熾焰火山 =====
function drawSlime(ctx, x, y, o) {
  const squash = o.moving ? Math.abs(Math.sin(o.walk * 1.2)) : (Math.sin(o.t * 3) + 1) / 2 * 0.4;
  const atk = o.atk >= 0 ? Math.sin(o.atk * Math.PI) : 0;
  const w = 18 + squash * 4 + atk * 4, h = 16 - squash * 4 + atk * 6;
  drawShadow(ctx, x, y, 18, 6);
  ctx.save(); ctx.translate(x, y);
  const gr = ctx.createRadialGradient(-4, -h, 2, 0, -h * 0.6, w);
  gr.addColorStop(0, '#fff0a0'); gr.addColorStop(0.35, '#ff8a20'); gr.addColorStop(1, '#8a1a04');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w, -h * 2, 0, -h * 2); ctx.quadraticCurveTo(w, -h * 2, w, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,10,0,0.6)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-w * 0.6 + i * w * 0.5, -3); ctx.lineTo(-w * 0.4 + i * w * 0.5, -h * 1.1); ctx.stroke(); }
  const f = screenFacing(o.dir), ex = f.sx < 0 ? -4 : 4;
  ctx.fillStyle = '#2a0800'; ctx.beginPath(); ctx.arc(ex - 4, -h * 1.3, 2.2, 0, 7); ctx.arc(ex + 4, -h * 1.3, 2.2, 0, 7); ctx.fill();
  ctx.restore();
}
// 炎皇火龍（原創設計）
function drawFireDragon(ctx, x, y, o) {
  const f = screenFacing(o.dir), flip = f.sx < 0;
  const t = o.t, breath = o.breath > 0;
  drawShadow(ctx, x, y + 4, 110, 34, 0.4);
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -2.1 : 2.1, 2.1);
  const body = '#6a1a10', dark = '#3a0c08', belly = '#e8702a', horn = '#d8c8a8';
  const flap = Math.sin(t * 1.6) * (o.moving ? 1 : 0.4);
  const atk = o.atk >= 0 ? Math.sin(o.atk * Math.PI) : 0;
  const walk = o.moving ? Math.sin(o.walk * 0.8) : 0;
  // 尾巴
  ctx.strokeStyle = dark; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const t0 = i / 6, t1 = (i + 1) / 6;
    ctx.lineWidth = 10 - i * 1.4;
    const tx = (k) => -18 - k * 34, ty = (k) => -10 + Math.sin(k * 3 + t * 1.5) * 6 + k * 10;
    ctx.beginPath(); ctx.moveTo(tx(t0), ty(t0)); ctx.lineTo(tx(t1), ty(t1)); ctx.stroke();
  }
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-52, 0); ctx.lineTo(-60, -6); ctx.lineTo(-58, 6); ctx.fill();
  // 後翼
  ctx.fillStyle = '#4a1008';
  ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(-22, -66 - flap * 12); ctx.lineTo(-52, -58 - flap * 14); ctx.lineTo(-44, -40 - flap * 6); ctx.lineTo(-20, -28); ctx.closePath(); ctx.fill();
  // 後腳
  const leg = (lx, ph, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(lx - 5, -16); ctx.lineTo(lx + 5, -16); ctx.lineTo(lx + 4 + ph * 3, 0); ctx.lineTo(lx - 6 + ph * 3, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = horn; ctx.fillRect(lx - 6 + ph * 3, -1, 2, 2); ctx.fillRect(lx + 2 + ph * 3, -1, 2, 2); };
  leg(-12, -walk, dark); leg(14, walk, dark);
  // 身體
  const gr = ctx.createLinearGradient(0, -44, 0, -10); gr.addColorStop(0, shade(body, 0.15)); gr.addColorStop(1, dark);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -26, 28, 15, -0.08, 0, 7); ctx.fill();
  // 背刺
  ctx.fillStyle = dark;
  for (let i = 0; i < 6; i++) { const bx = -20 + i * 8; ctx.beginPath(); ctx.moveTo(bx - 3, -38 + Math.abs(i - 3)); ctx.lineTo(bx, -48 + Math.abs(i - 2.5) * 1.5); ctx.lineTo(bx + 3, -38 + Math.abs(i - 3)); ctx.fill(); }
  // 發光的腹部裂紋
  const pulse = 0.6 + Math.sin(t * 3) * 0.25 + (breath ? 0.4 : 0);
  ctx.fillStyle = 'rgba(232,112,42,' + pulse + ')'; ctx.beginPath(); ctx.ellipse(4, -17, 18, 5, -0.08, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,90,' + pulse + ')'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 7, -14); ctx.lineTo(-11 + i * 7, -21); ctx.stroke(); }
  leg(-6, walk, body); leg(20, -walk, body);
  // 脖子與頭
  const nx = 22 + atk * 6, ny = -34 - atk * 2;
  ctx.strokeStyle = body; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(18, -30); ctx.quadraticCurveTo(30, -50, 38 + atk * 8, -58 + atk * 10); ctx.stroke();
  const hx = 42 + atk * 8, hy = -60 + atk * 10;
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(hx, hy, 11, 8, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 6, hy - 4); ctx.lineTo(hx + 22, hy + (breath ? 0 : 3)); ctx.lineTo(hx + 6, hy + 5); ctx.closePath(); ctx.fill();
  if (breath) { ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(hx + 6, hy + 4); ctx.lineTo(hx + 20, hy + 10); ctx.lineTo(hx + 6, hy + 8); ctx.fill();
    const fg = ctx.createRadialGradient(hx + 20, hy + 5, 1, hx + 20, hy + 5, 14); fg.addColorStop(0, '#fff6c0'); fg.addColorStop(0.5, '#ff8a20'); fg.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(hx + 20, hy + 5, 14, 0, 7); ctx.fill(); }
  ctx.fillStyle = horn;
  ctx.beginPath(); ctx.moveTo(hx - 6, hy - 5); ctx.quadraticCurveTo(hx - 18, hy - 18, hx - 22, hy - 10); ctx.lineTo(hx - 8, hy - 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - 2, hy - 7); ctx.quadraticCurveTo(hx - 8, hy - 22, hx - 14, hy - 20); ctx.lineTo(hx + 1, hy - 5); ctx.fill();
  ctx.fillStyle = '#ffe060'; ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.ellipse(hx + 4, hy - 2, 2.5, 1.5, 0.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  // 前翼
  const wg = ctx.createLinearGradient(0, -100, 0, -20); wg.addColorStop(0, '#8a2a14'); wg.addColorStop(1, '#4a1008');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.moveTo(4, -34);
  ctx.lineTo(-4, -82 - flap * 16); ctx.lineTo(-46, -92 - flap * 18);
  ctx.quadraticCurveTo(-40, -70 - flap * 10, -54, -58 - flap * 8);
  ctx.quadraticCurveTo(-34, -52 - flap * 4, -30, -38);
  ctx.quadraticCurveTo(-12, -38, 4, -26); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a0804'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(4, -34); ctx.lineTo(-4, -82 - flap * 16); ctx.lineTo(-46, -92 - flap * 18); ctx.moveTo(-4, -82 - flap * 16); ctx.lineTo(-54, -58 - flap * 8); ctx.moveTo(-4, -82 - flap * 16); ctx.lineTo(-30, -38); ctx.stroke();
  ctx.restore();
}

// 光之精靈：發光的小光球與透明的翅膀
function drawWisp(ctx, x, y, o) {
  const hover = 24 + Math.sin(o.t * 3.4) * 4;
  drawShadow(ctx, x, y, 7, 3, 0.2);
  ctx.save(); ctx.translate(x, y - hover);
  const gl = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
  gl.addColorStop(0, 'rgba(255,250,210,0.95)'); gl.addColorStop(0.35, 'rgba(255,236,150,0.6)'); gl.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill();
  const flap = Math.sin(o.t * 16) * 0.5;
  ctx.fillStyle = 'rgba(220,240,255,0.55)';
  for (const s of [-1, 1]) { ctx.save(); ctx.scale(s, 1); ctx.rotate(-0.4 + flap * 0.4); ctx.beginPath(); ctx.ellipse(8, -4, 8, 3.5, -0.5, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#6a5a3a'; ctx.fillRect(-2.5, -1.5, 1.5, 1.5); ctx.fillRect(1, -1.5, 1.5, 1.5);
  ctx.restore();
  return hover;
}

// ===== 魔法圖示（v2.15 重新設計）=====
// 依魔法系別使用不同顏色的寶石底與邊框，中間是魔法的圖騰，右下角標示階級。
const SPELL_SCHOOLS = {
  fire:   { a: '#ff9a40', b: '#a82a08', c: '#3a0a02', rim: '#ffb060', name: '火' },
  frost:  { a: '#a8e4ff', b: '#2a70c0', c: '#0a1e40', rim: '#9ad8ff', name: '冰' },
  storm:  { a: '#fff08a', b: '#b08a10', c: '#2e2404', rim: '#ffe070', name: '雷' },
  wind:   { a: '#b0ffb8', b: '#2a9a50', c: '#08301a', rim: '#90f0a0', name: '風' },
  holy:   { a: '#fffbe0', b: '#d0a830', c: '#3a2c08', rim: '#ffe8a0', name: '聖' },
  earth:  { a: '#f0d0a0', b: '#8a5a28', c: '#2a1a08', rim: '#e0b070', name: '地' },
  arcane: { a: '#e4b8ff', b: '#7030c0', c: '#1e0838', rim: '#d0a0ff', name: '秘' },
  war:    { a: '#ffb0a0', b: '#9a2a20', c: '#2e0806', rim: '#ff9080', name: '武' },
};
const SPELL_SCHOOL_OF = {};
for (const [sc, ids] of Object.entries({
  fire: ['flamering', 'fireball', 'meteor', 'firestorm', 'armageddon', 'summon_fire'],
  frost: ['icebolt', 'frostnova', 'blizzard', 'timestop'],
  storm: ['lightning', 'chainlightning', 'thunderstorm'],
  wind: ['windshot', 'haste', 'blink', 'eagleeye'],
  holy: ['heal1', 'heal2', 'heal3', 'groupheal', 'greaterheal', 'holy', 'holylight', 'turnundead', 'sanctuary', 'holyjudgment', 'holyfield', 'miracle', 'divineshield', 'blessarmor', 'glow', 'lightbolt'],
  earth: ['shield', 'earthskin', 'earthquake', 'loadup', 'summon_golem'],
  arcane: ['poison', 'deathcloud', 'charm', 'summon_wolf', 'manashield'],
  war: ['powerstrike', 'whirlwind', 'warcry', 'might', 'berserk', 'arrowrain', 'trueshot', 'arrowstorm'],
})) for (const id of ids) SPELL_SCHOOL_OF[id] = sc;
function drawSpellIcon(ctx, id, x, y, s) {
  const sp = SPELLS[id]; if (!sp) { drawSkillIcon(ctx, id, x, y, s); return; }
  const S = SPELL_SCHOOLS[SPELL_SCHOOL_OF[id] || 'arcane'];
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32);
  const rr = (x0, y0, w, h, r) => { ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r); ctx.arcTo(x0, y0 + h, x0, y0, r); ctx.arcTo(x0, y0, x0 + w, y0, r); ctx.closePath(); };
  // 外框（金屬）
  const fr = ctx.createLinearGradient(0, 0, 32, 32); fr.addColorStop(0, '#e8d4a0'); fr.addColorStop(0.5, '#7a6038'); fr.addColorStop(1, '#3a2a14');
  ctx.fillStyle = fr; rr(0.5, 0.5, 31, 31, 6); ctx.fill();
  // 系別寶石底
  const bg = ctx.createRadialGradient(13, 11, 1, 16, 16, 19); bg.addColorStop(0, S.a); bg.addColorStop(0.55, S.b); bg.addColorStop(1, S.c);
  ctx.fillStyle = bg; rr(2.5, 2.5, 27, 27, 4.5); ctx.fill();
  // 內圈魔法陣
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(16, 16, 11.5, 0, 7); ctx.stroke();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; ctx.beginPath(); ctx.moveTo(16 + Math.cos(a) * 11.5, 16 + Math.sin(a) * 11.5); ctx.lineTo(16 + Math.cos(a + 2.1) * 11.5, 16 + Math.sin(a + 2.1) * 11.5); ctx.stroke(); }
  // 高光
  const hl = ctx.createLinearGradient(0, 2, 0, 16); hl.addColorStop(0, 'rgba(255,255,255,0.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl; rr(3, 3, 26, 12, 4); ctx.fill();
  // 圖騰
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 3;
  if (typeof sp.icon === 'string' && sp.icon.startsWith('rune:')) {
    const ch = sp.icon.split(':')[1];
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px "Microsoft JhengHei", "PingFang TC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = S.rim; ctx.shadowBlur = 6; ctx.fillText(ch, 16, 16.5);
  } else {
    ctx.translate(16, 16); ctx.scale(0.74, 0.74); ctx.translate(-16, -16);
    drawSkillIcon(ctx, sp.icon, 0, 0, 32);
  }
  ctx.restore();
  // 內框描邊
  ctx.strokeStyle = S.rim; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; rr(2.5, 2.5, 27, 27, 4.5); ctx.stroke(); ctx.globalAlpha = 1;
  // 階級標記
  const t = String(sp.circle);
  ctx.font = 'bold 8px Georgia, serif'; const tw = ctx.measureText(t).width + 5;
  ctx.fillStyle = 'rgba(10,8,6,0.85)'; rr(31 - tw - 1, 1, tw, 9, 2.5); ctx.fill();
  ctx.fillStyle = sp.circle >= 6 ? '#ffd860' : '#f0e8d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, 31 - tw / 2 - 1, 5.8);
  ctx.restore();
}
