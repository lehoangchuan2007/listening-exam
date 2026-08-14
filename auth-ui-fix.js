/* English Studio - Auth UI safety layer.
   Student pages intentionally skip this MutationObserver layer because the
   student auth runtime owns its own UI. This keeps student.html responsive. */
(function(){
  if(/student\.html$/.test(location.pathname)) return;
  function fix(){
    document.querySelectorAll('.auth.card, .student-auth-card').forEach(el=>{
      el.style.position='relative';el.style.zIndex='100001';el.style.pointerEvents='auto';
    });
    document.querySelectorAll('.auth.card input, .auth.card button, .student-auth-card input, .student-auth-card button').forEach(el=>{
      el.style.position='relative';el.style.zIndex='100002';el.style.pointerEvents='auto';el.style.touchAction='manipulation';
    });
    document.querySelectorAll('.student-auth-overlay').forEach(el=>{el.style.zIndex='100000';el.style.pointerEvents='auto';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
  new MutationObserver(fix).observe(document.documentElement,{subtree:true,childList:true});
})();
