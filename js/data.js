'use strict';
// ===== 遊戲資料（原創內容）=====
const GAME_TITLE = '晨曦大陸';
const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_NAMES = { str: '力量', dex: '敏捷', con: '體質', int: '智力', wis: '精神', cha: '魅力' };
const STAT_SHORT = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const statMod = (v) => Math.floor((v - 10) / 2);

// ---------- 職業 ----------
// mlDiv：每幾級提升 1 魔法等級
const CLASSES = {
  knight: {
    name: '騎士', role: '近戰', color: '#c84a3a',
    desc: '身披重甲的前鋒，體力與防禦最高，擅長單手劍與雙手巨劍。',
    base: { str: 16, dex: 12, con: 15, int: 8, wis: 9, cha: 10 },
    hp: 32, mp: 4, hpDie: [9, 13], mpDie: [0, 2], mlDiv: 40,
    start: [['iron_sword', 1, true], ['wood_shield', 1, true], ['leather', 1, true], ['leather_cap', 1, true], ['red_potion', 20], ['return_scroll', 3]],
    spells: ['powerstrike'],
    look: { skin: '#e8c49a', hair: '#8a5a2a', cape: '#7a1a1a', trim: '#d0b050', legs: '#3a3e4a', boots: '#2a1e16', belt: '#3a2614' },
  },
  mage: {
    name: '法師', role: '魔法', color: '#5a7ad8',
    desc: '精通元素魔法的學者，體力薄弱，但能以強大的攻擊魔法殲滅敵人。',
    base: { str: 8, dex: 10, con: 10, int: 17, wis: 13, cha: 10 },
    hp: 18, mp: 20, hpDie: [4, 7], mpDie: [5, 8], mlDiv: 4,
    start: [['oak_staff', 1, true], ['robe', 1, true], ['red_potion', 15], ['blue_potion', 10], ['return_scroll', 3]],
    spells: ['lightbolt', 'heal1'],
    look: { skin: '#f0d0b0', hair: '#4a3a6a', hood: '#2a2a5a', legs: '#2a2a4a', boots: '#2a1e16', belt: '#a08040' },
  },
  ranger: {
    name: '遊俠', role: '弓手', color: '#4aa05a',
    desc: '身手矯健的弓箭手，能從遠方射擊，也懂得少量自然魔法。',
    base: { str: 11, dex: 17, con: 11, int: 11, wis: 12, cha: 10 },
    hp: 24, mp: 10, hpDie: [6, 9], mpDie: [2, 4], mlDiv: 8,
    start: [['hunting_bow', 1, true], ['leather', 1, true], ['arrow', 600], ['red_potion', 20], ['return_scroll', 3]],
    spells: ['heal1'],
    look: { skin: '#f0d0b0', hair: '#e8d070', longHair: true, cape: '#1a3a2a', trim: '#e8e8f0', legs: '#2a3a24', boots: '#5a3a1a', belt: '#6a4a2a' },
  },
  cleric: {
    name: '牧師', role: '輔助', color: '#e0c060',
    desc: '受神祝福的聖職者，擅長治療與輔助魔法，對亡靈特別有效。',
    base: { str: 12, dex: 9, con: 13, int: 10, wis: 17, cha: 11 },
    hp: 26, mp: 14, hpDie: [7, 10], mpDie: [3, 6], mlDiv: 5,
    start: [['mace', 1, true], ['wood_shield', 1, true], ['leather', 1, true], ['red_potion', 15], ['blue_potion', 5], ['return_scroll', 3]],
    spells: ['heal1', 'shield'],
    look: { skin: '#f0cfa8', hair: '#d8d0c0', robeBody: true, cape: '#e8e0c8', trim: '#d0a040', legs: '#e0d8c8', boots: '#6a5030', belt: '#c09040' },
  },
};
const CREATE_BONUS = 6;   // 創角可分配點數
const STAT_MAX_CREATE = 18;

// ---------- 裝備欄位 ----------
const SLOTS = ['helm', 'amulet', 'armor', 'cloak', 'weapon', 'shield', 'gloves', 'belt', 'boots', 'ring1', 'ring2'];
const SLOT_NAMES = { helm: '頭盔', amulet: '項鍊', armor: '盔甲', cloak: '斗篷', weapon: '武器', shield: '盾牌', gloves: '手套', belt: '腰帶', boots: '長靴', ring1: '戒指', ring2: '戒指' };

// ---------- 道具 ----------
// type: weapon/armor/acc/consume/book/ammo/junk
// slot: 對應裝備欄位；cls：可用職業（省略=全部）
const ITEMS = {
  // ===== 武器 =====
  rusty_dagger:  { name: '生鏽短劍', type: 'weapon', wclass: 'dagger', dmg: [1, 4], spd: 0.7, range: 1.3, w: 20, price: 20, safe: 6 },
  dagger:        { name: '短劍', type: 'weapon', wclass: 'dagger', dmg: [2, 6], spd: 0.7, range: 1.3, w: 30, price: 80, safe: 6 },
  iron_sword:    { name: '鐵劍', type: 'weapon', wclass: 'sword', dmg: [3, 8], spd: 0.85, range: 1.4, w: 60, price: 220, safe: 6, cls: ['knight', 'ranger', 'cleric'] },
  knight_sword:  { name: '騎士長劍', type: 'weapon', wclass: 'sword', dmg: [4, 11], spd: 0.9, range: 1.4, w: 80, price: 1100, safe: 6, lvl: 5, cls: ['knight'] },
  mithril_rapier:{ name: '秘銀細劍', type: 'weapon', wclass: 'sword', dmg: [5, 12], hit: 2, spd: 0.72, range: 1.4, w: 40, price: 5200, safe: 6, lvl: 10, cls: ['knight', 'ranger'], rare: true },
  war_axe:       { name: '戰斧', type: 'weapon', wclass: 'axe', dmg: [6, 14], spd: 1.1, range: 1.4, w: 150, price: 2000, safe: 6, lvl: 8, cls: ['knight'] },
  spear:         { name: '長槍', type: 'weapon', wclass: 'spear', dmg: [4, 13], spd: 1.05, range: 2.0, w: 120, price: 1400, safe: 6, lvl: 6, twoHand: true, cls: ['knight'] },
  claymore:      { name: '雙手巨劍', type: 'weapon', wclass: 'claymore', dmg: [7, 18], spd: 1.25, range: 1.5, w: 200, price: 3600, safe: 6, lvl: 10, twoHand: true, cls: ['knight'] },
  dragonfang:    { name: '龍牙巨劍', type: 'weapon', wclass: 'claymore', dmg: [12, 26], dmgB: 2, spd: 1.2, range: 1.5, w: 220, price: 30000, safe: 6, lvl: 18, twoHand: true, cls: ['knight'], res: { fire: 10 }, rare: true },
  mace:          { name: '鐵錘', type: 'weapon', wclass: 'mace', dmg: [3, 9], spd: 0.95, range: 1.35, w: 90, price: 260, safe: 6, cls: ['cleric', 'knight'] },
  holy_mace:     { name: '聖光戰錘', type: 'weapon', wclass: 'mace', dmg: [6, 14], spd: 0.95, range: 1.35, w: 100, price: 4800, safe: 6, lvl: 10, sp: 1, undeadB: 6, cls: ['cleric'], rare: true },
  oak_staff:     { name: '橡木法杖', type: 'weapon', wclass: 'staff', dmg: [1, 5], spd: 1.0, range: 1.4, w: 40, price: 90, safe: 6, sp: 1, twoHand: true, cls: ['mage', 'cleric'] },
  crystal_staff: { name: '水晶法杖', type: 'weapon', wclass: 'staff', dmg: [2, 7], spd: 1.0, range: 1.4, w: 50, price: 3800, safe: 6, sp: 3, mp: 20, lvl: 10, twoHand: true, cls: ['mage', 'cleric'] },
  star_staff:    { name: '星辰法杖', type: 'weapon', wclass: 'staff', dmg: [4, 10], spd: 1.0, range: 1.4, w: 50, price: 30000, safe: 6, sp: 6, mp: 50, lvl: 18, twoHand: true, cls: ['mage'], rare: true },
  hunting_bow:   { name: '獵弓', type: 'weapon', wclass: 'bow', dmg: [2, 7], spd: 0.95, range: 6, ranged: true, w: 50, price: 240, safe: 6, twoHand: true, cls: ['ranger', 'knight'] },
  composite_bow: { name: '複合長弓', type: 'weapon', wclass: 'bow', dmg: [4, 11], spd: 1.0, range: 7.5, ranged: true, w: 70, price: 3200, safe: 6, lvl: 10, twoHand: true, cls: ['ranger'] },
  gale_bow:      { name: '風鳴之弓', type: 'weapon', wclass: 'bow', dmg: [7, 16], spd: 0.9, range: 8, ranged: true, w: 60, price: 30000, safe: 6, lvl: 18, twoHand: true, cls: ['ranger'], stat: { dex: 2 }, res: { wind: 10 }, rare: true },
  // ===== 防具 =====
  leather_cap:   { name: '皮帽', type: 'armor', slot: 'helm', ac: 1, w: 15, price: 50, safe: 4 },
  iron_helm:     { name: '鐵盔', type: 'armor', slot: 'helm', ac: 2, w: 45, price: 600, safe: 4, cls: ['knight', 'cleric', 'ranger'] },
  wizard_hat:    { name: '法師帽', type: 'armor', slot: 'helm', ac: 1, mr: 5, w: 10, price: 700, safe: 4, cls: ['mage', 'cleric'] },
  leather:       { name: '皮甲', type: 'armor', slot: 'armor', ac: 2, w: 100, price: 120, safe: 4 },
  studded:       { name: '鑲釘皮甲', type: 'armor', slot: 'armor', ac: 3, w: 140, price: 480, safe: 4, cls: ['knight', 'ranger', 'cleric'] },
  chainmail:     { name: '鎖子甲', type: 'armor', slot: 'armor', ac: 4, w: 250, price: 1400, safe: 4, lvl: 5, cls: ['knight', 'cleric'] },
  plate:         { name: '板金鎧甲', type: 'armor', slot: 'armor', ac: 7, w: 450, price: 5200, safe: 4, lvl: 12, cls: ['knight'] },
  robe:          { name: '法師長袍', type: 'armor', slot: 'armor', ac: 1, mr: 10, sp: 1, w: 40, price: 160, safe: 4, cls: ['mage', 'cleric'] },
  archmage_robe: { name: '大法師長袍', type: 'armor', slot: 'armor', ac: 3, mr: 20, sp: 2, mp: 30, w: 50, price: 12000, safe: 4, lvl: 15, cls: ['mage', 'cleric'], rare: true },
  travel_cloak:  { name: '旅人斗篷', type: 'armor', slot: 'cloak', ac: 1, w: 20, price: 150, safe: 4 },
  shadow_cloak:  { name: '暗影斗篷', type: 'armor', slot: 'cloak', ac: 2, er: 4, w: 20, price: 6000, safe: 4, lvl: 10, rare: true },
  wood_shield:   { name: '木盾', type: 'armor', slot: 'shield', ac: 1, w: 60, price: 70, safe: 4, cls: ['knight', 'cleric', 'ranger'] },
  tower_shield:  { name: '鐵塔盾', type: 'armor', slot: 'shield', ac: 3, w: 200, price: 1800, safe: 4, lvl: 8, cls: ['knight', 'cleric'] },
  leather_gloves:{ name: '皮手套', type: 'armor', slot: 'gloves', ac: 1, w: 10, price: 90, safe: 4 },
  iron_gauntlet: { name: '鐵手套', type: 'armor', slot: 'gloves', ac: 2, w: 40, price: 800, safe: 4, cls: ['knight', 'cleric'] },
  leather_boots: { name: '皮靴', type: 'armor', slot: 'boots', ac: 1, w: 20, price: 90, safe: 4 },
  iron_boots:    { name: '鐵靴', type: 'armor', slot: 'boots', ac: 2, w: 60, price: 800, safe: 4, cls: ['knight', 'cleric'] },
  // ===== 飾品（不可強化）=====
  leather_belt:  { name: '皮帶', type: 'acc', slot: 'belt', weight: 300, w: 10, price: 400 },
  giant_belt:    { name: '巨人腰帶', type: 'acc', slot: 'belt', weight: 800, stat: { str: 1 }, w: 15, price: 9000, rare: true },
  ring_str:      { name: '蠻力戒指', type: 'acc', slot: 'ring', stat: { str: 1 }, w: 2, price: 3000, rare: true },
  ring_dex:      { name: '迅捷戒指', type: 'acc', slot: 'ring', stat: { dex: 1 }, w: 2, price: 3000, rare: true },
  ring_int:      { name: '睿智戒指', type: 'acc', slot: 'ring', stat: { int: 1 }, w: 2, price: 3000, rare: true },
  ring_fire:     { name: '炎紋戒指', type: 'acc', slot: 'ring', res: { fire: 20 }, w: 2, price: 1500 },
  ring_guard:    { name: '守衛戒指', type: 'acc', slot: 'ring', ac: 1, w: 2, price: 2500 },
  amulet_wis:    { name: '精神項鍊', type: 'acc', slot: 'amulet', stat: { wis: 1 }, mp: 15, w: 5, price: 4000, rare: true },
  amulet_guard:  { name: '守護項鍊', type: 'acc', slot: 'amulet', mr: 10, hp: 20, w: 5, price: 4500 },
  amulet_earth:  { name: '大地項鍊', type: 'acc', slot: 'amulet', res: { earth: 15, water: 15 }, w: 5, price: 1600 },
  // ===== 消耗品 =====
  red_potion:    { name: '紅色藥水', type: 'consume', w: 2, price: 25, stack: true, desc: '恢復 30 點體力' },
  orange_potion: { name: '橙色藥水', type: 'consume', w: 2, price: 75, stack: true, desc: '恢復 70 點體力' },
  clear_potion:  { name: '清澈藥水', type: 'consume', w: 2, price: 220, stack: true, desc: '恢復 150 點體力' },
  blue_potion:   { name: '藍色藥水', type: 'consume', w: 2, price: 90, stack: true, desc: '恢復 30 點魔力' },
  haste_potion:  { name: '綠色藥水', type: 'consume', w: 2, price: 160, stack: true, desc: '5 分鐘內移動與攻擊速度提升' },
  return_scroll: { name: '回村卷軸', type: 'consume', w: 1, price: 40, stack: true, desc: '傳送到距離最近的村莊' },
  teleport_scroll:{ name: '瞬間移動卷軸', type: 'consume', w: 1, price: 60, stack: true, desc: '隨機傳送到目前地圖的某處' },
  ew_scroll:     { name: '武器強化卷軸', type: 'consume', w: 1, price: 600, stack: true, desc: '強化武器 +1。超過安全值可能失敗並使武器消失' },
  ea_scroll:     { name: '防具強化卷軸', type: 'consume', w: 1, price: 500, stack: true, desc: '強化防具 +1。超過安全值可能失敗並使防具消失' },
  bew_scroll:    { name: '祝福武器強化卷軸', type: 'consume', w: 1, price: 4000, stack: true, rare: true, desc: '強化武器 +1～+3，風險同一般卷軸' },
  bea_scroll:    { name: '祝福防具強化卷軸', type: 'consume', w: 1, price: 3500, stack: true, rare: true, desc: '強化防具 +1～+3，風險同一般卷軸' },
  tame_jerky:    { name: '馴獸肉乾', type: 'consume', icon: 'jerky', w: 1, price: 150, stack: true, desc: '對體力低於一半的野狼使用，有機會馴服牠成為寵物' },
  pet_collar:    { name: '寵物項圈', type: 'collar', icon: 'collar', w: 3, price: 200, desc: '裝著寵物的項圈。點擊召喚或收回寵物' },
  arrow:         { name: '箭', type: 'ammo', w: 0.1, price: 1, stack: true, desc: '弓的彈藥' },
  silver_arrow:  { name: '銀箭', type: 'ammo', w: 0.1, price: 4, stack: true, dmgB: 1, undeadB: 3, desc: '對亡靈額外傷害的箭' },
  // ===== 戰利品 =====
  wolf_fang:   { name: '狼牙', type: 'junk', w: 2, price: 15, stack: true },
  goblin_ear:  { name: '哥布林耳朵', type: 'junk', w: 1, price: 22, stack: true },
  spider_silk: { name: '蜘蛛絲', type: 'junk', w: 1, price: 35, stack: true },
  bark:        { name: '古樹樹皮', type: 'junk', w: 5, price: 45, stack: true },
  wolf_pelt:   { name: '狼人毛皮', type: 'junk', w: 8, price: 80, stack: true },
  bone_shard:  { name: '骨頭碎片', type: 'junk', w: 3, price: 30, stack: true },
  ghoul_claw:  { name: '腐爛的爪子', type: 'junk', w: 2, price: 55, stack: true },
  ectoplasm:   { name: '怨靈精華', type: 'junk', w: 1, price: 90, stack: true },
  lizard_skin: { name: '蜥蜴皮', type: 'junk', w: 6, price: 60, stack: true },
  golem_core:  { name: '岩石核心', type: 'junk', w: 20, price: 180, stack: true },
  scorpion_tail:{ name: '巨蠍尾針', type: 'junk', w: 4, price: 95, stack: true },
  mummy_cloth: { name: '古老繃帶', type: 'junk', w: 2, price: 110, stack: true },
  worm_tooth:  { name: '沙蟲利齒', type: 'junk', w: 6, price: 150, stack: true },
  wyvern_scale:{ name: '飛龍鱗片', type: 'junk', w: 10, price: 1500, stack: true, rare: true },
  lich_gem:    { name: '冥府寶石', type: 'junk', w: 3, price: 2500, stack: true, rare: true },
  gold:        { name: '金幣', type: 'gold', w: 0, price: 0 },
};
// 道具圖示類型
for (const id in ITEMS) {
  const it = ITEMS[id];
  if (!it.icon) {
    if (it.type === 'weapon') it.icon = it.wclass;
    else if (it.type === 'armor' || it.type === 'acc') it.icon = it.slot;
    else if (it.type === 'consume') it.icon = /potion/.test(id) ? 'potion' : 'scroll';
    else if (it.type === 'ammo') it.icon = 'arrow';
    else if (it.type === 'gold') it.icon = 'gold';
    else it.icon = 'junk';
  }
}
const POTION_COLORS = { red_potion: '#d0242a', orange_potion: '#e8801c', clear_potion: '#e8f0ff', blue_potion: '#2a5ad8', haste_potion: '#2fae3a' };
const SCROLL_COLORS = { return_scroll: '#c9b27a', teleport_scroll: '#a0c8e0', ew_scroll: '#e1c45a', ea_scroll: '#8fb6e0', bew_scroll: '#ffd860', bea_scroll: '#b8e0ff' };

