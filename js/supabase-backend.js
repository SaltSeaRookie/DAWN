'use strict';
// ===== Supabase 多人連線後端 =====
// 帳號：每個瀏覽器用 Supabase 的匿名登入取得身分，遊戲帳號與密碼由資料庫函式檢查（不需要信箱）
// 存檔：資料表 profiles（帳號、設定）與 characters（角色存檔，jsonb）
// 即時：Realtime 頻道「dawnlands-world」—— Presence 記錄誰在線上，Broadcast 傳送位置、聊天、交易
// 與 RemoteBackend（自架 Node 伺服器）提供相同的介面，遊戲其他部分不需要知道用的是哪一種。
// 先載入專案內附的 supabase-js（js/vendor），失敗時再改用 CDN
const SB_LIBS = ['js/vendor/supabase-2.118.0.js', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js', 'https://unpkg.com/@supabase/supabase-js@2.118.0/dist/umd/supabase.js'];
const SB_CHANNEL = 'dawnlands-world';
const SAY_RANGE_SB = 22;

function sbConfig() {
  const q = new URLSearchParams(location.search);
  if (q.has('offline')) return null;
  let url = q.get('sb_url'), key = q.get('sb_key');
  if (!url) { try { const s = JSON.parse(localStorage.getItem('dawnlands_supabase') || 'null'); if (s) { url = s.url; key = s.key; } } catch (e) { /* */ } }
  const C = window.DAWNLANDS_CONFIG || {};
  url = url || C.supabaseUrl; key = key || C.supabaseAnonKey;
  return url && key ? { url: url.trim().replace(/\/+$/, ''), key: key.trim() } : null;
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('無法載入 ' + src)); document.head.appendChild(s); });
}
function sbErr(e) {
  const m = (e && (e.message || e.error_description || e)) + '';
  if (/Invalid login credentials/i.test(m)) return '密碼錯誤。';
  if (/already registered|already exists/i.test(m)) return '帳號已存在。';
  if (/Password should be at least (\d+)/i.test(m)) return '密碼至少需要 ' + m.match(/at least (\d+)/i)[1] + ' 個字元。';
  if (/Email not confirmed/i.test(m)) return '這個帳號還沒有驗證。請到 Supabase 的 Authentication 設定關閉「Confirm email」（教學第 2 步）。';
  if (/rate limit/i.test(m)) return '註冊太頻繁了，請稍後再試（Supabase 的頻率限制）。';
  if (/fetch|network/i.test(m)) return '無法連線到 Supabase，請檢查網路或專案是否暫停。';
  return m;
}

