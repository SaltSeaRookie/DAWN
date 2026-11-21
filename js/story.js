'use strict';
// ===== 主線故事「失落的月之碑」=====
// 6 章：對話、討伐、收集、探索、喚醒石碑、頭目戰。進度存在角色存檔（p.story）。
// 故事 NPC：晨風村的學者艾德溫（scholar）、林語村的長老菲恩（elder）、月影遺跡的月之守護靈（spirit）。
const STORY_NPCS = {
  scholar: { name: '艾德溫', title: '流浪學者', look: { body: '#4a5a3a', robe: true, hair: '#8a7a6a', beard: '#8a7a6a', skin: '#e0c0a0', trim: '#c0a060', weapon: 'staff' } },
  elder:   { name: '菲恩', title: '林語村長老', look: { body: '#3a5a3a', robe: true, hair: '#e0e0e0', longHair: true, beard: '#e0e0e0', skin: '#e8c8a8', trim: '#a0c070', weapon: 'staff' } },
  spirit:  { name: '月之守護靈', title: '遺跡的守護者', look: { body: '#c8d0ff', robe: true, hair: '#f0f4ff', longHair: true, skin: '#e8ecff', trim: '#a0b0ff' } },
};
const STORY = [
  { title: '第一章　月光下的異象', steps: [
    { type: 'talk', npc: 'scholar', obj: '與晨風村的流浪學者艾德溫交談',
      lines: ['冒險者，你有注意到嗎？最近幾個晚上，月亮旁邊多了一圈紫色的光暈。', '我是研究古代文明的學者艾德溫。上個月我在骸骨荒原找到一塊刻著文字的碎石——那是「月之碑」的碎片。', '傳說月之碑封印著某種東西。如果碑真的碎了……那圈紫光就說得通了。', '骸骨荒原的骷髏身上常常帶著從古墓裡挖出來的東西。可以幫我找回三塊碎片嗎？'] },
    { type: 'collect', item: 'moon_shard', count: 3, from: ['skeleton', 'skeleton_archer'], chance: 0.35, obj: '在骸骨荒原擊敗骷髏，收集月之碑碎片', where: 'bone' },
    { type: 'talk', npc: 'scholar', take: { moon_shard: 3 }, obj: '把月之碑碎片帶回給艾德溫',
      lines: ['真的是月之碑！你看這裡——「當月光被吞噬，影之王將從長眠中醒來」。', '碎片上還有另一段文字，提到「林中守望者」。林語村的長老菲恩年輕時是有名的精靈語學者，他也許看得懂。', '這些報酬請收下。拜託你去林語村跑一趟！'], reward: { exp: 2500, gold: 3000, items: [['clear_potion', 5]] } },
  ] },
  { title: '第二章　林中守望者', steps: [
    { type: 'talk', npc: 'elder', obj: '前往林語村拜訪長老菲恩',
      lines: ['艾德溫那小子派你來的？……讓我看看那段文字。', '「林中守望者」指的是古代精靈在幽影森林裡留下的石門守衛。那扇門通往「月影遺跡」——精靈曾經在那裡祭祀月亮。', '但最近森林裡的蜘蛛突然變得很兇暴，連獵人都不敢進去。我懷疑跟那圈紫光有關。', '先幫村子清掉幽影森林的巨型蜘蛛吧，我才能放心帶你去找那扇門。'] },
    { type: 'kill', mon: 'spider', count: 8, obj: '清除幽影森林的巨型蜘蛛', where: 'forest' },
    { type: 'talk', npc: 'elder', obj: '回報長老菲恩',
      lines: ['做得好，村裡的獵人總算能出門了。', '蜘蛛會發狂，是因為守護石門的樹精被黑影纏住了。牠原本是森林的守護者……現在卻在散播詛咒。', '石門在幽影森林最深處。去吧，解放那個可憐的樹精。'], reward: { exp: 5000, gold: 4000, items: [['orange_potion', 20]] } },
  ] },
  { title: '第三章　被束縛的森林', steps: [
    { type: 'reach', map: 'overworld', at: 'moonGate', r: 6, obj: '前往幽影森林深處的古老石門', spawn: 'shadow_treant',
      say: '一股寒意從腳底竄上來……樹林深處傳來木頭扭曲的聲音！' },
    { type: 'kill', mon: 'shadow_treant', count: 1, obj: '擊敗被黑影纏住的影縛樹精', where: 'moonGate' },
    { type: 'talk', npc: 'elder', obj: '把好消息告訴長老菲恩', give: { moon_key: 1 },
      lines: ['樹精倒下的時候，留下了這個？……這是「月之鑰」！', '傳說只有被守護者認可的人，才能拿到這把鑰匙。看來森林選擇了你。', '用它打開月影之門吧。艾德溫說得沒錯——影之王就快醒了，我們沒有時間了。'], reward: { exp: 9000, gold: 6000, items: [['bea_scroll', 1]] } },
  ] },
  { title: '第四章　月影之門', steps: [
    { type: 'reach', map: 'moonruins', at: 'entry', r: 8, obj: '用月之鑰打開幽影森林的月影之門，進入月影遺跡',
      say: '穿過石門的瞬間，四周安靜得連風聲都消失了。紫色的月光灑在倒塌的石柱上——這裡就是月影遺跡。' },
    { type: 'talk', npc: 'spirit', obj: '與遺跡入口的月之守護靈交談',
      lines: ['……你身上有月之鑰的氣息。好久沒有凡人來到這裡了。', '我是這座遺跡最後的守護靈。千年前，精靈們用三座「月之碑」封印了蝕月之主——吞噬月光的影之王。', '但碑上的月光越來越弱，三座碑都快熄滅了。封印一旦完全消失，牠就會帶著永夜回到你們的世界。', '請你喚醒三座月之碑。只要碰觸它們、讓月光重新流動就行——但要小心，蝕月之主的僕從一直守在碑旁。'], reward: { exp: 8000, gold: 5000 } },
  ] },
  { title: '第五章　三座月之碑', steps: [
    { type: 'activate', count: 3, obj: '喚醒遺跡中的三座月之碑（點擊石碑）' },
    { type: 'talk', npc: 'spirit', obj: '回到月之守護靈身邊',
      lines: ['我感覺到了……三座碑的月光重新連在一起了。', '可是，月光一流動，祭壇那邊的黑暗就騷動了起來。蝕月之主知道封印要被修好，牠打算在封印完成之前破封而出。', '這是唯一的機會。趁牠還沒恢復全部的力量，去遺跡東北方的月之祭壇，打倒牠！'], reward: { exp: 12000, gold: 8000, items: [['clear_potion', 10]] } },
  ] },
  { title: '第六章　蝕月', steps: [
    { type: 'kill', mon: 'eclipse_lord', count: 1, spawnAt: 'altar', obj: '在月之祭壇擊敗蝕月之主', where: 'altar' },
    { type: 'talk', npc: 'spirit', obj: '向月之守護靈報告',
      lines: ['紫色的光暈……消失了。月光又回到了祭壇上。', '謝謝你，勇敢的冒險者。精靈們等了一千年，終於等到能守住月光的人。', '蝕月之主的影子不會完全消散，牠還會在祭壇上一次又一次地凝聚。但只要三座碑還亮著，牠就再也無法離開這座遺跡。', '回去告訴那位學者吧——他的研究拯救了你們的世界。'], reward: { exp: 15000, gold: 10000 } },
    { type: 'talk', npc: 'scholar', obj: '回到晨風村，把一切告訴艾德溫',
      lines: ['你回來了！昨晚月亮旁邊的紫光突然消失了，我就知道一定是你！', '……蝕月之主、月之守護靈、千年前的封印。這些故事，我要好好寫下來，讓後人知道。', '這條月光項鍊是我在遺跡研究時找到的，現在它屬於你了。', '冒險者，謝謝你。晨曦大陸的月光，從今以後會一直亮著。'], reward: { exp: 30000, gold: 20000, items: [['moonlight_amulet', 1], ['exp_scroll', 2]] }, final: true },
  ] },
];

