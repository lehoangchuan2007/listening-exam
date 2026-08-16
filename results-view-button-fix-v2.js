(function(){
  if(!/results\.html$/.test(location.pathname)) return;
  const LABEL='👁 Xem bài làm';
  function enhance(){
    const tbody=document.getElementById('tbody');
    if(!tbody) return;
    [...tbody.querySelectorAll('tr')].forEach((tr,rowIndex)=>{
      if(!tr.querySelector('td')) return;
      const cells=tr.querySelectorAll('td');
      const actionCell=cells[cells.length-1];
      if(!actionCell) return;
      const buttons=[...actionCell.querySelectorAll('button')];
      const existing=buttons.find(b=>/xem bài/i.test((b.textContent||'')));
      if(existing){
        existing.textContent=LABEL;
        existing.classList.add('results-view-answer-btn');
        return;
      }
      if(actionCell.querySelector('.results-view-answer-btn')) return;
      const view=document.createElement('button');
      view.type='button';
      view.className='btn results-view-answer-btn';
      view.textContent=LABEL;
      view.style.marginRight='6px';
      view.addEventListener('click',function(){
        const fn=window.viewQuiz||window.viewWriting;
        if(typeof fn==='function') fn(rowIndex);
        else alert('Không tìm thấy chức năng xem bài làm. Vui lòng tải lại trang.');
      });
      actionCell.insertBefore(view,actionCell.firstChild);
    });
  }
  const style=document.createElement('style');
  style.textContent='.results-view-answer-btn{display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap}.results-view-answer-btn + button{margin-left:4px}';
  document.head.appendChild(style);
  const observer=new MutationObserver(enhance);
  observer.observe(document.body,{childList:true,subtree:true});
  enhance();
  setTimeout(enhance,100);
  setTimeout(enhance,500);
  setTimeout(enhance,1200);
})();
