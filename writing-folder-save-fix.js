/* English Studio - keep newly created Writing exams in the active folder */
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  let targetFolder=null;
  let pendingTitle='';
  function capture(){
    const crumb=document.querySelector('.efx5crumb');
    const buttons=crumb?[...crumb.querySelectorAll('button[data-crumb]')]:[];
    const last=buttons[buttons.length-1];
    targetFolder=last?.dataset?.crumb&&last.dataset.crumb!=='root'?last.dataset.crumb:null;
  }
  async function repair(){
    if(!pendingTitle)return;
    const cfg=window.SUPABASE_CONFIG||{};
    if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
    const db=window.__WRITING_FOLDER_FIX_DB||(window.__WRITING_FOLDER_FIX_DB=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true}}));
    const ses=await db.auth.getSession();
    const uid=ses.data?.session?.user?.id;
    if(!uid)return;
    const r=await db.from('exams').select('id,folder_id,created_at').eq('owner_id',uid).eq('exam_type','writing').eq('title',pendingTitle).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(r.error||!r.data)return;
    if(String(r.data.folder_id||'')===String(targetFolder||'')){pendingTitle='';return}
    const u=await db.from('exams').update({folder_id:targetFolder||null}).eq('id',r.data.id);
    if(u.error)console.warn('Writing folder repair:',u.error.message);
    pendingTitle='';
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('#fx-new,#fx-empty');
    if(!b)return;
    capture();
    setTimeout(()=>{if(document.getElementById('ct')?.value==='writing')pendingTitle=document.getElementById('ctitle')?.value?.trim()||''},80);
  },true);
  const oldAlert=window.alert;
  window.alert=function(msg){
    const text=String(msg||'');
    const result=oldAlert.apply(this,arguments);
    if(pendingTitle&&/Đã tạo đề Writing/i.test(text))setTimeout(repair,150);
    return result;
  };
  window.__writingFolderSaveFix={capture};
})();
