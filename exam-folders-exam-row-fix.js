// English Studio - Explorer unified exam-row DOM normalization
// One structure for Listening / Reading / Writing:
// checkbox -> icon -> title -> type -> question count -> menu
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_EXAM_ROW_FIX__)return;
  window.__ENGLISH_STUDIO_EXAM_ROW_FIX__=true;
  const TYPE={listening:'Listening',reading:'Reading',writing:'Writing'};
  const ICON={listening:'🎧',reading:'📖',writing:'✍️'};
  const norm=s=>String(s??'').trim().toLowerCase();
  function getType(row){
    const explicit=row.dataset.examType||row.dataset.type;
    if(explicit)return norm(explicit);
    const text=row.textContent||'';
    if(/\bwriting\b|viết/i.test(text))return 'writing';
    if(/\breading\b|đọc/i.test(text))return 'reading';
    return 'listening';
  }
  function getQuestionCount(row){
    const existing=row.querySelector('.efx5questions,[data-question-count]');
    if(existing)return existing.textContent.trim();
    const meta=row.querySelector('.efx5meta');
    const raw=meta?.textContent||'';
    const match=raw.match(/(\d+)\s*(?:câu|questions?)/i);
    return match?`${match[1]} câu`:'0 câu';
  }
  function normalize(){
    document.querySelectorAll('.efwin-main .efx5item[data-exam]').forEach(row=>{
      row.classList.add('efx5exam');
      const type=getType(row);
      const icon=row.querySelector('.efx5icon');
      const name=row.querySelector('.efx5name');
      const more=row.querySelector('.efx5more');
      let meta=row.querySelector('.efx5meta');
      let typeEl=row.querySelector('.efx5type');
      let questions=row.querySelector('.efx5questions');

      if(icon){icon.textContent=ICON[type]||'📄';icon.style.cssText='grid-column:2;grid-row:1;padding:0!important;margin:0!important;width:30px;min-width:30px;text-align:center;line-height:1;';}
      if(name){name.style.cssText='grid-column:3;grid-row:1;min-width:0;margin:0!important;padding:0!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';}

      if(!typeEl){
        typeEl=document.createElement('div');
        typeEl.className='efx5type';
        if(meta)meta.replaceWith(typeEl); else row.appendChild(typeEl);
      }
      typeEl.textContent=TYPE[type]||type;
      typeEl.style.cssText='grid-column:4;grid-row:1;min-width:0;margin:0;padding:0;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

      if(!questions){
        questions=document.createElement('div');
        questions.className='efx5questions';
        const count=getQuestionCount(row);
        questions.textContent=count;
        row.appendChild(questions);
      }
      questions.style.cssText='grid-column:5;grid-row:1;min-width:0;margin:0;padding:0;font-size:12px;color:#64748b;white-space:nowrap;';

      const check=row.querySelector('.efx5check');
      if(check)check.style.cssText='grid-column:1;grid-row:1;width:15px;height:15px;margin:0;justify-self:center;';
      if(more)more.style.cssText='grid-column:6;grid-row:1;position:static;justify-self:end;margin:0;';
      row.style.gridTemplateColumns='22px 30px minmax(180px,1fr) 92px 72px 32px';
      row.style.alignItems='center';
      row.style.columnGap='8px';
    });
  }
  function start(){
    normalize();
    const app=document.getElementById('app');
    if(!app)return;
    const observer=new MutationObserver(normalize);
    observer.observe(app,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),4000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
