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
  return_scroll: { name: '回村卷軸', type: 'consume', w: 1, price: 40, stack: true, desc: '傳送到最近一次記錄的村莊' },
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
  charm:      { name: '迷魅術', circle: 3, mp: 16, target: 'enemy', icon: 'charm', learn: { mage: 12 }, desc: '讓一隻怪物暫時成為你的盟友（30 分鐘，最多 3 隻）。頭目、守衛與冒險者無效' },
  summon_wolf:  { name: '召喚狼靈', circle: 3, mp: 20, target: 'self', icon: 'swolf', summon: 'spiritwolf', learn: { mage: 10, cleric: 10 }, desc: '召喚靈體之狼跟隨作戰（30 分鐘）' },
  summon_golem: { name: '召喚岩石巨像', circle: 4, mp: 30, target: 'self', icon: 'sgolem', summon: 'stonegolem', learn: { mage: 14, cleric: 14 }, desc: '召喚體力強大的岩石巨像替你擋住敵人（30 分鐘）' },
  summon_fire:  { name: '召喚火焰元素', circle: 5, mp: 40, target: 'self', icon: 'sfire', summon: 'fireelem', learn: { mage: 18, cleric: 18 }, desc: '召喚會發射火球的火焰元素（30 分鐘）' },
};
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

function expForLevel(l) { return Math.floor(24 * Math.pow(l, 2.15)); }
function alignName(v) { return v >= 500 ? '正義' : v < 0 ? '邪惡' : '中立'; }
function alignColor(v) { return v >= 500 ? '#7ab8ff' : v < 0 ? '#ff5a4a' : '#e8e8e8'; }
