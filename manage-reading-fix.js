// English Studio - Reading editor + passage compatibility bridge.
// Adds a basic rich-text editor for Reading without changing Listening UI/flow.
(function () {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return;
  if (window.__englishStudioManageReadingPatchInstalled) return;
  window.__englishStudioManageReadingPatchInstalled = true;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);

  function normalizePayload(payload) {
    if (Array.isArray(payload)) return payload.map(normalizePayload);
    if (!payload || typeof payload !== 'object') return payload;
    if (Object.prototype.hasOwnProperty.call(payload, 'reading_text')) {
      const text = String(payload.reading_text ?? '');
      return {
        ...payload,
        reading_passage:
          Object.prototype.hasOwnProperty.call(payload, 'reading_passage') &&
          String(payload.reading_passage ?? '').trim() !== ''
            ? payload.reading_passage
            : text
      };
    }
    return payload;
  }

  const STYLE_ID = 'english-studio-reading-editor-style';
  let editorObserver = null;
  let syncing = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));

  function plainToHtml(text) {
    const value = String(text ?? '').replace(/\r\n?/g, '\n');
    if (!value.trim()) return '<p><br></p>';
    if (/<(?:p|div|br|span|strong|b|em|i|u|font)\b/i.test(value)) return value;
    return value.split(/\n\n+/).map(p =>
      `<p>${p.split('\n').map(esc).join('<br>')}</p>`
    ).join('');
  }

  function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
    const allowed = new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','STRIKE','UL','OL','LI','SPAN','FONT']);
    const clean = node => {
      Array.from(node.children).forEach(el => {
        if (!allowed.has(el.tagName)) {
          const parent = el.parentNode;
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          el.remove();
          return;
        }
        Array.from(el.attributes).forEach(attr => {
          const name = attr.name.toLowerCase();
          if (name === 'style') {
            const safe = [];
            String(attr.value).split(';').forEach(rule => {
              const [rawProp, ...rest] = rule.split(':');
              const prop = String(rawProp || '').trim().toLowerCase();
              const val = rest.join(':').trim();
              if (!val) return;
              if (['font-family','font-size','text-align','font-weight','font-style','text-decoration'].includes(prop)) {
                if (!/[<>]/.test(val) && !/javascript\s*:/i.test(val)) safe.push(`${prop}:${val}`);
              }
            });
            if (safe.length) el.setAttribute('style', safe.join(';'));
            else el.removeAttribute('style');
          } else if (name === 'face' && el.tagName === 'FONT') {
            const v = attr.value;
            if (!/^[a-z0-9 ,"'_-]+$/i.test(v)) el.removeAttribute(attr.name);
          } else if (name === 'size' && el.tagName === 'FONT') {
            if (!/^[1-7]$/.test(attr.value)) el.removeAttribute(attr.name);
          } else {
            el.removeAttribute(attr.name);
          }
        });
        clean(el);
      });
      return node;
    };
    clean(doc.body);
    return doc.body.innerHTML || '<p><br></p>';
  }

  function syncHidden(editor, textarea) {
    if (!editor || !textarea || syncing) return;
    syncing = true;
    textarea.value = sanitizeHtml(editor.innerHTML);
    syncing = false;
  }

  function runCommand(editor, command, value = null) {
    editor.focus();
    try { document.execCommand('styleWithCSS', false, true); } catch (_) {}
    document.execCommand(command, false, value);
    syncHidden(editor, document.getElementById('creading'));
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .reading-editor-wrap{margin:12px 0}
      .reading-toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:9px;background:#f8fafc;border:1px solid #cbd5e1;border-bottom:0;border-radius:12px 12px 0 0}
      .reading-toolbar button,.reading-toolbar select{height:34px;border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:0 9px;font:inherit;cursor:pointer;color:#0f172a}
      .reading-toolbar button:hover,.reading-toolbar select:hover{border-color:#60a5fa;background:#eff6ff}
      .reading-toolbar .tool-sep{width:1px;height:24px;background:#cbd5e1;margin:0 2px}
      .reading-editor{min-height:280px;padding:14px 16px;border:1px solid #cbd5e1;border-radius:0 0 12px 12px;background:#fff;line-height:1.75;outline:none;overflow:auto}
      .reading-editor:focus{border-color:#2563eb;box-shadow:0 0 0 2px #2563eb22}
      .reading-editor p{margin:0 0 12px}
      .reading-editor ul,.reading-editor ol{padding-left:28px}
      .reading-editor-help{margin-top:8px;font-size:12px;color:#64748b}
      @media(max-width:600px){.reading-toolbar{gap:5px}.reading-toolbar button,.reading-toolbar select{padding:0 7px;font-size:13px}.reading-editor{min-height:240px}}
    `;
    document.head.appendChild(style);
  }

  function toolbarHtml() {
    return `
      <div class="reading-toolbar" role="toolbar" aria-label="Định dạng bài Reading">
        <select class="rf-font" title="Font chữ">
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Calibri">Calibri</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
        <select class="rf-size" title="Cỡ chữ">
          <option value="2">12 px</option>
          <option value="3" selected>16 px</option>
          <option value="4">18 px</option>
          <option value="5">22 px</option>
          <option value="6">26 px</option>
          <option value="7">30 px</option>
        </select>
        <span class="tool-sep"></span>
        <button type="button" data-cmd="bold" title="Đậm"><b>B</b></button>
        <button type="button" data-cmd="italic" title="Nghiêng"><i>I</i></button>
        <button type="button" data-cmd="underline" title="Gạch chân"><u>U</u></button>
        <button type="button" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
        <span class="tool-sep"></span>
        <button type="button" data-cmd="justifyLeft" title="Căn trái">☰</button>
        <button type="button" data-cmd="justifyCenter" title="Căn giữa">≡</button>
        <button type="button" data-cmd="justifyRight" title="Căn phải">☷</button>
        <button type="button" data-cmd="justifyFull" title="Căn đều">▤</button>
        <span class="tool-sep"></span>
        <button type="button" data-cmd="insertUnorderedList" title="Danh sách">• List</button>
        <button type="button" data-cmd="insertOrderedList" title="Danh sách đánh số">1. List</button>
        <button type="button" class="rf-clear" title="Xóa định dạng">Tx</button>
      </div>`;
  }

  function installEditor() {
    const type = document.getElementById('ct')?.value;
    const textarea = document.getElementById('creading');
    const field = document.getElementById('readingField');
    if (!field || type !== 'reading' || !textarea) return;
    if (document.getElementById('readingEditor')) return;

    installStyle();
    const wrap = document.createElement('div');
    wrap.className = 'reading-editor-wrap';
    wrap.innerHTML = toolbarHtml() + `
      <div id="readingEditor" class="reading-editor" contenteditable="true" spellcheck="true"></div>
      <div class="reading-editor-help">💡 Bôi đen đoạn chữ rồi chọn định dạng. Nội dung được lưu cùng đề.</div>`;
    textarea.parentNode.insertBefore(wrap, textarea);
    textarea.style.display = 'none';

    const editor = document.getElementById('readingEditor');
    editor.innerHTML = plainToHtml(textarea.value || '');

    wrap.querySelectorAll('[data-cmd]').forEach(button => {
      button.addEventListener('mousedown', e => e.preventDefault());
      button.addEventListener('click', () => runCommand(editor, button.dataset.cmd));
    });
    wrap.querySelector('.rf-clear').addEventListener('mousedown', e => e.preventDefault());
    wrap.querySelector('.rf-clear').addEventListener('click', () => runCommand(editor, 'removeFormat'));
    wrap.querySelector('.rf-font').addEventListener('change', e => runCommand(editor, 'fontName', e.target.value));
    wrap.querySelector('.rf-size').addEventListener('change', e => runCommand(editor, 'fontSize', e.target.value));
    editor.addEventListener('input', () => syncHidden(editor, textarea));
    editor.addEventListener('blur', () => syncHidden(editor, textarea));
    syncHidden(editor, textarea);

    window.syncReadingEditor = function () {
      const target = document.getElementById('readingEditor');
      const hidden = document.getElementById('creading');
      if (!target || !hidden) return;
      target.innerHTML = plainToHtml(hidden.value || '');
      syncHidden(target, hidden);
    };
  }

  function installObserver() {
    if (editorObserver || !document.body) return;
    editorObserver = new MutationObserver(() => installEditor());
    editorObserver.observe(document.body, { childList:true, subtree:true });
  }

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient(...args);
    if (!client || typeof client.from !== 'function') return client;
    const originalFrom = client.from.bind(client);
    client.from = function (table) {
      const builder = originalFrom(table);
      if (table !== 'exams' || !builder) return builder;
      for (const method of ['insert', 'update']) {
        if (typeof builder[method] !== 'function') continue;
        const original = builder[method].bind(builder);
        builder[method] = function (payload, ...rest) {
          return original(normalizePayload(payload), ...rest);
        };
      }
      return builder;
    };
    return client;
  };

  function boot() {
    installStyle();
    installEditor();
    installObserver();
    setTimeout(installEditor, 300);
    setTimeout(installEditor, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
