// English Studio - Reading Word import formatting fix.
// Preserves bold/italic/underline/color from DOCX Reading passages.
// Listening import is intentionally untouched.
(function () {
  if (window.__ENGLISH_STUDIO_READING_WORD_FORMAT_FIX_V1__) return;
  window.__ENGLISH_STUDIO_READING_WORD_FORMAT_FIX_V1__ = true;

  let busy = false;

  const $ = id => document.getElementById(id);

  function clean(value) {
    return String(value ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u200b\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  }

  function isOn(run, tag) {
    const node = run.getElementsByTagNameNS('*', tag)[0];
    if (!node) return false;
    const value = String(node.getAttribute('w:val') || node.getAttribute('val') || '').toLowerCase();
    return !['0', 'false', 'off', 'none'].includes(value);
  }

  function isRed(run) {
    const color = run.getElementsByTagNameNS('*', 'color')[0];
    if (!color) return false;
    const value = String(color.getAttribute('w:val') || color.getAttribute('val') || '')
      .toLowerCase().replace('#', '');
    if (['red', 'ff0000', 'f00'].includes(value)) return true;
    if (!/^[0-9a-f]{6}$/.test(value)) return false;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return r >= 180 && r > g * 1.5 && r > b * 1.5;
  }

  function runHtml(run) {
    let text = Array.from(run.getElementsByTagNameNS('*', 't'))
      .map(n => n.textContent || '').join('');
    let html = esc(text);

    if (run.getElementsByTagNameNS('*', 'tab').length) html += '&emsp;';
    if (run.getElementsByTagNameNS('*', 'br').length) html += '<br>';
    if (!html) return '';

    const styles = [];
    if (isOn(run, 'b') || isOn(run, 'bCs')) styles.push('font-weight:700');
    if (isOn(run, 'i') || isOn(run, 'iCs')) styles.push('font-style:italic');
    if (run.getElementsByTagNameNS('*', 'u').length) styles.push('text-decoration:underline');
    if (isOn(run, 'strike') || isOn(run, 'dstrike')) styles.push('text-decoration:line-through');

    const color = run.getElementsByTagNameNS('*', 'color')[0];
    if (color) {
      const value = String(color.getAttribute('w:val') || color.getAttribute('val') || '')
        .toLowerCase().replace('#', '');
      if (/^[0-9a-f]{6}$/.test(value) && value !== 'auto') styles.push(`color:#${value}`);
    }

    return styles.length ? `<span style="${styles.join(';')}">${html}</span>` : html;
  }

  function paragraphData(p) {
    const runs = Array.from(p.getElementsByTagNameNS('*', 'r'));
    let text = '';
    let html = '';
    let red = false;

    for (const run of runs) {
      if (isRed(run)) red = true;
      text += Array.from(run.getElementsByTagNameNS('*', 't'))
        .map(n => n.textContent || '').join('');
      if (run.getElementsByTagNameNS('*', 'tab').length) text += '\t';
      if (run.getElementsByTagNameNS('*', 'br').length) text += '\n';
      html += runHtml(run);
    }

    return { text: clean(text), html: html || esc(clean(text)), red };
  }

  async function readDocumentXml(file) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('Trình duyệt không hỗ trợ đọc DOCX trực tiếp. Hãy cập nhật Edge/Chrome.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const EOCD = 0x06054b50, CENTRAL = 0x02014b50, LOCAL = 0x04034b50;
    let eocd = -1;
    const min = Math.max(0, bytes.length - 0x10000 - 22);

    for (let i = bytes.length - 22; i >= min; i--) {
      if (view.getUint32(i, true) === EOCD) { eocd = i; break; }
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
      const name = decoder.decode(bytes.slice(pos + 46, pos + 46 + nameLen));
      if (name === 'word/document.xml') { entry = { method, compressedSize, localOffset }; break; }
      pos += 46 + nameLen + extraLen + commentLen;
    }

    if (!entry) throw new Error('Không tìm thấy word/document.xml trong file Word.');

    const lp = entry.localOffset;
    if (lp + 30 > bytes.length || view.getUint32(lp, true) !== LOCAL) {
      throw new Error('Không đọc được nội dung chính của file Word.');
    }

    const nameLen = view.getUint16(lp + 26, true);
    const extraLen = view.getUint16(lp + 28, true);
    const start = lp + 30 + nameLen + extraLen;
    const end = start + entry.compressedSize;
    if (end > bytes.length) throw new Error('Dữ liệu DOCX bị thiếu hoặc hỏng.');

    const compressed = bytes.slice(start, end);
    let output;
    if (entry.method === 0) output = compressed;
    else if (entry.method === 8) {
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      output = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      throw new Error('DOCX dùng kiểu nén không được hỗ trợ: ' + entry.method);
    }

    return new TextDecoder('utf-8').decode(output);
  }

  function questionStart(line) {
    let m = line.match(/^C(?:âu|au)\s*(\d+)\s*[.)\-:：]?\s*(.*)$/i);
    if (m) return { n: Number(m[1]), text: clean(m[2]) };
    m = line.match(/^Question\s*(\d+)\s*[.)\-:：]?\s*(.*)$/i);
    if (m) return { n: Number(m[1]), text: clean(m[2]) };
    m = line.match(/^(\d+)\s*[.)\-:：]\s*(.*)$/i);
    if (m) return { n: Number(m[1]), text: clean(m[2]) };
    return null;
  }

  function optionMatch(line) {
    return line.match(/^([ABCD])\s*[.)\-:：]\s*(.*)$/i);
  }

  function parseQuestions(items) {
    const questions = [];
    let current = null;
    let auto = 1;

    function finish() {
      if (!current) return;
      if (current.text && current.options.every(Boolean)) {
        questions.push({
          text: clean(current.text),
          options: current.options.slice(),
          answer: current.redAnswer,
          red: current.redAnswer !== null,
          n: current.n
        });
      }
      current = null;
    }

    for (const item of items) {
      const start = questionStart(item.text);
      if (start) {
        finish();
        current = {
          n: Number(start.n) || auto++,
          text: clean(start.text),
          options: ['', '', '', ''],
          redAnswer: null
        };
        auto = Math.max(auto, current.n + 1);
        continue;
      }

      const option = optionMatch(item.text);
      if (option) {
        if (!current) current = { n:auto++, text:'', options:['','','',''], redAnswer:null };
        const index = 'ABCD'.indexOf(option[1].toUpperCase());
        current.options[index] = clean(option[2]);
        if (item.red) current.redAnswer = index;
        continue;
      }

      if (current && current.options.every(v => !v)) {
        current.text = clean(current.text + ' ' + item.text);
      }
    }

    finish();
    return questions.filter(q => q.text && q.options.every(Boolean));
  }

  function parseReading(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('File Word không hợp lệ.');

    const items = Array.from(doc.getElementsByTagNameNS('*', 'p'))
      .map(paragraphData)
      .filter(x => x.text);

    if (!items.length) throw new Error('File Word không có nội dung.');

    const title = items[0].text;
    const firstQuestion = items.findIndex((item, index) => index > 0 && questionStart(item.text));
    if (firstQuestion < 0) throw new Error('Không tìm thấy câu hỏi. Hãy dùng Question 1 / Câu 1 / 1.');

    const readingHtml = items.slice(1, firstQuestion)
      .map(item => `<p>${item.html}</p>`)
      .join('');

    const questions = parseQuestions(items.slice(firstQuestion));
    if (!questions.length) throw new Error('Không nhận diện được câu hỏi Reading.');

    return { title, readingHtml, questions };
  }

  function setStatus(html) {
    const node = $('readingWordStatus');
    if (node) node.innerHTML = html;
  }

  function replaceQuestions(parsed) {
    if (typeof window.removeQ !== 'function' || typeof window.addQ !== 'function') {
      throw new Error('Không tìm thấy bộ tạo câu hỏi hiện tại.');
    }

    const boxes = () => Array.from(document.querySelectorAll('#qs .q'));
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
    const firstQuestion = parsed[0];
    const text = first?.querySelector('.qt');
    const options = Array.from(first?.querySelectorAll('.qo') || []);
    const answer = first?.querySelector('.qa');

    if (!first || !firstQuestion) throw new Error('Không thể tạo câu hỏi đầu tiên.');
    if (text) text.value = firstQuestion.text;
    options.forEach((input, index) => input.value = firstQuestion.options[index] || '');
    if (answer) answer.value = String(firstQuestion.answer);
    if (typeof window.syncQ === 'function') window.syncQ();

    for (let i = 1; i < parsed.length; i++) {
      window.addQ({
        text: parsed[i].text,
        options: parsed[i].options,
        answer: parsed[i].answer
      });
    }
  }

  async function importReadingWordRich() {
    if (busy) return;
    const file = $('readingWord')?.files?.[0];
    if (!file) return alert('Chọn file Word Reading trước.');

    busy = true;
    setStatus('⏳ Đang đọc Word và giữ nguyên chữ <b>đậm</b>, nghiêng, gạch chân, màu chữ...');

    try {
      const parsed = parseReading(await readDocumentXml(file));
      const missing = parsed.questions.filter(q => !q.red).map(q => q.n);
      if (missing.length) {
        throw new Error('Chưa tìm thấy chữ màu đỏ cho câu: ' + missing.join(', '));
      }

      if ($('ctitle')) $('ctitle').value = parsed.title;
      if ($('creading')) $('creading').value = parsed.readingHtml;

      const editor = $('readingEditor');
      if (editor) {
        editor.innerHTML = parsed.readingHtml || '<p><br></p>';
        if (typeof window.syncReadingEditor === 'function') window.syncReadingEditor();
      }

      replaceQuestions(parsed.questions);
      setStatus(`✅ Đã nhận diện <b>${esc(parsed.title)}</b> • ${parsed.questions.length} câu • đã giữ nguyên định dạng Word.`);
    } catch (error) {
      console.error(error);
      setStatus('❌ ' + (error?.message || error));
    } finally {
      busy = false;
    }
  }

  function isReadingPage() {
    return String($('ct')?.value || '').toLowerCase() === 'reading';
  }

  function install() {
    if (!isReadingPage()) return;
    if (!$('readingWord')) return;
    if (document.documentElement.dataset.readingWordFormatBound === '1') return;
    document.documentElement.dataset.readingWordFormatBound = '1';

    // Capture at document level so the old plain-text importer does not run.
    document.addEventListener('click', function (event) {
      const button = event.target?.closest?.('#readReadingWordBtn');
      if (!button || !isReadingPage()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      importReadingWordRich();
    }, true);

    window.readingWordImportHandler = importReadingWordRich;
  }

  function boot() {
    install();
    const observer = new MutationObserver(() => install());
    if (document.body) observer.observe(document.body, { childList:true, subtree:true });
    setInterval(install, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
