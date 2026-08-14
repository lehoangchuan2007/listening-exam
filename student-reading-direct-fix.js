// English Studio - Reading routing bridge.
// Student library: send Reading attempts to the same reading.html runtime used by direct Reading links.
// Reading page: keep the rich-text renderer that already works there.
(function(){
  if(window.__ENGLISH_STUDIO_READING_ROUTING_V3__) return;
  window.__ENGLISH_STUDIO_READING_ROUTING_V3__=true;
  const isStudent=/\/student\.html$/.test(location.pathname);
  const isReading=/\/reading\.html$/.test(location.pathname);
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);

  function unwrap(value){
    if(Array.isArray(value))return value[0]||null;
    if(value&&Array.isArray(value.data))return value.data[0]||null;
    if(typeof value==='string'){try{return unwrap(JSON.parse(value))}catch{return null}}
    return value&&typeof value==='object'?value:null;
  }
  function getIdFromHash(){
    const m=String(location.hash||'').match(/^#exam=([^&]+)/);
    return m?decodeURIComponent(m[1]):'';
  }
  function getIdFromButton(button){
    const onclick=button?.getAttribute('onclick')||'';
    const m=onclick.match(/loadExam\(\s*['\"]([^'\"]+)['\"]\s*\)/);
    return m?m[1]:'';
  }

  if(isStudent){
    let readingExamId=getIdFromHash();
    let readingKnown=!!readingExamId;

    // Capture the library's "Làm bài" click before the inline onclick runs.
    // This lets us remember the exact exam id without changing student.html.
    document.addEventListener('click',function(e){
      const button=e.target.closest?.('button');
      if(!button)return;
      const card=button.closest('.exam');
      if(card && /Làm bài/i.test(button.textContent||'')){
        const id=getIdFromButton(button);
        if(id){
          readingExamId=id;
          readingKnown=!!card.querySelector('.badge.reading');
        }
        return;
      }
      if(!/Bắt đầu làm bài/i.test(button.textContent||'')||!readingKnown||!readingExamId)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      startReadingThroughDedicatedPage(readingExamId).catch(err=>alert('❌ '+(err?.message||err)));
    },true);

    async function startReadingThroughDedicatedPage(id){
      const nameEl=document.getElementById('name');
      const sidEl=document.getElementById('sid');
      const name=String(nameEl?.value||'').trim();
      const sid=String(sidEl?.value||'').trim();
      if(!name||!sid){alert('Vui lòng nhập Họ tên và MSSV.');return;}

      const r=await client.rpc('get_exam_for_student',{p_exam_id:id});
      if(r.error)throw new Error(r.error.message);
      const exam=unwrap(r.data);
      if(!exam?.id)throw new Error('Không nhận được dữ liệu đề thi từ máy chủ.');
      if(String(exam.exam_type||'').toLowerCase()!=='reading'){
        // If the stored type was normalized by another RPC, verify through the Reading RPC.
        const rr=await client.rpc('get_reading_exam_for_student',{p_exam_id:id});
        if(rr.error)throw new Error(rr.error.message);
        const rd=unwrap(rr.data);
        if(!rd?.id||String(rd.exam_type||'').toLowerCase()!=='reading')throw new Error('Đề này không phải Reading.');
      }

      const now=Date.now();
      const startAt=exam.start_at?new Date(exam.start_at).getTime():null;
      const endAt=exam.end_at?new Date(exam.end_at).getTime():null;
      if(startAt&&now<startAt){alert('⏰ Chưa đến thời gian mở đề.');return;}
      if(endAt&&now>endAt){alert('⏰ Thời gian thi đã kết thúc.');return;}

      const attempts=await client.rpc('check_exam_attempts',{p_exam_id:id,p_student_id:sid});
      if(attempts.error)throw new Error(attempts.error.message);
      const unlimited=2147483647;
      if(Number(exam.max_attempts)<unlimited&&Number(attempts.data)>=Number(exam.max_attempts||1)){
        alert('🚫 Bạn đã hết số lần làm bài.');return;
      }

      const url='./reading.html?exam='+encodeURIComponent(id)+'&name='+encodeURIComponent(name)+'&sid='+encodeURIComponent(sid);
      location.href=url;
    }
  }

  // The dedicated Reading page already has its own rich-text fix in config.js.
  // This small style is only a safety net for paragraph alignment.
  if(isReading){
    const style=document.createElement('style');
    style.id='english-studio-reading-routing-style';
    style.textContent='.passage p,.passage div{margin:0 0 14px}.passage [style*="text-align:justify"]{text-align:justify!important}.passage strong,.passage b{font-weight:700}.passage em,.passage i{font-style:italic}.passage u{text-decoration:underline}';
    (document.head||document.documentElement).appendChild(style);
  }
})();
