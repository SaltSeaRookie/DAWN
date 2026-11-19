'use strict';
// ===== 夥伴系統：召喚獸、被迷魅的怪物、寵物 共用跟隨／戰鬥行為 =====
// 指令模式（G.player.petMode）：assist 攻擊我的目標・free 自由攻擊・stay 待命・follow 跟隨
function companions(type) { return G.map ? G.map.actors.filter((a) => a.companion && !a.dead && (!type || a.companion === type)) : []; }
function petMode() { return (G.player && G.player.petMode) || 'assist'; }
function setPetMode(m) {
  const p = G.player; p.petMode = m;
  for (const a of companions()) { a.target = null; a.state = 'idle'; if (m === 'stay') a.stayAt = { x: a.x, y: a.y }; }
  log('夥伴指令：' + PET_MODES[m], 'sys'); SFX.play('click');
  UI.refresh();
}

// ---------- 召喚術 ----------
function castSummon(kind) {
  const p = G.player, def = SUMMONS[kind], sp = Math.max(0, p.d.sp), L = p.level;
  const list = companions('summon');
  while (list.length >= MAX_SUMMONS) { const old = list.shift(); dismissCompanion(old, '召喚時間到了，' + old.name + ' 消散了。'); }
  const pos = G.world.nearestFree(p.x + rand(-1.5, 1.5), p.y + rand(-1.5, 1.5));
  const [h0, hL, hS] = def.hp, [d0, d1, dL0, dL1, dS] = def.dmg;
  const a = new Actor({
    x: pos.x, y: pos.y, kind: 'companion', faction: 'ally', companion: 'summon', ctype: kind, name: def.name, level: L,
    maxHp: Math.round(h0 + L * hL + sp * hS), ac: Math.round(def.ac[0] + L * def.ac[1]), mr: def.mr,
    dmg: [Math.round(d0 + L * dL0 + sp * dS * 0.5), Math.round(d1 + L * dL1 + sp * dS)], atkSpd: def.atkSpd, range: def.range,
    proj: def.proj || null, magic: !!def.magic, speed: def.speed, sprite: def.sprite, aggro: true, aggroR: 7, scale: 1,
  });
  a.expire = G.t + COMPANION_TIME;
  G.map.actors.push(a);
  burst(a.x, a.y, 20, kind === 'fireelem' ? '#ff8030' : '#9fd0ff', 26, 2.5, 0.8, 3, 3);
  G.rings = G.rings || []; G.rings.push({ x: a.x, y: a.y, t: 0, r: 1.5, col: kind === 'fireelem' ? '255,140,60' : '150,200,255' });
  log('你召喚了' + def.name + '！（30 分鐘）', 'level');
  return a;
}
function dismissCompanion(a, msg) {
  if (a.dead) return;
  if (a.companion === 'charm') return revertCharm(a, msg);
  if (a.companion === 'pet') return recallPet(a, true);
  a.dead = true; a.deadT = 9;
  burst(a.x, a.y, 20, '#9fd0ff', 18, 2, 0.6, 2.5, 2);
  if (msg) log(msg, 'sys');
}

// ---------- 迷魅術 ----------
function canCharm(t) {
  if (!t || t.dead || !t.def || t.companion) return '目標無效。';
  if (t.kind !== 'monster' || t.boss || t.def.siege || t.def.captain) return t.name + ' 無法被迷魅。';
  return null;
}
function castCharm(t) {
  const p = G.player;
  const err = canCharm(t);
  if (err) { log(err, 'warn'); SFX.play('error'); return; }
  const cha = p.d.st.cha, sp = p.d.sp;
  const chance = clamp(0.5 + (p.level - t.level) * 0.06 + statMod(cha) * 0.05 + sp * 0.02 - (t.mr || 0) / 150, 0.05, 0.92);
  G.rings = G.rings || []; G.rings.push({ x: t.x, y: t.y, t: 0, r: 1.2, col: '255,140,210' });
  if (Math.random() > chance) {
    log(t.name + ' 抵抗了迷魅術！（成功率 ' + Math.round(chance * 100) + '%）', 'warn');
    t.grudge.add(p.id); t.target = p; t.state = 'chase';
    return;
  }
  const list = companions('charm');
  while (list.length >= MAX_CHARMS) revertCharm(list.shift(), null, true);
  t.orig = { faction: t.faction, kind: t.kind, aggro: t.aggro };
  Object.assign(t, { kind: 'companion', faction: 'ally', companion: 'charm', target: null, state: 'idle', path: [], aggro: true, aggroR: 7 });
  t.grudge.clear();
  t.expire = G.t + COMPANION_TIME;
  for (const a of G.map.actors) if (a.target === t) { a.target = null; a.state = 'idle'; }
  t.speak('♥', 2);
  burst(t.x, t.y, 30, '#ff9ad8', 20, 2, 0.8, 3, 3);
  SFX.play('heal');
  log(t.name + ' 被你迷住了，暫時成為你的盟友！（30 分鐘）', 'level');
}
function revertCharm(t, msg, quiet) {
  if (!t.orig) return;
  Object.assign(t, { kind: 'monster', faction: 'monster', companion: null, target: null, state: 'return', aggro: false, path: [], expire: 0 });
  t.grudge.clear(); t.orig = null; t.thinkT = 0;
  burst(t.x, t.y, 30, '#a080a0', 12, 1.5, 0.6, 2, 2);
  if (!quiet) log(msg || (t.name + ' 從迷魅中清醒過來了。'), 'sys');
  else log(t.name + ' 恢復了原本的樣子。', 'sys');
}

