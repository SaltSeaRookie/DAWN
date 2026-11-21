'use strict';
// ===== 交易與擺攤 =====
// 交易：與線上玩家（透過伺服器轉送）或電腦冒險者交易物品與金幣，雙方都按「確認」後才成交。
// 擺攤：在村莊的安全區域擺出攤位，設定價格出售物品；附近的冒險者會來購買，線上玩家也能購買。
// 攤販：各村莊有冒險者擺攤販賣各式物品。
function tradeValue(it) { const d = ITEMS[it.id]; return Math.round((d.type === 'junk' ? d.price : d.price * 0.6) * (it.qty || 1) + (it.ench > 0 ? it.ench * it.ench * 120 : 0)); }
function itemLabel(it) { const d = ITEMS[it.id]; return enchTag(it.ench || 0) + d.name + (it.qty > 1 ? ' ×' + it.qty : ''); }
function giveItem(it) {
  // 把交易得到的物品放進背包（裝備類保留強化值）
  if (ITEMS[it.id].stack || !it.ench) return addItem(it.id, it.qty, it.ench || 0, true);
  const p = G.player; if (p.inv.length >= INV_MAX) return false;
  p.inv.push(mkItem(it.id, it.qty || 1, it.ench || 0)); recalc(); return true;
}
function takeFromInv(inst, qty) {
  // 從背包取出（交易、擺攤用），回傳取出的物品資料
  const out = { id: inst.id, qty, ench: inst.ench || 0 };
  removeItem(inst, qty);
  return out;
}
function askQty(inst, verb) {
  if (inst.qty <= 1) return 1;
  const v = prompt(verb + '多少個 ' + ITEMS[inst.id].name + '？（最多 ' + inst.qty + '）', inst.qty);
  if (v === null) return 0;
  return clamp(parseInt(v, 10) || 0, 0, inst.qty);
}

