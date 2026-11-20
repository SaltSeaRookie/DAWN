'use strict';
// ===== 血盟：等級、資金、職位、公告、盟頻、成員管理 =====
// 升到下一級需要的累積資金（索引＝目前等級）
const CLAN_FUND = [0, 5000, 15000, 35000, 70000, 120000, 200000, 320000, 500000, 800000];
const CLAN_MAX_LV = 10;
const CLAN_RANKS = { vice: '副盟主', elite: '精英', member: '成員' };
const RANK_ORDER = { vice: 0, elite: 1, member: 2 };
const CLAN_LINES = [
  '盟主好！', '我在峽谷練功中～', '有人要一起打墓穴嗎？', '剛剛撿到一把好劍！', '今天也要加油喔', '紅水快用完了…',
  '有沒有人要組隊？', '我升級了！', '晚點一起去攻城吧', '血盟越來越熱鬧了', '我先去倉庫整理一下', '盟主辛苦了～',
];

function clanOf() { const p = G.player; return p && p.clan; }
function normalizeClan(c) {
  if (!c) return c;
  c.level = c.level || 1; c.fund = c.fund || 0; c.notice = c.notice || '';
  for (const m of c.members) { m.rank = m.rank || 'member'; m.joined = m.joined || Date.now(); m.contrib = m.contrib || 0; }
  return c;
}
function clanLevel() { const c = clanOf(); return c ? c.level || 1 : 0; }
function clanCap() {
  const p = G.player, cha = (p.d.st || p.base).cha;
  return 5 + Math.floor(cha / 2) + (clanLevel() - 1) * 3;
}
function clanExpMul() { const L = clanLevel(); return (L > 1 ? 1 + (L - 1) * 0.02 : 1) + (ownsCastle() ? 0.1 : 0); }
function clanCallCount() { return 3 + Math.floor(clanLevel() / 3); }
function clanCallCooldown() { return Math.max(120, 300 - (clanLevel() - 1) * 20); }
function clanPerks(L) {
  return [
    '成員上限 ' + (5 + (L - 1) * 3) + '＋魅力÷2',
    '狩獵經驗 +' + ((L - 1) * 2) + '%',
    '召集盟友 ' + (3 + Math.floor(L / 3)) + ' 人、冷卻 ' + Math.max(120, 300 - (L - 1) * 20) + ' 秒',
    '攻城集結 ' + (6 + L) + ' 人、盟友等級 +' + (L - 1),
  ];
}
function clanLog(text) { UI.log('[血盟] ' + text, 'clan'); }

