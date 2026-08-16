// English Studio - Reliable "Move to" for exam library
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__EXAM_FOLDER_MOVE_FIX__)return;
  window.__EXAM_FOLDER_MOVE_FIX__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  const db=supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let folders=[];
  async function loadFolders(){const r=await db.from('exam_folders').select('id,name,parent_id').order('name',{ascending:true});if(r.error){alert('❌ Không tải được thư mục: '+r.error.message);return false}folders=r.data||[];return true}
  function depth(id){let n=0,f=folders.find(x=>x.id===id);while(f&&n<50){n++;f=folders.find(x=>x.id===f.parent_id)}return n}
  function descendants(id){const out=new Set([id]);let changed=true;while(changed){changed=false;for(const f of folders)if(f.parent_id&&out.has(f.parent_id)&&!out.has(f.id)){out.add(f.id);changed=true}}return out}
  function close(){document.getElementById('ef-move-modal')?.remove()}
  async function open(examId){
    if(!await loadFolders())return;
    const ex=window.__examFolderExams?.find?.(e=>String(e.id)===String(examId));
    const current=ex?.folder_id||null;
    const blocked=descendants(current);
    const choices=folders.filter(f=>!blocked.has(f.id));
    close();
    const m=document.createElement('div');m.id='ef-move-modal';m.innerHTML=`<div class="ef-move-backdrop"></div><div class="ef-move-dialog"><div class="ef-move-head"><strong>📁 Di chuyển đề</strong><button id="ef-move-close">×</button></div><div class="ef-move-note">Chọn thư mục đích cho đề này.</div><select id="ef-move-select"><option value="">📄 Chưa phân loại</option>${choices.map(f=>`<option value="${esc(f.id)}" ${String(f.id)===String(current)?'selected':''}>${'— '.repeat(Math.max(0,depth(f.id)-1))}📁 ${esc(f.name)}</option>`).join('')}</select><div class="ef-move-actions"><button id="ef-move-cancel" class="btn gray">Hủy</button><button id="ef-move-save" class="btn">Di chuyển</button></div></div>`;
    document.body.appendChild(m);
    document.getElementById('ef-move-close').onclick=close;
    document.getElementById('ef-move-cancel').onclick=close;
    document.querySelector('.ef-move-backdrop').onclick=close;
    document.getElementById('ef-move-save').onclick=async()=>{
      const target=document.getElementById('ef-move-select').value||null;
      const btn=document.getElementById('ef-move-save');btn.disabled=true;btn.textContent='Đang chuyển...';
      const r=await db.from('exams').update({folder_id:target}).eq('id',examId);
      if(r.error){btn.disabled=false;btn.textContent='Di chuyển';alert('❌ Không thể di chuyển đề: '+r.error.message);return}
      close();location.reload();
    };
  }
  function style(){if(document.getElementById('ef-move-style'))return;const s=document.createElement('style');s.id='ef-move-style';s.textContent=`#ef-move-modal{position:fixed;inset:0;z-index:99999}.ef-move-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.45)}.ef-move-dialog{position:relative;width:min(520px,calc(100% - 32px));margin:12vh auto 0;background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px rgba(15,23,42,.25)}.ef-move-head{display:flex;justify-content:space-between;align-items:center;font-size:18px}.ef-move-head button{border:0;background:#f1f5f9;border-radius:9px;font-size:22px;width:34px;height:34px;cursor:pointer}.ef-move-note{color:#64748b;font-size:13px;margin:8px 0 14px}.ef-move-dialog select{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font:inherit}.ef-move-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}`;document.head.appendChild(s)}
  function hook(){
    window.__examFolderMove=open;
    if(!window.__examFolderExams)window.__examFolderExams=[];
    document.querySelectorAll('[data-move-exam]').forEach(b=>{if(b.dataset.moveHooked)return;b.dataset.moveHooked='1';b.onclick=e=>{e.preventDefault();e.stopPropagation();open(b.dataset.moveExam)}});
  }
  style();
  new MutationObserver(hook).observe(document.body,{childList:true,subtree:true});
  hook();
})();
