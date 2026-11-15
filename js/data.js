'use strict';
// ===== 遊戲資料 =====
const GAME_TITLE = '晨曦大陸';

const ITEMS = {
  // 消耗品
  red_potion:    { name: '紅色藥水', type: 'consume', icon: 'potion', color: '#d0242a', price: 25, desc: '恢復 30 點體力', stack: true },
  orange_potion: { name: '橙色藥水', type: 'consume', icon: 'potion', color: '#e8801c', price: 80, desc: '恢復 80 點體力', stack: true },
  blue_potion:   { name: '藍色藥水', type: 'consume', icon: 'potion', color: '#2a5ad8', price: 60, desc: '恢復 25 點魔力', stack: true },
  haste_potion:  { name: '綠色藥水', type: 'consume', icon: 'potion', color: '#2fae3a', price: 120, desc: '5 分鐘內移動與攻擊速度提升', stack: true },
  return_scroll: { name: '回村卷軸', type: 'consume', icon: 'scroll', color: '#c9b27a', price: 40, desc: '立即傳送回晨風村', stack: true },
  ew_scroll:     { name: '武器強化卷軸', type: 'consume', icon: 'scroll', color: '#e1c45a', price: 500, desc: '強化身上裝備的武器。+6 以上有機率失敗並使武器消失', stack: true },
  ea_scroll:     { name: '防具強化卷軸', type: 'consume', icon: 'scroll', color: '#8fb6e0', price: 400, desc: '強化身上穿著的盔甲。+4 以上有機率失敗並使盔甲消失', stack: true },
  // 武器
  dagger:    { name: '短劍', type: 'weapon', icon: 'sword', color: '#cfd6dc', price: 50, dmg: [2, 7], spd: 0.75, range: 1.3, desc: '輕巧的短劍' },
  longsword: { name: '長劍', type: 'weapon', icon: 'sword', color: '#e2e8ee', price: 600, dmg: [3, 10], spd: 0.9, range: 1.4, desc: '騎士常用的長劍' },
  claymore:  { name: '雙手巨劍', type: 'weapon', icon: 'sword', color: '#f2f2ff', price: 2600, dmg: [6, 18], spd: 1.25, range: 1.5, desc: '沉重但威力強大' },
  shortbow:  { name: '短弓', type: 'weapon', icon: 'bow', color: '#a8743e', price: 300, dmg: [2, 7], spd: 0.95, range: 6, ranged: true, desc: '可以從遠處射擊' },
  longbow:   { name: '長弓', type: 'weapon', icon: 'bow', color: '#7c4f22', price: 2200, dmg: [4, 13], spd: 1.05, range: 7.5, ranged: true, desc: '射程更遠的長弓' },
  // 防具
  leather:   { name: '皮甲', type: 'armor', icon: 'armor', color: '#8a5a32', price: 100, ac: 2, desc: '基本的皮製盔甲' },
  chainmail: { name: '鎖子甲', type: 'armor', icon: 'armor', color: '#9aa3ad', price: 900, ac: 4, desc: '以鐵環編成的盔甲' },
  plate:     { name: '板金鎧甲', type: 'armor', icon: 'armor', color: '#d4dae2', price: 3200, ac: 7, desc: '堅固的全身板甲' },
  // 雜物（戰利品）
  wolf_fang:   { name: '狼牙', type: 'junk', icon: 'fang', color: '#efe7cf', price: 15, stack: true, desc: '可以賣給商人' },
  goblin_ear:  { name: '哥布林耳朵', type: 'junk', icon: 'ear', color: '#6f9a3a', price: 22, stack: true, desc: '可以賣給商人' },
  bone_shard:  { name: '骨頭碎片', type: 'junk', icon: 'bone', color: '#e8e3d0', price: 30, stack: true, desc: '可以賣給商人' },
  bark:        { name: '古樹樹皮', type: 'junk', icon: 'bark', color: '#7a5634', price: 45, stack: true, desc: '可以賣給商人' },
  ghoul_claw:  { name: '腐爛的爪子', type: 'junk', icon: 'fang', color: '#9ab08a', price: 55, stack: true, desc: '可以賣給商人' },
  lizard_skin: { name: '蜥蜴皮', type: 'junk', icon: 'bark', color: '#4e8a52', price: 60, stack: true, desc: '可以賣給商人' },
  wyvern_scale:{ name: '飛龍鱗片', type: 'junk', icon: 'scale', color: '#c0703a', price: 1500, stack: true, desc: '非常珍貴的鱗片' },
};

