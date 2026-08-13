/* Step 12.7 - teacher route guard */
(function(){
 const p=location.pathname,isAdmin=/admin\.html$/.test(p),isProtected=/manage\.html$|results\.html$/.test(p);
 if(!isAdmin&&!isProtected)return;
 const c=window.SUPABASE_CONFIG||{};if(!window.supabase||!c.url||!c.anonKey)return;
 const client=window.supabase.createClient(c.url,c.anonKey);let uid=null,okCache=null,busy=false;
 async function teacherCheck(force=false){
  try{
   const {data:{session},error:e}=await client.auth.getSession();if(e)throw e;
   if(!session?.user?.id){uid=null;okCache=null;return false;}
   if(!force&&uid===session.user.id&&okCache!==null)return okCache;
   const r=await client.from('teacher_profiles').select('user_id').eq('user_id',session.user.id).maybeSingle();
   uid=session.user.id;okCache=!r.error&&!!r.data;return okCache;
  }catch(e){console.error('teacher check',e);uid=null;okCache=null;return false;}
 }
 async function guard(){
  const {data:{session}}=await client.auth.getSession();
  if(isAdmin&&!session)return false;
  if(await teacherCheck(true)){document.documentElement.dataset.teacherAuthorized='1';return true;}
  if(busy)return false;busy=true;
  if(!session){location.replace('./admin.html');return false;}
  const app=document.getElementById('app');
  if(app)app.innerHTML='<div class="card" style="margin-top:35px"><h2>🔐 Truy cập bị từ chối</h2><div class="error">🚫 Tài khoản hiện tại chưa được cấp quyền giáo viên.</div><p class="muted">Vui lòng đăng nhập bằng tài khoản giáo viên đã được cấp quyền.</p><a class="btn gray" href="./admin.html">← Về trang đăng nhập</a></div>';
  return false;
 }
 window.EnglishStudioSecurity={teacherCheck,requireTeacher:guard,clearCache:()=>{uid=null;okCache=null;}};
 client.auth.onAuthStateChange((event,session)=>{uid=null;okCache=null;if(event==='SIGNED_OUT'&&isProtected)location.replace('./admin.html');if(event==='SIGNED_IN'&&session)setTimeout(guard,0);});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',guard,{once:true});else guard();
})();
