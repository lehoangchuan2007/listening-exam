// English Studio - Windows-like File Explorer UI
// Single-controller UI: Explorer v5 owns all folder/exam data.
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_WINDOWS_UI__)return;
  window.__ENGLISH_STUDIO_WINDOWS_UI__=true;

  function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
  function state(){return window.__ENGLISH_STUDIO_EXPLORER_API__?.getState?.()||null}
  function style(){
    if(document.getElementById('efwin-css'))return;
    const s=document.createElement('style');s.id='efwin-css';s.textContent=`
      .efwin-shell{display:grid;grid-template-columns:228px minmax(0,1fr);gap:0;margin-top:15px;background:#fff;border:1px solid #d7dee8;border-radius:12px;overflow:hidden;min-height:540px;box-shadow:0 4px 18px rgba(15,23,42,.07)}
      .efwin-side{background:#f8fafc;border-right:1px solid #e2e8f0;padding:10px 7px;overflow:auto;user-select:none}
      .efwin-side-title{font-size:11px;font-weight:800;color:#64748b;padding:9px 11px 7px;text-transform:uppercase;letter-spacing:.06em}
      .efwin-tree{display:flex;flex-direction:column;gap:1px}.efwin-tree button{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 10px;border-radius:7px;cursor:pointer;font:14px inherit;color:#334155;transition:background .12s ease,color .12s ease}.efwin-tree button:hover{background:#eaf1fb;color:#1e40af}.efwin-tree button.home{font-weight:700;color:#1e293b;margin-bottom:3px}.efwin-tree button.active{background:#dbeafe;color:#1d4ed8;font-weight:700}
      .efwin-main{min-width:0;background:#fff}.efwin-main .efx5{margin:0;padding:14px 16px}.efwin-main .efx5bar{margin-bottom:10px}.efwin-main .efx5bar h2{font-size:20px}.efwin-main .efx5panel{border-radius:9px;box-shadow:none;margin-top:10px}.efwin-main .efx5grid{display:flex;flex-direction:column;gap:0;padding:0}.efwin-main .efx5item{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) 190px 34px;align-items:center;gap:10px;border:0;border-bottom:1px solid #edf1f5;border-radius:0;padding:8px 12px;min-height:58px;background:#fff;transition:background .12s ease}.efwin-main .efx5item:hover{background:#f6f9fd}.efwin-main .efx5item.sel{background:#e8f1ff}.efwin-main .efx5item:last-child{border-bottom:0}.efwin-main .efx5icon{font-size:27px;text-align:center;line-height:1}.efwin-main .efx5name{margin:0;font-weight:650;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.efwin-main .efx5meta{margin:0;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.efwin-main .efx5more{position:static;justify-self:end;width:30px;height:30px;border:0;background:transparent;border-radius:7px;opacity:.45;transition:opacity .12s,background .12s;cursor:pointer}.efwin-main .efx5item:hover .efx5more{opacity:1}.efwin-main .efx5more:hover{background:#e8eef7}.efwin-main .efx5check{position:static;justify-self:center;width:15px;height:15px;accent-color:#2563eb;cursor:pointer}.efwin-main .efx5check~.efx5icon{grid-column:2}.efwin-main .efx5check~.efx5name{grid-column:2}.efwin-main .efx5check~.efx5meta{grid-column:3}.efwin-main .efx5check~.efx5more{grid-column:4}.efwin-main .efx5crumb{border-radius:8px;background:#f8fafc;padding:8px 10px}.efwin-main .efx5head{background:#f8fafc;padding:9px 12px}.efwin-main .efx5selected{position:sticky;top:0;z-index:5}
      .efwin-search{position:relative;margin:0 0 10px}.efwin-search input{width:100%;box-sizing:border-box;border:1px solid #d7dee8;border-radius:9px;padding:10px 36px 10px 36px;font:14px inherit;outline:none;background:#fff}.efwin-search input:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}.efwin-search .icon{position:absolute;left:12px;top:9px}.efwin-search .clear{position:absolute;right:8px;top:5px;border:0;background:transparent;width:30px;height:30px;border-radius:6px;cursor:pointer;color:#64748b}.efwin-search .clear:hover{background:#f1f5f9}.efwin-results{border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;margin-bottom:10px}.efwin-results-head{padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b}.efwin-result{display:flex;align-items:center;gap:10px;width:100%;border:0;border-bottom:1px solid #edf1f5;background:#fff;text-align:left;padding:10px 12px;cursor:pointer;font:inherit}.efwin-result:last-child{border-bottom:0}.efwin-result:hover{background:#f6f9fd}.efwin-result .ri{font-size:23px}.efwin-result .rn{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.efwin-result .rp{font-size:11px;color:#64748b;margin-left:auto;white-space:nowrap}.efwin-noresults{padding:20px;text-align:center;color:#64748b;font-size:13px}
      @media(max-width:800px){.efwin-shell{grid-template-columns:185px minmax(0,1fr)}.efwin-main .efx5item{grid-template-columns:30px minmax(0,1fr) 30px}.efwin-main .efx5meta{display:none}}@media(max-width:560px){.efwin-shell{grid-template-columns:1fr}.efwin-side{border-right:0;border-bottom:1px solid #e2e8f0;max-height:190px}.efwin-main .efx5{padding:10px}}
    `;document.head.appendChild(s)
  }

  function tree(items,parent=null,depth=0){
    return items.filter(f=>(f.parent_id||null)===(parent||null)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'vi')).map(f=>`<button data-win-folder="${esc(f.id)}" style="padding-left:${10+depth*16}px">📁 ${esc(f.name)}</button>${tree(items,f.id,depth+1)}`).join('')
  }
  function renderSide(s=state()){
    const side=document.querySelector('.efwin-side');if(!side||!s)return;
    const folders=Array.isArray(s.folders)?s.folders:[],active=s.active||null;
    side.innerHTML='<div class="efwin-side-title">📌 Truy cập nhanh</div><div class="efwin-tree"><button class="home'+(!active?' active':'')+'" data-win-folder="root">🏠 Đề thi</button>'+tree(folders)+'</div>';
    bindTree();setActive(s)
  }
  function setActive(s=state()){
    if(!s)return;const active=s.active||null;
    document.querySelectorAll('.efwin-tree button[data-win-folder]').forEach(x=>x.classList.toggle('active',(x.dataset.winFolder==='root'?null:x.dataset.winFolder)===(active||null)));
    document.querySelector('.efwin-tree button.home')?.classList.toggle('active',!active)
  }
  function navigate(id){const api=window.__ENGLISH_STUDIO_EXPLORER_API__;if(!api?.openFolder)return;api.openFolder(id==='root'?null:id)}
  function bindTree(){document.querySelectorAll('.efwin-tree [data-win-folder]').forEach(b=>{if(b.dataset.bound==='1')return;b.dataset.bound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();navigate(b.dataset.winFolder)})})}

  function searchMarkup(){return `<div class="efwin-search"><span class="icon">🔎</span><input id="efwin-search-input" type="search" autocomplete="off" placeholder="Tìm kiếm đề hoặc thư mục..."><button class="clear" id="efwin-search-clear" title="Xóa tìm kiếm" aria-label="Xóa tìm kiếm">×</button></div><div id="efwin-results-host"></div>`}
  function folderPath(folders,id){const map=new Map(folders.map(f=>[String(f.id),f]));const parts=[];let f=map.get(String(id)),n=0;while(f&&n++<50){parts.unshift(f.name);f=map.get(String(f.parent_id))}return parts.length?parts.join(' › '):'Đề thi'}
  function runSearch(q){
    const host=document.getElementById('efwin-results-host');const s=state();if(!host||!s)return;
    const term=String(q||'').trim().toLocaleLowerCase('vi');
    if(!term){host.innerHTML='';return}
    const folders=(s.folders||[]).filter(f=>String(f.name||'').toLocaleLowerCase('vi').includes(term));
    const exams=(s.exams||[]).filter(e=>String(e.title||'').toLocaleLowerCase('vi').includes(term));
    const total=folders.length+exams.length;
    if(!total){host.innerHTML='<div class="efwin-results"><div class="efwin-noresults">Không tìm thấy đề hoặc thư mục phù hợp.</div></div>';return}
    const folderHtml=folders.slice(0,50).map(f=>`<button class="efwin-result" data-search-folder="${esc(f.id)}"><span class="ri">📁</span><span class="rn">${esc(f.name)}</span><span class="rp">${esc(folderPath(s.folders,f.id))}</span></button>`).join('');
    const examHtml=exams.slice(0,100).map(e=>`<button class="efwin-result" data-search-exam="${esc(e.id)}"><span class="ri">${e.exam_type==='reading'?'📖':e.exam_type==='writing'?'✍️':'🎧'}</span><span class="rn">${esc(e.title||'Không tên')}</span><span class="rp">${esc(folderPath(s.folders,e.folder_id))}</span></button>`).join('');
    host.innerHTML=`<div class="efwin-results"><div class="efwin-results-head">Tìm thấy ${total} kết quả${total>150?' (hiển thị 150 kết quả đầu tiên)':''}</div>${folderHtml}${examHtml}</div>`;
    host.querySelectorAll('[data-search-folder]').forEach(b=>b.onclick=()=>{navigate(b.dataset.searchFolder);clearSearch()});
    host.querySelectorAll('[data-search-exam]').forEach(b=>b.onclick=()=>{location.href='./results.html?exam='+encodeURIComponent(b.dataset.searchExam)});
  }
  function clearSearch(){const i=document.getElementById('efwin-search-input');if(i)i.value='';const h=document.getElementById('efwin-results-host');if(h)h.innerHTML=''}
  function bindSearch(){
    const input=document.getElementById('efwin-search-input');if(!input||input.dataset.bound==='1')return;input.dataset.bound='1';
    input.addEventListener('input',()=>runSearch(input.value));
    document.getElementById('efwin-search-clear')?.addEventListener('click',()=>{clearSearch();input.focus()});
    input.addEventListener('keydown',e=>{if(e.key==='Escape'){clearSearch();input.blur()}})
  }

  function bindContextMenus(){
    document.querySelectorAll('.efwin-main .efx5item').forEach(item=>{if(item.dataset.contextBound==='1')return;item.dataset.contextBound='1';item.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const more=item.querySelector('[data-fmore],[data-emore]');if(more)more.click()})})
  }
  function enhance(){
    const app=document.getElementById('app');if(!app)return false;const root=app.querySelector('.efx5');if(!root)return false;
    if(root.closest('.efwin-shell')){renderSide();bindSearch();bindContextMenus();return true}
    const shell=document.createElement('div');shell.className='efwin-shell';const side=document.createElement('aside');side.className='efwin-side';const main=document.createElement('main');main.className='efwin-main';main.innerHTML=searchMarkup();main.appendChild(root);shell.append(side,main);app.appendChild(shell);renderSide();bindSearch();bindContextMenus();return true
  }
  function install(){
    style();
    const start=()=>{enhance();const api=window.__ENGLISH_STUDIO_EXPLORER_API__;if(api?.subscribe){api.subscribe(s=>{enhance();renderSide(s);setActive(s);bindSearch();bindContextMenus();const i=document.getElementById('efwin-search-input');if(i?.value)runSearch(i.value)})}else{let tries=0;const timer=setInterval(()=>{tries++;const a=window.__ENGLISH_STUDIO_EXPLORER_API__;if(a?.subscribe){clearInterval(timer);a.subscribe(s=>{enhance();renderSide(s);setActive(s);bindSearch();bindContextMenus()})}else if(tries>=20)clearInterval(timer)},100)}};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
  }
  install();
})();