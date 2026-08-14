/* English Studio - Student authentication gate */
(function(){
  if(!/(?:student|reading)\.html$/.test(location.pathname)) return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!window.supabase||!cfg.url||!cfg.anonKey) return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  window.STUDENT_AUTH_CLIENT=client;
  let session=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const isStudentPage=/student\.html$/.test(location.pathname);
  function identity(){const u=session?.user;return {name:u?.user_metadata?.full_name||'',sid:u?.user_metadata?.student_id||'',email:u?.email||''};}
  async function syncExamClient(s){
    const target=window.STUDENT_EXAM_CLIENT;
    if(!target||target===client)return;
    try{
      if(s?.access_token&&s?.refresh_token){
        await target.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
      }else{
        await target.auth.signOut({scope:'local'});
      }
    }catch(e){console.warn('English Studio auth sync:',e);}
  }
  function styles(){if(document.getElementById('student-auth-style'))return;const s=document.createElement('style');s.id='student-auth-style';s.textContent=`
      .student-auth-overlay{position:fixed;inset:0;z-index:9999;background:rgba(245,247,251,.97);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
      .student-auth-card{width:min(460px,100%);background:#fff;border:1px solid #dbe3ef;border-radius:20px;padding:26px;box-shadow:0 18px 50px rgba(15,23,42,.12)}
      .student-auth-card h2{margin:0 0 8px}.student-auth-card .auth-field{margin:12px 0}.student-auth-card label{display:block;font-weight:700;margin-bottom:6px}.student-auth-card input{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px}.student-auth-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.student-auth-msg{min-height:22px;margin-top:12px;font-size:14px}.student-account{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin:0 0 12px}.student-account .pill{background:#eaf2ff;color:#1d4ed8;border-radius:999px;padding:7px 11px;font-size:13px;font-weight:800}
    `;document.head.appendChild(s);}
  function overlay(mode='login'){if(!isStudentPage)return;styles();let ov=document.getElementById('studentAuthOverlay');if(!ov){ov=document.createElement('div');ov.id='studentAuthOverlay';ov.className='student-auth-overlay';document.body.appendChild(ov);}const register=mode==='register';ov.innerHTML=`<div class="student-auth-card">
      <div style="font-size:42px">📚</div><h2>${register?'📝 Đăng ký tài khoản sinh viên':'🔐 Đăng nhập sinh viên'}</h2>
      <p style="color:#64748b;margin-top:0">${register?'Tạo tài khoản để truy cập các bài kiểm tra của English Studio.':'Đăng nhập để truy cập thư viện đề và lịch sử làm bài.'}</p>
      ${register?`<div class="auth-field"><label>Họ và tên</label><input id="saName" autocomplete="name" placeholder="Nguyễn Văn A"></div><div class="auth-field"><label>MSSV</label><input id="saSid" autocomplete="username" placeholder="B1234567"></div>`:''}
      <div class="auth-field"><label>Email</label><input id="saEmail" type="email" autocomplete="email" placeholder="student@example.com"></div>
      <div class="auth-field"><label>Mật khẩu</label><input id="saPassword" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="6" placeholder="Ít nhất 6 ký tự"></div>
      ${register?`<div class="auth-field"><label>Nhập lại mật khẩu</label><input id="saPassword2" type="password" autocomplete="new-password" minlength="6"></div>`:''}
      <div class="student-auth-actions"><button class="btn" id="saSubmit">${register?'📝 Đăng ký':'🔑 Đăng nhập'}</button><button class="btn gray" id="saSwitch">${register?'← Đã có tài khoản':'📝 Chưa có tài khoản? Đăng ký'}</button></div><div id="saMsg" class="student-auth-msg"></div>
    </div>`;document.getElementById('saSubmit').onclick=register?doRegister:doLogin;document.getElementById('saSwitch').onclick=()=>overlay(register?'login':'register');}
  async function doLogin(){const email=document.getElementById('saEmail')?.value.trim(),password=document.getElementById('saPassword')?.value||'',msg=document.getElementById('saMsg');if(!email||!password){msg.textContent='❌ Vui lòng nhập email và mật khẩu.';return;}msg.textContent='⏳ Đang đăng nhập...';const r=await client.auth.signInWithPassword({email,password});if(r.error){msg.textContent='❌ '+r.error.message;return;}session=r.data.session;await syncExamClient(session);closeGate();refreshAccount();if(isStudentPage&&typeof window.loadList==='function')window.loadList();}
  async function doRegister(){const name=document.getElementById('saName')?.value.trim(),sid=document.getElementById('saSid')?.value.trim(),email=document.getElementById('saEmail')?.value.trim(),password=document.getElementById('saPassword')?.value||'',password2=document.getElementById('saPassword2')?.value||'',msg=document.getElementById('saMsg');if(!name||!sid||!email||!password){msg.textContent='❌ Vui lòng nhập đầy đủ thông tin.';return;}if(password.length<6){msg.textContent='❌ Mật khẩu cần ít nhất 6 ký tự.';return;}if(password!==password2){msg.textContent='❌ Hai mật khẩu không giống nhau.';return;}msg.textContent='⏳ Đang tạo tài khoản...';const r=await client.auth.signUp({email,password,options:{data:{role:'student',full_name:name,student_id:sid}}});if(r.error){msg.textContent='❌ '+r.error.message;return;}if(r.data.session){session=r.data.session;await syncExamClient(session);closeGate();refreshAccount();if(isStudentPage&&typeof window.loadList==='function')window.loadList();}else msg.textContent='✅ Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.';}
  function closeGate(){const ov=document.getElementById('studentAuthOverlay');if(ov)ov.remove();}
  async function logout(){await client.auth.signOut();await syncExamClient(null);session=null;if(isStudentPage){showLoggedOut();overlay('login');}else location.href='./student.html';}
  function refreshAccount(){if(!isStudentPage)return;styles();const top=document.querySelector('.top .wrap');if(!top)return;let box=document.getElementById('studentAccountBar');if(!box){box=document.createElement('div');box.id='studentAccountBar';box.className='student-account';top.appendChild(box);}const me=identity();box.innerHTML=`<span class="pill">👤 ${esc(me.name||me.email)}${me.sid?` • ${esc(me.sid)}`:''}</span><button class="btn gray" type="button" id="studentLogout">Đăng xuất</button>`;document.getElementById('studentLogout').onclick=logout;}
  function showLoggedOut(){const b=document.getElementById('studentAccountBar');if(b)b.remove();}
  function wrapStudentActions(){if(!isStudentPage)return;['loadExam','showHistory'].forEach(fn=>{const f=window[fn];if(typeof f!=='function'||f.__studentAuthWrapped)return;const wrapped=async function(){const r=await client.auth.getSession();if(!r.data.session){overlay('login');return;}session=r.data.session;await syncExamClient(session);return f.apply(this,arguments)};wrapped.__studentAuthWrapped=true;window[fn]=wrapped;});}
  async function gate(){const r=await client.auth.getSession();session=r.data.session;if(isStudentPage){if(session){await syncExamClient(session);closeGate();refreshAccount();wrapStudentActions();}else{showLoggedOut();overlay('login');}}else{if(!session){location.replace('./student.html');return;}await syncExamClient(session);}client.auth.onAuthStateChange((_event,s)=>{session=s;syncExamClient(s);if(isStudentPage){if(s){closeGate();refreshAccount();wrapStudentActions();}else{showLoggedOut();overlay('login');}}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',gate,{once:true});else gate();
})();
