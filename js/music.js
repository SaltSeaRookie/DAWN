'use strict';
// ===== 區域音樂：程序作曲 =====
// 每個村莊、地區、地下城都有專屬的曲子。作曲引擎依照每首曲子的設定（調式、和弦進行、樂器、伴奏與節奏型）
// 用固定的亂數種子譜出旋律，所以每次聽到的都是同一首歌。
// 旋律規則：強拍落在和弦內音、弱拍以級進連接，前後樂句共用節奏動機，樂段結尾停在主音或三音的長音上。
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10],
  phryg: [0, 1, 3, 5, 7, 8, 10], phrygdom: [0, 1, 4, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], lydian: [0, 2, 4, 6, 7, 9, 11],
};
// 旋律節奏動機（拍數，總和等於一小節）
const RHYTHMS4 = [[1, 1, 1, 1], [1.5, 0.5, 1, 1], [2, 1, 1], [1, 0.5, 0.5, 2], [0.5, 0.5, 1, 2], [1, 1, 2], [1.5, 0.5, 2], [0.5, 0.5, 0.5, 0.5, 1, 1]];
const RHYTHMS3 = [[1, 1, 1], [2, 1], [1.5, 0.5, 1], [1, 0.5, 0.5, 1], [3], [0.5, 0.5, 1, 1]];