// ================= 交易 =================
const Trade = {
  s: null,
  // 開始交易：partner 為線上玩家（RemotePlayer）或電腦冒險者（Actor）
  request(target) {
    if (this.s) { UI.log('你正在交易中。', 'warn'); return; }
    if (G.player.stall && G.player.stall.open) { UI.log('擺攤中無法交易。', 'warn'); return; }
    if (target.kind === 'remote') {
      Online.relay(target.rid, { k: 'trade_req' });
      UI.log('已向 ' + target.name + ' 提出交易邀請，等待對方回應…', 'sys');
      this.pending = target.rid;
      return;
    }
    // 電腦冒險者
    if (target.kind !== 'fighter' || target.dead) return;
    if (target.target) { UI.log(target.name + ' 正在戰鬥中。', 'warn'); return; }
    target.tradeBag = target.tradeBag || this.npcBag(target);
    target.tradeGold = target.tradeGold === undefined ? randi(500, 4000) * Math.max(1, Math.floor(target.level / 5)) : target.tradeGold;
    this.start(target, false);
    target.speak(pick(['來看看我有什麼吧！', '要交易嗎？好啊。', '公道價就成交～']), 3);
  },
  npcBag(a) {
    const pool = ['red_potion', 'orange_potion', 'clear_potion', 'blue_potion', 'haste_potion', 'return_scroll', 'ew_scroll', 'ea_scroll', 'arrow', 'silver_arrow', 'wolf_fang', 'bone_shard', 'iron_helm', 'leather_boots', 'ring_guard', 'studded', 'hot_cocoa', 'fireres_potion', 'yeti_fur', 'ice_crystal'].filter((x) => ITEMS[x]);
    const bag = [];
    for (let i = 0, n = randi(3, 6); i < n; i++) {
      const id = pick(pool), d = ITEMS[id];
      const ex = bag.find((x) => x.id === id && d.stack);
      if (ex) ex.qty += randi(1, 5); else bag.push({ id, qty: d.stack ? randi(2, id.includes('arrow') ? 200 : 15) : 1, ench: d.type === 'armor' && Math.random() < 0.3 ? randi(1, 4) : 0 });
    }
    return bag;
  },
  start(partner, remote) {
    this.pending = null;
    this.s = { partner, remote, mine: { items: [], gold: 0 }, theirs: { items: [], gold: 0 }, myLock: false, theirLock: false, want: new Set(), askGold: 0 };
    if (!remote) this.s.theirs.items = partner.tradeBag;
    UI.openTrade();
    if (!UI.windows.inv) UI.toggle('inv');
    UI.log('開始與 ' + partner.name + ' 交易。點擊背包的物品放到交易欄。', 'sys');
    SFX.play('quest');
  },
  addMine(inst) {
    const s = this.s; if (!s) return;
    if (inst.pet || isQuestItem(inst)) { UI.log(inst.pet ? '寵物項圈不能交易。' : '劇情道具不能交易。', 'warn'); return; }
    if (s.mine.items.length >= 12) { UI.log('一次最多交易 12 項物品。', 'warn'); return; }
    for (const sl of SLOTS) if (G.player.equip[sl] === inst) { UI.log('請先卸下裝備。', 'warn'); return; }
    const q = askQty(inst, '要交易'); if (!q) return;
    s.mine.items.push(takeFromInv(inst, q));
    this.changed();
  },
  removeMine(i) { const s = this.s; if (!s) return; const it = s.mine.items.splice(i, 1)[0]; if (it) giveItem(it); this.changed(); },
  setGold(v) { const s = this.s; if (!s) return; s.mine.gold = clamp(Math.floor(v) || 0, 0, G.player.gold); this.changed(); },
  changed() {
    const s = this.s; if (!s) return;
    s.myLock = false; s.theirLock = false;
    if (s.remote) Online.relay(s.partner.rid, { k: 'trade_offer', items: s.mine.items, gold: s.mine.gold });
    UI.refresh(); UI.renderTrade();
  },
  lock() {
    const s = this.s; if (!s) return;
    if (s.mine.gold > G.player.gold) { UI.log('金幣不足。', 'warn'); return; }
    s.myLock = true;
    if (s.remote) { Online.relay(s.partner.rid, { k: 'trade_lock', items: s.mine.items, gold: s.mine.gold }); UI.renderTrade(); if (s.theirLock) this.finish(); return; }
    this.npcDecide();
  },
  // 電腦冒險者評估這筆交易划不划算
  npcDecide() {
    const s = this.s, a = s.partner;
    const want = s.theirs.items.filter((_, i) => s.want.has(i));
    const give = s.mine.items.reduce((t, it) => t + tradeValue(it), 0) + s.mine.gold;
    const get = want.reduce((t, it) => t + tradeValue(it), 0) + s.askGold;
    if (!want.length && !s.askGold) { a.speak('你想要我的什麼呢？點我的物品選擇，或是向我要求金幣。', 4); s.myLock = false; UI.renderTrade(); return; }
    if (s.askGold > a.tradeGold) { a.speak('我身上只有 ' + a.tradeGold.toLocaleString() + ' 金幣喔。', 4); s.myLock = false; UI.renderTrade(); return; }
    const greed = a.persona === 'greedy' ? 1.15 : a.persona === 'shy' ? 0.85 : 1;
    if (give >= get * greed * 0.95) { s.theirLock = true; a.speak(pick(['成交！', '好，就這樣說定了。', '划算，成交～']), 3); later(0.6, () => this.finish()); }
    else { const need = Math.ceil(get * greed * 0.95 - give); a.speak('這樣不太划算…再加 ' + need.toLocaleString() + ' 金幣左右吧。', 4); s.myLock = false; }
    UI.renderTrade();
  },
  finish() {
    const s = this.s; if (!s || !s.myLock || !s.theirLock) return;
    const p = G.player;
    const get = s.remote ? s.theirs.items : s.theirs.items.filter((_, i) => s.want.has(i));
    const getGold = s.remote ? s.theirs.gold : s.askGold;
    if (p.gold < s.mine.gold) { this.cancel('金幣不足，交易取消。'); return; }
    if (p.inv.length + get.length > INV_MAX) { this.cancel('背包空間不足，交易取消。'); return; }
    p.gold -= s.mine.gold; p.gold += getGold;
    for (const it of get) giveItem(it);
    if (!s.remote) {
      const a = s.partner;
      a.tradeBag = a.tradeBag.filter((_, i) => !s.want.has(i)).concat(s.mine.items);
      a.tradeGold += s.mine.gold - s.askGold;
    } else Online.relay(s.partner.rid, { k: 'trade_done' });
    UI.log('與 ' + s.partner.name + ' 的交易完成！' + (get.length ? '獲得：' + get.map(itemLabel).join('、') : '') + (getGold ? '（金幣 +' + getGold.toLocaleString() + '）' : '') + (s.mine.gold ? '（金幣 -' + s.mine.gold.toLocaleString() + '）' : ''), 'loot');
    SFX.play('coin');
    this.s = null; UI.close('trade'); UI.refresh(); saveGame(true);
  },
  cancel(msg, fromRemote) {
    const s = this.s; if (!s) return;
    for (const it of s.mine.items) giveItem(it);
    if (s.remote && !fromRemote) Online.relay(s.partner.rid, { k: 'trade_cancel' });
    this.s = null; UI.close('trade'); UI.refresh();
    UI.log(msg || '交易取消了。', 'sys');
  },
  // 線上玩家的交易訊息
  onRelay(from, name, d) {
    const s = this.s;
    switch (d.k) {
      case 'trade_req': {
        if (s || (G.player.stall && G.player.stall.open)) { Online.relay(from, { k: 'trade_busy' }); return; }
        UI.ask(name + ' 想與你交易。', '接受', '拒絕', (yes) => {
          if (!yes) { Online.relay(from, { k: 'trade_no' }); return; }
          const r = Online.players.get(from); if (!r) return;
          Online.relay(from, { k: 'trade_yes' }); this.start(r, true);
        });
        return;
      }
      case 'trade_yes': if (this.pending === from) { const r = Online.players.get(from); if (r) this.start(r, true); } return;
      case 'trade_no': UI.log(name + ' 拒絕了交易。', 'sys'); this.pending = null; return;
      case 'trade_busy': UI.log(name + ' 正在忙，無法交易。', 'sys'); this.pending = null; return;
    }
    if (!s || !s.remote || s.partner.rid !== from) return;
    if (d.k === 'trade_offer') { s.theirs = { items: sanitizeItems(d.items), gold: Math.max(0, d.gold | 0) }; s.myLock = false; s.theirLock = false; UI.renderTrade(); }
    else if (d.k === 'trade_lock') { s.theirs = { items: sanitizeItems(d.items), gold: Math.max(0, d.gold | 0) }; s.theirLock = true; UI.renderTrade(); if (s.myLock) this.finish(); }
    else if (d.k === 'trade_done') { if (this.s && this.s.myLock) { s.theirLock = true; this.finish(); } }
    else if (d.k === 'trade_cancel') this.cancel(name + ' 取消了交易。', true);
  },
};
function sanitizeItems(list) {
  return (Array.isArray(list) ? list : []).slice(0, 12).filter((it) => it && ITEMS[it.id] && it.id !== 'pet_collar').map((it) => ({ id: it.id, qty: clamp(it.qty | 0, 1, 99999), ench: clamp(it.ench | 0, 0, 30) }));
}

