'use strict';
// ===== 冒險者的生活：練功 → 補給 → 存倉庫 → 休息聊天 → 再出發 =====
// 狀態：hunt 練功・travel 走回村莊・errand 辦事（買藥、存倉庫）・rest 在篝火旁休息・leave 找傳送師出發
const LIFE_LINES = {
  goHome: ['藥水用完了，先回村補給。', '包包滿了，回去整理一下～', '練了好久，回村休息一下', '快沒水了，撤！'],
  general: ['老闆，紅水給我來 20 瓶！', '藍水也補一點', '再買幾張回村卷軸'],
  coral: ['老闆，橙水給我來 10 瓶！', '珍珠收嗎？'],
  warehouse: ['這些先寄放一下。', '倉庫又快滿了…', '戰利品先存起來'],
  leave: ['麻煩送我去練功的地方～', '休息夠了，出發！', '再去打一輪！'],
  scroll: ['（使用了回村卷軸）'],
};
const SOCIAL = [
  ['今天打了好多骷髏，手好痠', '辛苦了！我剛從森林回來'], ['有人要組隊打飛龍嗎？', '我裝備還不夠，下次吧'],
  ['剛剛衝 +7 成功了！', '恭喜！請客請客'], ['剛剛衝裝爆了…', '節哀…下次會更好'], ['峽谷的蜥蜴人好痛', '多帶點橙水就好'],
  ['墓穴領主掉了星辰法杖！', '真的假的！好羨慕'], ['聽說灰岩城要攻城了', '我們血盟也想參加'], ['翡翠群島的海盜好兇', '海盜船長我打不過…'],
  ['你的寵物好可愛', '是雪狐喔，速度很快'], ['紅水又漲價了嗎？', '沒有啦，是你買太多'], ['晚上荒原好可怕', '開照明術就好多了'],
  ['你幾級了？', '快 20 了，你呢？'], ['要不要一起去沙漠？', '好啊，休息完就走'], ['今天天氣真好', '適合出去練功！'],
];

