'use strict';
// ===== 炎皇火龍：首領技能、火焰地面、熾焰火山的環境效果 =====
// 技能：龍息（扇形火焰＋燃燒地面）、流星火雨（體力 60% 以下）、召喚幼火龍（70%、35%）、狂暴（35% 以下）
function dragonVictims(a) {
  const p = G.player, out = [];
  if (!p.dead) out.push(p);
  for (const b of G.map.actors) if (!b.dead && (b.companion || b.kind === 'ally') && dist(a.x, a.y, b.x, b.y) < 14) out.push(b);
  return out;
}
function dragonRoar(a, line) {
  a.speak(line, 3); SFX.play('roar', a.x, a.y); shake(6);
  if (dist(a.x, a.y, G.player.x, G.player.y) < 18) UI.log(a.name + '：' + line, 'warn');
}
// 回傳 true 表示這一格正在施放技能
function dragonThink(a, dt) {
  const t = a.target; if (!t || t.dead) return false;
  a.breathCd = (a.breathCd === undefined ? 4 : a.breathCd) - dt;
  a.meteorCd = (a.meteorCd === undefined ? 8 : a.meteorCd) - dt;
  const hpF = a.hp / a.maxHp;
  // 召喚與狂暴
  if (!a.sum70 && hpF < 0.7) { a.sum70 = true; dragonRoar(a, '渺小的生物…出來吧，我的子嗣！'); summonWhelps(a, 2); }
  if (!a.sum35 && hpF < 0.35) { a.sum35 = true; a.atkSpd *= 0.7; a.speed *= 1.2; dragonRoar(a, '吼——！！你們激怒了炎皇！'); summonWhelps(a, 3); }
  // 正在吐息
  if (a.breathing > 0) {
    a.breathing -= dt; a.path = []; a.moving = false;
    const hx = a.x + Math.cos(a.breathAng) * 1.6, hy = a.y + Math.sin(a.breathAng) * 1.6;
    for (let i = 0; i < 6; i++) {
      const sp = rand(5, 9), ang = a.breathAng + rand(-0.45, 0.45);
      G.particles.push({ x: hx, y: hy, z: 70, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vz: -40, life: 0.6, max: 0.6, color: Math.random() < 0.5 ? '#ffd060' : '#ff5010', size: 4 });
    }
    if (!a.breathHit && a.breathing < 0.45) {
      a.breathHit = true;
      for (const v of dragonVictims(a)) {
        const d = dist(a.x, a.y, v.x, v.y), ang = Math.atan2(v.y - a.y, v.x - a.x);
        let diff = Math.abs(ang - a.breathAng); if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (d < 7.5 && diff < 0.6) magicHit(a, v, Math.round(randi(a.dmg[0], a.dmg[1]) * 1.4), { element: 'fire' });
      }
      for (let k = 1; k <= 4; k++) {
        const r = 1.5 + k * 1.3, ang = a.breathAng + rand(-0.3, 0.3);
        const x = a.x + Math.cos(ang) * r, y = a.y + Math.sin(ang) * r;
        if (!G.world.blocked(x, y)) addHazard(a, x, y, 1.1, 6, () => randi(10, 18));
      }
      SFX.play('boom', a.x, a.y);
    }
    return true;
  }
  const d = dist(a.x, a.y, t.x, t.y);
  if (a.breathCd <= 0 && d < 7) {
    a.breathCd = a.sum35 ? 5 : 7; a.breathing = 1.0; a.breathHit = false;
    a.breathAng = Math.atan2(t.y - a.y, t.x - a.x); a.face(t.x, t.y); a.atkAnim = 0;
    a.speak('🔥', 1); SFX.play('fire', a.x, a.y);
    return true;
  }
  if (hpF < 0.6 && a.meteorCd <= 0) {
    a.meteorCd = a.sum35 ? 10 : 14;
    dragonRoar(a, '火雨降臨吧！');
    G.meteors = G.meteors || [];
    const vs = dragonVictims(a);
    for (let k = 0; k < 6; k++) {
      const v = pick(vs) || t;
      const x = v.x + rand(-1.5, 1.5), y = v.y + rand(-1.5, 1.5);
      G.meteors.push({ x, y, t: -k * 0.15, dur: 1.0 });
      G.rings = G.rings || []; G.rings.push({ x, y, t: 0, r: 1.6, col: '255,90,30' });
      later(1.0 + k * 0.15, () => {
        burst(x, y, 5, '#ff7020', 16, 3, 0.6, 3, 2); SFX.play('boom', x, y);
        for (const w of dragonVictims(a)) if (dist(w.x, w.y, x, y) < 1.6) magicHit(a, w, randi(22, 36), { element: 'fire' });
        if (!G.world.blocked(x, y)) addHazard(a, x, y, 1.0, 4, () => randi(8, 14));
      });
    }
  }
  return false;
}
function summonWhelps(a, n) {
  for (let i = 0; i < n; i++) {
    const q = G.world.nearestFree(a.x + rand(-3, 3), a.y + rand(-3, 3));
    const w = makeMonster('fire_whelp', q.x, q.y);
    w.summoned = true; w.target = a.target; w.state = 'chase'; w.home = { x: a.home.x, y: a.home.y };
    G.map.actors.push(w);
    burst(w.x, w.y, 30, '#ff8030', 20, 2.5, 0.7, 3, 3);
  }
}
// 燃燒的地面：傷害玩家與夥伴
function addHazard(src, x, y, r, dur, dmg) {
  G.hazards = G.hazards || [];
  G.hazards.push({ src, x, y, r, dur, t: 0, tick: 0.3, dmg });
}
function updateHazards(dt) {
  if (!G.hazards) return;
  for (const h of G.hazards) {
    h.t += dt; h.tick -= dt;
    if (h.tick <= 0) {
      h.tick = 1;
      for (const v of dragonVictims(h.src || { x: h.x, y: h.y })) if (dist(v.x, v.y, h.x, h.y) < h.r) magicHit(h.src, v, h.dmg(), { element: 'fire' });
    }
  }
  G.hazards = G.hazards.filter((h) => h.t < h.dur);
}
function drawHazards(S) {
  for (const h of G.hazards || []) {
    const [sx, sy] = S(h.x, h.y), k = Math.min(1, (h.dur - h.t) / 0.8), rr = h.r * HW * 1.3;
    const gr = ctx.createRadialGradient(sx, sy, 2, sx, sy, rr);
    gr.addColorStop(0, 'rgba(255,170,40,' + 0.55 * k + ')'); gr.addColorStop(1, 'rgba(200,40,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.55, 0, 0, 7); ctx.fill();
    if (k > 0.3) drawFire(sx, sy + 2, 0.5 * k);
  }
}
// 熾焰火山：岩漿旁的熱氣、飄動的火星
function volcanoTick(dt) {
  if (G.map.id !== 'volcano') return;
  const p = G.player;
  if (Math.random() < 0.5) { const x = p.x + rand(-9, 9), y = p.y + rand(-9, 9); G.particles.push({ x, y, z: rand(0, 20), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(25, 50), life: 1.8, max: 1.8, color: Math.random() < 0.6 ? '#ff9a30' : '#ffd070', size: 2 }); }
  if (p.dead) return;
  G.heatT = (G.heatT || 0) - dt;
  if (G.heatT > 0) return;
  G.heatT = 2;
  const W = G.world;
  let hot = false;
  for (let dy = -1; dy <= 1 && !hot; dy++) for (let dx = -1; dx <= 1; dx++) if (W.inBounds((p.x | 0) + dx, (p.y | 0) + dy) && W.tiles[W.idx((p.x | 0) + dx, (p.y | 0) + dy)] === TILE.LAVA) { hot = true; break; }
  if (!hot) return;
  const res = clamp(p.d.res.fire || 0, 0, 90);
  const dmg = Math.round(p.maxHp * 0.035 * (1 - res / 60));
  if (!G.heatWarned) { G.heatWarned = true; log('岩漿的熱氣灼燒著你！火屬性抗性 60% 以上就能完全抵擋。', 'warn'); }
  if (dmg > 0) dealDamage(null, p, dmg);
}
