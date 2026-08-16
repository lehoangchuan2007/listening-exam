/* English Studio - Reading partial submission */
(function(){
  if(!/reading\.html$/.test(location.pathname)) return;
  const wait=()=>{
    if(typeof window.collectAnswers!=='function') return setTimeout(wait,50);
    if(window.__readingPartialSubmitReady) return;
    const original=window.collectAnswers;
    window.collectAnswers=function(){
      const answers=original.apply(this,arguments);
      return (Array.isArray(answers)?answers:[]).map(v=>{
        if(v===null||v===undefined||String(v).trim()==='') return -1;
        return v;
      });
    };
    window.__readingPartialSubmitReady=true;
  };
  wait();
})();
