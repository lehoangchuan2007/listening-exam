// Listening Word import feedback fix.
// Shows immediate feedback when a .docx file is selected.
(function(){
  if(!/manage\.html$/.test(location.pathname)) return;
  if(window.__WORD_UPLOAD_STATUS_FIX__) return;
  window.__WORD_UPLOAD_STATUS_FIX__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function bind(){
    const input = document.getElementById('word');
    const status = document.getElementById('wordStatus');
    if(!input || !status || input.dataset.uploadStatusBound === '1') return;

    input.dataset.uploadStatusBound = '1';
    input.addEventListener('change', function(){
      const file = input.files && input.files[0];
      if(!file){
        status.textContent = 'Chưa chọn file';
        return;
      }
      const size = file.size < 1024 * 1024
        ? (file.size / 1024).toFixed(1) + ' KB'
        : (file.size / 1024 / 1024).toFixed(2) + ' MB';
      status.innerHTML = '✅ <b>Đã tải file vào trình duyệt</b>: ' + esc(file.name) + ' • ' + size + ' • sẵn sàng đọc';
    });
  }

  function start(){
    bind();
    const observer = new MutationObserver(bind);
    observer.observe(document.body, {childList:true, subtree:true});
    setTimeout(() => observer.disconnect(), 10000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
