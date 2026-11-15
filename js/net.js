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
      for (const acc of Object.values(db.accounts)) if (acc.chars[data.name]) return { ok: false, error: '這個名稱已經有人使用了。' };
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

const Net = {
  backend: LocalBackend,
  session: null,
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
