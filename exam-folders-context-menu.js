// English Studio - Context menu controller
// Uses the existing Explorer v5 menu actions; it does not own data or CRUD logic.
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_CONTEXT_MENU__)return;
  window.__ENGLISH_STUDIO_CONTEXT_MENU__=true;
  function close(){document.querySelectorAll('.efx5menu').forEach(m=>m.remove())}
  function openExisting(target,x,y){
    const more=target?.querySelector?.('.efx5more');
    if(!more)return;
    close();
    more.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:Number.isFinite(x)?x:8,clientY:Number.isFinite(y)?y:8,button:0,view:window}));
  }
  function bind(){
    const root=document.querySelector('.efwin-main');
    if(!root||root.dataset.contextController==='1')return;
    root.dataset.contextController='1';
    root.addEventListener('contextmenu',e=>{
      const item=e.target.closest('.efx5item[data-folder],.efx5item[data-exam]');
      if(!item||!root.contains(item))return;
      e.preventDefault();e.stopPropagation();
      openExisting(item,e.clientX,e.clientY);
    },true);
  }
  function watch(){
    const started=Date.now();
    const timer=setInterval(()=>{
      if(document.querySelector('.efwin-main .efx5')){bind();clearInterval(timer)}
      if(Date.now()-started>7000)clearInterval(timer)
    },50)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
