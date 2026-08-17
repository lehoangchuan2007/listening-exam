/* English Studio - safe folder placement for newly created Reading/Listening exams.
   IMPORTANT: does not replace createExam/saveExam and never changes the original save flow.
*/
(function(){
  if(!/manage\\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_SAFE_FOLDER_FIX_V3__)return;
  window.__ENGLISH_STUDIO_SAFE_FOLDER_FIX_V3__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let pending=null;

  function activeFolderId(){
    // Explorer v5 renders the current folder in the last breadcrumb button.
    const crumbs=[...document.querySelectorAll('.efx5crumb [data-crumb]')];
    const last=crumbs.at(-1);
    const id=last?.dataset?.crumb;
    return id&&id!=='root'?String(id):null;
  }

  async function snapshotExamIds(uid,type){
    const r=await db.from('exams').select('id').eq('owner_id',uid).eq('exam_type',type);
    if(r.error)return new Set();
    return new Set((r.data||[]).map(x=>String(x.id)));
  }

  function captureCreateContext(){
    const type=(document.getElementById('ct')?.value||'listening').toLowerCase();
    const title=document.getElementById('ctitle')?.value?.trim()||'';
    if(!['reading','listening'].includes(type)||!title)return null;
    const folderId=activeFolderId();
    if(!folderId)return null;
    return {folderId,type,title};
  }

  async function placeNewExam(ctx,beforeIds,uid){
    if(!ctx||!ctx.folderId||!uid)return;
    const deadline=Date.now()+10000;
    let candidate=null;
    while(Date.now()<deadline){
      const r=await db.from('exams').select('id,folder_id,title,exam_type,created_at').eq('owner_id',uid).eq('exam_type',ctx.type).order('created_at',{ascending:false}).limit(30);
      if(!r.error){
        candidate=(r.data||[]).find(x=>!beforeIds.has(String(x.id))&&String(x.title||'').trim()===ctx.title&&(!x.folder_id||String(x.folder_id)!==String(ctx.folderId)));
        if(candidate)break;
      }
      await new Promise(resolve=>setTimeout(resolve,350));
    }
    if(!candidate)return;
    const up=await db.from('exams').update({folder_id:ctx.folderId}).eq('id',candidate.id).eq('owner_id',uid).select('id').maybeSingle();
    if(up.error){console.warn('Folder placement failed:',up.error.message);return;}
    document.getElementById('fx-refresh')?.click();
  }

  document.addEventListener('click',async function(ev){
    const btn=ev.target.closest('button,.btn');
    if(!btn)return;
    const text=(btn.textContent||'').replace(/\\s+/g,' ').trim();
    if(!/^(?:💾\\s*)?Tạo đề(?: mới)?$/.test(text))return;
    const ctx=captureCreateContext();
    if(!ctx)return;
    const heading=document.querySelector('.modal h2,.modal h3,.efx5modal h2,.efx5modal h3')?.textContent||'';
    if(/Chỉnh sửa|Sửa đề/i.test(heading))return;
    const uidResult=await db.auth.getSession();
    const uid=uidResult.data?.session?.user?.id;
    if(!uid)return;
    const beforeIds=await snapshotExamIds(uid,ctx.type);
    // Save is handled by the original creation flow. Wait until its INSERT is visible,
    // then identify the actual newly-created row by its new UUID, not by created_at.
    setTimeout(()=>placeNewExam(ctx,beforeIds,uid),150);
  },true);
})();
