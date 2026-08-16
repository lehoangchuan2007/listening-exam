/* English Studio - teacher results action label only */
(function(){
  if(!/results\.html$/.test(location.pathname)) return;
  const LABEL='👁 Xem bài làm';
  let scheduled=false;
  function patch(){
    scheduled=false;
    const tbody=document.getElementById('tbody');
    if(!tbody) return;
    tbody.querySelectorAll('button').forEach(btn=>{
      const text=(btn.textContent||'').trim();
      if(/xem bài/i.test(text) && text!==LABEL){
        btn.textContent=LABEL;
        btn.classList.add('results-view-answer-btn');
      }
    });
  }
  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(patch);
  }
  const style=document.createElement('style');
  style.textContent='.results-view-answer-btn{white-space:nowrap;display:inline-flex!important;align-items:center;justify-content:center}';
  document.head.appendChild(style);
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',patch,{once:true});
  else patch();
})();
