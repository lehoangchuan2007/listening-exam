/* English Studio - BƯỚC 12.7 teacher route guard */
(function(){
  const path=location.pathname;
  const isAdmin=/admin\.html$/.test(path);
  const isProtected=/manage\.html$|results\.html$/.test(path);
  if(!isAdmin&&!isProtected)return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!window.supabase||!cfg.url||!cfg.anonKey)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  let checkedUserId=null,checkedResult=null,redirecting=false;
  function clearCache(){checkedUserId=null;checkedResult=null;}
  async function teacherCheck(force=false){
    try{
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError)throw sessionError;
      if(!session?.user?.id){clearCache();return false;}
      const userId=session.user.id;
      if(!force&&checkedUserId===userId&&checkedResult!==null)return checkedResult;
      const {data,error}=await client.from('teacher_profiles').select('user_id').eq('user_id',userId).maybeSingle();
      checkedUserId=userId;checkedResult=!error&&!!data;return checkedResult;
    }catch(error){console.error('Teacher permission check failed:',error);clearCache();return false;}
  }
  function showDenied(){
    const app=document.getElementById('app');if(!app)return;
    app.innerHTML='<div class="card" style="margin-top:35px"><h2>🔐 Truy cập bị từ chối</h2><div style="padding:12px 14px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b">🚫 Tài khoản hiện tại chưa được cấp quyền giáo viên.</div><p class="muted">Vui lòng đăng nhập bằng tài khoản giáo viên đã được cấp quyền.</p><a class="btn gray" href="./admin.html">← Về trang đăng nhập</a></div>';
  }
  async function requireTeacher(){
    const {data:{session}}=await client.auth.getSession();
    if(isAdmin&&!session){redirecting=false;return false;}
    const ok=await teacherCheck();
    if(ok){document.documentElement.dataset.teacherAuthorized='1';return true;}
    if(redirecting)return false;redirecting=true;
    if(!session){location.replace('./admin.html');return false;}
    showDenied();return false;
  }
  window.EnglishStudioSecurity={teacherCheck,requireTeacher,clearCache};
  client.auth.onAuthStateChange((event,session)=>{
    clearCache();
    if(event==='SIGNED_OUT'){if(isProtected&&!redirecting)location.replace('./admin.html');return;}
    if(event==='SIGNED_IN'&&session)setTimeout(()=>{if(!redirecting)requireTeacher();},0);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',requireTeacher,{once:true});else requireTeacher();
})();
