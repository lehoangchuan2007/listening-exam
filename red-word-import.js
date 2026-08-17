(function () {
  if (window.__ENGLISH_STUDIO_WORD_IMPORT_V9__) return;
  window.__ENGLISH_STUDIO_WORD_IMPORT_V9__ = true;

  const $ = id => document.getElementById(id);
  let busy = false;

  function clean(value) {
    return String(value ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u200b\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isRedRun(run) {
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

  function paragraphData(paragraph) {
    const runs = Array.from(paragraph.getElementsByTagNameNS('*', 'r'));
    let text = '';
    let red = false;
    for (const run of runs) {
      if (isRedRun(run)) red = true;
      text += Array.from(run.getElementsByTagNameNS('*', 't'))
        .map(node => node.textContent || '').join('');
      if (run.getElementsByTagNameNS('*', 'tab').length) text += '\t';
      if (run.getElementsByTagNameNS('*', 'br').length) text += '\n';
    }
    return { text: clean(text), red, numbered: !!paragraph.getElementsByTagNameNS('*', 'numPr')[0] };
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
    if (lp + 30 > bytes.length || view.getUint32(lp, true) !== LOCAL) throw new Error('Không đọc được nội dung chính của file Word.');
    const nameLen = view.getUint16(lp + 26, true), extraLen = view.getUint16(lp + 28, true);
    const start = lp + 30 + nameLen + extraLen, end = start + entry.compressedSize;
    if (end > bytes.length) throw new Error('Dữ liệu DOCX bị thiếu hoặc hỏng.');
    const compressed = bytes.slice(start, end);
    let output;
    if (entry.method === 0) output = compressed;
    else if (entry.method === 8) {
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      output = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('DOCX dùng kiểu nén không được hỗ trợ: ' + entry.method);
    return new TextDecoder('utf-8').decode(output);
  }

  function questionStart(line) {
    let match = line.match(/^C(?:âu|au)\s*(\d+)\s*[.)\-:：]?\s*(.*)$/i);
    if (match) return { n: Number(match[1]), text: clean(match[2]) };
    match = line.match(/^Question\s*(\d+)\s*[.)\-:：]?\s*(.*)$/i);
    if (match) return { n: Number(match[1]), text: clean(match[2]) };
    match = line.match(/^(\d+)\s*[.)\-:：]\s*(.*)$/i);
    if (match) return { n: Number(match[1]), text: clean(match[2]) };
    return null;
  }

  function optionMatch(line) { return line.match(/^([ABCD])\s*[.)\-:：]\s*(.*)$/i); }

  function answerLine(line) {
    const match = line.match(/^(?:Đáp\s*án|Dap\s*an|Answer|Ans)\s*[:：\-]?\s*([A-Da-d]|[1-4])\s*$/i);
    if (!match) return null;
    const value = match[1].toUpperCase();
    return /^[A-D]$/.test(value) ? value.charCodeAt(0) - 65 : Number(value) - 1;
  }

  function parseQuestions(items) {
    const questions = [];
    let current = null, autoNumber = 1;
    function finish() {
      if (!current) return;
      if (current.text && current.options.every(Boolean)) {
        questions.push({
          text: clean(current.text), options: current.options.slice(),
          answer: current.redAnswer !== null ? current.redAnswer : (current.fallbackAnswer ?? 0),
          red: current.redAnswer !== null, n: current.n
        });
      }
      current = null;
    }
    for (const item of items) {
      const line = item.text, start = questionStart(line);
      if (start) {
        finish();
        current = { n: Number(start.n) || autoNumber++, text: clean(start.text), options: ['', '', '', ''], redAnswer: null, fallbackAnswer: null };
        autoNumber = Math.max(autoNumber, current.n + 1);
        continue;
      }
      const option = optionMatch(line);
      if (option) {
        if (!current) current = { n: autoNumber++, text: '', options: ['', '', '', ''], redAnswer: null, fallbackAnswer: null };
        const index = 'ABCD'.indexOf(option[1].toUpperCase());
        current.options[index] = clean(option[2]);
        if (item.red) current.redAnswer = index;
        continue;
      }
      const fallback = answerLine(line);
      if (fallback !== null && current && current.redAnswer === null) { current.fallbackAnswer = fallback; continue; }
      if (current && current.options.every(value => !value)) current.text = clean(current.text + ' ' + line);
    }
    finish();
    return questions.filter(q => q.text && q.options.every(Boolean));
  }

  function parseListeningDocx(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('File Word không hợp lệ.');
    return parseQuestions(Array.from(doc.getElementsByTagNameNS('*', 'p')).map(paragraphData).filter(x => x.text));
  }

  function parseReadingDocx(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('File Word không hợp lệ.');
    const items = Array.from(doc.getElementsByTagNameNS('*', 'p')).map(paragraphData).filter(x => x.text);
    if (!items.length) throw new Error('File Word không có nội dung.');
    const title = items[0].text;
    const firstQuestion = items.findIndex((item, index) => index > 0 && questionStart(item.text));
    if (firstQuestion < 0) throw new Error('Không tìm thấy câu hỏi. Hãy dùng Question 1 / Câu 1 / 1.');
    const readingText = items.slice(1, firstQuestion).map(item => item.text).join('\n\n');
    const questions = parseQuestions(items.slice(firstQuestion));
    if (!questions.length) throw new Error('Không nhận diện được câu hỏi Reading.');
    return { title, readingText, questions };
  }

  function setStatus(id, html) { const node = $(id); if (node) node.innerHTML = html; }

  function replaceQuestions(parsed) {
    if (typeof window.removeQ !== 'function' || typeof window.addQ !== 'function') throw new Error('Không tìm thấy bộ tạo câu hỏi hiện tại.');
    const boxes = () => Array.from(document.querySelectorAll('#qs .q'));
    let current = boxes();
    while (current.length > 1) { window.removeQ(current.length - 1); current = boxes(); }
    if (!current.length) { window.addQ(); current = boxes(); }
    const first = current[0], firstQuestion = parsed[0];
    if (!first || !firstQuestion) throw new Error('Không thể tạo câu hỏi đầu tiên.');
    const text = first.querySelector('.qt'), options = Array.from(first.querySelectorAll('.qo')), answer = first.querySelector('.qa');
    if (text) text.value = firstQuestion.text;
    options.forEach((input, index) => input.value = firstQuestion.options[index] || '');
    if (answer) answer.value = String(firstQuestion.answer);
    if (typeof window.syncQ === 'function') window.syncQ();
    for (let i = 1; i < parsed.length; i++) window.addQ({text: parsed[i].text, options: parsed[i].options, answer: parsed[i].answer});
  }

  async function importListeningWord() {
    if (busy) return;
    const file = $('word')?.files?.[0];
    if (!file) return alert('Chọn file Word trước.');
    busy = true; setStatus('wordStatus', '⏳ Đang đọc Word và tìm đáp án màu đỏ...');
    try {
      const questions = parseListeningDocx(await readDocumentXml(file));
      const missing = questions.filter(q => !q.red).map(q => q.n);
      if (missing.length) throw new Error('Chưa tìm thấy chữ màu đỏ cho câu: ' + missing.join(', '));
      replaceQuestions(questions);
      setStatus('wordStatus', `✅ Đã nhập <b>${questions.length} câu</b> và tự nhận diện đáp án màu đỏ.`);
    } catch (error) { console.error(error); setStatus('wordStatus', '❌ ' + (error?.message || error)); }
    finally { busy = false; }
  }

  async function importReadingWord() {
    if (busy) return;
    const file = $('readingWord')?.files?.[0];
    if (!file) return alert('Chọn file Word Reading trước.');
    busy = true; setStatus('readingWordStatus', '⏳ Đang đọc tên đề, nội dung Reading, câu hỏi và đáp án màu đỏ...');
    try {
      const parsed = parseReadingDocx(await readDocumentXml(file));
      const missing = parsed.questions.filter(q => !q.red).map(q => q.n);
      if (missing.length) throw new Error('Chưa tìm thấy chữ màu đỏ cho câu: ' + missing.join(', '));
      if ($('ctitle')) $('ctitle').value = parsed.title;
      if ($('creading')) $('creading').value = parsed.readingText;
      replaceQuestions(parsed.questions);
      setStatus('readingWordStatus', `✅ Đã nhận diện <b>${escapeHtml(parsed.title)}</b> • ${parsed.questions.length} câu • đã nhập nội dung Reading.`);
    } catch (error) { console.error(error); setStatus('readingWordStatus', '❌ ' + (error?.message || error)); }
    finally { busy = false; }
  }

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }

  function installReadingUI() {
    const type = $('ct')?.value, field = $('readingField');
    if (!field || type !== 'reading' || $('readingWord')) return;
    const box = document.createElement('div');
    box.className = 'card'; box.style.cssText = 'margin:12px 0;padding:15px';
    box.innerHTML = `
      <h3 style="margin-top:0">📄 Import Word Reading</h3>
      <p class="muted">Mẫu Word: <b>Reading 1</b> → nội dung bài đọc → <b>Question 1</b> → A. → B. → C. → D.; đáp án đúng được <b>tô màu đỏ</b>.</p>
      <div class="upload">
        <label class="btn gray" for="readingWord">📄 Chọn file Word (.docx)</label>
        <input id="readingWord" class="hidden" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
        <div id="readingWordStatus" class="file-name">Chưa chọn file</div>
      </div>
      <div class="actions" style="margin-top:10px">
        <button class="btn" type="button" id="readReadingWordBtn">📥 Đọc Word Reading</button>
        <button class="btn gray" type="button" id="clearReadingWordBtn">🧹 Xóa dữ liệu Reading</button>
      </div>`;
    field.insertBefore(box, field.firstElementChild);
    $('readingWord').addEventListener('change', () => { const file = $('readingWord').files?.[0]; setStatus('readingWordStatus', file ? '📄 ' + escapeHtml(file.name) : 'Chưa chọn file'); });
    $('readReadingWordBtn').addEventListener('click', importReadingWord);
    $('clearReadingWordBtn').addEventListener('click', () => { if ($('creading')) $('creading').value = ''; if (typeof window.clearQuestions === 'function') window.clearQuestions(); setStatus('readingWordStatus', 'Đã xóa dữ liệu Reading.'); });
  }

  function installListeningHandler() {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find(button => {
      const text = button.textContent || '', onclick = button.getAttribute('onclick') || '';
      return (/Đọc Word/i.test(text) && !/Reading/i.test(text)) || /importWord\s*\(/.test(onclick);
    });
    if (!button || button.dataset.wordImporterBound === '1') return;
    button.dataset.wordImporterBound = '1'; button.removeAttribute('onclick');
    button.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); importListeningWord(); }, true);
    const wordInput = $('word');
    if (wordInput && wordInput.dataset.wordFileStatusBound !== '1') {
      wordInput.dataset.wordFileStatusBound = '1';
      wordInput.addEventListener('change', () => {
        const file = wordInput.files?.[0];
        setStatus('wordStatus', file ? '📄 ' + escapeHtml(file.name) : 'Chưa chọn file');
      });
    }
  }

  window.redWordImportHandler = importListeningWord;
  window.importWord = importListeningWord;
  window.readingWordImportHandler = importReadingWord;
  window.parseReadingDocx = parseReadingDocx;

  function install() { installListeningHandler(); installReadingUI(); }
  install();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  const observer = new MutationObserver(install);
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  let attempts = 0;
  const timer = setInterval(() => { install(); if (++attempts > 40) clearInterval(timer); }, 250);
})();