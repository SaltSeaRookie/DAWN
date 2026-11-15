'use strict';
// ===== 登入、選擇角色、建立角色 =====
const Scenes = {
  cur: 'login', t: 0, chars: [], sel: 0, mist: [], stars: [],
  init() {
    for (let i = 0; i < 140; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.55, s: Math.random() * 1.6 + 0.3, p: Math.random() * 6 });
    for (let i = 0; i < 40; i++) this.mist.push({ x: Math.random(), y: 0.6 + Math.random() * 0.4, r: 80 + Math.random() * 160, v: 0.004 + Math.random() * 0.01 });
    // 登入
    $('#loginForm').addEventListener('submit', (e) => { e.preventDefault(); this.doLogin(false); });
    $('#btnRegister').onclick = () => this.doLogin(true);
    $('#btnQuit').onclick = () => { $('#loginMsg').textContent = '感謝遊玩，你可以直接關閉這個分頁。'; };
    // 選擇角色
    $('#btnEnter').onclick = () => this.enter();
    $('#btnNewChar').onclick = () => this.show('create');
    $('#btnDelChar').onclick = () => this.del();
    $('#btnLogout').onclick = () => { Net.session = null; this.show('login'); };
    // 建立角色
    $('#btnCreateOk').onclick = () => this.create();
    $('#btnCreateCancel').onclick = () => this.show('select');
    $('#cName').addEventListener('keydown', (e) => e.stopPropagation());
    this.buildCreate();
    try { const last = localStorage.getItem('dawnlands_last_account'); if (last) $('#lAccount').value = last; } catch (e) { /* */ }
    this.show('login');
  },
  show(name) {
    this.cur = name;
    for (const id of ['login', 'select', 'create']) $('#' + id).classList.toggle('show', id === name);
    document.body.classList.toggle('in-scene', !!name);
    if (name === 'login') { $('#lPassword').value = ''; setTimeout(() => ($('#lAccount').value ? $('#lPassword') : $('#lAccount')).focus(), 50); Music.play('login'); }
    if (name === 'select') { this.refreshChars(); Music.play('login'); }
    if (name === 'create') this.resetCreate();
  },
  hide() { this.cur = null; for (const id of ['login', 'select', 'create']) $('#' + id).classList.remove('show'); document.body.classList.remove('in-scene'); },

  async doLogin(register) {
    const acc = $('#lAccount').value.trim(), pw = $('#lPassword').value;
    const msg = $('#loginMsg');
    if (!acc || !pw) { msg.textContent = '請輸入帳號與密碼。'; return; }
    Snd.unlock();
    let r = register ? await Net.auth.register(acc, pw) : await Net.auth.login(acc, pw);
    if (!r.ok && r.error === 'noaccount') {
      if (confirm('帳號「' + acc + '」不存在，要用這組密碼建立新帳號嗎？')) r = await Net.auth.register(acc, pw);
      else { msg.textContent = '帳號不存在。'; return; }
    }
    if (!r.ok) { msg.textContent = r.error; SFX.play('error'); return; }
    msg.textContent = '';
    Net.session = r.session;
    try { localStorage.setItem('dawnlands_last_account', acc); } catch (e) { /* */ }
    SFX.play('quest');
    this.show('select');
  },

  // ---------- 選擇角色 ----------
  refreshChars() {
    this.chars = Net.chars.list(Net.session);
    this.sel = clamp(this.sel, 0, Math.max(0, this.chars.length - 1));
    const box = $('#slotPicks'); box.innerHTML = '';
    for (let i = 0; i < MAX_CHARS; i++) {
      const d = el('div', 'slotPick' + (i === this.sel && this.chars[i] ? ' sel' : ''));
      d.style.left = (12.5 + i * 25) + '%';
      const c = this.chars[i];
      d.innerHTML = c ? '<b>' + esc(c.name) + '</b><span>Lv.' + c.level + ' ' + CLASSES[c.cls].name + '</span>' : '<b class="dim">空欄位</b><span>點擊建立角色</span>';
      d.onclick = () => { SFX.play('click'); if (c) { this.sel = i; this.refreshChars(); } else this.show('create'); };
      d.ondblclick = () => { if (c) this.enter(); };
      box.appendChild(d);
    }
    this.renderInfo();
  },
  renderInfo() {
    const c = this.chars[this.sel], box = $('#charInfo');
    $('#btnEnter').disabled = !c; $('#btnDelChar').disabled = !c; $('#btnNewChar').disabled = this.chars.length >= MAX_CHARS;
    if (!c) { box.innerHTML = '<div class="dim" style="padding:20px;text-align:center">還沒有角色，建立一個開始冒險吧！</div>'; return; }
    const tmp = loadPlayer(c); const d = recalc(tmp);
    const row = (k, v) => '<div class="ci-row"><span>' + k + '</span><b>' + v + '</b></div>';
    box.innerHTML =
      '<div class="ci-col">' + row('角色名稱', esc(c.name)) + row('血盟', c.clan ? esc(c.clan.name) : '—') + row('職業', CLASSES[c.cls].name + '（' + CLASSES[c.cls].role + '）') +
      row('善惡', '<i style="color:' + alignColor(c.align) + '">' + alignName(c.align) + ' ' + c.align + '</i>') + '</div>' +
      '<div class="ci-col">' + row('等級', c.level) + row('體力', tmp.hp + ' / ' + tmp.maxHp) + row('魔力', tmp.mp + ' / ' + tmp.maxMp) + row('防禦', d.ac) + '</div>' +
      '<div class="ci-col stats6">' + STATS.map((k) => row(STAT_NAMES[k] + ' ' + STAT_SHORT[k], d.st[k])).join('') + '</div>';
  },
  enter() {
    const c = this.chars[this.sel]; if (!c) return;
    const data = Net.chars.load(Net.session, c.name);
    this.hide();
    enterWorld(data);
  },
  del() {
    const c = this.chars[this.sel]; if (!c) return;
    const n = prompt('刪除後無法復原。請輸入角色名稱「' + c.name + '」確認刪除：');
    if (n !== c.name) return;
    Net.chars.remove(Net.session, c.name);
    SFX.play('enchantFail');
    this.sel = 0; this.refreshChars();
  },

  // ---------- 建立角色 ----------
  buildCreate() {
    const cl = $('#cClasses');
    for (const k in CLASSES) {
      const c = CLASSES[k];
      const d = el('div', 'ccls');
      d.dataset.cls = k;
      d.innerHTML = '<canvas width="120" height="140"></canvas><b>' + c.name + '</b><span>' + c.role + '</span>';
      d.onclick = () => { SFX.play('click'); this.cc.cls = k; this.cc.add = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }; this.renderCreate(); };
      cl.appendChild(d);
    }
    const tb = $('#cStats');
    for (const s of STATS) {
      const r = el('div', 'cs-row');
      r.innerHTML = '<span class="cs-n">' + STAT_NAMES[s] + ' <i>' + STAT_SHORT[s] + '</i></span><button class="cs-b" data-s="' + s + '" data-d="-1">−</button><b id="cs_' + s + '"></b><button class="cs-b" data-s="' + s + '" data-d="1">＋</button>';
      tb.appendChild(r);
    }
    tb.addEventListener('click', (e) => {
      const b = e.target.closest('.cs-b'); if (!b) return;
      const s = b.dataset.s, d = +b.dataset.d, cc = this.cc, base = CLASSES[cc.cls].base[s];
      const used = Object.values(cc.add).reduce((a, x) => a + x, 0);
      if (d > 0 && (used >= CREATE_BONUS || base + cc.add[s] >= STAT_MAX_CREATE)) return;
      if (d < 0 && cc.add[s] <= 0) return;
      cc.add[s] += d; SFX.play('click'); this.renderCreate();
    });
  },
  resetCreate() {
    this.cc = { cls: 'knight', add: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } };
    $('#cName').value = ''; $('#cMsg').textContent = '';
    this.renderCreate();
    setTimeout(() => $('#cName').focus(), 50);
  },
  renderCreate() {
    const cc = this.cc, c = CLASSES[cc.cls];
    document.querySelectorAll('.ccls').forEach((d) => d.classList.toggle('sel', d.dataset.cls === cc.cls));
    const st = {}; for (const s of STATS) st[s] = c.base[s] + cc.add[s];
    for (const s of STATS) { const e = $('#cs_' + s); e.textContent = st[s]; e.className = cc.add[s] ? 'up' : ''; }
    const used = Object.values(cc.add).reduce((a, x) => a + x, 0);
    $('#cBonus').textContent = CREATE_BONUS - used;
    const hp = c.hp + Math.max(0, statMod(st.con)) * 2, mp = c.mp + Math.max(0, statMod(st.wis)) * 2;
    const weight = 1000 + (st.str + st.con) * 40;
    $('#cDerived').innerHTML =
      '<div><span>體力</span><b>' + hp + '</b></div><div><span>魔力</span><b>' + mp + '</b></div>' +
      '<div><span>負重上限</span><b>' + weight + '</b></div><div><span>魔法防禦</span><b>' + Math.max(0, statMod(st.wis) * 3) + '</b></div>' +
      '<div><span>近戰加成</span><b>' + (statMod(st.str) >= 0 ? '+' : '') + statMod(st.str) + '</b></div><div><span>遠程加成</span><b>' + (statMod(st.dex) >= 0 ? '+' : '') + statMod(st.dex) + '</b></div>' +
      '<div><span>魔攻加成</span><b>' + (statMod(st.int) >= 0 ? '+' : '') + statMod(st.int) + '</b></div><div><span>血盟人數</span><b>' + (2 + Math.floor(st.cha / 3)) + '</b></div>';
    $('#cDesc').textContent = c.desc;
    const sp = c.spells.map((s) => SPELLS[s].name).join('、');
    $('#cStart').textContent = '初始裝備：' + c.start.filter((x) => x[2]).map((x) => ITEMS[x[0]].name).join('、') + (sp ? '　初始魔法：' + sp : '');
  },
  create() {
    const name = $('#cName').value.trim();
    const msg = $('#cMsg');
    if (!/^[一-鿿A-Za-z0-9]{2,8}$/.test(name)) { msg.textContent = '名稱需為 2～8 個中文、英文或數字。'; SFX.play('error'); return; }
    const used = Object.values(this.cc.add).reduce((a, x) => a + x, 0);
    if (used < CREATE_BONUS && !confirm('還有 ' + (CREATE_BONUS - used) + ' 點能力值沒有分配，確定要建立嗎？')) return;
    const c = CLASSES[this.cc.cls];
    const stats = {}; for (const s of STATS) stats[s] = c.base[s] + this.cc.add[s];
    const data = newCharacterData(name, this.cc.cls, stats);
    const r = Net.chars.create(Net.session, data);
    if (!r.ok) { msg.textContent = r.error; SFX.play('error'); return; }
    SFX.play('levelup');
    this.show('select');
    this.sel = this.chars.findIndex((x) => x.name === name);
    this.refreshChars();
  },

  // ---------- 背景繪製 ----------
  frame(dt) {
    if (!this.cur) return;
    this.t += dt;
    const g = canvas.getContext('2d'); ctx = g;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const w = VW, h = VH, t = this.t;
    if (this.cur === 'login') this.drawLogin(g, w, h, t);
    else this.drawHall(g, w, h, t);
  },
  drawSky(g, w, h, t) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05060f'); sky.addColorStop(0.55, '#141226'); sky.addColorStop(0.8, '#2a1a1e'); sky.addColorStop(1, '#0a0806');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (const s of this.stars) { g.globalAlpha = 0.4 + Math.sin(t * 1.5 + s.p) * 0.3; g.fillStyle = '#e8e8ff'; g.fillRect(s.x * w, s.y * h, s.s, s.s); }
    g.globalAlpha = 1;
    // 月亮
    const mx = w * 0.8, my = h * 0.18;
    const mg = g.createRadialGradient(mx, my, 10, mx, my, 120); mg.addColorStop(0, 'rgba(255,240,210,0.35)'); mg.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, 120, 0, 7); g.fill();
    g.fillStyle = '#f2e6c8'; g.beginPath(); g.arc(mx, my, 34, 0, 7); g.fill();
    g.fillStyle = '#141226'; g.beginPath(); g.arc(mx + 14, my - 8, 30, 0, 7); g.fill();
    // 遠山
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle = ['#1a1626', '#120f18', '#0a0808'][layer];
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (0.55 + layer * 0.08) - (Math.sin(x * 0.004 + layer * 2) * 0.5 + Math.sin(x * 0.011 + layer) * 0.3 + 0.5) * h * (0.14 - layer * 0.03));
      g.lineTo(w, h); g.fill();
    }
  },
  drawMist(g, w, h, t, col) {
    for (const m of this.mist) {
      m.x += m.v * 0.016; if (m.x > 1.2) m.x = -0.2;
      const gr = g.createRadialGradient(m.x * w, m.y * h, 0, m.x * w, m.y * h, m.r);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(m.x * w, m.y * h, m.r, 0, 7); g.fill();
    }
  },
  fire(g, x, y, s, t) {
    const gl = g.createRadialGradient(x, y - 10 * s, 0, x, y - 10 * s, 90 * s);
    gl.addColorStop(0, 'rgba(255,150,50,0.35)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x, y - 10 * s, 90 * s, 0, 7); g.fill();
    for (let i = 0; i < 7; i++) {
      const ph = t * 8 + i * 1.7;
      const fx = x + Math.sin(ph) * 5 * s + (i - 3) * 4 * s, fh = (26 + Math.sin(ph * 1.3) * 8) * s;
      const gr = g.createLinearGradient(fx, y, fx, y - fh);
      gr.addColorStop(0, 'rgba(255,210,80,0.95)'); gr.addColorStop(0.6, 'rgba(255,90,20,0.75)'); gr.addColorStop(1, 'rgba(200,30,0,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(fx - 6 * s, y); g.quadraticCurveTo(fx, y - fh * 1.2, fx + 6 * s, y); g.fill();
    }
  },
  drawLogin(g, w, h, t) {
    this.drawSky(g, w, h, t);
    // 石造拱門
    const cx = w / 2, base = h * 0.86, aw = Math.min(w * 0.42, 520), ah = Math.min(h * 0.62, 480);
    const stone = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeRect(x + 0.5, y + 0.5, ww - 1, hh - 1); };
    for (const side of [-1, 1]) {
      const px = cx + side * aw / 2 - 40;
      for (let i = 0; i < 10; i++) stone(px + (i % 2) * 4, base - (i + 1) * ah / 10, 80, ah / 10, i % 3 ? '#3a3632' : '#423d38');
    }
    g.strokeStyle = '#3a3632'; g.lineWidth = 70;
    g.beginPath(); g.arc(cx, base - ah, aw / 2, Math.PI, 0); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
    for (let k = 0; k <= 12; k++) { const a = Math.PI + k * Math.PI / 12; g.beginPath(); g.moveTo(cx + Math.cos(a) * (aw / 2 - 35), base - ah + Math.sin(a) * (aw / 2 - 35)); g.lineTo(cx + Math.cos(a) * (aw / 2 + 35), base - ah + Math.sin(a) * (aw / 2 + 35)); g.stroke(); }
    // 拱門內的光
    const lg = g.createRadialGradient(cx, base - ah * 0.5, 10, cx, base - ah * 0.5, aw * 0.6);
    lg.addColorStop(0, 'rgba(255,200,140,' + (0.2 + Math.sin(t) * 0.04) + ')'); lg.addColorStop(1, 'rgba(255,160,90,0)');
    g.fillStyle = lg; g.fillRect(cx - aw / 2 + 40, base - ah - aw / 2, aw - 80, ah + aw / 2);
    // 地面
    const gg = g.createLinearGradient(0, base, 0, h); gg.addColorStop(0, '#1a1410'); gg.addColorStop(1, '#050403');
    g.fillStyle = gg; g.fillRect(0, base, w, h - base);
    // 火盆
    for (const side of [-1, 1]) {
      const bx = cx + side * (aw / 2 + 80);
      g.fillStyle = '#1a1612'; g.fillRect(bx - 6, base - 70, 12, 70);
      g.fillStyle = '#2a2420'; g.beginPath(); g.ellipse(bx, base - 72, 26, 10, 0, 0, 7); g.fill();
      this.fire(g, bx, base - 76, 1.2, t + side);
    }
    this.drawMist(g, w, h, t, 'rgba(120,110,140,0.06)');
    // 火星
    for (let i = 0; i < 30; i++) {
      const ph = (t * 0.3 + i * 0.37) % 1, side = i % 2 ? 1 : -1;
      const x = cx + side * (aw / 2 + 80) + Math.sin(t * 2 + i) * 20 * ph, y = base - 80 - ph * 220;
      g.fillStyle = 'rgba(255,170,60,' + (1 - ph) + ')'; g.fillRect(x, y, 2, 2);
    }
  },
  drawHall(g, w, h, t) {
    // 昏暗大廳
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0c0a0c'); bg.addColorStop(0.6, '#1a1412'); bg.addColorStop(1, '#070605');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // 石柱
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.5) * w / 6;
      const pg = g.createLinearGradient(x - 30, 0, x + 30, 0); pg.addColorStop(0, '#120f0d'); pg.addColorStop(0.5, '#2a2420'); pg.addColorStop(1, '#100d0b');
      g.fillStyle = pg; g.fillRect(x - 28, 0, 56, h * 0.62);
    }
    // 掛旗
    for (let i = 0; i < 5; i++) {
      const x = (i + 1) * w / 6;
      g.fillStyle = i % 2 ? '#4a1414' : '#14244a';
      g.beginPath(); g.moveTo(x - 22, 30); g.lineTo(x + 22, 30); g.lineTo(x + 22, 150); g.lineTo(x, 130); g.lineTo(x - 22, 150); g.closePath(); g.fill();
      g.fillStyle = '#c0a050'; g.fillRect(x - 24, 26, 48, 5);
      drawEmblem(g, { shape: EMBLEM_SHAPES[i + 1], color: '#c0a050', bg: 'rgba(0,0,0,0)' }, x - 12, 66, 24);
    }
    const floorY = h * 0.62;
    const fg = g.createLinearGradient(0, floorY, 0, h); fg.addColorStop(0, '#2a221c'); fg.addColorStop(1, '#0a0806');
    g.fillStyle = fg; g.fillRect(0, floorY, w, h - floorY);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    for (let k = 0; k < 12; k++) { const y = floorY + Math.pow(k / 12, 1.6) * (h - floorY); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let k = -10; k <= 10; k++) { g.beginPath(); g.moveTo(w / 2 + k * 40, floorY); g.lineTo(w / 2 + k * 200, h); g.stroke(); }
    if (this.cur !== 'select') { this.drawMist(g, w, h, t, 'rgba(90,80,100,0.05)'); return; }
    // 角色台座
    const sc = clamp(Math.min(w / 1100, h / 800), 0.7, 1.5);
    for (let i = 0; i < MAX_CHARS; i++) {
      const x = w * (0.125 + i * 0.25), y = h * 0.6;
      const c = this.chars[i], sel = c && i === this.sel;
      g.fillStyle = '#2e2824'; g.beginPath(); g.ellipse(x, y + 10, 70 * sc, 24 * sc, 0, 0, 7); g.fill();
      g.fillStyle = '#3e3630'; g.beginPath(); g.ellipse(x, y, 70 * sc, 24 * sc, 0, 0, 7); g.fill();
      if (sel) {
        // 魔法陣光柱
        g.save(); g.globalCompositeOperation = 'lighter';
        const pg = g.createLinearGradient(0, y - 320 * sc, 0, y);
        pg.addColorStop(0, 'rgba(120,180,255,0)'); pg.addColorStop(1, 'rgba(120,180,255,' + (0.28 + Math.sin(t * 2) * 0.06) + ')');
        g.fillStyle = pg; g.fillRect(x - 46 * sc, y - 320 * sc, 92 * sc, 320 * sc);
        g.strokeStyle = 'rgba(140,200,255,0.7)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(x, y, 60 * sc, 20 * sc, 0, 0, 7); g.stroke();
        for (let k = 0; k < 8; k++) { const a = t * 0.8 + k * Math.PI / 4; g.fillStyle = 'rgba(180,220,255,0.8)'; g.fillRect(x + Math.cos(a) * 60 * sc - 2, y + Math.sin(a) * 20 * sc - 2, 4, 4); }
        for (let k = 0; k < 10; k++) { const ph = (t * 0.4 + k * 0.1) % 1; g.fillStyle = 'rgba(180,220,255,' + (1 - ph) + ')'; g.fillRect(x + Math.sin(k * 7) * 40 * sc, y - ph * 280 * sc, 2, 2); }
        g.restore();
      }
      if (c) {
        const look = playerLook(Object.assign(loadPlayer(c), {}));
        g.save(); g.translate(x, y); g.scale(2.6 * sc, 2.6 * sc);
        drawShadow(g, 0, 0, 12, 4);
        if (!sel) g.filter = 'brightness(0.55) saturate(0.7)';
        drawHumanoid(g, 0, 0, Object.assign(look, { dir: 0.75, moving: false, walk: 0, t: t + i, atk: -1 }));
        g.filter = 'none';
        g.restore();
      } else {
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.ellipse(x, y - 70 * sc, 22 * sc, 60 * sc, 0, 0, 7); g.fill();
        g.font = (28 * sc) + 'px serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillText('＋', x, y - 60 * sc);
      }
    }
    // 兩側火把
    for (const x of [w * 0.02 + 20, w * 0.98 - 20]) { g.fillStyle = '#1a1612'; g.fillRect(x - 4, h * 0.3, 8, 40); this.fire(g, x, h * 0.3, 0.8, t + x); }
  },
  // 建立角色畫面的職業預覽
  drawCreatePreviews(t) {
    document.querySelectorAll('.ccls canvas').forEach((cv) => {
      const g = cv.getContext('2d'), k = cv.parentNode.dataset.cls;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      const sel = this.cc && this.cc.cls === k;
      const c = CLASSES[k];
      const look = Object.assign({}, c.look, k === 'mage' ? ARMOR_LOOK.robe : ARMOR_LOOK.leather, { weapon: WEAPON_SPRITE[ITEMS[c.start[0][0]].wclass], shield: c.start.some((s) => s[0] === 'wood_shield'), shieldCol: '#6a5a3a' });
      if (k === 'knight') look.helm = '#6a4a2e';
      if (k === 'cleric') Object.assign(look, { body: '#e8e0c8', robe: true });
      g.translate(60, 122); g.scale(2.1, 2.1);
      drawShadow(g, 0, 0, 12, 4);
      drawHumanoid(g, 0, 0, Object.assign(look, { dir: 0.5, moving: sel, walk: t * 9, t, atk: -1 }));
    });
  },
};
// 建立角色預覽動畫
(function previewLoop() {
  if (Scenes.cur === 'create') Scenes.drawCreatePreviews(Scenes.t);
  requestAnimationFrame(previewLoop);
})();
