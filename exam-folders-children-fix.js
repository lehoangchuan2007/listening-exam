// English Studio - Canonical File Explorer bootloader.
// There must be ONE folder UI on manage.html: Explorer v5 + move logic + Windows-like shell.
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  if(window.__ENGLISH_STUDIO_EXPLORER_RESTORE__)return;
  window.__ENGLISH_STUDIO_EXPLORER_RESTORE__=true;

  const load=(id,src)=>{
    if(document.getElementById(id))return;
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    s.defer=true;
    document.head.appendChild(s);
  };

  const boot=()=>{
    load('exam-folders-explorer-v5','./exam-folders-explorer-v5.js?v=10');
    load('exam-folder-move-fix','./exam-folder-move-fix.js?v=4');
    load('exam-folders-windows-ui','./exam-folders-windows-ui.js?v=3');
  };

  // Legacy exam-folders.js can still be present in older cached pages and render
  // the old UI into #app. If that happens, immediately restore the canonical
  // Explorer instead of allowing the two renderers to fight over #app.
  const repairLegacyOverride=()=>{
    const app=document.getElementById('app');
    if(!app)return;
    const legacy=app.querySelector('.ef-shell');
    const explorer=app.querySelector('.efx5');
    if(legacy&&!explorer){
      legacy.remove();
      window.__ENGLISH_STUDIO_EXPLORER_V5__=false;
      const old=document.getElementById('exam-folders-explorer-v5');
      if(old)old.remove();
      boot();
    }
  };

  const start=()=>{
    boot();
    const observer=new MutationObserver(()=>setTimeout(repairLegacyOverride,0));
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
    setTimeout(repairLegacyOverride,400);
    setTimeout(repairLegacyOverride,1200);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
