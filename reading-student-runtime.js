// English Studio - Reading runtime bridge v2.
// The real Reading page owns loading, rendering and submission.
// This bridge only prevents older patch scripts from using the legacy direct INSERT path.
(function(){
  if(!/\/reading\.html$/.test(location.pathname)) return;
  if(window.__ENGLISH_STUDIO_READING_RUNTIME_V2__) return;
  window.__ENGLISH_STUDIO_READING_RUNTIME_V2__=true;

  function bind(){
    const button=document.getElementById('submit');
    if(!button){setTimeout(bind,100);return;}
    if(button.dataset.readingRuntimeV2==='1')return;
    button.dataset.readingRuntimeV2='1';
    button.addEventListener('click',function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof window.__englishStudioSubmitReading==='function'){
        window.__englishStudioSubmitReading(false);
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
