// English Studio - Explorer exam-row DOM compatibility fix
// Keeps the existing Explorer/controller/UI intact; only normalizes the exam row structure
// so the Windows UI columns render as: checkbox -> icon -> title -> type -> questions -> menu.
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_EXAM_ROW_FIX__)return;
  window.__ENGLISH_STUDIO_EXAM_ROW_FIX__=true;
  function normalize(){
    document.querySelectorAll('.efwin-main .efx5item[data-exam]').forEach(row=>{
      if(!row.classList.contains('efx5exam')) row.classList.add('efx5exam');
      const icon=row.querySelector('.efx5icon');
      const name=row.querySelector('.efx5name');
      const meta=row.querySelector('.efx5meta');
      const more=row.querySelector('.efx5more');
      if(icon){icon.style.paddingLeft='0';icon.style.margin='0';}
      if(meta && !meta.dataset.split){
        const text=meta.textContent.trim();
        const parts=text.split('•').map(x=>x.trim());
        const type=document.createElement('div');
        type.className='efx5type';
        type.textContent=parts[0]||'listening';
        const questions=document.createElement('div');
        questions.className='efx5questions';
        questions.textContent=parts[1]||'0 câu';
        meta.replaceWith(type,questions);
        meta.dataset.split='1';
      }
      if(name){name.style.minWidth='0';name.style.margin='0';name.style.padding='0';}
      if(more){more.style.gridRow='1';more.style.position='static';}
    });
  }
  function start(){
    normalize();
    const app=document.getElementById('app');
    if(!app)return;
    const observer=new MutationObserver(normalize);
    observer.observe(app,{childList:true,subtree:true});
    setTimeout(()=>{normalize();observer.disconnect()},2500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
