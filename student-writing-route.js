/* English Studio - route Writing exams to the dedicated Writing page */
(function(){
  if(!/student\.html$/.test(location.pathname))return;
  function examIdFromButton(btn){
    const raw=btn?.getAttribute('onclick')||'';
    const m=raw.match(/loadExam\(\s*['"]([^'"]+)['"]\s*\)/);
    return m?m[1]:null;
  }
  function isWritingButton(btn){
    const card=btn?.closest('.exam');
    return !!card?.querySelector('.badge.writing');
  }
  // Capture the click before the inline onclick on student.html can call the
  // generic multiple-choice/Listening loader.
  document.addEventListener('click',function(ev){
    const btn=ev.target.closest('.exam .btn');
    if(!btn||!isWritingButton(btn))return;
    const id=examIdFromButton(btn);
    if(!id)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    location.href='./writing.html?exam='+encodeURIComponent(id);
  },true);
})();
