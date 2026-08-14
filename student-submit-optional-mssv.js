// English Studio - Listening submission fix v3 + post-submit review
// MSSV is optional. Full name remains required.
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  let currentExamId=null, installed=false;
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function questions(){const a=Array.from(document.querySelectorAll('#questions .q'));return a;}
  function optionText(q,v){const opts=q?.querySelectorAll('input[type="radio"]');const n=Number(v);if(opts&&opts[n]){const label=opts[n].closest('label');return label?label.textContent.trim():`Đáp án ${String.fromCharCode(65+n)}`;}return v===undefined||v===null||v===''?'Chưa trả lời':String(v);}
  function showReview(data,answers){
    const qs=questions(), key=Array.isArray(data?.answer_key)?data.answer_key:(typeof data?.answer_key==='string'?(()=>{try{return JSON.parse(data.answer_key)}catch{return[]}})():[]);
    const detail=qs.map((q,i)=>{const given=answers[i], k=key[i], ok=k!==undefined&&String(given)===String(k);return `<div class="review ${ok?'ok':'bad'}"><b>Câu ${i+1}</b><div class="answer ${ok?'correct':'wrong'}">${ok?'✅ Đúng':'❌ Sai'}</div><div class="answer">Bạn chọn: <b>${esc(optionText(q,given))}</b></div><div class="answer">Đáp án đúng: <b>${esc(optionText(q,k))}</b></div></div>`}).join('');
    const app=document.getElementById('app');
    app.innerHTML=`<div class="card"><div class="result">${esc(data?.score??0)}/10</div><h1 style="text-align:center">🎉 Đã nộp bài thành công!</h1><p style="text-align:center">Đúng: <b>${esc(data?.correct_count??0)}/${esc(data?.total_questions??answers.length)}</b></p><div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:18px"><button class="btn" id="listening-review-btn" type="button">📋 Xem lại bài làm</button><button class="btn gray" type="button" onclick="goLibrary()">📚 Về thư viện đề</button></div><div id="listening-review-detail" style="display:none;margin-top:18px">${detail}</div></div>`;
    const rb=document.getElementById('listening-review-btn'), d=document.getElementById('listening-review-detail');
    rb.onclick=()=>{const open=d.style.display!=='none';d.style.display=open?'none':'block';rb.textContent=open?'📋 Xem lại bài làm':'🔼 Ẩn phần xem lại';if(!open)d.scrollIntoView({behavior:'smooth',block:'start'});};
  }
  function install(){
    if(installed)return true;
    if(!window.STUDENT_EXAM_CLIENT||typeof window.loadExam!=='function')return false;
    const originalLoadExam=window.loadExam;
    window.loadExam=async function(id){currentExamId=id;window.__ENGLISH_STUDIO_EXAM_ID=id;return originalLoadExam.apply(this,arguments);};
    const hash=location.hash.match(/^#exam=([^&]+)/);if(hash)currentExamId=decodeURIComponent(hash[1]);
    window.submitExam=async function(){
      const qs=questions();
      const answers=qs.map(q=>{const c=q.querySelector('input[type="radio"]:checked');if(c)return Number(c.value);const ta=q.querySelector('textarea');return ta?ta.value||'':null;});
      if(answers.some(v=>v===null||v==='')){alert('Vui lòng trả lời đầy đủ các câu trước khi nộp bài.');return;}
      const sb=window.STUDENT_EXAM_CLIENT,{data:sd,error:se}=await sb.auth.getSession();if(se){alert('❌ Không thể kiểm tra phiên đăng nhập: '+se.message);return;}const session=sd?.session;if(!session){alert('🔐 Vui lòng đăng nhập tài khoản sinh viên trước khi nộp bài.');return;}
      const meta=session.user?.user_metadata||{},name=String(meta.full_name||'').trim(),sid=String(meta.student_id||'').trim();if(!name){alert('❌ Tài khoản sinh viên chưa có Họ tên. Vui lòng vào ☰ → Tài khoản → Cập nhật tài khoản và nhập Họ tên trước khi nộp bài.');return;}
      const examId=currentExamId||window.__ENGLISH_STUDIO_EXAM_ID;if(!examId){alert('❌ Không xác định được mã đề thi. Vui lòng tải lại đề rồi thử nộp lại.');return;}
      document.querySelectorAll('button').forEach(b=>{if(/Nộp bài/i.test(b.textContent)){b.disabled=true;b.textContent='⏳ Đang nộp bài...';}});
      try{const result=await sb.rpc('submit_exam',{p_exam_id:examId,p_student_name:name,p_student_id:sid,p_answers:answers});if(result.error){document.querySelectorAll('button').forEach(b=>{if(/Đang nộp bài/i.test(b.textContent)){b.disabled=false;b.textContent='📤 Nộp bài';}});alert(typeof window.friendly==='function'?window.friendly(result.error.message):('❌ '+result.error.message));return;}if(window.timer)clearInterval(window.timer);showReview(result.data||{},answers);}catch(e){alert('❌ Không thể nộp bài: '+(e?.message||e));}
    };
    document.addEventListener('click',function(e){const btn=e.target.closest('button');if(!btn||!/^📤\s*Nộp bài/.test(btn.textContent.trim()))return;if(typeof window.submitExam==='function'){e.preventDefault();e.stopImmediatePropagation();window.submitExam();}},true);
    installed=true;return true;
  }
  if(install())return;const wait=setInterval(()=>{if(install())clearInterval(wait);},100);setTimeout(()=>clearInterval(wait),15000);
})();