// 怪物定義
const MONSTERS = {
  wolf: {
    name: '野狼', lvl: 2, hp: 18, dmg: [1, 4], ac: 1, exp: 9, speed: 3.4, atkSpd: 1.1, range: 1.2,
    aggro: false, aggroR: 0, sprite: 'wolf', color: '#7d7b78', gold: [2, 8],
    loot: [['wolf_fang', 0.45], ['red_potion', 0.08]],
  },
  goblin: {
    name: '哥布林', lvl: 4, hp: 34, dmg: [2, 6], ac: 2, exp: 16, speed: 2.6, atkSpd: 1.2, range: 1.25,
    aggro: true, aggroR: 4.5, sprite: 'goblin', color: '#6b8e3a', gold: [5, 14],
    loot: [['goblin_ear', 0.45], ['red_potion', 0.12], ['dagger', 0.03], ['return_scroll', 0.05]],
  },
  skeleton: {
    name: '骷髏', lvl: 7, hp: 55, dmg: [3, 9], ac: 4, exp: 30, speed: 2.4, atkSpd: 1.3, range: 1.3,
    aggro: true, aggroR: 5, sprite: 'skeleton', color: '#e6e0cc', gold: [8, 22],
    loot: [['bone_shard', 0.5], ['red_potion', 0.12], ['longsword', 0.015], ['ew_scroll', 0.02], ['shortbow', 0.02]],
  },
  treant: {
    name: '樹精', lvl: 9, hp: 95, dmg: [4, 11], ac: 6, exp: 44, speed: 1.6, atkSpd: 1.7, range: 1.5,
    aggro: true, aggroR: 3.5, sprite: 'treant', color: '#5a4026', gold: [10, 28],
    loot: [['bark', 0.55], ['orange_potion', 0.08], ['ea_scroll', 0.02], ['leather', 0.04]],
  },
  ghoul: {
    name: '食屍鬼', lvl: 11, hp: 110, dmg: [5, 13], ac: 5, exp: 62, speed: 2.8, atkSpd: 1.1, range: 1.3,
    aggro: true, aggroR: 5.5, sprite: 'ghoul', color: '#8e9e83', gold: [14, 34],
    loot: [['ghoul_claw', 0.5], ['orange_potion', 0.1], ['ew_scroll', 0.03], ['chainmail', 0.012]],
  },
  lizardman: {
    name: '蜥蜴人', lvl: 13, hp: 140, dmg: [6, 15], ac: 7, exp: 85, speed: 2.7, atkSpd: 1.2, range: 1.6,
    aggro: true, aggroR: 5.5, sprite: 'lizard', color: '#4f8a46', gold: [18, 45],
    loot: [['lizard_skin', 0.5], ['orange_potion', 0.12], ['ew_scroll', 0.035], ['ea_scroll', 0.03], ['longbow', 0.008], ['claymore', 0.006]],
  },
  wyvern: {
    name: '赤鱗飛龍', lvl: 22, hp: 1400, dmg: [12, 26], ac: 12, exp: 1600, speed: 3.0, atkSpd: 1.6, range: 2.2,
    aggro: true, aggroR: 7, sprite: 'wyvern', color: '#9a4d26', gold: [400, 900], boss: true, breath: true,
    loot: [['wyvern_scale', 1], ['wyvern_scale', 0.5], ['ew_scroll', 0.6], ['ea_scroll', 0.5], ['claymore', 0.15], ['longbow', 0.15], ['plate', 0.12]],
  },
};