// ---------- 魔法 ----------
// learn：各職業可學習的等級（null=不能學）
const SPELLS = {
  heal1:      { name: '初級治癒術', circle: 1, mp: 4, target: 'self', icon: 'heal', learn: { knight: 10, mage: 1, ranger: 1, cleric: 1 }, desc: '恢復少量體力' },
  lightbolt:  { name: '光之箭', circle: 1, mp: 4, target: 'enemy', icon: 'light', learn: { mage: 1, cleric: 3 }, desc: '發射一道光束攻擊敵人' },
  shield:     { name: '防護術', circle: 1, mp: 6, target: 'self', icon: 'shield', dur: 300, learn: { knight: 1, mage: 1, ranger: 1, cleric: 1 }, desc: '防禦力 +2' },
  powerstrike:{ name: '重擊', circle: 1, mp: 4, target: 'enemy', icon: 'strike', learn: { knight: 1 }, melee: true, desc: '以全力揮出造成 2 倍傷害的一擊' },
  glow:       { name: '照明術', circle: 1, mp: 3, target: 'self', icon: 'glow', dur: 600, learn: { knight: 1, mage: 1, ranger: 1, cleric: 1 }, desc: '在身邊產生光芒，夜晚與地下城更明亮' },
  icebolt:    { name: '冰錐術', circle: 2, mp: 8, target: 'enemy', icon: 'ice', learn: { mage: 4 }, desc: '冰錐造成傷害並使敵人減速' },
  holy:       { name: '神聖武器', circle: 2, mp: 8, target: 'self', icon: 'holy', dur: 300, learn: { knight: 15, cleric: 5, ranger: 12 }, desc: '武器附著神聖之力，傷害 +2、命中提升' },
  windshot:   { name: '疾風箭', circle: 2, mp: 6, target: 'enemy', icon: 'wind', learn: { ranger: 6 }, bow: true, desc: '一次射出三支箭（需裝備弓）' },
  heal2:      { name: '中級治癒術', circle: 3, mp: 12, target: 'self', icon: 'heal2', learn: { mage: 8, cleric: 8, ranger: 16 }, desc: '恢復中量體力' },
  lightning:  { name: '雷擊', circle: 3, mp: 14, target: 'enemy', icon: 'bolt', learn: { mage: 8 }, desc: '召喚雷電轟擊敵人' },
  haste:      { name: '加速術', circle: 3, mp: 15, target: 'self', icon: 'haste', dur: 300, learn: { mage: 10, cleric: 12 }, desc: '移動與攻擊速度提升' },
  earthskin:  { name: '大地之膚', circle: 3, mp: 10, target: 'self', icon: 'earth', dur: 300, learn: { ranger: 12 }, desc: '防禦力 +5' },
  fireball:   { name: '火球術', circle: 4, mp: 22, target: 'enemy', icon: 'fire', aoe: 2.5, learn: { mage: 12 }, desc: '爆炸的火球，傷害範圍內所有敵人' },
  blessarmor: { name: '祝福鎧甲', circle: 4, mp: 16, target: 'self', icon: 'bless', dur: 300, learn: { mage: 14, cleric: 14 }, desc: '防禦力 +4、魔法防禦 +10' },
  turnundead: { name: '驅散亡靈', circle: 4, mp: 18, target: 'self', icon: 'turn', aoe: 4, learn: { cleric: 12 }, desc: '神聖之光重創周圍的亡靈' },
  heal3:      { name: '高級治癒術', circle: 5, mp: 24, target: 'self', icon: 'heal3', learn: { mage: 18, cleric: 16 }, desc: '恢復大量體力' },
  meteor:     { name: '流星火雨', circle: 5, mp: 40, target: 'enemy', icon: 'meteor', aoe: 3.5, learn: { mage: 18 }, desc: '召喚隕石轟炸大範圍敵人' },
  sanctuary:  { name: '神聖光環', circle: 5, mp: 30, target: 'self', icon: 'sanct', dur: 60, learn: { cleric: 20 }, desc: '60 秒內每秒恢復體力' },
  // ----- 範圍與追加魔法 -----
  flamering:  { name: '烈焰環', circle: 1, mp: 8, target: 'self', icon: 'fring', aoe: 2.2, learn: { mage: 3 }, desc: '以自己為中心爆發火焰，傷害周圍所有敵人' },
  whirlwind:  { name: '旋風斬', circle: 1, mp: 6, target: 'self', icon: 'whirl', aoe: 1.9, learn: { knight: 5 }, desc: '揮舞武器橫掃身邊所有敵人（需近戰武器）' },
  holylight:  { name: '聖光爆', circle: 2, mp: 9, target: 'enemy', icon: 'hlight', aoe: 2, learn: { cleric: 4 }, desc: '在目標處降下聖光，範圍傷害，對亡靈加倍' },
  arrowrain:  { name: '箭雨', circle: 2, mp: 8, target: 'enemy', icon: 'arrows', aoe: 2.2, bow: true, learn: { ranger: 5 }, desc: '向目標區域射出箭雨（最多消耗 5 支箭）' },
  frostnova:  { name: '冰霜新星', circle: 2, mp: 12, target: 'self', icon: 'frost', aoe: 2.6, learn: { mage: 6 }, desc: '向四周釋放寒氣，傷害並減速周圍敵人' },
  blink:      { name: '瞬移術', circle: 2, mp: 6, target: 'self', icon: 'blink', learn: { mage: 5, cleric: 8, ranger: 10 }, desc: '瞬間移動到滑鼠位置（最遠 8 格）' },
  warcry:     { name: '戰吼', circle: 2, mp: 8, target: 'self', icon: 'warcry', dur: 60, learn: { knight: 10 }, desc: '吸引周圍怪物攻擊你，並提升防禦 3（60 秒）' },
  poison:     { name: '毒霧', circle: 3, mp: 14, target: 'enemy', icon: 'poison', aoe: 2.5, learn: { mage: 9 }, desc: '在目標處產生毒霧，6 秒內持續傷害範圍內敵人' },
  might:      { name: '力量祝福', circle: 3, mp: 10, target: 'self', icon: 'might', dur: 300, learn: { knight: 8, cleric: 9, ranger: 10 }, desc: '物理傷害 +3（5 分鐘）' },
  trueshot:   { name: '穿心箭', circle: 3, mp: 12, target: 'enemy', icon: 'trueshot', bow: true, learn: { ranger: 14 }, desc: '射出一支 2.5 倍傷害、容易爆擊的箭' },
  chainlightning: { name: '連鎖閃電', circle: 4, mp: 24, target: 'enemy', icon: 'chain', learn: { mage: 15 }, desc: '閃電在最多 4 個敵人之間跳躍' },
  groupheal:  { name: '群體治癒術', circle: 4, mp: 22, target: 'self', icon: 'gheal', learn: { cleric: 13, mage: 16 }, desc: '治療自己與周圍所有夥伴、盟友' },
  blizzard:   { name: '暴風雪', circle: 5, mp: 45, target: 'enemy', icon: 'blizz', aoe: 4, learn: { mage: 20 }, desc: '大範圍的冰雪風暴，造成三次傷害並減速' },
  charm:      { name: '迷魅術', circle: 3, mp: 16, target: 'enemy', icon: 'charm', learn: { mage: 12 }, desc: '讓一隻怪物暫時成為你的盟友（30 分鐘，最多 3 隻）。頭目、守衛與冒險者無效' },
  summon_wolf:  { name: '召喚狼靈', circle: 3, mp: 20, target: 'self', icon: 'swolf', summon: 'spiritwolf', learn: { mage: 10, cleric: 10 }, desc: '召喚靈體之狼跟隨作戰（30 分鐘）' },
  summon_golem: { name: '召喚岩石巨像', circle: 4, mp: 30, target: 'self', icon: 'sgolem', summon: 'stonegolem', learn: { mage: 14, cleric: 14 }, desc: '召喚體力強大的岩石巨像替你擋住敵人（30 分鐘）' },
  summon_fire:  { name: '召喚火焰元素', circle: 5, mp: 40, target: 'self', icon: 'sfire', summon: 'fireelem', learn: { mage: 18, cleric: 18 }, desc: '召喚會發射火球的火焰元素（30 分鐘）' },
};
const INV_MAX = 80;   // 背包格數
const MAX_PETS = 3;   // 同時出戰的寵物上限
const MAX_SUMMONS = 3, MAX_CHARMS = 3, COMPANION_TIME = 1800;
// 召喚獸（強度隨施法者等級與魔攻成長）
const SUMMONS = {
  spiritwolf: { name: '狼靈', sprite: 'spiritwolf', hp: [40, 8, 5], dmg: [3, 7, 0.5, 1, 1], ac: [2, 0.5], mr: 20, speed: 3.8, atkSpd: 0.9, range: 1.3 },
  stonegolem: { name: '岩石巨像', sprite: 'sgolem', hp: [140, 16, 8], dmg: [4, 9, 0.35, 0.7, 0.6], ac: [8, 0.6], mr: 30, speed: 2.5, atkSpd: 1.6, range: 1.6 },
  fireelem:   { name: '火焰元素', sprite: 'fireelem', hp: [60, 9, 5], dmg: [6, 12, 0.5, 1, 1.5], ac: [3, 0.4], mr: 40, speed: 3.0, atkSpd: 1.3, range: 5.5, proj: 'fire', magic: true },
};
// 寵物（原創）
const PETS = {
  graywolf:  { name: '灰狼', sprite: 'pwolf', color: '#8a8a90', hp: 40, hpLv: 9, dmg: [2, 6], dmgLv: 0.8, ac: 2, speed: 3.7, atkSpd: 1.0, range: 1.25, price: 0, desc: '用馴獸肉乾在野外馴服野狼取得。忠誠又敏捷' },
  snowfox:   { name: '雪狐', sprite: 'fox', hp: 32, hpLv: 7, dmg: [3, 7], dmgLv: 1.0, ac: 1, speed: 4.2, atkSpd: 0.8, range: 1.2, price: 2500, desc: '速度很快的小狐狸，攻擊頻繁' },
  spikeboar: { name: '刺甲豬', sprite: 'boar', hp: 55, hpLv: 11, dmg: [3, 8], dmgLv: 0.9, ac: 5, speed: 3.2, atkSpd: 1.2, range: 1.3, price: 3500, desc: '背上長滿尖刺，皮糙肉厚' },
  nightowl:  { name: '夜梟', sprite: 'owl', hp: 28, hpLv: 6, dmg: [2, 6], dmgLv: 0.9, ac: 1, speed: 3.8, atkSpd: 1.3, range: 5, proj: 'feather', price: 4500, desc: '從空中投出鋒利的羽毛，能遠程攻擊' },
  warbear:   { name: '戰熊', sprite: 'bear', hp: 70, hpLv: 14, dmg: [3, 8], dmgLv: 0.8, ac: 4, speed: 3.0, atkSpd: 1.4, range: 1.4, price: 6000, desc: '穿著皮甲的大熊，體力最高的寵物' },
};
const PET_MODES = { assist: '攻擊我的目標', free: '自由攻擊', stay: '待命', follow: '跟隨' };
// 魔法書道具
for (const id in SPELLS) {
  const s = SPELLS[id];
  ITEMS['book_' + id] = { name: '魔法書（' + s.name + '）', type: 'book', spell: id, icon: 'book', w: 5, price: [0, 100, 600, 2500, 9000, 25000][s.circle], desc: '使用後學會「' + s.name + '」' };
}

