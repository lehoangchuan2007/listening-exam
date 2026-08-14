/* English Studio - Auth UI safety layer. Does not replace auth logic. */
(function(){
  function fix(){
    document.querySelectorAll('.auth.card, .student-auth-card').forEach(el=>{
      el.style.position='relative';
      el.style.zIndex='100001';
      el.style.pointerEvents='auto';
    });
    document.querySelectorAll('.auth.card input, .auth.card button, .student-auth-card input, .student-auth-card button').forEach(el=>{
      el.style.position='relative';
      el.style.zIndex='100002';
      el.style.pointerEvents='auto';
      el.style.touchAction='manipulation';
    });
    const overlays=[...document.querySelectorAll('.student-auth-overlay')];
    overlays.forEach(el=>{el.style.zIndex='100000';el.style.pointerEvents='auto';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
  new MutationObserver(fix).observe(document.documentElement,{subtree:true,childList:true});
})();