// ---------- 各區域的曲子設定 ----------
// prog: 和弦級數（1～7，羅馬數字），A／B 兩段；inst: [主旋律, 副旋律, 和聲墊, 分解和弦, 低音]（GM 音色編號，null＝不用）
const AREA_MUSIC = {
  // ===== 村莊 =====
  town_dawn:  { name: '晨風村・晨光小調', bpm: 86, root: 67, mode: 'major', meter: 4, A: [1, 5, 6, 4, 1, 4, 5, 1], B: [4, 5, 3, 6, 4, 1, 2, 5], inst: [73, null, 48, 24, 32], acc: 'arp', bass: 'root', perc: 'shaker', seed: 11, vol: 0.9 },
  town_leaf:  { name: '林語村・森之搖籃', bpm: 76, root: 62, mode: 'dorian', meter: 3, A: [1, 4, 1, 7, 1, 4, 5, 1], B: [3, 4, 7, 1, 6, 4, 5, 5], inst: [75, null, 49, 46, 32], acc: 'waltz', bass: 'root', perc: 'none', seed: 23 },
  town_port:  { name: '銀風港・海風之歌', bpm: 112, root: 62, mode: 'minor', meter: 3, A: [1, 1, 7, 7, 6, 3, 5, 1], B: [3, 7, 1, 5, 6, 4, 5, 1], inst: [40, 21, null, null, 33], acc: 'oompah', bass: 'oompah', perc: 'tambourine', seed: 37 },
  town_anvil: { name: '鐵砧鎮・熔爐與沙', bpm: 96, root: 57, mode: 'phrygdom', meter: 4, A: [1, 2, 1, 7, 1, 2, 3, 1], B: [4, 3, 2, 1, 6, 7, 2, 1], inst: [104, 68, 49, 105, 33], acc: 'arp', bass: 'pulse', perc: 'tribal', seed: 41 },
  town_coral: { name: '珊瑚鎮・椰影與浪花', bpm: 106, root: 60, mode: 'major', meter: 4, A: [1, 4, 5, 1, 6, 4, 5, 1], B: [4, 5, 3, 6, 2, 5, 1, 1], inst: [114, 73, null, 12, 33], acc: 'arp', bass: 'walk', perc: 'island', seed: 53 },
  town_oren:  { name: '歐瑞城・雪夜燈火', bpm: 70, root: 64, mode: 'minor', meter: 3, A: [1, 6, 3, 7, 1, 4, 5, 1], B: [6, 7, 3, 6, 4, 1, 5, 5], inst: [10, 68, 49, 46, 42], acc: 'waltz', bass: 'root', perc: 'none', seed: 61 },
  castle:     { name: '灰岩城・石壁與旗幟', bpm: 88, root: 58, mode: 'major', meter: 4, A: [1, 4, 5, 1, 6, 4, 5, 5], B: [4, 1, 6, 5, 4, 5, 1, 1], inst: [56, 60, 48, null, 58], acc: 'brass', bass: 'march', perc: 'snare', seed: 71 },
  // ===== 晨曦大陸的野外 =====
  meadow:     { name: '碧波草原・旅途的開始', bpm: 112, root: 60, mode: 'major', meter: 4, A: [1, 5, 6, 4, 1, 5, 4, 5], B: [6, 4, 1, 5, 6, 4, 2, 5], inst: [60, 73, 48, 24, 33], acc: 'arp', bass: 'walk', perc: 'adventure', seed: 101 },
  forest:     { name: '幽影森林・林間低語', bpm: 72, root: 64, mode: 'minor', meter: 4, A: [1, 6, 7, 1, 4, 6, 5, 5], B: [6, 7, 3, 6, 4, 1, 5, 1], inst: [68, 71, 49, 46, 42], acc: 'tremolo', bass: 'root', perc: 'none', seed: 113 },
  bone:       { name: '骸骨荒原・枯骨之風', bpm: 64, root: 60, mode: 'phryg', meter: 4, A: [1, 2, 1, 7, 1, 2, 6, 1], B: [4, 2, 1, 7, 6, 2, 7, 1], inst: [14, 52, 52, null, 42], acc: 'pad', bass: 'drone', perc: 'heartbeat', seed: 127 },
  canyon:     { name: '赤岩峽谷・烈日與岩壁', bpm: 100, root: 57, mode: 'phrygdom', meter: 4, A: [1, 2, 1, 7, 6, 7, 2, 1], B: [4, 5, 2, 1, 6, 2, 7, 1], inst: [105, 30, 48, null, 33], acc: 'pulse', bass: 'pulse', perc: 'tribal', seed: 131 },
  desert:     { name: '灰燼沙漠・蜃樓', bpm: 92, root: 62, mode: 'phrygdom', meter: 4, A: [1, 2, 1, 4, 1, 2, 7, 1], B: [6, 7, 2, 1, 4, 2, 7, 1], inst: [104, 73, 49, 46, 33], acc: 'arp', bass: 'drone', perc: 'tribal', seed: 139 },
  highland:   { name: '霜嶺高地・遠山的風', bpm: 88, root: 62, mode: 'mixo', meter: 4, A: [1, 7, 4, 1, 1, 7, 5, 1], B: [4, 7, 1, 5, 4, 1, 7, 1], inst: [75, 71, 49, 46, 32], acc: 'arp', bass: 'root', perc: 'soft', seed: 149 },
  coast:      { name: '銀砂海岸・潮聲', bpm: 96, root: 65, mode: 'major', meter: 3, A: [1, 4, 1, 5, 6, 4, 5, 1], B: [4, 5, 3, 6, 4, 1, 5, 1], inst: [73, null, 48, 46, 32], acc: 'waltz', bass: 'root', perc: 'shaker', seed: 157 },
  // ===== 其他地圖 =====
  isle:       { name: '翡翠群島・叢林探險', bpm: 116, root: 62, mode: 'mixo', meter: 4, A: [1, 7, 4, 1, 1, 7, 5, 1], B: [4, 1, 7, 4, 6, 7, 5, 1], inst: [73, 12, null, 12, 33], acc: 'arp', bass: 'walk', perc: 'island', seed: 211 },
  crypt:      { name: '地下墓穴・永眠之廳', bpm: 60, root: 62, mode: 'harm', meter: 4, A: [1, 6, 4, 5, 1, 6, 2, 5], B: [4, 1, 6, 5, 4, 6, 5, 1], inst: [19, 52, 52, null, 42], acc: 'pad', bass: 'drone', perc: 'heartbeat', seed: 223 },
  keep:       { name: '地下要塞・鐵與火炬', bpm: 100, root: 60, mode: 'minor', meter: 4, A: [1, 6, 7, 1, 1, 6, 5, 5], B: [4, 6, 7, 1, 4, 2, 5, 1], inst: [61, 57, 48, null, 58], acc: 'pulse', bass: 'march', perc: 'march', seed: 229 },
  volcano:    { name: '熾焰火山・熔岩之心', bpm: 126, root: 64, mode: 'phryg', meter: 4, A: [1, 2, 1, 7, 1, 2, 6, 7], B: [6, 7, 1, 2, 6, 2, 7, 1], inst: [30, 61, 48, null, 33], acc: 'pulse', bass: 'pulse8', perc: 'rock', seed: 233 },
  snowfield:  { name: '北境雪原・白色寂靜', bpm: 80, root: 59, mode: 'minor', meter: 4, A: [1, 6, 3, 7, 1, 6, 4, 5], B: [6, 3, 7, 1, 4, 6, 5, 1], inst: [8, 71, 49, 46, 42], acc: 'arp', bass: 'root', perc: 'soft', seed: 241 },
  moonruins:  { name: '月影遺跡・沉睡的月光', bpm: 66, root: 66, mode: 'lydian', meter: 3, A: [1, 2, 1, 7, 6, 2, 5, 1], B: [4, 5, 3, 6, 2, 5, 1, 1], inst: [52, 10, 49, 46, 42], acc: 'waltz', bass: 'drone', perc: 'none', seed: 251 },
  // ===== 戰鬥 =====
  battle:     { name: '戰鬥・刀光劍影', bpm: 138, root: 60, mode: 'harm', meter: 4, A: [1, 6, 4, 5, 1, 6, 2, 5], B: [6, 4, 5, 1, 6, 4, 5, 5], inst: [56, 30, 48, null, 33], acc: 'pulse', bass: 'pulse8', perc: 'battle', seed: 307 },
};

