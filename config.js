// Supabase configuration
// Publishable/anon key is safe for browser use when RLS policies are configured.
// NEVER put a Supabase secret/service_role key in this file.
window.SUPABASE_CONFIG = {
  url: "https://lllxrjqwmsrapuwkgxdy.supabase.co",
  anonKey: "sb_publishable_5ixnQl8DbYYZ7juw5oO-MQ_QoB_kwRT"
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

// Optional enhancement: on the teacher's create page, replace the plain-text
// Word importer with a DOCX parser that detects red answer text.
(function(){
  const isCreatePage = /(?:^|\/)index\.html$/.test(location.pathname) || /\/$/.test(location.pathname);
  if(!isCreatePage) return;
  const load=()=>{
    if(document.getElementById('red-word-import-script')) return;
    const s=document.createElement('script');
    s.id='red-word-import-script';
    s.src='./red-word-import.js?v=2';
    s.async=false;
    s.onload=()=>{
      if(typeof window.redWordImportHandler==='function') window.redWordImportHandler;
    };
    document.head.appendChild(s);
  };
  setTimeout(load,0);
})();
