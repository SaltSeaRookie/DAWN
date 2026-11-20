'use strict';
// ===== 對話系統：冒險者與村民之間會依照彼此的狀態與世界上發生的事情互相交談 =====
// 每個人有個性（說話語氣）與記憶（最近在哪裡打了什麼、強化結果、身上的錢），
// 回應會根據對方說的內容與自己的狀況決定，有時第三個人也會插話。
// 對話也可能真的改變世界：邀請入盟、約好一起去練功、成交一筆交易。
const PERSONAS = {
  hot:    { end: ['！', '！！', '！衝啊！'], yes: '好啊！走走走！', no: '這次不行啦！', laugh: '哈哈哈！', wow: '太猛了吧！' },
  calm:   { end: ['。', '。', '…'], yes: '可以。', no: '這次就算了。', laugh: '呵。', wow: '不錯。' },
  funny:  { end: ['～', ' XD', '（笑）'], yes: '沒問題，算我一份～', no: '我今天想耍廢 XD', laugh: '笑死', wow: '真假！我眼睛沒花吧 XD' },
  greedy: { end: ['。', '，嘿嘿。', '。'], yes: '有錢賺就去！', no: '沒賺頭，不去。', laugh: '嘿嘿', wow: '那可值不少錢！' },
  shy:    { end: ['…', '…吧', '…嗯'], yes: '好、好的…', no: '對、對不起…下次…', laugh: '嘻…', wow: '好、好厲害…' },
  chatty: { end: ['，我跟你說喔', '啦～', '耶！'], yes: '好啊好啊，路上我們可以聊天！', no: '哎呀今天不行啦，下次一定～', laugh: '哈哈～', wow: '哇！我要跟大家說！' },
};
const TALK_ITEMS = [['橙色藥水', 60, 'general'], ['回村卷軸', 120, 'general'], ['銀箭', 15, 'general'], ['武器強化卷軸', 4000, 'general'], ['鐵盔', 600, 'smith'], ['魔法書（冰錐術）', 600, 'magic'], ['守護戒指', 1500, 'jewel'], ['狼牙', 30, null]];
const TALK_GEAR = { knight: ['長劍', '騎士巨劍', '鳶盾'], mage: ['水晶法杖', '魔法長袍'], ranger: ['複合長弓', '獵人斗篷'], cleric: ['戰鎚', '鎖子甲'] };