// ---------- 怪物 ----------
// faction 皆為 monster；undead 受驅散亡靈與聖器加成
const MONSTERS = {
  wolf:     { name: '野狼', lvl: 2, hp: 18, dmg: [1, 4], ac: 1, mr: 0, exp: 9, speed: 3.4, atkSpd: 1.1, range: 1.2, aggro: false, sprite: 'wolf', color: '#7d7b78', gold: [2, 8], loot: [['wolf_fang', 0.45], ['red_potion', 0.08]] },
  goblin:   { name: '哥布林', lvl: 4, hp: 34, dmg: [2, 6], ac: 2, mr: 0, exp: 16, speed: 2.6, atkSpd: 1.2, range: 1.25, aggro: true, aggroR: 4.5, sprite: 'goblin', gold: [5, 14], loot: [['goblin_ear', 0.45], ['red_potion', 0.12], ['dagger', 0.03], ['return_scroll', 0.05], ['leather_cap', 0.03]] },
  goblin_archer: { name: '哥布林弓手', lvl: 5, hp: 28, dmg: [2, 6], ac: 1, mr: 0, exp: 19, speed: 2.6, atkSpd: 1.5, range: 5, proj: 'arrow', aggro: true, aggroR: 6, sprite: 'goblin', bow: true, gold: [6, 16], loot: [['goblin_ear', 0.4], ['arrow', 0.3, 30], ['leather_boots', 0.03]] },
  spider:   { name: '巨型蜘蛛', lvl: 7, hp: 50, dmg: [3, 8], ac: 3, mr: 5, exp: 28, speed: 3.0, atkSpd: 1.1, range: 1.3, aggro: true, aggroR: 4.5, sprite: 'spider', color: '#3a3030', gold: [7, 18], loot: [['spider_silk', 0.5], ['red_potion', 0.12], ['leather_gloves', 0.04]] },
  treant:   { name: '樹精', lvl: 9, hp: 95, dmg: [4, 11], ac: 6, mr: 10, exp: 44, speed: 1.6, atkSpd: 1.7, range: 1.5, aggro: true, aggroR: 3.5, sprite: 'treant', gold: [10, 28], loot: [['bark', 0.55], ['orange_potion', 0.08], ['ea_scroll', 0.02], ['oak_staff', 0.04], ['book_icebolt', 0.01]] },
  werewolf: { name: '狼人', lvl: 12, hp: 125, dmg: [5, 13], ac: 5, mr: 5, exp: 70, speed: 3.2, atkSpd: 1.0, range: 1.3, aggro: true, aggroR: 5.5, sprite: 'werewolf', color: '#5a4a3a', gold: [15, 36], loot: [['wolf_pelt', 0.5], ['orange_potion', 0.1], ['ew_scroll', 0.03], ['studded', 0.03], ['ring_dex', 0.004]] },
  skeleton: { name: '骷髏', lvl: 7, hp: 55, dmg: [3, 9], ac: 4, mr: 0, exp: 30, speed: 2.4, atkSpd: 1.3, range: 1.3, aggro: true, aggroR: 5, undead: true, sprite: 'skeleton', gold: [8, 22], loot: [['bone_shard', 0.5], ['red_potion', 0.12], ['iron_sword', 0.02], ['ew_scroll', 0.02], ['iron_helm', 0.015]] },
  skeleton_archer: { name: '骷髏弓手', lvl: 10, hp: 60, dmg: [4, 10], ac: 3, mr: 0, exp: 42, speed: 2.4, atkSpd: 1.6, range: 6, proj: 'arrow', aggro: true, aggroR: 7, undead: true, sprite: 'skeleton', bow: true, gold: [10, 26], loot: [['bone_shard', 0.5], ['silver_arrow', 0.2, 20], ['hunting_bow', 0.03], ['composite_bow', 0.004]] },
  ghoul:    { name: '食屍鬼', lvl: 11, hp: 110, dmg: [5, 13], ac: 5, mr: 5, exp: 62, speed: 2.8, atkSpd: 1.1, range: 1.3, aggro: true, aggroR: 5.5, undead: true, sprite: 'ghoul', gold: [14, 34], loot: [['ghoul_claw', 0.5], ['orange_potion', 0.1], ['ew_scroll', 0.03], ['chainmail', 0.012]] },
  ghost:    { name: '怨靈', lvl: 13, hp: 90, dmg: [5, 12], ac: 8, mr: 30, exp: 78, speed: 2.6, atkSpd: 1.6, range: 5, proj: 'dark', magic: true, aggro: true, aggroR: 6, undead: true, sprite: 'ghost', gold: [16, 40], loot: [['ectoplasm', 0.5], ['blue_potion', 0.15], ['book_heal2', 0.015], ['wizard_hat', 0.02]] },
  lizardman:{ name: '蜥蜴人', lvl: 13, hp: 140, dmg: [6, 15], ac: 7, mr: 5, exp: 85, speed: 2.7, atkSpd: 1.2, range: 1.6, aggro: true, aggroR: 5.5, sprite: 'lizard', gold: [18, 45], loot: [['lizard_skin', 0.5], ['orange_potion', 0.12], ['ew_scroll', 0.035], ['ea_scroll', 0.03], ['spear', 0.02], ['composite_bow', 0.006]] },
  golem:    { name: '岩石巨像', lvl: 16, hp: 260, dmg: [9, 20], ac: 12, mr: 15, exp: 140, speed: 1.5, atkSpd: 1.8, range: 1.6, aggro: true, aggroR: 4, sprite: 'golem', gold: [25, 60], loot: [['golem_core', 0.5], ['clear_potion', 0.06], ['ea_scroll', 0.05], ['tower_shield', 0.02], ['iron_gauntlet', 0.03], ['amulet_earth', 0.01]] },
  scorpion: { name: '沙漠巨蠍', lvl: 14, hp: 150, dmg: [6, 16], ac: 8, mr: 5, exp: 95, speed: 2.8, atkSpd: 1.2, range: 1.4, aggro: true, aggroR: 5, sprite: 'scorpion', color: '#b08040', gold: [20, 48], loot: [['scorpion_tail', 0.5], ['orange_potion', 0.12], ['ew_scroll', 0.035], ['iron_boots', 0.02], ['ring_fire', 0.01]] },
  mummy:    { name: '木乃伊', lvl: 17, hp: 220, dmg: [8, 18], ac: 8, mr: 20, exp: 150, speed: 2.0, atkSpd: 1.4, range: 1.3, aggro: true, aggroR: 5, undead: true, sprite: 'mummy', gold: [26, 64], loot: [['mummy_cloth', 0.5], ['clear_potion', 0.06], ['ea_scroll', 0.04], ['book_lightning', 0.01], ['amulet_guard', 0.008]] },
  sandworm: { name: '沙蟲', lvl: 19, hp: 320, dmg: [10, 22], ac: 9, mr: 10, exp: 210, speed: 2.2, atkSpd: 1.5, range: 1.8, aggro: true, aggroR: 5, sprite: 'worm', color: '#b8905a', gold: [30, 80], loot: [['worm_tooth', 0.5], ['clear_potion', 0.08], ['ew_scroll', 0.05], ['bew_scroll', 0.005], ['giant_belt', 0.004]] },
  wyvern:   { name: '赤鱗飛龍', lvl: 22, hp: 1500, dmg: [12, 26], ac: 12, mr: 30, exp: 1800, speed: 3.0, atkSpd: 1.6, range: 2.2, aggro: true, aggroR: 7, boss: true, breath: true, sprite: 'wyvern', color: '#9a4d26', gold: [500, 1000], respawn: 300,
    loot: [['wyvern_scale', 1], ['wyvern_scale', 0.5], ['ew_scroll', 0.6], ['bew_scroll', 0.2], ['dragonfang', 0.12], ['gale_bow', 0.12], ['plate', 0.15], ['book_fireball', 0.3], ['book_summon_fire', 0.2], ['ring_str', 0.1]] },
  lich:     { name: '墓穴領主', lvl: 24, hp: 1800, dmg: [10, 22], ac: 10, mr: 50, exp: 2200, speed: 2.2, atkSpd: 1.8, range: 6, proj: 'dark', magic: true, aggro: true, aggroR: 8, boss: true, undead: true, summon: 'skeleton', sprite: 'lich', gold: [600, 1200], respawn: 300,
    loot: [['lich_gem', 1], ['bew_scroll', 0.3], ['bea_scroll', 0.3], ['star_staff', 0.12], ['holy_mace', 0.15], ['archmage_robe', 0.15], ['shadow_cloak', 0.12], ['book_meteor', 0.25], ['book_heal3', 0.25], ['book_sanctuary', 0.2], ['book_summon_fire', 0.25], ['ring_int', 0.1], ['amulet_wis', 0.1]] },
  // 城堡守軍（攻城戰期間為敵對）
  guard:    { name: '城堡守衛', lvl: 18, hp: 380, dmg: [9, 18], ac: 12, mr: 20, exp: 180, speed: 2.6, atkSpd: 1.3, range: 1.4, aggro: true, aggroR: 6, sprite: 'guard', gold: [30, 60], loot: [['clear_potion', 0.1], ['ea_scroll', 0.05]], siege: true },
  guard_captain: { name: '守城隊長', lvl: 22, hp: 1100, dmg: [12, 24], ac: 14, mr: 30, exp: 900, speed: 2.6, atkSpd: 1.2, range: 1.5, aggro: true, aggroR: 7, sprite: 'guard', captain: true, boss: true, gold: [300, 600], loot: [['bew_scroll', 0.3], ['knight_sword', 0.3], ['iron_helm', 0.3]], siege: true },
};

