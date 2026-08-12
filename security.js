/* English Studio - frontend access guard
 * Real security is enforced by Supabase RLS + is_teacher().
 * This file only improves the UX and prevents protected pages from rendering
 * before the server-side permission check succeeds.
 */
(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  if(!window.supabase||!cfg.url||!cfg.anonKey)return;

  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  let checked=null;

  async function teacherCheck(){
    if(checked!==null)return checked;
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session){checked=false;return false;}
      const {data,error}=await client.rpc('is_teacher');
      checked=!error&&data===true;
      return checked;
    }catch(e){
      console.error('Teacher permission check failed:',e);
      checked=false;
      return false;
    }
  }

  async function requireTeacher(){
    const ok=await teacherCheck();
    if(ok)return true;
    alert('🚫 Tài khoản này không có quyền giáo viên.');
    if(location.pathname.endsWith('/results.html')||location.pathname.endsWith('/manage.html')){
      location.href='./admin.html';
    }
    return false;
  }

  window.EnglishStudioSecurity={teacherCheck,requireTeacher};

  const originalFunctions={};
  const protectedFunctions=['dashboard','loadDashboard','init'];
  const signupBlock=function(){
    const msg=document.getElementById('authMsg');
    if(msg)msg.textContent='Tài khoản giáo viên phải được cấp quyền trước khi sử dụng trang quản lý.';
    else alert('🚫 Không thể tự đăng ký tài khoản giáo viên.');
  };

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
    if(originalFunctions.dashboard||originalFunctions.loadDashboard||originalFunctions.init){
      clearInterval(timer);
    }
  }

  const timer=setInterval(install,50);
  setTimeout(()=>clearInterval(timer),10000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
