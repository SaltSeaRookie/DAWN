'use strict';
// ===== 網路層（目前為本機模式）=====
// 遊戲邏輯只透過 Net 存取帳號、角色與玩家指令。將來改成多人連線時，
// 只要實作一個相同介面的 RemoteBackend（WebSocket／HTTP）並設定 Net.backend 即可，
// 遊戲與介面程式碼不需要改動。
//
// 介面：
//   auth.login(account, password)      -> { ok, error, session }
//   auth.register(account, password)   -> { ok, error, session }
//   chars.list(session)                -> [角色摘要]
//   chars.create(session, data)        -> { ok, error }
//   chars.remove(session, name)        -> { ok }
//   chars.load(session, name)          -> 角色存檔
//   chars.save(session, data)          -> { ok }
//   intent(type, payload)              -> 玩家行為（move/attack/cast/useItem/pickup/talk/chat…）
//                                         本機模式直接交給 LocalServer 處理；連線模式送到伺服器
const STORE_KEY = 'dawnlands_v2';
const MAX_CHARS = 4;

async function hashPassword(pw, salt) {
  const text = salt + ':' + pw;
  try {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { /* 改用備援 */ }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'f' + (h >>> 0).toString(16);
}

const LocalBackend = {
  name: 'local',
  db() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { accounts: {} }; } catch (e) { return { accounts: {} }; } },
  write(db) { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); return true; } catch (e) { return false; } },
  auth: {
    async login(account, pw) {
      const db = LocalBackend.db(), a = db.accounts[account];
      if (!a) return { ok: false, error: 'noaccount' };
      if ((await hashPassword(pw, a.salt)) !== a.hash) return { ok: false, error: '密碼錯誤。' };
      return { ok: true, session: { account } };
    },
    async register(account, pw) {
      if (!/^[A-Za-z0-9_]{3,16}$/.test(account)) return { ok: false, error: '帳號需為 3～16 個英數字或底線。' };
      if (pw.length < 4) return { ok: false, error: '密碼至少需要 4 個字元。' };
      const db = LocalBackend.db();
      if (db.accounts[account]) return { ok: false, error: '帳號已存在。' };
      const salt = Math.random().toString(36).slice(2, 10);
      db.accounts[account] = { salt, hash: await hashPassword(pw, salt), chars: {}, created: Date.now() };
      if (!LocalBackend.write(db)) return { ok: false, error: '無法寫入瀏覽器儲存空間。' };
      return { ok: true, session: { account } };
    },
  },
  // 帳號層級的設定（例如管理員權限）
  meta: {
    get(session, key) { const a = LocalBackend.db().accounts[session.account]; return a ? a[key] : undefined; },
    set(session, key, val) { const db = LocalBackend.db(), a = db.accounts[session.account]; if (a) { a[key] = val; LocalBackend.write(db); } },
  },
  chars: {
    list(session) {
      const a = LocalBackend.db().accounts[session.account]; if (!a) return [];
      return Object.values(a.chars).sort((x, y) => (x.created || 0) - (y.created || 0));
    },
    create(session, data) {
      const db = LocalBackend.db(), a = db.accounts[session.account];
      if (!a) return { ok: false, error: '帳號不存在。' };
      if (Object.keys(a.chars).length >= MAX_CHARS) return { ok: false, error: '角色欄位已滿。' };
      const low = data.name.toLowerCase();
      for (const acc of Object.values(db.accounts)) for (const n of Object.keys(acc.chars)) if (n.toLowerCase() === low) return { ok: false, error: '這個名稱已經有人使用了。' };
      if (typeof isReservedName === 'function' && isReservedName(data.name)) return { ok: false, error: '這個名稱是保留名稱，請換一個。' };
      data.created = Date.now();
      a.chars[data.name] = data;
      return LocalBackend.write(db) ? { ok: true } : { ok: false, error: '儲存失敗。' };
    },
    remove(session, name) {
      const db = LocalBackend.db(), a = db.accounts[session.account];
      if (a && a.chars[name]) { delete a.chars[name]; LocalBackend.write(db); }
      return { ok: true };
    },
    load(session, name) { const a = LocalBackend.db().accounts[session.account]; return a ? a.chars[name] : null; },
    save(session, data) {
      const db = LocalBackend.db(), a = db.accounts[session.account];
      if (!a) return { ok: false };
      a.chars[data.name] = data;
      return { ok: LocalBackend.write(db) };
    },
  },
};

