/* English Studio - Listening partial submission */
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  function isListening(){
    const t=String(window.exam?.exam_type||window.exam?.type||'').toLowerCase();
    if(t==='listening') return true;
    const title=String(document.getElementById('pageTitle')?.textContent||'').toLowerCase();
    return title.includes('listening') || !!document.querySelector('audio');
  }
  function markUnanswered(){
    if(!isListening()) return;
    const added=[];
    const groups=new Map();
    document.querySelectorAll('input[type="radio"][name]').forEach(input=>{
      if(!groups.has(input.name)) groups.set(input.name,[]);
      groups.get(input.name).push(input);
    });
    groups.forEach((inputs,name)=>{
      if(inputs.some(i=>i.checked)) return;
      const hidden=document.createElement('input');
      hidden.type='radio';hidden.name=name;hidden.value='-1';hidden.checked=true;
      hidden.dataset.esUnanswered='1';hidden.style.display='none';
      (inputs[0].closest('.q,.question,.exam-question,form,section')||document.body).appendChild(hidden);
      added.push(hidden);
    });
    document.querySelectorAll('textarea[name],input[type="text"][name]').forEach(el=>{
      if(String(el.value||'').trim()!=='') return;
      if(el.dataset.esUnanswered==='1') return;
      el.dataset.esOriginalValue='';
      el.value='-1';
      el.dataset.esUnanswered='1';
      added.push(el);
    });
    return added;
  }
  function cleanup(){document.querySelectorAll('[data-es-unanswered="1"]').forEach(el=>{if(el.tagName==='INPUT')el.remove();else{el.value='';delete el.dataset.esUnanswered;delete el.dataset.esOriginalValue;}})}
  document.addEventListener('click',function(e){
    const btn=e.target.closest('#submit,button[type="submit"],button');
    if(!btn||!isListening()) return;
    const text=String(btn.textContent||'').toLowerCase();
    if(!text.includes('nộp')&&!text.includes('submit')) return;
    markUnanswered();
    setTimeout(cleanup,1200);
  },true);
  const timer=setInterval(()=>{if(isListening()&&document.querySelector('#submit')){clearInterval(timer);}},500);
})();
