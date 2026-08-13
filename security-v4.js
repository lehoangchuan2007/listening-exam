/* English Studio - BƯỚC 12.7: teacher route guard */
(function(){
  const path=location.pathname;
  const isAdmin=/admin\.html$/.test(path);
  const isProtected=/manage\.html$|results\.html$/.test(path);
  if(!isAdmin&&!isProtected)return;

  const cfg=window.SUPABASE_CONFIG||{};
  if(!window.supabase||!cfg.url||!cfg.anonKey)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  let busy=false;

  async function getSession(){
    const r=await client.auth.getSession();
    if(r.error)throw r.error;
    return r.data?.session||null;
  }

  async function teacherCheck(){
    const session=await getSession();
    if(!session?.user?.id)return false;
    const r=await client.from('teacher_profiles')
      .select('user_id')
      .eq('user_id',session.user.id)
      .maybeSingle();
    if(r.error){console.error('teacher_profiles check:',r.error);return false;}
    return !!r.data;
  }

  async function requireTeacher(){
    if(busy)return false;
    busy=true;
    try{
      const session=await getSession();

      // admin.html tự hiển thị form đăng nhập khi chưa có session.
      if(isAdmin&&!session)return false;

      // manage.html/results.html bắt buộc phải đăng nhập.
      if(!session){
        if(isProtected)location.replace('./admin.html');
        return false;
      }

      const allowed=await teacherCheck();
      if(allowed){
        document.documentElement.dataset.teacherAuthorized='1';
        document.documentElement.dataset.teacherUserId=session.user.id;
        return true;
      }

      if(isAdmin){
        await client.auth.signOut();
        location.reload();
        return false;
      }

      const app=document.getElementById('app');
      if(app){
        app.innerHTML='<div class="card" style="margin-top:35px"><h2>🔐 Truy cập bị từ chối</h2><div class="error">🚫 Tài khoản hiện tại chưa được cấp quyền giáo viên.</div><p class="muted">Vui lòng đăng nhập bằng tài khoản giáo viên đã được cấp quyền.</p><a class="btn gray" href="./admin.html">← Về trang đăng nhập</a></div>';
      }
      return false;
    }catch(error){
      console.error('Teacher route guard:',error);
      if(isProtected)location.replace('./admin.html');
      return false;
    }finally{busy=false;}
  }

  window.EnglishStudioSecurity={
    teacherCheck,
    requireTeacher,
    clearCache:function(){busy=false;}
  };

  client.auth.onAuthStateChange(function(event){
    if(event==='SIGNED_OUT'&&isProtected)location.replace('./admin.html');
    if(event==='SIGNED_IN')setTimeout(requireTeacher,0);
  });

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',requireTeacher,{once:true});
  }else{
    requireTeacher();
  }
})();