// ================= 擺攤 =================
const Stall = {
  toggleSetup() {
    const p = G.player;
    if (p.stall) { UI.openStallSetup(); return; }
    if (Trade.s) { UI.log('交易中無法擺攤。', 'warn'); return; }
    if (!inSafe(p) || !G.world.townAt(p.x, p.y)) { UI.log('只能在村莊或城市的安全區域擺攤。', 'warn'); SFX.play('error'); return; }
    p.stall = { open: false, title: p.name + '的攤位', items: [] };
    p.action = null; p.path = []; p.moving = false;
    UI.openStallSetup();
    if (!UI.windows.inv) UI.toggle('inv');
    UI.log('點擊背包的物品放上攤位並設定價格，然後按「開始擺攤」。', 'sys');
  },
  addItem(inst) {
    const p = G.player, st = p.stall; if (!st || st.open) return;
    if (inst.pet || isQuestItem(inst)) { UI.log('這個物品不能擺攤販賣。', 'warn'); return; }
    for (const sl of SLOTS) if (p.equip[sl] === inst) { UI.log('請先卸下裝備。', 'warn'); return; }
    if (st.items.length >= 16) { UI.log('攤位最多擺 16 項物品。', 'warn'); return; }
    const q = askQty(inst, '要上架'); if (!q) return;
    const suggest = Math.max(1, Math.round(ITEMS[inst.id].price * (ITEMS[inst.id].type === 'junk' ? 1.2 : 0.8) + (inst.ench > 0 ? inst.ench * inst.ench * 150 : 0)));
    const v = prompt('設定「' + itemName(inst) + '」的單價（金幣）：\n參考：商店售價 ' + ITEMS[inst.id].price.toLocaleString() + '，商人收購 ' + sellPrice(inst).toLocaleString(), suggest);
    if (v === null) return;
    const price = clamp(parseInt(v, 10) || 0, 1, 99999999);
    const it = takeFromInv(inst, q); it.price = price; it.k = 's' + Date.now().toString(36) + randi(10, 99);
    st.items.push(it);
    UI.refresh(); UI.renderStallSetup();
  },
  removeItem(k) { const st = G.player.stall; if (!st) return; const i = st.items.findIndex((x) => x.k === k); if (i < 0) return; giveItem(st.items.splice(i, 1)[0]); UI.refresh(); UI.renderStallSetup(); },
  start(title) {
    const p = G.player, st = p.stall; if (!st) return;
    if (!st.items.length) { UI.log('攤位上還沒有物品。', 'warn'); return; }
    st.title = (title || st.title).slice(0, 16); st.open = true; st.buyT = rand(8, 16); st.sold = 0; st.earned = 0;
    p.action = null; p.path = []; p.moving = false;
    UI.log('開始擺攤「' + st.title + '」。附近的冒險者與線上玩家可以來購買。（移動前請先收攤）', 'level');
    SFX.play('quest'); UI.refresh(); UI.renderStallSetup();
  },
  close() {
    const p = G.player, st = p.stall; if (!st) return;
    for (const it of st.items) giveItem(it);
    if (st.open) UI.log('收攤了。' + (st.sold ? '這次賣出 ' + st.sold + ' 件，收入 ' + st.earned.toLocaleString() + ' 金幣。' : ''), 'sys');
    p.stall = null; UI.close('stallset'); UI.refresh(); saveGame(true);
  },
  // 賣出攤位上的物品
  sell(k, qty, buyer) {
    const p = G.player, st = p.stall; if (!st || !st.open) return null;
    const it = st.items.find((x) => x.k === k); if (!it) return null;
    qty = clamp(qty | 0, 1, it.qty);
    const total = it.price * qty;
    const tax = castleTax(total, 'trade');
    p.gold += total - tax;
    it.qty -= qty; if (it.qty <= 0) st.items.splice(st.items.indexOf(it), 1);
    st.sold += qty; st.earned += total - tax;
    UI.log('🏪 ' + buyer + ' 買了 ' + ITEMS[it.id].name + (qty > 1 ? ' ×' + qty : '') + '，收入 ' + (total - tax).toLocaleString() + ' 金幣' + (tax ? '（城堡稅 ' + tax + '）' : '') + '。', 'loot');
    SFX.play('coin');
    if (!st.items.length) { UI.log('攤位上的物品全部賣完了！', 'level'); this.close(); } else { UI.refresh(); UI.renderStallSetup(); }
    return { id: it.id, qty, ench: it.ench, price: it.price };
  },
  // 附近的冒險者會來逛攤位
  tick(dt) {
    const p = G.player, st = p && p.stall; if (!st || !st.open || p.dead) return;
    st.buyT -= dt; if (st.buyT > 0) return;
    st.buyT = rand(10, 25);
    const buyers = G.map.actors.filter((a) => (a.kind === 'fighter' || a.kind === 'villager') && !a.dead && !a.target && dist(a.x, a.y, p.x, p.y) < 14);
    if (!buyers.length) return;
    const b = pick(buyers);
    // 價格越接近商店售價越容易賣出；便宜的很快就被買走
    const cands = st.items.map((it) => { const fair = Math.max(1, ITEMS[it.id].price + (it.ench > 0 ? it.ench * it.ench * 150 : 0)); return { it, ch: clamp(1.5 - it.price / fair, 0.04, 0.95) }; });
    const c = pick(cands);
    if (Math.random() > c.ch) { if (Math.random() < 0.4) { b.face(p.x, p.y); b.speak(pick(['這個有點貴耶…', '再便宜一點我就買', '逛逛而已～']), 3); } return; }
    const q = ITEMS[c.it.id].stack ? Math.max(1, Math.min(c.it.qty, randi(1, Math.ceil(c.it.qty / 2)))) : 1;
    b.face(p.x, p.y); b.speak(pick(['我要買這個！', '老闆，這個給我。', '找好久了！']), 3);
    this.sell(c.it.k, q, b.name);
  },
  // 線上玩家來買
  onRelay(from, name, d) {
    if (d.k === 'stall_buy') {
      const r = this.sell(String(d.key), d.qty, name);
      Online.relay(from, r ? { k: 'stall_sold', item: r } : { k: 'stall_fail' });
    } else if (d.k === 'stall_sold' && this.pendingBuy) {
      const it = d.item, cost = it.price * it.qty;
      this.pendingBuy = null;
      G.player.gold -= cost; giveItem({ id: it.id, qty: it.qty, ench: it.ench });
      UI.log('向 ' + name + ' 買了 ' + itemLabel(it) + '，花費 ' + cost.toLocaleString() + ' 金幣。', 'loot'); SFX.play('coin'); UI.refresh();
    } else if (d.k === 'stall_fail') { this.pendingBuy = null; UI.log('這件商品已經賣出了。', 'warn'); }
  },
};
// 擺攤時不能移動
function stallBlocks() { const p = G.player; if (p && p.stall && p.stall.open) { if (!G.stallWarnT || G.t > G.stallWarnT) { G.stallWarnT = G.t + 3; UI.log('擺攤中無法移動，請先收攤（背包的「🏪 擺攤」）。', 'warn'); } return true; } return false; }