function createClan(name, emblem) {
  const p = G.player;
  if (p.clan) return '你已經有血盟了。';
  if (p.level < 5) return '需要等級 5 才能建立血盟。';
  if (p.gold < 3000) return '建立血盟需要 3000 金幣。';
  if (!name || name.length < 2 || name.length > 8) return '血盟名稱需為 2～8 個字。';
  if (worldClanNames().includes(name) || name === ENEMY_CLAN || name === '灰岩騎士團') return '這個名稱已經被使用了。';
  p.gold -= 3000;
  p.clan = normalizeClan({ name, emblem, members: [], founded: Date.now() });
  log('血盟「' + name + '」成立了！你是血盟的盟主。', 'level'); SFX.play('quest');
  saveGame(true); UI.refresh();
  return null;
}
function recruit(v) {
  const p = G.player, c = clanOf();
  if (!c) return '你還沒有血盟。';
  if (v.clan === c.name) return v.name + ' 已經是你的血盟成員了。';
  const poach = !!v.clan;
  if (c.members.length >= clanCap()) return '血盟人數已達上限（' + clanCap() + ' 人）。提升血盟等級或魅力可以增加上限。';
  if (v.refuseT && G.t < v.refuseT) return v.name + ' 不想再談這件事了。';
  const cha = p.d.st.cha;
  let chance = clamp(0.35 + (cha - 10) * 0.06 + p.level * 0.01 + (clanLevel() - 1) * 0.03 + (ownsCastle() ? 0.1 : 0) + (p.align >= 500 ? 0.1 : p.align < 0 ? -0.25 : 0), 0.05, 0.92);
  if (poach) chance = clamp(chance * 0.45 + (clanLevel() - 1) * 0.04 + (ownsCastle() ? 0.15 : 0), 0.03, 0.7);
  if (Math.random() < chance) {
    const old = v.clan;
    v.clan = c.name; v.emblem = c.emblem; v.clanMember = true;
    if (poach) later(0.8, () => log(v.name + '：我決定離開「' + old + '」，加入你們！', 'chat'));
    c.members.push({ name: v.name, cls: v.cls, level: v.level, look: v.look, rank: 'member', joined: Date.now(), contrib: 0 });
    Names.add(v.name);
    v.speak('好啊！以後請多指教！', 4);
    log(v.name + ' 加入了血盟「' + c.name + '」！', 'level'); SFX.play('quest');
    later(1.5, () => { const cc = clanOf(); if (cc && cc.members.some((x) => x.name === v.name)) clanLog(v.name + '：大家好，請多指教！'); });
    saveGame(true); UI.refresh();
    return null;
  }
  v.refuseT = G.t + 60;
  v.speak(poach ? pick(['我對「' + v.clan + '」很有感情…', '我的盟主對我很好，抱歉。', '除非你們拿下灰岩城…']) : pick(['再考慮看看吧…', '我還是喜歡一個人。', '你的血盟有什麼好處？', '等你的血盟再大一點吧。']), 4);
  return v.name + ' 拒絕了你的邀請。';
}
function memberActors(name) {
  const out = [];
  for (const id in G.maps) for (const a of G.maps[id].actors) if (a.name === name && !a.dead && a.kind !== 'monster') out.push(a);
  return out;
}
function kickMember(name) {
  const c = clanOf(); if (!c) return;
  const k = c.members.findIndex((m) => m.name === name); if (k < 0) return;
  c.members.splice(k, 1);
  for (const a of memberActors(name)) {
    if (a.kind === 'ally') { a.dead = true; a.deadT = 9; continue; }
    a.clan = null; a.emblem = null; a.clanMember = false;
    a.speak(pick(['什麼！我被踢了？', '哼，我才不稀罕。', '好吧…保重了。']), 4);
  }
  log(name + ' 被逐出了血盟。', 'warn');
  clanLog(name + ' 離開了血盟。');
  saveGame(true); UI.refresh();
}
function setRank(name, rank) {
  const c = clanOf(), m = c && c.members.find((x) => x.name === name); if (!m) return;
  if (rank === 'vice' && c.members.filter((x) => x.rank === 'vice').length >= 2) { log('副盟主最多 2 位。', 'warn'); return; }
  m.rank = rank;
  clanLog(name + ' 的職位變更為「' + CLAN_RANKS[rank] + '」。');
  UI.refresh();
}
function donateClan(amount) {
  const p = G.player, c = clanOf(); if (!c) return '你沒有血盟。';
  amount = Math.floor(amount);
  if (!(amount > 0)) return '請輸入正確的金額。';
  if (p.gold < amount) return '金幣不足。';
  p.gold -= amount; c.fund += amount;
  clanLog(p.name + ' 捐獻了 ' + amount.toLocaleString() + ' 金幣給血盟資金。');
  checkClanLevel();
  SFX.play('coin'); saveGame(true); UI.refresh();
  return null;
}
function checkClanLevel() {
  const c = clanOf(); if (!c) return;
  while (c.level < CLAN_MAX_LV && c.fund >= CLAN_FUND[c.level]) {
    c.level++;
    log('★ 血盟「' + c.name + '」提升到了 ' + c.level + ' 級！', 'level');
    clanLog('新的血盟效果：' + clanPerks(c.level).join('、'));
    SFX.play('levelup');
  }
}
// 盟友：依職位與等級排序後挑選
function summonAllies(n, ttl, near) {
  const p = G.player, c = clanOf();
  const list = c ? c.members.slice().sort((a, b) => RANK_ORDER[a.rank || 'member'] - RANK_ORDER[b.rank || 'member'] || b.level - a.level).slice(0, n) : [];
  const spawned = [], bonus = clanLevel() - 1;
  for (const mbr of list) {
    const base = near || p;
    const pos = G.world.nearestFree(base.x + rand(-2, 2), base.y + rand(-2, 2));
    const cls = mbr.cls;
    const lvl = Math.max(mbr.level, p.level - 2) + bonus + (mbr.rank === 'vice' ? 2 : mbr.rank === 'elite' ? 1 : 0);
    const a = new Actor({
      x: pos.x, y: pos.y, kind: 'ally', faction: 'ally', name: mbr.name, cls, level: lvl, look: mbr.look || pick(FIGHTER_LOOKS[cls]),
      maxHp: 30 + lvl * 10, ac: Math.floor(lvl / 2) + 3, mr: lvl, er: 4, dmg: [2 + Math.floor(lvl / 2), 6 + lvl], atkSpd: 1.0,
      range: cls === 'ranger' ? 6 : cls === 'mage' ? 5.5 : 1.35, proj: cls === 'ranger' ? 'arrow' : cls === 'mage' ? 'magic' : null, magic: cls === 'mage',
      aggro: true, aggroR: 9, speed: 3.4, clan: c.name, emblem: c.emblem, align: 1000,
    });
    a.expire = ttl ? G.t + ttl : 0;
    G.map.actors.push(a); spawned.push(a);
    burst(a.x, a.y, 20, '#9fd0ff', 16, 2, 0.6);
  }
  return spawned;
}
function callAllies() {
  const p = G.player, c = clanOf();
  if (!c || !c.members.length) return '你的血盟還沒有成員。';
  if (inSafe(p)) return '在安全區域內無法召集盟友。';
  if (p.callT && G.t < p.callT) return '召集令冷卻中（還有 ' + Math.ceil(p.callT - G.t) + ' 秒）。';
  p.callT = G.t + clanCallCooldown();
  const s = summonAllies(clanCallCount(), 180);
  log('你召集了 ' + s.length + ' 位盟友前來助陣！（3 分鐘）', 'level'); SFX.play('quest');
  clanLog(p.name + '：大家來幫忙！');
  for (const a of s.slice(0, 2)) later(rand(0.8, 2), () => clanLog(a.name + '：' + pick(['馬上到！', '來了來了！', '交給我吧！'])));
  return null;
}
// 盟頻聊天
function clanChat(msg) {
  const p = G.player, c = clanOf();
  if (!c) { UI.log('你沒有血盟。', 'warn'); return; }
  clanLog(p.name + '：' + msg);
  const online = c.members.filter((m) => memberActors(m.name).length || Math.random() < 0.4);
  const n = Math.min(online.length, randi(1, 2));
  for (let i = 0; i < n; i++) {
    const m = online[(i + randi(0, online.length)) % online.length];
    later(rand(1, 3) + i, () => clanLog(m.name + '：' + Chat.answer({ name: m.name, cls: m.cls, level: m.level, clan: c.name }, msg)));
  }
}
// 定時：成員成長、捐獻、閒聊
function clanTick(dt) {
  const c = clanOf(); if (!c || !c.members.length) return;
  c._t = (c._t || 0) + dt;
  if (c._t < 150) return;
  c._t = 0;
  const p = G.player, m = pick(c.members), r = Math.random();
  if (r < 0.35 && m.level < p.level + 5) { m.level++; clanLog(m.name + ' 升到了 ' + m.level + ' 級！'); }
  else if (r < 0.6) { const g = randi(1, 5) * 100 * Math.max(1, Math.floor(m.level / 5)); c.fund += g; m.contrib += g; clanLog(m.name + ' 捐獻了 ' + g.toLocaleString() + ' 金幣給血盟資金。'); checkClanLevel(); }
  else clanLog(m.name + '：' + pick(CLAN_LINES));
}
// 進入遊戲時，部分成員會出現在世界中
function spawnClanMembers(map) {
  const c = clanOf(); if (!c || !map.world.towns.length) return;
  for (const m of c.members) {
    if (Math.random() > 0.5 || memberActors(m.name).length) continue;
    const t = pick(map.world.towns);
    let a;
    if (Math.random() < 0.5) {
      const pos = map.world.nearestFree(t.x + rand(-5, 5), t.y + rand(-5, 5));
      a = new Actor({ x: pos.x, y: pos.y, kind: 'villager', faction: 'villager', name: m.name, cls: m.cls, level: m.level, look: m.look || pick(FIGHTER_LOOKS[m.cls]), speed: rand(2.2, 3), town: t });
      a.lineT = rand(10, 40); a.waitT = rand(0, 4);
    } else {
      const p = map.world.randomFreeTile((x, y) => FIELD_LEVELS[map.world.biomeAt(x, y)] && !map.world.townAt(x, y));
      if (!p) continue;
      a = makeFighter(p.x + 0.5, p.y + 0.5, m.level, false);
      Names.release(a.name);
      Object.assign(a, { name: m.name, cls: m.cls, look: m.look || a.look });
    }
    Object.assign(a, { clan: c.name, emblem: c.emblem, clanMember: true });
    map.actors.push(a);
  }
}
function memberStatus(m) {
  const a = memberActors(m.name)[0];
  if (!a) return { on: false, text: '離線' };
  const L = a.life;
  const where = G.maps[Object.keys(G.maps).find((id) => G.maps[id].actors.includes(a))].world.zoneName(a.x, a.y);
  const doing = a.kind === 'ally' ? '助陣中' : L ? ({ hunt: '練功中', travel: '回村中', errand: '補給中', rest: '休息中', leave: '出發中' }[L.state] || '') : '閒逛中';
  return { on: true, text: '線上・' + where + (doing ? '・' + doing : '') };
}