// 野外冒險者／邪惡冒險者 的職業外觀
const FIGHTER_LOOKS = {
  knight: [{ body: '#7a7f88', sleeve: '#6a7480', legs: '#4a4e58', helm: '#8a8f99', cape: '#3a4a7a', plate: true, weapon: 'sword', shield: true, skin: '#e0b890' },
           { body: '#8a929c', sleeve: '#6a7480', legs: '#3a3e4a', hair: '#3a2010', cape: '#6a1a1a', weapon: 'claymore', skin: '#d8a880' }],
  mage:   [{ body: '#4a2a5a', robe: true, hood: '#3a1a4a', weapon: 'staff', skin: '#e8c8a8' }, { body: '#2a3a6a', robe: true, hair: '#c8c8d8', longHair: true, weapon: 'staff', skin: '#f0d0b0' }],
  ranger: [{ body: '#2a3a24', legs: '#2a3a24', hair: '#e8d070', longHair: true, cape: '#1a3a2a', trim: '#e8e8f0', weapon: 'bow', skin: '#f0d0b0' },
           { body: '#6a4a2e', legs: '#4a3a2a', hair: '#a02a1a', weapon: 'bow', skin: '#f0c8a0', cape: '#4a5a2a' }],
  cleric: [{ body: '#e8e0c8', robe: true, hair: '#d8d0c0', trim: '#d0a040', weapon: 'mace', shield: true, skin: '#f0cfa8' }],
};
const FIGHTER_NAMES = ['風之翼', '小白兔', '雷霆戰神', '月影', '阿爾法', '火焰鳥', '冷月無聲', '大胖', '星辰', '夜行者', '鐵拳', '青楓', '浪人', '琥珀', '銀狐', '霜語', '赤焰', '墨竹', '流雲', '狂獅', '小黑', '白夜', '晴空', '孤鷹'];
const PKER_NAMES = ['血手', '暗刃', '屠夫', '毒蛇', '惡狼', '黑寡婦', '斷魂'];
const NPC_CLANS = ['銀翼騎士團', '星光', '蒼狼', '月之守望'];
const ENEMY_CLAN = '黑鴉血盟';
const CHAT_LINES = [
  '收購骨頭碎片，價格好談', '有人要組隊打飛龍嗎？', '賣武器強化卷軸，私訊', '峽谷的蜥蜴人好痛…',
  '今天手氣不錯', '剛剛衝 +7 失敗了 QQ', '誰有多的紅水？', '晚上的荒原好可怕', '哈囉大家好', '求帶練功',
  '橙水比較划算喔', '草原新手區很適合練等', '墓穴領主掉了星辰法杖！', '血盟招人，歡迎加入', '小心荒原的紅名',
  '灰岩城這週要攻城嗎？', '負重太高跑不動了…', '有人收沙蟲利齒嗎', '銀風港的船好漂亮',
];

// 委託
const QUESTS = [
  { target: 'wolf', count: 8, gold: 150, exp: 80, item: ['red_potion', 10], text: '草原上的野狼常常襲擊旅人，去碧波草原消滅 8 隻野狼吧。' },
  { target: 'goblin', count: 10, gold: 300, exp: 220, item: ['haste_potion', 2], text: '哥布林在草原與森林交界出沒，替我們消滅 10 隻。' },
  { target: 'skeleton', count: 12, gold: 600, exp: 600, item: ['ew_scroll', 1], text: '骸骨荒原的骷髏又復活了，消滅 12 隻骷髏。' },
  { target: 'werewolf', count: 10, gold: 1200, exp: 1600, item: ['ea_scroll', 2], text: '幽影森林深處傳出狼嚎，消滅 10 隻狼人。' },
  { target: 'lizardman', count: 15, gold: 1500, exp: 2600, item: ['clear_potion', 10], text: '赤岩峽谷的蜥蜴人部族蠢蠢欲動，討伐 15 隻蜥蜴人。' },
  { target: 'mummy', count: 12, gold: 2400, exp: 4200, item: ['bew_scroll', 1], text: '灰燼沙漠的古墓被打開了，消滅 12 隻木乃伊。' },
  { target: 'lich', count: 1, gold: 6000, exp: 8000, item: ['bea_scroll', 2], text: '地下墓穴深處的墓穴領主正在召喚亡靈大軍，進入墓穴討伐牠！' },
  { target: 'wyvern', count: 1, gold: 6000, exp: 8000, item: ['bew_scroll', 2], text: '峽谷最深處的赤鱗飛龍威脅著整片大陸，勇者啊，去討伐牠吧！' },
];

// 商店
const SHOPS = {
  general: ['red_potion', 'orange_potion', 'clear_potion', 'blue_potion', 'haste_potion', 'return_scroll', 'teleport_scroll', 'arrow', 'silver_arrow', 'ew_scroll', 'ea_scroll', 'leather_belt'],
  smith: ['dagger', 'iron_sword', 'knight_sword', 'war_axe', 'spear', 'claymore', 'mace', 'hunting_bow', 'composite_bow', 'leather_cap', 'iron_helm', 'leather', 'studded', 'chainmail', 'plate', 'travel_cloak', 'wood_shield', 'tower_shield', 'leather_gloves', 'iron_gauntlet', 'leather_boots', 'iron_boots'],
  magic: ['oak_staff', 'crystal_staff', 'robe', 'wizard_hat', 'blue_potion', 'book_heal1', 'book_lightbolt', 'book_shield', 'book_powerstrike', 'book_glow', 'book_icebolt', 'book_holy', 'book_windshot', 'book_heal2', 'book_lightning', 'book_haste', 'book_earthskin', 'book_blessarmor', 'book_turnundead', 'book_charm', 'book_summon_wolf', 'book_summon_golem'],
  jewel: ['ring_fire', 'ring_guard', 'amulet_earth', 'amulet_guard', 'leather_belt', 'travel_cloak'],
  pet: ['tame_jerky', 'red_potion', 'orange_potion'],
};

// 魔法商人販賣 1～4 階魔法書（5 階只能從頭目取得）
SHOPS.magic = ['oak_staff', 'crystal_staff', 'robe', 'wizard_hat', 'blue_potion'].concat(
  Object.keys(SPELLS).filter((s) => SPELLS[s].circle <= 4).sort((a, b) => SPELLS[a].circle - SPELLS[b].circle).map((s) => 'book_' + s));
// 5 階新魔法書加入頭目掉落
MONSTERS.lich.loot.push(['book_blizzard', 0.2]);
MONSTERS.wyvern.loot.push(['book_blizzard', 0.15]);

function expForLevel(l) { return Math.floor(24 * Math.pow(l, 2.15)); }
function alignName(v) { return v >= 500 ? '正義' : v < 0 ? '邪惡' : '中立'; }
function alignColor(v) { return v >= 500 ? '#7ab8ff' : v < 0 ? '#ff5a4a' : '#e8e8e8'; }

// ===== 追加裝備（v2.4）=====
Object.assign(ITEMS, {
  // 武器
  twin_daggers: { name: '雙刃', type: 'weapon', wclass: 'dagger', dmg: [3, 8], spd: 0.55, range: 1.3, w: 40, price: 1600, safe: 6, lvl: 8, cls: ['knight', 'ranger'], desc: '左右手各一把，攻擊速度極快' },
  bone_sword:   { name: '骨刃', type: 'weapon', wclass: 'sword', dmg: [3, 10], undeadB: 3, spd: 0.85, range: 1.4, w: 55, price: 900, safe: 6, lvl: 6, cls: ['knight', 'ranger', 'cleric'], desc: '以亡者之骨打磨的劍，對亡靈有效' },
  halberd:      { name: '斧槍', type: 'weapon', wclass: 'spear', dmg: [6, 16], spd: 1.1, range: 2.0, w: 160, price: 3400, safe: 6, lvl: 12, twoHand: true, cls: ['knight'] },
  great_hammer: { name: '巨錘', type: 'weapon', wclass: 'mace', dmg: [8, 20], spd: 1.3, range: 1.45, w: 230, price: 4200, safe: 6, lvl: 14, twoHand: true, cls: ['knight', 'cleric'] },
  moon_mace:    { name: '月光錘', type: 'weapon', wclass: 'mace', dmg: [5, 12], sp: 2, mp: 15, spd: 0.95, range: 1.35, w: 95, price: 3600, safe: 6, lvl: 12, cls: ['cleric'] },
  flame_sword:  { name: '炎之劍', type: 'weapon', wclass: 'sword', dmg: [6, 15], dmgB: 1, spd: 0.85, range: 1.4, w: 85, price: 12000, safe: 6, lvl: 12, cls: ['knight', 'ranger'], res: { fire: 10 }, rare: true },
  frost_blade:  { name: '寒霜之刃', type: 'weapon', wclass: 'sword', dmg: [5, 13], hit: 2, slow: 0.25, spd: 0.8, range: 1.4, w: 70, price: 14000, safe: 6, lvl: 14, cls: ['knight', 'ranger'], res: { water: 10 }, rare: true, desc: '攻擊有 25% 機率使敵人減速' },
  yew_bow:      { name: '紫杉長弓', type: 'weapon', wclass: 'bow', dmg: [5, 12], spd: 1.0, range: 7, ranged: true, w: 60, price: 4000, safe: 6, lvl: 13, twoHand: true, cls: ['ranger'] },
  storm_bow:    { name: '雷鳴弓', type: 'weapon', wclass: 'bow', dmg: [6, 15], hit: 2, spd: 0.9, range: 7.5, ranged: true, w: 65, price: 15000, safe: 6, lvl: 16, twoHand: true, cls: ['ranger'], res: { wind: 10 }, rare: true },
  bone_staff:   { name: '骨杖', type: 'weapon', wclass: 'staff', dmg: [2, 6], sp: 2, mp: 10, spd: 1.0, range: 1.4, w: 45, price: 1800, safe: 6, lvl: 7, twoHand: true, cls: ['mage', 'cleric'] },
  sun_staff:    { name: '烈陽法杖', type: 'weapon', wclass: 'staff', dmg: [3, 9], sp: 4, mp: 30, spd: 1.0, range: 1.4, w: 55, price: 16000, safe: 6, lvl: 16, twoHand: true, cls: ['mage', 'cleric'], res: { fire: 10 }, rare: true },
  // 頭盔
  ranger_hood:  { name: '遊俠兜帽', type: 'armor', slot: 'helm', ac: 2, er: 2, w: 12, price: 900, safe: 4, lvl: 6, cls: ['ranger'] },
  sage_hood:    { name: '賢者兜帽', type: 'armor', slot: 'helm', ac: 1, mr: 8, sp: 1, w: 10, price: 1500, safe: 4, lvl: 8, cls: ['mage', 'cleric'] },
  horned_helm:  { name: '角盔', type: 'armor', slot: 'helm', ac: 3, w: 60, price: 2200, safe: 4, lvl: 10, cls: ['knight'] },
  // 盔甲
  ranger_leather: { name: '遊俠皮甲', type: 'armor', slot: 'armor', ac: 4, er: 3, w: 120, price: 1800, safe: 4, lvl: 8, cls: ['ranger'] },
  scale_mail:   { name: '鱗甲', type: 'armor', slot: 'armor', ac: 5, w: 320, price: 2600, safe: 4, lvl: 9, cls: ['knight', 'cleric'] },
  battle_robe:  { name: '戰鬥法袍', type: 'armor', slot: 'armor', ac: 2, mr: 15, sp: 1, w: 50, price: 2400, safe: 4, lvl: 10, cls: ['mage', 'cleric'] },
  holy_robe:    { name: '聖袍', type: 'armor', slot: 'armor', ac: 3, mr: 20, hp: 30, sp: 1, w: 60, price: 14000, safe: 4, lvl: 14, cls: ['cleric'], rare: true },
  dragon_plate: { name: '龍鱗鎧甲', type: 'armor', slot: 'armor', ac: 9, w: 480, price: 40000, safe: 4, lvl: 20, cls: ['knight'], res: { fire: 20 }, rare: true },
  // 斗篷
  magic_cloak:  { name: '法師斗篷', type: 'armor', slot: 'cloak', ac: 1, mr: 10, w: 15, price: 1600, safe: 4 },
  guard_cloak:  { name: '守護披風', type: 'armor', slot: 'cloak', ac: 3, w: 35, price: 3000, safe: 4, lvl: 12 },
  // 盾牌
  kite_shield:  { name: '鳶盾', type: 'armor', slot: 'shield', ac: 2, w: 110, price: 700, safe: 4, lvl: 5, cls: ['knight', 'cleric', 'ranger'] },
  dragon_shield:{ name: '龍紋盾', type: 'armor', slot: 'shield', ac: 4, mr: 10, w: 220, price: 18000, safe: 4, lvl: 16, cls: ['knight', 'cleric'], res: { fire: 10 }, rare: true },
  // 手套
  archer_gloves:{ name: '射手手套', type: 'armor', slot: 'gloves', ac: 1, stat: { dex: 1 }, w: 10, price: 6000, safe: 4, lvl: 12, rare: true },
  power_gauntlet:{ name: '力量護手', type: 'armor', slot: 'gloves', ac: 2, stat: { str: 1 }, w: 45, price: 7000, safe: 4, lvl: 12, cls: ['knight', 'cleric'], rare: true },
  // 長靴
  swift_boots:  { name: '疾風靴', type: 'armor', slot: 'boots', ac: 1, move: 0.1, w: 15, price: 8000, safe: 4, lvl: 10, rare: true, desc: '移動速度 +10%' },
  // 腰帶
  warrior_belt: { name: '戰士腰帶', type: 'acc', slot: 'belt', hp: 30, weight: 400, w: 15, price: 3000 },
  mana_belt:    { name: '魔力腰帶', type: 'acc', slot: 'belt', mp: 30, weight: 200, w: 10, price: 3000 },
  // 戒指與項鍊
  ring_con:     { name: '堅韌戒指', type: 'acc', slot: 'ring', stat: { con: 1 }, w: 2, price: 3000, rare: true },
  ring_wis:     { name: '冥想戒指', type: 'acc', slot: 'ring', stat: { wis: 1 }, w: 2, price: 3000, rare: true },
  ring_mana:    { name: '魔力戒指', type: 'acc', slot: 'ring', mp: 20, w: 2, price: 2000 },
  ring_ice:     { name: '冰紋戒指', type: 'acc', slot: 'ring', res: { water: 20 }, w: 2, price: 1500 },
  amulet_power: { name: '力量項鍊', type: 'acc', slot: 'amulet', stat: { str: 1 }, hp: 10, w: 5, price: 5000, rare: true },
  amulet_light: { name: '光明項鍊', type: 'acc', slot: 'amulet', sp: 2, w: 5, price: 6000, rare: true },
  // 寵物用品
  pet_haste:    { name: '寵物活力藥劑', type: 'consume', icon: 'potion', w: 2, price: 200, stack: true, desc: '讓附近的夥伴（寵物、召喚獸、迷魅怪物）5 分鐘內移動與攻擊加速' },
});
POTION_COLORS.pet_haste = '#c8f040';
for (const id in ITEMS) {
  const it = ITEMS[id];
  if (it.icon) continue;
  if (it.type === 'weapon') it.icon = it.wclass;
  else if (it.type === 'armor' || it.type === 'acc') it.icon = it.slot;
}
SHOPS.smith.push('twin_daggers', 'bone_sword', 'halberd', 'great_hammer', 'yew_bow', 'horned_helm', 'ranger_hood', 'ranger_leather', 'scale_mail', 'kite_shield', 'guard_cloak');
SHOPS.magic.splice(4, 0, 'bone_staff', 'moon_mace', 'sage_hood', 'battle_robe', 'magic_cloak');
SHOPS.jewel.push('warrior_belt', 'mana_belt', 'ring_mana', 'ring_ice');
SHOPS.pet.splice(1, 0, 'pet_haste');
const EXTRA_LOOT = {
  skeleton: [['bone_sword', 0.02]], skeleton_archer: [['bone_staff', 0.02]], ghost: [['bone_staff', 0.03], ['magic_cloak', 0.02]],
  werewolf: [['ranger_hood', 0.03], ['archer_gloves', 0.004]], lizardman: [['flame_sword', 0.006], ['scale_mail', 0.015]],
  golem: [['power_gauntlet', 0.006], ['ring_con', 0.004], ['frost_blade', 0.004]], scorpion: [['swift_boots', 0.004], ['ring_ice', 0.01]],
  mummy: [['sun_staff', 0.005], ['ring_wis', 0.004], ['battle_robe', 0.015]], sandworm: [['storm_bow', 0.006], ['amulet_power', 0.004]],
  wyvern: [['dragon_plate', 0.1], ['dragon_shield', 0.12], ['flame_sword', 0.2]], lich: [['holy_robe', 0.12], ['amulet_light', 0.15], ['frost_blade', 0.12], ['sun_staff', 0.12]],
};
for (const k in EXTRA_LOOT) MONSTERS[k].loot.push(...EXTRA_LOOT[k]);

