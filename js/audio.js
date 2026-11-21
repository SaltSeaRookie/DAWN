'use strict';
// ===== 音訊：MIDI 背景音樂（Web Audio 合成）＋ 程序化音效，兩者可獨立開關 =====
const AUDIO_KEY = 'dawnlands_audio_v1';

// ---------- MIDI 解析 ----------
function parseMidi(bytes) {
  let p = 0;
  const u32 = () => { const v = (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]; p += 4; return v >>> 0; };
  const u16 = () => { const v = (bytes[p] << 8) | bytes[p + 1]; p += 2; return v; };
  const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[p + i]); p += n; return s; };
  if (str(4) !== 'MThd') throw new Error('不是 MIDI 檔');
  const hl = u32(); u16(); const ntr = u16(); const div = u16(); p += hl - 6;
  const raw = []; // {tick, type, ch, a, b, tempo}
  for (let t = 0; t < ntr; t++) {
    if (str(4) !== 'MTrk') break;
    const len = u32(), end = p + len;
    let tick = 0, run = 0;
    const vlq = () => { let v = 0, c; do { c = bytes[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80); return v; };
    while (p < end) {
      tick += vlq();
      let s = bytes[p];
      if (s === 0xff) {
        const ty = bytes[p + 1]; p += 2; const l = vlq();
        if (ty === 0x51) raw.push({ tick, type: 'tempo', tempo: (bytes[p] << 16) | (bytes[p + 1] << 8) | bytes[p + 2] });
        p += l; continue;
      }
      if (s === 0xf0 || s === 0xf7) { p++; p += vlq(); continue; }
      if (s & 0x80) { run = s; p++; }
      const st = run >> 4, ch = run & 15;
      const a = bytes[p++], b = (st === 0xc || st === 0xd) ? 0 : bytes[p++];
      if (st === 0x9 && b > 0) raw.push({ tick, type: 'on', ch, a, b });
      else if (st === 0x8 || (st === 0x9 && b === 0)) raw.push({ tick, type: 'off', ch, a });
      else if (st === 0xb) raw.push({ tick, type: 'cc', ch, a, b });
      else if (st === 0xc) raw.push({ tick, type: 'prog', ch, a });
      else if (st === 0xe) raw.push({ tick, type: 'bend', ch, v: ((b << 7) | a) - 8192 });
    }
    p = end;
  }
  // 依 tick 排序並換算秒數
  raw.sort((x, y) => x.tick - y.tick || (x.type === 'tempo' ? -1 : 0));
  let tempo = 500000, lastTick = 0, sec = 0;
  for (const e of raw) {
    sec += ((e.tick - lastTick) * tempo) / div / 1e6; lastTick = e.tick;
    e.t = sec;
    if (e.type === 'tempo') tempo = e.tempo;
  }
  // 配對音符
  const open = {}, notes = [], ctrl = [];
  for (const e of raw) {
    if (e.type === 'on') { const k = e.ch * 128 + e.a; (open[k] = open[k] || []).push(e); }
    else if (e.type === 'off') {
      const k = e.ch * 128 + e.a; const on = open[k] && open[k].shift();
      if (on) notes.push({ t: on.t, end: Math.max(on.t + 0.03, e.t), ch: e.ch, n: e.a, v: on.b });
    } else if (e.type !== 'tempo') ctrl.push(e);
  }
  for (const k in open) for (const on of open[k]) notes.push({ t: on.t, end: on.t + 1, ch: on.ch, n: on.a, v: on.b });
  const events = notes.map((n) => Object.assign({ type: 'note' }, n)).concat(ctrl);
  events.sort((a, b) => a.t - b.t || (a.type === 'note' ? 1 : -1));
  const duration = Math.max(...notes.map((n) => n.end), 1);
  return { events, duration };
}