const SupabaseBackend = {
  name: 'supabase',
  sb: null, cfg: null, connected: false, listeners: {}, online: 0,
  user: null, account: null, cache: null, channel: null, myId: null, me: null, inWorld: false, chatTimes: [],
  on(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
  emit(t, m) { for (const fn of this.listeners[t] || []) { try { fn(m); } catch (e) { console.error(e); } } },
  // 連上 Supabase（載入函式庫、建立連線、加入大廳頻道以取得在線人數）
  async open(cfg) {
    this.cfg = cfg;
    try {
      for (const src of SB_LIBS) { if (window.supabase && window.supabase.createClient) break; try { await loadScript(src); } catch (e) { console.warn(e.message); } }
      if (!window.supabase || !window.supabase.createClient) throw new Error('無法載入 supabase-js');
      this.sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, storageKey: 'dawnlands-sb-auth' }, realtime: { params: { eventsPerSecond: 20 } } });
      // 試一下資料表是否存在（確認 SQL 已執行）
      const { error } = await this.sb.from('characters').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) {
        const m = error.message || '';
        if (/fetch|network|Failed/i.test(m)) { this.setupError = '無法連線到 Supabase：請確認 Project URL 是否正確、網路是否正常，以及專案是否被暫停（免費方案閒置一週會暫停，到 Supabase 網站按 Restore 即可）。'; return false; }
        if (/does not exist|Could not find|schema cache|42P01/i.test(m) || error.code === '42P01' || error.code === 'PGRST205') { this.setupError = '資料表還沒建立：請到 Supabase 的 SQL Editor 執行 supabase/schema.sql（教學第 3 步）。'; return false; }
        if (/Invalid API key|apikey|JWS|JWT/i.test(m) && !/row-level|permission/i.test(m)) { this.setupError = 'anon key 不正確：請重新複製 Supabase 的 anon public key（教學第 4 步）。'; return false; }
      }
      this.connected = true;
      await this.joinChannel();
      return true;
    } catch (e) { console.warn(e); this.setupError = sbErr(e); return false; }
  },
  // ---------- Realtime ----------
  joinChannel() {
    return new Promise((resolve) => {
      if (this.channel) { resolve(true); return; }
      this.myId = 'p' + Math.random().toString(36).slice(2, 10);
      const ch = this.sb.channel(SB_CHANNEL, { config: { presence: { key: this.myId }, broadcast: { self: false } } });
      this.channel = ch;
      ch.on('presence', { event: 'sync' }, () => { this.online = this.presenceList().length; });
      ch.on('presence', { event: 'join' }, ({ key, newPresences }) => { if (key === this.myId) return; const p = newPresences[0]; if (p && p.name && this.inWorld) this.emit('join', { p: this.pubOf(key, p) }); });
      ch.on('presence', { event: 'leave' }, ({ key, leftPresences }) => { if (key === this.myId) return; const p = leftPresences[0]; if (p && p.name) this.emit('part', { id: key, name: p.name }); });
      ch.on('broadcast', { event: 'st' }, ({ payload: m }) => { if (this.inWorld && m && m.id !== this.myId) this.emit('st', m); });
      ch.on('broadcast', { event: 'chat' }, ({ payload: m }) => this.onChat(m));
      ch.on('broadcast', { event: 'relay' }, ({ payload: m }) => { if (m && m.to === this.myId && this.inWorld) this.emit('relay', m); });
      ch.on('broadcast', { event: 'kick' }, ({ payload: m }) => { if (m && m.account === this.account && m.id !== this.myId && this.inWorld) { this.emit('kicked', { reason: '你的帳號從其他地方登入了。' }); } });
      let done = false;
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') { this.connected = true; if (!done) { done = true; resolve(true); } if (this.inWorld && this.me) ch.track(this.me); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!done) { done = true; resolve(false); }
          if (this.connected && this.inWorld) { this.connected = false; this.emit('close', {}); }
        }
      });
      setTimeout(() => { if (!done) { done = true; resolve(false); } }, 8000);
    });
  },
  presenceList() {
    if (!this.channel) return [];
    const st = this.channel.presenceState(), out = [];
    for (const key in st) { const p = st[key][0]; if (p && p.name) out.push(this.pubOf(key, p)); }
    return out;
  },
  pubOf(key, p) { return Object.assign({ id: key, name: p.name }, p.s || {}, { look: p.look || null }); },
  onChat(m) {
    if (!m || !this.inWorld || m.id === this.myId) return;
    const me = this.me && this.me.s;
    if (m.ch === 'say') { if (!me || m.map !== me.map || Math.hypot(m.x - me.x, m.y - me.y) > SAY_RANGE_SB) return; }
    else if (m.ch === 'whisper') { if (!this.me || String(m.to || '').toLowerCase() !== this.me.name.toLowerCase()) return; }
    else if (m.ch === 'clan') { if (!me || !me.clan || m.clan !== me.clan) return; }
    else if (m.ch !== 'world') return;
    this.emit('chat', { ch: m.ch, from: m.from, id: m.id, text: String(m.text || '').slice(0, 60) });
  },
  send(event, payload) { if (this.channel && this.connected) this.channel.send({ type: 'broadcast', event, payload }); },
  // RemoteBackend 相容：不需要回覆的訊息
  post(t, d) {
    if (!this.inWorld && t !== 'leave') return false;
    if (t === 'state') {
      this.me.s = Object.assign(this.me.s || {}, d.s); if (d.look) this.me.look = d.look;
      this.send('st', { id: this.myId, name: this.me.name, s: d.s, look: d.look });
      // 每 5 秒更新一次 Presence，讓剛上線的人看到最新位置與外觀
      const now = Date.now(); if (now - (this.trackT || 0) > 5000) { this.trackT = now; this.channel.track(this.me); }
      return true;
    }
    if (t === 'chat') {
      const now = Date.now(); this.chatTimes = this.chatTimes.filter((x) => now - x < 6000);
      if (this.chatTimes.length >= 6) { this.emit('chat', { ch: 'sys', text: '說話太快了，請稍等一下。' }); return false; }
      this.chatTimes.push(now);
      const s = this.me.s || {};
      if (d.ch === 'whisper' && !this.presenceList().some((p) => p.name.toLowerCase() === String(d.to).toLowerCase())) { this.emit('chat', { ch: 'sys', text: d.to + ' 目前不在線上。' }); return false; }
      this.send('chat', { id: this.myId, from: this.me.name, ch: d.ch, text: String(d.text).slice(0, 60), to: d.to, map: s.map, x: s.x, y: s.y, clan: s.clan });
      return true;
    }
    if (t === 'relay') { this.send('relay', { to: d.to, from: this.myId, fromName: this.me.name, data: d.data }); return true; }
    if (t === 'save') return this.chars.save(null, d.data).ok;
    return false;
  },
  // RemoteBackend 相容：需要回覆的請求
  async call(t, d) {
    if (t === 'enter') {
      if (!this.channel || !this.connected) { const ok = await this.joinChannel(); if (!ok) return { ok: false, error: '無法加入 Realtime 頻道。' }; }
      this.me = { name: d.name, account: this.account, s: d.state, look: d.look };
      this.inWorld = true; this.trackT = Date.now();
      // 同一個帳號在別處登入時，請舊的連線離開
      this.send('kick', { account: this.account, id: this.myId });
      await this.channel.track(this.me);
      return { ok: true, id: this.myId, players: this.presenceList().filter((p) => p.id !== this.myId) };
    }
    if (t === 'leave') { this.inWorld = false; this.me = null; if (this.channel) await this.channel.untrack(); return { ok: true }; }
    if (t === 'who') return { ok: true, players: this.presenceList().map((p) => ({ name: p.name, level: p.level, cls: p.cls, map: p.map, clan: p.clan })) };
    return { ok: false, error: '不支援的指令。' };
  },
  async reconnect() {
    try { if (this.channel) { await this.sb.removeChannel(this.channel); } } catch (e) { /* */ }
    this.channel = null;
    return this.joinChannel();
  },
  // ---------- 帳號 ----------
  async loadAccount() {
    const uid = this.user.id;
    const [{ data: prof }, { data: rows, error }] = await Promise.all([
      this.sb.from('profiles').select('account, meta').eq('id', uid).maybeSingle(),
      this.sb.from('characters').select('name, data, created_at').eq('owner', uid),
    ]);
    if (error) throw error;
    if (!prof) throw new Error('找不到帳號資料，請重新登入。');
    this.account = prof.account;
    this.cache = { meta: (prof && prof.meta) || {}, chars: {} };
    for (const r of rows || []) { const d = r.data || {}; d.name = r.name; d.created = d.created || Date.parse(r.created_at); this.cache.chars[r.name] = d; }
  },
  // 確保目前有一個可用的匿名身分（如果目前的身分已經屬於別的帳號，就換一個新的）
  async freshIdentity(account) {
    const { data: { session } } = await this.sb.auth.getSession();
    if (session && session.user) {
      const { data: prof } = await this.sb.from('profiles').select('account').eq('id', session.user.id).maybeSingle();
      if (!prof || (account && prof.account.toLowerCase() === account.toLowerCase())) { this.user = session.user; return null; }
      await this.sb.auth.signOut();
    }
    const { data, error } = await this.sb.auth.signInAnonymously();
    if (error) return /anonymous/i.test(error.message) ? '請到 Supabase 開啟「匿名登入」：Authentication → Sign In / Providers → Allow anonymous sign-ins（教學第 2 步）。' : sbErr(error);
    this.user = data.user;
    return null;
  },
  auth: {
    async login(account, pw) {
      const B = SupabaseBackend;
      if (!/^[A-Za-z0-9_]{3,16}$/.test(account)) return { ok: false, error: '帳號需為 3～16 個英數字或底線。' };
      const { data: exists, error: e1 } = await B.sb.rpc('account_exists', { acc: account });
      if (e1) return { ok: false, error: sbErr(e1) };
      if (!exists) return { ok: false, error: 'noaccount' };
      const e2 = await B.freshIdentity(account); if (e2) return { ok: false, error: e2 };
      const { data: r, error } = await B.sb.rpc('login_account', { acc: account, pw });
      if (error) return { ok: false, error: /login_account|function/i.test(error.message) ? '資料庫函式還沒建立：請重新執行 supabase/schema.sql（教學第 3 步）。' : sbErr(error) };
      if (r === 'bad_password') return { ok: false, error: '密碼錯誤。' };
      if (r === 'noaccount') return { ok: false, error: 'noaccount' };
      if (r !== 'ok') return { ok: false, error: '登入失敗（' + r + '），請重新整理後再試。' };
      try { await B.loadAccount(); } catch (e) { return { ok: false, error: sbErr(e) }; }
      return { ok: true, session: { account: B.account } };
    },
    async register(account, pw) {
      const B = SupabaseBackend;
      if (!/^[A-Za-z0-9_]{3,16}$/.test(account)) return { ok: false, error: '帳號需為 3～16 個英數字或底線。' };
      if (pw.length < 4) return { ok: false, error: '密碼至少需要 4 個字元。' };
      const e2 = await B.freshIdentity(null); if (e2) return { ok: false, error: e2 };
      const { data: r, error } = await B.sb.rpc('register_account', { acc: account, pw });
      if (error) return { ok: false, error: /register_account|function/i.test(error.message) ? '資料庫函式還沒建立：請重新執行 supabase/schema.sql（教學第 3 步）。' : sbErr(error) };
      if (r === 'exists') return { ok: false, error: '帳號已存在。' };
      if (r === 'session_in_use') { await B.sb.auth.signOut(); return B.auth.register(account, pw); }
      if (r !== 'ok') return { ok: false, error: '註冊失敗（' + r + '）。' };
      try { await B.loadAccount(); } catch (e) { return { ok: false, error: sbErr(e) }; }
      return { ok: true, session: { account: B.account } };
    },
  },
  meta: {
    get(session, key) { const c = SupabaseBackend.cache; return c ? c.meta[key] : undefined; },
    set(session, key, val) {
      const B = SupabaseBackend; if (!B.cache) return;
      B.cache.meta[key] = val;
      B.sb.from('profiles').update({ meta: B.cache.meta }).eq('id', B.user.id).then(({ error }) => { if (error) console.warn(error); });
    },
  },
  chars: {
    list() { const c = SupabaseBackend.cache; return c ? Object.values(c.chars).sort((x, y) => (x.created || 0) - (y.created || 0)) : []; },
    load(session, name) { const c = SupabaseBackend.cache; return c && c.chars[name] ? JSON.parse(JSON.stringify(c.chars[name])) : null; },
    async create(session, data) {
      const B = SupabaseBackend;
      if (typeof isReservedName === 'function' && isReservedName(data.name)) return { ok: false, error: '這個名稱是保留名稱，請換一個。' };
      if (Object.keys(B.cache.chars).length >= MAX_CHARS) return { ok: false, error: '角色欄位已滿。' };
      const { data: taken, error: e1 } = await B.sb.rpc('name_taken', { n: data.name });
      if (e1) return { ok: false, error: sbErr(e1) };
      if (taken) return { ok: false, error: '這個名稱已經有人使用了。' };
      data.created = data.created || Date.now();
      const { error } = await B.sb.from('characters').insert({ owner: B.user.id, name: data.name, data });
      if (error) return { ok: false, error: /duplicate|unique/i.test(error.message) ? '這個名稱已經有人使用了。' : /limit/i.test(error.message) ? '角色欄位已滿。' : sbErr(error) };
      B.cache.chars[data.name] = data;
      return { ok: true };
    },
    remove(session, name) {
      const B = SupabaseBackend; if (B.cache) delete B.cache.chars[name];
      B.sb.from('characters').delete().eq('owner', B.user.id).eq('name', name).then(({ error }) => { if (error) console.warn(error); });
      return { ok: true };
    },
    // 存檔：先更新本機快取，再背景上傳（同一個角色短時間內多次存檔只上傳最後一次）
    save(session, data) {
      const B = SupabaseBackend; if (!B.cache || !B.user) return { ok: false };
      B.cache.chars[data.name] = data;
      B.pendingSave = B.pendingSave || {};
      B.pendingSave[data.name] = data;
      if (!B.saveTimer) B.saveTimer = setTimeout(() => B.flushSaves(), 1500);
      return { ok: true };
    },
  },
  async flushSaves() {
    this.saveTimer = null;
    const list = Object.values(this.pendingSave || {}); this.pendingSave = {};
    for (const d of list) {
      const { error } = await this.sb.from('characters').update({ data: d, updated_at: new Date().toISOString() }).eq('owner', this.user.id).eq('name', d.name);
      if (error) { console.warn('存檔失敗', error); if (typeof UI !== 'undefined' && G.running) UI.log('存檔上傳失敗：' + sbErr(error) + '（稍後會再試）', 'warn'); this.pendingSave[d.name] = d; if (!this.saveTimer) this.saveTimer = setTimeout(() => this.flushSaves(), 15000); }
    }
  },
  async logout() { try { await this.call('leave'); await this.sb.auth.signOut(); } catch (e) { /* */ } this.user = null; this.cache = null; },
};
// 關閉分頁前把還沒上傳的存檔送出
window.addEventListener('beforeunload', () => { if (SupabaseBackend.saveTimer) SupabaseBackend.flushSaves(); });
