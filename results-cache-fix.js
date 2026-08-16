// English Studio - force a fresh results page when opening from teacher exam management
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  const VERSION='20260816-1';
  document.addEventListener('click',function(e){
    const a=e.target.closest('a[href*="results.html?exam="]');
    if(!a)return;
    try{
      const u=new URL(a.href,location.href);
      u.searchParams.set('v',VERSION);
      a.href=u.href;
    }catch(_e){}
  },true);
})();
