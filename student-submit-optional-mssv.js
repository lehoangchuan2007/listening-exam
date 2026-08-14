// English Studio - Listening submission fix v2
// MSSV is optional. Full name remains required.
(function(){
  if(!/student\.html$/.test(location.pathname)) return;

  let currentExamId=null;
  let installed=false;

  function install(){
    if(installed)return true;
    if(!window.STUDENT_EXAM_CLIENT || typeof window.loadExam!=='function')return false;

    // Keep the exam id accessible without depending on lexical variables inside student.html.
    const originalLoadExam=window.loadExam;
    window.loadExam=async function(id){
      currentExamId=id;
      window.__ENGLISH_STUDIO_EXAM_ID=id;
      return originalLoadExam.apply(this,arguments);
    };

    // If the page was opened directly with #exam=..., capture it immediately.
    const hash=location.hash.match(/^#exam=([^&]+)/);
    if(hash)currentExamId=decodeURIComponent(hash[1]);

    window.submitExam=async function(){
      const qs=Array.from(document.querySelectorAll('#questions .q'));
      const answers=qs.map(q=>{
        const checked=q.querySelector('input[type="radio"]:checked');
        if(checked)return Number(checked.value);
        const ta=q.querySelector('textarea');
        if(ta)return ta.value||'';
        return null;
      });

      if(answers.some(v=>v===null||v==='')){
        alert('Vui lòng trả lời đầy đủ các câu trước khi nộp bài.');
        return;
      }

      const sb=window.STUDENT_EXAM_CLIENT;
      const {data:sessionData,error:sessionError}=await sb.auth.getSession();
      if(sessionError){alert('❌ Không thể kiểm tra phiên đăng nhập: '+sessionError.message);return;}
      const session=sessionData?.session;
      if(!session){
        alert('🔐 Vui lòng đăng nhập tài khoản sinh viên trước khi nộp bài.');
        return;
      }

      const meta=session.user?.user_metadata||{};
      const studentName=String(meta.full_name||'').trim();
      const studentId=String(meta.student_id||'').trim();
      if(!studentName){
        alert('❌ Tài khoản sinh viên chưa có Họ tên. Vui lòng vào ☰ → Tài khoản → Cập nhật tài khoản và nhập Họ tên trước khi nộp bài.');
        return;
      }

      const examId=currentExamId||window.__ENGLISH_STUDIO_EXAM_ID;
      if(!examId){
        alert('❌ Không xác định được mã đề thi. Vui lòng tải lại đề rồi thử nộp lại.');
        return;
      }

      const buttons=document.querySelectorAll('button');
      buttons.forEach(b=>{if(/Nộp bài/i.test(b.textContent)){b.disabled=true;b.textContent='⏳ Đang nộp bài...';}});

      const result=await sb.rpc('submit_exam',{
        p_exam_id:examId,
        p_student_name:studentName,
        p_student_id:studentId,
        p_answers:answers
      });

      if(result.error){
        buttons.forEach(b=>{if(/Đang nộp bài/i.test(b.textContent)){b.disabled=false;b.textContent='📤 Nộp bài';}});
        alert(typeof window.friendly==='function'?window.friendly(result.error.message):('❌ '+result.error.message));
        return;
      }

      const timerEl=window.timer;
      if(timerEl)clearInterval(timerEl);

      // Render the same successful-submission state without relying on lexical functions.
      const app=document.getElementById('app');
      const data=result.data||{};
      app.innerHTML=`<div class="card"><div class="result">🎉</div><h1 style="text-align:center">Đã nộp bài thành công!</h1><p style="text-align:center">Đúng: <b>${escapeHtml(data.correct_count??0)}/${escapeHtml(data.total_questions??answers.length)}</b></p><p style="text-align:center">Điểm: <b>${escapeHtml(data.score??0)}</b></p><div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap"><button class="btn" onclick="goLibrary()">📚 Về thư viện đề</button></div></div>`;
    };

    // Make the submit button reliably clickable even when an old cached UI layer is present.
    document.addEventListener('click',function(e){
      const btn=e.target.closest('button');
      if(!btn||!/^📤\s*Nộp bài/.test(btn.textContent.trim()))return;
      if(typeof window.submitExam==='function'){
        e.preventDefault();
        e.stopImmediatePropagation();
        window.submitExam();
      }
    },true);

    installed=true;
    return true;
  }

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  if(install())return;
  const wait=setInterval(()=>{if(install())clearInterval(wait);},100);
  setTimeout(()=>clearInterval(wait),15000);
})();
