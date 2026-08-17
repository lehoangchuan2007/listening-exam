/* English Studio - deterministic folder placement for newly created Reading/Listening exams.
   IMPORTANT: keep the original createExam/saveExam flow untouched.
   Capture the active Explorer folder + existing exam IDs BEFORE save, then attach
   folder_id to the actual newly-created row by its new ID.
*/
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_SAFE_FOLDER_FIX_V2__)return;
  window.__ENGLISH_STUDIO_SAFE_FOLDER_FIX_V2__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

  function explorerState(){
    try{
      const candidates=[window.__ENGLISH_STUDIO_EXPLORER_API__,window.__ENGLISH_STUDIO_EXPLORER_V5_API__,window.examExplorer,window.ExamExplorer];
      for(const api of candidates){
        if(api&&typeof api.getState==='function'){
          const s=api.getState();
          if(s)return s;
        }
      }
    }catch(e){console.warn('Explorer state read failed:',e)}
    return null;
  }
  function activeFolderId(){
    const s=explorerState();
    if(s&&s.ready!==false)return s.active?String(s.active):null;
    const last=[...document.querySelectorAll('.efx5crumb [data-crumb]')].at(-1);
    const id=last?.dataset?.crumb;
    return id&&id!=='root'?String(id):null;
  }
  async function uid(){const r=await db.auth.getSession();return r.data?.session?.user?.id||null}
  async function snapshot(ownerId,type){
    const r=await db.from('exams').select('id').eq('owner_id',ownerId).eq('exam_type',type);
    if(r.error)throw r.error;
    return new Set((r.data||[]).map(x=>String(x.id)));
  }
  async function findNew(ownerId,type,before,timeout=10000){
    const started=Date.now();
    while(Date.now()-started<timeout){
      const r=await db.from('exams').select('id,folder_id,title,exam_type,created_at').eq('owner_id',ownerId).eq('exam_type',type).order('created_at',{ascending:false}).limit(50);
      if(r.error)throw r.error;
      const fresh=(r.data||[]).find(x=>!before.has(String(x.id)));
      if(fresh)return fresh;
      await new Promise(resolve=>setTimeout(resolve,350));
    }
    return null;
  }
  async function place(ctx){
    try{
      const ownerId=await uid();
      if(!ownerId)return;
      const fresh=await findNew(ownerId,ctx.type,ctx.beforeIds);
      if(!fresh){console.warn('New exam not detected; folder placement skipped.');return}
      const r=await db.from('exams').update({folder_id:ctx.folderId}).eq('id',fresh.id).eq('owner_id',ownerId).select('id,folder_id').maybeSingle();
      if(r.error){console.warn('Folder placement failed:',r.error.message);return}
      if(!r.data){console.warn('Folder placement returned no row.');return}
      document.getElementById('fx-refresh')?.click();
    }catch(err){console.warn('Deterministic folder placement skipped:',err)}
  }
  document.addEventListener('click',async function(ev){
    const btn=ev.target.closest('.modal .actions .btn');
    if(!btn)return;
    const text=(btn.textContent||'').trim();
    if(!/^(💾\s*)?(Tạo đề|Lưu thay đổi)$/.test(text))return;
    const type=(document.getElementById('ct')?.value||'').toLowerCase();
    if(!['reading','listening'].includes(type))return;
    const heading=document.querySelector('.modal h2')?.textContent||'';
    if(/Chỉnh sửa/.test(heading))return;
    const folderId=activeFolderId();
    if(!folderId)return;
    const ownerId=await uid();
    if(!ownerId)return;
    let beforeIds;
    try{beforeIds=await snapshot(ownerId,type)}catch(err){console.warn('Could not snapshot exam IDs:',err);return}
    setTimeout(()=>place({folderId,type,beforeIds}),120);
  },true);
})();
