'use strict';
// ===== 繪製 =====
let darkCanvas = null, darkCtx = null, vignette = null;

const PLAYER_LOOK = {
  knight: { skin: '#e8c49a', hair: '#c8a060', cape: '#7a1a1a', trim: '#d0b050', legs: '#3a3e4a', boots: '#2a1e16', belt: '#3a2614' },
  ranger: { skin: '#f0d0b0', hair: '#e8d070', longHair: true, cape: '#1a2a4a', trim: '#e8e8f0', legs: '#1e2440', boots: '#e8e8f0', belt: '#6a4a2a' },
};
const ARMOR_LOOK = {
  leather: { body: '#6a4a2e', sleeve: '#5a3e26' },
  chainmail: { body: '#8a929c', sleeve: '#6a7480' },
  plate: { body: '#c8d0da', sleeve: '#a8b0ba', plate: true },
};
function weaponSprite(id) {
  if (!id) return null;
  return { dagger: 'dagger', longsword: 'sword', claymore: 'claymore', shortbow: 'bow', longbow: 'bow' }[id] || 'sword';
}

function buildMinimapBase() {
  const W = G.world;
  const c = makeCanvas(W.w, W.h); const g = c.getContext('2d');
  const img = g.createImageData(W.w, W.h);
  const col = {
    [TILE.GRASS]: [104, 136, 62], [TILE.DARKGRASS]: [70, 100, 46], [TILE.DIRT]: [140, 115, 82], [TILE.COBBLE]: [150, 140, 125],
    [TILE.SOIL]: [76, 62, 48], [TILE.WATER]: [40, 90, 130], [TILE.SAND]: [186, 166, 125], [TILE.CANYON]: [128, 106, 82],
  };
  for (let i = 0; i < W.w * W.h; i++) {
    let c2 = col[W.tiles[i]];
    const o = W.objGrid[i] >= 0 ? W.objs[W.objGrid[i]] : null;
    if (o && (o.kind === 'tree')) c2 = [36, 62, 30];
    else if (o && o.kind === 'cliff') c2 = [58, 50, 42];
    else if (W.blockArr[i] && W.tiles[i] !== TILE.WATER) c2 = [60, 54, 48];
    img.data[i * 4] = c2[0]; img.data[i * 4 + 1] = c2[1]; img.data[i * 4 + 2] = c2[2]; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  G.minimapBase = c;
}

function render() {
  const W = G.world, p = G.player;
  const hud = HUD_H();
  const viewH = VH - hud;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0b0a09'; ctx.fillRect(0, 0, VW, VH);

  // 相機
  const ps = toScreen(p.x, p.y);
  G.cam.x = lerp(G.cam.x, ps.x, 0.12); G.cam.y = lerp(G.cam.y, ps.y - 20, 0.12);
  let shx = 0, shy = 0;
  if (G.shake > 0) { shx = rand(-G.shake, G.shake); shy = rand(-G.shake, G.shake); }
  const ox = Math.round(VW / 2 - G.cam.x + shx), oy = Math.round(viewH / 2 - G.cam.y + shy);
  const S = (x, y) => [(x - y) * HW + ox, (x + y) * HH + oy];

  // 可見範圍
  const corners = [[0, -120], [VW, -120], [0, VH + 150], [VW, VH + 150]].map(([sx, sy]) => toWorld(sx - ox, sy - oy));
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
      let v = W.variant[k];
      if (t === TILE.WATER) v = (v + wph + ((i * 7 + j * 3) % 3)) % 6;
      ctx.drawImage(TEX[t][v], sx - HW - 1, sy - 1);
    }
  // 地面裝飾
  for (let j = y0; j <= y1; j++)
    for (let i = x0; i <= x1; i++) {
      const di = W.decoGrid[j * W.w + i]; if (di < 0) continue;
      const d = W.decos[di];
      const [sx, sy] = S(i + 0.5 + d.ox, j + 0.5 + d.oy);
      if (sx < -40 || sx > VW + 40 || sy < -40 || sy > VH + 40) continue;
      const s = SPR['deco_' + d.kind + d.v];
      ctx.drawImage(s.c, sx - s.ax, sy - s.ay);
    }
  // 點擊位置提示
  if (G.clickFx) {
    const [sx, sy] = S(G.clickFx.x, G.clickFx.y);
    const t = G.clickFx.t / 0.6;
    ctx.strokeStyle = 'rgba(255,230,140,' + (1 - t) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 6 + t * 14, (6 + t * 14) / 2, 0, 0, 7); ctx.stroke();
  }
  // 地上物品
  for (const it of G.items) {
    const [sx, sy] = S(it.x, it.y);
    if (sx < -60 || sx > VW + 60 || sy < -60 || sy > VH + 40) { it._bb = null; continue; }
    drawShadow(ctx, sx, sy + 2, 8, 3, 0.3);
    drawItemIcon(ctx, it.id, sx - 10, sy - 14 + Math.sin(G.t * 3 + it.x) * 1, 20);
  }
  // 選取目標的圈
  const tgt = p.action && p.action.type === 'attack' ? p.action.target : null;
  if (tgt && !tgt.dead) {
    const [sx, sy] = S(tgt.x, tgt.y);
    const r = tgt.def.boss ? 40 : 18;
    ctx.strokeStyle = 'rgba(255,60,40,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, r, r / 2, 0, 0, 7); ctx.stroke();
  }

  // 收集需排序的物件
  const list = [];
  for (let j = y0; j <= y1; j++)
    for (let i = x0; i <= x1; i++) {
      const oi = W.objGrid[j * W.w + i]; if (oi < 0) continue;
      const o = W.objs[oi]; if (!o) continue;
      list.push({ d: i + j + 1, o });
    }
  const ents = [p, ...G.npcs, ...G.others, ...G.monsters];
  for (const e of ents) {
    const [sx, sy] = S(e.x, e.y);
    if (sx < -150 || sx > VW + 150 || sy < -60 || sy > VH + 200) { e._bb = null; continue; }
    list.push({ d: e.x + e.y + (e.dead ? -0.5 : 0), e });
  }
  list.sort((a, b) => a.d - b.d);
  const labels = [];
  for (const it of list) {
    if (it.o) drawObj(it.o, S);
    else drawEntity(it.e, S, labels);
  }

  // 投射物
  for (const pr of G.projectiles) {
    const [sx, sy] = S(pr.x, pr.y);
    if (pr.kind === 'arrow') {
      const sa = Math.atan2(Math.sin(pr.ang) * HH + Math.cos(pr.ang) * HH, (Math.cos(pr.ang) - Math.sin(pr.ang)) * HW);
      ctx.save(); ctx.translate(sx, sy - pr.z); ctx.rotate(sa);
      ctx.strokeStyle = pr.holy ? '#fff2a0' : '#d8c8a0'; ctx.lineWidth = 1.6;
      if (pr.holy) { ctx.shadowColor = '#ffe070'; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(4, -2.5); ctx.lineTo(4, 2.5); ctx.fill();
      ctx.restore();
    } else if (pr.kind === 'fire') {
      const gr = ctx.createRadialGradient(sx, sy - pr.z, 1, sx, sy - pr.z, 16);
      gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.4, '#ff9a20'); gr.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy - pr.z, 16, 0, 7); ctx.fill();
    }
  }
  // 粒子
  for (const q of G.particles) {
    const [sx, sy] = S(q.x, q.y);
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    ctx.fillStyle = q.color;
    ctx.fillRect(sx - q.size / 2, sy - q.z - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  // 升級特效
  if (G.levelFx) {
    const [sx, sy] = S(p.x, p.y);
    const t = G.levelFx.t / 1.6;
    ctx.strokeStyle = 'rgba(255,220,120,' + (1 - t) + ')'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) { const r = 10 + t * 60 + k * 10; ctx.beginPath(); ctx.ellipse(sx, sy, r, r / 2, 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,240,180,' + (0.35 * (1 - t)) + ')'; ctx.fillRect(sx - 14, sy - 140, 28, 140);
  }

  // 夜晚
  drawDarkness(S);

  // 文字標籤（不受夜晚影響）
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  // 地上物品名稱
  ctx.font = '12px "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
  for (const it of G.items) {
    const [sx, sy] = S(it.x, it.y);
    if (sx < -60 || sx > VW + 60 || sy < -60 || sy > VH + 40) continue;
    const nm = it.id === 'gold' ? '金幣 (' + it.qty + ')' : ITEMS[it.id].name + (it.qty > 1 ? ' (' + it.qty + ')' : '');
    const w = ctx.measureText(nm).width + 10;
    const lx = sx - w / 2, ly = sy - 36;
    const hov = G.hover && G.hover.e === it;
    ctx.fillStyle = hov ? 'rgba(60,50,20,0.85)' : 'rgba(10,10,14,0.7)';
    ctx.fillRect(lx, ly, w, 17);
    ctx.strokeStyle = hov ? '#ffe08a' : 'rgba(230,230,230,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(lx + 0.5, ly + 0.5, w - 1, 16);
    ctx.fillStyle = ITEMS[it.id].type === 'weapon' || ITEMS[it.id].type === 'armor' || it.id === 'wyvern_scale' ? '#9fd8ff' : '#f0f0f0';
    ctx.fillText(nm, sx, ly + 13);
    it._bb = { x0: Math.min(lx, sx - 12), x1: Math.max(lx + w, sx + 12), y0: ly, y1: sy + 4 };
  }
  for (const L of labels) L();
  // 浮動數字
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
}

function drawObj(o, S) {
  const [sx, sy] = S(o.tx + 0.5, o.ty + 0.5);
  let s;
  switch (o.kind) {
    case 'cliff': s = SPR['cliff' + o.style + '_' + o.v]; break;
    case 'tree': s = SPR['tree' + o.v]; break;
    case 'deadtree': s = SPR['deadtree' + o.v]; break;
    case 'rock': s = SPR['rock' + o.v]; break;
    case 'tomb': s = SPR['tomb' + o.v]; break;
    case 'cross': s = SPR.cross0; break;
    case 'house': s = SPR['house' + o.v]; break;
    case 'lamp': s = SPR.lamp0; break;
    case 'board': s = SPR.board0; break;
    case 'brazier': s = SPR.brazier0; break;
  }
  if (!s) return;
  if (sx < -s.c.width || sx > VW + s.c.width || sy < -40 || sy > VH + s.c.height) return;
  // 擋住玩家的樹木／房屋變半透明
  let alpha = 1;
  if ((o.kind === 'tree' || o.kind === 'house' || o.kind === 'deadtree') && G.player) {
    const p = G.player;
    if (o.tx + o.ty + 1 > p.x + p.y) {
      const ps = S(p.x, p.y);
      const left = sx - s.ax * 0.8, right = sx + (s.c.width - s.ax) * 0.8, topY = sy - s.ay;
      if (ps[0] > left && ps[0] < right && ps[1] - 30 > topY && ps[1] - 30 < sy) alpha = 0.4;
    }
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(s.c, Math.round(sx - s.ax), Math.round(sy - s.ay));
  ctx.globalAlpha = 1;
  if (o.kind === 'brazier') drawFire(sx, sy - 24, 1);
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

function entityLook(e) {
  if (e === G.player) {
    const base = PLAYER_LOOK[e.cls];
    const ar = e.equip.armor ? ARMOR_LOOK[e.equip.armor.id] : { body: '#7a6a5a', sleeve: '#6a5a4a' };
    const wid = e.equip.weapon ? e.equip.weapon.id : null;
    return Object.assign({}, base, ar, { weapon: weaponSprite(wid), holy: !!e.buffs.holy, ench: e.equip.weapon ? e.equip.weapon.ench : 0, helm: e.equip.armor && e.equip.armor.id === 'plate' ? '#b8c0ca' : null });
  }
  return e.look;
}

function drawEntity(e, S, labels) {
  const [sx, sy] = S(e.x, e.y);
  const p = G.player;
  let top = sy - 52, bb;
  if (e instanceof Monster) {
    const d = e.def;
    const fade = e.dead ? clamp(1 - (e.deadT - 1.5) / 1.5, 0, 1) : 1;
    ctx.globalAlpha = fade;
    const o = { dir: e.dir, moving: e.moving, walk: e.walk, t: G.t + e.id, atk: e.atkAnim, color: d.color, scale: e.scale };
    if (e.dead) {
      // 倒地
      ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.55); ctx.rotate(Math.PI / 2 * 0.9); ctx.translate(-sx, -sy);
    }
    if (e.hurtT > 0 && !e.dead) ctx.filter = 'brightness(1.8)';
    switch (d.sprite) {
      case 'wolf': drawShadow(ctx, sx, sy, 16, 6); drawWolf(ctx, sx, sy, o); top = sy - 34; bb = [sx - 24, sy - 34, sx + 24, sy + 4]; break;
      case 'goblin': drawShadow(ctx, sx, sy, 10, 4); drawHumanoid(ctx, sx, sy, Object.assign(o, { kind: 'goblin', body: '#6a5a3a', skin: '#7a9a3a', legs: '#4a3a24', boots: '#3a2a18', weapon: 'club', scale: 0.82 })); top = sy - 48; bb = [sx - 14, sy - 46, sx + 14, sy + 4]; break;
      case 'skeleton': drawShadow(ctx, sx, sy, 11, 4); drawHumanoid(ctx, sx, sy, Object.assign(o, { kind: 'skeleton', body: '#e6e0cc', legs: '#e6e0cc', sleeve: '#e6e0cc', weapon: 'rusty', shieldArm: false })); top = sy - 56; bb = [sx - 14, sy - 54, sx + 14, sy + 4]; break;
      case 'ghoul': drawShadow(ctx, sx, sy, 12, 4); drawHumanoid(ctx, sx, sy, Object.assign(o, { kind: 'ghoul', body: '#5a6250', skin: '#8e9e83', legs: '#4a4a3a', boots: '#6e7a62', sleeve: '#8e9e83' })); top = sy - 52; bb = [sx - 16, sy - 52, sx + 16, sy + 4]; break;
      case 'lizard': drawShadow(ctx, sx, sy, 14, 5); drawHumanoid(ctx, sx, sy, Object.assign(o, { kind: 'lizard', body: '#4f8a46', skin: '#4f8a46', legs: '#3f7038', boots: '#2e5528', sleeve: '#4f8a46', belt: '#6a4a2a', weapon: 'spear', scale: 1.1 })); top = sy - 62; bb = [sx - 18, sy - 60, sx + 18, sy + 4]; break;
      case 'treant': drawShadow(ctx, sx, sy, 20, 7); drawTreant(ctx, sx, sy, o); top = sy - 84; bb = [sx - 24, sy - 80, sx + 24, sy + 4]; break;
      case 'wyvern': { const h = drawWyvern(ctx, sx, sy, o); top = sy - h - 100; bb = [sx - 60, sy - h - 90, sx + 60, sy + 10]; break; }
    }
    ctx.filter = 'none';
    if (e.dead) ctx.restore();
    ctx.globalAlpha = 1;
    e._bb = e.dead ? null : { x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3] };
    if (!e.dead) {
      const targeted = p.action && p.action.target === e;
      const hovered = G.hover && G.hover.e === e;
      labels.push(() => {
        if (targeted || hovered || e.def.boss) {
          ctx.font = (e.def.boss ? 'bold 14px' : '12px') + ' "Microsoft JhengHei", "PingFang TC", sans-serif';
          const col = e.def.lvl > p.level + 4 ? '#ff7060' : e.def.lvl < p.level - 4 ? '#a0a0a0' : '#ffffff';
          outlineText(e.name, sx, top - 8, col);
        }
        if (e.hp < e.maxHp || targeted) hpBar(sx, top - 4, e.def.boss ? 70 : 34, e.hp / e.maxHp, '#d02a20');
      });
    }
    return;
  }
  // 人形（玩家、NPC、冒險者）
  if (e.isDog) {
    drawShadow(ctx, sx, sy, 12, 4);
    drawWolf(ctx, sx, sy, { dir: e.dir, moving: e.moving, walk: e.walk, t: G.t, atk: -1, color: e.look.color, scale: 0.72, eye: '#222' });
    top = sy - 28;
  } else {
    if (e === p && p.dead) { ctx.save(); ctx.globalAlpha = 0.6; }
    drawShadow(ctx, sx, sy, 11, 4.5);
    const look = entityLook(e);
    const atk = e.atkAnim !== undefined ? e.atkAnim : -1;
    if (e === p && p.hurtT > 0) ctx.filter = 'brightness(1.6) saturate(0.6)';
    if (e === p && p.buffs.shield) { ctx.strokeStyle = 'rgba(150,200,255,' + (0.25 + Math.sin(G.t * 4) * 0.1) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy - 24, 18, 30, 0, 0, 7); ctx.stroke(); }
    drawHumanoid(ctx, sx, sy, Object.assign({}, look, { dir: e.dir, moving: e.moving, walk: e.walk, t: G.t + e.id, atk, draw: atk >= 0 && atk < 0.6 }));
    ctx.filter = 'none';
    if (e === p && p.dead) ctx.restore();
    if (e === p && p.buffs.haste && e.moving && Math.random() < 0.3) G.particles.push({ x: e.x, y: e.y, z: rand(5, 30), vx: 0, vy: 0, vz: 0, life: 0.3, max: 0.3, color: '#a0ffa0', size: 2 });
  }
  e._bb = { x0: sx - 14, y0: sy - 54, x1: sx + 14, y1: sy + 4 };
  labels.push(() => {
    ctx.font = '12px "Microsoft JhengHei", "PingFang TC", sans-serif';
    let y = top - 8;
    if (e instanceof NPC) {
      outlineText('[' + e.title + ']', sx, y, '#ffe9a0'); y -= 14;
      outlineText(e.name, sx, y, '#ffffff'); y -= 6;
      if (e.role === 'quest') {
        const q = p.quest, Q = QUESTS[q.idx];
        const mark = !Q ? null : !q.active ? '!' : q.count >= Q.count ? '?' : null;
        if (mark) { ctx.font = 'bold 20px Georgia, serif'; outlineText(mark, sx, y - 8, '#ffd040'); y -= 22; ctx.font = '12px sans-serif'; }
      }
    } else if (e === p) {
      hpBar(sx, top - 2, 36, p.hp / p.maxHp, '#d02a20');
      outlineText(p.name, sx, y - 4, '#ffffff'); y -= 18;
    } else if (!e.isDog) { outlineText(e.name, sx, y, '#c8d8ff'); y -= 14; }
    if (e.say && e.sayT > 0) bubble(e.say, sx, y - 4);
  });
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
  const b = daylight();
  const a = clamp((0.5 - b) * 1.3, 0, 0.62);
  const dusk = clamp(1 - Math.abs(b - 0.42) / 0.15, 0, 1) * 0.12;
  if (dusk > 0) { ctx.fillStyle = 'rgba(255,120,40,' + dusk + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (a <= 0.01) return;
  if (!darkCanvas || darkCanvas.width !== VW || darkCanvas.height !== VH) { darkCanvas = makeCanvas(VW, VH); darkCtx = darkCanvas.getContext('2d'); }
  const g = darkCtx;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, VW, VH);
  g.fillStyle = 'rgba(6,10,32,' + a + ')'; g.fillRect(0, 0, VW, VH);
  g.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, k = 1) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,' + k + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  };
  const p = G.player;
  { const [x, y] = S(p.x, p.y); light(x, y - 20, 170, 0.85); }
  for (const L of G.world.lights) { const [x, y] = S(L.x, L.y); if (x > -300 && x < VW + 300 && y > -300 && y < VH + 300) light(x, y - 30, L.r * (0.95 + Math.sin(G.t * 7 + L.x) * 0.04)); }
  for (const pr of G.projectiles) if (pr.kind === 'fire') { const [x, y] = S(pr.x, pr.y); light(x, y - pr.z, 90); }
  ctx.drawImage(darkCanvas, 0, 0, VW, VH);
}

function buildVignette() {
  vignette = makeCanvas(400, 300);
  const g = vignette.getContext('2d');
  const gr = g.createRadialGradient(200, 150, 90, 200, 150, 260);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)');
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
  for (const m of G.monsters) {
    if (m.dead) continue;
    const [x, y] = P(m.x, m.y);
    if (x < 0 || y < 0 || x > w || y > h) continue;
    g.fillStyle = m.def.boss ? '#ff40ff' : '#ff3a2a'; g.fillRect(x - 1.5, y - 1.5, m.def.boss ? 5 : 3, m.def.boss ? 5 : 3);
  }
  for (const n of G.npcs) { const [x, y] = P(n.x, n.y); g.fillStyle = '#ffd040'; g.fillRect(x - 1.5, y - 1.5, 3, 3); }
  const [px, py] = P(p.x, p.y);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 3, 0, 7); g.fill();
  g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
}
