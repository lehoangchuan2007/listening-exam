// Supabase configuration
// Publishable/anon key is safe for browser use when RLS policies are configured.
// NEVER put a Supabase secret/service_role key in this file.
window.SUPABASE_CONFIG = {
  url: "https://lllxrjqwmsrapuwkgxdy.supabase.co",
  anonKey: "sb_publishable_5ixNQl8DbYYZ7juw5oO-MQ_QoB_kwRT"
};

// Friendly messages for students when the server rejects an unavailable exam.
// The actual security checks remain in Supabase/RPC; this only improves the UI.
(function(){
  const friendly={
    "maximum attempts reached":"🚫 Bạn đã hết số lần làm bài. Vui lòng liên hệ giáo viên nếu cần được hỗ trợ.",
    "exam is closed or not available":"🔒 Đề thi hiện đã đóng hoặc không còn khả dụng.",
    "exam is not available yet":"⏰ Chưa đến thời gian thi. Vui lòng quay lại sau.",
    "exam has ended":"⏰ Thời gian làm bài của đề đã kết thúc.",
    "not allowed":"🚫 Bạn không được phép thực hiện thao tác này.",
    "invalid exam":"❌ Đề thi không hợp lệ hoặc không tồn tại."
  };
  function translate(text){
    const s=String(text||'');
    const low=s.toLowerCase();
    for(const k in friendly) if(low.includes(k)) return friendly[k];
    return null;
  }
  const oldAlert=window.alert;
  window.alert=function(message){
    const f=translate(message);
    oldAlert.call(window,f||message);
  };
  function scan(){
    const root=document.body;
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    for(const n of nodes){
      if(n.parentElement && ['SCRIPT','STYLE','TEXTAREA','INPUT'].includes(n.parentElement.tagName)) continue;
      const f=translate(n.nodeValue);
      if(f && n.nodeValue!==f) n.nodeValue=f;
    }
  }
  document.addEventListener('DOMContentLoaded',function(){
    const observer=new MutationObserver(function(){scan()});
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    setTimeout(scan,200);
  });
})();

// Teacher create-page enhancement.
(function(){
  const isCreatePage = /(?:^|\/)index\.html$/.test(location.pathname) || /\/$/.test(location.pathname);
  if(!isCreatePage) return;

  let loading=false;

  function bindRedImporter(){
    if(typeof window.redWordImportHandler!=='function') return false;
    window.importWord=window.redWordImportHandler;
    const button=Array.from(document.querySelectorAll('button'))
      .find(b=>/Đọc Word/i.test(b.textContent||'') || /importWord\s*\(/.test(b.getAttribute('onclick')||''));
    if(button){
      button.removeAttribute('onclick');
      if(button.dataset.redImporterBound!=='1'){
        button.dataset.redImporterBound='1';
        button.addEventListener('click',function(event){
          event.preventDefault();
          event.stopImmediatePropagation();
          window.redWordImportHandler();
        },true);
      }
    }
    return true;
  }

  function loadImporter(){
    if(loading || document.getElementById('red-word-import-script')) return;
    loading=true;
    const s=document.createElement('script');
    s.id='red-word-import-script';
    s.src='./red-word-import.js?v=5';
    s.async=false;
    s.onload=function(){loading=false;bindRedImporter();};
    s.onerror=function(){loading=false;console.error('Không tải được red-word-import.js');};
    document.head.appendChild(s);
  }

  function ensureImporter(){
    const word=document.getElementById('word');
    if(!word) return;
    if(typeof window.redWordImportHandler==='function') bindRedImporter();
    else loadImporter();
  }

  function observe(){
    if(!document.body) return;
    const observer=new MutationObserver(ensureImporter);
    observer.observe(document.body,{subtree:true,childList:true});
    ensureImporter();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',observe,{once:true});
  else observe();
})();
