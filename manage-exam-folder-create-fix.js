/* English Studio - keep newly created Reading/Listening exams in the active Explorer folder */
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const getFolderId=()=>{
    const crumbs=[...document.querySelectorAll('.efx5crumb [data-crumb]')];
    const last=crumbs.at(-1);
    if(last&&last.dataset.crumb&&last.dataset.crumb!=='root')return last.dataset.crumb;
    return window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__||null;
  };
  let createOriginal=null,saveOriginal=null;
  function installCreate(){
    if(typeof window.createExam!=='function'||window.createExam===createOriginal)return;
    createOriginal=window.createExam;
    window.createExam=function(){
      window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__=getFolderId();
      return createOriginal.apply(this,arguments);
    };
  }
  function installSave(){
    if(window.__examFolderCreateFixInstalled||typeof window.saveExam!=='function')return false;
    saveOriginal=window.saveExam;
    window.saveExam=async function(){
      const folderId=getFolderId()||window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__||null;
      const type=(document.getElementById('ct')?.value||'listening').toLowerCase();
      const title=document.getElementById('ctitle')?.value?.trim()||'';
      const isNew=!window.editingExamId&&!window.__editingExamId;
      const startedAt=new Date().toISOString();
      let result;
      try{result=await saveOriginal.apply(this,arguments)}finally{
        if(folderId&&isNew&&['reading','listening'].includes(type)&&title){
          try{
            const sb=window.__EXAM_FOLDER_CREATE_SB||window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.__EXAM_FOLDER_CREATE_SB=sb;
            const userRes=await sb.auth.getUser();const uid=userRes.data?.user?.id;
            if(uid){
              await new Promise(r=>setTimeout(r,500));
              const q=await sb.from('exams').select('id,folder_id,created_at,title,exam_type').eq('owner_id',uid).eq('exam_type',type).eq('title',title).order('created_at',{ascending:false}).limit(10);
              const candidate=(q.data||[]).find(x=>!x.folder_id&&(!x.created_at||x.created_at>=startedAt))||(q.data||[]).find(x=>!x.folder_id);
              if(candidate){const up=await sb.from('exams').update({folder_id:folderId}).eq('id',candidate.id);if(!up.error)window.__ENGLISH_STUDIO_CREATE_FOLDER_ID__=null;}
            }
          }catch(err){console.warn('Exam folder assignment skipped:',err)}
        }
      }
      return result;
    };
    window.__examFolderCreateFixInstalled=true;return true;
  }
  const timer=setInterval(()=>{installCreate();if(installSave())clearInterval(timer)},200);
  installCreate();installSave();
})();
