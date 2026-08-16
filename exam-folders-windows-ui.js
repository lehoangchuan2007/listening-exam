// English Studio - Windows-like File Explorer UI
// IMPORTANT: this layer NEVER owns folder data. Explorer v5 is the single source of truth.
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_WINDOWS_UI__)return;
  window.__ENGLISH_STUDIO_WINDOWS_UI__=true;

  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

  function style(){
    if(document.getElementById('efwin-css'))return;
    const s=document.createElement('style');s.id='efwin-css';s.textContent=`
      .efwin-shell{display:grid;grid-template-columns:228px minmax(0,1fr);gap:0;margin-top:15px;background:#fff;border:1px solid #d7dee8;border-radius:12px;overflow:hidden;min-height:540px;box-shadow:0 4px 18px rgba(15,23,42,.07)}
      .efwin-side{background:#f8fafc;border-right:1px solid #e2e8f0;padding:10px 7px;overflow:auto;user-select:none}
      .efwin-side-title{font-size:11px;font-weight:800;color:#64748b;padding:9px 11px 7px;text-transform:uppercase;letter-spacing:.06em}
      .efwin-tree{display:flex;flex-direction:column;gap:1px}.efwin-tree button{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 10px;border-radius:7px;cursor:pointer;font:14px inherit;color:#334155;transition:background .12s ease,color .12s ease}.efwin-tree button:hover{background:#eaf1fb;color:#1e40af}.efwin-tree button.home{font-weight:700;color:#1e293b;margin-bottom:3px}.efwin-tree button.active{background:#dbeafe;color:#1d4ed8;font-weight:700}
      .efwin-main{min-width:0;background:#fff}.efwin-main .efx5{margin:0;padding:14px 16px}.efwin-main .efx5bar{margin-bottom:10px}.efwin-main .efx5bar h2{font-size:20px}.efwin-main .efx5panel{border-radius:9px;box-shadow:none;margin-top:10px}.efwin-main .efx5grid{display:flex;flex-direction:column;gap:0;padding:0}.efwin-main .efx5item{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) 190px 34px;align-items:center;gap:10px;border:0;border-bottom:1px solid #edf1f5;border-radius:0;padding:8px 12px;min-height:58px;background:#fff;transition:background .12s ease}.efwin-main .efx5item:hover{background:#f6f9fd}.efwin-main .efx5item.sel{background:#e8f1ff}.efwin-main .efx5item:last-child{border-bottom:0}.efwin-main .efx5icon{font-size:27px;text-align:center;line-height:1}.efwin-main .efx5name{margin:0;font-weight:650;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.efwin-main .efx5meta{margin:0;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.efwin-main .efx5more{position:static;justify-self:end;width:30px;height:30px;border:0;background:transparent;border-radius:7px;opacity:.45;transition:opacity .12s,background .12s;cursor:pointer}.efwin-main .efx5item:hover .efx5more{opacity:1}.efwin-main .efx5more:hover{background:#e8eef7}.efwin-main .efx5check{position:static;justify-self:center;width:15px;height:15px;accent-color:#2563eb;cursor:pointer}.efwin-main .efx5check~.efx5icon{grid-column:2}.efwin-main .efx5check~.efx5name{grid-column:2}.efwin-main .efx5check~.efx5meta{grid-column:3}.efwin-main .efx5check~.efx5more{grid-column:4}.efwin-main .efx5crumb{border-radius:8px;background:#f8fafc;padding:8px 10px}.efwin-main .efx5head{background:#f8fafc;padding:9px 12px}.efwin-main .efx5selected{position:sticky;top:0;z-index:5}
      @media(max-width:800px){.efwin-shell{grid-template-columns:185px minmax(0,1fr)}.efwin-main .efx5item{grid-template-columns:30px minmax(0,1fr) 30px}.efwin-main .efx5meta{display:none}}@media(max-width:560px){.efwin-shell{grid-template-columns:1fr}.efwin-side{border-right:0;border-bottom:1px solid #e2e8f0;max-height:190px}.efwin-main .efx5{padding:10px}.efwin-main .efx5bar{align-items:flex-start}.efwin-main .efx5bar .efx5actions{width:100%}}
    `;document.head.appendChild(s)
  }

  function getState(){return window.__ENGLISH_STUDIO_EXPLORER_API__?.getState?.()||null}
  function tree(items,parent=null,depth=0){
    return items.filter(f=>(f.parent_id||null)===(parent||null)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'vi')).map(f=>
      `<button data-win-folder="${esc(f.id)}" style="padding-left:${10+depth*16}px">📁 ${esc(f.name)}</button>${tree(items,f.id,depth+1)}`
    ).join('')
  }

  function renderSide(){
    const side=document.querySelector('.efwin-side');const state=getState();
    if(!side||!state)return;
    const folders=Array.isArray(state.folders)?state.folders:[];
    const active=state.active||'root';
    side.innerHTML='<div class="efwin-side-title">📌 Truy cập nhanh</div><div class="efwin-tree"><button class="home'+(active==='root'?' active':'')+'" data-win-folder="root">🏠 Đề thi</button>'+tree(folders)+'</div>';
    bindTree();
  }

  function setActive(){
    const state=getState();if(!state)return;
    document.querySelectorAll('.efwin-tree button[data-win-folder]').forEach(x=>x.classList.toggle('active',(x.dataset.winFolder==='root'?null:x.dataset.winFolder)===(state.active||null)));
    document.querySelector('.efwin-tree button.home')?.classList.toggle('active',!state.active);
  }

  function navigate(id){
    const api=window.__ENGLISH_STUDIO_EXPLORER_API__;
    if(!api?.openFolder)return;
    api.openFolder(id==='root'?null:id);
    setTimeout(()=>{renderSide();setActive()},0);
  }

  function bindTree(){
    document.querySelectorAll('.efwin-tree [data-win-folder]').forEach(b=>{
      if(b.dataset.bound==='1')return;b.dataset.bound='1';
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();navigate(b.dataset.winFolder)})
    })
  }

  function enhance(){
    const app=document.getElementById('app');if(!app)return false;
    const root=app.querySelector('.efx5');if(!root)return false;
    if(root.closest('.efwin-shell')){renderSide();setActive();return true}
    const shell=document.createElement('div');shell.className='efwin-shell';
    const side=document.createElement('aside');side.className='efwin-side';
    const main=document.createElement('main');main.className='efwin-main';main.appendChild(root);
    shell.append(side,main);app.appendChild(shell);renderSide();setActive();return true
  }

  function watchExplorerApi(){
    if(window.__ENGLISH_STUDIO_WINDOWS_API_WATCH__)return;
    window.__ENGLISH_STUDIO_WINDOWS_API_WATCH__=true;
    const started=Date.now();
    const timer=setInterval(()=>{
      if(window.__ENGLISH_STUDIO_EXPLORER_API__?.getState){
        clearInterval(timer);enhance();
        const api=window.__ENGLISH_STUDIO_EXPLORER_API__;
        if(!api.__windowsQuickAccessPatched){
          const old=api.render;
          api.render=function(){const r=old?.apply(api,arguments);setTimeout(()=>{enhance();renderSide();setActive()},0);return r}
          api.__windowsQuickAccessPatched=true;
        }
      }
      if(Date.now()-started>6000)clearInterval(timer)
    },50)
  }

  function install(){style();watchExplorerApi();const start=()=>{enhance();renderSide();setActive()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()}
  install();
})();