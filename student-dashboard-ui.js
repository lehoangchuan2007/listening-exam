/* English Studio - student dashboard UI polish
   Scoped to the student library only. No exam logic or data flow changes. */
(function(){
  if(!/student\.html$/.test(location.pathname))return;
  const style=document.createElement('style');
  style.id='student-dashboard-ui-style';
  style.textContent=`
    #app > .card:first-child{padding:22px 24px;margin-top:4px;border-radius:20px;box-shadow:0 8px 28px rgba(15,23,42,.06)}
    #app > .card:first-child h2{margin:0 0 5px;font-size:22px;letter-spacing:-.2px}
    #app > .card:first-child .muted{margin:0}
    .library-tools{margin-top:18px!important;align-items:center}
    .library-tools .search{height:44px;background:#f8fafc;border-color:#dbe3ef;outline:none;transition:.15s}
    .library-tools .search:focus{background:#fff;border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.15)}
    .filter-row{padding:4px;background:#f8fafc;border:1px solid #e7edf5;border-radius:13px;width:max-content;max-width:100%;}
    .filter-btn{border-color:transparent;background:transparent;min-height:38px;padding:8px 13px}
    .filter-btn:hover{background:#fff;border-color:#dbeafe}
    .filter-btn.active{background:#fff;border-color:#bfdbfe;box-shadow:0 2px 8px rgba(37,99,235,.08)}
    .library-meta{margin-top:13px!important;padding-top:11px;border-top:1px solid #eef2f7}
    #list.grid{gap:12px;margin-top:14px}
    #list.grid > .exam{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) auto;grid-template-rows:auto auto auto;align-items:center;column-gap:13px;row-gap:2px;min-height:88px;padding:14px 15px;border-radius:15px;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,.035);transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}
    #list.grid > .exam:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(15,23,42,.07);border-color:#bfdbfe}
    #list.grid > .exam .badge{grid-column:1;grid-row:1 / span 3;width:40px;height:40px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:0;flex:none}
    #list.grid > .exam .badge.listening:before{content:'🎧';font-size:20px}
    #list.grid > .exam .badge.reading:before{content:'📖';font-size:20px}
    #list.grid > .exam .badge.writing:before{content:'✍️';font-size:20px}
    #list.grid > .exam .badge:not(.listening):not(.reading):not(.writing):before{content:'📝';font-size:20px}
    #list.grid > .exam > h2{grid-column:2;grid-row:1;margin:0;font-size:16px;line-height:1.35;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-self:end}
    #list.grid > .exam > p{grid-column:2;margin:0;color:#64748b;font-size:12.5px;line-height:1.45;min-width:0;overflow-wrap:anywhere}
    #list.grid > .exam > p:first-of-type{grid-row:2}
    #list.grid > .exam > p:nth-of-type(2){grid-row:3;color:#475569}
    #list.grid > .exam > .btn{grid-column:3;grid-row:1 / span 3;white-space:nowrap;padding:9px 12px;font-size:13px;border-radius:9px;align-self:center}
    @media(max-width:700px){
      #app > .card:first-child{padding:18px 15px}
      .filter-row{width:100%;overflow-x:auto;flex-wrap:nowrap}
      .filter-btn{white-space:nowrap}
      #list.grid{grid-template-columns:1fr}
      #list.grid > .exam{grid-template-columns:38px minmax(0,1fr);grid-template-rows:auto auto auto auto;column-gap:11px;row-gap:3px}
      #list.grid > .exam .badge{grid-column:1;grid-row:1 / span 3}
      #list.grid > .exam > h2{grid-column:2;grid-row:1;white-space:normal;overflow:visible}
      #list.grid > .exam > p:first-of-type{grid-column:2;grid-row:2}
      #list.grid > .exam > p:nth-of-type(2){grid-column:2;grid-row:3}
      #list.grid > .exam > .btn{grid-column:2;grid-row:4;justify-self:start;margin-top:5px}
    }
  `;
  document.head.appendChild(style);
  function sync(){
    const list=document.getElementById('list');
    if(!list)return;
    list.querySelectorAll('.exam').forEach(card=>{
      const badge=card.querySelector('.badge');
      if(!badge)return;
      const text=(badge.textContent||'').toLowerCase();
      if(text.includes('reading'))badge.classList.add('reading');
      else if(text.includes('writing'))badge.classList.add('writing');
      else if(text.includes('listening'))badge.classList.add('listening');
    });
    document.querySelectorAll('.filter-btn').forEach(btn=>btn.classList.toggle('active',btn.getAttribute('data-type')===window.libraryType));
  }
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
