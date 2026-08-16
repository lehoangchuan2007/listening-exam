// English Studio - Windows-like File Explorer UI
// Single-controller UI: Explorer v5 owns all folder/exam data.
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_WINDOWS_UI__)return;
  window.__ENGLISH_STUDIO_WINDOWS_UI__=true;

  function style(){
    if(document.getElementById('efwin-css'))return;
    const s=document.createElement('style');s.id='efwin-css';s.textContent=`
      .efwin-shell{display:grid;grid-template-columns:228px minmax(0,1fr);gap:0;margin-top:15px;background:#fff;border:1px solid #d7dee8;border-radius:12px;overflow:hidden;min-height:540px;box-shadow:0 4px 18px rgba(15,23,42,.07)}
      .efwin-side{background:#f8fafc;border-right:1px solid #e2e8f0;padding:10px 7px;overflow:auto;user-select:none}.efwin-side-title{font-size:11px;font-weight:800;color:#64748b;padding:9px 11px 7px;text-transform:uppercase;letter-spacing:.06em}.efwin-tree{display:flex;flex-direction:column;gap:1px}.efwin-tree button{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 10px;border-radius:7px;cursor:pointer;font:14px inherit;color:#334155;transition:background .12s ease,color .12s ease}.efwin-tree button:hover{background:#eaf1fb;color:#1e40af}.efwin-tree button.home{font-weight:700;color:#1e293b;margin-bottom:3px}.efwin-tree button.active{background:#dbeafe;color:#1d4ed8;font-weight:700}
      .efwin-main{min-width:0;background:#fff;position:relative}.efwin-main .efx5{margin:0;padding:14px 16px}.efwin-main .efx5bar{margin-bottom:10px}.efwin-main .efx5bar h2{font-size:20px}.efwin-main .efx5panel{border-radius:9px;box-shadow:none;margin-top:10px}.efwin-main .efx5grid{display:flex;flex-direction:column;gap:0;padding:0}.efwin-main .efx5item{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) 190px 34px;align-items:center;gap:10px;border:0;border-bottom:1px solid #edf1f5;border-radius:0;padding:8px 12px;min-height:58px;background:#fff;transition:background .12s ease}.efwin-main .efx5item:hover{background:#f6f9fd}.efwin-main .efx5item.sel{background:#e8f1ff}.efwin-main .efx5item:last-child{border-bottom:0}.efwin-main .efx5icon{font-size:27px;text-align:center;line-height:1}.efwin-main .efx5name{margin:0;font-weight:650;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.efwin-main .efx5meta{margin:0;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.efwin-main .efx5more{position:static;justify-self:end;width:30px;height:30px;border:0;background:transparent;border-radius:7px;opacity:.45;transition:opacity .12s,background .12s;cursor:pointer}.efwin-main .efx5item:hover .efx5more{opacity:1}.efwin-main .efx5more:hover{background:#e8eef7}.efwin-main .efx5check{position:static;justify-self:center;width:15px;height:15px;accent-color:#2563eb;cursor:pointer}.efwin-main .efx5check~.efx5icon{grid-column:2}.efwin-main .efx5check~.efx5name{grid-column:2}.efwin-main .efx5check~.efx5meta{grid-column:3}.efwin-main .efx5check~.efx5more{grid-column:4}.efwin-main .efx5crumb{border-radius:8px;background:#f8fafc;padding:8px 10px}.efwin-main .efx5head{background:#f8fafc;padding:9px 12px}.efwin-main .efx5selected{position:sticky;top:0;z-index:5}
      .efwin-searchbar{display:flex;align-items:center;gap:8px;padding:11px 16px 0;background:#fff}.efwin-search{flex:1;min-width:0;height:38px;border:1px solid #cbd5e1;border-radius:9px;padding:0 12px 0 36px;font:14px inherit;outline:0;background:#f8fafc}.efwin-search:focus{border-color:#60a5fa;background:#fff;box-shadow:0 0 0 3px #dbeafe}.efwin-searchwrap{position:relative;flex:1;min-width:0}.efwin-searchicon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#64748b;font-size:16px;pointer-events:none}.efwin-searchclear{height:32px;min-width:32px;border:0;background:transparent;border-radius:7px;cursor:pointer;color:#64748b;font-size:16px}.efwin-searchclear:hover{background:#f1f5f9}.efwin-search-results{margin:10px 16px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff}.efwin-search-results[hidden]{display:none}.efwin-search-head{padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b}.efwin-search-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:0;border-bottom:1px solid #edf1f5;background:#fff;width:100%;text-align:left;cursor:pointer;font:inherit}.efwin-search-row:last-child{border-bottom:0}.efwin-search-row:hover{background:#f6f9fd}.efwin-search-row .ico{font-size:22px;flex:0 0 26px}.efwin-search-row .name{font-weight:700;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.efwin-search-row .path{margin-left:auto;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}.efwin-search-empty{padding:28px;text-align:center;color:#64748b}
      @media(max-width:800px){.efwin-shell{grid-template-columns:185px minmax(0,1fr)}.efwin-main .efx5item{grid-template-columns:30px minmax(0,1fr) 30px}.efwin-main .efx5meta{display:none}.efwin-search-row .path{max-width:35%}}@media(max-width:560px){.efwin-shell{grid-template-columns:1fr}.efwin-side{border-right:0;border-bottom:1px solid #e2e8f0;max-height:190px}.efwin-main .efx5{padding:10px}.efwin-main .efx5bar{align-items:flex-start}.efwin-main .efx5bar .efx5actions{width:100%}.efwin-searchbar{padding:10px 10px 0}.efwin-search-results{margin:10px 10px 0}.efwin-search-row .path{display:none}}
    `;document.head.appendChild(s)
  }

  function state(){return window.__ENGLISH_STUDIO_EXPLORER_API__?.getState?.()||null}
  function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
  function tree(items,parent=null,depth=0){
    return items.filter(f=>(f.parent_id||null)===(parent||null)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'vi')).map(f=>
      `<button data-win-folder="${esc(f.id)}" style="padding-left:${10+depth*16}px">📁 ${esc(f.name)}</button>${tree(items,f.id,depth+1)}`
    ).join('')
  }
  function folderPath(folders,id){const map=new Map(folders.map(f=>[String(f.id),f]));const out=[];let f=map.get(String(id)),n=0;while(f&&n++<50){out.unshift(f.name);f=map.get(String(f.parent_id))}return out.join(' / ')}

  function renderSide(s=state()){
    const side=document.querySelector('.efwin-side');if(!side||!s)return;
    const folders=Array.isArray(s.folders)?s.folders:[];const active=s.active||null;
    side.innerHTML='<div class="efwin-side-title">📌 Truy cập nhanh</div><div class="efwin-tree"><button class="home'+(!active?' active':'')+'" data-win-folder="root">🏠 Đề thi</button>'+tree(folders)+'</div>';
    bindTree();setActive(s);
  }
  function setActive(s=state()){
    if(!s)return;const active=s.active||null;
    document.querySelectorAll('.efwin-tree button[data-win-folder]').forEach(x=>x.classList.toggle('active',(x.dataset.winFolder==='root'?null:x.dataset.winFolder)===(active||null)));
    document.querySelector('.efwin-tree button.home')?.classList.toggle('active',!active)
  }
  function navigate(id){const api=window.__ENGLISH_STUDIO_EXPLORER_API__;if(!api?.openFolder)return;api.openFolder(id==='root'?null:id)}
  function bindTree(){document.querySelectorAll('.efwin-tree [data-win-folder]').forEach(b=>{if(b.dataset.bound==='1')return;b.dataset.bound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();navigate(b.dataset.winFolder)})})}

  function ensureSearch(){
    const main=document.querySelector('.efwin-main');if(!main)return;
    if(!main.querySelector('.efwin-searchbar')){
      const bar=document.createElement('div');bar.className='efwin-searchbar';bar.innerHTML='<div class="efwin-searchwrap"><span class="efwin-searchicon">🔎</span><input class="efwin-search" id="efwin-search" type="search" autocomplete="off" placeholder="Tìm kiếm đề hoặc thư mục..."></div><button class="efwin-searchclear" id="efwin-search-clear" title="Xóa tìm kiếm">✕</button>';
      const results=document.createElement('div');results.className='efwin-search-results';results.hidden=true;results.id='efwin-search-results';
      main.insertBefore(bar,main.firstChild);main.insertBefore(results,main.children[1]);
      bar.querySelector('#efwin-search').addEventListener('input',e=>runSearch(e.target.value));
      bar.querySelector('#efwin-search-clear').addEventListener('click',()=>{bar.querySelector('#efwin-search').value='';runSearch('');bar.querySelector('#efwin-search').focus()});
    }
  }
  function runSearch(query){
    const s=state();const box=document.getElementById('efwin-search-results');const root=document.querySelector('.efwin-main .efx5');if(!box||!root||!s)return;
    const q=String(query||'').trim().toLocaleLowerCase('vi');
    if(!q){box.hidden=true;root.style.display='';return}
    const folders=Array.isArray(s.folders)?s.folders:[];const exams=Array.isArray(s.exams)?s.exams:[];
    const fm=folders.filter(f=>String(f.name||'').toLocaleLowerCase('vi').includes(q));
    const em=exams.filter(e=>String(e.title||'').toLocaleLowerCase('vi').includes(q));
    const total=fm.length+em.length;box.hidden=false;root.style.display='none';
    if(!total){box.innerHTML='<div class="efwin-search-head">Kết quả tìm kiếm</div><div class="efwin-search-empty">🔎 Không tìm thấy đề hoặc thư mục phù hợp.</div>';return}
    const rows=[];
    fm.forEach(f=>rows.push(`<button class="efwin-search-row" data-search-folder="${esc(f.id)}"><span class="ico">📁</span><span class="name">${esc(f.name)}</span><span class="path">${esc(folderPath(folders,f.parent_id)||'Đề thi')}</span></button>`));
    em.forEach(e=>rows.push(`<button class="efwin-search-row" data-search-exam="${esc(e.id)}"><span class="ico">${e.exam_type==='reading'?'📖':e.exam_type==='writing'?'✍️':'🎧'}</span><span class="name">${esc(e.title||'Không tên')}</span><span class="path">${esc(folderPath(folders,e.folder_id)||'Đề thi')}</span></button>`));
    box.innerHTML=`<div class="efwin-search-head">Tìm thấy ${total} kết quả · ${fm.length} thư mục · ${em.length} đề</div>${rows.join('')}`;
    box.querySelectorAll('[data-search-folder]').forEach(b=>b.addEventListener('click',()=>{navigate(b.dataset.searchFolder);clearSearch()}));
    box.querySelectorAll('[data-search-exam]').forEach(b=>b.addEventListener('click',()=>location.href='./results.html?exam='+encodeURIComponent(b.dataset.searchExam)));
  }
  function clearSearch(){const i=document.getElementById('efwin-search');if(i)i.value='';const b=document.getElementById('efwin-search-results');if(b)b.hidden=true;const root=document.querySelector('.efwin-main .efx5');if(root)root.style.display=''}

  // Reuse the existing Explorer controller's ⋮ menus for native right-clicks.
  // No second menu/controller is created here.
  function bindContextMenus(){
    document.querySelectorAll('.efwin-main .efx5item').forEach(item=>{
      if(item.dataset.contextBound==='1')return;
      item.dataset.contextBound='1';
      item.addEventListener('contextmenu',e=>{
        e.preventDefault();e.stopPropagation();
        const more=item.querySelector('[data-fmore],[data-emore]');if(more)more.click();
      });
    });
  }

  function enhance(){
    const app=document.getElementById('app');if(!app)return false;
    const root=app.querySelector('.efx5');if(!root)return false;
    if(root.closest('.efwin-shell')){ensureSearch();renderSide();bindContextMenus();return true}
    const shell=document.createElement('div');shell.className='efwin-shell';
    const side=document.createElement('aside');side.className='efwin-side';
    const main=document.createElement('main');main.className='efwin-main';main.appendChild(root);
    shell.append(side,main);app.appendChild(shell);ensureSearch();renderSide();bindContextMenus();return true
  }

  function install(){
    style();
    const start=()=>{
      enhance();
      const api=window.__ENGLISH_STUDIO_EXPLORER_API__;
      if(api?.subscribe){
        api.subscribe(s=>{enhance();renderSide(s);setActive(s);bindContextMenus();const q=document.getElementById('efwin-search')?.value;if(q)runSearch(q)})
      }else{
        let tries=0;const timer=setInterval(()=>{tries++;const a=window.__ENGLISH_STUDIO_EXPLORER_API__;if(a?.subscribe){clearInterval(timer);a.subscribe(s=>{enhance();renderSide(s);setActive(s);bindContextMenus();const q=document.getElementById('efwin-search')?.value;if(q)runSearch(q)})}else if(tries>=20)clearInterval(timer)},100)
      }
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
  }
  install();
})();