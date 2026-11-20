'use strict';
// ===== 存檔備份與轉移 =====
// 匯出格式：{ format:'dawnlands-save', v:2, exported, chars:[...], sum }
// 可下載成 .json 檔，或複製成一段「存檔碼」貼到另一台裝置匯入。
const Backup = {
  checksum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); },
  pack(chars) {
    const body = JSON.stringify(chars);
    return JSON.stringify({ format: 'dawnlands-save', v: 2, exported: new Date().toISOString(), chars, sum: this.checksum(body) });
  },
  toCode(json) { return 'DL2:' + btoa(unescape(encodeURIComponent(json))); },
  fromAny(text) {
    text = (text || '').trim();
    if (text.startsWith('DL2:')) text = decodeURIComponent(escape(atob(text.slice(4).replace(/\s+/g, ''))));
    const d = JSON.parse(text);
    if (d.format !== 'dawnlands-save' || !Array.isArray(d.chars)) throw new Error('不是晨曦大陸的存檔。');
    if (d.sum && d.sum !== this.checksum(JSON.stringify(d.chars))) throw new Error('存檔內容已損毀或被修改過。');
    for (const c of d.chars) {
      if (!c || typeof c.name !== 'string' || !CLASSES[c.cls] || typeof c.level !== 'number' || !c.base) throw new Error('存檔格式不正確。');
    }
    return d.chars;
  },
  download(chars, label) {
    const json = this.pack(chars);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'dawnlands_' + (label || 'backup') + '_' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (typeof UI !== 'undefined' && G.running) UI.log('已下載存檔備份：' + a.download, 'sys');
    return a.download;
  },
  async copyCode(chars) {
    const code = this.toCode(this.pack(chars));
    try { await navigator.clipboard.writeText(code); return { ok: true, code }; } catch (e) { return { ok: false, code }; }
  },
  // 匯入到目前帳號；同名角色可選擇覆蓋或改名
  async importChars(chars) {
    const res = [];
    for (const c0 of chars) {
      const c = JSON.parse(JSON.stringify(c0));
      const mine = Net.chars.list(Net.session);
      const exists = mine.find((x) => x.name === c.name);
      if (exists) {
        if (confirm('帳號中已有角色「' + c.name + '」。按「確定」覆蓋，按「取消」以新名稱匯入。')) { Net.chars.save(Net.session, c); res.push(c.name + '（覆蓋）'); continue; }
        let n = 2; const base = c.name.slice(0, 6); while (mine.find((x) => x.name === base + n)) n++; c.name = base + n;
      }
      if (Net.chars.list(Net.session).length >= MAX_CHARS) { res.push(c.name + '（角色欄位已滿，略過）'); continue; }
      let r = await Net.chars.create(Net.session, c);
      if (!r.ok && /名稱/.test(r.error)) { c.name = c.name.slice(0, 6) + randi(10, 99); r = await Net.chars.create(Net.session, c); }
      res.push(c.name + (r.ok ? '' : '（' + r.error + '）'));
    }
    return res;
  },
  // 匯入對話框（選擇檔案或貼上存檔碼）
  openImport(onDone) {
    const box = el('div', 'overlay show');
    box.id = 'importBox';
    box.innerHTML = '<div class="box"><h3>匯入角色</h3><p class="dim small">選擇備份的 .json 檔，或貼上「存檔碼」。</p>' +
      '<input type="file" id="impFile" accept=".json,application/json"><textarea id="impText" placeholder="在這裡貼上存檔碼（DL2: 開頭）"></textarea>' +
      '<div class="msg" id="impMsg"></div><div class="btnrow"><button class="btn" id="impOk">匯入</button><button class="btn" id="impCancel">取消</button></div></div>';
    document.body.appendChild(box);
    const msg = box.querySelector('#impMsg');
    box.querySelector('#impText').addEventListener('keydown', (e) => e.stopPropagation());
    box.querySelector('#impCancel').onclick = () => box.remove();
    box.querySelector('#impFile').onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { box.querySelector('#impText').value = t; }); };
    box.querySelector('#impOk').onclick = async () => {
      try {
        const chars = this.fromAny(box.querySelector('#impText').value);
        const res = await this.importChars(chars);
        box.remove(); SFX.play('quest');
        alert('匯入完成：\n' + res.join('\n'));
        if (onDone) onDone();
      } catch (e) { msg.textContent = '匯入失敗：' + e.message; SFX.play('error'); }
    };
  },
};
