'use strict';
// ===== 名字管理：玩家與電腦角色的名字都不重複 =====
const NAME_PREFIX = ['風', '雷', '月', '星', '夜', '霜', '赤', '青', '白', '黑', '銀', '金', '鐵', '雲', '花', '影', '雪', '炎', '翠', '紫', '晨', '暮', '蒼', '玄'];
const NAME_SUFFIX = ['之翼', '行者', '狼', '狐', '歌', '刃', '羽', '心', '火', '鷹', '語', '弦', '騎', '瞳', '痕', '眠', '光', '舞', '牙', '鈴'];
const Names = {
  used: new Set(),
  reset(list) { this.used = new Set((list || []).filter(Boolean)); },
  add(n) { if (n) this.used.add(n); },
  release(n) { this.used.delete(n); },
  // 從名單中挑一個沒人用的名字；名單用完就組合新名字
  take(pool) {
    const free = (pool || []).filter((n) => !this.used.has(n));
    let n = free.length ? pick(free) : null;
    for (let i = 0; !n && i < 80; i++) { const c = pick(NAME_PREFIX) + pick(NAME_SUFFIX); if (!this.used.has(c)) n = c; }
    if (!n) { let k = 2; const b = pick(NAME_PREFIX) + pick(NAME_SUFFIX); while (this.used.has(b + k)) k++; n = b + k; }
    this.used.add(n);
    return n;
  },
};
// 玩家不能使用的名字（NPC、冒險者、怪物、寵物等）
function reservedNames() {
  const s = new Set([...FIGHTER_NAMES, ...PKER_NAMES, ...NPC_CLANS, ENEMY_CLAN, '灰岩騎士團', '村莊守衛', '奧德里奇', 'GM', '管理員', '系統']);
  if (typeof NPC_NAMES !== 'undefined') for (const k in NPC_NAMES) for (const n of NPC_NAMES[k]) s.add(n);
  for (const k in MONSTERS) s.add(MONSTERS[k].name);
  for (const k in PETS) s.add(PETS[k].name);
  for (const k in SUMMONS) s.add(SUMMONS[k].name);
  return s;
}
function isReservedName(name) {
  const low = name.toLowerCase();
  for (const r of reservedNames()) if (r.toLowerCase() === low) return true;
  return /^(gm|admin|管理|系統)/i.test(name);
}
