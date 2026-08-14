// English Studio - Listening submission fix
// MSSV is optional. Full name remains required.
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  function install(){
    if(typeof window.collectAnswers!=='function' || typeof window.showResult!=='function' || !window.STUDENT_EXAM_CLIENT) return false;
    window.submitExam = async function(){
      const answers=window.collectAnswers();
      if(answers.some(v=>v===null||v==='')){alert('Vui lòng trả lời đầy đủ các câu trước khi nộp bài.');return;}
      const sb=window.STUDENT_EXAM_CLIENT;
      const {data:sessionData}=await sb.auth.getSession();
      const session=sessionData?.session;
      if(!session){alert('🔐 Vui lòng đăng nhập tài khoản sinh viên trước khi truy cập bài kiểm tra.');return;}
      const meta=session.user?.user_metadata||{};
      const studentName=String(meta.full_name||'').trim();
      const studentId=String(meta.student_id||'').trim();
      if(!studentName){alert('❌ Tài khoản sinh viên chưa có Họ tên. Vui lòng vào ☰ → Tài khoản → Cập nhật tài khoản và nhập Họ tên trước khi nộp bài.');return;}
      const result=await sb.rpc('submit_exam',{p_exam_id:window.exam.id,p_student_name:studentName,p_student_id:studentId,p_answers:answers});
      if(result.error){alert(typeof window.friendly==='function'?window.friendly(result.error.message):('❌ '+result.error.message));return;}
      if(window.timer)clearInterval(window.timer);
      window.showResult(result.data,answers);
    };
    return true;
  }
  if(install()) return;
  const timer=setInterval(()=>{if(install())clearInterval(timer);},100);
  setTimeout(()=>clearInterval(timer),10000);
})();
