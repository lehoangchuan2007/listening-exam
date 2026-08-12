// Supabase configuration
// Publishable/anon key is safe for browser use when RLS policies are configured.
// NEVER put a Supabase secret/service_role key in this file.
window.SUPABASE_CONFIG = {
  url: "https://lllxrjqwmsrapuwkgxdy.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbHhyanF3bXNyYXB1d2tneGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzYxMjcsImV4cCI6MjEwMTk1MjEyN30.wejKS6WsJfLCnKuA3_ZKm224SIXjZSydSebU_WAVODY"
};

// Friendly messages for students when the server rejects an unavailable exam.
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
    const s=String(text||''), low=s.toLowerCase();
    for(const k in friendly) if(low.includes(k)) return friendly[k];
    return null;
  }
  const oldAlert=window.alert;
  window.alert=function(message){ oldAlert.call(window,translate(message)||message); };
  document.addEventListener('DOMContentLoaded',function(){
    const root=document.body;
    if(!root)return;
    const scan=()=>{
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const n=walker.currentNode;
        if(n.parentElement && ['SCRIPT','STYLE','TEXTAREA','INPUT'].includes(n.parentElement.tagName)) continue;
        const f=translate(n.nodeValue);
        if(f && n.nodeValue!==f) n.nodeValue=f;
      }
    };
    setTimeout(scan,200);
  });
})();

// Teacher create-page enhancement.
(function(){
  const isCreatePage=/(?:^|\/)index\.html$/.test(location.pathname)||/\/$/.test(location.pathname);
  if(!isCreatePage)return;

  let scriptLoading=false;
  let observer=null;

  function bind(){
    const handler=window.redWordImportHandler;
    if(typeof handler!=='function')return false;
    const button=Array.from(document.querySelectorAll('button')).find(b=>/Đọc Word/i.test(b.textContent||'')||/importWord\s*\(/.test(b.getAttribute('onclick')||''));
    if(!button)return false;
    button.removeAttribute('onclick');
    if(button.dataset.redImporterBound!=='1'){
      button.dataset.redImporterBound='1';
      button.addEventListener('click',function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        handler();
      },true);
    }
    window.importWord=handler;
    if(observer){observer.disconnect();observer=null;}
    return true;
  }

  function load(){
    if(scriptLoading||document.getElementById('red-word-import-script'))return;
    scriptLoading=true;
    const s=document.createElement('script');
    s.id='red-word-import-script';
    s.src='./red-word-import.js?v=7';
    s.onload=()=>{scriptLoading=false;bind();};
    s.onerror=()=>{scriptLoading=false;console.error('Không tải được red-word-import.js');};
    document.head.appendChild(s);
  }

  function ensure(){
    if(!document.getElementById('word'))return;
    if(!bind())load();
  }

  function start(){
    ensure();
    if(!observer){
      observer=new MutationObserver(()=>{ if(bind()) return; ensure(); });
      observer.observe(document.body,{subtree:true,childList:true});
      setTimeout(()=>{if(observer){observer.disconnect();observer=null;}},5000);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

// Security guard.
(function(){
  if(document.getElementById('english-studio-security'))return;
  const s=document.createElement('script');
  s.id='english-studio-security';
  s.src='./security.js?v=3';
  s.defer=true;
  document.head.appendChild(s);
})();

// Multi-teacher registration helper.
(function(){
  if(!/admin\.html$/.test(location.pathname))return;
  if(document.getElementById('teacher-auth-script'))return;
  const s=document.createElement('script');
  s.id='teacher-auth-script';
  s.src='./teacher-auth.js?v=2';
  s.defer=true;
  document.head.appendChild(s);
})();

// Submission deletion controls for the teacher results page.
(function(){
  if(!/results\.html$/.test(location.pathname))return;
  const s=document.createElement('script');
  s.id='results-delete-script';
  s.src='./results-delete.js?v=1';
  s.defer=true;
  document.head.appendChild(s);
})();
