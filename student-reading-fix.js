// English Studio - Reading student compatibility + rich-text passage rendering.
// Keeps Listening unchanged and lets Reading display the formatting saved by the teacher.
(function () {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return;
  if (window.__englishStudioReadingPatchInstalledV2) return;
  window.__englishStudioReadingPatchInstalledV2 = true;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);
  window.__englishStudioReadingRichByExam = window.__englishStudioReadingRichByExam || {};

  function unwrap(value) {
    if (Array.isArray(value)) return value[0] || null;
    if (value && Array.isArray(value.data)) return value.data[0] || null;
    if (typeof value === 'string') {
      try { return unwrap(JSON.parse(value)); } catch (_) { return null; }
    }
    return value && typeof value === 'object' ? value : null;
  }

  function replaceFirst(value, merged) {
    if (Array.isArray(value)) return [merged, ...value.slice(1)];
    if (value && Array.isArray(value.data)) return { ...value, data: [merged, ...value.data.slice(1)] };
    if (typeof value === 'string') return JSON.stringify(merged);
    return merged;
  }

  function decodeHtml(value) {
    let raw = String(value ?? '');
    if (/&lt;\/?[a-z][\s\S]*&gt;/i.test(raw)) {
      const box = document.createElement('textarea');
      box.innerHTML = raw;
      raw = box.value;
    }
    return raw;
  }

  function sanitizeReadingHtml(html) {
    let source = decodeHtml(html);
    if (!/<[a-z][\s\S]*>/i.test(source)) {
      return source.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])).replace(/\r\n?/g,'\n').replace(/\n/g,'<br>');
    }
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const allowed = new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','STRIKE','UL','OL','LI','SPAN','FONT','H1','H2','H3','H4','SUB','SUP','MARK']);
    const safeCss = new Set(['font-family','font-size','text-align','font-weight','font-style','text-decoration','line-height','color','background-color']);
    function clean(node) {
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
            const keep = [];
            String(attr.value).split(';').forEach(rule => {
              const [rawProp, ...rest] = rule.split(':');
              const prop = String(rawProp || '').trim().toLowerCase();
              const val = rest.join(':').trim();
              if (!safeCss.has(prop) || !val || /[<>]/.test(val) || /javascript\s*:/i.test(val)) return;
              if (prop === 'font-family' && !/^[a-z0-9 ,"'_-]+$/i.test(val)) return;
              if (prop === 'font-size' && !/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(val)) return;
              if (prop === 'text-align' && !/^(left|center|right|justify)$/i.test(val)) return;
              if (prop === 'font-weight' && !/^(normal|bold|[1-9]00)$/.test(val)) return;
              if (prop === 'font-style' && !/^(normal|italic|oblique)$/.test(val)) return;
              if (prop === 'text-decoration' && !/^[a-z -]+$/i.test(val)) return;
              if (prop === 'line-height' && !/^[0-9.]+(?:px|pt|em|rem|%)?$/.test(val)) return;
              if ((prop === 'color' || prop === 'background-color') && !/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(val)) return;
              keep.push(`${prop}:${val}`);
            });
            if (keep.length) el.setAttribute('style', keep.join(';')); else el.removeAttribute('style');
          } else if (name === 'face' && el.tagName === 'FONT') {
            if (!/^[a-z0-9 ,"'_-]+$/i.test(attr.value)) el.removeAttribute(attr.name);
          } else if (name === 'size' && el.tagName === 'FONT') {
            if (!/^[1-7]$/.test(attr.value)) el.removeAttribute(attr.name);
          } else if (name === 'color' && el.tagName === 'FONT') {
            if (!/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(attr.value)) el.removeAttribute(attr.name);
          } else {
            el.removeAttribute(attr.name);
          }
        });
        clean(el);
      });
    }
    clean(doc.body);
    return doc.body.innerHTML || '<p><br></p>';
  }

  function installReadingStyle() {
    if (document.getElementById('english-studio-reading-rich-style')) return;
    const style = document.createElement('style');
    style.id = 'english-studio-reading-rich-style';
    style.textContent = `
      .reading-text { white-space:normal!important; line-height:1.9; font-size:16px; overflow-wrap:anywhere; }
      .reading-text p { margin:0 0 14px; }
      .reading-text div { margin:0 0 10px; }
      .reading-text strong,.reading-text b { font-weight:700!important; }
      .reading-text em,.reading-text i { font-style:italic!important; }
      .reading-text u { text-decoration:underline!important; }
      .reading-text h1,.reading-text h2,.reading-text h3,.reading-text h4 { margin:0 0 12px; line-height:1.35; }
      .reading-text ul,.reading-text ol { padding-left:28px; margin:8px 0 14px; }
      .reading-text mark { padding:0 2px; }
    `;
    document.head.appendChild(style);
  }

  function currentExamId() {
    const m = String(location.hash || '').match(/^#exam=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function getRichSource() {
    const id = currentExamId();
    return id ? (window.__englishStudioReadingRichByExam[id] || '') : '';
  }

  function renderFormattedPassage() {
    const node = document.querySelector('.reading-text');
    if (!node) return;

    // The main student script keeps `exam` in a private lexical variable,
    // so we cannot read it from window. The RPC interceptor below stores the
    // rich passage here, keyed by the exam id from the URL.
    let source = getRichSource();
    if (!source) source = node.textContent || node.innerText || '';
    source = decodeHtml(source);

    if (node.dataset.richRendered === '1' && node.dataset.richSource === source) return;

    installReadingStyle();
    node.innerHTML = sanitizeReadingHtml(source || 'Chưa có nội dung Reading.');
    node.dataset.richRendered = '1';
    node.dataset.richSource = source;
  }

  window.__renderEnglishStudioReadingPassage = renderFormattedPassage;

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient(...args);
    if (!client || typeof client.rpc !== 'function') return client;
    const originalRpc = client.rpc.bind(client);
    client.rpc = async function (fn, params, options) {
      const result = await originalRpc(fn, params, options);
      if (fn !== 'get_exam_for_student' || !params?.p_exam_id || result?.error) return result;

      const base = unwrap(result.data);
      if (!base?.id) return result;

      let reading = null;
      try {
        const readingResult = await originalRpc('get_reading_exam_for_student', { p_exam_id: params.p_exam_id });
        if (!readingResult?.error) reading = unwrap(readingResult.data);
      } catch (_) {}

      const rich = reading?.reading_passage || reading?.reading_text || base.reading_passage || base.reading_text || base.passage || base.content || '';
      if (rich) window.__englishStudioReadingRichByExam[params.p_exam_id] = rich;

      if (reading?.id && String(reading.exam_type || '').toLowerCase() === 'reading') {
        const merged = {
          ...base,
          ...reading,
          exam_type: 'reading',
          // IMPORTANT: student.html's readingText() checks reading_text first.
          // Put the rich HTML there so the existing renderer receives it.
          reading_text: rich,
          reading_passage: rich
        };
        return { ...result, data: replaceFirst(result.data, merged) };
      }

      const legacyPassage = rich;
      if (String(base.exam_type || '').toLowerCase() === 'reading' || legacyPassage) {
        return { ...result, data: replaceFirst(result.data, { ...base, exam_type:'reading', reading_text:legacyPassage, reading_passage:legacyPassage }) };
      }
      return result;
    };
    return client;
  };

  const observer = new MutationObserver(() => renderFormattedPassage());
  function boot() {
    installReadingStyle();
    if (document.body) observer.observe(document.body, {childList:true, subtree:true});
    renderFormattedPassage();
    let n = 0;
    const timer = setInterval(() => {
      renderFormattedPassage();
      if (++n > 120) clearInterval(timer);
    }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