// ===== 回魔裝備（v2.5）：mpr＝每 3 秒額外恢復的魔力 =====
Object.assign(ITEMS, {
  meditation_circlet: { name: '冥想頭環', type: 'armor', slot: 'helm', ac: 1, mpr: 2, mr: 5, w: 8, price: 2400, safe: 4, lvl: 8, cls: ['mage', 'cleric', 'ranger'] },
  starweave_robe:     { name: '星紋長袍', type: 'armor', slot: 'armor', ac: 2, mr: 12, mpr: 3, mp: 20, w: 45, price: 6800, safe: 4, lvl: 12, cls: ['mage', 'cleric'] },
  tidal_robe:         { name: '潮汐法衣', type: 'armor', slot: 'armor', ac: 3, mr: 18, mpr: 5, mp: 40, sp: 1, w: 50, price: 22000, safe: 4, lvl: 18, cls: ['mage', 'cleric'], res: { water: 15 }, rare: true },
  serene_cloak:       { name: '靜謐斗篷', type: 'armor', slot: 'cloak', ac: 1, mpr: 1, mr: 5, w: 15, price: 2200, safe: 4 },
  spring_ring:        { name: '泉水戒指', type: 'acc', slot: 'ring', mpr: 1, mp: 10, w: 2, price: 2600 },
  tide_ring:          { name: '潮汐戒指', type: 'acc', slot: 'ring', mpr: 2, res: { water: 10 }, w: 2, price: 9000, rare: true },
  moon_pendant:       { name: '月光項鍊', type: 'acc', slot: 'amulet', mpr: 2, mp: 20, w: 5, price: 7000, rare: true },
  sage_gloves:        { name: '賢者手套', type: 'armor', slot: 'gloves', ac: 1, mpr: 1, sp: 1, w: 8, price: 3200, safe: 4, lvl: 10, cls: ['mage', 'cleric'] },
  coral_staff:        { name: '珊瑚法杖', type: 'weapon', wclass: 'staff', dmg: [3, 8], sp: 3, mpr: 2, mp: 20, spd: 1.0, range: 1.4, w: 50, price: 9500, safe: 6, lvl: 15, twoHand: true, cls: ['mage', 'cleric'], res: { water: 10 } },
  pearl:              { name: '珍珠', type: 'junk', w: 1, price: 220, stack: true },
  pirate_coin:        { name: '海盜金幣', type: 'junk', w: 1, price: 120, stack: true },
  croc_hide:          { name: '鱷魚皮', type: 'junk', w: 6, price: 140, stack: true },
  serpent_scale:      { name: '海蛇鱗片', type: 'junk', w: 8, price: 2200, stack: true, rare: true },
  pirate_sabre:       { name: '海盜彎刀', type: 'weapon', wclass: 'sword', dmg: [6, 14], hit: 1, spd: 0.8, range: 1.4, w: 70, price: 7000, safe: 6, lvl: 14, cls: ['knight', 'ranger'] },
});
for (const id in ITEMS) { const it = ITEMS[id]; if (it.icon) continue; if (it.type === 'weapon') it.icon = it.wclass; else if (it.type === 'armor' || it.type === 'acc') it.icon = it.slot; else it.icon = 'junk'; }
// 既有法系裝備加上回魔
Object.assign(ITEMS.robe, { mpr: 1 }); Object.assign(ITEMS.archmage_robe, { mpr: 2 }); Object.assign(ITEMS.crystal_staff, { mpr: 1 });
Object.assign(ITEMS.star_staff, { mpr: 2 }); Object.assign(ITEMS.amulet_wis, { mpr: 1 }); Object.assign(ITEMS.wizard_hat, { mpr: 1 });
SHOPS.magic.splice(4, 0, 'meditation_circlet', 'starweave_robe', 'sage_gloves', 'serene_cloak');
SHOPS.jewel.push('spring_ring');
SHOPS.coral = ['red_potion', 'orange_potion', 'clear_potion', 'blue_potion', 'return_scroll', 'arrow', 'silver_arrow', 'coral_staff', 'spring_ring', 'serene_cloak', 'pirate_sabre'];
MONSTERS.ghost.loot.push(['spring_ring', 0.01], ['meditation_circlet', 0.015]);
MONSTERS.mummy.loot.push(['moon_pendant', 0.006], ['starweave_robe', 0.01]);
MONSTERS.lich.loot.push(['tidal_robe', 0.12], ['moon_pendant', 0.15]);

// ===== 翡翠群島的怪物 =====
Object.assign(MONSTERS, {
  crab:        { name: '巨鉗蟹', lvl: 15, hp: 170, dmg: [7, 16], ac: 10, mr: 10, exp: 110, speed: 2.4, atkSpd: 1.3, range: 1.4, aggro: true, aggroR: 4, sprite: 'scorpion', color: '#c8502a', gold: [20, 50], loot: [['pearl', 0.35], ['orange_potion', 0.12], ['ea_scroll', 0.04], ['ring_ice', 0.01]] },
  jungle_spider:{ name: '叢林毒蛛', lvl: 17, hp: 180, dmg: [8, 17], ac: 7, mr: 10, exp: 135, speed: 3.2, atkSpd: 1.0, range: 1.3, aggro: true, aggroR: 5.5, sprite: 'spider', color: '#2a5a2a', gold: [22, 54], loot: [['spider_silk', 0.5], ['clear_potion', 0.06], ['ew_scroll', 0.04], ['sage_gloves', 0.012]] },
  croc:        { name: '鱷魚人', lvl: 19, hp: 260, dmg: [10, 21], ac: 11, mr: 10, exp: 190, speed: 2.7, atkSpd: 1.25, range: 1.6, aggro: true, aggroR: 5.5, sprite: 'lizard', color: '#3a5a3a', gold: [28, 70], loot: [['croc_hide', 0.5], ['clear_potion', 0.08], ['ew_scroll', 0.05], ['bea_scroll', 0.005], ['tide_ring', 0.006]] },
  pirate:      { name: '海盜', lvl: 21, hp: 300, dmg: [11, 23], ac: 12, mr: 15, exp: 230, speed: 3.0, atkSpd: 1.0, range: 1.4, aggro: true, aggroR: 6, sprite: 'pirate', gold: [40, 100], loot: [['pirate_coin', 0.6], ['clear_potion', 0.1], ['ew_scroll', 0.05], ['pirate_sabre', 0.02], ['bew_scroll', 0.006]] },
  pirate_captain: { name: '海盜船長', lvl: 26, hp: 2200, dmg: [16, 32], ac: 15, mr: 40, exp: 2800, speed: 3.0, atkSpd: 1.1, range: 1.5, aggro: true, aggroR: 8, boss: true, sprite: 'pirate', captainLook: true, gold: [800, 1500], respawn: 300,
    loot: [['pirate_coin', 1], ['bew_scroll', 0.35], ['bea_scroll', 0.3], ['pirate_sabre', 0.4], ['storm_bow', 0.12], ['dragon_shield', 0.1], ['tide_ring', 0.2], ['swift_boots', 0.15]] },
  sea_serpent: { name: '深海巨蛇', lvl: 28, hp: 2600, dmg: [15, 30], ac: 14, mr: 50, exp: 3200, speed: 2.4, atkSpd: 1.6, range: 5, proj: 'ice', magic: true, aggro: true, aggroR: 8, boss: true, sprite: 'worm', color: '#2a8a8a', gold: [900, 1600], respawn: 300,
    loot: [['serpent_scale', 1], ['tidal_robe', 0.2], ['coral_staff', 0.3], ['moon_pendant', 0.2], ['bew_scroll', 0.3], ['book_blizzard', 0.2], ['amulet_light', 0.15]] },
});
QUESTS.push(
  { target: 'croc', count: 15, gold: 3000, exp: 6000, item: ['clear_potion', 20], text: '銀風港的船員說翡翠群島的鱷魚人襲擊了漁船，搭船過去消滅 15 隻鱷魚人。' },
  { target: 'pirate_captain', count: 1, gold: 9000, exp: 12000, item: ['bew_scroll', 3], text: '海盜灣的海盜船長掠奪商船已久，去翡翠群島討伐他！' },
);