const CLASSES = {
  knight: { name: '劍士', hp: 46, mp: 8, hpLv: [10, 14], mpLv: [1, 3], weapon: 'dagger', armor: 'leather', desc: '高體力的近戰職業，擅長使用劍' },
  ranger: { name: '遊俠', hp: 34, mp: 18, hpLv: [7, 10], mpLv: [3, 6], weapon: 'shortbow', armor: 'leather', desc: '擅長弓箭，能從遠處攻擊敵人' },
};

const SKILLS = {
  heal:  { name: '治癒術', mp: 5, lvl: 1, icon: 'heal', desc: '恢復自身體力' },
  holy:  { name: '神聖武器', mp: 10, lvl: 4, icon: 'holy', dur: 180, desc: '武器附著神聖的力量，傷害+2、命中提升' },
  shield:{ name: '防護罩', mp: 8, lvl: 8, icon: 'shield', dur: 240, desc: '防禦力提升 3 點' },
};

// 快捷列（1-9）
const HOTBAR = [
  { kind: 'item', id: 'red_potion' },
  { kind: 'item', id: 'orange_potion' },
  { kind: 'item', id: 'blue_potion' },
  { kind: 'item', id: 'haste_potion' },
  { kind: 'skill', id: 'heal' },
  { kind: 'skill', id: 'holy' },
  { kind: 'skill', id: 'shield' },
  { kind: 'item', id: 'return_scroll' },
  { kind: 'auto' },
];

const SHOPS = {
  general: ['red_potion', 'orange_potion', 'blue_potion', 'haste_potion', 'return_scroll', 'ew_scroll', 'ea_scroll'],
  smith: ['dagger', 'longsword', 'claymore', 'shortbow', 'longbow', 'leather', 'chainmail', 'plate'],
};

const QUESTS = [
  { target: 'wolf', count: 8, gold: 150, exp: 80, item: ['red_potion', 10], text: '草原上的野狼常常襲擊旅人，去碧波草原消滅 8 隻野狼吧。' },
  { target: 'goblin', count: 10, gold: 300, exp: 220, item: ['haste_potion', 2], text: '哥布林在幽影森林外圍出沒，替我們消滅 10 隻。' },
  { target: 'skeleton', count: 12, gold: 600, exp: 600, item: ['ew_scroll', 1], text: '骸骨荒原的骷髏又復活了，消滅 12 隻骷髏。' },
  { target: 'treant', count: 10, gold: 900, exp: 1100, item: ['ea_scroll', 1], text: '森林深處的樹精開始暴走，砍倒 10 棵樹精。' },
  { target: 'lizardman', count: 15, gold: 1500, exp: 2400, item: ['orange_potion', 15], text: '赤岩峽谷的蜥蜴人部族蠢蠢欲動，討伐 15 隻蜥蜴人。' },
  { target: 'wyvern', count: 1, gold: 5000, exp: 6000, item: ['ew_scroll', 3], text: '峽谷最深處的赤鱗飛龍是一切的元兇，勇者啊，去討伐牠吧！' },
];

const ADVENTURER_NAMES = ['風之翼', '小白兔', '雷霆戰神', '月影', '阿爾法', '火焰鳥', '冷月無聲', '大胖', '星辰', '夜行者', '鐵拳', '青楓', '浪人', '琥珀', '銀狐'];
const ADVENTURER_LINES = [
  '收購骨頭碎片，價格好談', '有人要組隊打飛龍嗎？', '賣武器強化卷軸，私訊', '峽谷的蜥蜴人好痛…',
  '今天手氣不錯', '剛剛衝 +7 失敗了 QQ', '誰有多的紅水？', '晚上的荒原好可怕', '哈囉大家好', '求帶練功',
  '橙水比較划算喔', '草原新手區很適合練等',
];

function expForLevel(l) { return Math.floor(24 * Math.pow(l, 2.15)); }