// ---------- 寵物 ----------
function petStats(pd) {
  const d = PETS[pd.kind], L = pd.level;
  return {
    maxHp: Math.round(d.hp + (L - 1) * d.hpLv), ac: d.ac + Math.floor(L / 3), mr: L,
    dmg: [Math.round(d.dmg[0] + (L - 1) * d.dmgLv * 0.6), Math.round(d.dmg[1] + (L - 1) * d.dmgLv)],
  };
}
function newPetData(kind, level = 1, name) {
  return { kind, name: name || PETS[kind].name, level, exp: 0, hp: null, dead: false, out: false, id: 'p' + Date.now().toString(36) + randi(100, 999) };
}
function addPetCollar(pd) {
  const p = G.player;
  if (p.inv.length >= 48) { log('背包已滿，無法放入寵物項圈。', 'warn'); return null; }
  const inst = mkItem('pet_collar', 1); inst.pet = pd;
  p.inv.push(inst); recalc(); UI.refresh();
  return inst;
}
function findCollar(pd) {
  const p = G.player;
  return p.inv.find((i) => i.pet === pd) || p.wh.find((i) => i.pet === pd);
}
function spawnPet(inst) {
  const p = G.player, pd = inst.pet, d = PETS[pd.kind], st = petStats(pd);
  if (pd.dead) { log(pd.name + ' 已經倒下了，請到寵物商人那裡復活。', 'warn'); SFX.play('error'); return; }
  const out = companions('pet');
  if (out.length) { log('一次只能帶一隻寵物出來。', 'warn'); SFX.play('error'); return; }
  const pos = G.world.nearestFree(p.x + 1, p.y + 1);
  const a = new Actor({
    x: pos.x, y: pos.y, kind: 'companion', faction: 'ally', companion: 'pet', name: pd.name, level: pd.level, maxHp: st.maxHp, ac: st.ac, mr: st.mr,
    dmg: st.dmg, atkSpd: d.atkSpd, range: d.range, proj: d.proj || null, speed: d.speed, sprite: d.sprite, aggro: true, aggroR: 7, scale: 1, look: { color: d.color },
  });
  a.pet = pd; a.hp = pd.hp ? Math.min(pd.hp, st.maxHp) : st.maxHp;
  pd.out = true;
  G.map.actors.push(a);
  burst(a.x, a.y, 20, '#ffe0a0', 16, 2, 0.6, 2.5, 2);
  log('你召喚出了寵物 ' + pd.name + '。', 'sys'); SFX.play('bark', a.x, a.y);
  return a;
}
function recallPet(a, quiet) {
  if (!a || a.dead) return;
  a.pet.hp = Math.ceil(a.hp); a.pet.out = false;
  a.dead = true; a.deadT = 9;
  burst(a.x, a.y, 20, '#ffe0a0', 12, 1.5, 0.5, 2, 2);
  if (!quiet) log('你把 ' + a.name + ' 收回了寵物項圈。', 'sys');
}
function useCollar(inst) {
  const out = companions('pet').find((a) => a.pet === inst.pet);
  if (out) recallPet(out); else spawnPet(inst);
  UI.refresh();
}
function petGainExp(a, n) {
  const pd = a.pet; if (!pd || pd.dead) return;
  pd.exp += n;
  let up = false;
  while (pd.exp >= Math.floor(expForLevel(pd.level) * 0.5) && pd.level < 60) { pd.exp -= Math.floor(expForLevel(pd.level) * 0.5); pd.level++; up = true; }
  if (up) {
    const st = petStats(pd);
    Object.assign(a, { level: pd.level, maxHp: st.maxHp, ac: st.ac, mr: st.mr, dmg: st.dmg });
    a.hp = a.maxHp;
    log('寵物 ' + pd.name + ' 升級了！現在是 ' + pd.level + ' 級。', 'level');
    burst(a.x, a.y, 20, '#ffe080', 20, 2, 1, 3, 3); SFX.play('quest');
  }
}
function onCompanionDeath(a) {
  if (a.companion === 'pet') {
    a.pet.dead = true; a.pet.out = false; a.pet.hp = 0;
    log('你的寵物 ' + a.name + ' 倒下了… 帶著項圈回村莊找寵物商人復活牠吧。', 'warn');
  } else if (a.companion === 'summon') log(a.name + ' 被擊倒，消散了。', 'sys');
  else if (a.companion === 'charm') { log('被迷魅的 ' + a.name + ' 倒下了。', 'sys'); if (a.spawner) { a.spawner.alive--; a.spawner.timer = a.spawner.respawn; } }
}
// 馴服
function tameTarget(t) {
  const p = G.player, inst = p.inv.find((i) => i.id === 'tame_jerky');
  if (!inst) { log('沒有馴獸肉乾了。', 'warn'); return; }
  if (!t || t.dead || t.type !== 'wolf' || t.companion) { log('只能馴服野外的野狼。', 'warn'); SFX.play('error'); return; }
  if (dist(p.x, p.y, t.x, t.y) > 4) { log('距離太遠了，靠近一點再試試。', 'warn'); return; }
  if (t.hp > t.maxHp * 0.5) { log('野狼還太有精神了，先削弱牠（體力低於一半）。', 'warn'); return; }
  removeItem(inst, 1);
  const chance = clamp(0.35 + statMod(p.d.st.cha) * 0.06 + p.level * 0.01, 0.1, 0.85);
  if (Math.random() > chance) { log('野狼吃掉了肉乾，但沒有被馴服…', 'warn'); t.speak('嗚嚕…', 2); return; }
  if (p.inv.length >= 48) { log('背包已滿，無法放入寵物項圈。', 'warn'); return; }
  t.dead = true; t.deadT = 9;
  if (t.spawner) { t.spawner.alive--; t.spawner.timer = t.spawner.respawn; }
  const pd = newPetData('graywolf', Math.max(1, t.level));
  const c = addPetCollar(pd);
  log('馴服成功！你得到了寵物「灰狼」。點擊背包裡的寵物項圈可以召喚或收回。', 'level');
  SFX.play('levelup');
  if (c && !companions('pet').length) spawnPet(c);
}

