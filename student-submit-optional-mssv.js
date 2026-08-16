// English Studio - robust student submission bridge v5.
// Adds automatic timeout submission while preserving normal manual-submit behavior.
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  if(window.__ENGLISH_STUDIO_STUDENT_SUBMIT_MOBILE_FIX__) return;
  window.__ENGLISH_STUDIO_STUDENT_SUBMIT_MOBILE_FIX__=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let currentExamId='', autoSubmitting=false;

  function getQuestions(){return Array.from(document.querySelectorAll('#questions .q'));}
  function collect(){return getQuestions().map(q=>{const c=q.querySelector('input[type="radio"]:checked');if(c)return Number(c.value);const t=q.querySelector('textarea');return t?t.value||'':null;});}
  function examId(){return currentExamId||window.__ENGLISH_STUDIO_EXAM_ID||decodeURIComponent((location.hash.match(/^#exam=([^&]+)/)||[])[1]||'');}
  function setBusy(on){document.querySelectorAll('button').forEach(b=>{if(/Nộp bài|Đang nộp bài/.test(b.textContent||'')){b.disabled=on;b.textContent=on?'⏳ Đang nộp bài...':'📤 Nộp bài';}})}
  async function getSessionRetry(client){for(let i=0;i<8;i++){const r=await client.auth.getSession();if(r.data?.session)return r.data.session;if(i===3){try{const rr=await client.auth.refreshSession();if(rr.data?.session)return rr.data.session}catch(_){} }await new Promise(r=>setTimeout(r,250))}return null;}
  function showResult(data,answers){
    const qs=getQuestions();
    const key=Array.isArray(data?.answer_key)?data.answer_key:(typeof data?.answer_key==='string'?(()=>{try{return JSON.parse(data.answer_key)}catch{return[]}})():[]);
    const detail=qs.map((q,i)=>{const given=answers[i],k=key[i],ok=k!==undefined&&String(given)===String(k);const opts=Array.from(q.querySelectorAll('input[type="radio"]')).map(x=>x.closest('label')?.textContent?.trim()||'');return `<div class="review ${ok?'ok':'bad'}"><b>Câu ${i+1}</b><div class="answer ${ok?'correct':'wrong'}">${ok?'✅ Đúng':'❌ Sai'}</div><div class="answer">Bạn chọn: <b>${esc(given===null||given===''?'Chưa trả lời':(opts[given]||String(given)))}</b></div><div class="answer">Đáp án đúng: <b>${esc(k===undefined?'—':(opts[k]||String(k)))}</b></div></div>`}).join('');
    const app=document.getElementById('app');
    app.innerHTML=`<div class="card"><div class="result">${esc(data?.score??0)}/10</div><h1 style="text-align:center">🎉 Đã nộp bài thành công!</h1><p style="text-align:center">Đúng: <b>${esc(data?.correct_count??0)}/${esc(data?.total_questions??answers.length)}</b></p><div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:18px"><button class="btn" id="student-review-btn" type="button">📋 Xem lại bài làm</button><button class="btn gray" type="button" onclick="goLibrary()">📚 Về thư viện đề</button></div><div id="student-review-detail" style="display:none;margin-top:18px">${detail}</div></div>`;
    const b=document.getElementById('student-review-btn'),d=document.getElementById('student-review-detail');b.onclick=()=>{const open=d.style.display!=='none';d.style.display=open?'none':'block';b.textContent=open?'📋 Xem lại bài làm':'🔼 Ẩn phần xem lại';};
  }

  const originalLoadExam=window.loadExam;
  if(typeof originalLoadExam==='function')window.loadExam=async function(id){currentExamId=id;window.__ENGLISH_STUDIO_EXAM_ID=id;return originalLoadExam.apply(this,arguments)};

  window.submitExam=async function(auto=false){
    if(auto){if(autoSubmitting)return;autoSubmitting=true}
    const answers=collect();
    if(!auto&&answers.some(v=>v===null||v==='')){alert('Vui lòng trả lời đầy đủ các câu trước khi nộp bài.');autoSubmitting=false;return;}
    const client=window.STUDENT_AUTH_CLIENT||window.STUDENT_EXAM_CLIENT;
    if(!client){alert('❌ Chưa khởi tạo kết nối tài khoản. Vui lòng tải lại trang.');autoSubmitting=false;return;}
    const session=await getSessionRetry(client);
    if(!session){const gate=document.getElementById('studentAuthOverlay');if(gate){alert('🔐 Phiên đăng nhập chưa sẵn sàng. Vui lòng đăng nhập trong cửa sổ tài khoản rồi nộp lại bài.');autoSubmitting=false;return}alert('🔐 Vui lòng đăng nhập tài khoản sinh viên trước khi nộp bài.');autoSubmitting=false;return;}
    const meta=session.user?.user_metadata||{};const name=String(meta.full_name||'').trim();const sid=String(meta.student_id||'').trim();
    if(!name){alert('❌ Tài khoản sinh viên chưa có Họ tên. Vào ☰ → Tài khoản → Cập nhật tài khoản để bổ sung.');autoSubmitting=false;return}
    const id=examId();if(!id){alert('❌ Không xác định được mã đề. Vui lòng tải lại đề.');autoSubmitting=false;return}
    setBusy(true);
    try{
      const r=await client.rpc('submit_exam',{p_exam_id:id,p_student_name:name,p_student_id:sid,p_answers:answers});
      if(r.error){alert(typeof window.friendly==='function'?window.friendly(r.error.message):('❌ '+r.error.message));return;}
      if(window.timer)clearInterval(window.timer);
      showResult(r.data||{},answers);
    }catch(e){alert('❌ Không thể nộp bài: '+(e?.message||e))}
    finally{setBusy(false);autoSubmitting=false}
  };

  function parseTimerText(text){const nums=String(text||'').match(/\d+/g);if(!nums||!nums.length)return null;if(nums.length>=3)return Number(nums[0])*3600+Number(nums[1])*60+Number(nums[2]);return Number(nums[0])*60+Number(nums[1]||0)}
  function watchTimeout(){let last=null;setInterval(()=>{if(autoSubmitting||!document.getElementById('questions'))return;const el=document.querySelector('.timer');if(!el)return;const value=parseTimerText(el.textContent);if(value===null)return;if(last!==null&&value>last){last=null;return}last=value;if(value<=0){window.submitExam(true)}} ,250)}
  watchTimeout();
})();