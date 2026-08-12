(function () {
  const SCRIPT_ID = 'red-word-import-ready';
  if (window[SCRIPT_ID]) return;
  window[SCRIPT_ID] = true;

  function get(id) { return document.getElementById(id); }
  function clean(s) { return String(s || '').replace(/\u00a0/g, ' ').trim(); }
  function isRedRun(run) {
    const color = run.getElementsByTagNameNS('*', 'color')[0];
    if (!color) return false;
    const v = String(color.getAttribute('w:val') || color.getAttribute('val') || '').toLowerCase().replace('#', '');
    return v === 'ff0000' || v === 'f00' || v === 'red';
  }
  function paragraphData(p) {
    const runs = Array.from(p.getElementsByTagNameNS('*', 'r'));
    let text = '';
    let red = false;
    for (const r of runs) {
      if (isRedRun(r)) red = true;
      const ts = Array.from(r.getElementsByTagNameNS('*', 't'));
      text += ts.map(t => t.textContent || '').join('');
      if (r.getElementsByTagNameNS('*', 'tab').length) text += '\t';
      if (r.getElementsByTagNameNS('*', 'br').length) text += '\n';
    }
    return { text: clean(text), red };
  }
  function loadXml(file) {
    if (!window.JSZip) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Không tải được thư viện đọc Word.'));
        document.head.appendChild(s);
      }).then(() => loadXml(file));
    }
    return JSZip.loadAsync(file).then(zip => zip.file('word/document.xml').async('string'));
  }
  function parseDocx(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('File Word không hợp lệ.');
    const ps = Array.from(doc.getElementsByTagNameNS('*', 'p')).map(paragraphData).filter(x => x.text);
    const out = [];
    let cur = null;
    let fallbackKeys = {};
    for (const item of ps) {
      const line = item.text;
      let m = line.match(/^(?:Câu\s*)?(\d+)\s*[\.)\-:]\s*(.*)$/i);
      if (m) {
        if (cur) out.push(cur);
        cur = { n: +m[1], text: m[2], options: ['', '', '', ''], redAnswer: null };
        continue;
      }
      m = line.match(/^([ABCD])\s*[\.)\-:]\s*(.*)$/i);
      if (m && cur) {
        const idx = 'ABCD'.indexOf(m[1].toUpperCase());
        cur.options[idx] = m[2];
        if (item.red) cur.redAnswer = idx;
        continue;
      }
      m = line.match(/^(?:Đáp\s*án|Answer|Key)\s*(?:câu\s*)?(\d+)\s*[:\-]?\s*([ABCD])/i);
      if (m) fallbackKeys[+m[1]] = 'ABCD'.indexOf(m[2].toUpperCase());
    }
    if (cur) out.push(cur);
    return out.map(q => ({
      text: q.text,
      options: q.options,
      answer: q.redAnswer ?? fallbackKeys[q.n] ?? 0,
      _red: q.redAnswer !== null
    })).filter(q => q.text && q.options.every(Boolean));
  }
  function replaceQuestions(parsed) {
    if (typeof window.removeQ === 'function' && typeof window.addQ === 'function') {
      while (document.querySelectorAll('#qs .q').length > 1) window.removeQ(0);
      if (document.querySelectorAll('#qs .q').length === 1) window.removeQ(0);
      parsed.forEach(q => window.addQ({ text: q.text, options: q.options, answer: q.answer }));
      return;
    }
    throw new Error('Không tìm thấy bộ tạo câu hỏi hiện tại.');
  }
  window.importWord = async function () {
    const f = get('word')?.files?.[0];
    const status = get('wordStatus');
    if (!f) return alert('Chọn file Word trước.');
    if (status) status.textContent = '⏳ Đang đọc Word và tìm đáp án màu đỏ...';
    try {
      const xml = await loadXml(await f.arrayBuffer());
      const parsed = parseDocx(xml);
      if (!parsed.length) {
        if (status) status.textContent = '⚠️ Không nhận diện được câu hỏi. Kiểm tra mẫu Câu 1 / A. / B. / C. / D.';
        return;
      }
      const missing = parsed.filter(q => !q._red).length;
      replaceQuestions(parsed);
      if (status) status.innerHTML = missing
        ? `⚠️ Đã nhập ${parsed.length} câu. Có <b>${missing}</b> câu chưa tìm thấy đáp án màu đỏ; hệ thống tạm dùng đáp án A cho các câu đó.`
        : `✅ Đã nhập ${parsed.length} câu và tự nhận diện <b>đáp án màu đỏ</b>. Không cần nhập đáp án thủ công.`;
    } catch (e) {
      if (status) status.textContent = '❌ ' + (e?.message || e);
    }
  };
  setTimeout(() => { window.redWordImportEnabled = true; }, 0);
})();
