// English Studio - Canonical File Explorer bootloader.
// ONE folder UI on manage.html: Explorer v5 + move logic + Windows-like 2-column shell.
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  if(window.__ENGLISH_STUDIO_EXPLORER_RESTORE__)return;
  window.__ENGLISH_STUDIO_EXPLORER_RESTORE__=true;

  const load=(id,src)=>new Promise(resolve=>{
    const existing=document.getElementById(id);
    if(existing){
      if(existing.dataset.loaded==='1') return resolve();
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>resolve(),{once:true});
      return;
    }
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    s.defer=true;
    s.addEventListener('load',()=>{s.dataset.loaded='1';resolve()},{once:true});
    s.addEventListener('error',()=>resolve(),{once:true});
    document.head.appendChild(s);
  });

  const waitFor=(test,timeout=6000)=>new Promise(resolve=>{
    const started=Date.now();
    const tick=()=>{
      if(test()||Date.now()-started>=timeout)return resolve();
      setTimeout(tick,50);
    };
    tick();
  });

  async function boot(){
    // Canonical renderer FIRST. The Windows shell must never race it.
    await load('exam-folders-explorer-v5','./exam-folders-explorer-v5.js?v=11');
    await waitFor(()=>!!document.querySelector('#app .efx5'),6000);

    // Move logic is independent; it must not render another folder UI.
    await load('exam-folder-move-fix','./exam-folder-move-fix.js?v=5');

    // Load the 2-column Windows-like shell only after Explorer is ready.
    await load('exam-folders-windows-ui','./exam-folders-windows-ui.js?v=4');
    await waitFor(()=>!!document.querySelector('#app .efwin-shell'),5000);

    // Deterministic one-time retry if the enhancer failed to attach.
    const app=document.getElementById('app');
    if(app && !app.querySelector('.efwin-shell') && app.querySelector('.efx5')){
      const s=document.getElementById('exam-folders-windows-ui');
      if(s)s.remove();
      window.__ENGLISH_STUDIO_WINDOWS_UI__=false;
      await load('exam-folders-windows-ui-retry','./exam-folders-windows-ui.js?v=4r1');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
