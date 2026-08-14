// English Studio - dedicated Reading submission bridge.
// reading.html keeps the proven rich-text display; this bridge makes submissions
// use the same secure submit_exam RPC as the main student page.
(function(){
  if(!/\/reading\.html$/.test(location.pathname))return;
  if(window.__ENGLISH_STUDIO_READING_RUNTIME__)return;
  window.__ENGLISH_STUDIO_READING_RUNTIME__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  const params=new URLSearchParams(location.search);
  const examId=params.get('exam')||location.hash.slice(6);
  const passedName=params.get('name')||'';
  const passedSid=params.get('sid')||'';
  let examData=null;
  let submitting=false;

  function unwrap(v){
    if(Array.isArray(v))return v[0]||null;
    if(v&&Array.isArray(v.data))return v.data[0]||null;
    if(typeof v==='string'){try{return unwrap(JSON.parse(v))}catch{return null}}
    return v&&typeof v==='object'?v:null;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function questions(){const q=examData?.questions; if(Array.isArray(q))return q;try{return JSON.parse(q||'[]')}catch{return []}}

  async function loadExam(){
    if(!examId)return;
    try{
      const r=await client.rpc('get_reading_exam_for_student',{p_exam_id:examId});
      if(!r.error)examData=unwrap(r.data);
    }catch(_){ }
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
    const name=passedName.trim()||prompt('Nhập họ và tên:')?.trim()||'';
    if(!name){submitting=false;return;}
    const sid=passedSid.trim()||prompt('Nhập MSSV:')?.trim()||'';
    if(!sid){submitting=false;return;}
    if(!examId){alert('❌ Thiếu mã đề Reading.');submitting=false;return;}

    const answers=collectAnswers();
    const r=await client.rpc('submit_exam',{p_exam_id:examId,p_student_name:name,p_student_id:sid,p_answers:answers});
    if(r.error){alert('❌ '+r.error.message);submitting=false;return;}

    let data=unwrap(r.data)||{};
    const total=questions().length;
    const score=data.score??'—';
    const correct=data.correct_count??'—';
    document.getElementById('app').innerHTML=`<div class="pane" style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:30px;text-align:center"><div style="font-size:44px;font-weight:900;color:#2563eb">${esc(score)}</div><h2>🎉 Đã nộp bài thành công!</h2><p>Đúng: ${esc(correct)}/${esc(data.total_questions??total)} câu</p><p class="notice">Họ tên: <b>${esc(name)}</b><br>MSSV: <b>${esc(sid)}</b></p><button class="btn gray" onclick="location.href='./student.html'">📚 Về thư viện đề</button></div>`;
  }

  function install(){
    const button=document.getElementById('submit');
    if(!button){setTimeout(install,150);return;}
    if(button.dataset.readingRuntimeBound==='1')return;
    button.dataset.readingRuntimeBound='1';
    button.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();submit();},true);
    if(passedName&&passedSid){
      const bar=document.createElement('div');
      bar.className='notice';
      bar.style.margin='0 0 12px';
      bar.innerHTML='👤 <b>'+esc(passedName)+'</b> • MSSV <b>'+esc(passedSid)+'</b>';
      const layout=document.querySelector('.layout');
      if(layout?.parentNode)layout.parentNode.insertBefore(bar,layout);
    }
  }

  loadExam();
  const observer=new MutationObserver(install);
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
