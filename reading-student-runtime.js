// English Studio - dedicated Reading submission bridge.
// Reading submissions now use the authenticated Supabase student profile.
(function(){
  if(!/\/reading\.html$/.test(location.pathname))return;
  if(window.__ENGLISH_STUDIO_READING_RUNTIME__)return;
  window.__ENGLISH_STUDIO_READING_RUNTIME__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  const params=new URLSearchParams(location.search);
  const examId=params.get('exam')||location.hash.slice(6);
  let examData=null;
  let submitting=false;

  function unwrap(v){
    if(Array.isArray(v))return v[0]||null;
    if(v&&Array.isArray(v.data))return v.data[0]||null;
    if(typeof v==='string'){try{return unwrap(JSON.parse(v))}catch{return null}}
    return v&&typeof v==='object'?v:null;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function questions(){const q=examData?.questions;if(Array.isArray(q))return q;try{return JSON.parse(q||'[]')}catch{return []}}

  async function loadExam(){
    if(!examId)return;
    try{
      const r=await client.rpc('get_reading_exam_for_student',{p_exam_id:examId});
      if(!r.error)examData=unwrap(r.data);
    }catch(_){ }
  }

  async function identity(){
    const r=await client.auth.getSession();
    const u=r.data?.session?.user;
    if(!u)return null;
    return {
      name:String(u.user_metadata?.full_name||'').trim(),
      sid:String(u.user_metadata?.student_id||'').trim()
    };
  }

  function collectAnswers(){
    const answers={};
    questions().forEach((q,i)=>{
      const checked=document.querySelector('input[name="q'+i+'"]:checked');
      const text=document.querySelector('textarea[name="q'+i+'"]');
      if(checked)answers[String(i)]=Number(checked.value);
      else if(text)answers[String(i)]=text.value;
    });
    return answers;
  }

  async function submit(){
    if(submitting)return;
    submitting=true;
    const me=await identity();
    if(!me?.name||!me?.sid){
      alert('❌ Tài khoản sinh viên chưa có đầy đủ Họ tên và MSSV. Vui lòng đăng nhập lại.');
      submitting=false;
      return;
    }
    if(!examId){alert('❌ Thiếu mã đề Reading.');submitting=false;return;}

    const answers=collectAnswers();
    // The server ignores the two legacy identity arguments and uses auth.uid()
    // plus user_metadata as the authoritative student identity.
    const r=await client.rpc('submit_exam',{p_exam_id:examId,p_student_name:me.name,p_student_id:me.sid,p_answers:answers});
    if(r.error){alert('❌ '+r.error.message);submitting=false;return;}

    let data=unwrap(r.data)||{};
    const total=questions().length;
    const score=data.score??'—';
    const correct=data.correct_count??'—';
    document.getElementById('app').innerHTML=`<div class="pane" style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:30px;text-align:center"><div style="font-size:44px;font-weight:900;color:#2563eb">${esc(score)}</div><h2>🎉 Đã nộp bài thành công!</h2><p>Đúng: ${esc(correct)}/${esc(data.total_questions??total)} câu</p><p class="notice">Họ tên: <b>${esc(data.student_name||me.name)}</b><br>MSSV: <b>${esc(data.student_id||me.sid)}</b></p><button class="btn gray" onclick="location.href='./student.html'">📚 Về thư viện đề</button></div>`;
  }

  function install(){
    const button=document.getElementById('submit');
    if(!button){setTimeout(install,150);return;}
    if(button.dataset.readingRuntimeBound==='1')return;
    button.dataset.readingRuntimeBound='1';
    button.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();submit();},true);
    identity().then(me=>{
      if(!me?.name||!me?.sid)return;
      const bar=document.createElement('div');
      bar.className='notice';
      bar.style.margin='0 0 12px';
      bar.innerHTML='👤 <b>'+esc(me.name)+'</b> • MSSV <b>'+esc(me.sid)+'</b>';
      const layout=document.querySelector('.layout');
      if(layout?.parentNode)layout.parentNode.insertBefore(bar,layout);
    });
  }

  loadExam();
  const observer=new MutationObserver(install);
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