// ---------- 主控 ----------
const Snd = {
  ctx: null, ready: false,
  musicOn: true, sfxOn: true,
  init() {
    try { const s = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}'); if (s.music === false) this.musicOn = false; if (s.sfx === false) this.sfxOn = false; } catch (e) { /* */ }
  },
  save() { try { localStorage.setItem(AUDIO_KEY, JSON.stringify({ music: this.musicOn, sfx: this.sfxOn })); } catch (e) { /* */ } },
  // 必須在使用者操作後呼叫
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(c.destination);
      this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicOn ? 0.55 : 0;
      this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.8 : 0;
      // 簡單殘響
      this.reverb = c.createConvolver(); this.reverb.buffer = this.makeImpulse(2.2, 2.5);
      const wet = c.createGain(); wet.gain.value = 0.28;
      this.musicBus.connect(this.master); this.musicBus.connect(this.reverb);
      this.reverb.connect(wet); wet.connect(this.master);
      this.sfxBus.connect(this.master);
      const sfxWet = c.createGain(); sfxWet.gain.value = 0.15; this.sfxBus.connect(sfxWet); sfxWet.connect(this.reverb);
      this.noise = this.makeNoise();
      this.ready = true;
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
      });
      if (this.musicOn) Music.start();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  makeNoise() {
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  },
  makeImpulse(sec, decay) {
    const c = this.ctx, len = c.sampleRate * sec, b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  },
  setMusic(on) {
    this.musicOn = on; this.save();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(on ? 0.55 : 0, now, 0.15);
    if (on) Music.start(); else setTimeout(() => { if (!this.musicOn) Music.stop(); }, 600);
  },
  setSfx(on) {
    this.sfxOn = on; this.save();
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
  },
};

// ---------- 樂器合成 ----------
const midiFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);
function instrumentFor(prog) {
  // [波形, 起音, 衰減到的比例, 衰減時間, 釋音, 濾波, 音量, 選項]
  const f = prog >> 3;
  if (prog === 47) return { kind: 'timpani' };
  // 區域音樂用到的特定樂器
  if (prog >= 8 && prog <= 10) return { wave: 'sine', wave2: 'sine', det: 1200, mix2: 0.35, a: 0.002, sus: 0.0, d: 1.8, r: 0.5, filt: 7000, vol: 0.55 };   // 鋼片琴、音樂盒
  if (prog === 12 || prog === 13) return { wave: 'sine', wave2: 'triangle', det: 2400, mix2: 0.2, a: 0.002, sus: 0.0, d: 0.5, r: 0.15, filt: 5000, vol: 0.95 };   // 馬林巴
  if (prog === 14) return { wave: 'sine', wave2: 'triangle', det: 1530, mix2: 0.4, a: 0.002, sus: 0.0, d: 3.0, r: 1.0, filt: 5000, vol: 0.45 };   // 管鐘
  if (prog === 30 || prog === 29) return { wave: 'sawtooth', wave2: 'square', det: 10, mix2: 0.5, a: 0.005, sus: 0.7, d: 0.3, r: 0.1, filt: 1700, vol: 0.3 };   // 電吉他
  if (prog === 46) return { wave: 'triangle', wave2: 'sine', det: 1200, mix2: 0.3, a: 0.003, sus: 0.0, d: 1.4, r: 0.4, filt: 3500, vol: 0.8 };   // 豎琴
  if (prog >= 52 && prog <= 54) return { wave: 'sine', wave2: 'triangle', det: 7, mix2: 0.6, a: 0.35, sus: 0.9, d: 0.5, r: 0.8, filt: 1800, vol: 0.45, vib: 4 };   // 合唱
  if (prog >= 104 && prog <= 107) return { wave: 'sawtooth', wave2: 'triangle', det: 3, mix2: 0.5, a: 0.002, sus: 0.0, d: 0.9, r: 0.2, filt: 2600, fenv: 0.6, vol: 0.5 };   // 西塔琴、班卓琴、日本琴
  if (prog === 114) return { wave: 'sine', wave2: 'triangle', det: 1900, mix2: 0.35, a: 0.003, sus: 0.0, d: 0.7, r: 0.3, filt: 4000, vol: 0.7 };   // 鋼鼓
  if (prog >= 120) return { kind: 'noise', a: 0.15, d: 0.3, sus: 0.8, r: 0.4, vol: 0.25, filt: 900 };
  if (prog >= 96 && prog <= 103) return { wave: 'sine', wave2: 'triangle', det: 12, a: 0.25, sus: 0.6, d: 1.5, r: 1.2, filt: 3000, vol: 0.5 };
  switch (f) {
    case 0: return { wave: 'triangle', wave2: 'sine', det: 1200, a: 0.005, sus: 0.0, d: 1.6, r: 0.25, filt: 4000, vol: 0.9 };
    case 1: return { wave: 'sine', wave2: 'sine', det: 2400, a: 0.002, sus: 0.0, d: 1.2, r: 0.3, filt: 6000, vol: 0.7 };
    case 2: return { wave: 'square', wave2: 'sine', det: 1200, a: 0.03, sus: 0.85, d: 0.3, r: 0.12, filt: 2200, vol: 0.32 };
    case 3: return { wave: 'sawtooth', a: 0.003, sus: 0.0, d: 0.9, r: 0.15, filt: 2000, fenv: 1, vol: 0.45 };
    case 4: return { wave: 'triangle', wave2: 'square', det: 0, mix2: 0.25, a: 0.01, sus: 0.6, d: 0.5, r: 0.1, filt: 700, vol: 1.1 };
    case 5: return { wave: 'sawtooth', wave2: 'sawtooth', det: 8, a: 0.12, sus: 0.85, d: 0.4, r: 0.4, filt: 1800, vol: 0.38 };
    case 6: return { wave: 'sawtooth', wave2: 'sawtooth', det: 10, a: 0.2, sus: 0.85, d: 0.5, r: 0.6, filt: 1600, vol: 0.38 };
    case 7: return { wave: 'sawtooth', a: 0.05, sus: 0.75, d: 0.3, r: 0.18, filt: 1400, fenv: 0.8, vol: 0.45 };
    case 8: return { wave: 'square', a: 0.04, sus: 0.8, d: 0.3, r: 0.12, filt: 1500, vol: 0.32, vib: 4 };
    case 9: return { wave: 'sine', wave2: 'triangle', det: 1200, mix2: 0.2, a: 0.06, sus: 0.85, d: 0.3, r: 0.15, filt: 5000, vol: 0.65, vib: 5 };
    case 10: return { wave: 'sawtooth', wave2: 'square', det: 7, a: 0.01, sus: 0.7, d: 0.3, r: 0.15, filt: 2500, vol: 0.35 };
    case 11: return { wave: 'sawtooth', wave2: 'triangle', det: 9, a: 0.5, sus: 0.8, d: 1, r: 1.2, filt: 1200, vol: 0.4 };
    default: return { wave: 'triangle', a: 0.02, sus: 0.6, d: 0.5, r: 0.3, filt: 3000, vol: 0.5 };
  }
}

