'use strict';
// ===== 聊天：附近角色的回應、玩家指令、管理員指令 =====
const Chat = {
  // ---------- 入口 ----------
  input(v) {
    const p = G.player;
    if (v[0] === '/') return this.command(v.slice(1).trim());
    p.speak(v, 5);
    UI.log(p.name + '：' + v, 'me');
    Online.say(v);
    this.reply(v);
  },

  // ---------- 附近角色回應 ----------
  responders(range = 9) {
    const p = G.player, list = [];
    for (const n of G.map.npcs) if (dist(n.x, n.y, p.x, p.y) < 6) list.push(n);
    for (const a of G.map.actors) {
      if (a.dead || a === p) continue;
      if ((a.kind === 'villager' || a.kind === 'fighter' || a.kind === 'ally' || a.companion) && dist(a.x, a.y, p.x, p.y) < range) list.push(a);
    }
    return list.sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y));
  },
  reply(text, who, whisper) {
    const list = who ? [who] : this.responders();
    if (!list.length) return;
    const r = who || (Math.random() < 0.6 ? list[0] : pick(list.slice(0, 3)));
    if (!who && Math.random() < 0.15) return;
    const line = this.answer(r, text);
    if (!line) return;
    later(rand(0.8, 1.8), () => {
      if (r.dead) return;
      r.speak(line, 5);
      UI.log((whisper ? '（悄悄話）' : '') + r.name + '：' + line, whisper ? 'whisper' : r instanceof NPC ? 'npc' : 'chat');
      if (r.kind === 'dog' || r.pet) SFX.play('bark', r.x, r.y);
    });
  },
  answer(r, t) {
    const p = G.player;
    if (r.companion === 'pet') return pick({ pwolf: ['嗷嗚～', '汪！', '（搖尾巴）'], fox: ['嚶～', '（豎起耳朵）'], bear: ['吼嗚…', '（拍拍肚子）'], owl: ['咕咕—', '（歪頭）'], boar: ['齁齁！', '（噴氣）'] }[r.sprite] || ['…']);
    if (r.companion === 'charm') return pick(['…♥', '主人…', '（眼神迷濛）']);
    if (r.companion) return pick(['遵命。', '……', '我會守護你。']);
    if (r.kind === 'dog') return pick(['汪！汪！', '嗚～', '（搖尾巴）']);
    const has = (re) => re.test(t);
    if (r instanceof NPC) {
      const role = {
        general: '需要藥水或卷軸嗎？點我就能購買喔。', smith: '要看看武器和防具嗎？', magic: '想學新的魔法嗎？魔法書都在這裡。',
        teleport: '要去哪裡？我可以送你一程。', quest: '村子需要你的幫忙，來看看委託吧。', clan: '想要建立血盟就找我。',
        warehouse: '東西太重可以寄放在我這裡。', jewel: '戒指和項鍊能讓你更強喔。', pet: '要不要帶一隻可愛的寵物回家？', herald: '有血盟就能向灰岩城宣戰！',
      }[r.role];
      if (has(/(你好|哈囉|嗨|hi|hello|安安|早安|午安|晚安)/i)) return '你好，' + p.name + '。' + role;
      if (has(/(謝謝|感謝|3q|thx)/i)) return '不客氣，路上小心！';
      if (has(/(你是誰|名字)/)) return '我是' + r.name + '，這裡的' + r.title + '。';
      return role;
    }
    const lv = r.level || 1;
    const rules = [
      [/(你好|哈囉|嗨|hi|hello|安安|早安|午安|晚安|yo)/i, ['你好呀～', '嗨！今天也要加油喔', '哈囉，' + p.name + '！', '安安～']],
      [/(你是誰|名字|叫什麼)/, ['我是' + r.name + '，' + (r.cls ? CLASSES[r.cls].name : '冒險者') + '。', '叫我' + r.name + '就好。']],
      [/(幾級|等級|多強)/, ['我 Lv.' + lv + ' 喔。', '才 ' + lv + ' 級而已啦～']],
      [/(練功|練等|去哪|哪裡打|推薦|怎麼升級)/, [this.levelTip(p.level)]],
      [/(飛龍|龍)/, ['赤鱗飛龍在峽谷最深處，記得帶橙水！', '飛龍會噴火，戴炎紋戒指比較好。']],
      [/(墓穴|領主|亡靈|骷髏)/, ['地下墓穴在骸骨荒原，裡面很暗，記得用照明術。', '銀箭和神聖武器對亡靈很有效喔！']],
      [/(攻城|城堡|灰岩城|城主)/, ['想攻城要先有血盟，再去找攻城傳令官。', '灰岩城的守護之塔很硬，多帶點人！']],
      [/(血盟|入盟|公會|招人)/, r.clan ? ['我是「' + r.clan + '」的成員。', '我們血盟很歡樂喔！'] : ['我還沒有血盟，有好的推薦嗎？', '你的血盟缺人嗎？']],
      [/(強化|衝裝|爆|卷軸)/, ['強化超過安全值很容易爆，要有心理準備！', '我上次衝 +8 爆了…', '祝福卷軸可以一次 +2、+3 喔。']],
      [/(買|賣|交易|收購|多少錢)/, ['我身上沒什麼好東西耶。', '戰利品拿去雜貨商賣比較快。', '我在收骨頭碎片，有的話再找我。']],
      [/(寵物|召喚|狼靈|巨像|元素)/, ['寵物商人在晨風村和銀風港。', '用馴獸肉乾可以馴服野狼喔！', '法師的召喚術很好用！']],
      [/(魔法|法術|技能)/, ['魔法書在魔法商人那邊買。', '高階魔法書要打頭目才拿得到。']],
      [/(紅名|PK|殺人|邪惡)/i, ['小心荒原的紅名！', '不要亂打人，會變紅名被守衛追喔。']],
      [/(謝謝|感謝|3q|thx)/i, ['不客氣！', '互相幫忙嘛～', '小事啦！']],
      [/(再見|掰|bye|下線)/i, ['掰掰～', '下次見！', '路上小心！']],
      [/(哈哈|呵呵|XD|lol|笑死)/i, ['哈哈哈', 'XD', '笑死']],
      [/(累|好難|死了|好痛|救命)/, ['要不要先回村休息一下？', '加油！喝個紅水吧。', '我幫你！']],
      [/(組隊|一起|幫我|帶我)/, ['好啊，一起走吧！', '我等一下要去練功，先不了～', '可以啊，你要去哪？']],
    ];
    for (const [re, ans] of rules) if (re.test(t)) return pick(ans);
    return pick(['嗯嗯', '是喔？', '原來如此', '我不太懂你的意思…', '有道理', '真的嗎？', '哈哈']);
  },
  levelTip(l) {
    if (l < 6) return '新手可以去碧波草原打野狼和哥布林。';
    if (l < 10) return '試試幽影森林的蜘蛛，或骸骨荒原的骷髏。';
    if (l < 14) return '狼人和峽谷的蜥蜴人經驗不錯。';
    if (l < 19) return '灰燼沙漠和霜嶺高地適合你這個等級。';
    return '你可以挑戰地下墓穴或赤鱗飛龍了！';
  },

  // ---------- 指令 ----------
  command(line) {
    const [cmd0, ...args] = line.split(/\s+/);
    const cmd = (cmd0 || '').toLowerCase();
    const p = G.player, say = (t, c = 'sys') => UI.log(t, c);
    if (GM.handle(cmd, args)) return;
    switch (cmd) {
      case 'help': case '說明':
        say('指令：/who 線上與附近的人・/all 訊息 全頻・/r 訊息 回覆悄悄話・/pos 座標・/time 時間・/save 存檔・/w 名字 訊息 悄悄話・/c 訊息 盟頻・/roll 擲骰・/auto 自動狩獵開關・/pickup 自動拾取開關・/mode 攻擊|自由|待命|跟隨・/pet 夥伴視窗・/stuck 卡住時回村・/clear 清除訊息・/backup 匯出存檔');
        break;
      case 'all': case 's': case '全頻': { const msg = args.join(' '); if (!msg) { say('用法：/all 訊息', 'warn'); break; } Online.world(msg); break; }
      case 'r': {
        const msg = args.join(' ');
        if (!G.lastWhisper || !msg) { say(G.lastWhisper ? '用法：/r 訊息' : '還沒有人對你說悄悄話。', 'warn'); break; }
        if (Online.whisper(G.lastWhisper, msg)) UI.log('（悄悄話給 ' + G.lastWhisper + '）' + msg, 'whisper');
        break;
      }
      case 'who': {
        if (Online.active) {
          Online.who().then((list) => {
            if (!list) return;
            const MAPN = { overworld: '晨曦大陸', isle: '翡翠群島', crypt: '地下墓穴', keep: '地下要塞', volcano: '熾焰火山' };
            say('線上玩家（' + list.length + '）：' + list.map((x) => x.name + ' Lv.' + x.level + (x.clan ? '[' + x.clan + ']' : '') + '・' + (MAPN[x.map] || x.map)).join('、'));
          });
        }
        const list = this.responders(16).filter((a) => !(a instanceof NPC) && !a.companion && a.kind !== 'dog');
        say('附近的冒險者（' + list.length + '）：' + (list.map((a) => a.name + ' Lv.' + a.level + (a.clan ? '[' + a.clan + ']' : '')).join('、') || '沒有人'));
        break;
      }
      case 'pos': say(G.world.zoneName(p.x, p.y) + '（' + G.map.id + '）座標 ' + p.x.toFixed(1) + ', ' + p.y.toFixed(1)); break;
      case 'time': { const h = Math.floor(G.day * 24), m = Math.floor((G.day * 24 - h) * 60); say('現在是遊戲時間 ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + '。'); break; }
      case 'save': saveGame(false); break;
      case 'w': case 'whisper': {
        const name = args[0], msg = args.slice(1).join(' ');
        if (!name || !msg) { say('用法：/w 名字 訊息', 'warn'); break; }
        UI.log('（悄悄話給 ' + name + '）' + msg, 'whisper');
        if (Online.find(name) && Online.whisper(name, msg)) break;
        const t = [...G.map.actors, ...G.map.npcs].find((a) => a.name === name && !a.dead);
        if (!t && Online.active) { Online.whisper(name, msg); break; }
        if (!t) { say(name + ' 不在線上或不在這張地圖。', 'warn'); break; }
        this.reply(msg, t, true);
        break;
      }
      case 'roll': { const n = randi(1, 100); p.speak('🎲 ' + n, 3); say(p.name + ' 擲出了 ' + n + ' 點（1-100）。', 'chat'); break; }
      case 'pickup': {
        const v = args[0];
        Settings.autoPickup = v === 'on' ? true : v === 'off' ? false : !Settings.autoPickup;
        saveSettings(); say('自動拾取：' + (Settings.autoPickup ? '開啟' : '關閉'));
        break;
      }
      case 'mode': {
        const map = { 攻擊: 'assist', 自由: 'free', 待命: 'stay', 跟隨: 'follow', assist: 'assist', free: 'free', stay: 'stay', follow: 'follow' };
        const m = map[args[0]];
        if (!m) { say('用法：/mode 攻擊|自由|待命|跟隨', 'warn'); break; }
        setPetMode(m); break;
      }
      case 'pet': UI.toggle('pet'); break;
      case 'c': case 'clan': { const msg = args.join(' '); if (!msg) { say('用法：/c 訊息', 'warn'); break; } clanChat(msg); Online.clan(msg); break; }
      case 'auto': useHotbarEntry({ kind: 'auto' }); break;
      case 'stuck': if (p.dead) break; say('你被傳送回村莊。'); goHome(); break;
      case 'clear': $('#chatLog').innerHTML = ''; break;
      case 'backup': Backup.download([serializePlayer(p)], p.name); break;
      default: say('未知的指令：/' + cmd0 + '。輸入 /help 查看指令。', 'warn');
    }
  },
};

// ===== 管理員（GM）=====
// 以通關密語開啟：/gm 密語。密語只保存雜湊值。GM 狀態記錄在帳號上。
// 註：本機模式下程式碼在玩家的瀏覽器中執行，懂程式的人仍可修改；正式上線時應改由伺服器驗證。
const GM = {
  SALT: 'dawnlands-gm',
  HASHES: ['024ff68049a05670f6195b15dc149be90aa1b5405c39afda0c43b2ad14f92de2', 'fdc617dbb'],
  on() { return !!(Net.session && Net.meta && Net.meta.get(Net.session, 'gm')); },
  hashes() { try { const h = localStorage.getItem('dawnlands_gm_hash'); if (h) return JSON.parse(h); } catch (e) { /* */ } return this.HASHES; },
  async check(pw) {
    const h = await hashPassword(pw, this.SALT);
    return this.hashes().includes(h);
  },
  // 回傳 true 表示已處理（GM 指令只在 GM 模式時才會被處理，否則當作未知指令）
  handle(cmd, args) {
    const say = (t, c = 'gm') => UI.log(t, c);
    if (cmd === 'gm') {
      if (args[0] === 'off') { if (this.on()) { Net.meta.set(Net.session, 'gm', false); G.player.god = false; G.player.gmSpeed = 1; say('已關閉管理員模式。'); return true; } return false; }
      if (args[0] === 'passwd' && this.on()) {
        const np = args[1]; if (!np || np.length < 6) { say('新密語至少 6 個字元：/gm passwd 新密語'); return true; }
        hashPassword(np, this.SALT).then((h) => { try { localStorage.setItem('dawnlands_gm_hash', JSON.stringify([h])); } catch (e) { /* */ } say('管理員密語已更新（只在這台裝置生效）。'); });
        return true;
      }
      if (!args[0]) return false;
      this.check(args.join(' ')).then((ok) => {
        if (ok) { Net.meta.set(Net.session, 'gm', true); say('管理員模式已開啟。輸入 /gmhelp 查看管理員指令。'); SFX.play('levelup'); }
        else UI.log('未知的指令：/gm。輸入 /help 查看指令。', 'warn');
      });
      return true;
    }
    if (!this.on() || !this.cmds[cmd]) return false;
    try { this.cmds[cmd].call(this, args, say); } catch (e) { say('指令錯誤：' + e.message, 'warn'); }
    UI.refresh();
    return true;
  },
  find(table, q) {
    if (!q) return null;
    if (table[q]) return q;
    const keys = Object.keys(table);
    return keys.find((k) => table[k].name === q) || keys.find((k) => table[k].name && table[k].name.includes(q)) || keys.find((k) => k.includes(q.toLowerCase())) || null;
  },
  cmds: {
    gmhelp(a, say) {
      say('【管理員指令】/item 道具 [數量] [強化]・/learn 魔法|all・/level N・/exp N・/gold N・/stat 能力|points N・/heal・/god・/speed 倍率');
      say('/tp 地點|x y|crypt|overworld・/spawn 怪物 [數量]・/killall [半徑]・/align N・/pet 寵物 [等級]・/day 0~1・/clearinv・/ids items|spells|monsters|pets|places・/siege open|npc|clan|end・/gm passwd 新密語・/gm off');
    },
    item(a, say) {
      const id = GM.find(ITEMS, a[0]); if (!id || id === 'gold') return say('找不到道具：' + a[0] + '（/ids items 可查詢）', 'warn');
      const n = clamp(parseInt(a[1], 10) || 1, 1, 99999), e = clamp(parseInt(a[2], 10) || 0, 0, 30);
      if (id === 'pet_collar') { GM.cmds.pet(['graywolf'], say); return; }
      addItem(id, n, e, true);
      if (e && !ITEMS[id].stack) for (const i of G.player.inv.filter((x) => x.id === id).slice(-n)) i.ench = e;
      say('獲得 ' + (e ? '+' + e + ' ' : '') + ITEMS[id].name + ' ×' + n + '（' + id + '）');
    },
    learn(a, say) {
      const p = G.player;
      if (a[0] === 'all') { p.spells = Object.keys(SPELLS); say('學會了全部魔法。'); return; }
      const id = GM.find(SPELLS, a[0]); if (!id) return say('找不到魔法：' + a[0] + '（/ids spells 可查詢）', 'warn');
      if (!p.spells.includes(id)) p.spells.push(id);
      say('學會了「' + SPELLS[id].name + '」（' + id + '）');
    },
    level(a, say) {
      const p = G.player, n = clamp(parseInt(a[0], 10) || 1, 1, 99);
      if (n > p.level) { while (p.level < n) { p.exp = expForLevel(p.level); gainExp(0); } }
      else { p.level = n; p.exp = 0; recalc(); }
      say('等級設為 ' + p.level + '。');
    },
    exp(a, say) { const n = parseInt(a[0], 10) || 0; gainExp(n); say('獲得經驗值 ' + n + '。'); },
    gold(a, say) { const n = parseInt(a[0], 10) || 0; G.player.gold = Math.max(0, G.player.gold + n); say('金幣 ' + (n >= 0 ? '+' : '') + n + '，目前 ' + G.player.gold.toLocaleString() + '。'); },
    stat(a, say) {
      const p = G.player, k = (a[0] || '').toLowerCase(), n = parseInt(a[1], 10);
      if (k === 'points') { p.statPoints = Math.max(0, n || 0); say('能力點數設為 ' + p.statPoints + '。'); return; }
      const key = STATS.find((s) => s === k || STAT_NAMES[s] === a[0]);
      if (!key || isNaN(n)) return say('用法：/stat str|dex|con|int|wis|cha|points 數值', 'warn');
      p.base[key] = clamp(n, 1, 60); recalc(); say(STAT_NAMES[key] + ' 設為 ' + p.base[key] + '。');
    },
    heal(a, say) { const p = G.player; recalc(); p.hp = p.maxHp; p.mp = p.maxMp; say('體力與魔力已全滿。'); },
    god(a, say) { const p = G.player; p.god = !p.god; say('無敵模式：' + (p.god ? '開' : '關')); },
    speed(a, say) { const p = G.player; p.gmSpeed = clamp(parseFloat(a[0]) || 1, 0.2, 6); say('移動速度倍率：' + p.gmSpeed); },
    tp(a, say) {
      if (!a.length) return say('用法：/tp 地點名稱｜x y｜crypt｜overworld', 'warn');
      if (a[0] === 'crypt' || a[0] === '地下墓穴內') { const w = getMap('crypt').world; changeMap('crypt', w.entry.x + 1, w.entry.y); return; }
      if (a[0] === 'overworld') { changeMap('overworld', 100, 103); return; }
      if (a[0] === 'volcano' || a[0] === '熾焰火山') { const w = getMap('volcano').world; changeMap('volcano', w.entry.x + 1, w.entry.y); return; }
      if (a[0] === 'isle' || a[0] === '翡翠群島') { const w = getMap('isle').world; changeMap('isle', w.dock.x + 1, w.dock.y); return; }
      const x = parseFloat(a[0]), y = parseFloat(a[1]);
      if (!isNaN(x) && !isNaN(y)) { teleportTo(x, y); say('傳送到 ' + x + ', ' + y); return; }
      const ow = getMap('overworld').world;
      const pl = ow.places.find((q) => q.name === a[0]) || ow.places.find((q) => q.name.includes(a[0]));
      if (!pl) return say('找不到地點：' + a[0] + '（/ids places 可查詢）', 'warn');
      if (G.map.id !== 'overworld') changeMap('overworld', pl.x, pl.y + 2); else teleportTo(pl.x, pl.y + 2);
      say('傳送到 ' + pl.name);
    },
    spawn(a, say) {
      const id = GM.find(MONSTERS, a[0]); if (!id) return say('找不到怪物：' + a[0] + '（/ids monsters 可查詢）', 'warn');
      const n = clamp(parseInt(a[1], 10) || 1, 1, 20), p = G.player;
      for (let i = 0; i < n; i++) { const q = G.world.nearestFree(p.x + rand(-3, 3), p.y + rand(-3, 3)); const m = makeMonster(id, q.x, q.y); m.home = { x: q.x, y: q.y }; G.map.actors.push(m); }
      say('召喚了 ' + MONSTERS[id].name + ' ×' + n);
    },
    killall(a, say) {
      const r = parseFloat(a[0]) || 10, p = G.player; let n = 0;
      for (const m of G.map.actors.slice()) if (!m.dead && (m.kind === 'monster' || m.kind === 'pker') && dist(m.x, m.y, p.x, p.y) <= r) { dealDamage(p, m, m.hp + 1); n++; }
      say('消滅了 ' + n + ' 個敵人。');
    },
    align(a, say) { const p = G.player; p.align = clamp(parseInt(a[0], 10) || 0, -32768, 32767); p.pinkT = 0; say('善惡值設為 ' + p.align + '。'); },
    pet(a, say) {
      const id = GM.find(PETS, a[0] || 'graywolf'); if (!id) return say('找不到寵物：' + a[0] + '（/ids pets 可查詢）', 'warn');
      const c = addPetCollar(newPetData(id, clamp(parseInt(a[1], 10) || 1, 1, 60)));
      if (c) say('獲得寵物項圈：' + PETS[id].name + ' Lv.' + c.pet.level);
    },
    day(a, say) { G.day = clamp(parseFloat(a[0]) || 0, 0, 0.999); say('時間設為 ' + G.day + '（0＝午夜，0.5＝正午）'); },
    clearinv(a, say) { G.player.inv = G.player.inv.filter((i) => i.pet); recalc(); say('已清空背包（保留寵物項圈）。'); },
    ids(a, say) {
      const t = { items: ITEMS, spells: SPELLS, monsters: MONSTERS, pets: PETS }[a[0]];
      if (a[0] === 'places') { say(getMap('overworld').world.places.map((q) => q.name).join('、')); return; }
      if (!t) return say('用法：/ids items|spells|monsters|pets|places', 'warn');
      const list = Object.keys(t).filter((k) => !(t === ITEMS && (k === 'gold' || k.startsWith('book_')))).map((k) => k + '＝' + t[k].name);
      for (let i = 0; i < list.length; i += 12) say(list.slice(i, i + 12).join('　'));
      if (t === ITEMS) say('魔法書：book_魔法ID，例如 book_fireball');
    },
    siege(a, say) {
      if (a[0] === 'end' && G.siege && G.siege.active) { G.siege.t = 0.01; say('攻城戰將立即結束。'); }
      else if (a[0] === 'open') { G.siegeForceUntil = Date.now() + SIEGE_WINDOW_MIN * 60000; say('已開放攻城時間 ' + SIEGE_WINDOW_MIN + ' 分鐘（電腦血盟會決定是否宣戰）。'); }
      else if (a[0] === 'npc') { const pool = siegeAttackerPool(); const c = pickWeighted(pool); if (!c) return say('沒有可以宣戰的血盟。', 'warn'); G.siegeForceUntil = Math.max(G.siegeForceUntil || 0, Date.now() + SIEGE_WINDOW_MIN * 60000); G.npcDecl = { at: G.t + 3, clans: [c] }; say('血盟「' + c.name + '」將在 3 秒後攻城。'); }
      else if (a[0] === 'clan') { G.formT = 0; say('下一刻會有冒險者嘗試創立血盟（需要在大陸上、附近有 Lv.12 以上無血盟的冒險者）。'); }
      else say('用法：/siege open|npc|clan|end', 'warn');
    },
  },
};
