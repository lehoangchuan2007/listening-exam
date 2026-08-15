/* English Studio - Writing library + dedicated route */
(function(){
  if(!/student\.html$/.test(location.pathname))return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const UNLIMITED=2147483647;
  let loaded=false;

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

  async function addPublishedWritingExams(){
    if(loaded)return;
    const client=window.STUDENT_EXAM_CLIENT;
    const list=document.getElementById('list');
    if(!client||!list)return;
    const {data,error}=await client.rpc('get_published_writing_exams_for_student');
    if(error||!Array.isArray(data)||!data.length)return;
    const rows=data.filter(e=>e&&e.id);
    if(!rows.length)return;

    // Avoid duplicates if the normal library RPC is later updated to include Writing.
    rows.forEach(e=>{
      if(list.querySelector(`[data-writing-exam-id="${CSS.escape(String(e.id))}"]`))return;
      const card=document.createElement('div');
      card.className='exam';
      card.setAttribute('data-writing-exam-id',String(e.id));
      const maxText=Number(e.max_attempts)>=UNLIMITED?'♾️ Không giới hạn':`${Number(e.max_attempts||1)} lần`;
      card.innerHTML=`<span class="badge writing">✍️ Writing</span><h2>${esc(e.title)}</h2><p class="muted">${esc(e.description||'Chưa có mô tả')}</p><p>📝 Writing &nbsp;•&nbsp; ⏱️ ${esc(e.duration_minutes||60)} phút &nbsp;•&nbsp; 🔢 ${esc(maxText)}</p><button class="btn" onclick="loadExam('${esc(e.id)}')">🚀 Làm bài</button>`;
      list.appendChild(card);
    });
    loaded=true;
  }

  function boot(){
    addPublishedWritingExams();
    // The main student page renders #list asynchronously, so retry briefly
    // until that container exists and the Auth session is ready.
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      addPublishedWritingExams();
      if(loaded||tries>40)clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
