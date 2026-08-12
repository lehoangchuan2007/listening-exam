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
    return {
      text: clean(text),
      red,
      numbered: !!p.getElementsByTagNameNS('*', 'numPr')[0]
    };
  }

  // Read only word/document.xml from DOCX without loading another ZIP library.
  // Modern Chromium/Edge support DecompressionStream("deflate-raw"), so the
  // import no longer waits for a CDN script when the user clicks "Đọc Word".
  async function readDocumentXml(file) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('Trình duyệt hiện tại không hỗ trợ đọc Word nhanh. Hãy cập nhật Edge/Chrome rồi thử lại.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const EOCD = 0x06054b50;
    const CENTRAL = 0x02014b50;
    const LOCAL = 0x04034b50;

    let eocd = -1;
    const min = Math.max(0, bytes.length - 0x10000 - 22);
    for (let i = bytes.length - 22; i >= min; i--) {
      if (view.getUint32(i, true) === EOCD) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error('File Word không phải DOCX hợp lệ.');

    const centralSize = view.getUint32(eocd + 12, true);
    const centralOffset = view.getUint32(eocd + 16, true);
    const centralEnd = Math.min(bytes.length, centralOffset + centralSize);
    const decoder = new TextDecoder('utf-8');
    let entry = null;

    for (let pos = centralOffset; pos + 46 <= centralEnd;) {
      if (view.getUint32(pos, true) !== CENTRAL) break;
      const method = view.getUint16(pos + 10, true);
      const compressedSize = view.getUint32(pos + 20, true);
      const nameLen = view.getUint16(pos + 28, true);
      const extraLen = view.getUint16(pos + 30, true);
      const commentLen = view.getUint16(pos + 32, true);
      const localOffset = view.getUint32(pos + 42, true);
      const nameBytes = bytes.slice(pos + 46, pos + 46 + nameLen);
      const name = decoder.decode(nameBytes);

      if (name === 'word/document.xml') {
        entry = { method, compressedSize, localOffset };
        break;
      }
      pos += 46 + nameLen + extraLen + commentLen;
    }

    if (!entry) throw new Error('Không tìm thấy word/document.xml trong file Word.');

    const lp = entry.localOffset;
    if (lp + 30 > bytes.length || view.getUint32(lp, true) !== LOCAL) {
      throw new Error('Không đọc được phần nội dung chính của file Word.');
    }

    const localNameLen = view.getUint16(lp + 26, true);
    const localExtraLen = view.getUint16(lp + 28, true);
    const dataStart = lp + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > bytes.length) throw new Error('Dữ liệu DOCX bị thiếu hoặc hỏng.');

    const compressed = bytes.slice(dataStart, dataEnd);
    let output;

    if (entry.method === 0) {
      output = compressed;
    } else if (entry.method === 8) {
      const stream = new Blob([compressed]).stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      output = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      throw new Error('DOCX dùng kiểu nén không được hỗ trợ: ' + entry.method);
    }

    return new TextDecoder('utf-8').decode(output);
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
          options: cur.options.slice(),
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
        finish();
        pendingQuestion = { n: autoN++ };
        continue;
      }

      const om = optionMatch(line);
      if (om) {
        const idx = 'ABCD'.indexOf(om[1].toUpperCase());
        if (idx === 0 && !cur) {
          startQuestion(pendingQuestion?.n || autoN++, '');
          pendingQuestion = null;
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
      if (cur.options.every(x => !x)) cur.text = clean(cur.text + ' ' + line);
    }

    finish();
    return out.filter(q => q.text && q.options.every(Boolean));
  }

  function replaceQuestions(parsed) {
    if (typeof window.removeQ !== 'function' || typeof window.addQ !== 'function') {
      throw new Error('Không tìm thấy bộ tạo câu hỏi hiện tại.');
    }

    // Keep exactly one initial card. Never remove the last card because the
    // page's removeQ() recreates it, which previously caused the blank Câu 1.
    let boxes = () => Array.from(document.querySelectorAll('#qs .q'));
    let current = boxes();
    while (current.length > 1) {
      window.removeQ(current.length - 1);
      current = boxes();
    }
    if (!current.length) {
      window.addQ();
      current = boxes();
    }

    const first = current[0];
    const q1 = parsed[0];
    if (!first || !q1) throw new Error('Không thể tạo Câu 1 từ dữ liệu Word.');

    const text = first.querySelector('.qt');
    const options = Array.from(first.querySelectorAll('.qo'));
    const answer = first.querySelector('.qa');

    if (text) text.value = q1.text;
    options.forEach((input, j) => input.value = q1.options[j] || '');
    if (answer) answer.value = String(q1.answer);
    if (typeof window.syncQ === 'function') window.syncQ();

    for (let i = 1; i < parsed.length; i++) {
      window.addQ({
        text: parsed[i].text,
        options: parsed[i].options,
        answer: parsed[i].answer
      });
    }
  }

  let busy = false;

  async function importWordHandler() {
    if (busy) return;
    const f = get('word')?.files?.[0];
    const status = get('wordStatus');
    if (!f) return alert('Chọn file Word trước.');

    busy = true;
    if (status) status.textContent = '⏳ Đang đọc Word và tìm đáp án màu đỏ...';

    try {
      const xml = await readDocumentXml(f);
      const parsed = parseDocx(xml);

      if (!parsed.length) {
        if (status) status.textContent = '⚠️ Không nhận diện được câu hỏi. Kiểm tra mẫu 1. / 2. / A. / B. / C. / D.';
        return;
      }

      const missing = parsed.filter(q => !q._red).map(q => q.n);
      if (missing.length) {
        if (status) status.innerHTML = `❌ Chưa tìm thấy chữ <b>màu đỏ</b> cho câu: ${missing.join(', ')}.`;
        return;
      }

      replaceQuestions(parsed);
      if (status) status.innerHTML = `✅ Đã nhập <b>${parsed.length} câu</b> và tự nhận diện đáp án màu đỏ.`;
    } catch (e) {
      console.error(e);
      if (status) status.textContent = '❌ ' + (e?.message || e);
    } finally {
      busy = false;
    }
  }

  window.redWordImportHandler = importWordHandler;
  window.importWord = importWordHandler;

  function installImporter() {
    const button = Array.from(document.querySelectorAll('button')).find(b =>
      /Đọc Word/i.test(b.textContent || '') || /importWord\s*\(/.test(b.getAttribute('onclick') || '')
    );
    if (!button || button.dataset.redImporterBound === '1') return;

    button.dataset.redImporterBound = '1';
    button.removeAttribute('onclick');
    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      importWordHandler();
    }, true);
  }

  installImporter();
})();