// ===== 灰岩城地下要塞（城主專屬）=====
Object.assign(ITEMS, {
  royal_sword: { name: '王者之劍', type: 'weapon', wclass: 'sword', dmg: [9, 20], dmgB: 2, hit: 2, spd: 0.85, range: 1.4, w: 90, price: 40000, safe: 6, lvl: 20, cls: ['knight', 'ranger'], rare: true, desc: '灰岩城歷代城主的佩劍' },
  royal_bow:   { name: '王者長弓', type: 'weapon', wclass: 'bow', dmg: [8, 18], hit: 3, spd: 0.9, range: 8, ranged: true, w: 65, price: 40000, safe: 6, lvl: 20, twoHand: true, cls: ['ranger'], rare: true },
  royal_staff: { name: '王者權杖', type: 'weapon', wclass: 'staff', dmg: [4, 11], sp: 6, mp: 40, mpr: 3, spd: 1.0, range: 1.4, w: 55, price: 40000, safe: 6, lvl: 20, twoHand: true, cls: ['mage', 'cleric'], rare: true },
  royal_plate: { name: '王者鎧甲', type: 'armor', slot: 'armor', ac: 9, mr: 15, hp: 40, w: 420, price: 45000, safe: 4, lvl: 20, cls: ['knight'], rare: true },
  royal_robe:  { name: '王者法袍', type: 'armor', slot: 'armor', ac: 4, mr: 25, sp: 3, mpr: 3, mp: 40, w: 50, price: 45000, safe: 4, lvl: 20, cls: ['mage', 'cleric'], rare: true },
  crown_ring:  { name: '王權戒指', type: 'acc', slot: 'ring', stat: { str: 1, dex: 1, int: 1 }, ac: 1, w: 2, price: 30000, rare: true },
  royal_potion:{ name: '王家秘藥', type: 'consume', icon: 'potion', w: 2, price: 600, stack: true, desc: '立即恢復全部體力與魔力（城堡御用商人限定）' },
  iron_core:   { name: '鋼鐵核心', type: 'junk', w: 15, price: 600, stack: true },
});
for (const id of ['royal_sword', 'royal_bow', 'royal_staff', 'royal_plate', 'royal_robe', 'crown_ring', 'iron_core']) { const it = ITEMS[id]; it.icon = it.type === 'weapon' ? it.wclass : it.type === 'junk' ? 'junk' : it.slot; }
POTION_COLORS.royal_potion = '#ffd040';
Object.assign(MONSTERS, {
  dark_knight:  { name: '黑暗騎士', lvl: 22, hp: 340, dmg: [12, 24], ac: 14, mr: 20, exp: 280, speed: 2.8, atkSpd: 1.1, range: 1.5, aggro: true, aggroR: 6, sprite: 'guard', dark: true, gold: [50, 120],
    loot: [['iron_core', 0.3], ['clear_potion', 0.12], ['bew_scroll', 0.02], ['bea_scroll', 0.02], ['royal_sword', 0.006], ['royal_plate', 0.005]] },
  gargoyle:     { name: '石像鬼', lvl: 23, hp: 380, dmg: [11, 22], ac: 16, mr: 25, exp: 300, speed: 2.4, atkSpd: 1.4, range: 1.6, aggro: true, aggroR: 5, sprite: 'golem', color: '#4a4a5a', gold: [50, 120],
    loot: [['iron_core', 0.4], ['ea_scroll', 0.08], ['bea_scroll', 0.02], ['crown_ring', 0.004], ['royal_robe', 0.005]] },
  fire_imp:     { name: '火焰小鬼', lvl: 21, hp: 220, dmg: [10, 20], ac: 9, mr: 30, exp: 240, speed: 3.2, atkSpd: 1.5, range: 5, proj: 'fire', magic: true, aggro: true, aggroR: 7, sprite: 'fireelem', gold: [40, 100],
    loot: [['blue_potion', 0.2], ['ew_scroll', 0.08], ['bew_scroll', 0.02], ['royal_staff', 0.005], ['royal_bow', 0.005]] },
  iron_colossus:{ name: '鋼鐵巨像', lvl: 30, hp: 3600, dmg: [18, 36], ac: 20, mr: 50, exp: 4500, speed: 1.8, atkSpd: 1.7, range: 2.2, aggro: true, aggroR: 8, boss: true, sprite: 'golem', color: '#7a7a8a', big: 1.6, gold: [1500, 2500], respawn: 300,
    loot: [['iron_core', 1], ['bew_scroll', 0.5], ['bea_scroll', 0.5], ['royal_sword', 0.15], ['royal_bow', 0.15], ['royal_staff', 0.15], ['royal_plate', 0.12], ['royal_robe', 0.12], ['crown_ring', 0.15]] },
});
SHOPS.castleshop = ['royal_potion', 'clear_potion', 'haste_potion', 'bew_scroll', 'bea_scroll', 'ew_scroll', 'ea_scroll', 'silver_arrow'];

// ===== 熾焰火山與炎皇火龍（v2.8）=====
Object.assign(ITEMS, {
  // 火龍系列裝備
  flamelord_sword: { name: '炎皇之劍', type: 'weapon', wclass: 'claymore', dmg: [14, 30], dmgB: 3, hit: 2, spd: 1.15, range: 1.5, w: 210, price: 60000, safe: 6, lvl: 25, twoHand: true, cls: ['knight'], res: { fire: 20 }, rare: true, desc: '以炎皇火龍之牙鍛造的巨劍' },
  dragonbreath_bow:{ name: '龍息長弓', type: 'weapon', wclass: 'bow', dmg: [9, 20], hit: 3, spd: 0.85, range: 8, ranged: true, w: 60, price: 60000, safe: 6, lvl: 25, twoHand: true, cls: ['ranger'], res: { fire: 15 }, rare: true },
  magma_staff:     { name: '熔岩法杖', type: 'weapon', wclass: 'staff', dmg: [5, 13], sp: 7, mp: 50, mpr: 3, spd: 1.0, range: 1.4, w: 60, price: 60000, safe: 6, lvl: 25, twoHand: true, cls: ['mage', 'cleric'], res: { fire: 15 }, rare: true },
  ember_mace:      { name: '餘燼聖錘', type: 'weapon', wclass: 'mace', dmg: [9, 19], sp: 3, undeadB: 6, spd: 0.95, range: 1.35, w: 110, price: 45000, safe: 6, lvl: 22, cls: ['cleric', 'knight'], res: { fire: 10 }, rare: true },
  obsidian_blade:  { name: '黑曜石刀', type: 'weapon', wclass: 'sword', dmg: [8, 17], hit: 1, spd: 0.8, range: 1.4, w: 70, price: 9000, safe: 6, lvl: 20, cls: ['knight', 'ranger'] },
  dragonscale_armor:{ name: '火龍鱗甲', type: 'armor', slot: 'armor', ac: 10, mr: 15, hp: 50, w: 400, price: 70000, safe: 4, lvl: 25, cls: ['knight', 'cleric'], res: { fire: 30 }, rare: true },
  flame_robe:      { name: '炎皇法袍', type: 'armor', slot: 'armor', ac: 4, mr: 28, sp: 3, mpr: 4, mp: 50, w: 50, price: 70000, safe: 4, lvl: 25, cls: ['mage', 'cleric'], res: { fire: 25 }, rare: true },
  drake_leather:   { name: '龍皮獵裝', type: 'armor', slot: 'armor', ac: 6, er: 5, w: 130, price: 60000, safe: 4, lvl: 25, cls: ['ranger'], res: { fire: 25 }, rare: true },
  dragon_helm:     { name: '龍角頭盔', type: 'armor', slot: 'helm', ac: 4, mr: 5, w: 70, price: 30000, safe: 4, lvl: 22, cls: ['knight', 'cleric', 'ranger'], res: { fire: 10 }, rare: true },
  dragonwing_cloak:{ name: '龍翼斗篷', type: 'armor', slot: 'cloak', ac: 3, er: 3, move: 0.05, w: 25, price: 35000, safe: 4, lvl: 22, res: { fire: 15 }, rare: true, desc: '移動速度 +5%' },
  dragon_aegis:    { name: '火龍之盾', type: 'armor', slot: 'shield', ac: 5, mr: 15, w: 230, price: 40000, safe: 4, lvl: 22, cls: ['knight', 'cleric'], res: { fire: 20 }, rare: true },
  dragonclaw_gloves:{ name: '龍爪手套', type: 'armor', slot: 'gloves', ac: 2, stat: { str: 1, dex: 1 }, w: 30, price: 30000, safe: 4, lvl: 22, rare: true },
  cinder_boots:    { name: '炎紋長靴', type: 'armor', slot: 'boots', ac: 2, move: 0.12, w: 30, price: 25000, safe: 4, lvl: 20, res: { fire: 10 }, rare: true, desc: '移動速度 +12%' },
  dragonheart:     { name: '火龍之心', type: 'acc', slot: 'amulet', hp: 60, mp: 30, stat: { con: 1 }, w: 5, price: 50000, res: { fire: 25 }, rare: true },
  dragoneye_ring:  { name: '龍眼戒指', type: 'acc', slot: 'ring', stat: { int: 1, wis: 1 }, sp: 1, w: 2, price: 35000, rare: true },
  magma_ring:      { name: '熔岩戒指', type: 'acc', slot: 'ring', res: { fire: 30 }, hp: 20, w: 2, price: 6000 },
  basalt_mail:     { name: '玄武岩鎧', type: 'armor', slot: 'armor', ac: 8, w: 460, price: 15000, safe: 4, lvl: 20, cls: ['knight'], res: { fire: 15 } },
  ash_robe:        { name: '灰燼長袍', type: 'armor', slot: 'armor', ac: 3, mr: 18, sp: 2, mpr: 2, w: 45, price: 15000, safe: 4, lvl: 20, cls: ['mage', 'cleric'], res: { fire: 15 } },
  // 消耗品
  fireres_potion:  { name: '抗火藥水', type: 'consume', icon: 'potion', w: 2, price: 300, stack: true, desc: '5 分鐘內火屬性抗性 +30%，能抵擋岩漿的熱氣' },
  dragonblood:     { name: '龍血藥水', type: 'consume', icon: 'potion', w: 2, price: 800, stack: true, desc: '恢復 300 點體力與 60 點魔力' },
  exp_scroll:      { name: '經驗祝福卷軸', type: 'consume', icon: 'scroll', w: 1, price: 3000, stack: true, rare: true, desc: '10 分鐘內狩獵經驗值 +50%' },
  volcano_scroll:  { name: '火山傳送卷軸', type: 'consume', icon: 'scroll', w: 1, price: 600, stack: true, desc: '傳送到熾焰火山的入口' },
  // 材料
  dragon_scale:    { name: '火龍鱗片', type: 'junk', w: 10, price: 4000, stack: true, rare: true },
  magma_core:      { name: '熔岩核心', type: 'junk', w: 12, price: 380, stack: true },
  obsidian:        { name: '黑曜石', type: 'junk', w: 6, price: 160, stack: true },
  sulfur:          { name: '硫磺結晶', type: 'junk', w: 2, price: 90, stack: true },
});
for (const id in ITEMS) { const it = ITEMS[id]; if (it.icon) continue; if (it.type === 'weapon') it.icon = it.wclass; else if (it.type === 'armor' || it.type === 'acc') it.icon = it.slot; else it.icon = 'junk'; }
Object.assign(POTION_COLORS, { fireres_potion: '#ff6a20', dragonblood: '#8a0a1a' });
Object.assign(SCROLL_COLORS, { exp_scroll: '#a0ffa0', volcano_scroll: '#ff8a40' });
SHOPS.general.push('fireres_potion', 'volcano_scroll');
SHOPS.smith.push('obsidian_blade', 'basalt_mail');
SHOPS.magic.splice(4, 0, 'ash_robe');
SHOPS.jewel.push('magma_ring');
SHOPS.castleshop.push('exp_scroll', 'dragonblood');
Object.assign(MONSTERS, {
  lava_slime:  { name: '熔岩史萊姆', lvl: 23, hp: 300, dmg: [12, 22], ac: 12, mr: 30, exp: 290, speed: 2.0, atkSpd: 1.4, range: 1.3, aggro: true, aggroR: 4.5, sprite: 'slime', element: 'fire', gold: [40, 90],
    loot: [['sulfur', 0.5], ['magma_core', 0.15], ['fireres_potion', 0.1], ['magma_ring', 0.008]] },
  hellhound:   { name: '地獄犬', lvl: 24, hp: 320, dmg: [13, 25], ac: 12, mr: 20, exp: 310, speed: 3.6, atkSpd: 0.9, range: 1.25, aggro: true, aggroR: 7, sprite: 'wolf', color: '#5a1a10', eye: '#ffb030', scaleUp: 1.3, gold: [45, 100],
    loot: [['obsidian', 0.4], ['clear_potion', 0.1], ['ew_scroll', 0.05], ['cinder_boots', 0.004]] },
  salamander:  { name: '火焰蜥蜴人', lvl: 25, hp: 380, dmg: [14, 27], ac: 14, mr: 25, exp: 340, speed: 2.8, atkSpd: 1.15, range: 1.6, aggro: true, aggroR: 6, sprite: 'lizard', color: '#9a2a14', gold: [50, 110],
    loot: [['obsidian', 0.4], ['dragonblood', 0.06], ['ea_scroll', 0.06], ['obsidian_blade', 0.02], ['dragon_helm', 0.004]] },
  magma_golem: { name: '熔岩巨像', lvl: 26, hp: 560, dmg: [16, 30], ac: 18, mr: 30, exp: 420, speed: 1.6, atkSpd: 1.7, range: 1.6, aggro: true, aggroR: 4, sprite: 'golem', color: '#5a2a1a', gold: [60, 130],
    loot: [['magma_core', 0.5], ['bea_scroll', 0.02], ['basalt_mail', 0.02], ['dragon_aegis', 0.004]] },
  fire_spirit: { name: '炎魔', lvl: 25, hp: 300, dmg: [14, 26], ac: 10, mr: 45, exp: 360, speed: 3.0, atkSpd: 1.4, range: 5.5, proj: 'fire', magic: true, element: 'fire', aggro: true, aggroR: 7, sprite: 'fireelem', gold: [50, 110],
    loot: [['sulfur', 0.4], ['blue_potion', 0.2], ['bew_scroll', 0.015], ['ash_robe', 0.02], ['dragoneye_ring', 0.004]] },
  draconian:   { name: '龍人戰士', lvl: 27, hp: 480, dmg: [16, 32], ac: 17, mr: 30, exp: 470, speed: 2.9, atkSpd: 1.1, range: 1.7, aggro: true, aggroR: 6.5, sprite: 'lizard', color: '#4a1a2a', scaleUp: 1.45, gold: [70, 150],
    loot: [['obsidian', 0.4], ['dragonblood', 0.1], ['exp_scroll', 0.01], ['dragonclaw_gloves', 0.004], ['dragonwing_cloak', 0.004]] },
  fire_whelp:  { name: '幼火龍', lvl: 26, hp: 420, dmg: [15, 28], ac: 15, mr: 35, exp: 400, speed: 3.2, atkSpd: 1.3, range: 2.0, aggro: true, aggroR: 7, sprite: 'wyvern', color: '#d8601a', scaleUp: 0.7, gold: [60, 140],
    loot: [['dragon_scale', 0.05], ['magma_core', 0.3], ['dragonblood', 0.1], ['bew_scroll', 0.02]] },
  flame_dragon:{ name: '炎皇火龍', lvl: 35, hp: 7000, dmg: [26, 46], ac: 24, mr: 60, exp: 12000, speed: 2.2, atkSpd: 1.8, range: 3.0, aggro: true, aggroR: 10, boss: true, dragon: true, sprite: 'firedragon', gold: [3000, 6000], respawn: 420,
    loot: [['dragon_scale', 1], ['dragon_scale', 1], ['dragon_scale', 0.5], ['exp_scroll', 0.5], ['bew_scroll', 0.6], ['bea_scroll', 0.6],
      ['flamelord_sword', 0.15], ['dragonbreath_bow', 0.15], ['magma_staff', 0.15], ['ember_mace', 0.15], ['dragonscale_armor', 0.12], ['flame_robe', 0.12], ['drake_leather', 0.12],
      ['dragon_helm', 0.2], ['dragonwing_cloak', 0.2], ['dragon_aegis', 0.15], ['dragonclaw_gloves', 0.15], ['cinder_boots', 0.2], ['dragonheart', 0.12], ['dragoneye_ring', 0.15]] },
});
QUESTS.push({ target: 'flame_dragon', count: 1, gold: 20000, exp: 30000, item: ['exp_scroll', 3], text: '赤岩峽谷深處的火山隘口後，沉睡著炎皇火龍。牠一旦甦醒，整片大陸都將化為焦土。帶上抗火藥水，去討伐牠吧！' });

