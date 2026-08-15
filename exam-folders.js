// English Studio - Exam Library / Folders
// Loaded on manage.html. It layers folder management on top of the existing exam editor.
(function(){
  if(!/manage\.html$/.test(location.pathname)) return;
  if(window.__ENGLISH_STUDIO_EXAM_FOLDERS__) return;
  window.__ENGLISH_STUDIO_EXAM_FOLDERS__=true;

  let folders=[];
  let activeFolder=null; // null = all, "__uncategorized__" = no folder
  let folderReady=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const sbReady=()=>window.sb||window.supabaseClient;

  async function loadFolders(){
    const client=sbReady();
    if(!client) return false;
    const r=await client.from('exam_folders').select('id,name,parent_id,created_at,updated_at').order('name',{ascending:true});
    if(r.error){
      // Migration has not been run yet: leave the existing management page fully usable.
      folderReady=false;
      return false;
    }
    folders=r.data||[]; folderReady=true; return true;
  }

  function children(parent){return folders.filter(f=>(f.parent_id||null)===(parent||null)).sort((a,b)=>a.name.localeCompare(b.name,'vi'))}
  function folderPath(id){const out=[];let cur=folders.find(f=>f.id===id),guard=0;while(cur&&guard++<50){out.unshift(cur);cur=folders.find(f=>f.id===cur.parent_id)}return out}
  function folderName(id){return folders.find(f=>f.id===id)?.name||'Chưa phân loại'}

  function folderTree(parent=null,depth=0){
    return children(parent).map(f=>{
      const active=activeFolder===f.id?' active':'';
      return `<button class="ef-folder${active}" data-folder-id="${f.id}" style="--depth:${depth}" type="button">📁 ${esc(f.name)}</button>${folderTree(f.id,depth+1)}`;
    }).join('');
  }

  function injectStyles(){
    if(document.getElementById('exam-folders-style'))return;
    const s=document.createElement('style');s.id='exam-folders-style';s.textContent=`
      .ef-shell{display:grid;grid-template-columns:245px minmax(0,1fr);gap:14px;align-items:start;margin:14px 0}
      .ef-side{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;position:sticky;top:12px;box-shadow:0 5px 20px #0f172a0a}
      .ef-side h3{margin:4px 8px 10px}.ef-folder{width:100%;display:block;text-align:left;border:0;background:transparent;border-radius:9px;padding:9px 8px 9px calc(8px + var(--depth)*17px);font:inherit;cursor:pointer;color:#334155}.ef-folder:hover{background:#f1f5f9}.ef-folder.active{background:#dbeafe;color:#1d4ed8;font-weight:800}
      .ef-root{margin-bottom:4px}.ef-side-actions{display:flex;gap:6px;margin:8px 0 10px}.ef-side-actions button{flex:1}.ef-main{min-width:0}.ef-toolbar{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px 14px;box-shadow:0 5px 20px #0f172a0a;margin-bottom:12px}.ef-breadcrumb{font-weight:800}.ef-muted{color:#64748b;font-size:13px}.ef-move{background:#0ea5e9!important}.ef-uncat{margin-top:5px}.ef-empty{padding:25px;text-align:center;color:#64748b}
      @media(max-width:760px){.ef-shell{grid-template-columns:1fr}.ef-side{position:static}.ef-folder{padding-left:8px}.ef-main .exam{margin-top:10px}}
    `;document.head.appendChild(s);
  }

  function libraryHtml(){
    const rootActive=activeFolder===null?' active':'';
    const uncatActive=activeFolder==='__uncategorized__'?' active':'';
    const path=activeFolder&&activeFolder!=='__uncategorized__'?folderPath(activeFolder):[];
    return `<div class="ef-shell"><aside class="ef-side"><h3>📚 Thư viện đề</h3><div class="ef-side-actions"><button class="btn small" id="ef-new-folder">＋ Thư mục</button><button class="btn gray small" id="ef-refresh">↻</button></div><button class="ef-folder${rootActive}" data-folder-id="__all__" type="button">📚 Tất cả đề</button>${folderTree()}<button class="ef-folder ef-uncat${uncatActive}" data-folder-id="__uncategorized__" type="button">📄 Chưa phân loại</button></aside><section class="ef-main"><div class="ef-toolbar"><div class="ef-breadcrumb">📚 Thư viện đề${path.map(f=>` &nbsp;›&nbsp; 📁 ${esc(f.name)}`).join('')}${activeFolder==='__uncategorized__'?' &nbsp;›&nbsp; 📄 Chưa phân loại':''}</div><div class="ef-muted" id="ef-count"></div></div><div id="ef-exams"></div></section></div>`;
  }

  function currentExams(){
    const all=Array.isArray(window.exams)?window.exams:[];
    if(activeFolder===null)return all;
    if(activeFolder==='__uncategorized__')return all.filter(e=>!e.folder_id);
    return all.filter(e=>e.folder_id===activeFolder);
  }

  function renderLibrary(){
    const app=document.getElementById('app');if(!app||!folderReady)return;
    // Preserve the existing top controls by wrapping the original list into the folder shell.
    const all=Array.isArray(window.exams)?window.exams:[];
    const open=all.filter(e=>typeof window.status==='function'&&window.status(e).text==='🟢 Đang mở').length;
    const list=currentExams();
    app.innerHTML=`<div class="row"><div><h2>📚 Danh sách đề</h2><span class="muted">Quản lý đề theo thư mục. Các đề hiện có được giữ nguyên.</span></div><div class="actions"><a class="btn gray" href="./admin.html">← Dashboard</a><button class="btn" onclick="createExam()">＋ Tạo đề</button></div></div>${libraryHtml()}`;
    const host=document.getElementById('ef-exams');
    document.getElementById('ef-count').textContent=`${list.length} đề • Tổng hệ thống ${all.length} đề • ${open} đang mở`;
    host.innerHTML=list.length?list.map(ex=>{
      let html=window.card(ex);
      html=html.replace('<div class="actions">',`<div class="actions"><button class="btn ef-move" onclick="window.__moveExam('${ex.id}')">📁 Chuyển</button>`);
      return html;
    }).join(''):`<div class="card ef-empty">${activeFolder===null?'Chưa có đề.':'Thư mục này chưa có đề.'}<br><br><button class="btn" onclick="createExam()">＋ Tạo đề</button></div>`;
    app.querySelectorAll('.ef-folder').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.folderId;activeFolder=id==='__all__'?null:id;renderLibrary()}));
    document.getElementById('ef-new-folder').onclick=()=>newFolder(activeFolder&&activeFolder!=='__uncategorized__'?activeFolder:null);
    document.getElementById('ef-refresh').onclick=async()=>{await loadFolders();renderLibrary()};
  }

  async function newFolder(parentId=null){
    const name=prompt(parentId?`Tên thư mục con trong "${folderName(parentId)}":`:'Tên thư mục mới:');
    if(name===null)return;const clean=name.trim();if(!clean)return alert('Tên thư mục không được để trống.');
    const client=sbReady();if(!client)return;
    const session=await client.auth.getSession();const uid=session.data?.session?.user?.id;if(!uid)return alert('Phiên đăng nhập đã hết hạn.');
    const r=await client.from('exam_folders').insert({owner_id:uid,parent_id:parentId,name:clean}).select().single();
    if(r.error)return alert('❌ Không tạo được thư mục: '+r.error.message);
    await loadFolders();activeFolder=r.data.id;renderLibrary();
  }

  async function renameFolder(id){
    const f=folders.find(x=>x.id===id);if(!f)return;const name=prompt('Tên mới:',f.name);if(name===null)return;const clean=name.trim();if(!clean)return;
    const r=await sbReady().from('exam_folders').update({name:clean,updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error)alert('❌ '+r.error.message);else{await loadFolders();renderLibrary()}
  }

  async function deleteFolder(id){
    const f=folders.find(x=>x.id===id);if(!f)return;
    const hasChild=folders.some(x=>x.parent_id===id);const hasExam=(window.exams||[]).some(e=>e.folder_id===id);
    const msg=hasChild||hasExam?`Thư mục "${f.name}" đang chứa ${hasChild?'thư mục con':''}${hasChild&&hasExam?' và ':''}${hasExam?'đề':''}. Xóa sẽ đưa đề về "Chưa phân loại" và xóa thư mục con. Tiếp tục?`:`Xóa thư mục "${f.name}"?`;
    if(!confirm(msg))return;
    const r=await sbReady().from('exam_folders').delete().eq('id',id);if(r.error)alert('❌ '+r.error.message);else{activeFolder=null;await loadFolders();if(typeof window.load==='function')await window.load();renderLibrary()}
  }

  async function moveExam(id){
    const ex=(window.exams||[]).find(e=>e.id===id);if(!ex)return;
    const options=['0|📄 Chưa phân loại'].concat(folders.map(f=>`${f.id}|${'— '.repeat(folderPath(f.id).length-1)}📁 ${f.name}`));
    const answer=prompt('Nhập số thứ tự thư mục:\n'+options.map((x,i)=>`${i}. ${x.split('|')[1]}`).join('\n'),String(Math.max(0,options.findIndex(x=>x.startsWith((ex.folder_id||'0')+'|')))));
    if(answer===null)return;const n=Number(answer);if(!Number.isInteger(n)||n<0||n>=options.length)return alert('❌ Thư mục không hợp lệ.');
    const folder=options[n].split('|')[0];const folderId=folder==='0'?null:folder;
    const r=await sbReady().from('exams').update({folder_id:folderId}).eq('id',id);if(r.error)return alert('❌ Không thể di chuyển đề: '+r.error.message);
    if(typeof window.load==='function')await window.load();await loadFolders();renderLibrary();
  }

  window.__moveExam=moveExam;
  window.__renameExamFolder=renameFolder;
  window.__deleteExamFolder=deleteFolder;

  async function boot(){
    injectStyles();
    // Existing manage.html defines sb as a global lexical binding; fall back to it through window when available.
    if(typeof window.load!=='function'||typeof window.card!=='function')return;
    const ok=await loadFolders();
    if(!ok){
      const app=document.getElementById('app');
      if(app){const n=document.createElement('div');n.className='notice warn';n.innerHTML='📁 <b>Quản lý thư mục chưa được bật.</b> Chạy file <code>exam-folders.sql</code> trong Supabase SQL Editor một lần, sau đó tải lại trang quản lý đề.';app.prepend(n)}
      return;
    }
    const oldRender=window.render;
    if(oldRender&&!oldRender.__folderWrapped){
      const wrapped=function(){oldRender.apply(this,arguments);if(folderReady)setTimeout(renderLibrary,0)};wrapped.__folderWrapped=true;window.render=wrapped;
    }
    setTimeout(renderLibrary,50);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