function mulberrySeed(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function composeArea(id) {
  const S = AREA_MUSIC[id]; if (!S) return null;
  const R = mulberrySeed(S.seed * 7919);
  const pick2 = (a) => a[Math.floor(R() * a.length)];
  const scale = MODES[S.mode], root = S.root, M = S.meter, beat = 60 / S.bpm, bar = beat * M;
  const ev = [];
  const prog = (ch, a) => ev.push({ type: 'prog', ch, a, t: 0 });
  const cc = (ch, a, b) => ev.push({ type: 'cc', ch, a, b, t: 0 });
  const note = (ch, n, start, dur, v) => { if (n < 24 || n > 108) return; ev.push({ type: 'note', ch, n: Math.round(n), v: Math.round(clamp(v, 1, 127)), t: start, end: start + Math.max(0.05, dur) }); };
  const [iLead, iLead2, iPad, iArp, iBass] = S.inst;
  // 0 主旋律 1 副旋律 2 和聲墊 3 分解和弦 4 低音 9 打擊樂
  if (iLead != null) prog(0, iLead); if (iLead2 != null) prog(1, iLead2); if (iPad != null) prog(2, iPad); if (iArp != null) prog(3, iArp); if (iBass != null) prog(4, iBass);
  const vol = S.vol || 1;
  cc(0, 7, 100 * vol); cc(1, 7, 74 * vol); cc(2, 7, 62 * vol); cc(3, 7, 70 * vol); cc(4, 7, 88 * vol); cc(9, 7, 66 * vol);
  cc(0, 10, 60); cc(1, 10, 76); cc(2, 10, 50); cc(3, 10, 40); cc(4, 10, 64);
  // 音階工具：級數（可為負或超過 7）→ MIDI 音高
  const deg = (d) => { const o = Math.floor(d / 7), k = ((d % 7) + 7) % 7; return root + o * 12 + scale[k]; };
  const chordDegs = (c) => [c - 1, c + 1, c + 3];   // 三和弦（以 0 為主音的級數）
  // 樂段：A A' B A''（每段 8 小節，每小節一個和弦）
  const form = ['A', 'A2', 'B', 'A3'];
  let t = 0, prevDeg = 7 + 2;   // 旋律從主音上方的三音附近開始
  const motifs = {};   // 共用的節奏動機
  for (const part of form) {
    const chords = part === 'B' ? S.B : S.A;
    const hiShift = part === 'B' ? 2 : 0;   // B 段旋律較高
    const R4 = M === 3 ? RHYTHMS3 : RHYTHMS4;
    if (!motifs[part[0]]) motifs[part[0]] = [pick2(R4), pick2(R4), pick2(R4)];
    const mot = motifs[part[0]];
    chords.forEach((c, b) => {
      const t0 = t + b * bar, cd = chordDegs(c), last = b === chords.length - 1;
      const tones = cd.map(deg);
      // ---- 主旋律 ----
      const rhythm = last ? [M] : b % 4 === 3 ? (M === 3 ? [2, 1] : [2, 2]) : mot[(b + (part === 'A3' ? 1 : 0)) % 3];
      let pos = 0;
      for (let k = 0; k < rhythm.length; k++) {
        const len = rhythm[k], strong = pos === 0 || (M === 4 && pos === 2);
        let target;
        if (last) {   // 樂段結尾：落在最近的和弦根音
          const roots = [cd[0], cd[0] + 7, cd[0] + 14].filter((x) => x >= 5 && x <= 14);
          target = roots.sort((p, q) => Math.abs(p - prevDeg) - Math.abs(q - prevDeg))[0] || 7;
        } else if (strong) {
          // 強拍：選最接近前一個音的和弦內音（加上一點方向性）
          const cands = []; for (const x of cd) for (const o of [0, 7, 14]) cands.push(x + o + hiShift);
          cands.sort((p, q) => Math.abs(p - prevDeg) - Math.abs(q - prevDeg) + (R() - 0.5) * 1.2);
          target = cands[0];
        } else target = prevDeg + (R() < 0.5 ? 1 : -1) * (R() < 0.8 ? 1 : 2);
        if (!last) target = clamp(target, 4 + hiShift, 13 + hiShift);
        prevDeg = target;
        if (iLead != null) note(0, deg(target) + (S.leadOct || 0) * 12, t0 + pos * beat, len * beat * 0.92, (strong ? 96 : 82) + R() * 8);
        // 副旋律：A' 與 A'' 段在下方三度和聲
        if (iLead2 != null && part !== 'A' && (strong || len >= 1)) note(1, deg(target - 2) + (S.leadOct || 0) * 12, t0 + pos * beat, len * beat * 0.9, 66);
        pos += len;
      }
      // ---- 和聲墊 ----
      if (iPad != null) for (const n of tones) note(2, n - 12, t0, bar * 0.98, 54);
      // ---- 伴奏 ----
      const A = S.acc;
      if (iArp != null || A === 'brass' || A === 'oompah') {
        const ch = iArp != null ? 3 : 2;
        if (A === 'arp') { const ns = [tones[0] - 12, tones[1] - 12, tones[2] - 12, tones[0]], seq = [0, 1, 2, 1, 3, 2, 1, 2]; for (let k = 0; k < M * 2; k++) note(ch, ns[seq[k % 8]], t0 + k * beat / 2, beat * 0.9, k === 0 ? 72 : 56); }
        else if (A === 'waltz') { note(ch, tones[0] - 12, t0, beat * 0.9, 64); for (let k = 1; k < M; k++) for (const n of tones.slice(1)) note(ch, n - 12, t0 + k * beat, beat * 0.7, 50); }
        else if (A === 'oompah') { for (let k = 1; k < M; k++) for (const n of tones) note(1, n - 12, t0 + k * beat, beat * 0.45, 58); }
        else if (A === 'tremolo') { for (let k = 0; k < M * 4; k++) note(ch, tones[(k >> 2) % 3] - 12, t0 + k * beat / 4, beat / 4, 34 + (k % 4 === 0 ? 10 : 0)); }
        else if (A === 'pulse') { for (let k = 0; k < M * 2; k++) note(iArp != null ? 3 : 1, tones[k % 2 === 0 ? 0 : 2] - 12, t0 + k * beat / 2, beat * 0.4, k % 2 ? 58 : 70); }
        else if (A === 'brass') { for (const k of [1, 3]) for (const n of tones.slice(1)) note(1, n - 12, t0 + k * beat, beat * 0.55, 62); }
      } else if (A === 'pulse') { for (let k = 0; k < M * 2; k++) note(1, tones[k % 2 === 0 ? 0 : 2] - 12, t0 + k * beat / 2, beat * 0.4, k % 2 ? 56 : 68); }
      // ---- 低音 ----
      if (iBass != null) {
        const r = tones[0] - 24 < 28 ? tones[0] - 12 : tones[0] - 24;
        const B = S.bass;
        if (B === 'root') note(4, r, t0, bar * 0.95, 78);
        else if (B === 'drone') { note(4, deg(0) - 24 < 28 ? deg(0) - 12 : deg(0) - 24, t0, bar, 66); }
        else if (B === 'walk') for (let k = 0; k < M; k++) note(4, r + [0, 7, 12, 7][k % 4], t0 + k * beat, beat * 0.85, k ? 64 : 80);
        else if (B === 'oompah') { note(4, r, t0, beat * 0.8, 84); }
        else if (B === 'march') { note(4, r, t0, beat * 0.9, 84); note(4, r + 7, t0 + 2 * beat, beat * 0.9, 72); }
        else if (B === 'pulse') for (let k = 0; k < M; k++) note(4, r, t0 + k * beat, beat * 0.6, k ? 64 : 82);
        else if (B === 'pulse8') for (let k = 0; k < M * 2; k++) note(4, r, t0 + k * beat / 2, beat * 0.35, k % 2 ? 60 : 80);
      }
      // ---- 打擊樂 ----
      drumBar(S.perc, t0, beat, M, b, part, note, R);
    });
    t += chords.length * bar;
  }
  ev.sort((a, b) => a.t - b.t || (a.type === 'note' ? 1 : -1));
  return { events: ev, duration: t, loopGap: 0, title: S.name, gain: AREA_GAIN[id] || 1 };
}
// 打擊樂型（GM 鼓組：36 大鼓 38 小鼓 42 閉合鈸 46 開放鈸 49 銅鈸 54 鈴鼓 70 沙鈴 60/61 邦哥鼓 47 中筒鼓）
function drumBar(type, t0, beat, M, b, part, note, R) {
  const d = (n, pos, v, len = 0.2) => note(9, n, t0 + pos * beat, beat * len, v);
  switch (type) {
    case 'shaker': for (let k = 0; k < M * 2; k++) d(70, k / 2, k % 2 ? 30 : 42); break;
    case 'soft': d(36, 0, 50); if (M === 4) d(36, 2, 38); for (let k = 0; k < M; k++) d(70, k + 0.5, 26); break;
    case 'tambourine': d(36, 0, 66); for (let k = 1; k < M; k++) d(54, k, 48); break;
    case 'snare': d(36, 0, 78); d(38, 1, 54); d(38, 1.75, 44); d(36, 2, 60); d(38, 3, 58); if (b === 0) d(49, 0, 80, 2); break;
    case 'march': d(36, 0, 86); d(38, 1, 70); d(38, 1.5, 50); d(36, 2, 70); d(38, 3, 70); d(38, 3.5, 54); if (b === 0) d(49, 0, 86, 2); break;
    case 'tribal': d(47, 0, 80); d(60, 1, 54); d(61, 1.5, 46); d(47, 2, 66); d(60, 3, 54); d(61, 3.25, 40); d(61, 3.5, 48); break;
    case 'island': d(36, 0, 66); d(60, 0.5, 44); d(61, 1, 50); d(60, 1.75, 42); d(36, 2, 56); d(61, 2.5, 50); d(60, 3, 44); for (let k = 0; k < M * 2; k++) d(70, k / 2, 28); break;
    case 'adventure': d(36, 0, 78); d(42, 0.5, 40); d(38, 1, 64); d(42, 1.5, 40); d(36, 2, 66); d(36, 2.5, 50); d(38, 3, 64); d(42, 3.5, 44); if (b === 0) d(49, 0, 72, 2); break;
    case 'rock': for (let k = 0; k < 8; k++) d(42, k / 2, k % 2 ? 40 : 56); d(36, 0, 92); d(36, 1.5, 70); d(38, 1, 84); d(36, 2, 86); d(38, 3, 86); if (b % 4 === 0) d(49, 0, 84, 2); break;
    case 'battle': for (let k = 0; k < 8; k++) d(42, k / 2, 50); for (const p of [0, 0.75, 2, 2.5]) d(36, p, 90); d(38, 1, 90); d(38, 3, 90); if (b % 2 === 1) for (let k = 0; k < 4; k++) d(38, 3 + k / 4, 50 + k * 8); if (b % 4 === 0) d(49, 0, 90, 2); break;
    case 'heartbeat': d(36, 0, 58); d(36, 0.4, 42); break;
  }
}

// 各曲的整體音量（實際渲染後量測，讓每首聽起來差不多大聲）
const AREA_GAIN = { town_dawn: 0.95, town_leaf: 0.8, town_port: 1.25, town_anvil: 1.3, town_coral: 1.1, town_oren: 1.7, castle: 1.65, meadow: 1.1, forest: 1.5, bone: 1.6, canyon: 1.3, desert: 1.3, highland: 0.78, coast: 0.82, isle: 0.8, crypt: 1.4, keep: 1.5, volcano: 1.0, snowfield: 1.3, moonruins: 1.15, battle: 0.88 };

// ---------- 依照所在位置選曲 ----------
const BIOME_MUSIC = () => ({
  [BIOME.MEADOW]: 'meadow', [BIOME.PLAIN]: 'meadow', [BIOME.FOREST]: 'forest', [BIOME.BONE]: 'bone', [BIOME.CANYON]: 'canyon',
  [BIOME.DESERT]: 'desert', [BIOME.COAST]: 'coast', [BIOME.CASTLE]: 'castle', [BIOME.HIGHLAND]: 'highland',
});
function areaMusicId() {
  const p = G.player, W = G.world, m = G.map.id;
  // 戰鬥：攻城戰中在城堡附近，或被頭目盯上
  const boss = G.map.actors.some((a) => a.boss && !a.dead && a.target === p && dist(a.x, a.y, p.x, p.y) < 16);
  if (boss) return 'battle';
  if (G.siege && G.siege.active && m === 'overworld' && W.castle && dist(p.x, p.y, W.castle.cx, W.castle.cy) < 30) return 'battle';
  const town = W.townAt(p.x, p.y);
  if (town) return 'town_' + town.id;
  if (m === 'overworld') {
    if (Settings.classicBgm && G.world.biomeAt(p.x, p.y) !== BIOME.CASTLE) return 'field';
    return BIOME_MUSIC()[W.biomeAt(p.x, p.y)] || 'meadow';
  }
  if (m === 'oren') return 'snowfield';
  return { isle: 'isle', crypt: 'crypt', keep: 'keep', volcano: 'volcano', moonruins: 'moonruins' }[m] || 'meadow';
}
// 位置穩定 2 秒後才換曲（避免在邊界來回時一直切換）
function musicTick(dt) {
  if (!G.player) return;
  G.musT = (G.musT || 0) - dt; if (G.musT > 0) return;
  G.musT = 0.5;
  const want = areaMusicId();
  if (want === Music.current) { G.musWant = null; return; }
  if (G.musWant !== want) { G.musWant = want; G.musSince = G.t; return; }
  if (G.t - G.musSince >= (want === 'battle' || Music.current === 'battle' ? 0.5 : 2)) {
    Music.play(want); G.musWant = null;
    const S = AREA_MUSIC[want];
    if (S && Settings.showSongTitle !== false) UI.log('♪ ' + S.name, 'sys');
  }
}
