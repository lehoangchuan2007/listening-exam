/* English Studio - Student authentication gate + account menu */
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
      if(s?.access_token&&s?.refresh_token) await target.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
      else await target.auth.signOut({scope:'local'});
    }catch(e){console.warn('English Studio auth sync:',e);}
  }
  function styles(){
    if(document.getElementById('student-auth-style'))return;
    const s=document.createElement('style');s.id='student-auth-style';s.textContent=`
      .student-auth-overlay{position:fixed;inset:0;z-index:9999;background:rgba(245,247,251,.97);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
      .student-auth-card{width:min(460px,100%);background:#fff;border:1px solid #dbe3ef;border-radius:20px;padding:26px;box-shadow:0 18px 50px rgba(15,23,42,.12)}
      .student-auth-card h2{margin:0 0 8px}.student-auth-card .auth-field{margin:12px 0}.student-auth-card label{display:block;font-weight:700;margin-bottom:6px}.student-auth-card input{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px}.student-auth-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.student-auth-msg{min-height:22px;margin-top:12px;font-size:14px}.student-account-menu{position:absolute;right:0;top:52px;width:min(330px,calc(100vw - 28px));background:#fff;color:#0f172a;border:1px solid #dbe3ef;border-radius:16px;padding:16px;box-shadow:0 18px 45px rgba(15,23,42,.2);z-index:1000}.student-account-wrap{position:relative}.student-menu-btn{width:44px;height:40px;border:0;border-radius:10px;background:rgba(255,255,255,.16);color:#fff;font-size:22px;font-weight:900;cursor:pointer}.student-menu-head{font-weight:900;font-size:16px;margin-bottom:10px}.student-menu-meta{font-size:13px;color:#64748b;line-height:1.55;margin-bottom:12px;word-break:break-word}.student-menu-actions{display:flex;gap:8px;flex-wrap:wrap}.student-menu-divider{height:1px;background:#e2e8f0;margin:14px 0}.student-profile-field{margin:10px 0}.student-profile-field label{display:block;font-size:13px;font-weight:800;margin-bottom:5px}.student-profile-field input{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:9px}.student-profile-msg{font-size:13px;min-height:20px;margin-top:8px}
    `;document.head.appendChild(s);
  }
  function overlay(mode='login',extra=''){
    if(!isStudentPage)return;styles();let ov=document.getElementById('studentAuthOverlay');if(!ov){ov=document.createElement('div');ov.id='studentAuthOverlay';ov.className='student-auth-overlay';document.body.appendChild(ov);}const register=mode==='register';
    ov.innerHTML=`<div class="student-auth-card"><div style="font-size:42px">📚</div><h2>${register?'📝 Đăng ký tài khoản sinh viên':'🔐 Đăng nhập sinh viên'}</h2><p style="color:#64748b;margin-top:0">${register?'Tạo tài khoản để truy cập các bài kiểm tra của English Studio.':'Đăng nhập để truy cập thư viện đề và lịch sử làm bài.'}</p>
      ${register?`<div class="auth-field"><label>Họ và tên</label><input id="saName" autocomplete="name" placeholder="Nguyễn Văn A"></div><div class="auth-field"><label>MSSV</label><input id="saSid" autocomplete="username" placeholder="B1234567"></div>`:''}
      <div class="auth-field"><label>Email</label><input id="saEmail" type="email" autocomplete="email" placeholder="student@example.com"></div><div class="auth-field"><label>Mật khẩu</label><input id="saPassword" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="6" placeholder="Ít nhất 6 ký tự"></div>
      ${register?`<div class="auth-field"><label>Nhập lại mật khẩu</label><input id="saPassword2" type="password" autocomplete="new-password" minlength="6"></div>`:''}
      <div class="student-auth-actions"><button class="btn" id="saSubmit">${register?'📝 Đăng ký':'🔑 Đăng nhập'}</button><button class="btn gray" id="saSwitch">${register?'← Đã có tài khoản':'📝 Chưa có tài khoản? Đăng ký'}</button></div><div id="saMsg" class="student-auth-msg">${extra}</div></div>`;
    document.getElementById('saSubmit').onclick=register?doRegister:doLogin;document.getElementById('saSwitch').onclick=()=>overlay(register?'login':'register');
  }
  async function doLogin(){
    const email=document.getElementById('saEmail')?.value.trim(),password=document.getElementById('saPassword')?.value||'',msg=document.getElementById('saMsg');if(!email||!password){msg.textContent='❌ Vui lòng nhập email và mật khẩu.';return;}msg.textContent='⏳ Đang đăng nhập...';
    const r=await client.auth.signInWithPassword({email,password});if(r.error){msg.textContent=r.error.message.includes('Email not confirmed')?'📧 Email chưa được xác nhận. Hãy kiểm tra hộp thư hoặc gửi lại email xác nhận.':'❌ '+r.error.message;return;}session=r.data.session;await syncExamClient(session);closeGate();refreshAccount();if(isStudentPage&&typeof window.loadList==='function')window.loadList();
  }
  async function resendConfirmation(email){
    const msg=document.getElementById('saMsg');if(!email){msg.textContent='❌ Vui lòng nhập email.';return;}msg.textContent='⏳ Đang gửi lại email xác nhận...';
    const r=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+location.pathname}});
    msg.innerHTML=r.error?'❌ '+esc(r.error.message):'✅ Đã yêu cầu gửi lại email xác nhận. Hãy kiểm tra cả Spam/Quảng cáo.';
  }
  async function doRegister(){
    const name=document.getElementById('saName')?.value.trim(),sid=document.getElementById('saSid')?.value.trim(),email=document.getElementById('saEmail')?.value.trim(),password=document.getElementById('saPassword')?.value||'',password2=document.getElementById('saPassword2')?.value||'',msg=document.getElementById('saMsg');
    if(!name||!sid||!email||!password){msg.textContent='❌ Vui lòng nhập đầy đủ thông tin.';return;}if(password.length<6){msg.textContent='❌ Mật khẩu cần ít nhất 6 ký tự.';return;}if(password!==password2){msg.textContent='❌ Hai mật khẩu không giống nhau.';return;}
    msg.textContent='⏳ Đang tạo tài khoản...';const r=await client.auth.signUp({email,password,options:{data:{role:'student',full_name:name,student_id:sid},emailRedirectTo:location.origin+location.pathname}});if(r.error){msg.textContent='❌ '+r.error.message;return;}
    if(r.data.session){session=r.data.session;await syncExamClient(session);closeGate();refreshAccount();if(isStudentPage&&typeof window.loadList==='function')window.loadList();}
    else {msg.innerHTML=`✅ Đăng ký thành công. <b>${esc(email)}</b> cần được xác nhận qua email trước khi đăng nhập.<br><button class="btn gray" id="saResend" style="margin-top:10px">📧 Gửi lại email xác nhận</button>`;document.getElementById('saResend').onclick=()=>resendConfirmation(email);}
  }
  function closeGate(){const ov=document.getElementById('studentAuthOverlay');if(ov)ov.remove();}
  function renderMenu(){
    if(!isStudentPage)return;styles();const top=document.querySelector('.top .wrap');if(!top)return;
    let wrap=document.getElementById('studentAccountWrap');if(!wrap){wrap=document.createElement('div');wrap.id='studentAccountWrap';wrap.className='student-account-wrap';top.style.position='relative';top.appendChild(wrap);}
    const me=identity();wrap.innerHTML=`<button class="student-menu-btn" id="studentMenuBtn" aria-label="Mở menu tài khoản">☰</button><div class="student-account-menu" id="studentAccountMenu" hidden><div class="student-menu-head">👤 Tài khoản</div><div class="student-menu-meta"><b>Họ và tên:</b> ${esc(me.name||'Chưa cập nhật')}<br><b>Email:</b> ${esc(me.email)}${me.sid?`<br><b>MSSV:</b> ${esc(me.sid)}`:''}</div><div class="student-menu-actions"><button class="btn" id="studentEditProfile">✏️ Cập nhật tài khoản</button><button class="btn gray" id="studentLogout">🚪 Đăng xuất</button></div></div>`;
    const menu=document.getElementById('studentAccountMenu');document.getElementById('studentMenuBtn').onclick=()=>menu.hidden=!menu.hidden;document.getElementById('studentLogout').onclick=logout;document.getElementById('studentEditProfile').onclick=showProfileEditor;
    document.addEventListener('click',function outside(e){if(!wrap.contains(e.target))menu.hidden=true;},{once:true});
  }
  function refreshAccount(){renderMenu();}
  function showLoggedOut(){const b=document.getElementById('studentAccountWrap');if(b)b.remove();}
  function showProfileEditor(){
    styles();const me=identity();let ov=document.getElementById('studentProfileOverlay');if(!ov){ov=document.createElement('div');ov.id='studentProfileOverlay';ov.className='student-auth-overlay';document.body.appendChild(ov);}ov.innerHTML=`<div class="student-auth-card"><div style="font-size:38px">👤</div><h2>⚙️ Tài khoản</h2><p style="color:#64748b;margin-top:0">Bạn có thể cập nhật họ tên và email. MSSV được giữ cố định.</p><div class="student-profile-field"><label>Họ và tên</label><input id="spName" value="${esc(me.name)}"></div><div class="student-profile-field"><label>Email</label><input id="spEmail" type="email" value="${esc(me.email)}"></div><div class="student-profile-msg" id="spMsg"></div><div class="student-auth-actions"><button class="btn" id="spSave">💾 Lưu thay đổi</button><button class="btn gray" id="spCancel">Hủy</button></div></div>`;
    document.getElementById('spCancel').onclick=()=>ov.remove();document.getElementById('spSave').onclick=saveProfile;
  }
  async function saveProfile(){
    const name=document.getElementById('spName')?.value.trim(),email=document.getElementById('spEmail')?.value.trim(),msg=document.getElementById('spMsg');if(!name||!email){msg.textContent='❌ Họ tên và email không được để trống.';return;}msg.textContent='⏳ Đang lưu...';
    const r=await client.auth.updateUser({email,data:{full_name:name}});if(r.error){msg.textContent='❌ '+r.error.message;return;}session=(await client.auth.getSession()).data.session||session;await syncExamClient(session);msg.textContent=r.data.user?.email!==email?'📧 Họ tên đã cập nhật. Email mới cần được xác nhận qua email trước khi có hiệu lực.':'✅ Đã cập nhật tài khoản.';refreshAccount();setTimeout(()=>document.getElementById('studentProfileOverlay')?.remove(),1400);
  }
  async function logout(){await client.auth.signOut();await syncExamClient(null);session=null;if(isStudentPage){showLoggedOut();overlay('login');}else location.href='./student.html';}
  function wrapStudentActions(){if(!isStudentPage)return;['loadExam','showHistory'].forEach(fn=>{const f=window[fn];if(typeof f!=='function'||f.__studentAuthWrapped)return;const wrapped=async function(){const r=await client.auth.getSession();if(!r.data.session){overlay('login');return;}session=r.data.session;await syncExamClient(session);return f.apply(this,arguments)};wrapped.__studentAuthWrapped=true;window[fn]=wrapped;});}
  async function gate(){
    const r=await client.auth.getSession();session=r.data.session;
    if(isStudentPage){if(session){await syncExamClient(session);closeGate();refreshAccount();wrapStudentActions();}else{showLoggedOut();overlay('login');}}
    else{if(!session){location.replace('./student.html');return;}await syncExamClient(session);}
    client.auth.onAuthStateChange((_event,s)=>{session=s;syncExamClient(s);if(isStudentPage){if(s){closeGate();refreshAccount();wrapStudentActions();}else{showLoggedOut();overlay('login');}}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',gate,{once:true});else gate();
})();
