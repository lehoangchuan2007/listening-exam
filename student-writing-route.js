/* English Studio - route Writing exams to the dedicated Writing page */
(function(){
  if(!/student\.html$/.test(location.pathname))return;
  function install(){
    if(typeof window.loadExam!=='function'||window.__writingRouteInstalled)return;
    window.__writingRouteInstalled=true;
    const original=window.loadExam;
    window.loadExam=async function(id){
      try{
        const list=Array.isArray(window.exams)?window.exams:[];
        const found=list.find(x=>String(x.id)===String(id));
        if(found&&String(found.exam_type||'').toLowerCase()==='writing'){
          location.href='./writing.html?exam='+encodeURIComponent(id);
          return;
        }
      }catch(e){}
      return original(id);
    };
  }
  let tries=0;const t=setInterval(()=>{install();if(window.__writingRouteInstalled||++tries>40)clearInterval(t)},100);
})();
