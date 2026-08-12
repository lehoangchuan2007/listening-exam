/* English Studio - frontend access guard
 * Real security is enforced by Supabase RLS + is_teacher().
 * This file only improves the UX and prevents protected pages from rendering
 * before the server-side permission check succeeds.
 */
(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  if(!window.supabase||!cfg.url||!cfg.anonKey)return;

  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  let checkedUserId=null;
  let checkedResult=null;

  client.auth.onAuthStateChange(()=>{
    checkedUserId=null;
    checkedResult=null;
  });

  async function teacherCheck(){
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session){
        checkedUserId=null;
        checkedResult=false;
        return false;
      }
      if(checkedUserId===session.user.id && checkedResult!==null)return checkedResult;

      const {data,error}=await client.rpc('is_teacher');
      checkedUserId=session.user.id;
      checkedResult=!error&&data===true;
      return checkedResult;
    }catch(e){
      console.error('Teacher permission check failed:',e);
      checkedUserId=null;
      checkedResult=false;
      return false;
    }
  }

  async function requireTeacher(){
    const ok=await teacherCheck();
    if(ok)return true;

    const message='🚫 Tài khoản này không có quyền giáo viên.';
    const app=document.getElementById('app');
    if(app && /admin\.html$|manage\.html$|results\.html$/.test(location.pathname)){
      app.innerHTML=`<div class="card" style="margin-top:35px"><h2>🔐 Truy cập bị từ chối</h2><div style="padding:12px 14px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b">${message}</div><p class="muted">Tài khoản hiện tại chưa được cấp quyền giáo viên.</p><a class="btn gray" href="./admin.html">← Về trang đăng nhập</a></div>`;
    }else{
      alert(message);
    }
    return false;
  }

  window.EnglishStudioSecurity={teacherCheck,requireTeacher};

  const originalFunctions={};
  const protectedFunctions=['dashboard','loadDashboard','init'];

  function signupBlock(){
    const msg=document.getElementById('authMsg');
    if(msg)msg.textContent='🚫 Không thể tự đăng ký tài khoản giáo viên. Tài khoản phải được cấp quyền.';
    else alert('🚫 Không thể tự đăng ký tài khoản giáo viên.');
  }

  function wrap(name){
    const fn=window[name];
    if(typeof fn!=='function'||originalFunctions[name])return;
    originalFunctions[name]=fn;
    window[name]=async function(...args){
      if(!(await requireTeacher()))return;
      return fn.apply(this,args);
    };
  }

  function wrapSignup(){
    const fn=window.doAuth;
    if(typeof fn!=='function'||originalFunctions.doAuth)return;
    originalFunctions.doAuth=fn;
    window.doAuth=async function(mode,...args){
      if(mode==='signup')return signupBlock();
      return fn.apply(this,[mode,...args]);
    };
  }

  function install(){
    protectedFunctions.forEach(wrap);
    wrapSignup();
  }

  const timer=setInterval(install,50);
  setTimeout(()=>clearInterval(timer),10000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
