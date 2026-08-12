(function () {
  const SCRIPT_ID = 'red-word-import-ready';
  if (window[SCRIPT_ID]) return;
  window[SCRIPT_ID] = true;

  function get(id) { return document.getElementById(id); }
  function clean(s) { return String(s || '').replace(/\u00a0/g, ' ').trim(); }
  function isRedRun(run) {
    const color = run.getElementsByTagNameNS('*', 'color')[0];
    if (!color) return false;
    const v = String(color.getAttribute('w:val') || color.getAttribute('val') || '')
      .toLowerCase().replace('#', '');
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
    return JSZip.loadAsync(file).then(zip => {
      const entry = zip.file('word/document.xml');
      if (!entry) throw new Error('Không tìm thấy nội dung trong file Word.');
      return entry.async('string');
    });
  }

  function parseDocx(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('File Word không hợp lệ.');

    const ps = Array.from(doc.getElementsByTagNameNS('*', 'p'))
      .map(paragraphData)
      .filter(x => x.text);

    const out = [];
    let cur = null;

    for (const item of ps) {
      const line = item.text;
      let m = line.match(/^(?:Câu\s*)?(\d+)\s*[\.)\-:]\s*(.*)$/i);

      if (m) {
        if (cur) out.push(cur);
        cur = {
          n: +m[1],
          text: clean(m[2]),
          options: ['', '', '', ''],
          redAnswer: null
        };
        continue;
      }

      m = line.match(/^([ABCD])\s*[\.)\-:]\s*(.*)$/i);
      if (m && cur) {
        const idx = 'ABCD'.indexOf(m[1].toUpperCase());
        cur.options[idx] = clean(m[2]);
        if (item.red) cur.redAnswer = idx;
        continue;
      }

      // Một số file Word tách "Câu 1." và nội dung câu hỏi thành 2 đoạn.
      // Nếu câu hiện tại chưa có nội dung, đoạn kế tiếp chính là nội dung câu hỏi.
      if (cur && !cur.text) {
        cur.text = line;
        continue;
      }

      // Hỗ trợ câu hỏi dài bị Word tách thành nhiều đoạn trước các lựa chọn.
      if (cur && cur.options.every(x => !x)) {
        cur.text = clean(cur.text + ' ' + line);
      }
    }

    if (cur) out.push(cur);

    return out
      .filter(q => q.text && q.options.every(Boolean))
      .map(q => ({
        text: q.text,
        options: q.options,
        answer: q.redAnswer,
        _red: q.redAnswer !== null,
        n: q.n
      }));
  }

  function fillExistingQuestion(box, q) {
    const text = box.querySelector('.qt');
    const options = Array.from(box.querySelectorAll('.qo'));
    const answer = box.querySelector('.qa');

    if (text) text.value = q.text || '';
    options.forEach((input, j) => {
      input.value = q.options[j] || '';
    });
    if (answer) answer.value = String(q.answer);
  }

  function replaceQuestions(parsed) {
    if (typeof window.removeQ !== 'function' || typeof window.addQ !== 'function') {
      throw new Error('Không tìm thấy bộ tạo câu hỏi hiện tại.');
    }

    while (document.querySelectorAll('#qs .q').length > 1) {
      window.removeQ(0);
    }

    let first = document.querySelector('#qs .q');

    if (!first) {
      window.addQ(parsed[0]);
      first = document.querySelector('#qs .q');
    } else {
      fillExistingQuestion(first, parsed[0]);
    }

    parsed.slice(1).forEach(q => window.addQ({
      text: q.text,
      options: q.options,
      answer: q.answer
    }));
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
        if (status) {
          status.textContent = '⚠️ Không nhận diện được câu hỏi. Kiểm tra mẫu Câu 1 / A. / B. / C. / D.';
        }
        return;
      }

      const missing = parsed.filter(q => !q._red).map(q => q.n);
      if (missing.length) {
        if (status) {
          status.innerHTML = `❌ Chưa tìm thấy chữ <b>màu đỏ</b> cho câu: ${missing.join(', ')}. Hãy tô đỏ đúng đáp án trong Word rồi nhập lại.`;
        }
        return;
      }

      replaceQuestions(parsed);

      if (status) {
        status.innerHTML = `✅ Đã nhập <b>${parsed.length} câu</b> và tự nhận diện đáp án màu đỏ. Không cần nhập đáp án thủ công.`;
      }
    } catch (e) {
      if (status) status.textContent = '❌ ' + (e?.message || e);
    }
  };

  setTimeout(() => {
    window.redWordImportEnabled = true;
  }, 0);
})();