// ===== 血盟視窗 =====
Object.assign(UI, {
  renderClan() {
    const w = this.windows.clan; if (!w) return;
    const p = G.player, c = clanOf();
    w.body.innerHTML = '';
    if (!c) {
      w.body.innerHTML = '<div class="npc-text">你還沒有加入血盟。<br>到<b>晨風村</b>找<b>血盟管理員 莫里斯</b>，等級 5 並支付 3000 金幣就能建立自己的血盟。<br><br>有了血盟後，可以在村莊或野外邀請冒險者加入、捐獻資金提升血盟等級，並向<b>灰岩城</b>宣戰。</div>';
      return;
    }
    normalizeClan(c);
    w.tab = w.tab || 'members';
    const head = el('div', 'clan-head');
    const cv = makeCanvas(48, 48); drawEmblem(cv.getContext('2d'), c.emblem, 0, 0, 48);
    head.appendChild(cv);
    const need = c.level < CLAN_MAX_LV ? CLAN_FUND[c.level] : null;
    head.appendChild(el('div', 'grow', '<b class="cname">' + esc(c.name) + '</b> <span class="clv">Lv.' + c.level + '</span>' +
      '<div class="dim">盟主：' + esc(p.name) + '　成員 ' + (c.members.length + 1) + ' / ' + (clanCap() + 1) + (ownsCastle() ? '　<span class="gold">♔ 灰岩城城主</span>' : '') + '</div>' +
      '<div class="fundbar"><div style="width:' + (need ? Math.min(100, 100 * c.fund / need) : 100) + '%"></div><span>資金 ' + c.fund.toLocaleString() + (need ? ' / ' + need.toLocaleString() : '（已滿級）') + '</span></div>'));
    w.body.appendChild(head);
    if (c.notice) w.body.appendChild(el('div', 'notice-box', '📜 ' + esc(c.notice)));
    const tabs = el('div', 'tabs');
    for (const [k, l] of [['members', '成員'], ['fund', '等級與資金'], ['manage', '管理']]) { const b = el('button', 'tab' + (w.tab === k ? ' on' : ''), l); b.onclick = () => { w.tab = k; this.renderClan(); }; tabs.appendChild(b); }
    w.body.appendChild(tabs);
    if (w.tab === 'members') {
      const list = el('div', 'list clanlist');
      list.appendChild(el('div', 'li', '<div class="li-n"><b>👑 ' + esc(p.name) + '</b><span class="dim">盟主・' + CLASSES[p.cls].name + ' Lv.' + p.level + '・線上</span></div>'));
      const ms = c.members.slice().sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank] || b.level - a.level);
      for (const m of ms) {
        const st = memberStatus(m);
        const row = el('div', 'li');
        row.appendChild(el('div', 'li-n', '<b><span class="dot ' + (st.on ? 'on' : '') + '"></span>' + esc(m.name) + ' <span class="rank r-' + m.rank + '">' + CLAN_RANKS[m.rank] + '</span></b><span class="dim">' + CLASSES[m.cls].name + ' Lv.' + m.level + '・' + st.text + (m.contrib ? '・貢獻 ' + m.contrib.toLocaleString() : '') + '</span>'));
        const up = el('button', 'btn sm', '職位'); up.title = '切換職位：成員 → 精英 → 副盟主';
        up.onclick = () => setRank(m.name, m.rank === 'member' ? 'elite' : m.rank === 'elite' ? 'vice' : 'member');
        const kick = el('button', 'btn sm danger', '剔除');
        kick.onclick = () => { if (confirm('確定要把 ' + m.name + ' 逐出血盟嗎？')) kickMember(m.name); };
        row.appendChild(up); row.appendChild(kick);
        list.appendChild(row);
      }
      if (!c.members.length) list.appendChild(el('div', 'dim', '還沒有成員。點擊村莊或野外的冒險者可以邀請他們加入。'));
      w.body.appendChild(list);
      const bar = el('div', 'btnrow');
      const b1 = el('button', 'btn', '召集盟友（' + clanCallCount() + ' 人）');
      b1.onclick = () => { const e = callAllies(); if (e) { this.log(e, 'warn'); SFX.play('error'); } };
      const b2 = el('button', 'btn', '盟頻聊天');
      b2.onclick = () => { const v = prompt('對血盟成員說：'); if (v && v.trim()) clanChat(v.trim()); };
      bar.appendChild(b1); bar.appendChild(b2);
      w.body.appendChild(bar);
      w.body.appendChild(el('div', 'dim small', '也可以在對話欄輸入 /c 訊息 來使用盟頻。'));
    } else if (w.tab === 'fund') {
      const box = el('div', 'perks');
      box.innerHTML = '<div class="dim">目前效果（Lv.' + c.level + '）</div><ul>' + clanPerks(c.level).map((x) => '<li>' + x + '</li>').join('') + '</ul>' +
        (c.level < CLAN_MAX_LV ? '<div class="dim">下一級（Lv.' + (c.level + 1) + '）需要資金 ' + CLAN_FUND[c.level].toLocaleString() + '</div><ul>' + clanPerks(c.level + 1).map((x) => '<li class="dim">' + x + '</li>').join('') + '</ul>' : '<div class="gold">血盟已達最高等級！</div>');
      w.body.appendChild(box);
      const bar = el('div', 'btnrow');
      for (const amt of [1000, 10000]) { const b = el('button', 'btn', '捐獻 ' + amt.toLocaleString()); b.onclick = () => { const e = donateClan(amt); if (e) { this.log(e, 'warn'); SFX.play('error'); } }; bar.appendChild(b); }
      const bc = el('button', 'btn', '自訂金額'); bc.onclick = () => { const v = prompt('要捐獻多少金幣？（持有 ' + p.gold.toLocaleString() + '）'); if (v) { const e = donateClan(parseInt(v, 10)); if (e) this.log(e, 'warn'); } };
      bar.appendChild(bc);
      w.body.appendChild(bar);
      w.body.appendChild(el('div', 'dim small', '成員也會不定時捐獻資金。資金累積到門檻就會自動升級。'));
    } else {
      const bar = el('div', 'btnrow');
      const bn = el('button', 'btn', '編輯公告'); bn.onclick = () => { const v = prompt('血盟公告（最多 60 字）：', c.notice); if (v !== null) { c.notice = v.trim().slice(0, 60); if (c.notice) clanLog('公告更新：' + c.notice); this.renderClan(); } };
      const be = el('button', 'btn', '更換徽章'); be.onclick = () => { c.emblem = { shape: pick(EMBLEM_SHAPES), color: pick(['#ffd040', '#e0e8ff', '#ff6a4a', '#7ad0ff', '#a0f080', '#d080ff']), bg: pick(['#3a1a1a', '#1a2a3a', '#2a2a1a', '#2a1a3a']) }; for (const m of c.members) for (const a of memberActors(m.name)) a.emblem = c.emblem; this.renderClan(); };
      bar.appendChild(bn); bar.appendChild(be);
      w.body.appendChild(bar);
      const b2 = el('button', 'btn link', '解散血盟');
      b2.onclick = () => {
        if (!confirm('確定要解散血盟「' + c.name + '」嗎？' + (ownsCastle() ? '你將失去灰岩城！' : '') + '血盟資金將會消失。')) return;
        for (const id in G.maps) for (const a of G.maps[id].actors) if (a.clan === c.name) { a.clan = null; a.emblem = null; a.clanMember = false; }
        p.clan = null; p.castle = null; this.log('血盟已解散。', 'warn'); this.refresh();
      };
      w.body.appendChild(b2);
      w.body.appendChild(el('div', 'dim small', '職位：副盟主最多 2 位，召集與攻城時優先出陣並有等級加成。盟主可在「成員」頁剔除成員。'));
    }
  },
});