// ===== 北境歐瑞城、魔法寵物、城內商人（v2.12）=====
Object.assign(ITEMS, {
  // 北境裝備
  frost_blade:    { name: '霜刃', type: 'weapon', wclass: 'sword', dmg: [9, 19], hit: 2, spd: 0.9, range: 1.35, w: 120, price: 32000, safe: 6, lvl: 20, cls: ['knight', 'ranger'], res: { water: 15 }, desc: '刀身永遠結著一層薄霜' },
  glacier_bow:    { name: '冰河長弓', type: 'weapon', wclass: 'bow', dmg: [7, 16], hit: 2, spd: 0.85, range: 7.5, ranged: true, w: 70, price: 30000, safe: 6, lvl: 20, twoHand: true, cls: ['ranger'], res: { water: 10 } },
  frost_staff:    { name: '寒霜法杖', type: 'weapon', wclass: 'staff', dmg: [4, 11], sp: 5, mp: 40, mpr: 2, spd: 1.0, range: 1.4, w: 55, price: 32000, safe: 6, lvl: 20, twoHand: true, cls: ['mage', 'cleric'], res: { water: 15 } },
  frost_mail:     { name: '寒鐵鎧甲', type: 'armor', slot: 'armor', ac: 8, mr: 8, w: 380, price: 30000, safe: 4, lvl: 20, cls: ['knight', 'cleric'], res: { water: 20 } },
  yeti_cloak:     { name: '雪怪毛皮斗篷', type: 'armor', slot: 'cloak', ac: 2, mr: 6, hp: 30, w: 40, price: 9000, safe: 4, lvl: 15, res: { water: 20 } },
  snow_boots:     { name: '雪地長靴', type: 'armor', slot: 'boots', ac: 2, move: 0.06, w: 30, price: 7000, safe: 4, lvl: 15 },
  frost_ring:     { name: '冰晶戒指', type: 'acc', slot: 'ring', mr: 5, mp: 20, res: { water: 25 }, w: 2, price: 8000 },
  frost_crown:    { name: '霜冠', type: 'armor', slot: 'helm', ac: 5, mr: 15, sp: 2, hp: 40, w: 60, price: 80000, safe: 4, lvl: 26, res: { water: 30 }, rare: true, desc: '霜冠巨人王頭上的冰之王冠' },
  // 消耗品
  oren_scroll:    { name: '歐瑞城傳送卷軸', type: 'consume', icon: 'scroll', w: 1, price: 800, stack: true, desc: '傳送到北境的歐瑞城' },
  hot_cocoa:      { name: '熱可可', type: 'consume', icon: 'potion', w: 2, price: 120, stack: true, desc: '恢復 60 點體力與 20 點魔力，北境的冒險者最愛' },
  pet_feast:      { name: '寵物大餐', type: 'consume', icon: 'potion', w: 3, price: 800, stack: true, desc: '讓出戰中的寵物恢復全部體力' },
  // 素材
  ice_crystal:    { name: '冰晶', type: 'junk', w: 3, price: 600, stack: true },
  yeti_fur:       { name: '雪怪毛皮', type: 'junk', w: 8, price: 350, stack: true },
});
Object.assign(POTION_COLORS, { hot_cocoa: '#7a4a2a', pet_feast: '#e0a040' });
Object.assign(MONSTERS, {
  snow_wolf:   { name: '雪原狼', lvl: 16, hp: 150, dmg: [6, 14], ac: 9, mr: 15, exp: 140, speed: 3.6, atkSpd: 0.9, range: 1.3, aggro: true, aggroR: 7, sprite: 'wolf', color: '#e6ecf2', eye: '#60c0ff', gold: [20, 45], loot: [['wolf_fang', 0.4], ['hot_cocoa', 0.15], ['frost_ring', 0.004]] },
  frost_wraith:{ name: '霜魂', lvl: 19, hp: 160, dmg: [9, 17], ac: 8, mr: 40, exp: 190, speed: 2.8, atkSpd: 1.5, range: 5.5, proj: 'ice', magic: true, element: 'water', aggro: true, aggroR: 7, sprite: 'ghost', undead: true, gold: [25, 55], loot: [['ice_crystal', 0.3], ['blue_potion', 0.15], ['frost_staff', 0.006]] },
  yeti:        { name: '雪怪', lvl: 22, hp: 320, dmg: [12, 24], ac: 12, mr: 20, exp: 280, speed: 2.7, atkSpd: 1.3, range: 1.5, aggro: true, aggroR: 6, sprite: 'yeti', gold: [35, 70], loot: [['yeti_fur', 0.5], ['yeti_cloak', 0.01], ['snow_boots', 0.01]] },
  ice_golem:   { name: '冰晶巨像', lvl: 24, hp: 520, dmg: [14, 26], ac: 18, mr: 30, exp: 360, speed: 2.2, atkSpd: 1.6, range: 1.6, aggro: true, aggroR: 5, sprite: 'golem', color: '#9cc8e8', gold: [40, 80], loot: [['ice_crystal', 0.6], ['frost_mail', 0.008], ['frost_blade', 0.006]] },
  frost_troll: { name: '霜巨魔', lvl: 26, hp: 600, dmg: [16, 30], ac: 15, mr: 25, exp: 420, speed: 2.6, atkSpd: 1.4, range: 1.6, aggro: true, aggroR: 6, sprite: 'troll', gold: [50, 100], loot: [['yeti_fur', 0.4], ['ice_crystal', 0.3], ['glacier_bow', 0.006], ['bew_scroll', 0.01]] },
  frost_king:  { name: '霜冠巨人王', lvl: 32, hp: 6000, dmg: [24, 42], ac: 22, mr: 50, exp: 10000, speed: 2.3, atkSpd: 1.7, range: 2.2, aggro: true, aggroR: 9, boss: true, frostKing: true, sprite: 'troll', big: 2, gold: [2500, 5000], respawn: 400,
    loot: [['ice_crystal', 1], ['ice_crystal', 1], ['exp_scroll', 0.4], ['bew_scroll', 0.5], ['bea_scroll', 0.5], ['frost_crown', 0.3], ['frost_blade', 0.2], ['glacier_bow', 0.2], ['frost_staff', 0.2], ['frost_mail', 0.2], ['yeti_cloak', 0.3], ['frost_ring', 0.3]] },
});
// 魔法寵物：會施放魔法攻擊（歐瑞城的寵物商人出售，各地寵物商人也買得到）
Object.assign(PETS, {
  firefox:   { name: '焰狐', sprite: 'fox', color: '#ff8a3a', hp: 34, hpLv: 7, dmg: [4, 9], dmgLv: 1.1, ac: 1, speed: 4.0, atkSpd: 1.3, range: 5, proj: 'fire', magic: true, element: 'fire', price: 9000, desc: '尾巴燃著火焰的狐狸，會吐出火球攻擊（魔法）' },
  frostwolf: { name: '霜牙狼', sprite: 'pwolf', color: '#a8d8f0', hp: 46, hpLv: 9, dmg: [4, 8], dmgLv: 0.9, ac: 3, speed: 3.7, atkSpd: 1.4, range: 5, proj: 'ice', magic: true, element: 'water', frost: true, price: 10000, desc: '北境的狼，吐出冰錐並讓敵人減速（魔法）' },
  stormhawk: { name: '雷鷹', sprite: 'owl', color: '#e8c840', hp: 30, hpLv: 6, dmg: [5, 11], dmgLv: 1.2, ac: 1, speed: 4.0, atkSpd: 1.6, range: 6, bolt: true, magic: true, element: 'wind', price: 12000, desc: '召喚雷電轟擊敵人，偶爾會連鎖到附近的敵人（魔法）' },
  wisp:      { name: '光之精靈', sprite: 'wisp', color: '#fff2a0', hp: 26, hpLv: 6, dmg: [3, 7], dmgLv: 0.9, ac: 2, speed: 3.9, atkSpd: 1.4, range: 5.5, proj: 'magic', magic: true, healer: true, price: 15000, desc: '發射聖光攻擊，主人受傷時會為主人治療（魔法）' },
});
SHOPS.pet.push('pet_feast');
// 城內商人：雜貨商人的所有品項＋城堡專屬商品
SHOPS.castleshop = [...new Set([...SHOPS.general, ...SHOPS.castleshop, 'hot_cocoa', 'pet_feast', 'oren_scroll', 'fireres_potion', 'volcano_scroll', 'pet_haste', 'tame_jerky', 'bless_scroll', 'teleport_scroll', 'yeti_cloak', 'frost_ring', 'magma_ring'])].filter((id) => ITEMS[id]);
SHOPS.general.push('hot_cocoa', 'oren_scroll');
// 歐瑞城專屬的商品
SHOPS.oren_general = [...SHOPS.general, 'pet_feast'];
SHOPS.oren_smith = ['frost_blade', 'glacier_bow', 'frost_staff', 'frost_mail', 'snow_boots', 'yeti_cloak', ...SHOPS.smith.slice(0, 8)];
SHOPS.oren_jewel = ['frost_ring', ...SHOPS.jewel];
QUESTS.push({ target: 'frost_king', count: 1, gold: 16000, exp: 24000, item: ['bew_scroll', 2], text: '北境歐瑞城外的冰河峽谷，霜冠巨人王正帶著雪怪群逼近城牆。去冰河峽谷深處討伐牠吧！' });

