(function () {
  const SCRIPT_ID = 'red-word-import-ready';
  if (window[SCRIPT_ID]) return;
  window[SCRIPT_ID] = true;

  function get(id) { return document.getElementById(id); }
  function clean(s) {
    return String(s || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u200b\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isRedRun(run) {
    const color = run.getElementsByTagNameNS('*', 'color')[0];
    if (!color) return false;
    const v = String(color.getAttribute('w:val') || color.getAttribute('val') || '')
      .toLowerCase().replace('#', '');
    if (v === 'red' || v === 'ff0000' || v === 'f00') return true;
    if (!/^[0-9a-f]{6}$/.test(v)) return false;
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return r >= 180 && r > g * 1.5 && r > b * 1.5;
  }

  function paragraphData(p) {
    const runs = Array.from(p.getElementsByTagNameNS('*', 'r'));
    let text = '', red = false;
    for (const r of runs) {
      if (isRedRun(r)) red = true;
      text += Array.from(r.getElementsByTagNameNS('*', 't'))
        .map(t => t.textContent || '').join('');
      if (r.getElementsByTagNameNS('*', 'tab').length) text += '\t';
      if (r.getElementsByTagNameNS('*', 'br').length) text += '\n';
    }
    const numPr = p.getElementsByTagNameNS('*', 'numPr')[0];
    return { text: clean(text), red, numbered: !!numPr };
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

  function questionStart(line) {
    let m = line.match(/^C(?:âu|au)\s*(\d+)\s*(?:[\.)\-:：]\s*)?(.*)$/i);
    if (m) return { n: Number(m[1]), text: clean(m[2]) };
    m = line.match(/^Question\s*(\d+)\s*(?:[\.)\-:：]\s*)?(.*)$/i);
    if (m) return { n: Number(m[1]), text: clean(m[2]) };
    m = line.match(/^(\d+)\s*[\.)\-:：]\s*(.*)$/i);
    if (m) return { n: Number(m[1]), text: clean(m[2]) };
    return null;
  }

  function optionMatch(line) {
    return line.match(/^([ABCD])\s*[\.)\-:：]\s*(.*)$/i);
  }

  function isOnlyNumbering(line) {
    return /^(?:\d+\s*[\.)\-:]?|[IVX]+\s*[\.)\-:]?)$/i.test(clean(line));
  }

  function parseDocx(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('File Word không hợp lệ.');

    const ps = Array.from(doc.getElementsByTagNameNS('*', 'p'))
      .map(paragraphData)
      .filter(x => x.text);

    const out = [];
    let cur = null;
    let pendingQuestion = null;
    let autoN = 1;

    function startQuestion(n, text) {
      cur = {
        n: Number(n) || autoN++,
        text: clean(text),
        options: ['', '', '', ''],
        redAnswer: null,
        fallbackAnswer: null
      };
      autoN = Math.max(autoN, cur.n + 1);
    }

    function finish() {
      if (!cur) return;
      if (cur.text && cur.options.every(Boolean)) {
        out.push({
          text: clean(cur.text),
          options: cur.options.slice(0, 4),
          answer: cur.redAnswer !== null ? cur.redAnswer : (cur.fallbackAnswer ?? 0),
          _red: cur.redAnswer !== null,
          n: cur.n
        });
      }
      cur = null;
    }

    for (const item of ps) {
      const line = item.text;
      const qs = questionStart(line);

      if (qs) {
        finish();
        pendingQuestion = null;
        startQuestion(qs.n, qs.text);
        continue;
      }

      if (item.numbered && isOnlyNumbering(line)) {
        if (cur && cur.options.some(Boolean)) finish();
        pendingQuestion = { n: autoN++ };
        cur = null;
        continue;
      }

      const om = optionMatch(line);
      if (om) {
        const idx = 'ABCD'.indexOf(om[1].toUpperCase());
        if (idx === 0 && !cur) {
          startQuestion(pendingQuestion?.n || autoN++, '');
          pendingQuestion = null;
        } else if (idx === 0 && cur && cur.options.some(Boolean)) {
          finish();
          startQuestion(autoN++, '');
        }
        if (cur) {
          cur.options[idx] = clean(om[2]);
          if (item.red) cur.redAnswer = idx;
        }
        continue;
      }

      const am = line.match(/^(?:Đáp\s*án|Dap\s*an|Answer|Ans)\s*[:：\-]?\s*([A-Da-d]|[1-4])\s*$/i);
      if (am && cur && cur.redAnswer === null) {
        const v = am[1].toUpperCase();
        cur.fallbackAnswer = /^[A-D]$/.test(v) ? v.charCodeAt(0) - 65 : Number(v) - 1;
        continue;
      }

      if (pendingQuestion) {
        startQuestion(pendingQuestion.n, line);
        pendingQuestion = null;
        continue;
      }

      if (!cur) continue;

      if (cur.options.every(x => !x)) {
        cur.text = clean(cur.text + ' ' + line);
      }
    }

    finish();
    return out.filter(q => q.text && q.options.every(Boolean));
  }

  function fillExistingQuestion(box, q) {
    if (!box || !q) return;
    const text = box.querySelector('.qt');
    const options = Array.from(box.querySelectorAll('.qo'));
    const answer = box.querySelector('.qa');
    if (text) text.value = q.text || '';
    options.forEach((input, j) => { input.value = q.options[j] || ''; });
    if (answer) answer.value = String(q.answer);
  }

  function replaceQuestions(parsed) {
    if (typeof window.removeQ !== 'function' || typeof window.addQ !== 'function') {
      throw new Error('Không tìm thấy bộ tạo câu hỏi hiện tại.');
    }

    // The create page always starts with one blank question. The previous
    // implementation filled that DOM node and then called addQ(), whose
    // renderQ() immediately rebuilt the DOM from the old `questions` array,
    // putting the blank question back. Instead, remove all existing questions
    // first and rebuild the entire list through the page's own addQ/renderQ API.
    const boxes = () => Array.from(document.querySelectorAll('#qs .q'));
    while (boxes().length > 0) window.removeQ(boxes().length - 1);

    // removeQ() keeps the page from having zero questions by calling addQ().
    // Remove that auto-created blank one again, then add the parsed questions.
    let current = boxes();
    while (current.length > 0) {
      window.removeQ(current.length - 1);
      current = boxes();
    }

    for (const q of parsed) {
      window.addQ({
        text: q.text,
        options: q.options,
        answer: q.answer
      });
    }
  }

  async function importWordHandler() {
    const f = get('word')?.files?.[0];
    const status = get('wordStatus');
    if (!f) return alert('Chọn file Word trước.');
    if (status) status.textContent = '⏳ Đang đọc Word và tìm đáp án màu đỏ...';

    try {
      const xml = await loadXml(await f.arrayBuffer());
      const parsed = parseDocx(xml);

      if (!parsed.length) {
        if (status) status.textContent =
          '⚠️ Không nhận diện được câu hỏi. Kiểm tra mẫu 1. / 2. / A. / B. / C. / D.';
        return;
      }

      const missing = parsed.filter(q => !q._red).map(q => q.n);
      if (missing.length) {
        if (status) status.innerHTML =
          `❌ Chưa tìm thấy chữ <b>màu đỏ</b> cho câu: ${missing.join(', ')}. Hãy tô đỏ đúng đáp án trong Word rồi nhập lại.`;
        return;
      }

      replaceQuestions(parsed);
      if (status) status.innerHTML =
        `✅ Đã nhập <b>${parsed.length} câu</b> và tự nhận diện đáp án màu đỏ. Không cần nhập đáp án thủ công.`;
    } catch (e) {
      console.error(e);
      if (status) status.textContent = '❌ ' + (e?.message || e);
    }
  }

  window.redWordImportHandler = importWordHandler;

  function installImporter() {
    window.importWord = importWordHandler;

    const button = Array.from(document.querySelectorAll('button'))
      .find(b => /Đọc Word/i.test(b.textContent || '') || /importWord\s*\(/.test(b.getAttribute('onclick') || ''));

    if (button && button.dataset.redImporterBound !== '1') {
      button.dataset.redImporterBound = '1';
      button.removeAttribute('onclick');
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        importWordHandler();
      }, true);
    }

    window.redWordImportEnabled = true;
  }

  installImporter();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installImporter, { once: false });
  }
  [0, 50, 200, 500, 1000, 2000].forEach(ms => setTimeout(installImporter, ms));
})();
