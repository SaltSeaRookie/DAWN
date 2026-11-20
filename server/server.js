'use strict';
// ===== 晨曦大陸 Dawnlands 多人連線伺服器（第一階段）=====
// 負責：帳號、角色存檔、聊天，以及同步玩家的位置與外觀。
// 怪物、戰鬥與掉寶仍由每位玩家的瀏覽器各自計算。
//
// 啟動：cd server && npm install && npm start
// 環境變數：PORT（預設 8080）、DATA_DIR（預設 server/data）
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = +process.env.PORT || 8080;
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MAX_CHARS = 4;
const MAX_SAVE_BYTES = 400 * 1024;
const SAY_RANGE = 22;
const PROTOCOL = 1;

// ---------- 資料庫（JSON 檔，延遲寫入）----------
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { accounts: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { /* 新的資料庫 */ }
db.accounts = db.accounts || {};
let dirty = false;
function markDirty() { dirty = true; }
function flush() {
  if (!dirty) return;
  dirty = false;
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}
setInterval(flush, 2000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { try { flush(); } finally { process.exit(0); } });

function hashPw(pw, salt) { return crypto.scryptSync(String(pw), salt, 32).toString('hex'); }
function findCharOwner(name) {
  const low = name.toLowerCase();
  for (const [acc, a] of Object.entries(db.accounts)) for (const n of Object.keys(a.chars)) if (n.toLowerCase() === low) return acc;
  return null;
}

// ---------- 靜態檔案（遊戲本身）----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mid': 'audio/midi', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); res.end(); return; }
  if (p === '/status') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ online: clients.size, protocol: PROTOCOL })); return; }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  const rel = path.relative(ROOT, file);
  // 不提供伺服器程式、資料與隱藏檔
  if (rel.startsWith('..') || rel.split(path.sep).some((s) => s.startsWith('.')) || rel.startsWith('server' + path.sep) || rel === 'server') { res.writeHead(404); res.end('Not found'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': p.endsWith('version.json') ? 'no-store' : 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});

// ---------- 連線 ----------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_SAVE_BYTES + 4096 });
const clients = new Set();          // 所有連線
const byAccount = new Map();        // 帳號 -> 連線
const tokens = new Map();           // 重新連線用的憑證 -> 帳號
let nextId = 1;

function send(c, msg) { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); }
function inWorld() { return [...clients].filter((c) => c.char); }
function pub(c) { return Object.assign({ id: c.id, name: c.char }, c.state, { look: c.look }); }
function broadcast(msg, except) { const s = JSON.stringify(msg); for (const c of clients) if (c !== except && c.char && c.ws.readyState === 1) c.ws.send(s); }
function cleanText(t, max = 60) { return String(t || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max); }
function onlineCount() { return inWorld().length; }

function leaveWorld(c, quiet) {
  if (!c.char) return;
  const name = c.char;
  c.char = null; c.state = null; c.look = null;
  broadcast({ t: 'part', id: c.id, name, quiet: !!quiet });
}
function accountView(acc) {
  const a = db.accounts[acc];
  return { chars: Object.values(a.chars), meta: a.meta || {} };
}
function login(c, acc) {
  const old = byAccount.get(acc);
  if (old && old !== c) { send(old, { t: 'kicked', reason: '你的帳號從其他地方登入了。' }); leaveWorld(old, true); old.account = null; try { old.ws.close(); } catch (e) { /* */ } }
  c.account = acc; byAccount.set(acc, c);
  c.token = crypto.randomBytes(18).toString('base64url');
  tokens.set(c.token, acc);
}

const handlers = {
  hello(c) { return { ok: true, protocol: PROTOCOL, online: onlineCount() }; },
  register(c, m) {
    const acc = String(m.account || ''), pw = String(m.pw || '');
    if (!/^[A-Za-z0-9_]{3,16}$/.test(acc)) return { ok: false, error: '帳號需為 3～16 個英數字或底線。' };
    if (pw.length < 4 || pw.length > 64) return { ok: false, error: '密碼需為 4～64 個字元。' };
    if (Object.keys(db.accounts).some((k) => k.toLowerCase() === acc.toLowerCase())) return { ok: false, error: '帳號已存在。' };
    const salt = crypto.randomBytes(12).toString('hex');
    db.accounts[acc] = { salt, hash: hashPw(pw, salt), chars: {}, meta: {}, created: Date.now() };
    markDirty();
    login(c, acc);
    return Object.assign({ ok: true, account: acc, token: c.token }, accountView(acc));
  },
  login(c, m) {
    const acc = String(m.account || ''), a = db.accounts[acc];
    if (!a) return { ok: false, error: 'noaccount' };
    if (hashPw(m.pw, a.salt) !== a.hash) return { ok: false, error: '密碼錯誤。' };
    login(c, acc);
    return Object.assign({ ok: true, account: acc, token: c.token }, accountView(acc));
  },
  // 斷線後用憑證重新連上（不需要再輸入密碼）
  resume(c, m) {
    const acc = tokens.get(String(m.token || ''));
    if (!acc || !db.accounts[acc]) return { ok: false, error: '登入已失效，請重新登入。' };
    tokens.delete(m.token);
    login(c, acc);
    return Object.assign({ ok: true, account: acc, token: c.token }, accountView(acc));
  },
  create(c, m) {
    const a = db.accounts[c.account], d = m.data;
    if (!d || typeof d !== 'object') return { ok: false, error: '資料錯誤。' };
    const name = String(d.name || '');
    if (!/^[一-鿿A-Za-z0-9]{2,8}$/.test(name)) return { ok: false, error: '名稱需為 2～8 個中文、英文或數字。' };
    if (Object.keys(a.chars).length >= MAX_CHARS) return { ok: false, error: '角色欄位已滿。' };
    if (findCharOwner(name)) return { ok: false, error: '這個名稱已經有人使用了。' };
    if (JSON.stringify(d).length > MAX_SAVE_BYTES) return { ok: false, error: '存檔太大。' };
    d.created = Date.now();
    a.chars[name] = d; markDirty();
    return { ok: true };
  },
  save(c, m) {
    const a = db.accounts[c.account], d = m.data;
    if (!d || !a.chars[d.name]) return { ok: false, error: '找不到角色。' };
    if (JSON.stringify(d).length > MAX_SAVE_BYTES) return { ok: false, error: '存檔太大。' };
    a.chars[d.name] = d; markDirty();
    return { ok: true };
  },
  remove(c, m) {
    const a = db.accounts[c.account];
    if (c.char === m.name) return { ok: false, error: '角色正在遊戲中。' };
    delete a.chars[m.name]; markDirty();
    return { ok: true };
  },
  meta(c, m) {
    if (!['gm'].includes(m.key)) return { ok: false };
    const a = db.accounts[c.account]; a.meta = a.meta || {};
    a.meta[m.key] = !!m.val; markDirty();
    return { ok: true };
  },
  // 進入世界：通知其他玩家，並取得目前在線的玩家
  enter(c, m) {
    const a = db.accounts[c.account];
    if (!a.chars[m.name]) return { ok: false, error: '找不到角色。' };
    for (const o of clients) if (o !== c && o.char === m.name) leaveWorld(o, true);
    leaveWorld(c, true);
    c.char = m.name; c.state = cleanState(m.state || {}); c.look = cleanLook(m.look);
    c.chatTimes = [];
    broadcast({ t: 'join', p: pub(c) }, c);
    return { ok: true, id: c.id, players: inWorld().filter((o) => o !== c).map(pub) };
  },
  leave(c) { leaveWorld(c); return { ok: true }; },
  who(c) { return { ok: true, players: inWorld().map((o) => ({ name: o.char, level: o.state.level, cls: o.state.cls, map: o.state.map, clan: o.state.clan })) }; },
};

function cleanState(s) {
  const n = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
  return {
    map: cleanText(s.map, 16) || 'overworld', x: n(s.x), y: n(s.y), dir: n(s.dir) | 0, moving: !!s.moving, atk: !!s.atk, dead: !!s.dead,
    level: n(s.level, 1) | 0, cls: cleanText(s.cls, 12), align: n(s.align) | 0, pink: !!s.pink, crown: !!s.crown,
    clan: s.clan ? cleanText(s.clan, 12) : null, emblem: s.emblem && typeof s.emblem === 'object' ? s.emblem : null, hp: n(s.hp, 1),
  };
}
function cleanLook(l) { if (!l || typeof l !== 'object') return null; const s = JSON.stringify(l); return s.length < 2000 ? l : null; }

// 不需要回覆的即時訊息
const events = {
  state(c, m) {
    if (!c.char) return;
    const prevMap = c.state.map;
    c.state = cleanState(Object.assign({}, c.state, m.s));
    const out = { t: 'st', id: c.id, s: c.state };
    if (m.look) { c.look = cleanLook(m.look); out.look = c.look; }
    if (prevMap !== c.state.map) out.mapChange = true;
    broadcast(out, c);
  },
  chat(c, m) {
    if (!c.char) return;
    const text = cleanText(m.text);
    if (!text) return;
    const now = Date.now();
    c.chatTimes = (c.chatTimes || []).filter((t) => now - t < 6000);
    if (c.chatTimes.length >= 6) { send(c, { t: 'chat', ch: 'sys', text: '說話太快了，請稍等一下。' }); return; }
    c.chatTimes.push(now);
    const msg = { t: 'chat', ch: m.ch, from: c.char, id: c.id, text };
    if (m.ch === 'say') {
      for (const o of inWorld()) if (o !== c && o.state.map === c.state.map && Math.hypot(o.state.x - c.state.x, o.state.y - c.state.y) < SAY_RANGE) send(o, msg);
    } else if (m.ch === 'world') {
      broadcast(msg, c);
    } else if (m.ch === 'whisper') {
      const to = String(m.to || '').toLowerCase();
      const o = inWorld().find((x) => x.char.toLowerCase() === to);
      if (!o) { send(c, { t: 'chat', ch: 'sys', text: (m.to || '') + ' 目前不在線上。' }); return; }
      send(o, msg);
    } else if (m.ch === 'clan') {
      const clan = c.state.clan; if (!clan) return;
      for (const o of inWorld()) if (o !== c && o.state.clan === clan) send(o, msg);
    }
  },
};

wss.on('connection', (ws) => {
  const c = { ws, id: nextId++, account: null, char: null, state: null, look: null, alive: true };
  clients.add(c);
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (events[m.t]) { if (c.account) events[m.t](c, m); return; }
    const h = handlers[m.t];
    let r;
    if (!h) r = { ok: false, error: '未知的指令。' };
    else if (!c.account && !['hello', 'login', 'register', 'resume'].includes(m.t)) r = { ok: false, error: '尚未登入。' };
    else { try { r = h(c, m); } catch (e) { console.error(e); r = { ok: false, error: '伺服器錯誤。' }; } }
    if (m.rid !== undefined) send(c, Object.assign({ re: m.rid }, r));
  });
  ws.on('close', () => {
    leaveWorld(c);
    clients.delete(c);
    if (c.account && byAccount.get(c.account) === c) byAccount.delete(c.account);
  });
});
// 偵測斷線
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) { try { c.ws.terminate(); } catch (e) { /* */ } continue; }
    c.alive = false; try { c.ws.ping(); } catch (e) { /* */ }
  }
}, 30000);

server.listen(PORT, () => console.log('晨曦大陸伺服器已啟動：http://localhost:' + PORT + '/  （資料：' + DB_FILE + '）'));
