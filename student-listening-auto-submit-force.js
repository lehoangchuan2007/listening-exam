/* English Studio - Listening timeout force submit */
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  const wait=()=>{
    if(typeof window.submitExam!=='function' || typeof window.collectAnswers!=='function') return setTimeout(wait,50);
    const manualSubmit=window.submitExam;
    const originalCollect=window.collectAnswers;
    window.submitExam=async function(auto){
      if(!auto) return manualSubmit();
      const previous=window.collectAnswers;
      window.collectAnswers=function(){return originalCollect().map(v=>(v===null||v==='')?-1:v)};
      try{return await manualSubmit()}finally{window.collectAnswers=previous;}
    };
    window.startTimer=function(minutes){
      let sec=Math.max(1,Number(minutes||30)*60);
      const el=document.getElementById('timer');
      clearInterval(window.timer);
      window.timer=setInterval(()=>{
        sec--;
        if(sec<=0){clearInterval(window.timer);window.submitExam(true);return;}
        const m=Math.floor(sec/60),s=String(sec%60).padStart(2,'0');
        if(el)el.textContent=`⏱️ ${m}:${s}`;
      },1000);
    };
    window.__listeningForceAutoSubmitReady=true;
  };
  wait();
})();