// ---------- 移動與傳送 ----------
function bringCompanions(fromMap, toMap) {
  const p = G.player;
  if (!fromMap || fromMap === toMap) {
    for (const a of companions()) { const q = G.world.nearestFree(p.x + rand(-1.5, 1.5), p.y + rand(-1.5, 1.5)); a.x = q.x; a.y = q.y; a.path = []; a.target = null; a.stayAt = null; }
    return;
  }
  const moving = fromMap.actors.filter((a) => a.companion && !a.dead);
  fromMap.actors = fromMap.actors.filter((a) => !moving.includes(a));
  for (const a of moving) {
    if (a.companion === 'charm' && a.spawner) { a.spawner.alive--; a.spawner.timer = a.spawner.respawn; a.spawner = null; }
    const q = toMap.world.nearestFree(p.x + rand(-1.5, 1.5), p.y + rand(-1.5, 1.5));
    a.x = q.x; a.y = q.y; a.path = []; a.target = null; a.stayAt = null; a.home = { x: q.x, y: q.y };
    toMap.actors.push(a);
  }
}

// ---------- AI ----------
function updateCompanion(a, dt) {
  const p = G.player, W = G.world;
  if (a.atkAnim >= 0) { a.atkAnim += dt / 0.45; if (a.atkAnim >= 1) a.atkAnim = -1; }
  a.atkCd -= dt; a.thinkT -= dt; a.hurtT -= dt; a.sayT -= dt; if (a.slowT > 0) a.slowT -= dt;
  if (a.expire && G.t > a.expire) { dismissCompanion(a, a.companion === 'summon' ? '召喚時間到了，' + a.name + ' 消散了。' : null); return; }
  if (a.companion === 'pet' && a.hp < a.maxHp && G.t > (a.regT || 0)) { a.regT = G.t + 3; a.hp = Math.min(a.maxHp, a.hp + Math.max(1, Math.round(a.maxHp * 0.03))); }
  const mode = petMode();
  const dp = dist(a.x, a.y, p.x, p.y);
  const hm = a.hasteT > G.t ? 1.33 : 1;
  if (hm > 1 && a.moving && Math.random() < 0.2) G.particles.push({ x: a.x, y: a.y, z: rand(4, 20), vx: 0, vy: 0, vz: 0, life: 0.3, max: 0.3, color: '#a0ffa0', size: 2 });
  // 主人太遠就瞬移過來（待命除外）
  if (!p.dead && dp > 14 && mode !== 'stay') { const q = W.nearestFree(p.x + rand(-1.5, 1.5), p.y + rand(-1.5, 1.5)); a.x = q.x; a.y = q.y; a.path = []; a.target = null; }
  const safeHere = W.isSafe(a.x, a.y) || W.isSafe(p.x, p.y);
  // 目標檢查
  if (a.target && (a.target.dead || safeHere || !isHostile(a, a.target) || !G.map.actors.includes(a.target) && a.target !== p)) a.target = null;
  if (a.target && dist(a.target.x, a.target.y, p.x, p.y) > 14 && mode !== 'stay') a.target = null;
  if (!a.target && a.thinkT <= 0 && !safeHere) {
    a.thinkT = 0.4;
    let t = null;
    if (mode === 'assist' || mode === 'free') {
      const pt = p.action && (p.action.type === 'attack' || p.action.type === 'cast') ? p.action.target : null;
      if (pt && !pt.dead && isHostile(a, pt)) t = pt;
      if (!t) { let bd = 9; for (const b of G.map.actors) if (b.target === p && !b.dead && isHostile(a, b)) { const d = dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; t = b; } } }
      if (!t && mode === 'free') { let bd = 7; for (const b of G.map.actors) { if (b === a || b.dead || b.companion) continue; const d = dist(b.x, b.y, p.x, p.y); if (d < bd && isHostile(a, b) && b.faction !== 'castle') { bd = d; t = b; } } }
    } else if (mode === 'stay') {
      // 待命：只反擊攻擊自己的敵人
      for (const b of G.map.actors) if (b.target === a && !b.dead && dist(a.x, a.y, b.x, b.y) < 3) { t = b; break; }
    }
    if (t) { a.target = t; a.state = 'chase'; }
  }
  if (a.target && mode !== 'follow') {
    const t = a.target;
    const range = a.range + (t.boss ? 0.4 : 0) + (t.struct === 'gate' ? 1.4 : t.struct ? 0.6 : 0);
    const d = dist(a.x, a.y, t.x, t.y);
    if (d <= range) { a.path = []; a.moving = false; a.face(t.x, t.y); if (a.atkCd <= 0) actorAttack(a, t); }
    else {
      if (a.thinkT <= 0 || !a.path.length) { a.thinkT = 0.45; a.path = d < 2.5 && !W.blocked(t.x, t.y) ? [{ x: t.x, y: t.y }] : Path.find(W, a.x, a.y, t.x, t.y, 800) || []; }
      a.moveAlong(dt, 1.1 * hm);
    }
    return;
  }
  a.target = null;
  // 跟隨或待命
  const anchor = mode === 'stay' ? (a.stayAt || (a.stayAt = { x: a.x, y: a.y })) : p;
  const da = dist(a.x, a.y, anchor.x, anchor.y);
  const near = mode === 'stay' ? 0.6 : 2.2;
  if (da > near + 0.8 && (a.thinkT <= 0 || !a.path.length)) {
    a.thinkT = 0.5;
    const ang = (a.id % 6) * Math.PI / 3;
    const tx = anchor.x + (mode === 'stay' ? 0 : Math.cos(ang) * 1.5), ty = anchor.y + (mode === 'stay' ? 0 : Math.sin(ang) * 1.5);
    a.path = Path.find(W, a.x, a.y, tx, ty, 900) || [];
  }
  if (a.path.length && da > near) a.moveAlong(dt, (da > 5 ? 1.4 : 1.05) * hm); else { a.moving = false; a.path = []; if (mode !== 'stay') a.face(p.x, p.y); }
}
