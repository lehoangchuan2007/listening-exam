/* English Studio - keep newly created Reading/Listening exams in the active folder */
(function(){
  if(!/manage\.html$/.test(location.pathname)) return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient) return;
  let tries=0;
  function getFolderId(){
    return window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__ || null;
  }
  function install(){
    if(window.__examFolderCreateFixInstalled) return true;
    if(typeof window.saveExam!=='function') return false;
    const original=window.saveExam;
    window.saveExam=async function(){
      const folderId=getFolderId();
      const type=document.getElementById('ct')?.value||'listening';
      const title=document.getElementById('ctitle')?.value?.trim()||'';
      const isNew=!window.editingExamId && !window.__editingExamId;
      const startedAt=new Date().toISOString();
      let result;
      try{ result=await original.apply(this,arguments); }
      finally{
        if(folderId && isNew && (type==='reading'||type==='listening') && title){
          try{
            const sb=window.__EXAM_FOLDER_CREATE_SB||window.supabase.createClient(cfg.url,cfg.anonKey);
            window.__EXAM_FOLDER_CREATE_SB=sb;
            const userRes=await sb.auth.getUser();
            const uid=userRes.data?.user?.id;
            if(uid){
              const q=await sb.from('exams').select('id,folder_id,created_at,title,exam_type').eq('owner_id',uid).eq('exam_type',type).eq('title',title).order('created_at',{ascending:false}).limit(10);
              const candidate=(q.data||[]).find(x=>!x.folder_id && (!x.created_at||x.created_at>=startedAt));
              if(candidate){
                const up=await sb.from('exams').update({folder_id:folderId}).eq('id',candidate.id);
                if(!up.error) window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__=null;
              }
            }
          }catch(err){ console.warn('Exam folder assignment skipped:',err); }
        }
      }
      return result;
    };
    window.__examFolderCreateFixInstalled=true;
    return true;
  }
  const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},250);
})();
