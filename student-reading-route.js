// English Studio - route Reading exams from the student library to reading.html.
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  if(window.__englishStudioReadingRouteInstalledV3) return;
  window.__englishStudioReadingRouteInstalledV3=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient) return;
  const client=window.STUDENT_AUTH_CLIENT||window.STUDENT_EXAM_CLIENT||window.supabase.createClient(cfg.url,cfg.anonKey);
  let bypassNextClick=false;
  let currentExamId=sessionStorage.getItem('englishStudioReadingExamId')||'';
  function idFromLoadButton(button){const onclick=button?.getAttribute('onclick')||'';const m=onclick.match(/loadExam\(\s*['\"]([^'\"]+)['\"]\s*\)/);return m?m[1]:''}
  function isStartButton(button){return /Bắt đầu làm bài/i.test((button?.textContent||'').trim())}
  document.addEventListener('click',async function(e){
    const button=e.target?.closest?.('button');if(!button)return;
    const selectedId=idFromLoadButton(button);if(selectedId){currentExamId=selectedId;sessionStorage.setItem('englishStudioReadingExamId',selectedId);return}
    if(!isStartButton(button)||!currentExamId||bypassNextClick)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{
      const result=await client.rpc('get_exam_for_student',{p_exam_id:currentExamId});if(result.error)throw result.error;let data=result.data;if(Array.isArray(data))data=data[0];if(data?.data&&Array.isArray(data.data))data=data.data[0];if(typeof data==='string'){try{data=JSON.parse(data)}catch{}}
      if(String(data?.exam_type||'').toLowerCase()==='reading'){
        const name=(document.getElementById('name')?.value||'').trim(),sid=(document.getElementById('sid')?.value||'').trim();if(!name||!sid){alert('Vui lòng nhập Họ tên và MSSV.');return}
        const now=Date.now(),startAt=data.start_at?new Date(data.start_at).getTime():null,endAt=data.end_at?new Date(data.end_at).getTime():null;if(startAt&&now<startAt){alert('⏰ Chưa đến thời gian mở đề.');return}if(endAt&&now>endAt){alert('⏰ Thời gian thi đã kết thúc.');return}
        const attempts=await client.rpc('check_exam_attempts',{p_exam_id:currentExamId,p_student_id:sid});if(attempts.error){alert('❌ '+attempts.error.message);return}
        if(Number(data.max_attempts)<2147483647&&Number(attempts.data)>=Number(data.max_attempts||1)){alert('🚫 Bạn đã hết số lần làm bài.');return}
        sessionStorage.removeItem('englishStudioReadingExamId');location.href='./reading.html?exam='+encodeURIComponent(currentExamId)+'&name='+encodeURIComponent(name)+'&sid='+encodeURIComponent(sid);return;
      }
    }catch(err){}
    bypassNextClick=true;try{button.click()}finally{setTimeout(()=>{bypassNextClick=false},0)}
  },true);
})();
