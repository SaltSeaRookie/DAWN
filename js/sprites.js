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
  if (k === 'skeleton') {
    ctx.fillStyle = o.body; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); ctx.fill();
    ctx.fillRect(hx - 2, hy + 3, 7, 4);
    if (!back) { ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(hx + 2.5, hy - 0.5, 1.7, 0, 7); ctx.fill(); ctx.fillStyle = o.eye || '#ff3a2a'; ctx.fillRect(hx + 2, hy - 1, 1.2, 1.2); ctx.fillStyle = '#1a1010'; ctx.fillRect(hx + 1, hy + 4, 4, 1); }
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
  if (o.shieldArm && !back) {
    ctx.fillStyle = '#5a6a7a'; ctx.beginPath(); ctx.ellipse(-4, shY + 10, 4, 7, 0, 0, 7); ctx.fill();
  }
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
  const hover = 34 + Math.sin(o.t * 2.2) * 5;
  drawShadow(ctx, x, y, 46, 15, 0.3);
  ctx.save(); ctx.translate(x, y - hover); ctx.scale(flip ? -1.25 : 1.25, 1.25);
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

// 物品圖示（UI 與地面）
function drawItemIcon(ctx, id, x, y, s) {
  const it = ITEMS[id]; if (!it) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32);
  const c = it.color;
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
      ctx.fillStyle = '#b02020'; ctx.beginPath(); ctx.arc(16, 24, 2.5, 0, 7); ctx.fill();
      break;
    }
    case 'sword': {
      ctx.save(); ctx.translate(16, 16); ctx.rotate(-Math.PI / 4);
      const L = id === 'dagger' ? 9 : id === 'claymore' ? 15 : 12;
      ctx.fillStyle = '#5a3c20'; ctx.fillRect(-1.5, 6, 3, 7);
      ctx.fillStyle = '#c9a33a'; ctx.fillRect(-5, 5, 10, 2.5);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-2, 5); ctx.lineTo(-2, -L); ctx.lineTo(0, -L - 3); ctx.lineTo(2, -L); ctx.lineTo(2, 5); ctx.fill();
      ctx.restore(); break;
    }
    case 'bow': {
      ctx.strokeStyle = c; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(8, 4); ctx.quadraticCurveTo(28, 16, 8, 28); ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(8, 28); ctx.stroke();
      break;
    }
    case 'armor': {
      const gr = ctx.createLinearGradient(6, 0, 26, 0); gr.addColorStop(0, shade(c, -0.3)); gr.addColorStop(0.5, shade(c, 0.2)); gr.addColorStop(1, shade(c, -0.3));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(22, 5); ctx.lineTo(27, 10); ctx.lineTo(24, 14); ctx.lineTo(23, 27); ctx.lineTo(9, 27); ctx.lineTo(8, 14); ctx.lineTo(5, 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
      break;
    }
    case 'fang': ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(10, 6); ctx.quadraticCurveTo(24, 10, 20, 28); ctx.quadraticCurveTo(14, 16, 10, 6); ctx.fill(); break;
    case 'ear': ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(6, 20); ctx.lineTo(26, 6); ctx.lineTo(18, 24); ctx.closePath(); ctx.fill(); break;
    case 'bone': ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(8, 24); ctx.lineTo(24, 8); ctx.stroke(); ctx.fillStyle = c; for (const [a, b] of [[7, 22], [10, 26], [22, 6], [26, 10]]) { ctx.beginPath(); ctx.arc(a, b, 2.8, 0, 7); ctx.fill(); } break;
    case 'bark': ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(6, 10); ctx.lineTo(24, 6); ctx.lineTo(27, 22); ctx.lineTo(9, 27); ctx.closePath(); ctx.fill(); ctx.strokeStyle = shade(c, -0.4); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 5, 10); ctx.lineTo(12 + i * 5, 24); ctx.stroke(); } break;
    case 'scale': { const gr = ctx.createRadialGradient(13, 12, 1, 16, 16, 12); gr.addColorStop(0, shade(c, 0.5)); gr.addColorStop(1, shade(c, -0.3)); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(16, 4); ctx.quadraticCurveTo(29, 14, 16, 28); ctx.quadraticCurveTo(3, 14, 16, 4); ctx.fill(); break; }
    case 'gold': {
      for (const [a, b] of [[12, 20], [20, 21], [16, 15]]) { ctx.fillStyle = '#a07a10'; ctx.beginPath(); ctx.ellipse(a, b + 1, 6, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#f2cc40'; ctx.beginPath(); ctx.ellipse(a, b, 6, 3.5, 0, 0, 7); ctx.fill(); }
      break;
    }
  }
  ctx.restore();
}
ITEMS.gold = { name: '金幣', type: 'gold', icon: 'gold', color: '#f2cc40', price: 0 };

function drawSkillIcon(ctx, id, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32);
  if (id === 'heal') {
    ctx.fillStyle = '#f4f8ff'; ctx.shadowColor = '#9fd8ff'; ctx.shadowBlur = 6;
    ctx.fillRect(12, 5, 8, 22); ctx.fillRect(5, 12, 22, 8);
  } else if (id === 'holy') {
    ctx.shadowColor = '#ffe070'; ctx.shadowBlur = 8; ctx.strokeStyle = '#ffeaa0'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(8 + i * 6, 26); ctx.lineTo(16 + i * 6, 6); ctx.stroke(); }
  } else if (id === 'shield') {
    ctx.fillStyle = '#7ab0e8'; ctx.shadowColor = '#bfe0ff'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(27, 8); ctx.quadraticCurveTo(27, 22, 16, 29); ctx.quadraticCurveTo(5, 22, 5, 8); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#e8f4ff'; ctx.fillRect(14.5, 9, 3, 14); ctx.fillRect(10, 13, 12, 3);
  } else if (id === 'haste') {
    ctx.strokeStyle = '#8ef08a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(6, 8); ctx.lineTo(15, 16); ctx.lineTo(6, 24); ctx.moveTo(15, 8); ctx.lineTo(24, 16); ctx.lineTo(15, 24); ctx.stroke();
  } else if (id === 'auto') {
    ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(16, 16, 9, 0.3, Math.PI * 1.7); ctx.stroke();
    ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.moveTo(25, 6); ctx.lineTo(26, 14); ctx.lineTo(18, 11); ctx.fill();
    ctx.beginPath(); ctx.moveTo(13, 11); ctx.lineTo(21, 16); ctx.lineTo(13, 21); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
