/* BƯỚC 12 - Teacher account helper
   This helper adds registration/profile UI without changing student pages. */
(function(){
  if(!/admin\.html$/.test(location.pathname)) return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!window.supabase||!cfg.url||!cfg.anonKey) return;

  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  window.TEACHER_AUTH_CLIENT=client;

  function addRegisterLink(){
    const authCard=document.querySelector('.auth.card');
    if(!authCard||document.getElementById('teacherRegisterBtn')) return;
    const btn=document.createElement('button');
    btn.id='teacherRegisterBtn';
    btn.type='button';
    btn.className='btn gray';
    btn.style.marginTop='10px';
    btn.textContent='👨‍🏫 Tạo tài khoản giáo viên';
    btn.onclick=showRegister;
    authCard.appendChild(btn);
  }

  function showRegister(){
    const authCard=document.querySelector('.auth.card');
    if(!authCard) return;
    authCard.innerHTML=`
      <h2>👨‍🏫 Tạo tài khoản giáo viên</h2>
      <div class="field"><label>Họ và tên</label><input id="regName" type="text" placeholder="Nguyễn Văn A"></div>
      <div class="field"><label>Email</label><input id="regEmail" type="email" placeholder="teacher@example.com"></div>
      <div class="field"><label>Mật khẩu</label><input id="regPassword" type="password" minlength="6" placeholder="Ít nhất 6 ký tự"></div>
      <div class="field"><label>Nhập lại mật khẩu</label><input id="regPassword2" type="password" minlength="6"></div>
      <button class="btn" id="regBtn">Đăng ký</button>
      <button class="btn gray" id="backLoginBtn" style="margin-left:6px">← Quay lại đăng nhập</button>
      <p id="regMessage" class="muted"></p>`;
    document.getElementById('regBtn').onclick=register;
    document.getElementById('backLoginBtn').onclick=()=>location.reload();
  }

  async function register(){
    const name=document.getElementById('regName').value.trim();
    const email=document.getElementById('regEmail').value.trim();
    const password=document.getElementById('regPassword').value;
    const password2=document.getElementById('regPassword2').value;
    const msg=document.getElementById('regMessage');
    if(!name||!email||!password){msg.textContent='❌ Vui lòng nhập đầy đủ thông tin.';return;}
    if(password!==password2){msg.textContent='❌ Hai mật khẩu không giống nhau.';return;}
    if(password.length<6){msg.textContent='❌ Mật khẩu cần ít nhất 6 ký tự.';return;}

    const {data,error}=await client.auth.signUp({email,password});
    if(error){msg.textContent='❌ '+error.message;return;}

    if(data.session){
      const r=await client.rpc('create_teacher_profile',{p_full_name:name});
      if(r.error){msg.textContent='❌ Tạo tài khoản được nhưng chưa tạo hồ sơ: '+r.error.message;return;}
      msg.textContent='✅ Tạo tài khoản thành công. Đang mở Dashboard...';
      setTimeout(()=>location.reload(),500);
    }else{
      msg.textContent='✅ Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.';
    }
  }

  const timer=setInterval(()=>{
    const authCard=document.querySelector('.auth.card');
    if(authCard){addRegisterLink();clearInterval(timer);}
  },100);
  setTimeout(()=>clearInterval(timer),10000);
})();