function initLife(a) {
  a.life = { state: 'hunt', pots: randi(4, 10), bag: 0, huntT: rand(90, 240), field: { x: a.x, y: a.y }, t: 0, task: null };
}
function lifeSay(a, line) {
  if (!line) return;
  a.speak(line, 4);
  const p = G.player;
  if (p && dist(a.x, a.y, p.x, p.y) < 14) UI.log(a.name + '：' + line, 'chat');
}
function nearestTown(a) {
  const ts = G.world.towns; if (!ts.length) return null;
  return ts.slice().sort((x, y) => dist(x.x, x.y, a.x, a.y) - dist(y.x, y.y, a.x, a.y))[0];
}
function lifeTeleport(a, x, y) {
  burst(a.x, a.y, 20, '#9fd0ff', 12, 1.5, 0.6, 2, 3);
  const q = G.world.nearestFree(x, y); a.x = q.x; a.y = q.y; a.path = [];
  burst(a.x, a.y, 20, '#9fd0ff', 12, 1.5, 0.6, 2, 3);
}
function lifeStartReturn(a, far) {
  const L = a.life, t = nearestTown(a); if (!t) return;
  L.town = t; L.t = 0; L.task = null;
  a.target = null; a.aggro = false; a.path = []; a.state = 'idle';
  if (!far) lifeSay(a, pick(LIFE_LINES.goHome));
  if (far || dist(a.x, a.y, t.x, t.y) > 40) {
    lifeTeleport(a, t.x + rand(-t.r + 3, t.r - 3), t.y + rand(-t.r + 3, t.r - 3));
    L.state = 'errand'; L.queue = lifeQueue(a);
  } else L.state = 'travel';
}
function lifeQueue(a) {
  const L = a.life, q = [];
  if (L.pots < 6) q.push(L.town.id === 'coral' ? 'coral' : 'general');
  if (L.bag > 0) q.push('warehouse');
  q.push('rest');
  return q;
}
function lifeWalk(a, x, y, dt, near = 1.2) {
  const d = dist(a.x, a.y, x, y);
  if (d <= near) { a.moving = false; a.path = []; return true; }
  a.lifeRepath = (a.lifeRepath || 0) - dt;
  if (!a.path.length || a.lifeRepath <= 0) { a.lifeRepath = 2; a.path = Path.find(G.world, a.x, a.y, x, y, 3000) || []; }
  a.moveAlong(dt, 0.9);
  return false;
}
function lifeBackToField(a) {
  const L = a.life;
  lifeTeleport(a, L.field.x, L.field.y);
  Object.assign(L, { state: 'hunt', huntT: rand(120, 260), t: 0, task: null, queue: null });
  a.aggro = true; a.home = { x: a.x, y: a.y }; a.hp = a.maxHp;
}
// 回傳 true 表示這一格已處理完移動，主 AI 不再處理
function lifeUpdate(a, dt, far) {
  const L = a.life; if (!L || a.dead) return false;
  if (L.state === 'hunt') {
    L.huntT -= dt;
    if (!a.target && (L.pots <= 0 || L.bag >= 8 || L.huntT <= 0)) { lifeStartReturn(a, far); return true; }
    // 撿附近的戰利品（掉落 6 秒後，讓玩家優先撿）
    if (!a.target && !far) {
      let best = null, bd = 3.5;
      for (const it of G.map.items) { if (it.t < 6) continue; const d = dist(a.x, a.y, it.x, it.y); if (d < bd) { bd = d; best = it; } }
      if (best) {
        if (lifeWalk(a, best.x, best.y, dt, 0.6)) { const k = G.map.items.indexOf(best); if (k >= 0) { G.map.items.splice(k, 1); L.bag++; } }
        return true;
      }
    }
    return false;
  }
  if (a.target) return false;               // 被攻擊時照常反擊
  if (!L.town) { L.town = nearestTown(a); if (!L.town) { lifeBackToField(a); return true; } }
  L.t += dt;
  if (far) { if (L.t > 50) lifeBackToField(a); return true; }   // 不在畫面附近就簡化處理
  const t = L.town;
  switch (L.state) {
    case 'travel':
      if (dist(a.x, a.y, t.x, t.y) < t.r - 2) { L.state = 'errand'; L.queue = lifeQueue(a); L.t = 0; break; }
      lifeWalk(a, t.x, t.y, dt, t.r - 2.5);
      if (L.t > 90) { lifeTeleport(a, t.x + 1, t.y + 1); }
      break;
    case 'errand': {
      if (!L.task) {
        L.task = L.queue.shift(); L.wait = 0;
        if (!L.task) { L.state = 'rest'; break; }
        if (L.task === 'rest') { L.state = 'rest'; L.task = null; const a2 = Math.random() * 7, r = rand(2, 4); L.spot = G.world.nearestFree(t.x + Math.cos(a2) * r, t.y + Math.sin(a2) * r); L.restT = rand(30, 70); break; }
        L.npc = G.map.npcs.find((n) => n.role === L.task && n.town === t.id);
        if (!L.npc) { L.task = null; break; }
      }
      if (lifeWalk(a, L.npc.x, L.npc.y, dt, 1.7)) {
        a.face(L.npc.x, L.npc.y);
        if (L.wait === 0) lifeSay(a, pick(LIFE_LINES[L.task] || ['…']));
        L.wait += dt;
        if (L.wait > 2.5) {
          if (L.task === 'general' || L.task === 'coral') { const n = randi(10, 16) - L.pots; L.pots += n; castleTax(n * 25, 'trade'); }
          if (L.task === 'warehouse') { castleTax(L.bag * randi(40, 90), 'trade'); L.bag = 0; }
          L.task = null;
        }
      }
      break;
    }
    case 'rest':
      if (!L.spot) { L.spot = G.world.nearestFree(t.x + rand(-3, 3), t.y + rand(-3, 3)); L.restT = rand(30, 70); }
      if (lifeWalk(a, L.spot.x, L.spot.y, dt, 0.7)) {
        L.resting = true; a.face(t.x, t.y);
        a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.05 * dt);
        L.restT -= dt;
        if (L.restT <= 0) {
          L.resting = false; L.state = 'leave'; L.t = 0;
          L.npc = G.map.npcs.find((n) => n.role === 'teleport' && n.town === t.id) || G.map.npcs.find((n) => n.town === t.id);
        }
      }
      break;
    case 'leave':
      if (!L.npc || lifeWalk(a, L.npc.x, L.npc.y, dt, 1.7) || L.t > 40) {
        if (!L.said) { L.said = true; lifeSay(a, pick(LIFE_LINES.leave)); L.t = 37; }
        else if (L.t > 39) { L.said = false; lifeBackToField(a); }
      }
      break;
  }
  return true;
}
// 篝火旁的閒聊
function socialTick(dt) {
  G.socialT = (G.socialT || 6) - dt;
  if (G.socialT > 0) return;
  G.socialT = rand(7, 13);
  const p = G.player;
  const resting = G.map.actors.filter((a) => a.life && a.life.resting && !a.dead && dist(a.x, a.y, p.x, p.y) < 16);
  if (!resting.length) return;
  const A = pick(resting);
  const others = G.map.actors.filter((b) => b !== A && !b.dead && (b.kind === 'villager' || (b.life && b.life.resting)) && dist(A.x, A.y, b.x, b.y) < 7);
  const pair = pick(SOCIAL);
  lifeSay(A, pair[0]);
  if (others.length) { const B = pick(others); B.face(A.x, A.y); A.face(B.x, B.y); later(1.8, () => { if (!B.dead) lifeSay(B, pair[1]); }); }
}
