// English Studio - keep newly created exams in the active File Explorer folder
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_CREATE_FOLDER_FIX__)return;
  window.__ENGLISH_STUDIO_CREATE_FOLDER_FIX__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let originalCreate=null;
  let pending=null;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  function patch(){
    if(typeof window.createExam!=='function'||window.createExam===originalCreate)return;
    originalCreate=window.createExam;
    window.createExam=function(){
      const folderId=window.__ENGLISH_STUDIO_ACTIVE_FOLDER_ID??window.__ENGLISH_STUDIO_CURRENT_FOLDER_ID??null;
      pending={folderId:folderId||null,startedAt:new Date().toISOString()};
      return originalCreate.apply(this,arguments);
    };
  }
  async function finish(){
    if(!pending)return;
    const p=pending;pending=null;
    const title=(document.getElementById('ctitle')?.value||'').trim();
    const type=(document.getElementById('ct')?.value||'').trim().toLowerCase();
    if(!title||!['reading','listening'].includes(type))return;
    const ses=await db.auth.getSession();
    const uid=ses.data?.session?.user?.id;
    if(!uid)return;
    await wait(900);
    let q=db.from('exams').select('id,title,exam_type,folder_id,created_at').eq('owner_id',uid).eq('exam_type',type).eq('title',title).order('created_at',{ascending:false}).limit(5);
    const r=await q;
    if(r.error||!r.data?.length)return;
    const candidate=r.data.find(x=>!x.folder_id&&x.created_at>=p.startedAt)||r.data[0];
    if(!candidate)return;
    if(String(candidate.folder_id||'')===String(p.folderId||''))return;
    const u=await db.from('exams').update({folder_id:p.folderId||null}).eq('id',candidate.id);
    if(u.error)console.warn('Create-folder fix:',u.error.message);
    if(typeof window.load==='function')window.load();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('.modal .btn');
    if(!b||!/Tạo đề|Lưu thay đổi/.test(b.textContent||''))return;
    if((document.getElementById('ct')?.value||'').toLowerCase()==='writing')return;
    setTimeout(finish,1200);
  },true);
  const observer=new MutationObserver(patch);
  observer.observe(document.body,{childList:true,subtree:true});
  const timer=setInterval(()=>{patch();if(originalCreate&&document.querySelector('.efx5')){clearInterval(timer)}},300);
  patch();
})();
