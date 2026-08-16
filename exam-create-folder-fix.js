// English Studio - keep newly created Reading/Listening exams in the active File Explorer folder
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_CREATE_FOLDER_FIX__)return;
  window.__ENGLISH_STUDIO_CREATE_FOLDER_FIX__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let originalCreate=null,pending=null;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  function activeFolder(){
    const buttons=[...document.querySelectorAll('.efx5crumb [data-crumb]')];
    const last=buttons.at(-1);
    if(!last||last.dataset.crumb==='root')return null;
    return last.dataset.crumb||null;
  }
  function patch(){
    if(typeof window.createExam!=='function'||window.createExam===originalCreate)return;
    originalCreate=window.createExam;
    window.createExam=function(){
      pending={folderId:activeFolder(),startedAt:new Date().toISOString()};
      return originalCreate.apply(this,arguments);
    };
  }
  async function finish(){
    if(!pending)return;
    const p=pending;pending=null;
    const title=(document.getElementById('ctitle')?.value||'').trim();
    const type=(document.getElementById('ct')?.value||'').trim().toLowerCase();
    if(!title||!['reading','listening'].includes(type))return;
    const ses=await db.auth.getSession();const uid=ses.data?.session?.user?.id;if(!uid)return;
    await wait(900);
    const r=await db.from('exams').select('id,title,exam_type,folder_id,created_at').eq('owner_id',uid).eq('exam_type',type).eq('title',title).order('created_at',{ascending:false}).limit(10);
    if(r.error||!r.data?.length)return;
    const fresh=r.data.find(x=>x.created_at>=p.startedAt)||r.data[0];if(!fresh)return;
    if(String(fresh.folder_id||'')===String(p.folderId||''))return;
    const u=await db.from('exams').update({folder_id:p.folderId||null}).eq('id',fresh.id);
    if(u.error)console.warn('Create-folder fix:',u.error.message);
    if(typeof window.load==='function')window.load();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('.modal .btn');
    if(!b||!/Tạo đề|Lưu thay đổi/.test(b.textContent||''))return;
    if((document.getElementById('ct')?.value||'').toLowerCase()==='writing')return;
    setTimeout(finish,1200);
  },true);
  const observer=new MutationObserver(patch);observer.observe(document.body,{childList:true,subtree:true});
  const timer=setInterval(()=>{patch();if(originalCreate&&document.querySelector('.efx5'))clearInterval(timer)},300);patch();
})();
