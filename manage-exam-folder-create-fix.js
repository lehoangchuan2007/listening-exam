/* English Studio - keep newly created Reading/Listening exams in the active Explorer folder.
   This fix only handles folder placement after a successful NEW exam save.
   It does not replace the Explorer renderer or alter Reading/Listening exam content. */
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_CREATE_FOLDER_FIX_V2__)return;
  window.__ENGLISH_STUDIO_CREATE_FOLDER_FIX_V2__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let originalCreate=null,originalSave=null;
  let capturedFolder=null;

  function explorerFolder(){
    try{
      const api=window.__ENGLISH_STUDIO_EXPLORER_API__;
      const state=api?.getState?.();
      if(state?.ready)return state.active||null;
    }catch(e){}
    const crumbs=[...document.querySelectorAll('.efx5crumb [data-crumb]')];
    const last=crumbs.at(-1);
    if(last?.dataset?.crumb&&last.dataset.crumb!=='root')return last.dataset.crumb;
    return null;
  }

  function installCreate(){
    if(typeof window.createExam!=='function'||window.createExam===originalCreate)return false;
    originalCreate=window.createExam;
    window.createExam=function(){
      capturedFolder=explorerFolder();
      window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__=capturedFolder;
      return originalCreate.apply(this,arguments);
    };
    return true;
  }

  function installSave(){
    if(window.__examFolderCreateFixInstalledV2||typeof window.saveExam!=='function')return false;
    originalSave=window.saveExam;
    window.saveExam=async function(){
      const type=(document.getElementById('ct')?.value||'').trim().toLowerCase();
      const title=(document.getElementById('ctitle')?.value||'').trim();
      const editing=/Chỉnh sửa/.test(document.querySelector('.modal h2')?.textContent||'');
      const folderId=capturedFolder||window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__||explorerFolder();
      const startedAt=Date.now();
      let result;
      try{
        result=await originalSave.apply(this,arguments);
      }finally{
        if(!editing&&folderId&&title&&['reading','listening'].includes(type)){
          try{
            const session=await db.auth.getSession();
            const uid=session.data?.session?.user?.id;
            if(uid){
              // The original save may finish its INSERT just before returning; allow the row to settle.
              await new Promise(r=>setTimeout(r,900));
              const since=new Date(startedAt-15000).toISOString();
              const q=await db.from('exams')
                .select('id,folder_id,created_at,title,exam_type')
                .eq('owner_id',uid)
                .eq('exam_type',type)
                .eq('title',title)
                .gte('created_at',since)
                .order('created_at',{ascending:false})
                .limit(10);
              if(!q.error&&q.data?.length){
                const candidate=q.data[0];
                if(String(candidate.folder_id||'')!==String(folderId)){
                  const up=await db.from('exams').update({folder_id:folderId}).eq('id',candidate.id).eq('owner_id',uid).select('id,folder_id').maybeSingle();
                  if(up.error)console.warn('Exam folder placement failed:',up.error.message);
                }
              }else if(q.error){
                console.warn('Exam folder lookup failed:',q.error.message);
              }
            }
          }catch(err){console.warn('Exam folder placement skipped:',err)}
          capturedFolder=null;
          window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__=null;
          document.getElementById('fx-refresh')?.click();
        }
      }
      return result;
    };
    window.__examFolderCreateFixInstalledV2=true;
    return true;
  }

  function boot(){
    installCreate();
    installSave();
    const timer=setInterval(()=>{
      installCreate();
      installSave();
      if(originalCreate&&originalSave)clearInterval(timer);
    },200);
    setTimeout(()=>clearInterval(timer),10000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
