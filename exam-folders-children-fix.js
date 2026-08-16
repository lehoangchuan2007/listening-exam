// Restore the File Explorer v5 interface as the single folder manager.
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  if(window.__ENGLISH_STUDIO_EXPLORER_RESTORE__)return;
  window.__ENGLISH_STUDIO_EXPLORER_RESTORE__=true;
  const load=()=>{
    if(!document.getElementById('exam-folders-explorer-v5')){
      const s=document.createElement('script');
      s.id='exam-folders-explorer-v5';
      s.src='./exam-folders-explorer-v5.js?v=8';
      s.defer=true;
      document.head.appendChild(s);
    }
    if(!document.getElementById('exam-folder-move-fix')){
      const m=document.createElement('script');
      m.id='exam-folder-move-fix';
      m.src='./exam-folder-move-fix.js?v=2';
      m.defer=true;
      document.head.appendChild(m);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
