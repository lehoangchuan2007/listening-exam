// English Studio - position the + Mới menu beside its trigger button.
// This is intentionally isolated from Explorer state/rendering to avoid affecting performance.
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_NEW_MENU_POSITION__)return;
  window.__ENGLISH_STUDIO_NEW_MENU_POSITION__=true;
  function bind(){
    document.querySelectorAll('#fx-new,#fx-empty').forEach(btn=>{
      if(btn.dataset.newMenuPositionBound==='1')return;
      btn.dataset.newMenuPositionBound='1';
      btn.addEventListener('click',()=>{
        requestAnimationFrame(()=>{
          const menu=document.querySelector('.efx5menu');
          if(!menu)return;
          const r=btn.getBoundingClientRect();
          const mw=Math.min(menu.offsetWidth||190,190),mh=menu.offsetHeight||90;
          let left=r.right-mw;
          let top=r.bottom+7;
          if(left<8)left=8;
          if(left+mw>innerWidth-8)left=innerWidth-mw-8;
          if(top+mh>innerHeight-8)top=r.top-mh-7;
          if(top<8)top=8;
          menu.style.left=`${Math.round(left)}px`;
          menu.style.top=`${Math.round(top)}px`;
        });
      });
    });
  }
  const observer=new MutationObserver(bind);
  function start(){bind();const app=document.getElementById('app');if(app)observer.observe(app,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),5000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
