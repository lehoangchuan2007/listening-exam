// English Studio - Reading timeout auto-submit bridge v2.
(function(){
  if(!/\/reading\.html$/.test(location.pathname)) return;
  if(window.__ENGLISH_STUDIO_READING_TIMEOUT_FIX_V2__) return;
  window.__ENGLISH_STUDIO_READING_TIMEOUT_FIX_V2__=true;
  let wrapped=false;
  const wrap=()=>{
    const fn=window.__englishStudioSubmitReading;
    if(typeof fn!=='function'||fn.__timeoutWrappedV2)return;
    const wrappedSubmit=async function(auto){
      if(!auto)return fn(false);
      const added=[],changed=[];
      const questions=document.querySelectorAll('#questions .q');
      questions.forEach((q,i)=>{
        const selected=q.querySelector(`input[name="q${i}"]:checked`);
        const text=q.querySelector(`textarea[name="q${i}"]`);
        if(selected)return;
        if(text){
          if(!text.value){changed.push([text,text.value]);text.value=' ';}
          return;
        }
        if(q.querySelector('input[type="radio"]')){
          const fake=document.createElement('input');
          fake.type='radio';fake.name='q'+i;fake.value='-1';fake.checked=true;fake.hidden=true;
          q.appendChild(fake);added.push(fake);
        }
      });
      try{return await fn(true)}finally{
        added.forEach(x=>x.remove());
        changed.forEach(([el,value])=>{el.value=value});
      }
    };
    wrappedSubmit.__timeoutWrappedV2=true;
    window.__englishStudioSubmitReading=wrappedSubmit;
    wrapped=true;
  };
  const timer=setInterval(()=>{wrap();if(wrapped)clearInterval(timer)},100);
})();
