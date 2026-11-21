'use strict';
// ===== 物品圖示（v2.19 重新繪製）=====
// 每一類裝備都有細節（劍身血槽、護手、握柄纏帶、鎧甲肩甲與鉚釘、斗篷皺褶…），
// 並依照裝備系列加上主題特徵：火龍系的火焰與鱗片、北境系的冰晶、蝕月系的新月、王家系的金色紋飾等。
const ICON_THEMES = {
  fire:  { main: '#d8582a', light: '#ffb060', dark: '#6a1a08', accent: '#ffd040', glow: '#ff7020' },
  ice:   { main: '#8ac8e8', light: '#e8f8ff', dark: '#2a5a80', accent: '#ffffff', glow: '#9ae0ff' },
  moon:  { main: '#6a50b0', light: '#c8b8ff', dark: '#24163e', accent: '#e8e0ff', glow: '#a080ff' },
  holy:  { main: '#e8dcb0', light: '#fffbe8', dark: '#8a7a40', accent: '#ffd860', glow: '#fff0a0' },
  dark:  { main: '#4a4458', light: '#8a849a', dark: '#16121e', accent: '#c040ff', glow: '#8a40c0' },
  royal: { main: '#c8a040', light: '#fff0a0', dark: '#6a4a10', accent: '#d02040', glow: '#ffd860' },
  nature:{ main: '#5a8a3a', light: '#a8d878', dark: '#24401a', accent: '#e0c060', glow: '#90e070' },
  steel: { main: '#a8b0bc', light: '#eef2f8', dark: '#4a525c', accent: '#c9a33a', glow: null },
  leather:{ main: '#8a5a32', light: '#c08a5a', dark: '#3e2614', accent: '#c9a33a', glow: null },
  cloth: { main: '#4a5a8a', light: '#8a9ad0', dark: '#1e2640', accent: '#d0b050', glow: null },
};
function itemTheme(id, it) {
  if (/dragon|flame|magma|ember|cinder|drake|fire|lava|inferno|hell/.test(id)) return 'fire';
  if (/frost|glacier|snow|yeti|ice|winter/.test(id)) return 'ice';
  if (/eclipse|moon|star|astral/.test(id)) return 'moon';
  if (/holy|sage|serene|bless|saint|angel|light|spring/.test(id)) return 'holy';
  if (/shadow|dark|bone|death|skull|lich|ghost/.test(id)) return 'dark';
  if (/royal|king|crown|gold|castle/.test(id)) return 'royal';
  if (/oak|forest|leaf|ranger|elven|nature|earth/.test(id)) return 'nature';
  if (it.icon === 'armor' && /robe|cloth/.test(id)) return 'cloth';
  if (/leather|hide|travel|studded|fur/.test(id)) return 'leather';
  return 'steel';
}
function drawItemIcon(ctx, id, x, y, s) {
  const it = ITEMS[id]; if (!it) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32);
  const c = itemColor(id), th = itemTheme(id, it), T = ICON_THEMES[th];
  const metal = (x0, x1, base) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, shade(base, -0.35)); g.addColorStop(0.45, shade(base, 0.45)); g.addColorStop(0.55, shade(base, 0.15)); g.addColorStop(1, shade(base, -0.45)); return g; };
  const glow = (col, b) => { if (col) { ctx.shadowColor = col; ctx.shadowBlur = b; } };
  const noGlow = () => { ctx.shadowBlur = 0; };
  const gem = (gx, gy, r, col) => {
    const g = ctx.createRadialGradient(gx - r * 0.35, gy - r * 0.35, 0.2, gx, gy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, shade(col, 0.3)); g.addColorStop(1, shade(col, -0.45));
    glow(col, 4); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fill(); noGlow();
  };
  const outline = (w = 1, col = 'rgba(0,0,0,0.55)') => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
  // 主題裝飾（畫在圖示右下角的小徽記）
  const motif = () => {
    if (th === 'fire') { glow(T.glow, 5); ctx.fillStyle = T.light; ctx.beginPath(); ctx.moveTo(26, 30); ctx.quadraticCurveTo(21, 26, 25, 20); ctx.quadraticCurveTo(25, 24, 28, 23); ctx.quadraticCurveTo(31, 27, 26, 30); ctx.fill(); noGlow(); }
    else if (th === 'ice') { ctx.strokeStyle = T.light; ctx.lineWidth = 1.1; glow(T.glow, 4); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(26 + Math.cos(a) * 4, 26 + Math.sin(a) * 4); ctx.lineTo(26 - Math.cos(a) * 4, 26 - Math.sin(a) * 4); ctx.stroke(); } noGlow(); }
    else if (th === 'moon') { glow(T.glow, 5); ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(26, 26, 4, 0, 7); ctx.fill(); ctx.fillStyle = T.dark; ctx.beginPath(); ctx.arc(27.6, 24.8, 3.4, 0, 7); ctx.fill(); noGlow(); }
    else if (th === 'royal') { ctx.fillStyle = T.light; ctx.beginPath(); ctx.moveTo(22, 29); ctx.lineTo(22, 24); ctx.lineTo(24, 26); ctx.lineTo(26, 22.5); ctx.lineTo(28, 26); ctx.lineTo(30, 24); ctx.lineTo(30, 29); ctx.closePath(); ctx.fill(); outline(0.6); }
  };
  // ---------- 刀劍 ----------
  const blade = (L, w, opts = {}) => {
    ctx.save(); ctx.translate(16, 16); ctx.rotate(-Math.PI / 4);
    const bladeCol = th === 'steel' || th === 'leather' || th === 'cloth' ? c : T.main;
    // 劍身
    ctx.fillStyle = metal(-w, w, th === 'fire' || th === 'moon' || th === 'dark' ? shade(bladeCol, 0.1) : '#d8dee6');
    glow(T.glow && th !== 'steel' ? T.glow : null, 4);
    ctx.beginPath(); ctx.moveTo(-w, 4); ctx.lineTo(-w * (opts.wavy ? 1.2 : 1), -L * 0.5); ctx.lineTo(-w * 0.9, -L + 2); ctx.lineTo(0, -L - 3); ctx.lineTo(w * 0.9, -L + 2); ctx.lineTo(w * (opts.wavy ? 1.2 : 1), -L * 0.5); ctx.lineTo(w, 4); ctx.closePath(); ctx.fill(); noGlow(); outline(0.7);
    // 血槽與主題紋路
    ctx.strokeStyle = th === 'fire' ? T.accent : th === 'ice' ? T.light : th === 'moon' ? T.light : 'rgba(80,90,100,0.7)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -L + 4); ctx.stroke();
    if (th === 'fire') { ctx.fillStyle = T.accent; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-w + 0.5, -3 - k * 5); ctx.quadraticCurveTo(0, -6 - k * 5, -w + 0.5, -8 - k * 5); ctx.fill(); } }
    if (th === 'ice') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 3; k++) ctx.fillRect(-w * 0.6, -4 - k * 5, 1.2, 1.2); }
    // 護手
    const gc = th === 'steel' || th === 'leather' ? '#c9a33a' : T.accent === '#ffffff' ? '#a8c8e0' : shade(T.main, 0.2);
    ctx.fillStyle = metal(-w - 4, w + 4, gc);
    ctx.beginPath(); ctx.moveTo(-w - 4, 4); ctx.quadraticCurveTo(0, 2, w + 4, 4); ctx.lineTo(w + 3.5, 6.5); ctx.quadraticCurveTo(0, 5.5, -w - 3.5, 6.5); ctx.closePath(); ctx.fill(); outline(0.6);
    if (opts.wings) { ctx.beginPath(); ctx.moveTo(w + 3, 4); ctx.quadraticCurveTo(w + 7, 0, w + 6, -3); ctx.lineTo(w + 3, 2); ctx.moveTo(-w - 3, 4); ctx.quadraticCurveTo(-w - 7, 0, -w - 6, -3); ctx.lineTo(-w - 3, 2); ctx.fill(); }
    // 握柄（纏帶）與劍首寶石
    ctx.fillStyle = th === 'moon' || th === 'dark' ? '#2a1a3a' : '#5a3418'; ctx.fillRect(-1.4, 6.5, 2.8, opts.long ? 9 : 6.5);
    ctx.strokeStyle = 'rgba(255,230,180,0.35)'; ctx.lineWidth = 0.6; for (let k = 0; k < (opts.long ? 4 : 3); k++) { ctx.beginPath(); ctx.moveTo(-1.4, 7.5 + k * 2); ctx.lineTo(1.4, 8.5 + k * 2); ctx.stroke(); }
    gem(0, (opts.long ? 16.5 : 14) , 1.9, th === 'steel' || th === 'leather' ? '#c03030' : T.glow || T.accent);
    ctx.restore();
  };
  // 法杖頭的裝飾
  const staffHead = () => {
    const col = th === 'steel' || th === 'leather' ? (id === 'oak_staff' ? '#7ad070' : id === 'star_staff' ? '#ffe070' : '#7ad0ff') : T.glow;
    if (th === 'fire') { glow(T.glow, 8); ctx.fillStyle = T.light; ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(6, -14, 3, -9); ctx.quadraticCurveTo(0, -12, -3, -9); ctx.quadraticCurveTo(-6, -14, 0, -20); ctx.fill(); noGlow(); }
    else if (th === 'moon') { glow(T.glow, 8); ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(0, -13, 5, 0, 7); ctx.fill(); ctx.fillStyle = shade(T.dark, 0.2); ctx.beginPath(); ctx.arc(2, -14.5, 4.2, 0, 7); ctx.fill(); noGlow(); gem(-2.5, -11.5, 1.4, T.glow); }
    else if (th === 'ice') { glow(T.glow, 7); ctx.fillStyle = T.light; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(3.5, -13); ctx.lineTo(0, -8); ctx.lineTo(-3.5, -13); ctx.closePath(); ctx.fill(); noGlow(); }
    else gem(0, -13, 3.8, col);
    // 杖頭的爪架
    ctx.strokeStyle = th === 'nature' || id === 'oak_staff' ? '#5a7a2a' : '#c9a33a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-3.5, -8); ctx.quadraticCurveTo(-5, -12, -2.5, -16); ctx.moveTo(3.5, -8); ctx.quadraticCurveTo(5, -12, 2.5, -16); ctx.stroke();
  };
  switch (it.icon) {
    case 'potion': {
      ctx.fillStyle = 'rgba(220,230,240,0.35)'; ctx.fillRect(13, 4, 6, 8); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.strokeRect(13, 4, 6, 8);
      ctx.fillStyle = '#7a5434'; ctx.fillRect(12.5, 2, 7, 4); ctx.fillStyle = '#9a7450'; ctx.fillRect(12.5, 2, 7, 1.2);
      const gr = ctx.createRadialGradient(13, 17, 1, 16, 20, 10); gr.addColorStop(0, shade(c, 0.5)); gr.addColorStop(1, shade(c, -0.3));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(16, 20, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(8, 19, 16, 1.5);
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.ellipse(12.5, 16.5, 2, 3, -0.5, 0, 7); ctx.fill();
      if (id === 'hot_cocoa') { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; for (const sx of [13, 17]) { ctx.beginPath(); ctx.moveTo(sx, 3); ctx.quadraticCurveTo(sx + 2, 0, sx, -2); ctx.stroke(); } }
      break;
    }
    case 'scroll': {
      ctx.fillStyle = shade(c, 0.15); ctx.fillRect(7, 8, 18, 16);
      const rl = (rx) => { const g = ctx.createLinearGradient(rx - 3, 0, rx + 3, 0); g.addColorStop(0, shade(c, -0.45)); g.addColorStop(0.5, shade(c, 0.1)); g.addColorStop(1, shade(c, -0.45)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(rx, 16, 3, 8.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(rx - 1, 6.5, 2, 2); ctx.fillRect(rx - 1, 23.5, 2, 2); };
      rl(7); rl(25);
      ctx.strokeStyle = 'rgba(80,40,20,0.6)'; ctx.lineWidth = 0.9; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(11, 11.5 + i * 3.5); ctx.lineTo(21, 11.5 + i * 3.5); ctx.stroke(); }
      ctx.fillStyle = it.cursed ? '#7a20b0' : /^b/.test(id) ? '#ffd040' : '#b02020'; glow(/^b/.test(id) ? '#ffd040' : null, 4); ctx.beginPath(); ctx.arc(16, 23, 3, 0, 7); ctx.fill(); noGlow();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(15, 22, 1, 1);
      break;
    }
    case 'book': {
      ctx.fillStyle = '#3a1a24'; ctx.fillRect(8, 5, 18, 23); ctx.fillStyle = '#efe4c8'; ctx.fillRect(10, 6.5, 15, 20);
      const g = ctx.createLinearGradient(7, 0, 23, 0); g.addColorStop(0, '#4a2030'); g.addColorStop(0.5, '#7a3848'); g.addColorStop(1, '#4a2030');
      ctx.fillStyle = g; ctx.fillRect(7, 5, 16, 21); ctx.fillStyle = '#c9a33a'; ctx.fillRect(7, 5, 2, 21); ctx.fillRect(7, 5, 16, 1.5); ctx.fillRect(7, 24.5, 16, 1.5);
      ctx.save(); ctx.translate(15, 15.5); ctx.scale(0.36, 0.36); ctx.translate(-16, -16);
      if (typeof drawSpellIcon === 'function' && SPELLS[it.spell]) drawSpellIcon(ctx, it.spell, 0, 0, 32); ctx.restore();
      break;
    }
    case 'dagger': blade(8, 1.8); break;
    case 'sword': blade(12, 2.1, { wings: th === 'fire' || th === 'royal' || th === 'moon' }); break;
    case 'claymore': blade(15, 2.8, { long: true, wings: th !== 'steel' }); break;
    case 'axe': ctx.save(); ctx.translate(16, 16); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#5a3418'; ctx.fillRect(-1.6, -14, 3.2, 29); ctx.fillStyle = '#c9a33a'; ctx.fillRect(-2, 10, 4, 2);
      ctx.fillStyle = metal(0, 12, th === 'steel' ? c : T.main);
      ctx.beginPath(); ctx.moveTo(1.5, -13); ctx.quadraticCurveTo(13, -14, 12.5, -3); ctx.quadraticCurveTo(8, -6, 1.5, -4); ctx.closePath(); ctx.fill(); outline(0.7);
      if (/great|war|battle|claymore/.test(id) || it.twoHand) { ctx.beginPath(); ctx.moveTo(-1.5, -13); ctx.quadraticCurveTo(-11, -13, -10.5, -4); ctx.quadraticCurveTo(-7, -6, -1.5, -5); ctx.closePath(); ctx.fill(); outline(0.7); }
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(12, -12); ctx.quadraticCurveTo(13, -8, 12, -4); ctx.stroke();
      ctx.restore(); break;
    case 'spear': ctx.save(); ctx.translate(16, 16); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#6a4424'; ctx.fillRect(-1.1, -9, 2.2, 25);
      ctx.fillStyle = th === 'steel' ? '#c03030' : T.accent; ctx.beginPath(); ctx.moveTo(-1, -9); ctx.lineTo(-4, -4); ctx.lineTo(-1, -6); ctx.moveTo(1, -9); ctx.lineTo(4, -4); ctx.lineTo(1, -6); ctx.fill();
      ctx.fillStyle = metal(-3, 3, th === 'steel' ? c : T.main); ctx.beginPath(); ctx.moveTo(-3.2, -9); ctx.lineTo(0, -19); ctx.lineTo(3.2, -9); ctx.lineTo(0, -10.5); ctx.closePath(); ctx.fill(); outline(0.6);
      ctx.restore(); break;
    case 'mace': ctx.save(); ctx.translate(16, 16); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#5a3418'; ctx.fillRect(-1.5, -3, 3, 18); ctx.fillStyle = '#c9a33a'; ctx.fillRect(-2.2, 11, 4.4, 2.5);
      const mc = th === 'steel' ? c : T.main;
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.fillStyle = shade(mc, -0.25); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 3, -8 + Math.sin(a) * 3); ctx.lineTo(Math.cos(a + 0.25) * 8.5, -8 + Math.sin(a + 0.25) * 8.5); ctx.lineTo(Math.cos(a + 0.5) * 3, -8 + Math.sin(a + 0.5) * 3); ctx.fill(); }
      const mg = ctx.createRadialGradient(-2, -10, 0.5, 0, -8, 6); mg.addColorStop(0, shade(mc, 0.6)); mg.addColorStop(1, shade(mc, -0.3));
      ctx.fillStyle = mg; glow(th === 'holy' || th === 'fire' ? T.glow : null, 5); ctx.beginPath(); ctx.arc(0, -8, 5, 0, 7); ctx.fill(); noGlow(); outline(0.6);
      ctx.restore(); break;
    case 'staff': ctx.save(); ctx.translate(16, 16); ctx.rotate(-Math.PI / 4);
      const sg = ctx.createLinearGradient(-1.5, 0, 1.5, 0); sg.addColorStop(0, '#4a2e14'); sg.addColorStop(0.5, '#8a6034'); sg.addColorStop(1, '#3a2410');
      ctx.fillStyle = sg; ctx.fillRect(-1.4, -9, 2.8, 25);
      ctx.fillStyle = '#c9a33a'; ctx.fillRect(-1.9, -1, 3.8, 1.6); ctx.fillRect(-1.9, 13, 3.8, 1.6);
      staffHead();
      ctx.restore(); break;
    case 'bow': {
      const bc = th === 'steel' || th === 'leather' ? '#8a5a2a' : th === 'nature' ? '#6a4a1a' : T.main;
      ctx.strokeStyle = shade(bc, -0.4); ctx.lineWidth = 3.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(9, 3); ctx.quadraticCurveTo(15, 6, 17, 12); ctx.moveTo(9, 29); ctx.quadraticCurveTo(15, 26, 17, 20); ctx.stroke();
      ctx.strokeStyle = bc; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(9, 3); ctx.quadraticCurveTo(15, 6, 17, 12); ctx.lineTo(17.5, 20); ctx.moveTo(9, 29); ctx.quadraticCurveTo(15, 26, 17, 20); ctx.stroke();
      // 反曲的弓臂末端
      ctx.beginPath(); ctx.moveTo(9, 3); ctx.quadraticCurveTo(6, 3, 6.5, 5.5); ctx.moveTo(9, 29); ctx.quadraticCurveTo(6, 29, 6.5, 26.5); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#5a3418'; ctx.fillRect(16, 13.5, 3, 5); ctx.fillStyle = '#c9a33a'; ctx.fillRect(16, 13, 3, 0.8); ctx.fillRect(16, 18.5, 3, 0.8);
      ctx.strokeStyle = 'rgba(240,240,230,0.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(6.8, 5); ctx.lineTo(6.8, 27); ctx.stroke();
      // 搭在弦上的箭
      ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6.8, 16); ctx.lineTo(27, 16); ctx.stroke();
      ctx.fillStyle = th === 'fire' ? T.light : th === 'ice' ? T.light : '#c8ccd2'; glow(T.glow && th !== 'steel' ? T.glow : null, 4);
      ctx.beginPath(); ctx.moveTo(30, 16); ctx.lineTo(26, 14); ctx.lineTo(26, 18); ctx.closePath(); ctx.fill(); noGlow();
      ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.moveTo(7, 16); ctx.lineTo(10, 14); ctx.lineTo(11, 16); ctx.lineTo(10, 18); ctx.closePath(); ctx.fill();
      break;
    }
    case 'arrow':
      for (const o of [-3.5, 0, 3.5]) {
        ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(6 + o, 27); ctx.lineTo(24 + o, 9); ctx.stroke();
        ctx.fillStyle = id === 'silver_arrow' ? '#f4f8ff' : '#9aa0a8'; glow(id === 'silver_arrow' ? '#c0d8ff' : null, 3); ctx.beginPath(); ctx.moveTo(27 + o, 6); ctx.lineTo(22 + o, 9); ctx.lineTo(24 + o, 11); ctx.closePath(); ctx.fill(); noGlow();
        ctx.fillStyle = id === 'silver_arrow' ? '#e8f0ff' : '#e0d0b0'; ctx.beginPath(); ctx.moveTo(6 + o, 27); ctx.lineTo(5 + o, 23); ctx.lineTo(8 + o, 25); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(6 + o, 27); ctx.lineTo(10 + o, 28); ctx.lineTo(8 + o, 25); ctx.closePath(); ctx.fill();
      }
      break;
    case 'helm': {
      if (id === 'wizard_hat' || /hood/.test(id)) {
        const hc = id === 'wizard_hat' ? '#3a2a6a' : id === 'sage_hood' ? '#4a3a6a' : id === 'ranger_hood' ? '#2e4a22' : (th === 'steel' ? c : T.main);
        if (id === 'wizard_hat') { ctx.fillStyle = shade(hc, -0.2); ctx.beginPath(); ctx.ellipse(16, 25, 13, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(8, 24); ctx.quadraticCurveTo(14, 14, 16, 3); ctx.quadraticCurveTo(20, 6, 24, 4); ctx.quadraticCurveTo(20, 10, 24, 24); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d0b050'; ctx.fillRect(9, 21, 15, 2.2); ctx.fillStyle = '#ffe070'; ctx.font = 'bold 7px serif'; ctx.fillText('★', 13, 17); }
        else { ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(6, 28); ctx.quadraticCurveTo(5, 6, 16, 4); ctx.quadraticCurveTo(27, 6, 26, 28); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#120c08'; ctx.beginPath(); ctx.ellipse(16, 18, 6.5, 8, 0, 0, 7); ctx.fill(); ctx.strokeStyle = shade(hc, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(16, 9); ctx.stroke(); }
        break;
      }
      if (/crown/.test(id)) {
        glow(T.glow, 6); ctx.fillStyle = metal(5, 27, th === 'ice' ? '#b8e0f8' : '#e0b840');
        ctx.beginPath(); ctx.moveTo(5, 25); ctx.lineTo(5, 12); ctx.lineTo(10, 18); ctx.lineTo(16, 7); ctx.lineTo(22, 18); ctx.lineTo(27, 12); ctx.lineTo(27, 25); ctx.closePath(); ctx.fill(); noGlow(); outline(0.7);
        if (th === 'ice') { ctx.fillStyle = T.light; for (const [px, py] of [[5, 12], [16, 7], [27, 12]]) { ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 1.5, py); ctx.lineTo(px - 1.5, py); ctx.fill(); } }
        gem(16, 20, 2.4, th === 'ice' ? '#60c0ff' : '#e03040'); gem(10, 21.5, 1.4, '#40a0ff'); gem(22, 21.5, 1.4, '#40a0ff');
        break;
      }
      const hc = th === 'steel' ? (id === 'iron_helm' ? '#a8b0bc' : c) : T.main;
      ctx.fillStyle = metal(6, 26, hc);
      ctx.beginPath(); ctx.moveTo(6, 24); ctx.quadraticCurveTo(5, 6, 16, 4); ctx.quadraticCurveTo(27, 6, 26, 24); ctx.lineTo(22, 27); ctx.lineTo(10, 27); ctx.closePath(); ctx.fill(); outline(0.8);
      // 護鼻與眼縫
      ctx.fillStyle = 'rgba(10,8,6,0.85)'; ctx.fillRect(8.5, 14, 6, 2); ctx.fillRect(17.5, 14, 6, 2);
      ctx.fillStyle = shade(hc, 0.3); ctx.fillRect(15, 10, 2, 14);
      ctx.fillStyle = shade(hc, -0.3); for (const rx of [8, 24]) { ctx.beginPath(); ctx.arc(rx, 21, 0.9, 0, 7); ctx.fill(); }
      // 頭飾：角、龍角、冠羽
      if (/horn|dragon/.test(id)) { ctx.fillStyle = th === 'fire' ? '#e8d8b0' : '#d8d0b8'; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(16 + sgn * 7, 9); ctx.quadraticCurveTo(16 + sgn * 15, 6, 16 + sgn * 13, -1); ctx.quadraticCurveTo(16 + sgn * 11, 5, 16 + sgn * 5, 6); ctx.closePath(); ctx.fill(); } }
      else if (th !== 'steel' && th !== 'leather') { ctx.fillStyle = T.accent; ctx.beginPath(); ctx.moveTo(16, 4); ctx.quadraticCurveTo(22, -1, 26, 3); ctx.quadraticCurveTo(21, 2, 17, 7); ctx.fill(); }
      motif();
      break;
    }
    case 'armor': {
      const ac = th === 'steel' || th === 'leather' || th === 'cloth' ? c : T.main;
      if (/robe/.test(id) || it.mr > it.ac * 2 && !it.cls?.includes?.('knight')) {
        // 長袍：兜帽領口、腰帶、衣襬滾邊
        ctx.fillStyle = metal(6, 26, ac);
        ctx.beginPath(); ctx.moveTo(11, 4); ctx.lineTo(21, 4); ctx.lineTo(26, 10); ctx.lineTo(25, 29); ctx.lineTo(7, 29); ctx.lineTo(6, 10); ctx.closePath(); ctx.fill(); outline(0.8);
        ctx.fillStyle = shade(ac, -0.35); ctx.beginPath(); ctx.moveTo(11, 4); ctx.lineTo(16, 11); ctx.lineTo(21, 4); ctx.closePath(); ctx.fill();
        const trim = th === 'steel' || th === 'cloth' ? '#d0b050' : T.accent;
        ctx.fillStyle = trim; ctx.fillRect(15, 11, 2, 18); ctx.fillRect(7, 27, 18, 2); ctx.fillRect(7, 16, 18, 2);
        gem(16, 17, 1.5, th === 'fire' ? '#ff6020' : th === 'moon' ? '#c080ff' : '#40a0ff');
        motif(); break;
      }
      // 鎧甲：胸甲、肩甲、腰甲、鉚釘
      const leather = th === 'leather' || /leather|studded|drake|hide/.test(id);
      ctx.fillStyle = metal(7, 25, ac);
      ctx.beginPath(); ctx.moveTo(10, 6); ctx.lineTo(22, 6); ctx.lineTo(24, 12); ctx.lineTo(23, 26); ctx.lineTo(16, 29); ctx.lineTo(9, 26); ctx.lineTo(8, 12); ctx.closePath(); ctx.fill(); outline(0.8);
      // 肩甲
      ctx.fillStyle = metal(3, 11, shade(ac, 0.1)); ctx.beginPath(); ctx.ellipse(7.5, 9.5, 5, 3.8, -0.4, 0, 7); ctx.fill(); outline(0.6);
      ctx.fillStyle = metal(21, 29, shade(ac, 0.1)); ctx.beginPath(); ctx.ellipse(24.5, 9.5, 5, 3.8, 0.4, 0, 7); ctx.fill(); outline(0.6);
      // 領口
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(12, 6); ctx.quadraticCurveTo(16, 10, 20, 6); ctx.closePath(); ctx.fill();
      if (leather) {
        ctx.strokeStyle = 'rgba(255,220,170,0.5)'; ctx.setLineDash([1.2, 1.2]); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(16, 9); ctx.lineTo(16, 27); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 0.8; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(14.5, 11 + k * 3.5); ctx.lineTo(17.5, 12.5 + k * 3.5); ctx.moveTo(17.5, 11 + k * 3.5); ctx.lineTo(14.5, 12.5 + k * 3.5); ctx.stroke(); }
        if (/studded/.test(id)) { ctx.fillStyle = '#d8d0c0'; for (let k = 0; k < 4; k++) for (const sx of [11, 21]) { ctx.beginPath(); ctx.arc(sx, 11 + k * 4, 0.9, 0, 7); ctx.fill(); } }
      } else {
        // 金屬板分段
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; for (const yy of [18, 22]) { ctx.beginPath(); ctx.moveTo(9, yy); ctx.quadraticCurveTo(16, yy + 2, 23, yy); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(16, 17); ctx.stroke();
        ctx.fillStyle = shade(ac, -0.4); for (const [rx, ry] of [[10, 11], [22, 11], [10, 25], [22, 25]]) { ctx.beginPath(); ctx.arc(rx, ry, 0.8, 0, 7); ctx.fill(); }
        if (/chain|mail/.test(id) && th === 'steel') { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.5; for (let yy = 9; yy < 26; yy += 2) for (let xx = 10; xx < 23; xx += 2) { ctx.beginPath(); ctx.arc(xx + (yy % 4 ? 1 : 0), yy, 0.8, 0, 7); ctx.stroke(); } }
        // 系列的胸前裝飾
        if (th === 'fire') { ctx.fillStyle = shade(T.main, -0.25); for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(12 + j * 4, 12 + k * 4 + (j % 2) * 2, 1.8, 0, Math.PI); ctx.fill(); } }
        else if (th === 'ice' || th === 'moon' || th === 'holy' || th === 'royal') gem(16, 12.5, 2.2, T.glow || T.accent);
      }
      motif(); break;
    }
    case 'cloak': {
      const cc = th === 'steel' ? c : T.main;
      const g = ctx.createLinearGradient(5, 0, 27, 0); g.addColorStop(0, shade(cc, -0.4)); g.addColorStop(0.5, shade(cc, 0.15)); g.addColorStop(1, shade(cc, -0.45));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(11, 5); ctx.lineTo(21, 5); ctx.quadraticCurveTo(26, 14, 28, 29); ctx.lineTo(23, 27); ctx.lineTo(19, 29); ctx.lineTo(13, 27); ctx.lineTo(9, 29); ctx.lineTo(4, 29); ctx.quadraticCurveTo(6, 14, 11, 5); ctx.closePath(); ctx.fill(); outline(0.8);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.9; for (const fx of [11, 16, 21]) { ctx.beginPath(); ctx.moveTo(fx, 9); ctx.quadraticCurveTo(fx + 1, 20, fx - 0.5, 28); ctx.stroke(); }
      // 內襯與領扣
      ctx.fillStyle = shade(cc, -0.55); ctx.beginPath(); ctx.moveTo(11, 5); ctx.quadraticCurveTo(16, 9, 21, 5); ctx.lineTo(19, 4); ctx.lineTo(13, 4); ctx.closePath(); ctx.fill();
      if (/fur|yeti/.test(id)) { ctx.fillStyle = '#eef2f6'; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(10 + k * 2, 5.5 + Math.sin(k) * 0.6, 2, 0, 7); ctx.fill(); } }
      if (/wing|dragon/.test(id)) { ctx.strokeStyle = shade(cc, 0.35); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(6, 27); ctx.lineTo(14, 9); ctx.lineTo(26, 27); ctx.moveTo(14, 9); ctx.lineTo(16, 28); ctx.stroke(); }
      gem(16, 7, 2, th === 'steel' ? '#d0b050' : T.glow || T.accent);
      motif(); break;
    }
    case 'shield': {
      const sc = th === 'steel' ? c : T.main;
      const tower = /tower/.test(id), round = /buckler|round/.test(id);
      ctx.fillStyle = metal(5, 27, sc);
      ctx.beginPath();
      if (round) ctx.arc(16, 16, 12, 0, 7);
      else if (tower) { ctx.moveTo(6, 4); ctx.lineTo(26, 4); ctx.lineTo(26, 24); ctx.lineTo(16, 30); ctx.lineTo(6, 24); ctx.closePath(); }
      else { ctx.moveTo(6, 4); ctx.lineTo(26, 4); ctx.lineTo(26, 15); ctx.quadraticCurveTo(25, 25, 16, 30); ctx.quadraticCurveTo(7, 25, 6, 15); ctx.closePath(); }
      ctx.fill(); ctx.strokeStyle = th === 'steel' || th === 'leather' ? '#d0b050' : shade(T.accent, -0.1); ctx.lineWidth = 1.8; ctx.stroke();
      // 盾面紋章
      ctx.fillStyle = th === 'fire' ? T.light : th === 'ice' ? T.light : th === 'moon' ? T.accent : th === 'holy' || th === 'royal' ? T.accent : '#d0b050';
      if (th === 'fire') { ctx.beginPath(); ctx.moveTo(16, 8); ctx.quadraticCurveTo(23, 14, 19, 22); ctx.quadraticCurveTo(18, 17, 16, 19); ctx.quadraticCurveTo(14, 17, 13, 22); ctx.quadraticCurveTo(9, 14, 16, 8); ctx.fill(); }
      else if (th === 'moon') { ctx.beginPath(); ctx.arc(16, 16, 6, 0, 7); ctx.fill(); ctx.fillStyle = shade(sc, -0.1); ctx.beginPath(); ctx.arc(18.5, 14.5, 5.2, 0, 7); ctx.fill(); }
      else if (th === 'ice') { ctx.strokeStyle = T.light; ctx.lineWidth = 1.4; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(16 + Math.cos(a) * 7, 16 + Math.sin(a) * 7); ctx.lineTo(16 - Math.cos(a) * 7, 16 - Math.sin(a) * 7); ctx.stroke(); } }
      else { ctx.fillRect(14.5, 8, 3, 16); ctx.fillRect(10, 13, 12, 3); }
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(11, 9, 4, 2, -0.4, 0, 7); ctx.fill();
      break;
    }
    case 'gloves': {
      const gc2 = th === 'steel' ? c : T.main;
      ctx.fillStyle = metal(8, 24, gc2);
      ctx.beginPath(); ctx.roundRect(9, 11, 13, 13, 3); ctx.fill(); outline(0.6);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(9.2 + i * 3.3, 4 + Math.abs(i - 1.5), 3, 9, 1.5); ctx.fill(); outline(0.5); }
      ctx.beginPath(); ctx.roundRect(21, 14, 4, 8, 2); ctx.fill(); outline(0.5);
      ctx.fillStyle = shade(gc2, -0.35); ctx.fillRect(8, 23, 15, 6);
      ctx.fillStyle = th === 'steel' || th === 'leather' ? '#c9a33a' : T.accent; ctx.fillRect(8, 23, 15, 1.4);
      if (/claw|dragon/.test(id)) { ctx.fillStyle = '#f0e8d0'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(9.5 + i * 3.3, 4 + Math.abs(i - 1.5)); ctx.lineTo(10.7 + i * 3.3, -0.5 + Math.abs(i - 1.5)); ctx.lineTo(12 + i * 3.3, 4 + Math.abs(i - 1.5)); ctx.fill(); } }
      motif(); break;
    }
    case 'boots': {
      const bc2 = th === 'steel' ? c : T.main;
      ctx.fillStyle = metal(9, 27, bc2);
      ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(19, 4); ctx.lineTo(19, 19); ctx.quadraticCurveTo(27, 20, 28, 25); ctx.lineTo(28, 28); ctx.lineTo(10, 28); ctx.closePath(); ctx.fill(); outline(0.7);
      ctx.fillStyle = shade(bc2, -0.5); ctx.fillRect(10, 26, 18, 2.5);
      ctx.fillStyle = shade(bc2, 0.25); ctx.fillRect(9.5, 4, 10, 3);
      ctx.fillStyle = th === 'steel' || th === 'leather' ? '#c9a33a' : T.accent; ctx.fillRect(11, 13, 8, 1.5); ctx.fillRect(14, 12.5, 2, 2.5);
      if (/snow|fur/.test(id)) { ctx.fillStyle = '#eef2f6'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(10.5 + k * 2.2, 4.5, 1.8, 0, 7); ctx.fill(); } }
      if (th === 'fire' || /cinder|ember/.test(id)) { glow(T.glow, 5); ctx.fillStyle = T.light; ctx.beginPath(); ctx.moveTo(22, 26); ctx.quadraticCurveTo(25, 21, 27, 24); ctx.quadraticCurveTo(26, 26, 22, 26); ctx.fill(); noGlow(); }
      break;
    }
    case 'belt': {
      ctx.fillStyle = metal(3, 29, c.startsWith('#') ? c : '#7a5230'); ctx.fillRect(3, 13, 26, 7); outline(0.5);
      ctx.strokeStyle = 'rgba(255,220,170,0.4)'; ctx.setLineDash([1.2, 1.2]); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(3, 14.5); ctx.lineTo(29, 14.5); ctx.moveTo(3, 18.5); ctx.lineTo(29, 18.5); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#e0c060'; ctx.lineWidth = 2; ctx.strokeRect(12.5, 11.5, 7, 10); ctx.fillStyle = '#e0c060'; ctx.fillRect(15.5, 13, 1.4, 7);
      ctx.fillStyle = '#6a4424'; ctx.beginPath(); ctx.roundRect(22, 19, 6, 7, 1.5); ctx.fill(); ctx.fillStyle = '#c9a33a'; ctx.fillRect(24.5, 21, 1.2, 1.2);
      break;
    }
    case 'ring': {
      const band = th === 'ice' ? '#d0e4f0' : th === 'moon' ? '#b8b0d8' : th === 'dark' ? '#8a8098' : '#e0b840';
      const g = ctx.createLinearGradient(8, 0, 24, 0); g.addColorStop(0, shade(band, -0.4)); g.addColorStop(0.5, shade(band, 0.4)); g.addColorStop(1, shade(band, -0.4));
      ctx.strokeStyle = g; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.ellipse(16, 20, 8, 6.5, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(16, 20, 6.4, 5, 0, 0, 7); ctx.stroke();
      const gc = { ring_str: '#e03030', ring_dex: '#30c060', ring_int: '#4070ff', ring_fire: '#ff8020', ring_guard: '#c0c8d0', summon_ring: '#a050ff' }[id] || (th === 'steel' || th === 'leather' ? '#40a0e0' : T.glow || T.accent);
      // 戒台
      ctx.fillStyle = band; ctx.beginPath(); ctx.moveTo(11, 14); ctx.lineTo(21, 14); ctx.lineTo(19, 10); ctx.lineTo(13, 10); ctx.closePath(); ctx.fill(); outline(0.5);
      // 刻面寶石
      glow(gc, 6); ctx.fillStyle = gc; ctx.beginPath(); ctx.moveTo(16, 3); ctx.lineTo(21, 7.5); ctx.lineTo(19, 11); ctx.lineTo(13, 11); ctx.lineTo(11, 7.5); ctx.closePath(); ctx.fill(); noGlow();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(16, 3.5); ctx.lineTo(18, 7); ctx.lineTo(14, 7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(gc, -0.5); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(11, 7.5); ctx.lineTo(21, 7.5); ctx.stroke();
      if (id === 'summon_ring') { ctx.strokeStyle = 'rgba(200,160,255,0.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(16, 20, 10.5, 0, 7); ctx.stroke(); }
      break;
    }
    case 'amulet': {
      ctx.strokeStyle = '#d8b040'; ctx.lineWidth = 1.2; ctx.setLineDash([1.6, 1]);
      ctx.beginPath(); ctx.arc(16, 9, 11, 0.15, Math.PI - 0.15); ctx.stroke(); ctx.setLineDash([]);
      const gc = { amulet_wis: '#6080ff', amulet_guard: '#e0e0f0', amulet_earth: '#60a040' }[id] || (th === 'steel' ? '#40a0e0' : T.glow || T.accent);
      if (th === 'moon') { glow(T.glow, 7); ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(16, 22, 6.5, 0, 7); ctx.fill(); ctx.fillStyle = '#1a1028'; ctx.beginPath(); ctx.arc(18.8, 20.5, 5.6, 0, 7); ctx.fill(); noGlow(); gem(13.5, 22, 1.4, '#c0a0ff'); }
      else if (th === 'fire' || /heart/.test(id)) { glow(T.glow || '#ff4040', 7); const hc = th === 'fire' ? '#e03020' : gc; ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(16, 29); ctx.bezierCurveTo(6, 22, 9, 14, 13.5, 16); ctx.quadraticCurveTo(16, 17, 16, 19); ctx.quadraticCurveTo(16, 17, 18.5, 16); ctx.bezierCurveTo(23, 14, 26, 22, 16, 29); ctx.fill(); noGlow(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(12.5, 19.5, 1.5, 2.2, -0.5, 0, 7); ctx.fill(); }
      else {
        ctx.fillStyle = '#c9a33a'; ctx.beginPath(); ctx.moveTo(16, 15); ctx.lineTo(23, 21); ctx.lineTo(16, 29); ctx.lineTo(9, 21); ctx.closePath(); ctx.fill(); outline(0.6);
        gem(16, 21.5, 3.6, gc);
      }
      break;
    }
    case 'jerky':
      ctx.fillStyle = '#7a3a1a'; ctx.beginPath(); ctx.moveTo(6, 20); ctx.quadraticCurveTo(10, 8, 22, 7); ctx.quadraticCurveTo(28, 12, 24, 20); ctx.quadraticCurveTo(14, 28, 6, 20); ctx.fill(); outline(0.6);
      ctx.strokeStyle = '#a85a30'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 4, 18); ctx.lineTo(14 + i * 4, 11); ctx.stroke(); }
      break;
    case 'collar':
      ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(16, 15, 10, 7, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#b05a40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(16, 15, 10, 7, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = '#d8b040'; ctx.beginPath(); ctx.arc(16, 24, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#8a6a10'; ctx.font = 'bold 5px sans-serif'; ctx.fillText('♥', 14, 26);
      ctx.fillStyle = '#c0c8d0'; for (const a of [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]) ctx.fillRect(16 + Math.cos(a) * 10 - 1, 15 + Math.sin(a) * 7 - 1, 2, 2);
      break;
    case 'gold':
      for (const [a, b] of [[11, 21], [21, 22], [16, 15]]) { ctx.fillStyle = '#8a6a10'; ctx.beginPath(); ctx.ellipse(a, b + 1.2, 6, 3.5, 0, 0, 7); ctx.fill(); const g = ctx.createLinearGradient(a - 6, 0, a + 6, 0); g.addColorStop(0, '#c8a020'); g.addColorStop(0.5, '#fff0a0'); g.addColorStop(1, '#c8a020'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(a, b, 6, 3.5, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#a07a10'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(a, b, 4, 2.2, 0, 0, 7); ctx.stroke(); }
      break;
    default: drawMaterialIcon(ctx, id, it, c, th, T, gem, glow, noGlow, outline);
  }
  if (it.rare) { ctx.strokeStyle = 'rgba(200,160,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(1, 1, 30, 30); }
  ctx.restore();
}
// 素材、劇情道具與其他雜物
function drawMaterialIcon(ctx, id, it, c, th, T, gem, glow, noGlow, outline) {
  if (/scale/.test(id)) {   // 鱗片（火龍紅、飛龍綠、海蛇藍）
    const sc = id === 'wyvern_scale' ? ['#b8e070', '#4a8a2a', '#16300a'] : id === 'serpent_scale' ? ['#90e0f0', '#2a7a9a', '#082a3a'] : ['#ff9a60', '#c8401a', '#5a1206'];
    const g = ctx.createRadialGradient(13, 10, 1, 16, 16, 14); g.addColorStop(0, sc[0]); g.addColorStop(0.6, sc[1]); g.addColorStop(1, sc[2]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(16, 3); ctx.quadraticCurveTo(28, 8, 26, 20); ctx.quadraticCurveTo(22, 28, 16, 30); ctx.quadraticCurveTo(10, 28, 6, 20); ctx.quadraticCurveTo(4, 8, 16, 3); ctx.fill(); outline(0.8);
    ctx.strokeStyle = 'rgba(255,200,140,0.6)'; ctx.lineWidth = 0.8; for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.moveTo(16, 6 + k * 2); ctx.quadraticCurveTo(16 + 5 - k, 16, 16, 27 - k); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(12, 10, 3, 1.5, -0.6, 0, 7); ctx.fill();
  } else if (id === 'golem_core' || id === 'iron_core') {   // 岩石／鋼鐵核心：刻著符文的方塊
    const base = id === 'iron_core' ? '#9aa4b0' : '#8a7a62';
    const g = ctx.createLinearGradient(6, 6, 26, 26); g.addColorStop(0, shade(base, 0.4)); g.addColorStop(1, shade(base, -0.5));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(27, 10); ctx.lineTo(27, 22); ctx.lineTo(16, 28); ctx.lineTo(5, 22); ctx.lineTo(5, 10); ctx.closePath(); ctx.fill(); outline(0.8);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(5, 10); ctx.lineTo(16, 16); ctx.lineTo(27, 10); ctx.moveTo(16, 16); ctx.lineTo(16, 28); ctx.stroke();
    glow(id === 'iron_core' ? '#60c0ff' : '#ffb040', 6); ctx.fillStyle = id === 'iron_core' ? '#a0e0ff' : '#ffd080'; ctx.beginPath(); ctx.arc(16, 16, 2.6, 0, 7); ctx.fill(); noGlow();
  } else if (/core|magma/.test(id)) {   // 熔岩核心
    glow('#ff6010', 8); const g = ctx.createRadialGradient(14, 13, 1, 16, 16, 12); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.4, '#ff8020'); g.addColorStop(1, '#3a1408');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(16, 16, 11, 0, 7); ctx.fill(); noGlow();
    ctx.strokeStyle = '#2a0a04'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, 12); ctx.lineTo(13, 16); ctx.lineTo(11, 22); ctx.moveTo(18, 7); ctx.lineTo(19, 14); ctx.lineTo(25, 18); ctx.stroke();
  } else if (/obsidian/.test(id)) {   // 黑曜石
    ctx.fillStyle = '#1a1620'; ctx.beginPath(); ctx.moveTo(14, 3); ctx.lineTo(25, 12); ctx.lineTo(22, 28); ctx.lineTo(9, 26); ctx.lineTo(6, 13); ctx.closePath(); ctx.fill(); outline(0.6, 'rgba(160,140,200,0.6)');
    ctx.fillStyle = 'rgba(180,160,230,0.5)'; ctx.beginPath(); ctx.moveTo(14, 3); ctx.lineTo(17, 15); ctx.lineTo(6, 13); ctx.closePath(); ctx.fill();
  } else if (/sulfur/.test(id)) {
    for (const [x, y, r] of [[11, 20, 6], [20, 18, 5], [16, 12, 4.5]]) { ctx.fillStyle = '#d8c020'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,200,0.6)'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.5, y); ctx.lineTo(x - r * 0.3, y); ctx.closePath(); ctx.fill(); }
  } else if (/ice_crystal|crystal/.test(id)) {   // 冰晶
    glow('#9ae0ff', 6); ctx.fillStyle = '#c8ecff';
    for (const [x, h, w, a] of [[12, 18, 4, -0.3], [21, 15, 3.5, 0.35], [16, 24, 5, 0]]) { ctx.save(); ctx.translate(x, 29); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w * 0.7, -h); ctx.lineTo(0, -h - 4); ctx.lineTo(w * 0.7, -h); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-w * 0.3, -h + 2, 1.2, h - 4); ctx.fillStyle = '#c8ecff'; ctx.restore(); }
    noGlow();
  } else if (/fur|pelt|hide|skin/.test(id)) {   // 毛皮與獸皮
    const fc = { wolf_pelt: ['#7a6a5a', '#4a3e32'], croc_hide: ['#5a7a3a', '#2e4a1a'], lizard_skin: ['#7a9a4a', '#4a6a2a'] }[id] || ['#e8eef4', '#b8c4d0'];
    ctx.fillStyle = fc[0]; ctx.beginPath(); ctx.moveTo(5, 10); ctx.quadraticCurveTo(16, 4, 27, 10); ctx.lineTo(26, 24); ctx.quadraticCurveTo(16, 30, 6, 24); ctx.closePath(); ctx.fill(); outline(0.6);
    ctx.strokeStyle = fc[1]; ctx.lineWidth = 0.8; if (/hide|skin/.test(id)) { ctx.fillStyle = fc[1]; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(10 + (k % 3) * 6 + (k % 2), 12 + Math.floor(k / 3) * 5, 1.8, 0, 7); ctx.fill(); } } else for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(8 + k * 2.4, 12); ctx.quadraticCurveTo(9 + k * 2.4, 18, 7.5 + k * 2.4, 24); ctx.stroke(); }
  } else if (/dust/.test(id)) {   // 月塵（小袋子）
    ctx.fillStyle = '#5a4a7a'; ctx.beginPath(); ctx.moveTo(10, 12); ctx.quadraticCurveTo(5, 28, 16, 28); ctx.quadraticCurveTo(27, 28, 22, 12); ctx.closePath(); ctx.fill(); outline(0.6);
    ctx.fillStyle = '#c9a33a'; ctx.fillRect(10, 10, 12, 2.5);
    glow('#c0a0ff', 6); ctx.fillStyle = '#e8e0ff'; for (const [x, y] of [[13, 6], [17, 4], [20, 7], [15, 8]]) { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, 7); ctx.fill(); } noGlow();
  } else if (id === 'moon_shard') {   // 月之碑碎片
    ctx.fillStyle = '#5a5a6e'; ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(24, 4); ctx.lineTo(27, 16); ctx.lineTo(20, 28); ctx.lineTo(7, 24); ctx.closePath(); ctx.fill(); outline(0.8);
    glow('#a0b8ff', 6); ctx.strokeStyle = '#c8d8ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(16, 15, 5, 0.6, Math.PI * 2 - 0.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(11, 22); ctx.lineTo(20, 22); ctx.stroke(); noGlow();
  } else if (id === 'moon_key') {   // 月之鑰
    glow('#c0a0ff', 7); ctx.fillStyle = '#d8d0ff'; ctx.beginPath(); ctx.arc(10, 10, 6.5, 0, 7); ctx.fill(); ctx.fillStyle = '#3a2a5a'; ctx.beginPath(); ctx.arc(12, 8.5, 5.4, 0, 7); ctx.fill(); noGlow();
    ctx.fillStyle = '#c8c0e8'; ctx.save(); ctx.translate(13, 13); ctx.rotate(Math.PI / 4); ctx.fillRect(0, -1.3, 17, 2.6); ctx.fillRect(12, 0, 2.2, 5); ctx.fillRect(15, 0, 2.2, 3.5); ctx.restore();
  } else if (id === 'goblin_ear') {   // 尖尖的綠色耳朵
    ctx.fillStyle = '#6a9a3a'; ctx.beginPath(); ctx.moveTo(8, 26); ctx.quadraticCurveTo(6, 12, 27, 4); ctx.quadraticCurveTo(22, 16, 18, 27); ctx.closePath(); ctx.fill(); outline(0.7);
    ctx.fillStyle = '#4a7a2a'; ctx.beginPath(); ctx.moveTo(11, 23); ctx.quadraticCurveTo(11, 14, 23, 8); ctx.quadraticCurveTo(19, 17, 16, 24); ctx.closePath(); ctx.fill();
  } else if (id === 'spider_silk') {   // 一捲蜘蛛絲
    ctx.strokeStyle = '#f0f0f8'; ctx.lineWidth = 0.7; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(16, 17, 10 - k * 0.6, 7 - k * 0.4, 0.4 + k * 0.35, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(24, 10); ctx.quadraticCurveTo(28, 6, 29, 2); ctx.stroke();
  } else if (id === 'bark') {   // 樹皮
    ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.moveTo(7, 4); ctx.lineTo(25, 6); ctx.lineTo(27, 28); ctx.lineTo(5, 27); ctx.closePath(); ctx.fill(); outline(0.7);
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1.2; for (const x of [10, 15, 20, 24]) { ctx.beginPath(); ctx.moveTo(x, 6); ctx.quadraticCurveTo(x + 2, 16, x - 1, 27); ctx.stroke(); }
    ctx.fillStyle = '#6a9a3a'; ctx.beginPath(); ctx.ellipse(9, 22, 3, 2, 0, 0, 7); ctx.fill();
  } else if (id === 'ectoplasm') {   // 怨靈精華（瓶中鬼火）
    ctx.fillStyle = 'rgba(200,220,240,0.3)'; ctx.beginPath(); ctx.arc(16, 19, 9, 0, 7); ctx.fill(); ctx.fillRect(13, 5, 6, 7); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(12.5, 3, 7, 3);
    glow('#80ffd0', 8); ctx.fillStyle = '#b0ffe0'; ctx.beginPath(); ctx.moveTo(16, 12); ctx.quadraticCurveTo(22, 18, 18, 25); ctx.quadraticCurveTo(16, 22, 14, 25); ctx.quadraticCurveTo(10, 18, 16, 12); ctx.fill(); noGlow();
    ctx.fillStyle = '#1a3a30'; ctx.fillRect(14, 18, 1.4, 1.4); ctx.fillRect(17, 18, 1.4, 1.4);
  } else if (id === 'mummy_cloth') {   // 一捲繃帶
    ctx.fillStyle = '#d8ccb0'; ctx.beginPath(); ctx.ellipse(12, 16, 7, 9, 0, 0, 7); ctx.fill(); outline(0.6);
    ctx.fillStyle = '#c8b890'; ctx.fillRect(12, 10, 16, 12); ctx.strokeStyle = 'rgba(90,70,40,0.5)'; ctx.lineWidth = 0.6; for (const x of [16, 20, 24]) { ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x + 1, 22); ctx.stroke(); }
    ctx.fillStyle = '#a89870'; ctx.beginPath(); ctx.ellipse(12, 16, 3, 4, 0, 0, 7); ctx.fill();
  } else if (id === 'lich_gem') {   // 冥府寶石
    gem(16, 16, 9, '#8a30d0'); ctx.fillStyle = 'rgba(20,0,30,0.6)'; ctx.beginPath(); ctx.arc(16, 17, 3.5, 0, 7); ctx.fill(); ctx.fillStyle = '#e0ff80'; ctx.beginPath(); ctx.ellipse(16, 17, 1, 2.6, 0, 0, 7); ctx.fill();
  } else if (id === 'pearl') {   // 蚌殼裡的珍珠
    ctx.fillStyle = '#d8a890'; ctx.beginPath(); ctx.moveTo(4, 22); ctx.quadraticCurveTo(16, 33, 28, 22); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, 20); ctx.quadraticCurveTo(16, 2, 28, 20); ctx.closePath(); ctx.fill(); outline(0.6);
    ctx.strokeStyle = 'rgba(120,70,50,0.5)'; ctx.lineWidth = 0.7; for (const x of [10, 16, 22]) { ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(x, 8); ctx.stroke(); }
    const g = ctx.createRadialGradient(14.5, 19, 0.5, 16, 21, 5); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8c0d8'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(16, 21.5, 4.5, 0, 7); ctx.fill();
  } else if (id === 'pirate_coin') {   // 印著骷髏的古金幣
    const g = ctx.createRadialGradient(13, 12, 1, 16, 16, 12); g.addColorStop(0, '#fff0a0'); g.addColorStop(1, '#a07a10'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(16, 16, 11, 0, 7); ctx.fill(); outline(0.8);
    ctx.strokeStyle = '#8a6a10'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(16, 16, 8.5, 0, 7); ctx.stroke();
    ctx.fillStyle = '#6a4a08'; ctx.beginPath(); ctx.arc(16, 15, 4, 0, 7); ctx.fill(); ctx.fillRect(14, 17, 4, 3); ctx.fillStyle = '#e8c850'; ctx.fillRect(14, 14, 1.5, 1.5); ctx.fillRect(16.8, 14, 1.5, 1.5);
  } else if (/fang|tooth|claw|tail/.test(id)) {   // 牙、爪
    const g = ctx.createLinearGradient(10, 6, 20, 28); g.addColorStop(0, '#fffbf0'); g.addColorStop(1, '#c8b890');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(10, 5); ctx.quadraticCurveTo(26, 9, 20, 29); ctx.quadraticCurveTo(15, 17, 10, 5); ctx.fill(); outline(0.7);
    ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.ellipse(11.5, 6.5, 3, 2, 0.6, 0, 7); ctx.fill();
  } else if (/bone|skull/.test(id)) {
    ctx.strokeStyle = '#e8e3d0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(9, 23); ctx.lineTo(23, 9); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#e8e3d0'; for (const [x, y] of [[7, 22], [10, 25], [22, 7], [25, 10]]) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }
  } else if (/feast|bowl|meat/.test(id)) {   // 寵物大餐
    ctx.fillStyle = '#8a4a2a'; ctx.beginPath(); ctx.ellipse(16, 20, 12, 7, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#a85a30'; ctx.beginPath(); ctx.ellipse(16, 20, 12, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c84a30'; ctx.beginPath(); ctx.ellipse(13, 16, 6, 4, -0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#f0e8d8'; ctx.fillRect(17, 12, 7, 2.5); ctx.beginPath(); ctx.arc(24.5, 13.2, 2, 0, 7); ctx.fill();
  } else if (/essence|soul|spirit/.test(id)) {   // 精華（發光的球）
    glow('#a0c8ff', 8); const g = ctx.createRadialGradient(15, 14, 1, 16, 16, 10); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#a8c8ff'); g.addColorStop(1, 'rgba(80,120,220,0.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(16, 16, 10, 0, 7); ctx.fill(); noGlow();
  } else {   // 其他戰利品：小布袋
    const g = ctx.createRadialGradient(13, 14, 1, 16, 18, 12); g.addColorStop(0, '#c8a070'); g.addColorStop(1, '#6a4a28');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(11, 11); ctx.quadraticCurveTo(4, 29, 16, 29); ctx.quadraticCurveTo(28, 29, 21, 11); ctx.closePath(); ctx.fill(); outline(0.7);
    ctx.fillStyle = '#8a6a40'; ctx.beginPath(); ctx.moveTo(11, 11); ctx.lineTo(9, 6); ctx.lineTo(16, 9); ctx.lineTo(23, 6); ctx.lineTo(21, 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c9a33a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(11, 11); ctx.lineTo(21, 11); ctx.stroke();
    const cc = c && c.startsWith && c.startsWith('#') ? c : '#d8c8a0'; ctx.fillStyle = cc; ctx.beginPath(); ctx.arc(16, 20, 3, 0, 7); ctx.fill();
  }
}

// ===== 高階魔法圖騰（v2.19，取代原本的文字符文）=====
// 每個函式在 32×32 的座標系中作畫，外框與系別底色由 drawSpellIcon 負責。
const SPELL_ART = {
  firestorm(ctx, glow) {   // 火焰龍捲
    glow('#ff6020', 8);
    for (let i = 0; i < 5; i++) {
      const y = 6 + i * 4.6, w = 12 - i * 2;
      const g = ctx.createLinearGradient(16 - w, 0, 16 + w, 0); g.addColorStop(0, '#a01800'); g.addColorStop(0.5, i < 2 ? '#fff0a0' : '#ffa030'); g.addColorStop(1, '#a01800');
      ctx.strokeStyle = g; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.ellipse(16 + Math.sin(i * 1.3) * 2, y, w, 2.4, 0, 0.2, Math.PI * 2 - 0.6); ctx.stroke();
    }
    ctx.fillStyle = '#ffd060'; for (const [x, y] of [[5, 12], [27, 9], [25, 22], [7, 24]]) { ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.quadraticCurveTo(x - 2, y, x, y - 3); ctx.quadraticCurveTo(x + 2, y, x, y + 3); ctx.fill(); }
  },
  manashield(ctx, glow) {   // 魔力泡泡護盾
    glow('#60b0ff', 10);
    const g = ctx.createRadialGradient(12, 11, 1, 16, 16, 13); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(120,190,255,0.45)'); g.addColorStop(1, 'rgba(40,90,220,0.8)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(16, 16, 12, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#d8ecff'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(16 + Math.cos(a) * 5, 16 + Math.sin(a) * 5); ctx.lineTo(16 + Math.cos(a + 1.047) * 5, 16 + Math.sin(a + 1.047) * 5); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(16, 11); ctx.lineTo(19, 16); ctx.lineTo(16, 21); ctx.lineTo(13, 16); ctx.closePath(); ctx.fill();
  },
  divineshield(ctx, glow) {   // 有翅膀的金盾
    glow('#ffe070', 8); ctx.fillStyle = '#fff8e0';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(16 + sg * 6, 12); ctx.quadraticCurveTo(16 + sg * 15, 5, 16 + sg * 15, 14); ctx.quadraticCurveTo(16 + sg * 12, 13, 16 + sg * 13, 18); ctx.quadraticCurveTo(16 + sg * 10, 17, 16 + sg * 7, 20); ctx.closePath(); ctx.fill(); }
    const g = ctx.createLinearGradient(10, 0, 22, 0); g.addColorStop(0, '#b08020'); g.addColorStop(0.5, '#fff0a0'); g.addColorStop(1, '#a07010');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(10, 7); ctx.lineTo(22, 7); ctx.lineTo(22, 16); ctx.quadraticCurveTo(21, 24, 16, 28); ctx.quadraticCurveTo(11, 24, 10, 16); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#fffbe8'; ctx.fillRect(15, 10, 2, 13); ctx.fillRect(12, 14, 8, 2);
  },
  berserk(ctx, glow) {   // 怒吼的面孔與雙斧
    glow('#ff3010', 8);
    ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, 28); ctx.lineTo(13, 8); ctx.moveTo(27, 28); ctx.lineTo(19, 8); ctx.stroke();
    ctx.fillStyle = '#e8e8f0'; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(16 + sg * 3, 9); ctx.quadraticCurveTo(16 + sg * 11, 2, 16 + sg * 13, 10); ctx.quadraticCurveTo(16 + sg * 8, 9, 16 + sg * 5, 14); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#c02010'; ctx.beginPath(); ctx.arc(16, 19, 7, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffe040'; ctx.beginPath(); ctx.moveTo(11, 16); ctx.lineTo(15, 18); ctx.lineTo(11, 18.5); ctx.fill(); ctx.beginPath(); ctx.moveTo(21, 16); ctx.lineTo(17, 18); ctx.lineTo(21, 18.5); ctx.fill();
    ctx.fillStyle = '#2a0404'; ctx.beginPath(); ctx.ellipse(16, 23, 3.5, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(13.5, 21.4, 1.2, 1.4); ctx.fillRect(17.3, 21.4, 1.2, 1.4);
  },
  eagleeye(ctx, glow) {   // 老鷹的頭與銳利的眼睛
    glow('#c0ff80', 6);
    ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.moveTo(4, 28); ctx.quadraticCurveTo(4, 10, 14, 6); ctx.quadraticCurveTo(24, 4, 27, 12); ctx.lineTo(20, 16); ctx.quadraticCurveTo(16, 22, 18, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f0e8'; ctx.beginPath(); ctx.moveTo(8, 12); ctx.quadraticCurveTo(14, 4, 24, 8); ctx.quadraticCurveTo(18, 9, 12, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffc020'; ctx.beginPath(); ctx.moveTo(23, 10); ctx.quadraticCurveTo(31, 11, 28, 18); ctx.quadraticCurveTo(27, 14, 22, 15); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffe040'; ctx.beginPath(); ctx.arc(18, 11, 2.6, 0, 7); ctx.fill(); ctx.fillStyle = '#100800'; ctx.beginPath(); ctx.arc(18.5, 11, 1.3, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(18, 11, 5.5, -0.6, 0.6); ctx.stroke();
  },
  thunderstorm(ctx, glow) {   // 雷雲與落雷
    ctx.fillStyle = '#5a5a78'; for (const [x, y, r] of [[10, 10, 6], [17, 7, 7], [23, 11, 5.5], [15, 12, 6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#8a8aa8'; ctx.beginPath(); ctx.arc(15, 6, 4, 0, 7); ctx.fill();
    glow('#ffe040', 10); ctx.fillStyle = '#fff6a0';
    for (const ox of [-6, 2]) { ctx.beginPath(); ctx.moveTo(14 + ox, 14); ctx.lineTo(10 + ox, 22); ctx.lineTo(14 + ox, 22); ctx.lineTo(11 + ox, 30); ctx.lineTo(19 + ox, 19); ctx.lineTo(15 + ox, 19); ctx.lineTo(18 + ox, 14); ctx.closePath(); ctx.fill(); }
  },
  greaterheal(ctx, glow) {   // 光芒中的十字與葉片
    glow('#80ffa0', 10);
    ctx.strokeStyle = 'rgba(200,255,210,0.8)'; ctx.lineWidth = 1.4; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9); ctx.lineTo(16 + Math.cos(a) * 14, 16 + Math.sin(a) * 14); ctx.stroke(); }
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 9); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#60e080');
    ctx.fillStyle = g; ctx.fillRect(13, 6, 6, 20); ctx.fillRect(6, 13, 20, 6);
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillRect(14.5, 8, 3, 16); ctx.fillRect(8, 14.5, 16, 3);
  },
  earthquake(ctx, glow) {   // 裂開的大地與飛起的岩塊
    ctx.fillStyle = '#7a5a30'; ctx.beginPath(); ctx.moveTo(3, 20); ctx.lineTo(29, 18); ctx.lineTo(29, 29); ctx.lineTo(3, 29); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8804a'; ctx.fillRect(3, 18, 26, 3);
    glow('#ff8020', 6); ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, 18); ctx.lineTo(13, 22); ctx.lineTo(17, 25); ctx.lineTo(14, 29); ctx.moveTo(13, 22); ctx.lineTo(7, 25); ctx.moveTo(17, 25); ctx.lineTo(24, 24); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#c8a070';
    for (const [x, y, r] of [[8, 10, 3], [22, 7, 3.5], [15, 4, 2], [26, 14, 2]]) { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.3, y - r); ctx.lineTo(x + r, y - r * 0.4); ctx.lineTo(x + r * 0.6, y + r); ctx.lineTo(x - r * 0.6, y + r * 0.8); ctx.closePath(); ctx.fill(); }
  },
  deathcloud(ctx, glow) {   // 紫色毒雲裡的骷髏
    glow('#a040ff', 10); ctx.fillStyle = 'rgba(140,70,200,0.9)';
    for (const [x, y, r] of [[9, 18, 7], [16, 13, 9], [23, 18, 7], [16, 22, 7]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.fillStyle = '#ece4f4'; ctx.beginPath(); ctx.arc(16, 15, 6, 0, 7); ctx.fill(); ctx.fillRect(12.5, 18, 7, 5);
    ctx.fillStyle = '#2a0a3a'; ctx.beginPath(); ctx.arc(13.6, 15, 1.8, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(18.4, 15, 1.8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16, 17); ctx.lineTo(15, 19); ctx.lineTo(17, 19); ctx.fill(); for (let i = 0; i < 3; i++) ctx.fillRect(13.5 + i * 2.2, 21, 1, 2);
  },
  holyjudgment(ctx, glow) {   // 從天而降的光之聖劍
    glow('#fff0a0', 12);
    const g = ctx.createLinearGradient(0, 0, 0, 32); g.addColorStop(0, 'rgba(255,250,220,0)'); g.addColorStop(1, 'rgba(255,240,160,0.7)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(22, 0); ctx.lineTo(26, 30); ctx.lineTo(6, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(14.5, 3); ctx.lineTo(17.5, 3); ctx.lineTo(17.5, 21); ctx.lineTo(16, 27); ctx.lineTo(14.5, 21); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd860'; ctx.fillRect(10, 6, 12, 2.2); ctx.beginPath(); ctx.arc(16, 2.5, 2, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,170,0.9)'; ctx.beginPath(); ctx.ellipse(16, 28, 10, 2.5, 0, 0, 7); ctx.fill();
  },
  arrowstorm(ctx, glow) {   // 斜斜落下的大量箭矢
    glow('#ffe8a0', 4);
    for (let i = 0; i < 7; i++) {
      const x = 3 + (i % 4) * 7 + (i > 3 ? 3.5 : 0), y = i > 3 ? 14 : 4;
      ctx.strokeStyle = '#e8d4a0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 11); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 5.5, y + 15); ctx.lineTo(x + 2.4, y + 10.5); ctx.lineTo(x + 6, y + 9.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c04030'; ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  },
  timestop(ctx, glow) {   // 結霜的沙漏
    glow('#a0f0ff', 8);
    ctx.fillStyle = '#c9a33a'; ctx.fillRect(8, 4, 16, 3); ctx.fillRect(8, 25, 16, 3); ctx.fillRect(9, 7, 1.5, 18); ctx.fillRect(21.5, 7, 1.5, 18);
    ctx.fillStyle = 'rgba(210,245,255,0.55)'; ctx.beginPath(); ctx.moveTo(11, 7); ctx.lineTo(21, 7); ctx.lineTo(16.8, 16); ctx.lineTo(21, 25); ctx.lineTo(11, 25); ctx.lineTo(15.2, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(12.5, 9); ctx.lineTo(19.5, 9); ctx.lineTo(16, 14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16, 21); ctx.lineTo(20, 24.5); ctx.lineTo(12, 24.5); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(26, 16); ctx.lineTo(26 + Math.cos(a) * 3.5, 16 + Math.sin(a) * 3.5); ctx.stroke(); }
  },
  holyfield(ctx, glow) {   // 光之結界穹頂
    glow('#ffe070', 10);
    const g = ctx.createRadialGradient(16, 24, 2, 16, 22, 14); g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(1, 'rgba(255,220,100,0.25)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(16, 25, 13, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(16, 25, 13, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(16, 25, 13, 3, 0, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(16, 6, 6, 2, 0, 0, 7); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#fffbe8'; ctx.fillRect(15, 14, 2, 9); ctx.fillRect(12.5, 16.5, 7, 2);
  },
  armageddon(ctx, glow) {   // 燃燒的大隕石與爆炸
    glow('#ff4010', 10);
    const fl = ctx.createLinearGradient(4, 4, 20, 20); fl.addColorStop(0, 'rgba(255,120,30,0)'); fl.addColorStop(1, 'rgba(255,170,60,0.95)');
    ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(10, 2); ctx.lineTo(22, 16); ctx.lineTo(16, 22); ctx.closePath(); ctx.fill();
    const g = ctx.createRadialGradient(18, 17, 1, 19, 19, 8); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.45, '#ff7a20'); g.addColorStop(1, '#5a1000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(19.5, 19.5, 7.5, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#3a0a00'; for (const [x, y, r] of [[21, 21, 1.6], [17, 22, 1], [22, 17, 0.9]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffb040'; for (const [x, y] of [[27, 10], [6, 26], [28, 27]]) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); }
  },
  miracle(ctx, glow) {   // 天使之翼與光芒之星
    glow('#ffffff', 12); ctx.fillStyle = '#ffffff';
    for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(16 + sg * 3, 17); ctx.quadraticCurveTo(16 + sg * (10 + k * 1.5), 6 + k * 4, 16 + sg * (14 - k), 9 + k * 5); ctx.quadraticCurveTo(16 + sg * (9 - k), 14 + k * 3, 16 + sg * 3, 20); ctx.closePath(); ctx.globalAlpha = 1 - k * 0.2; ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff2a0';
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 2.5 : 7; ctx.lineTo(16 + Math.cos(a) * r, 15 + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(16, 4, 5, 1.6, 0, 0, 7); ctx.stroke();
  },
};
