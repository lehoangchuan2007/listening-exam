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
    load('exam-folders-explorer-v5','./exam-folders-explorer-v5.js?v=11');
    load('exam-folder-move-fix','./exam-folder-move-fix.js?v=5');
    load('exam-folders-windows-ui','./exam-folders-windows-ui.js?v=4');
  };

  // Legacy exam-folders.js can still be present in older cached pages and render
  // the old UI into #app. Check only during startup. Do NOT observe every DOM
  // mutation: Explorer v5 intentionally re-renders #app when navigating folders,
  // and a global MutationObserver causes needless work and visible lag.
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
    // Legacy protection is intentionally limited to startup. The canonical
    // Explorer is now the sole renderer and navigation must stay uninterrupted.
    setTimeout(repairLegacyOverride,600);
    setTimeout(repairLegacyOverride,1500);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
