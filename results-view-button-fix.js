/* English Studio - teacher results view button fix */
(function(){
  if(!/results\.html$/.test(location.pathname)) return;
  function patch(){
    document.querySelectorAll('#tbody button').forEach(btn=>{
      const text=(btn.textContent||'').trim();
      if(text.includes('Xem bài')){
        btn.textContent='👁 Xem bài làm';
        btn.classList.add('results-view-answer-btn');
        btn.style.display='inline-block';
      }
    });
  }
  const observer=new MutationObserver(patch);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',patch);
  setInterval(patch,500);
  patch();
})();