// ================= 攤販（電腦冒險者擺的攤）=================
const STALL_TITLES = ['便宜賣藥水', '打寶戰利品出清', '好裝備便宜賣', '新手必備', '收攤前大拍賣', '稀有物品', '卷軸專賣', '練功補給站'];
function stockNpcStall(npc) {
  const pool = Object.keys(ITEMS).filter((id) => { const d = ITEMS[id]; return d.price > 0 && !['book', 'collar'].includes(d.type) && id !== 'gold' && d.price <= 60000 && (!d.rare || Math.random() < 0.3); });
  const items = [];
  for (let i = 0, n = randi(5, 9); i < n; i++) {
    const id = pick(pool), d = ITEMS[id];
    if (items.some((x) => x.id === id)) continue;
    const ench = (d.type === 'weapon' || d.type === 'armor') && Math.random() < 0.35 ? randi(1, Math.max(1, d.safe || 4)) : 0;
    const qty = d.stack ? randi(3, id.includes('arrow') ? 300 : 30) : 1;
    const price = Math.max(1, Math.round((d.price + ench * ench * 150) * rand(0.7, 1.3)));
    items.push({ k: 'n' + i + Date.now().toString(36), id, qty, ench, price });
  }
  npc.stall = { title: pick(STALL_TITLES), items };
  npc.restockT = G.t + rand(400, 700);
}
function npcStallTick() {
  for (const n of G.map.npcs) if (n.role === 'stall' && (!n.stall || G.t > n.restockT)) stockNpcStall(n);
}