const Talk = {
  busy: 0,
  persona(a) { return PERSONAS[a.persona || (a.persona = pick(Object.keys(PERSONAS)))]; },
  end(a) { return pick(this.persona(a).end); },
  mem(a) { return a.mem || (a.mem = { kills: 0, mon: null, zone: null, ench: null }); },
  news(kind) { const n = (G.news || []).filter((x) => G.t - x.t < 900 && (x.used || 0) < 3 && (!kind || x.kind === kind)); return n.length ? n[n.length - 1] : null; },
  near(e, r = 18) { return dist(e.x, e.y, G.player.x, G.player.y) < r; },

  // 播放一段對話：lines = [[說話者, 文字, 動作?], ...]
  play(people, lines) {
    if (!lines || !lines.length) return;
    this.busy++;
    for (const a of people) a.talkUntil = G.t + lines.length * 2.4 + 2;
    const heard = people.some((x) => this.near(x)) || lines.some(([w]) => this.near(w));
    let t = 0;
    lines.forEach(([who, text, fx], i) => {
      t += i === 0 ? 0 : rand(1.8, 2.6);
      later(t, () => {
        if (who.dead) return;
        const other = people.find((x) => x !== who);
        if (other && !other.dead) who.face(other.x, other.y);
        if (text) { text = text.replace(/([？！。])[。…]+$/, '$1').replace(/([？！])，/, '$1'); who.speak(text, 4.5); if (heard) log(who.name + '：' + text, 'chat'); }
        if (fx) fx();
      });
    });
    later(t + 1, () => { this.busy = Math.max(0, this.busy - 1); });
  },

  // ---------- 話題 ----------
  topics: {
    // 練功心得：會依照雙方的等級回應
    hunt(A, B) {
      const m = Talk.mem(A), lv = A.level || 1, lb = B.level || 1;
      if (m.kills > 0 && m.mon) {
        const l = [[A, '剛剛在' + m.zone + '打了 ' + m.kills + ' 隻' + m.mon + Talk.end(A)]];
        if (lb < lv - 5) l.push([B, m.zone + '？我去大概會被秒吧' + Talk.end(B)], [A, '等你到 ' + (lv - 2) + ' 級左右再去就沒問題了' + Talk.end(A)]);
        else if (lb > lv + 5) l.push([B, m.mon + '啊，我以前也在那裡練過' + Talk.end(B)], [B, '你可以試試看更深的地方，' + Chat.levelTip(lv + 3)]);
        else l.push([B, '我也常去' + m.zone + '，' + m.mon + '掉的東西還不錯' + Talk.end(B)], [A, '下次一起去吧' + Talk.end(A)]);
        m.kills = 0;
        return l;
      }
      return [[A, '最近去哪裡練功比較好？我 ' + lv + ' 級' + Talk.end(A)], [B, lb >= lv ? '你這個等級的話，' + Chat.levelTip(lv) : '我等級比你低，也在找地方耶…', null], [A, lb >= lv ? '謝啦，我等一下就去看看' + Talk.end(A) : '那我們一起找吧' + Talk.end(A)]];
    },
    // 強化：對方會依結果恭喜或安慰
    enchant(A, B) {
      const gear = pick(TALK_GEAR[A.cls] || ['武器']), n = randi(5, 9), ok = Math.random() < 0.45;
      const P = Talk.persona(B);
      const l = ok ? [[A, '我剛剛把' + gear + '衝到 +' + n + ' 了' + Talk.end(A)], [B, P.wow + (n >= 8 ? '+' + n + ' 耶，請客！' : '恭喜恭喜！')]]
        : [[A, '嗚…' + gear + '衝 +' + n + ' 爆掉了' + Talk.end(A)], [B, B.persona === 'funny' ? '節哀 XD 下一把會更好' : B.persona === 'greedy' ? '早說嘛，我出價收你的' : '別難過，再存錢買一把吧']];
      const C = Talk.third(A, B);
      if (C) l.push([C, ok ? '真好，我上次衝 +' + (n - 1) + ' 就爆了' : '超過安全值本來就很看運氣啦']);
      Talk.mem(A).ench = ok ? 'ok' : 'fail';
      return l;
    },
    // 血盟：邀請入盟（真的會加入）、同盟聊天、不同血盟的較勁
    clan(A, B) {
      if (B.clanMember || A.clanMember) return null;
      if (A.clan && !B.clan && B.kind === 'fighter') {
        const yes = Math.random() < 0.4;
        return [[A, '你還沒有血盟嗎？要不要加入「' + A.clan + '」' + Talk.end(A)],
          [B, yes ? Talk.persona(B).yes + '請多指教！' : '謝謝邀請，我想再自由一陣子。', yes ? () => { B.clan = A.clan; B.emblem = A.emblem; if (Talk.near(B)) log(B.name + ' 加入了血盟「' + A.clan + '」。', 'sys'); } : null],
          [A, yes ? '歡迎！晚點介紹盟友給你認識' + Talk.end(A) : '好吧，想加入再找我' + Talk.end(A)]];
      }
      if (A.clan && A.clan === B.clan) {
        const sc = siegeSchedule(), own = castleOwnerName();
        if (sc.open) return [[A, '攻城時間到了，我們「' + A.clan + '」要不要去' + Talk.end(A)], [B, own === A.clan ? '城是我們的，當然要回去守城！' : '「' + own + '」守得很嚴耶…' + Talk.end(B)], [A, own === A.clan ? '走，回灰岩城！' : '人多一點再說吧' + Talk.end(A)]];
        return [[A, '盟主說下次攻城要全員集合' + Talk.end(A)], [B, '收到，我先去把裝備衝一衝' + Talk.end(B)]];
      }
      if (A.clan && B.clan && A.clan !== B.clan) {
        const own = castleOwnerName();
        if (own === B.clan) return [[A, '你們「' + B.clan + '」拿下灰岩城很得意喔' + Talk.end(A)], [B, '有本事攻城時間來打啊' + Talk.end(B)], [A, '你等著' + Talk.end(A)]];
        return [[A, '你們「' + B.clan + '」最近很活躍耶' + Talk.end(A)], [B, '「' + A.clan + '」也不差啊，下次攻城別遇到我們就好' + Talk.end(B)]];
      }
      return null;
    },
    // 世界大事：攻城結果、新血盟、頭目被打倒
    news(A, B) {
      const n = Talk.news(); if (!n) return null;
      n.used = (n.used || 0) + 1;
      const l = [[A, '聽說' + n.text + Talk.end(A)]];
      if (n.kind === 'capture') l.push([B, n.who === B.clan ? '沒錯！就是我們幹的！' : '難怪剛剛城門那邊打得那麼兇' + Talk.end(B)]);
      else if (n.kind === 'clan') l.push([B, n.who && n.who === B.name ? '對啊，就是我創的，有興趣嗎？' : '又多一個血盟了，攻城會越來越熱鬧' + Talk.end(B)]);
      else if (n.kind === 'boss') l.push([B, Talk.persona(B).wow + (n.who === G.player.name ? '就是那個 ' + n.who + ' 嗎？' : '')]);
      else if (n.kind === 'defend') l.push([B, '城主那邊守得真穩' + Talk.end(B)]);
      else l.push([B, '真的嗎？我都不知道' + Talk.end(B)]);
      const C = Talk.third(A, B);
      if (C && Math.random() < 0.5) l.push([C, '我也有聽說！']);
      return l;
    },
    // 交易：會討價還價
    trade(A, B) {
      const [item, price, shop] = pick(TALK_ITEMS);
      const offer = Math.round(price * rand(0.6, 0.9));
      const l = [[A, '有人有' + item + '嗎？我出 ' + offer + ' 金收' + Talk.end(A)]];
      if (Math.random() < 0.5) {
        const ask = Math.round(price * rand(0.9, 1.2));
        l.push([B, '我有一個，' + ask + ' 金賣你' + Talk.end(B)]);
        const mid = Math.round((ask + offer) / 2);
        if (B.persona === 'greedy' || Math.random() < 0.4) l.push([A, '太貴了吧，' + mid + ' 怎麼樣？'], [B, B.persona === 'greedy' ? '不二價。' : '好吧，成交！'], [A, B.persona === 'greedy' ? '那算了' + Talk.end(A) : '謝啦' + Talk.end(A)]);
        else l.push([A, '好，成交' + Talk.end(A)]);
      } else l.push([B, '沒有耶' + (shop ? '，去' + NPC_TITLES[shop] + '問問看吧' : '，你自己去打比較快') + Talk.end(B)]);
      return l;
    },
    // 組隊：等級差不多就會一起出發
    party(A, B) {
      if (!A.life || !B.life || B.kind !== 'fighter') return null;
      const m = Talk.mem(A), zone = m.zone || '附近的野外';
      const ok = Math.abs((A.level || 1) - (B.level || 1)) <= 6 && Math.random() < 0.7;
      return [[A, '等一下要去' + zone + '，要一起嗎' + Talk.end(A)],
        [B, ok ? Talk.persona(B).yes : (Math.abs(A.level - B.level) > 6 ? '等級差太多了，我怕拖累你' + Talk.end(B) : Talk.persona(B).no),
          ok ? () => { for (const x of [A, B]) if (x.life && !x.dead) { x.life.state = 'leave'; x.life.said = false; } B.home = { x: A.home.x, y: A.home.y }; } : null],
        [A, ok ? '那就出發吧' + Talk.end(A) : '好吧，下次' + Talk.end(A)]];
    },
    // 談論玩家：依照玩家的等級、善惡、是否是城主
    player(A, B) {
      const p = G.player; if (p.dead || !Talk.near(A, 14)) return null;
      let r;
      if (ownsCastle()) r = '他是灰岩城的城主「' + p.clan.name + '」的盟主耶';
      else if (p.align < 0) r = '小心，他是紅名的…';
      else if (p.level > (B.level || 1) + 5) r = '看起來很強，Lv.' + p.level + ' 左右吧';
      else if (p.level < (B.level || 1) - 5) r = '是新手吧，要不要幫他一下？';
      else r = '跟我們差不多等級吧';
      const l = [[A, '你看那邊那個 ' + p.name + Talk.end(A)], [B, r + Talk.end(B)]];
      if (p.align < 0) l.push([A, '我們離遠一點好了' + Talk.end(A)]);
      return l;
    },
    // 等級
    level(A, B) {
      const la = A.level || 1, lb = B.level || 1;
      return [[A, '你現在幾級了？'], [B, 'Lv.' + lb + '，你呢' + Talk.end(B)], [A, la > lb ? '我 ' + la + ' 了，等你追上來' + Talk.end(A) : la < lb ? '我才 ' + la + '，要加油了' + Talk.end(A) : '一樣耶！' + Talk.persona(A).laugh]];
    },
    // 時間與環境
    time(A, B) {
      const night = daylight() < 0.3;
      if (G.map.id === 'volcano') return [[A, '這裡熱死了' + Talk.end(A)], [B, '記得喝抗火藥水，不然站在岩漿旁邊會被燙傷' + Talk.end(B)]];
      return night ? [[A, '天黑了，荒原的骷髏會變多' + Talk.end(A)], [B, '開照明術就好多了' + Talk.end(B)]]
        : [[A, '今天天氣真好' + Talk.end(A)], [B, Math.random() < 0.5 ? '適合出去練功！' : '適合在篝火旁邊偷懶' + Talk.persona(B).laugh]];
    },
    // 村民與冒險者
    village(A, B) {
      const V = A.kind === 'villager' ? A : B, F = V === A ? B : A;
      if (V.kind !== 'villager' || F.kind !== 'fighter') return null;
      const asks = [['冒險者大人，最近野狼又跑進田裡了', '交給我吧！回程順便清一清'], ['藥水是不是又漲價了啊？', '還好啦，打怪賺得回來'], ['灰岩城換城主了嗎？', '現在是「' + castleOwnerName() + '」的'], ['外面危險嗎？', '還好，荒原晚上比較可怕']];
      const [q, a] = pick(asks);
      return [[V, q], [F, a + Talk.end(F)], [V, '謝謝你，路上小心！']];
    },
  },
  third(A, B) {
    const c = G.map.actors.filter((x) => x !== A && x !== B && !x.dead && x.life && x.life.resting && dist(x.x, x.y, A.x, A.y) < 7 && !(x.talkUntil > G.t));
    return c.length && Math.random() < 0.6 ? pick(c) : null;
  },
  // 在篝火旁休息的人、村民聊天
  tick(dt) {
    G.socialT = (G.socialT || 6) - dt;
    if (G.socialT > 0) return;
    G.socialT = rand(6, 11);
    if (this.busy >= 2) return;
    const p = G.player;
    const free = (x) => !x.dead && !(x.talkUntil > G.t);
    const resting = G.map.actors.filter((a) => free(a) && ((a.life && a.life.resting) || a.kind === 'villager') && dist(a.x, a.y, p.x, p.y) < 18);
    if (resting.length) {
      const A = pick(resting);
      const others = G.map.actors.filter((b) => b !== A && free(b) && (b.kind === 'villager' || (b.life && b.life.resting)) && dist(A.x, A.y, b.x, b.y) < 7);
      if (others.length) {
        const B = pick(others);
        const keys = Object.keys(this.topics).sort(() => Math.random() - 0.5);
        if (A.kind === 'villager' || B.kind === 'villager') keys.unshift('village');
        if (this.news() && Math.random() < 0.3) keys.unshift('news');
        for (const k of keys) { const l = this.topics[k](A, B); if (l) { this.play([A, B], l); return; } }
      }
    }
    // 野外：兩個冒險者遇到時打招呼或提醒危險
    const field = G.map.actors.filter((a) => a.kind === 'fighter' && free(a) && !a.target && dist(a.x, a.y, p.x, p.y) < 16);
    for (const A of field) {
      const B = field.find((b) => b !== A && dist(A.x, A.y, b.x, b.y) < 6); if (!B) continue;
      const pk = G.map.actors.find((x) => x.kind === 'pker' && !x.dead && dist(x.x, x.y, A.x, A.y) < 14);
      const l = pk ? [[A, '小心！' + pk.name + ' 在附近，是紅名！'], [B, '謝了，我會注意' + this.end(B)]]
        : A.clan && A.clan === B.clan ? [[A, '喔！是盟友' + this.end(A)], [B, '一起打吧' + this.end(B)]]
        : [[A, pick(['辛苦了～', '這區人好多', '嗨'])], [B, pick(['你也辛苦了', '對啊，怪都被搶光了', '嗨嗨'])]];
      this.play([A, B], l);
      return;
    }
  },
  // 村民的日常（依時間、城主、最近的消息）
  villagerLine(o) {
    const n = this.news(), night = daylight() < 0.3;
    if (n && Math.random() < 0.25) { n.used = (n.used || 0) + 1; return '聽說' + n.text + '，好厲害'; }
    return pick([
      night ? '天黑了，早點回家吧' : '今天天氣真好',
      '聽說灰岩城現在是「' + castleOwnerName() + '」的',
      siegeSchedule().open ? '城那邊好像在打仗…' : '下次攻城不知道誰會贏',
      pick(CHAT_LINES),
    ]);
  },
  // 野外自言自語（取代固定台詞）
  mutter(a) {
    const m = this.mem(a);
    const lines = [m.mon ? '這附近的' + m.mon + '好多' : '今天要打到什麼好東西呢', a.life && a.life.pots < 5 ? '藥水快用完了…' : '狀態不錯，繼續打', siegeSchedule().open ? '攻城時間到了啊…' : '好想要一把 +9 的武器'];
    return pick(lines) + this.end(a);
  },
};
// 世界大事記（給對話引用）
function addNews(kind, text, who) {
  G.news = G.news || [];
  G.news.push({ t: G.t, kind, text, who });
  if (G.news.length > 20) G.news.shift();
}
function noteKill(src, victim) {
  if (!src || !src.life || !victim.def) return;
  const m = Talk.mem(src);
  if (m.mon !== victim.name) { m.mon = victim.name; m.kills = 0; }
  m.kills++; m.zone = G.world.zoneName(victim.x, victim.y);
}
