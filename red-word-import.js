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

    function finish() {
      if (!cur) return;
      if (cur.text && cur.options.every(Boolean)) {
        out.push({
          text: cur.text,
          options: cur.options.slice(0, 4),
          answer: cur.redAnswer,
          _red: cur.redAnswer !== null,
          n: cur.n
        });
      }
      cur = null;
    }

    for (const item of ps) {
      const line = item.text;

      // IMPORTANT: punctuation after the question number is optional.
      // Handles all of these Word formats:
      //   Câu 1.
      //   Câu 1
      //   Câu 1: How much is the car?
      //   Câu 1 - How much is the car?
      let m = line.match(/^C(?:âu|au)\s*(\d+)\s*(?:[\.)\-:：]\s*)?(.*)$/i);
      if (m) {
        finish();
        cur = {
          n: Number(m[1]),
          text: clean(m[2]),
          options: ['', '', '', ''],
          redAnswer: null
        };
        continue;
      }

      // Also accept English question numbering if it appears in a Word file.
      m = line.match(/^Question\s*(\d+)\s*(?:[\.)\-:：]\s*)?(.*)$/i);
      if (m) {
        finish();
        cur = {
          n: Number(m[1]),
          text: clean(m[2]),
          options: ['', '', '', ''],
          redAnswer: null
        };
        continue;
      }

      // A. / B. / C. / D. options.
      m = line.match(/^([ABCD])\s*[\.)\-:：]\s*(.*)$/i);
      if (m && cur) {
        const idx = 'ABCD'.indexOf(m[1].toUpperCase());
        cur.options[idx] = clean(m[2]);
        if (item.red) cur.redAnswer = idx;
        continue;
      }

      // Support an explicit answer line as a fallback, but red text remains preferred.
      m = line.match(/^(?:Đáp\s*án|Dap\s*an|Answer|Ans)\s*[:：\-]?\s*([A-Da-d]|[1-4])\s*$/i);
      if (m && cur && cur.redAnswer === null) {
        const v = m[1].toUpperCase();
        cur.fallbackAnswer = /^[A-D]$/.test(v) ? v.charCodeAt(0) - 65 : Number(v) - 1;
        continue;
      }

      if (!cur) continue;

      // If "Câu 1" and the question text are separate Word paragraphs,
      // this paragraph is the question text.
      if (!cur.text && cur.options.every(x => !x)) {
        cur.text = line;
        continue;
      }

      // A long question can be split over multiple paragraphs before options.
      if (cur.options.every(x => !x)) {
        cur.text = clean(cur.text + ' ' + line);
      }
    }

    finish();

    return out
      .filter(q => q.text && q.options.length === 4 && q.options.every(Boolean))
      .map(q => ({
        text: q.text,
        options: q.options,
        answer: q.redAnswer !== null ? q.redAnswer : (q.fallbackAnswer ?? 0),
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

    // index.html creates one blank question immediately after opening the
    // create screen. Reuse that first card for Word question 1, then append
    // questions 2..N. This prevents the blank-question offset.
    const boxes = () => Array.from(document.querySelectorAll('#qs .q'));

    while (boxes().length > 1) {
      window.removeQ(boxes().length - 1);
    }

    let first = boxes()[0];
    if (!first) {
      window.addQ(parsed[0]);
      first = boxes()[0];
    }

    fillExistingQuestion(first, parsed[0]);

    for (let i = 1; i < parsed.length; i++) {
      window.addQ({
        text: parsed[i].text,
        options: parsed[i].options,
        answer: parsed[i].answer
      });
    }
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
      console.error(e);
      if (status) status.textContent = '❌ ' + (e?.message || e);
    }
  };

  setTimeout(() => {
    window.redWordImportEnabled = true;
  }, 0);
})();