// ================= 介面 =================
Object.assign(UI, {
  // 點擊其他玩家
  openPlayerMenu(r) {
    this.close('pmenu');
    const w = this.win('pmenu', r.name, 16, 60, 260);
    w.body.innerHTML = '<div class="npc-text">' + esc(r.name) + '（玩家・Lv.' + (r.level || '?') + ' ' + (CLASSES[r.cls] ? CLASSES[r.cls].name : '') + (r.clan ? '・' + esc(r.clan) : '') + '）</div>';
    const row = el('div', 'btnrow');
    const b1 = el('button', 'btn sm', '悄悄話'); b1.onclick = () => { this.close('pmenu'); const ci = $('#chatInput'); ci.value = '/w ' + r.name + ' '; ci.focus(); };
    const b2 = el('button', 'btn sm', '交易'); b2.onclick = () => { this.close('pmenu'); Trade.request(r); };
    row.appendChild(b1); row.appendChild(b2);
    if (r.stall) { const b3 = el('button', 'btn sm', '🏪 查看攤位'); b3.onclick = () => { this.close('pmenu'); this.openStallView(r); }; row.appendChild(b3); }
    w.body.appendChild(row);
  },
  // ----- 交易視窗 -----
  openTrade() {
    this.close('trade');
    const w = this.win('trade', '交易', window.innerWidth / 2 - 260, 70, 520);
    w.onClose = () => { if (Trade.s) Trade.cancel(); };
    this.renderTrade();
  },
  renderTrade() {
    const w = this.windows.trade, s = Trade.s; if (!w || !s) return;
    const p = G.player;
    w.body.innerHTML = '';
    const cols = el('div', 'tradecols');
    const side = (title, items, gold, lock, mine) => {
      const c = el('div', 'tradeside' + (lock ? ' locked' : ''));
      c.appendChild(el('div', 'lbl', title + (lock ? ' ✓ 已確認' : '')));
      const g = el('div', 'grid');
      for (let i = 0; i < 12; i++) {
        const it = items[i];
        const inst = it ? { id: it.id, qty: it.qty, ench: it.ench } : null;
        const slot = this.slotEl(inst, () => {
          if (mine) Trade.removeMine(i);
          else if (!s.remote) { if (s.want.has(i)) s.want.delete(i); else s.want.add(i); s.myLock = false; this.renderTrade(); }
        });
        if (!mine && !s.remote && it && s.want.has(i)) slot.classList.add('on');
        if (!mine && !s.remote && it && !s.want.has(i)) slot.classList.add('dimslot');
        g.appendChild(slot);
      }
      c.appendChild(g);
      c.appendChild(el('div', 'small', '金幣：<b>' + gold.toLocaleString() + '</b>'));
      return c;
    };
    cols.appendChild(side('我提供', s.mine.items, s.mine.gold, s.myLock, true));
    cols.appendChild(side(s.partner.name + (s.remote ? ' 提供' : ' 的物品（點擊選擇想要的）'), s.theirs.items, s.remote ? s.theirs.gold : s.askGold, s.theirLock, false));
    w.body.appendChild(cols);
    const row = el('div', 'btnrow');
    const gin = el('input', 'vaultamt'); gin.type = 'number'; gin.min = 0; gin.placeholder = '我出金幣'; gin.value = s.mine.gold || '';
    gin.addEventListener('keydown', (e) => e.stopPropagation()); gin.onchange = () => Trade.setGold(+gin.value);
    row.appendChild(el('span', 'small', '金幣')); row.appendChild(gin);
    if (!s.remote) {
      const ain = el('input', 'vaultamt'); ain.type = 'number'; ain.min = 0; ain.placeholder = '向對方要'; ain.value = s.askGold || '';
      ain.addEventListener('keydown', (e) => e.stopPropagation()); ain.onchange = () => { s.askGold = Math.max(0, Math.floor(+ain.value) || 0); s.myLock = false; this.renderTrade(); };
      row.appendChild(el('span', 'small', '要求')); row.appendChild(ain);
    }
    const ok = el('button', 'btn sm' + (s.myLock ? ' on' : ''), s.myLock ? '等待對方…' : '確認交易'); ok.onclick = () => Trade.lock();
    const no = el('button', 'btn sm', '取消'); no.onclick = () => Trade.cancel();
    row.appendChild(ok); row.appendChild(no);
    w.body.appendChild(row);
    w.body.appendChild(el('div', 'dim small', s.remote ? '點擊背包物品加入交易欄，點擊交易欄的物品取回。雙方都按「確認交易」才會成交；任何一方修改內容都需要重新確認。' :
      '點擊背包物品加入交易欄。點擊對方的物品選擇想要的，也可以向對方要求金幣（對方身上約有 ' + (s.partner.tradeGold || 0).toLocaleString() + ' 金幣）。按「確認交易」後對方會評估是否划算。'));
  },
  // ----- 擺攤設定 -----
  openStallSetup() {
    this.close('stallset');
    const w = this.win('stallset', '我的攤位', 16, 60, 340);
    w.onClose = () => { const st = G.player.stall; if (st && !st.open) Stall.close(); };
    this.renderStallSetup();
  },
  renderStallSetup() {
    const w = this.windows.stallset, st = G.player.stall; if (!w || !st) return;
    w.body.innerHTML = '';
    const tr = el('div', 'btnrow');
    const tin = el('input', 'stalltitle'); tin.value = st.title; tin.maxLength = 16; tin.disabled = st.open;
    tin.addEventListener('keydown', (e) => e.stopPropagation());
    tr.appendChild(el('span', 'small', '攤位名稱')); tr.appendChild(tin);
    w.body.appendChild(tr);
    const list = el('div', 'list');
    if (!st.items.length) list.appendChild(el('div', 'dim', '點擊背包的物品放上攤位（最多 16 項）。'));
    for (const it of st.items) {
      const row = el('div', 'li');
      row.appendChild(iconCanvas(it.id, 28));
      row.appendChild(el('div', 'li-n', '<b class="rn' + itemRarity(ITEMS[it.id]) + '">' + esc(itemLabel(it)) + '</b><span class="dim">單價 ' + it.price.toLocaleString() + '</span>'));
      if (!st.open) { const b = el('button', 'btn sm', '取回'); b.onclick = () => Stall.removeItem(it.k); row.appendChild(b); }
      row.addEventListener('mouseenter', (e) => this.showTip({ id: it.id, qty: it.qty, ench: it.ench }, e));
      row.addEventListener('mouseleave', () => this.hideTip());
      list.appendChild(row);
    }
    w.body.appendChild(list);
    const row = el('div', 'btnrow');
    if (!st.open) { const b = el('button', 'btn', '開始擺攤'); b.onclick = () => Stall.start(tin.value.trim()); row.appendChild(b); }
    else row.appendChild(el('span', 'small', '擺攤中…已賣出 ' + st.sold + ' 件、收入 ' + st.earned.toLocaleString() + ' 金幣　'));
    const c = el('button', 'btn sm', st.open ? '收攤' : '取消'); c.onclick = () => Stall.close(); row.appendChild(c);
    w.body.appendChild(row);
    w.body.appendChild(el('div', 'dim small', '價格越接近商店售價越容易賣出。附近的冒險者會來逛攤位；線上模式時其他玩家點擊你也能購買。擺攤中無法移動。'));
  },
  // ----- 查看攤位（攤販 NPC 或線上玩家）-----
  openStallView(owner) {
    this.close('stallview');
    const w = this.win('stallview', '攤位', 16, 60, 340);
    w.owner = owner; this.renderStallview();
    if (owner.face) owner.face(G.player.x, G.player.y);
  },
  renderStallview() {
    const w = this.windows.stallview; if (!w) return;
    const o = w.owner, st = o.stall, p = G.player;
    if (!st) { w.body.innerHTML = '<div class="dim">攤位已經收起來了。</div>'; return; }
    w.body.innerHTML = this.dialogHead({ name: o.name, title: '攤位' }, '🏪 ' + esc(st.title));
    const list = el('div', 'list');
    if (!st.items.length) list.appendChild(el('div', 'dim', '商品都賣完了。'));
    for (const it of st.items) {
      const row = el('div', 'li');
      row.appendChild(iconCanvas(it.id, 28));
      const fair = ITEMS[it.id].price + (it.ench > 0 ? it.ench * it.ench * 150 : 0);
      const tag = it.price < fair * 0.85 ? '<span class="good">便宜</span>' : it.price > fair * 1.15 ? '<span class="bad">偏貴</span>' : '';
      row.appendChild(el('div', 'li-n', '<b class="rn' + itemRarity(ITEMS[it.id]) + '">' + esc(itemLabel(it)) + '</b><span class="dim">單價 ' + it.price.toLocaleString() + ' ' + tag + '</span>'));
      const b = el('button', 'btn sm', '購買');
      b.onclick = () => {
        let q = 1;
        if (it.qty > 1) { const v = prompt('要買多少個？（最多 ' + it.qty + '，單價 ' + it.price.toLocaleString() + '）', 1); if (v === null) return; q = clamp(parseInt(v, 10) || 0, 0, it.qty); if (!q) return; }
        const cost = it.price * q;
        if (p.gold < cost) { this.log('金幣不足。', 'warn'); SFX.play('error'); return; }
        if (o.kind === 'remote') { if (Stall.pendingBuy) return; Stall.pendingBuy = true; Online.relay(o.rid, { k: 'stall_buy', key: it.k, qty: q }); return; }
        if (!giveItem({ id: it.id, qty: q, ench: it.ench })) { this.log('背包已滿或太重了。', 'warn'); return; }
        p.gold -= cost; castleTax(cost, 'trade');
        it.qty -= q; if (it.qty <= 0) st.items.splice(st.items.indexOf(it), 1);
        o.speak(pick(['謝謝惠顧！', '下次再來喔～', '好眼光！']), 3);
        this.log('向 ' + o.name + ' 買了 ' + ITEMS[it.id].name + (q > 1 ? ' ×' + q : '') + '，花費 ' + cost.toLocaleString() + ' 金幣。', 'loot');
        SFX.play('coin'); this.refresh(); this.renderStallview();
      };
      row.appendChild(b);
      row.addEventListener('mouseenter', (e) => this.showTip({ id: it.id, qty: it.qty, ench: it.ench }, e));
      row.addEventListener('mouseleave', () => this.hideTip());
      list.appendChild(row);
    }
    w.body.appendChild(list);
  },
});
