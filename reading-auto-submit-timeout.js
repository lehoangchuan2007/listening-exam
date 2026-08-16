// English Studio - Reading timeout auto-submit bridge.
// Reading already owns its countdown; this bridge only makes unanswered items submit as blank (-1).
(function(){
  if(!/\/reading\.html$/.test(location.pathname)) return;
  if(window.__ENGLISH_STUDIO_READING_TIMEOUT_FIX__) return;
  window.__ENGLISH_STUDIO_READING_TIMEOUT_FIX__=true;
  let wrapped=false;
  const wrap=()=>{
    const fn=window.__englishStudioSubmitReading;
    if(typeof fn!=='function'||fn.__timeoutWrapped)return;
    const wrappedSubmit=async function(auto){
      if(!auto)return fn(false);
      document.querySelectorAll('#questions input[type="radio"]').forEach(i=>{i.checked=false});
      document.querySelectorAll('#questions textarea').forEach(t=>{if(!t.value)t.value=''});
      const original=document.querySelectorAll;
      // The Reading submitter treats empty answers as invalid. Temporarily replace its
      // answer collector inputs with an explicit -1 choice so the RPC records the attempt
      // and scores unanswered questions as incorrect.
      const radios=[];
      document.querySelectorAll('#questions .q').forEach(q=>{
        if(q.querySelector('input[type="radio"]:checked'))return;
        const fake=document.createElement('input');fake.type='radio';fake.name='__timeout__'+Math.random();fake.value='-1';fake.checked=true;fake.style.display='none';q.appendChild(fake);radios.push(fake);
      });
      try{return await fn(true)}finally{radios.forEach(x=>x.remove())}
    };
    wrappedSubmit.__timeoutWrapped=true;
    window.__englishStudioSubmitReading=wrappedSubmit;
    wrapped=true;
  };
  const timer=setInterval(()=>{wrap();if(wrapped)clearInterval(timer)},100);
})();