const Music = {
  song: null, playing: false, timer: null, cursor: 0, base: 0, chans: [], voices: [],
  songs: {}, current: 'login',
  load() {
    if (!this.songs.theme && typeof composeDawnTheme === 'function') this.songs.theme = composeDawnTheme();
    if (!this.songs.login) this.songs.login = composeLoginTheme();
    if (!this.songs[this.current] && typeof composeArea === 'function') { const t = composeArea(this.current); if (t) this.songs[this.current] = t; }
    this.song = this.songs[this.current] || this.songs.login;
  },
  // 切換曲目（login＝登入曲，field＝遊戲中）
  play(name) {
    if (this.current === name && this.playing) return;
    this.current = name;
    if (!Snd.ctx || !Snd.musicOn) return;
    if (this.playing) this.stop();
    setTimeout(() => { if (Snd.musicOn && this.current === name) this.start(); }, this.out ? 400 : 0);
  },
  setupChannels() {
    const c = Snd.ctx;
    this.chans = [];
    for (let i = 0; i < 16; i++) {
      const g = c.createGain(); g.gain.value = 100 / 127;
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      if (pan) { g.connect(pan); pan.connect(this.out); } else g.connect(this.out);
      this.chans.push({ g, pan, prog: 0, vol: 100 / 127, expr: 1, bend: 0 });
    }
  },
  start() {
    if (!Snd.ctx) return;
    this.load(); if (!this.song || this.playing) return;
    this.out = Snd.ctx.createGain(); this.out.gain.value = this.song.gain || 1; this.out.connect(Snd.musicBus);
    this.setupChannels();
    this.playing = true; this.cursor = 0; this.base = Snd.ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.pump(), 60);
    this.pump();
  },
  stop() {
    if (!this.playing) return;
    this.playing = false; clearInterval(this.timer);
    const now = Snd.ctx.currentTime;
    this.out.gain.setTargetAtTime(0, now, 0.05);
    const old = this.out; setTimeout(() => old.disconnect(), 500);
    for (const v of this.voices) { try { v.stop(now + 0.3); } catch (e) { /* */ } }
    this.voices = [];
  },
  pump() {
    const c = Snd.ctx, ev = this.song.events, ahead = c.currentTime + 0.5;
    this.voices = this.voices.filter((v) => v.endT > c.currentTime);
    while (true) {
      if (this.cursor >= ev.length) { this.base += this.song.duration + (this.song.loopGap !== undefined ? this.song.loopGap : 1.5); this.cursor = 0; }
      const e = ev[this.cursor];
      const t = this.base + e.t;
      if (t > ahead) break;
      this.cursor++;
      if (t < c.currentTime - 0.05 && e.type === 'note') continue;
      this.handle(e, Math.max(t, c.currentTime));
    }
  },
  handle(e, t) {
    const ch = this.chans[e.ch];
    if (e.type === 'prog') ch.prog = e.a;
    else if (e.type === 'cc') {
      if (e.a === 7) ch.vol = e.b / 127;
      else if (e.a === 11) ch.expr = e.b / 127;
      else if (e.a === 10 && ch.pan) ch.pan.pan.setValueAtTime((e.b - 64) / 64, t);
      if (e.a === 7 || e.a === 11) ch.g.gain.setTargetAtTime(Math.pow(ch.vol * ch.expr, 1.6), t, 0.02);
    } else if (e.type === 'bend') {
      ch.bend = (e.v / 8192) * 200;
      for (const v of this.voices) if (v.ch === e.ch && v.endT > t && v.detune) for (const d of v.detune) d.setValueAtTime(ch.bend + (d._base || 0), t);
    } else if (e.type === 'note') {
      if (e.ch === 9) this.drum(e, t, ch);
      else this.note(e, t, ch);
    }
  },
  note(e, t, ch) {
    const c = Snd.ctx, ins = instrumentFor(ch.prog);
    const dur = e.end - e.t, vel = e.v / 127;
    if (ins.kind === 'timpani') {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(midiFreq(e.n) * 1.5, t); o.frequency.exponentialRampToValueAtTime(midiFreq(e.n), t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.8, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g); g.connect(ch.g); o.start(t); o.stop(t + 1.5);
      this.voices.push({ ch: e.ch, endT: t + 1.5, stop: (x) => o.stop(x) });
      return;
    }
    const peak = vel * vel * 0.4 * ins.vol;
    const g = c.createGain();
    const rel = ins.r, end = t + dur;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + ins.a);
    const susLvl = Math.max(0.0001, peak * ins.sus);
    g.gain.setTargetAtTime(susLvl, t + ins.a, ins.d / 3);
    g.gain.setTargetAtTime(0.0001, end, rel / 4);
    const stopT = end + rel + 0.05;
    if (ins.kind === 'noise') {
      const s = c.createBufferSource(); s.buffer = Snd.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ins.filt; f.Q.value = 0.8;
      s.connect(f); f.connect(g); g.connect(ch.g); s.start(t); s.stop(stopT);
      this.voices.push({ ch: e.ch, endT: stopT, stop: (x) => s.stop(x) });
      return;
    }
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    const cutoff = Math.min(12000, ins.filt * (0.6 + vel * 0.8));
    if (ins.fenv) { f.frequency.setValueAtTime(cutoff * 3, t); f.frequency.setTargetAtTime(cutoff * 0.7, t, 0.15 * ins.fenv); }
    else f.frequency.value = cutoff;
    f.Q.value = 0.7;
    f.connect(g); g.connect(ch.g);
    const freq = midiFreq(e.n);
    const oscs = [], dets = [];
    const mk = (type, det, gain) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
      o.detune.value = ch.bend + det; o.detune._base = det;
      let node = o;
      if (gain !== 1) { const og = c.createGain(); og.gain.value = gain; o.connect(og); node = og; }
      node.connect(f); o.start(t); o.stop(stopT); oscs.push(o); dets.push(o.detune);
      return o;
    };
    mk(ins.wave, 0, 1);
    if (ins.wave2) mk(ins.wave2, ins.det || 0, ins.mix2 || (ins.det && ins.det < 50 ? 0.8 : 0.35));
    if (ins.vib && dur > 0.35) {
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = ins.vib; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(12, t + 0.4);
      lfo.connect(lg); for (const o of oscs) lg.connect(o.detune);
      lfo.start(t); lfo.stop(stopT);
    }
    this.voices.push({ ch: e.ch, endT: stopT, detune: dets, stop: (x) => { for (const o of oscs) o.stop(x); } });
  },
  drum(e, t, ch) {
    const c = Snd.ctx, n = e.n, vel = e.v / 127, out = ch.g;
    const env = (node, peak, decay) => { const g = c.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay); node.connect(g); g.connect(out); return g; };
    const noise = (type, freq, q, peak, decay) => {
      const s = c.createBufferSource(); s.buffer = Snd.noise;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      s.connect(f); env(f, peak, decay); s.start(t, Math.random()); s.stop(t + decay + 0.05);
    };
    const tone = (f0, f1, peak, decay, type = 'sine') => {
      const o = c.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
      env(o, peak, decay); o.start(t); o.stop(t + decay + 0.05);
    };
    const v = vel * 0.9;
    if (n === 35 || n === 36) { tone(140, 45, v * 1.4, 0.35); noise('lowpass', 1200, 1, v * 0.2, 0.03); }
    else if (n === 38 || n === 40 || n === 37 || n === 39) { tone(220, 160, v * 0.5, 0.12, 'triangle'); noise('highpass', 1800, 0.8, v * 0.6, 0.18); }
    else if (n === 42 || n === 44) noise('highpass', 7500, 1, v * 0.32, 0.05);
    else if (n === 46) noise('highpass', 7000, 1, v * 0.3, 0.3);
    else if (n === 49 || n === 57 || n === 52 || n === 55) noise('highpass', 5000, 0.5, v * 0.35, 1.4);
    else if (n === 51 || n === 59 || n === 53) { noise('bandpass', 6000, 2, v * 0.25, 0.6); tone(3200, 3100, v * 0.05, 0.6, 'square'); }
    else if (n >= 41 && n <= 50) { const f = 80 + (n - 41) * 22; tone(f * 1.6, f, v, 0.4); }
    else noise('bandpass', 2500, 1.5, v * 0.25, 0.1);
  },
};

