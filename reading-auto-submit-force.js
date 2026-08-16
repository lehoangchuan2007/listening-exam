/* English Studio - Reading timeout force submit */
(function(){
  if(!/reading\.html$/.test(location.pathname)) return;
  const wait=()=>{
    if(typeof window.submit!=='function' || typeof window.collectAnswers!=='function' || !window.READING_EXAM_CLIENT) return setTimeout(wait,50);
    const manualSubmit=window.submit;
    const sb=window.READING_EXAM_CLIENT;
    const getSession=window.getSession;
    const unwrap=window.unwrap;
    const esc=window.esc;
    window.submit=async function(auto){
      if(!auto) return manualSubmit(false);
      if(window.__readingForceSubmitting) return;
      window.__readingForceSubmitting=true;
      try{
        const session=await getSession();
        if(!session){window.showLoginRequired?.();return;}
        const raw=window.collectAnswers();
        const answers=raw.map(v=>(v===null||v==='')?-1:v);
        const meta=session.user?.user_metadata||{};
        const name=String(meta.full_name||'').trim();
        const sid=String(meta.student_id||'').trim();
        if(!name){window.alert('❌ Tài khoản chưa có Họ tên. Vào ☰ → Tài khoản → Cập nhật tài khoản để bổ sung.');return;}
        const btn=document.getElementById('submit');
        if(btn){btn.disabled=true;btn.textContent='⏰ Hết giờ — đang tự nộp...';}
        const r=await sb.rpc('submit_exam',{p_exam_id:window.exam.id,p_student_name:name,p_student_id:window.exam.student_id||sid,p_answers:answers});
        if(r.error){window.alert('❌ '+r.error.message);if(btn){btn.disabled=false;btn.textContent='📤 Nộp bài'};return;}
        clearInterval(window.timer);
        const d=unwrap(r.data)||{};
        window.app.innerHTML='<div class="pane" style="text-align:center;padding:30px"><div class="result">'+esc(d.score??0)+'/10</div><h2>⏰ Hết giờ — bài đã được tự động nộp!</h2><p>Đúng: <b>'+esc(d.correct_count??0)+'/'+esc(d.total_questions??answers.length)+'</b> câu</p><p class="notice">Họ tên: <b>'+esc(d.student_name||name)+'</b>'+(d.student_id?'<br>MSSV: <b>'+esc(d.student_id)+'</b>':'')+'</p><button class="btn" onclick="location.href=\'./student.html\'">📚 Về thư viện đề</button></div>';
      }finally{window.__readingForceSubmitting=false;}
    };
    window.__englishStudioSubmitReading=window.submit;
    const originalStartTimer=window.startTimer;
    window.startTimer=function(){
      let left=Math.max(0,Number(window.exam?.duration_minutes||60)*60);
      const tick=()=>{
        const el=document.getElementById('timer');if(!el)return;
        const m=Math.floor(left/60),s=left%60;el.textContent='⏱️ '+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
        if(left<=0){clearInterval(window.timer);window.submit(true);return;}left--;
      };
      tick();clearInterval(window.timer);window.timer=setInterval(tick,1000);
    };
    window.__readingForceAutoSubmitReady=true;
  };
  wait();
})();