// ===== 連線模式：WebSocket 伺服器（server/server.js）=====
// 帳號、角色存檔、聊天與玩家位置由伺服器處理；怪物與戰鬥仍在瀏覽器計算。
// 角色資料在登入時整批取得並保留在本機快取，所以 list/load 仍是同步的。
const RemoteBackend = {
  name: 'remote',
  ws: null, url: '', rid: 0, pending: new Map(), cache: null, token: null, connected: false, listeners: {}, online: 0,
  on(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
  emit(t, m) { for (const fn of this.listeners[t] || []) { try { fn(m); } catch (e) { console.error(e); } } },
  open(url, timeout = 2500) {
    this.url = url;
    return new Promise((resolve) => {
      let done = false;
      const fin = (ok) => { if (done) return; done = true; clearTimeout(tm); resolve(ok); };
      let ws;
      try { ws = new WebSocket(url); } catch (e) { resolve(false); return; }
      const tm = setTimeout(() => { try { ws.close(); } catch (e) { /* */ } fin(false); }, timeout);
      ws.onopen = async () => {
        this.ws = ws; this.connected = true;
        const r = await this.call('hello', {}, 2000);
        if (r && r.ok) this.online = r.online || 0;
        fin(!!(r && r.ok));
      };
      ws.onerror = () => fin(false);
      ws.onclose = () => {
        fin(false);
        if (this.ws !== ws) return;
        this.ws = null; this.connected = false;
        for (const [, p] of this.pending) p({ ok: false, error: '與伺服器的連線中斷了。' });
        this.pending.clear();
        this.emit('close', {});
      };
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.re !== undefined) { const p = this.pending.get(m.re); if (p) { this.pending.delete(m.re); p(m); } return; }
        this.emit(m.t, m);
      };
    });
  },
  call(t, data, timeout = 8000) {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== 1) { resolve({ ok: false, error: '尚未連線到伺服器。' }); return; }
      const rid = ++this.rid;
      this.pending.set(rid, resolve);
      setTimeout(() => { if (this.pending.has(rid)) { this.pending.delete(rid); resolve({ ok: false, error: '伺服器沒有回應。' }); } }, timeout);
      this.ws.send(JSON.stringify(Object.assign({ t, rid }, data)));
    });
  },
  post(t, data) { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(Object.assign({ t }, data))); return true; } return false; },
  setCache(r) { this.cache = { chars: {}, meta: r.meta || {} }; for (const c of r.chars || []) this.cache.chars[c.name] = c; this.token = r.token; },
  // 斷線後自動重新連線並恢復登入
  async reconnect() {
    if (!this.token) return false;
    if (!(await this.open(this.url))) return false;
    const r = await this.call('resume', { token: this.token });
    if (!r.ok) return false;
    this.setCache(r);
    return true;
  },
  auth: {
    async login(account, pw) {
      const r = await RemoteBackend.call('login', { account, pw });
      if (!r.ok) return r;
      RemoteBackend.setCache(r);
      return { ok: true, session: { account: r.account } };
    },
    async register(account, pw) {
      const r = await RemoteBackend.call('register', { account, pw });
      if (!r.ok) return r;
      RemoteBackend.setCache(r);
      return { ok: true, session: { account: r.account } };
    },
  },
  meta: {
    get(session, key) { const c = RemoteBackend.cache; return c ? c.meta[key] : undefined; },
    set(session, key, val) { const c = RemoteBackend.cache; if (c) c.meta[key] = val; RemoteBackend.call('meta', { key, val }); },
  },
  chars: {
    list() { const c = RemoteBackend.cache; return c ? Object.values(c.chars).sort((x, y) => (x.created || 0) - (y.created || 0)) : []; },
    async create(session, data) {
      if (typeof isReservedName === 'function' && isReservedName(data.name)) return { ok: false, error: '這個名稱是保留名稱，請換一個。' };
      const r = await RemoteBackend.call('create', { data });
      if (r.ok) { data.created = data.created || Date.now(); RemoteBackend.cache.chars[data.name] = data; }
      return r;
    },
    remove(session, name) { if (RemoteBackend.cache) delete RemoteBackend.cache.chars[name]; RemoteBackend.call('remove', { name }); return { ok: true }; },
    load(session, name) { const c = RemoteBackend.cache; return c ? JSON.parse(JSON.stringify(c.chars[name] || null)) : null; },
    save(session, data) {
      if (RemoteBackend.cache) RemoteBackend.cache.chars[data.name] = data;
      const ok = RemoteBackend.post('save', { data });
      return { ok, error: ok ? '' : '與伺服器斷線，存檔暫存在本機，重新連線後會再上傳。' };
    },
  },
};

const Net = {
  backend: LocalBackend,
  session: null,
  get online() { return this.backend === RemoteBackend; },
  // 尋找伺服器：網址參數 ?server=wss://… 優先；用 http(s) 開啟時嘗試同一台主機的 /ws；?offline 強制本機模式
  serverUrl() {
    const q = new URLSearchParams(location.search);
    if (q.has('offline')) return null;
    if (q.get('server')) return q.get('server');
    try { const s = localStorage.getItem('dawnlands_server'); if (s) return s; } catch (e) { /* */ }
    if (!/^https?:$/.test(location.protocol)) return null;
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  },
  async autoConnect() {
    const url = this.serverUrl();
    if (url && await RemoteBackend.open(url)) { this.backend = RemoteBackend; return true; }
    this.backend = LocalBackend;
    return false;
  },
  useLocal() { this.backend = LocalBackend; try { if (RemoteBackend.ws) RemoteBackend.ws.close(); } catch (e) { /* */ } },
  get auth() { return this.backend.auth; },
  get chars() { return this.backend.chars; },
  get meta() { return this.backend.meta; },
  // 玩家指令：本機模式直接執行，連線模式改送到伺服器
  handlers: {},
  on(type, fn) { this.handlers[type] = fn; },
  intent(type, payload) {
    if (this.backend.send) { this.backend.send({ type, payload }); return; }
    const h = this.handlers[type];
    if (h) h(payload || {});
  },
};