// ---------- 音效 ----------
const SFX = {
  last: {},
  play(name, x, y) {
    if (!Snd.ready || !Snd.sfxOn) return;
    const c = Snd.ctx;
    // 避免同一音效同時大量疊加
    if (this.last[name] && c.currentTime - this.last[name] < 0.04) return;
    this.last[name] = c.currentTime;
    let vol = 1;
    if (x !== undefined && G.player) { const d = dist(x, y, G.player.x, G.player.y); if (d > 16) return; vol = clamp(1.15 - d / 14, 0.15, 1); }
    const fn = this.lib[name]; if (fn) fn(c, c.currentTime + 0.005, vol);
  },
  // 小工具
  out(c, vol) { const g = c.createGain(); g.gain.value = vol; g.connect(Snd.sfxBus); return g; },
  tone(c, dest, t, type, f0, f1, peak, a, dur) {
    const o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  },
  noise(c, dest, t, type, f0, f1, q, peak, a, dur) {
    const s = c.createBufferSource(); s.buffer = Snd.noise;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  },
};
SFX.lib = {
  swing(c, t, v) { const o = SFX.out(c, v); SFX.noise(c, o, t, 'bandpass', 600, 2600, 1.2, 0.5, 0.04, 0.18); },
  bow(c, t, v) { const o = SFX.out(c, v); SFX.tone(c, o, t, 'triangle', 420, 180, 0.35, 0.003, 0.18); SFX.noise(c, o, t, 'highpass', 3000, 3000, 1, 0.15, 0.002, 0.06); SFX.noise(c, o, t + 0.02, 'bandpass', 1500, 4000, 1, 0.15, 0.03, 0.2); },
  hit(c, t, v) { const o = SFX.out(c, v); SFX.tone(c, o, t, 'sine', 160, 50, 0.7, 0.003, 0.16); SFX.noise(c, o, t, 'lowpass', 2500, 400, 1, 0.45, 0.002, 0.09); },
  crit(c, t, v) { SFX.lib.hit(c, t, v); const o = SFX.out(c, v); SFX.tone(c, o, t, 'square', 1800, 1700, 0.08, 0.002, 0.25); SFX.tone(c, o, t + 0.03, 'sine', 2600, 2500, 0.12, 0.002, 0.3); },
  miss(c, t, v) { const o = SFX.out(c, v * 0.7); SFX.noise(c, o, t, 'bandpass', 3000, 1200, 2, 0.3, 0.02, 0.12); },
  hurt(c, t, v) { const o = SFX.out(c, v); SFX.tone(c, o, t, 'sawtooth', 200, 90, 0.25, 0.005, 0.2); SFX.noise(c, o, t, 'lowpass', 1200, 300, 1, 0.5, 0.002, 0.15); },
  die(c, t, v) { const o = SFX.out(c, v * 0.8); SFX.tone(c, o, t, 'sawtooth', 300, 60, 0.25, 0.01, 0.5); SFX.noise(c, o, t, 'lowpass', 800, 150, 1, 0.3, 0.02, 0.4); },
  bonebreak(c, t, v) { const o = SFX.out(c, v); for (let i = 0; i < 5; i++) SFX.noise(c, o, t + i * 0.035 + Math.random() * 0.02, 'bandpass', 2000 + Math.random() * 2500, 0, 6, 0.4, 0.001, 0.05); },
  coin(c, t, v) { const o = SFX.out(c, v * 0.6); SFX.tone(c, o, t, 'square', 1975, 1975, 0.12, 0.002, 0.09); SFX.tone(c, o, t + 0.07, 'square', 2637, 2637, 0.12, 0.002, 0.25); },
  pickup(c, t, v) { const o = SFX.out(c, v * 0.6); SFX.tone(c, o, t, 'triangle', 600, 1200, 0.3, 0.005, 0.12); },
  potion(c, t, v) { const o = SFX.out(c, v * 0.7); for (let i = 0; i < 6; i++) { const f = 300 + Math.random() * 500; SFX.tone(c, o, t + i * 0.06, 'sine', f, f * 1.8, 0.25, 0.005, 0.07); } },
  heal(c, t, v) { const o = SFX.out(c, v * 0.6); [784, 988, 1175, 1568, 1976].forEach((f, i) => SFX.tone(c, o, t + i * 0.06, 'sine', f, f, 0.2, 0.01, 0.6)); },
  buff(c, t, v) { const o = SFX.out(c, v * 0.6); SFX.tone(c, o, t, 'triangle', 300, 1200, 0.25, 0.05, 0.5); SFX.tone(c, o, t + 0.05, 'sine', 600, 2400, 0.12, 0.05, 0.5); SFX.noise(c, o, t, 'bandpass', 2000, 8000, 3, 0.08, 0.1, 0.5); },
  levelup(c, t, v) { const o = SFX.out(c, v * 0.7); [523, 659, 784, 1047].forEach((f, i) => { SFX.tone(c, o, t + i * 0.1, 'square', f, f, 0.12, 0.01, 0.35); SFX.tone(c, o, t + i * 0.1, 'triangle', f / 2, f / 2, 0.2, 0.01, 0.35); }); SFX.tone(c, o, t + 0.4, 'triangle', 1047, 1047, 0.25, 0.02, 1.2); SFX.tone(c, o, t + 0.4, 'square', 1319, 1319, 0.08, 0.02, 1.2); },
  teleport(c, t, v) { const o = SFX.out(c, v * 0.6); const os = SFX.tone(c, o, t, 'sine', 200, 1600, 0.3, 0.05, 0.6); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 18; lg.gain.value = 300; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + 0.7); SFX.noise(c, o, t, 'bandpass', 500, 6000, 4, 0.12, 0.1, 0.6); },
  enchantOk(c, t, v) { const o = SFX.out(c, v * 0.7); [1047, 1319, 1568, 2093].forEach((f, i) => SFX.tone(c, o, t + i * 0.05, 'sine', f, f, 0.2, 0.005, 0.9)); SFX.noise(c, o, t, 'highpass', 6000, 9000, 1, 0.08, 0.05, 0.8); },
  enchantFail(c, t, v) { const o = SFX.out(c, v); SFX.noise(c, o, t, 'lowpass', 6000, 200, 0.5, 0.6, 0.005, 1.2); SFX.tone(c, o, t, 'sawtooth', 600, 50, 0.2, 0.01, 1.0); },
  death(c, t, v) { const o = SFX.out(c, v * 0.8); [392, 349, 311, 262].forEach((f, i) => SFX.tone(c, o, t + i * 0.28, 'triangle', f, f * 0.98, 0.3, 0.02, 0.5)); },
  click(c, t, v) { const o = SFX.out(c, v * 0.4); SFX.tone(c, o, t, 'square', 1200, 900, 0.1, 0.001, 0.04); },
  open(c, t, v) { const o = SFX.out(c, v * 0.4); SFX.noise(c, o, t, 'bandpass', 800, 1600, 2, 0.2, 0.01, 0.12); },
  quest(c, t, v) { const o = SFX.out(c, v * 0.6); [659, 784, 988].forEach((f, i) => SFX.tone(c, o, t + i * 0.09, 'triangle', f, f, 0.25, 0.01, 0.4)); },
  roar(c, t, v) { const o = SFX.out(c, v); SFX.tone(c, o, t, 'sawtooth', 110, 55, 0.35, 0.1, 1.0); SFX.tone(c, o, t, 'sawtooth', 116, 60, 0.25, 0.1, 1.0); SFX.noise(c, o, t, 'lowpass', 900, 200, 1, 0.5, 0.15, 1.0); },
  fire(c, t, v) { const o = SFX.out(c, v); SFX.noise(c, o, t, 'lowpass', 400, 2500, 0.8, 0.6, 0.15, 0.7); },
  boom(c, t, v) { const o = SFX.out(c, v); SFX.tone(c, o, t, 'sine', 120, 35, 0.8, 0.005, 0.5); SFX.noise(c, o, t, 'lowpass', 1800, 150, 0.8, 0.7, 0.005, 0.6); },
  bark(c, t, v) { const o = SFX.out(c, v * 0.5); for (const d of [0, 0.22]) { SFX.tone(c, o, t + d, 'sawtooth', 520, 300, 0.3, 0.005, 0.09); SFX.noise(c, o, t + d, 'bandpass', 1200, 800, 3, 0.2, 0.005, 0.08); } },
  cast(c, t, v) { const o = SFX.out(c, v * 0.5); SFX.tone(c, o, t, 'sine', 500, 1400, 0.2, 0.02, 0.25); SFX.noise(c, o, t, 'bandpass', 2000, 5000, 4, 0.1, 0.02, 0.25); },
  thunder(c, t, v) { const o = SFX.out(c, v); SFX.noise(c, o, t, 'highpass', 3000, 800, 0.5, 0.7, 0.002, 0.15); SFX.noise(c, o, t + 0.05, 'lowpass', 1500, 80, 0.7, 0.8, 0.01, 1.2); SFX.tone(c, o, t, 'sawtooth', 90, 40, 0.3, 0.01, 0.8); },
  error(c, t, v) { const o = SFX.out(c, v * 0.4); SFX.tone(c, o, t, 'square', 180, 160, 0.15, 0.005, 0.15); },
};
Snd.init();

