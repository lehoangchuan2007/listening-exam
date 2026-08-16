// English Studio - Load the File Explorer, move logic and Windows-like UI enhancer.
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  if(window.__ENGLISH_STUDIO_EXPLORER_RESTORE__)return;
  window.__ENGLISH_STUDIO_EXPLORER_RESTORE__=true;
  const load=(id,src)=>{
    if(document.getElementById(id))return;
    const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.head.appendChild(s);
  };
  const boot=()=>{
    load('exam-folders-explorer-v5','./exam-folders-explorer-v5.js?v=9');
    load('exam-folder-move-fix','./exam-folder-move-fix.js?v=3');
    setTimeout(()=>load('exam-folders-windows-ui','./exam-folders-windows-ui.js?v=2'),250);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
