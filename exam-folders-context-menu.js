// English Studio - Context menu controller
// Keeps the existing Explorer controller and only fixes interaction/visual placement.
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_CONTEXT_MENU__)return;
  window.__ENGLISH_STUDIO_CONTEXT_MENU__=true;
  function close(){document.querySelectorAll('.efx5menu').forEach(m=>m.remove())}
  function injectVisualFix(){
    if(document.getElementById('efctx-visual-fix'))return;
    const s=document.createElement('style');s.id='efctx-visual-fix';s.textContent=`
      .efwin-main .efx5grid .efx5item[data-exam]{display:grid!important;grid-template-columns:22px 30px minmax(160px,1fr) 88px 70px 34px!important;align-items:center!important;column-gap:8px!important;min-height:44px!important;padding:6px 10px!important}
      .efwin-main .efx5grid .efx5item[data-exam] .efx5check{position:static!important;grid-column:1!important;grid-row:1!important;width:15px!important;height:15px!important;margin:0!important;justify-self:center!important}
      .efwin-main .efx5grid .efx5item[data-exam] .efx5icon{grid-column:2!important;grid-row:1!important;padding-left:0!important;margin:0!important;font-size:21px!important;text-align:center!important}
      .efwin-main .efx5grid .efx5item[data-exam] .efx5name{grid-column:3!important;grid-row:1!important;margin:0!important;padding:0!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:14px!important;font-weight:700!important}
      .efwin-main .efx5grid .efx5item[data-exam] .efx5meta{grid-column:4 / span 2!important;grid-row:1!important;margin:0!important;font-size:12px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .efwin-main .efx5grid .efx5item[data-exam] .efx5more{grid-column:6!important;grid-row:1!important;position:static!important;justify-self:end!important;margin:0!important}
      .efwin-main .efx5grid .efx5item[data-folder]{display:grid!important;grid-template-columns:32px minmax(0,1fr) 34px!important;align-items:center!important;column-gap:9px!important;min-height:48px!important}
      .efwin-main .efx5grid .efx5item[data-folder] .efx5icon{grid-column:1!important;grid-row:1!important;padding:0!important;margin:0!important}
      .efwin-main .efx5grid .efx5item[data-folder] .efx5name{grid-column:2!important;grid-row:1!important;margin:0!important;padding:0!important}
      .efwin-main .efx5grid .efx5item[data-folder] .efx5meta{grid-column:2!important;grid-row:2!important;margin:0!important}
      .efwin-main .efx5grid .efx5item[data-folder] .efx5more{grid-column:3!important;grid-row:1 / span 2!important;position:static!important;justify-self:end!important;margin:0!important}
      .efx5menu{position:fixed!important;z-index:100000!important}
      @media(max-width:850px){.efwin-main .efx5grid .efx5item[data-exam]{grid-template-columns:20px 28px minmax(120px,1fr) 78px 60px 30px!important}}
      @media(max-width:680px){.efwin-main .efx5grid .efx5item[data-exam]{grid-template-columns:20px 28px minmax(0,1fr) 30px!important}.efwin-main .efx5grid .efx5item[data-exam] .efx5meta{display:none!important}}
    `;document.head.appendChild(s)
  }
  function openExisting(target,x,y){
    const more=target?.querySelector?.('.efx5more');
    if(!more)return false;
    close();
    const px=Number.isFinite(x)?x:16,py=Number.isFinite(y)?y:16;
    more.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:px,clientY:py,button:0,view:window}));
    requestAnimationFrame(()=>{const m=document.querySelector('.efx5menu');if(!m)return;const w=m.offsetWidth||190,h=m.offsetHeight||230;m.style.left=Math.max(8,Math.min(px,innerWidth-w-8))+'px';m.style.top=Math.max(8,Math.min(py,innerHeight-h-8))+'px'});
    return true
  }
  function bind(){
    const root=document.querySelector('.efwin-main');if(!root)return;injectVisualFix();
    if(root.dataset.contextController==='2')return;root.dataset.contextController='2';
    root.addEventListener('contextmenu',e=>{const item=e.target.closest('.efx5item[data-folder],.efx5item[data-exam]');if(!item||!root.contains(item))return;e.preventDefault();e.stopImmediatePropagation();openExisting(item,e.clientX,e.clientY)},true)
  }
  function watch(){injectVisualFix();const started=Date.now();const timer=setInterval(()=>{bind();if(document.querySelector('.efwin-main .efx5item'))clearInterval(timer);if(Date.now()-started>8000)clearInterval(timer)},50)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch()
})();