// ---------- 原創登入曲：王室進行曲（D 大調）----------
// 小號號角開場 → 莊嚴的主題 → 圓號抒情段 → 全樂團再現與結尾。
function composeLoginTheme() {
  const bpm = 92, beat = 60 / bpm, bar = beat * 4;
  const ev = [];
  const prog = (ch, a) => ev.push({ type: 'prog', ch, a, t: 0 });
  const cc = (ch, a, b) => ev.push({ type: 'cc', ch, a, b, t: 0 });
  // 0 弦樂撥奏 1 弦樂 2 小號（主旋律） 3 低音號 4 圓號 5 第二小號 6 圓號（抒情段主旋律） 7 定音鼓 9 鼓組
  prog(0, 45); prog(1, 48); prog(2, 56); prog(3, 58); prog(4, 60); prog(5, 56); prog(6, 60); prog(7, 47);
  cc(0, 7, 60); cc(1, 7, 74); cc(2, 7, 104); cc(3, 7, 92); cc(4, 7, 70); cc(5, 7, 72); cc(6, 7, 96); cc(7, 7, 100); cc(9, 7, 78);
  cc(1, 10, 40); cc(4, 10, 88); cc(5, 10, 80); cc(2, 10, 58); cc(0, 10, 30);
  const note = (ch, n, start, dur, v) => ev.push({ type: 'note', ch, n, v, t: start, end: start + dur });
  // 和弦（根音、和弦內音）
  const CH = { D: [38, [62, 66, 69]], G: [43, [59, 62, 67]], A: [45, [61, 64, 69]], Em: [40, [59, 64, 67]], Bm: [47, [59, 62, 66]] };
  //            開場號角   A 段主題（8 小節）                        B 段抒情（8 小節）                          A' 再現與結尾
  const chords = ['D', 'D', 'D', 'G', 'D', 'A', 'D', 'G', 'A', 'D', 'G', 'D', 'Em', 'A', 'G', 'D', 'Bm', 'A', 'D', 'G', 'D', 'A', 'A', 'D'];
  const MEL = {
    0: [[74, 0, 0.5], [74, 0.5, 0.25], [74, 0.75, 0.25], [78, 1, 1], [81, 2, 2]],
    1: [[86, 0, 2], [81, 2, 0.5], [78, 2.5, 0.5], [74, 3, 1]],
    2: [[74, 0, 1.5], [76, 1.5, 0.5], [78, 2, 1], [74, 3, 1]],
    3: [[79, 0, 1.5], [78, 1.5, 0.5], [76, 2, 1], [74, 3, 1]],
    4: [[78, 0, 1], [81, 1, 1], [86, 2, 1.5], [85, 3.5, 0.5]],
    5: [[83, 0, 2], [81, 2, 1], [76, 3, 1]],
    6: [[74, 0, 1.5], [76, 1.5, 0.5], [78, 2, 1], [81, 3, 1]],
    7: [[83, 0, 1.5], [81, 1.5, 0.5], [79, 2, 1], [78, 3, 1]],
    8: [[76, 0, 1], [78, 1, 1], [79, 2, 1], [73, 3, 1]],
    9: [[74, 0, 3], [69, 3, 1]],
    10: [[71, 0, 2], [74, 2, 1], [79, 3, 1]],
    11: [[78, 0, 1.5], [76, 1.5, 0.5], [74, 2, 2]],
    12: [[76, 0, 1], [79, 1, 1], [83, 2, 1.5], [81, 3.5, 0.5]],
    13: [[81, 0, 2], [76, 2, 2]],
    14: [[79, 0, 1], [83, 1, 1], [86, 2, 1.5], [83, 3.5, 0.5]],
    15: [[81, 0, 1.5], [78, 1.5, 0.5], [74, 2, 2]],
    16: [[78, 0, 1], [74, 1, 1], [71, 2, 1], [74, 3, 1]],
    17: [[76, 0, 2], [73, 2, 1], [76, 3, 1]],
    18: [[74, 0, 1.5], [76, 1.5, 0.5], [78, 2, 1], [74, 3, 1]],
    19: [[79, 0, 1.5], [78, 1.5, 0.5], [76, 2, 1], [74, 3, 1]],
    20: [[78, 0, 1], [81, 1, 1], [86, 2, 1.5], [85, 3.5, 0.5]],
    21: [[83, 0, 2], [81, 2, 1], [76, 3, 1]],
    22: [[81, 0, 1], [83, 1, 1], [85, 2, 1], [88, 3, 1]],
    23: [[86, 0, 4]],
  };
  const lyrical = (b) => b >= 10 && b <= 17;
  chords.forEach((name, b) => {
    const t0 = b * bar, [root, tones] = CH[name];
    const intro = b < 2, last = b === chords.length - 1;
    // 弦樂鋪底
    if (!intro) for (const n of tones) note(1, n, t0, bar * 0.98, lyrical(b) ? 62 : 54);
    // 低音號：進行曲的一、三拍
    if (!intro) { note(3, root, t0, beat * 0.9, 88); note(3, root + 7, t0 + beat * 2, beat * 0.9, 76); if (last) note(3, root, t0, bar, 90); }
    // 圓號：二、四拍的和聲
    if (!intro && !lyrical(b) && !last) for (const k of [1, 3]) for (const n of tones.slice(1)) note(4, n - 12, t0 + k * beat, beat * 0.55, 66);
    // 弦樂撥奏（抒情段）
    if (lyrical(b)) [0, 1, 2, 3].forEach((k) => note(0, tones[k % 3] + (k === 3 ? 12 : 0), t0 + k * beat, beat * 0.8, 60));
    // 主旋律：A 段小號、B 段圓號
    const mel = MEL[b] || [];
    for (const [n, s2, d] of mel) {
      if (lyrical(b)) note(6, n - 12, t0 + s2 * beat, d * beat * 0.96, 92);
      else {
        note(2, n, t0 + s2 * beat, d * beat * 0.92, 96);
        // 第二小號：低三度的和聲（取和弦內音）
        if (!intro) { const h = tones.map((x) => x + 12).filter((x) => x < n).pop(); if (h) note(5, h, t0 + s2 * beat, d * beat * 0.92, 70); }
      }
    }
    // 定音鼓
    if (intro) for (let k = 0; k < 8; k++) note(7, b === 0 ? 38 : 45, t0 + k * beat / 2, beat / 2, 34 + k * 4 + b * 8);
    else if (last) { for (let k = 0; k < 6; k++) note(7, 38, t0 + k * beat / 2, beat / 2, 40 + k * 5); note(7, 38, t0 + beat * 3, beat, 100); }
    else note(7, root < 42 ? 38 : 45, t0, beat, 88);
    // 鼓組：軍鼓進行曲節奏、大鼓、銅鈸
    if (!intro && !last) {
      const sn = lyrical(b) ? [[0, 64], [2, 54]] : [[0, 92], [1, 60], [1.75, 54], [2, 80], [3, 62], [3.5, 58]];
      for (const [k, v] of sn) note(9, 38, t0 + k * beat, beat * 0.2, v);
      note(9, 36, t0, beat * 0.3, 90); note(9, 36, t0 + 2 * beat, beat * 0.3, 70);
    }
    if (b === 9 || b === 17) for (let k = 0; k < 8; k++) note(9, 38, t0 + 2 * beat + k * beat / 4, beat / 5, 50 + k * 8);   // 段落前的小鼓滾奏
    if ([2, 10, 18, 23].includes(b)) note(9, 49, t0, beat * 2, b === 23 ? 120 : 100);
  });
  ev.sort((a, b) => a.t - b.t || (a.type === 'note' ? 1 : -1));
  return { events: ev, duration: chords.length * bar };
}
