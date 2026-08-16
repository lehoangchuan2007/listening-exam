/* English Studio - safe folder placement for newly created Reading/Listening exams.
   IMPORTANT: never replaces createExam/saveExam and never prevents the original save flow.
*/
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_SAFE_FOLDER_FIX__)return;
  window.__ENGLISH_STUDIO_SAFE_FOLDER_FIX__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let pending=null;

  function activeFolderId(){
    const crumbs=[...document.querySelectorAll('.efx5crumb [data-crumb]')];
    const last=crumbs.at(-1);
    const id=last?.dataset?.crumb;
    return id&&id!=='root'?id:null;
  }

  function captureCreateContext(){
    const type=(document.getElementById('ct')?.value||'listening').toLowerCase();
    const title=document.getElementById('ctitle')?.value?.trim()||'';
    if(!['reading','listening'].includes(type))return null;
    const folderId=activeFolderId();
    if(!folderId)return null;
    return {folderId,type,title,startedAt:new Date().toISOString()};
  }

  async function assignAfterSave(ctx){
    if(!ctx||!ctx.folderId||!ctx.title)return;
    try{
      const session=await db.auth.getSession();
      const uid=session.data?.session?.user?.id;
      if(!uid)return;
      // Give the original saveExam time to finish its INSERT before looking up the new row.
      await new Promise(r=>setTimeout(r,900));
      const q=await db.from('exams')
        .select('id,folder_id,created_at,title,exam_type')
        .eq('owner_id',uid)
        .eq('exam_type',ctx.type)
        .eq('title',ctx.title)
        .order('created_at',{ascending:false})
        .limit(20);
      if(q.error)return;
      const candidate=(q.data||[]).find(x=>!x.folder_id && x.created_at && x.created_at>=ctx.startedAt);
      if(!candidate)return;
      const up=await db.from('exams').update({folder_id:ctx.folderId}).eq('id',candidate.id);
      if(up.error){console.warn('Folder placement failed:',up.error.message);return;}
      // Refresh the Explorer only after the DB update succeeds.
      document.getElementById('fx-refresh')?.click();
    }catch(err){
      console.warn('Safe folder placement skipped:',err);
    }
  }

  // Do not replace any existing creation/save function. Capture only the Save button click.
  document.addEventListener('click',function(ev){
    const btn=ev.target.closest('.modal .actions .btn');
    if(!btn)return;
    const text=(btn.textContent||'').trim();
    if(!/^(💾\s*)?(Tạo đề|Lưu thay đổi)$/.test(text))return;
    if(document.getElementById('ct')?.value!=='reading'&&document.getElementById('ct')?.value!=='listening')return;
    const ctx=captureCreateContext();
    if(!ctx)return;
    // Only brand-new exams need placement. Existing edits keep their current folder.
    const heading=document.querySelector('.modal h2')?.textContent||'';
    if(/Chỉnh sửa/.test(heading))return;
    pending=ctx;
    setTimeout(()=>{const c=pending;pending=null;assignAfterSave(c)},120);
  },true);
})();
