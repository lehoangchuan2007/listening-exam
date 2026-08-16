// Loader for the original File Explorer v5 UI.
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  if(window.__ENGLISH_STUDIO_EXPLORER_RESTORE__)return;
  window.__ENGLISH_STUDIO_EXPLORER_RESTORE__=true;
  const load=()=>{
    if(document.getElementById('exam-folders-explorer-v5'))return;
    const s=document.createElement('script');
    s.id='exam-folders-explorer-v5';
    s.src='./exam-folders-explorer-v5.js?v=8';
    s.defer=true;
    document.head.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
