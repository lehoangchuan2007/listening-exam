// English Studio - route Reading exams from the student library to the dedicated reading.html page.
// Listening/Writing continue using the existing student.html flow.
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  if(window.__englishStudioReadingRouteInstalled) return;
  window.__englishStudioReadingRouteInstalled=true;

  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient) return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);

  function unwrap(value){
    if(Array.isArray(value)) return value[0]||null;
    if(value&&Array.isArray(value.data)) return value.data[0]||null;
    if(typeof value==='string'){try{return unwrap(JSON.parse(value))}catch{return null}}
    return value&&typeof value==='object'?value:null;
  }

  function waitForStudentLoader(){
    if(typeof window.loadExam!=='function'){
      setTimeout(waitForStudentLoader,50);
      return;
    }
    const original=window.loadExam;
    if(original.__englishStudioReadingWrapped) return;

    async function routedLoadExam(id){
      try{
        // Use the same student RPC first. This preserves the existing server-side
        // availability/permission/attempt checks before routing to Reading.
        const result=await client.rpc('get_exam_for_student',{p_exam_id:id});
        if(result.error){
          return original(id);
        }
        const data=unwrap(result.data);
        if(String(data?.exam_type||'').toLowerCase()==='reading'){
          location.href='./reading.html?exam='+encodeURIComponent(id);
          return;
        }
      }catch(_){
        // Fall back to the original student flow if the routing check fails.
      }
      return original(id);
    }
    routedLoadExam.__englishStudioReadingWrapped=true;
    window.loadExam=routedLoadExam;
  }

  waitForStudentLoader();
})();