const Story = {
  st() { const p = G.player; if (!p.story) p.story = { ch: 0, step: 0, n: 0, steles: [], done: false }; return p.story; },
  cur() { const s = this.st(); if (s.done) return null; const C = STORY[s.ch]; return C ? C.steps[s.step] : null; },
  done() { return !!(G.player && G.player.story && G.player.story.done); },
  // 是否已經可以進入月影遺跡（拿到月之鑰之後）
  ruinsOpen() { const s = this.st(); return s.done || s.ch >= 3; },
  steleLit(k) { return G.player && G.player.story && (G.player.story.done || (G.player.story.steles || []).includes(k)); },
  objText() {
    const st = this.cur(); if (!st) return null;
    let t = st.obj;
    if (st.type === 'collect') t += '（' + Math.min(countItem(st.item), st.count) + ' / ' + st.count + '）';
    if (st.type === 'kill' && st.count > 1) t += '（' + this.st().n + ' / ' + st.count + '）';
    if (st.type === 'activate') t += '（' + this.st().steles.length + ' / ' + st.count + '）';
    return t;
  },
  // 進到下一步
  advance() {
    const s = this.st(), C = STORY[s.ch];
    s.step++; s.n = 0;
    if (s.step >= C.steps.length) {
      s.ch++; s.step = 0;
      if (s.ch >= STORY.length) { s.done = true; this.finish(); }
      else { log('📖 ' + STORY[s.ch].title, 'level'); SFX.play('quest'); this.banner(STORY[s.ch].title); }
    }
    this.onStepStart();
    UI.refresh(); this.renderTrack(); saveGame(true);
  },
  onStepStart() {
    const st = this.cur(); if (!st) return;
    if (st.type === 'collect') { if (countItem(st.item) >= st.count) log('你已經有足夠的' + ITEMS[st.item].name + '了。', 'quest'); }
    log('📖 目標：' + this.objText(), 'quest');
  },
  banner(text) { if (typeof UI.zone === 'function') { const b = $('#zoneBanner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); } },
  reward(r) {
    if (!r) return;
    const p = G.player;
    if (r.gold) { p.gold += r.gold; }
    if (r.exp) gainExp(r.exp);
    for (const [id, n] of r.items || []) addItem(id, n, 0, true);
    log('📖 獲得獎勵：' + [r.exp ? '經驗 ' + r.exp.toLocaleString() : '', r.gold ? '金幣 ' + r.gold.toLocaleString() : '', ...(r.items || []).map(([id, n]) => ITEMS[id].name + (n > 1 ? ' ×' + n : ''))].filter(Boolean).join('、'), 'loot');
    SFX.play('coin');
  },
  finish() {
    const p = G.player;
    p.title = '月光守護者';
    log('★★ 主線故事「失落的月之碑」完成！你獲得了稱號「月光守護者」。月影遺跡的蝕月之主會定期在祭壇重生。', 'level');
    SFX.play('levelup');
    // 之後蝕月之主會在祭壇定期重生
    const m = G.maps.moonruins;
    if (m && !m.spawners.some((sp) => sp.type === 'eclipse_lord')) m.spawners.push({ type: 'eclipse_lord', x: m.world.altar.x, y: m.world.altar.y, max: 1, alive: 0, timer: 60, respawn: MONSTERS.eclipse_lord.respawn });
  },
  // ---------- 事件 ----------
  talk(npc) {
    const st = this.cur(), key = npc.storyKey, D = STORY_NPCS[key];
    if (st && st.type === 'talk' && st.npc === key) {
      if (st.take) for (const id in st.take) if (countItem(id) < st.take[id]) { UI.openStoryDialog(npc, ['你還沒有帶齊東西喔。（需要' + ITEMS[id].name + ' ×' + st.take[id] + '）']); return; }
      UI.openStoryDialog(npc, st.lines, () => {
        if (st.take) for (const id in st.take) { let need = st.take[id]; for (const inst of G.player.inv.filter((i) => i.id === id)) { const q = Math.min(need, inst.qty); removeItem(inst, q); need -= q; if (!need) break; } }
        if (st.give) for (const id in st.give) addItem(id, st.give[id], 0, true);
        this.reward(st.reward);
        this.advance();
      });
      return;
    }
    // 閒聊：提示目前的目標
    const idle = {
      scholar: this.done() ? ['月光一直亮著呢。我正在把你的冒險寫成一本書！'] : this.st().ch === 0 ? ['骸骨荒原的骷髏身上也許有月之碑碎片……'] : ['長老菲恩那邊有消息了嗎？我還在研究碑文。'],
      elder: this.done() ? ['森林又恢復平靜了，這都要感謝你。'] : this.st().ch < 1 ? ['年輕人，有事嗎？林語村歡迎你。'] : ['月影之門就在幽影森林最深處。小心行事。'],
      spirit: this.done() ? ['三座月之碑的光芒會一直守護這裡。歡迎你隨時回來。'] : ['月之碑的光芒越來越弱了……拜託你。'],
    }[key] || ['……'];
    UI.openStoryDialog(npc, idle);
  },
  hasTalk(npc) { const st = this.cur(); return !!(st && st.type === 'talk' && st.npc === npc.storyKey); },
  onKill(a) {
    const st = this.cur(); if (!st || !a.def) return;
    const s = this.st();
    if (st.type === 'kill' && a.type === st.mon) {
      s.n++;
      if (s.n >= st.count) { log('📖 目標達成：' + st.obj, 'quest'); this.advance(); }
      else this.renderTrack();
    } else if (st.type === 'collect' && st.from.includes(a.type) && countItem(st.item) < st.count && Math.random() < st.chance) {
      addItem(st.item, 1, 0, true);
      log('📖 獲得了 ' + ITEMS[st.item].name + '（' + countItem(st.item) + ' / ' + st.count + '）', 'quest'); SFX.play('quest');
      if (countItem(st.item) >= st.count) { log('📖 目標達成：' + st.obj, 'quest'); this.advance(); }
      else this.renderTrack();
    }
  },
  // 點擊月之碑
  activateStele(k) {
    const s = this.st(), st = this.cur();
    if (this.steleLit(k)) { log('月之碑散發著柔和的光芒。', 'sys'); return; }
    if (!st || st.type !== 'activate') { log('石碑上的文字幾乎看不見了，月光非常微弱……', 'sys'); return; }
    const W = G.world, p = G.player;
    // 守衛：喚醒時會有僕從出現
    if (!s.guarded) s.guarded = [];
    if (!s.guarded.includes(k)) {
      s.guarded.push(k);
      log('石碑開始發光——黑暗中的守衛被驚動了！先擊退牠們！', 'warn'); SFX.play('roar');
      for (const t of ['ruin_golem', 'moon_wraith', 'eclipse_knight']) { const q = W.nearestFree(W.steles[k].x + rand(-3, 3), W.steles[k].y + rand(-3, 3)); const m = makeMonster(t, q.x, q.y); m.home = { x: q.x, y: q.y }; m.target = p; m.state = 'chase'; m.steleGuard = k; G.map.actors.push(m); burst(m.x, m.y, 30, '#a080ff', 20, 2, 0.7); }
      return;
    }
    if (G.map.actors.some((a) => a.steleGuard === k && !a.dead)) { log('還有守衛在石碑旁邊！', 'warn'); return; }
    s.steles.push(k);
    G.rings = G.rings || []; G.rings.push({ x: W.steles[k].x, y: W.steles[k].y, t: 0, r: 4, col: '180,210,255' });
    burst(W.steles[k].x, W.steles[k].y, 40, '#d8e8ff', 40, 3, 1.2, 3, 4); SFX.play('levelup');
    log('📖 月之碑甦醒了！（' + s.steles.length + ' / ' + st.count + '）', 'quest');
    if (s.steles.length >= st.count) this.advance(); else this.renderTrack();
  },
  tick(dt) {
    if (!G.player) return;
    G.storyT = (G.storyT || 0) - dt; if (G.storyT > 0) return;
    G.storyT = 0.5;
    const st = this.cur(); if (!st) return;
    const W = G.world, p = G.player;
    if (st.type === 'reach' && G.map.id === st.map) {
      const t = W[st.at]; if (!t) return;
      if (dist(p.x, p.y, t.x, t.y) < st.r) {
        if (st.say) log(st.say, 'level');
        if (st.spawn && !G.map.actors.some((a) => a.type === st.spawn && !a.dead)) {
          const q = W.nearestFree(t.x + 3, t.y + 3); const m = makeMonster(st.spawn, q.x, q.y); m.home = { x: q.x, y: q.y }; m.target = p; m.state = 'chase'; G.map.actors.push(m);
          burst(m.x, m.y, 40, '#6a3aa0', 40, 3, 1, 3, 4); shake(6); SFX.play('roar');
        }
        this.advance();
      }
    }
    // 第六章：在祭壇召喚蝕月之主
    if (st.type === 'kill' && st.spawnAt && G.map.id === 'moonruins' && !G.map.actors.some((a) => a.type === st.mon && !a.dead)) {
      const t = W[st.spawnAt];
      if (dist(p.x, p.y, t.x, t.y) < 16) {
        const m = makeMonster(st.mon, t.x, t.y); m.home = { x: t.x, y: t.y }; G.map.actors.push(m);
        log('蝕月之主：「區區凡人，也想再次封印我？月光終將被吞噬！」', 'warn'); SFX.play('roar'); shake(8);
      }
    }
    // 影縛樹精如果不見了（例如離開地圖），回到石門時重新出現
    if (st.type === 'kill' && st.mon === 'shadow_treant' && G.map.id === 'overworld' && W.moonGate && dist(p.x, p.y, W.moonGate.x, W.moonGate.y) < 10 && !G.map.actors.some((a) => a.type === 'shadow_treant' && !a.dead)) {
      const q = W.nearestFree(W.moonGate.x + 3, W.moonGate.y + 3); const m = makeMonster('shadow_treant', q.x, q.y); m.home = { x: q.x, y: q.y }; G.map.actors.push(m);
    }
  },
  // 目前目標在地圖上的位置（小地圖與世界地圖標示）
  target() {
    const st = this.cur(); if (!st) return null;
    const ow = getMap('overworld').world;
    if (st.type === 'talk') { const n = st.npc === 'spirit' ? { map: 'moonruins', ...getMap('moonruins').world.spiritSpot } : null; if (n) return n; const t = ow.towns.find((t) => t.id === (st.npc === 'scholar' ? 'dawn' : 'leaf')); return t && { map: 'overworld', x: t.x, y: t.y }; }
    if (st.type === 'reach') return { map: st.map, ...(st.map === 'overworld' ? ow : getMap(st.map).world)[st.at] };
    if (st.where === 'moonGate') return ow.moonGate && { map: 'overworld', ...ow.moonGate };
    if (st.where === 'altar') return { map: 'moonruins', ...getMap('moonruins').world.altar };
    if (st.type === 'activate') { const W = getMap('moonruins').world; const k = [0, 1, 2].find((i) => !this.steleLit(i)); return k !== undefined ? { map: 'moonruins', ...W.steles[k] } : null; }
    if (st.where === 'bone' || st.where === 'forest') { const b = st.where === 'bone' ? BIOME.BONE : BIOME.FOREST; const pl = ow.places.find((x) => ow.biomeAt(x.x, x.y) === b); return pl && { map: 'overworld', x: pl.x, y: pl.y }; }
    return null;
  },
  renderTrack() {
    const el2 = document.getElementById('storyTrack'); if (!el2 || !G.player) return;
    const s = this.st();
    if (s.done) { el2.style.display = 'none'; return; }
    el2.style.display = 'block';
    el2.innerHTML = '<b>📖 ' + STORY[s.ch].title + '</b><span>' + esc(this.objText() || '') + '</span>';
  },
};

// 劇情道具不能販賣、丟棄、交易
function isQuestItem(inst) { return ITEMS[inst.id] && ITEMS[inst.id].type === 'quest'; }

// ===== 介面 =====
Object.assign(UI, {
  openStoryDialog(npc, lines, onDone) {
    this.close('story');
    const w = this.win('story', npc.name + '・' + (npc.title || ''), window.innerWidth / 2 - 230, 70, 460);
    let i = 0;
    const show = () => {
      w.body.innerHTML = '';
      const box = el('div', 'storybox');
      box.appendChild(el('div', 'story-speaker', esc(npc.name)));
      box.appendChild(el('div', 'story-text', esc(lines[i])));
      w.body.appendChild(box);
      const row = el('div', 'btnrow story-btns');
      row.appendChild(el('span', 'dim small', (i + 1) + ' / ' + lines.length));
      const b = el('button', 'btn', i < lines.length - 1 ? '繼續 ▶' : onDone ? '好的' : '關閉');
      b.onclick = () => { SFX.play('click'); if (i < lines.length - 1) { i++; show(); } else { this.close('story'); if (onDone) onDone(); } };
      row.appendChild(b);
      w.body.appendChild(row);
    };
    show();
    if (npc.face) npc.face(G.player.x, G.player.y);
  },
  // 故事回顧（點擊追蹤欄）
  openJournal() {
    this.close('journal');
    const w = this.win('journal', '冒險日誌・失落的月之碑', 16, 60, 380);
    const s = Story.st();
    const list = el('div', 'list');
    STORY.forEach((C, k) => {
      const state = s.done || k < s.ch ? 'done' : k === s.ch ? 'now' : 'locked';
      const row = el('div', 'li journal-' + state);
      row.appendChild(el('div', 'li-n', '<b>' + (state === 'done' ? '✓ ' : state === 'now' ? '▶ ' : '🔒 ') + C.title + '</b><span class="dim">' + (state === 'now' ? esc(Story.objText() || '') : state === 'done' ? '已完成' : '尚未開始') + '</span>'));
      list.appendChild(row);
    });
    w.body.appendChild(list);
    w.body.appendChild(el('div', 'dim small', s.done ? '你已經完成了主線故事。蝕月之主會定期在月影遺跡的祭壇重生，可以再次挑戰。' : '小地圖與世界地圖上的 ★ 是目前目標的位置。故事從晨風村的流浪學者艾德溫開始。'));
  },
});

document.addEventListener('DOMContentLoaded', () => { const t = document.getElementById('storyTrack'); if (t) t.addEventListener('click', () => UI.openJournal()); });
