// English Studio - Canonical File Explorer bootloader.
// manage.html must have ONE folder renderer: Explorer v5 + Windows 2-column shell.
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  if(window.__ENGLISH_STUDIO_EXPLORER_RESTORE__)return;
  window.__ENGLISH_STUDIO_EXPLORER_RESTORE__=true;

  const loadScript=(id,src)=>new Promise(resolve=>{
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
    const tick=()=>test()||Date.now()-started>=timeout?resolve():setTimeout(tick,50);
    tick();
  });

  async function boot(){
    // Canonical renderer first.
    await loadScript('exam-folders-explorer-v5','./exam-folders-explorer-v5.js?v=13');
    await waitFor(()=>!!document.querySelector('#app .efx5'),6000);

    // The only visual enhancer: Windows-style 2 columns + Quick Access.
    await loadScript('exam-folders-windows-ui','./exam-folders-windows-ui.js?v=6');
    await waitFor(()=>!!document.querySelector('#app .efwin-shell'),5000);

    // manage.html contains an older inline exam-list renderer. Keep its
    // create/edit helpers, but never allow its old load/render pair to replace
    // the canonical Explorer after boot.
    if(typeof window.render==='function'){
      window.__ENGLISH_STUDIO_LEGACY_RENDER__=window.render;
      window.render=function(){return false;};
    }
    if(typeof window.load==='function'){
      window.__ENGLISH_STUDIO_LEGACY_LOAD__=window.load;
      window.load=function(){
        const refresh=document.getElementById('fx-refresh');
        if(refresh){refresh.click();return true;}
        return false;
      };
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