// ===== 魔法擴充到第 10 階（v2.13）=====
// 第 6～10 階的魔法書：第 5～6 階可在城堡御用商人與歐瑞城魔法商人買到，更高階只能從頭目身上取得。
// 高階魔法的圖示在 js/icons.js 的 SPELL_ART 中繪製
const HIGH_SPELLS = {
  // 第 6 階
  firestorm:   { name: '烈焰風暴', circle: 6, mp: 50, target: 'enemy', aoe: 3, icon: 'firestorm', learn: { mage: 22 }, desc: '在目標處掀起火焰風暴，爆炸後持續燃燒範圍內的敵人' },
  manashield:  { name: '魔力護盾', circle: 6, mp: 30, target: 'self', dur: 180, icon: 'manashield', learn: { mage: 22, cleric: 25 }, desc: '受到的傷害有一半改由魔力承受（3 分鐘）' },
  divineshield:{ name: '神聖護盾', circle: 6, mp: 35, target: 'self', dur: 60, icon: 'divineshield', learn: { cleric: 22, knight: 28 }, desc: '防禦 +8、魔法防禦 +20（60 秒）' },
  berserk:     { name: '狂暴', circle: 6, mp: 20, target: 'self', dur: 60, icon: 'berserk', learn: { knight: 22 }, desc: '物理傷害 +6，但防禦 -5（60 秒）' },
  eagleeye:    { name: '鷹眼', circle: 6, mp: 20, target: 'self', dur: 300, icon: 'eagleeye', learn: { ranger: 22 }, desc: '遠程命中與傷害大幅提升（5 分鐘）' },
  // 第 7 階
  thunderstorm:{ name: '雷霆風暴', circle: 7, mp: 65, target: 'enemy', aoe: 3.5, icon: 'thunderstorm', learn: { mage: 26 }, desc: '召喚雷雲，落雷連續轟擊範圍內的敵人' },
  greaterheal: { name: '大治癒之光', circle: 7, mp: 55, target: 'self', icon: 'greaterheal', learn: { cleric: 26, mage: 32 }, desc: '大量恢復自己與周圍所有夥伴、盟友、傭兵的體力' },
  earthquake:  { name: '大地震', circle: 7, mp: 55, target: 'self', aoe: 4, icon: 'earthquake', learn: { mage: 28, knight: 30 }, desc: '撼動大地，重創並減速身邊所有敵人' },
  // 第 8 階
  deathcloud:  { name: '死亡之雲', circle: 8, mp: 75, target: 'enemy', aoe: 3.5, icon: 'deathcloud', learn: { mage: 30 }, desc: '劇毒雲霧籠罩目標區域 8 秒，持續造成大量傷害' },
  holyjudgment:{ name: '神聖審判', circle: 8, mp: 65, target: 'enemy', icon: 'holyjudgment', learn: { cleric: 30 }, desc: '降下光柱，對單一敵人造成巨大傷害，對亡靈加倍' },
  arrowstorm:  { name: '萬箭齊發', circle: 8, mp: 45, target: 'enemy', aoe: 3.5, bow: true, icon: 'arrowstorm', learn: { ranger: 30 }, desc: '三波箭雨覆蓋目標區域（最多消耗 12 支箭）' },
  // 第 9 階
  timestop:    { name: '時間凍結', circle: 9, mp: 90, target: 'self', aoe: 7, cd: 30, icon: 'timestop', learn: { mage: 34 }, desc: '凍結周圍所有敵人的時間 5 秒（頭目 2 秒）。冷卻 30 秒' },
  holyfield:   { name: '聖域', circle: 9, mp: 80, target: 'self', dur: 30, cd: 30, icon: 'holyfield', learn: { cleric: 34 }, desc: '30 秒內每秒治療你與周圍的同伴，你受到的傷害 -30%' },
  // 第 10 階
  armageddon:  { name: '天崩地裂', circle: 10, mp: 150, target: 'enemy', aoe: 6, cd: 6, icon: 'armageddon', learn: { mage: 38 }, desc: '三波隕石雨轟炸廣大範圍，最強的攻擊魔法' },
  miracle:     { name: '神蹟', circle: 10, mp: 120, target: 'self', cd: 90, icon: 'miracle', learn: { cleric: 38 }, desc: '完全恢復你與周圍同伴的體力，並在 5 秒內不受任何傷害。冷卻 90 秒' },
};
const BOOK_PRICE = [0, 100, 600, 2500, 9000, 25000, 50000, 80000, 120000, 180000, 250000];
for (const id in HIGH_SPELLS) {
  SPELLS[id] = HIGH_SPELLS[id];
  const s = SPELLS[id];
  ITEMS['book_' + id] = { name: '魔法書（' + s.name + '）', type: 'book', spell: id, icon: 'book', w: 5, price: BOOK_PRICE[s.circle], rare: s.circle >= 7, desc: '第 ' + s.circle + ' 階魔法。使用後學會「' + s.name + '」' };
}
// 第 5～6 階魔法書：城堡御用商人與歐瑞城的魔法商人
const BOOKS_C5 = Object.keys(SPELLS).filter((s) => SPELLS[s].circle === 5).map((s) => 'book_' + s);
const BOOKS_C6 = Object.keys(SPELLS).filter((s) => SPELLS[s].circle === 6).map((s) => 'book_' + s);
SHOPS.castleshop.push(...BOOKS_C5, ...BOOKS_C6);
SHOPS.oren_magic = [...SHOPS.magic, ...BOOKS_C5];
// 高階魔法書由頭目掉落
const bookDrop = (mon, circles, ch) => { if (!MONSTERS[mon]) return; for (const id in SPELLS) if (circles.includes(SPELLS[id].circle)) MONSTERS[mon].loot.push(['book_' + id, ch]); };
bookDrop('wyvern', [6], 0.04); bookDrop('lich', [6], 0.05); bookDrop('pirate_captain', [6], 0.05); bookDrop('sea_serpent', [6, 7], 0.04);
bookDrop('iron_colossus', [6, 7, 8], 0.05); bookDrop('frost_king', [7, 8, 9], 0.06); bookDrop('flame_dragon', [8, 9, 10], 0.07);

// ===== 召喚戒指、負重強化（v2.15）=====
ITEMS.summon_ring = { name: '召喚戒指', type: 'tool', icon: 'ring', w: 2, price: 30000, rare: true, desc: '使用後可以依照你的等級，選擇召喚不同強度的召喚獸（30 分鐘，與召喚術共用 3 隻上限）。可以放到快捷列' };
// 召喚戒指能召喚的生物：等級越高越強
const RING_SUMMONS = [
  { lvl: 1, type: 'wolf', mp: 10 }, { lvl: 8, type: 'werewolf', mp: 18 }, { lvl: 14, type: 'snow_wolf', mp: 22 },
  { lvl: 18, type: 'hellhound', mp: 28 }, { lvl: 22, type: 'yeti', mp: 34 }, { lvl: 26, type: 'ice_golem', mp: 40 },
  { lvl: 30, type: 'frost_troll', mp: 48 }, { lvl: 34, type: 'magma_golem', mp: 56 }, { lvl: 38, type: 'draconian', mp: 66 },
  { lvl: 44, type: 'wyvern', mp: 90 },
].filter((s) => MONSTERS[s.type]);
SHOPS.magic.push('summon_ring'); SHOPS.oren_magic.push('summon_ring'); SHOPS.castleshop.push('summon_ring');
for (const m of ['wyvern', 'lich', 'iron_colossus']) if (MONSTERS[m]) MONSTERS[m].loot.push(['summon_ring', 0.04]);
// 負重強化（第 2 階，所有職業）
SPELLS.loadup = { name: '負重強化', circle: 2, mp: 6, target: 'self', dur: 900, icon: 'load', learn: { knight: 6, mage: 4, ranger: 5, cleric: 4 }, desc: '身體變得輕盈有力，負重上限 +50%（15 分鐘）' };
ITEMS.book_loadup = { name: '魔法書（負重強化）', type: 'book', spell: 'loadup', icon: 'book', w: 5, price: 600, desc: '第 2 階魔法。使用後學會「負重強化」' };
SHOPS.magic.splice(SHOPS.magic.indexOf('book_shield') + 1 || 6, 0, 'book_loadup');
SHOPS.oren_magic.splice(6, 0, 'book_loadup');

// ===== 主線故事「失落的月之碑」與月影遺跡（v2.16）=====
Object.assign(ITEMS, {
  // 劇情道具（不能販賣、不能丟棄）
  moon_shard:   { name: '月之碑碎片', type: 'quest', icon: 'gem', w: 0, price: 0, stack: true, desc: '刻著古老文字的石碑碎片，在夜裡會發出淡淡的藍光' },
  moon_key:     { name: '月之鑰', type: 'quest', icon: 'gem', w: 0, price: 0, desc: '打開月影之門的鑰匙，握在手裡有股清涼的感覺' },
  // 月影遺跡的裝備
  moonlight_amulet: { name: '月光項鍊', type: 'acc', slot: 'amulet', mp: 40, mr: 10, sp: 2, mpr: 2, w: 2, price: 30000, rare: true, desc: '學者艾德溫送給你的謝禮' },
  moonshadow_cloak: { name: '月影斗篷', type: 'armor', slot: 'cloak', ac: 3, mr: 12, er: 4, w: 30, price: 26000, safe: 4, lvl: 22, rare: true },
  eclipse_blade:    { name: '蝕月之刃', type: 'weapon', wclass: 'sword', dmg: [12, 26], dmgB: 3, hit: 3, spd: 0.85, range: 1.35, w: 120, price: 70000, safe: 6, lvl: 28, cls: ['knight', 'ranger'], rare: true, desc: '蝕月之主的佩劍，劍身吸收著光' },
  eclipse_staff:    { name: '蝕月法杖', type: 'weapon', wclass: 'staff', dmg: [6, 14], sp: 8, mp: 60, mpr: 3, spd: 1.0, range: 1.4, w: 60, price: 70000, safe: 6, lvl: 28, twoHand: true, cls: ['mage', 'cleric'], rare: true },
  eclipse_bow:      { name: '蝕月長弓', type: 'weapon', wclass: 'bow', dmg: [10, 22], hit: 4, spd: 0.8, range: 8, ranged: true, w: 60, price: 70000, safe: 6, lvl: 28, twoHand: true, cls: ['ranger'], rare: true },
  starsilver_mail:  { name: '星銀鎧甲', type: 'armor', slot: 'armor', ac: 9, mr: 15, w: 300, price: 40000, safe: 4, lvl: 24, cls: ['knight', 'cleric', 'ranger'] },
  moon_ring:        { name: '新月戒指', type: 'acc', slot: 'ring', sp: 1, mp: 25, mr: 5, w: 2, price: 9000 },
  moon_dust:        { name: '月塵', type: 'junk', w: 2, price: 500, stack: true },
  moonruins_scroll: { name: '月影遺跡傳送卷軸', type: 'consume', icon: 'scroll', w: 1, price: 900, stack: true, desc: '傳送到月影遺跡的入口（完成主線第 4 章後才能使用）' },
});
Object.assign(MONSTERS, {
  moon_spider:   { name: '月紋蜘蛛', lvl: 23, hp: 260, dmg: [10, 20], ac: 11, mr: 25, exp: 230, speed: 3.2, atkSpd: 1.0, range: 1.3, aggro: true, aggroR: 6, sprite: 'spider', color: '#4a3a7a', gold: [30, 60], loot: [['moon_dust', 0.4], ['moon_ring', 0.008]] },
  moon_wraith:   { name: '月影幽魂', lvl: 24, hp: 240, dmg: [12, 22], ac: 10, mr: 45, exp: 250, speed: 2.8, atkSpd: 1.5, range: 5.5, proj: 'dark', magic: true, aggro: true, aggroR: 7, sprite: 'ghost', color: 'rgba(190,160,255,0.95)', undead: true, gold: [30, 60], loot: [['moon_dust', 0.5], ['blue_potion', 0.2], ['moonshadow_cloak', 0.004]] },
  fallen_elf:    { name: '墮落精靈射手', lvl: 25, hp: 280, dmg: [12, 24], ac: 10, mr: 30, exp: 280, speed: 3.2, atkSpd: 1.2, range: 6.5, proj: 'arrow', aggro: true, aggroR: 8, sprite: 'elf', gold: [40, 80], loot: [['silver_arrow', 0.3], ['moon_dust', 0.3], ['eclipse_bow', 0.003]] },
  ruin_golem:    { name: '遺跡守衛', lvl: 27, hp: 620, dmg: [16, 30], ac: 20, mr: 30, exp: 420, speed: 2.1, atkSpd: 1.6, range: 1.6, aggro: true, aggroR: 5, sprite: 'golem', color: '#7a7aa0', gold: [50, 100], loot: [['moon_dust', 0.6], ['starsilver_mail', 0.006]] },
  eclipse_knight:{ name: '蝕月騎士', lvl: 29, hp: 700, dmg: [18, 34], ac: 18, mr: 30, exp: 520, speed: 2.8, atkSpd: 1.1, range: 1.5, aggro: true, aggroR: 7, sprite: 'guard', dark: true, gold: [60, 120], loot: [['moon_dust', 0.5], ['bew_scroll', 0.01], ['eclipse_blade', 0.003]] },
  shadow_treant: { name: '影縛樹精', lvl: 18, hp: 1400, dmg: [12, 24], ac: 12, mr: 25, exp: 2500, speed: 1.8, atkSpd: 1.7, range: 1.7, aggro: true, aggroR: 8, sprite: 'treant', boss: true, story: true, gold: [800, 1500], respawn: 999999, loot: [['clear_potion', 1]] },
  eclipse_lord:  { name: '蝕月之主', lvl: 34, hp: 6500, dmg: [24, 44], ac: 22, mr: 60, exp: 13000, speed: 2.4, atkSpd: 1.6, range: 2.0, aggro: true, aggroR: 10, boss: true, eclipse: true, sprite: 'eclipse', gold: [3000, 6000], respawn: 480,
    loot: [['moon_dust', 1], ['moon_dust', 1], ['exp_scroll', 0.5], ['bew_scroll', 0.5], ['bea_scroll', 0.5], ['eclipse_blade', 0.2], ['eclipse_staff', 0.2], ['eclipse_bow', 0.2], ['moonshadow_cloak', 0.3], ['starsilver_mail', 0.25], ['moon_ring', 0.3], ['summon_ring', 0.05]] },
});
for (const id in SPELLS) if (SPELLS[id].circle >= 8 && SPELLS[id].circle <= 10) MONSTERS.eclipse_lord.loot.push(['book_' + id, 0.05]);
SHOPS.general.push('moonruins_scroll');
// 後來覆寫或新增的物品若還沒有圖示類型，依類別補上
for (const id in ITEMS) { const it = ITEMS[id]; if (it.icon) continue; it.icon = it.type === 'weapon' ? it.wclass : (it.type === 'armor' || it.type === 'acc') ? it.slot : it.type === 'consume' ? (/potion|cocoa|elixir/.test(id) ? 'potion' : 'scroll') : it.type === 'ammo' ? 'arrow' : 'junk'; }
