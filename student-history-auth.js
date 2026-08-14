/* English Studio - account-based student history */
(function(){
  if(!/student\.html$/.test(location.pathname))return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const letter=i=>i==null?'':String.fromCharCode(65+Number(i));
  const arr=v=>{if(Array.isArray(v))return v;if(typeof v==='string'){try{return arr(JSON.parse(v))}catch{return []}}return v&&typeof v==='object'?Object.values(v):[]};
  const answerObj=v=>{if(typeof v==='string'){try{return JSON.parse(v)}catch{return {}}}return v&&typeof v==='object'?v:{}};
  const normalizeGiven=(answers,j)=>{const a=answerObj(answers);return a[String(j)]??a[j]};

  async function showHistory(){
    const app=document.getElementById('app');
    if(!app)return;
    const {data:{session}}=await client.auth.getSession();
    if(!session){location.href='./student.html';return;}
    app.innerHTML='<div class="card">⏳ Đang tải lịch sử tài khoản...</div>';
    const r=await client.rpc('get_student_history');
    if(r.error){app.innerHTML='<div class="card notice danger">❌ '+esc(r.error.message)+'</div>';return;}
    let rows=r.data;
    if(typeof rows==='string'){try{rows=JSON.parse(rows)}catch{rows=[]}}
    if(!Array.isArray(rows))rows=[];
    if(!rows.length){app.innerHTML='<div class="card notice">📭 Tài khoản này chưa có bài làm nào.</div><button class="btn gray" onclick="goLibrary()">📚 Về thư viện đề</button>';return;}
    window.__studentHistoryRows=rows;
    app.innerHTML='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><h2>📚 Các bài đã làm</h2><span class="muted">'+rows.length+' lượt làm</span></div>'+rows.map((r,i)=>`<div class="history-item"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><h3>${esc(r.exam_title||'Đề thi')}</h3><div class="muted">🕐 ${esc(r.submitted_at?new Date(r.submitted_at).toLocaleString('vi-VN'):'Không rõ thời gian')}</div></div><div class="score">${esc(r.score??'—')}</div></div><p>✅ ${esc(r.correct_count??0)}/${esc(r.total_questions??0)} câu đúng</p><button class="btn gray" onclick="window.__viewStudentAttempt(${i})">📋 Xem bài làm</button></div>`).join('')+'</div><div id="studentHistoryDetail"></div>';
  }

  window.__viewStudentAttempt=function(i){
    const r=(window.__studentHistoryRows||[])[i];
    if(!r)return;
    const qs=arr(r.questions),key=arr(r.answer_key),answers=answerObj(r.answers);
    let html=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2>📋 Bài làm: ${esc(r.exam_title||'Đề thi')}</h2><button class="btn gray" onclick="document.getElementById('studentHistoryDetail').innerHTML=''">✕ Đóng</button></div><p class="muted">Điểm: ${esc(r.score)} • Đúng: ${esc(r.correct_count)}/${esc(r.total_questions)}</p>`;
    qs.forEach((q,j)=>{
      const given=normalizeGiven(answers,j),correct=key[j],ok=given!==undefined&&given!==null&&String(given)===String(correct),opts=q?.options||[];
      const givenText=given===undefined||given===null?'Chưa trả lời':`${letter(given)}. ${opts[Number(given)]??''}`;
      const correctText=correct===undefined||correct===null?'Chưa có đáp án':`${letter(correct)}. ${opts[Number(correct)]??''}`;
      html+=`<div class="review ${ok?'ok':'bad'}"><b>Câu ${j+1}. ${esc(q?.text||q?.question||'')}</b><div class="answer ${ok?'correct':'wrong'}">${ok?'✅ Đúng':'❌ Sai'}</div><div class="answer">Bạn chọn: <b>${esc(givenText)}</b></div><div class="answer">Đáp án đúng: <b>${esc(correctText)}</b></div></div>`;
    });
    html+='</div>';
    const detail=document.getElementById('studentHistoryDetail');
    if(detail){detail.innerHTML=html;detail.scrollIntoView({behavior:'smooth',block:'start'});}
  };

  function install(){
    if(typeof window.showHistory==='function'&&window.showHistory.__accountHistory)return;
    window.showHistory=showHistory;
    window.showHistory.__accountHistory=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
