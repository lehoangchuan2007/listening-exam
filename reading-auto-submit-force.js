/* English Studio - Reading timeout force submit */
(function(){
  if(!/reading\.html$/.test(location.pathname)) return;
  const wait=()=>{
    if(typeof window.submit!=='function' || typeof window.collectAnswers!=='function') return setTimeout(wait,50);
    const manualSubmit=window.submit;
    const originalCollect=window.collectAnswers;
    window.submit=async function(auto){
      if(!auto) return manualSubmit(false);
      const previous=window.collectAnswers;
      window.collectAnswers=function(){return originalCollect().map(v=>(v===null||v==='')?-1:v)};
      try{return await manualSubmit(true)}finally{window.collectAnswers=previous;}
    };
    window.__englishStudioSubmitReading=window.submit;
    window.__readingForceAutoSubmitReady=true;
  };
  wait();
})();
