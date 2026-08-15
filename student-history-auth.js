/* English Studio - unified student history */
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient) return;
  const client=window.STUDENT_AUTH_CLIENT||window.STUDENT_EXAM_CLIENT||window.supabase.createClient(cfg.url,cfg.anonKey);
  window.STUDENT_HISTORY_CLIENT=client;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const arr=v=>{if(Array.isArray(v))return v;if(typeof v==='string'){try{return arr(JSON.parse(v))}catch{return []}}return v&&typeof v==='object'?Object.values(v):[]};
  const obj=v=>{if(typeof v==='string'){try{return JSON.parse(v)}catch{return {}}}return v&&typeof v==='object'?v:{}};
  const parse=v=>{if(typeof v!=='string')return v??[];try{return JSON.parse(v)}catch{return[]}};
  const backButton=()=>'<button class="btn gray" onclick="goLibrary()" style="margin-bottom:16px">← Quay về thư viện đề</button>';
  const rubricFor=r=>{
    const rubric=Array.isArray(r.writing_rubric)?r.writing_rubric:parse(r.writing_rubric);
    const scores=parse(r.rubric_scores||'{}');
    return rubric.map(x=>{
      const name=String(x?.name||x?.title||'').trim(),key=name.toLowerCase();
      let value=scores&&typeof scores==='object'&&!Array.isArray(scores)?scores[name]:undefined;
      if(value===undefined){
        if(key.includes('task response'))value=r.task_response;
        else if(key.includes('coherence')||key.includes('cohesion'))value=r.coherence;
        else if(key.includes('vocabulary'))value=r.vocabulary;
        else if(key.includes('grammar'))value=r.grammar;
      }
      return {name,max:Number(x?.max??x?.max_score??0),value:Number(value??0)};
    }).filter(x=>x.name);
  };
  async function showHistory(){
    const app=document.getElementById('app');if(!app)return;
    const {data:{session}}=await client.auth.getSession();
    if(!session){location.href='./student.html';return;}
    app.innerHTML='<div class="card">⏳ Đang tải toàn bộ lịch sử làm bài...</div>';
    const r=await client.rpc('get_student_history_all');
    if(r.error){app.innerHTML=backButton()+'<div class="card notice danger">❌ Không tải được lịch sử: '+esc(r.error.message)+'</div>';return;}
    let all=r.data;
    if(typeof all==='string'){try{all=JSON.parse(all)}catch{all=[]}}
    if(!Array.isArray(all))all=[];
    const quizRows=all.filter(x=>x.kind==='quiz');
    const writingRows=all.filter(x=>x.kind==='writing');
    window.__studentHistoryRows=quizRows;
    window.__studentWritingRows=writingRows;
    if(!all.length){app.innerHTML=backButton()+'<div class="card notice">📭 Tài khoản này chưa có bài làm nào.</div>';return;}
    let html=backButton();
    if(quizRows.length){
      html+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><h2>📚 Các bài trắc nghiệm đã làm</h2><span class="muted">'+quizRows.length+' lượt làm</span></div>';
      html+=quizRows.map((r,i)=>`<div class="history-item"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><span class="badge ${String(r.exam_type||'').toLowerCase()==='reading'?'reading':'listening'}">${String(r.exam_type||'').toLowerCase()==='reading'?'📖 Reading':'🎧 Listening'}</span><h3>${esc(r.exam_title||'Đề thi')}</h3><div class="muted">🕐 ${esc(r.created_at?new Date(r.created_at).toLocaleString('vi-VN'):'Không rõ thời gian')}</div></div><div class="score">${esc(r.score??'—')}</div></div><p>✅ ${esc(r.correct_count??0)}/${esc(r.total_questions??0)} câu đúng</p><button class="btn gray" onclick="window.__viewStudentAttempt(${i})">📋 Xem bài làm</button></div>`).join('');
      html+='</div>';
    }
    if(writingRows.length){
      html+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><h2>✍️ Các bài Writing đã làm</h2><span class="muted">'+writingRows.length+' lượt làm</span></div>';
      html+=writingRows.map((r,i)=>{const rub=rubricFor(r);return `<div class="history-item"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><span class="badge writing">✍️ Writing</span><h3>${esc(r.exam_title||'Bài Writing')}</h3><div class="muted">🕐 ${esc(r.created_at?new Date(r.created_at).toLocaleString('vi-VN'):'Không rõ thời gian')} • ${esc(r.word_count||0)} từ</div></div><div class="score">${esc(r.total_score??0)}/10</div></div><div class="rubric">${rub.map(x=>`<span>${esc(x.name)}: <b>${esc(x.value)}</b>/${esc(x.max)}</span>`).join('')}</div><button class="btn gray" onclick="window.__viewStudentWriting(${i})">📋 Xem bài & nhận xét</button></div>`}).join('');
      html+='</div><div id="studentWritingHistoryDetail"></div>';
    }
    html+='<div id="studentHistoryDetail"></div>';
    app.innerHTML=html;
  }
  window.__viewStudentAttempt=function(i){
    const r=(window.__studentHistoryRows||[])[i];if(!r)return;
    const qs=arr(r.questions),key=arr(r.answer_key),answers=obj(r.answers);
    const givenAt=j=>answers[String(j)]??answers[j];
    const letter=i=>i==null?'':String.fromCharCode(65+Number(i));
    let html=backButton()+`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2>📋 Bài làm: ${esc(r.exam_title||'Đề thi')}</h2><button class="btn gray" onclick="document.getElementById('studentHistoryDetail').innerHTML=''">✕ Đóng</button></div><p class="muted">Điểm: ${esc(r.score)} • Đúng: ${esc(r.correct_count)}/${esc(r.total_questions)}</p>`;
    qs.forEach((q,j)=>{const given=givenAt(j),correct=key[j],ok=given!==undefined&&given!==null&&String(given)===String(correct),opts=q?.options||[],givenText=given===undefined||given===null?'Chưa trả lời':`${letter(given)}. ${opts[Number(given)]??''}`,correctText=correct===undefined||correct===null?'Chưa có đáp án':`${letter(correct)}. ${opts[Number(correct)]??''}`;html+=`<div class="review ${ok?'ok':'bad'}"><b>Câu ${j+1}. ${esc(q?.text||q?.question||'')}</b><div class="answer ${ok?'correct':'wrong'}">${ok?'✅ Đúng':'❌ Sai'}</div><div class="answer">Bạn chọn: <b>${esc(givenText)}</b></div><div class="answer">Đáp án đúng: <b>${esc(correctText)}</b></div></div>`});
    html+='</div>';const detail=document.getElementById('studentHistoryDetail');if(detail){detail.innerHTML=html;detail.scrollIntoView({behavior:'smooth',block:'start'})}
  };
  window.__viewStudentWriting=function(i){
    const r=(window.__studentWritingRows||[])[i];if(!r)return;const rub=rubricFor(r),strengths=arr(r.strengths),improvements=arr(r.improvements),errors=arr(r.grammar_errors),phrases=arr(r.better_phrases),detail=document.getElementById('studentWritingHistoryDetail');if(!detail)return;
    detail.innerHTML=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><h2>📝 ${esc(r.exam_title||'Bài Writing')}</h2><button class="btn gray" onclick="document.getElementById('studentWritingHistoryDetail').innerHTML=''">✕ Đóng</button></div><p class="muted">${esc(r.word_count||0)} từ • ${esc(r.total_score??0)}/10 • ${new Date(r.created_at).toLocaleString('vi-VN')}</p><div class="rubric">${rub.map(x=>`<span>${esc(x.name)}: <b>${esc(x.value)}</b>/${esc(x.max)}</span>`).join('')}</div><h3>📝 Bài viết</h3><div class="history-item" style="white-space:pre-wrap;line-height:1.65">${esc(r.essay||'')}</div><h3>💬 Nhận xét tổng quan</h3><p>${esc(r.overall_comment||'')}</p>${strengths.length?`<h3>💪 Điểm mạnh</h3><ul>${strengths.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${improvements.length?`<h3>🎯 Cần cải thiện</h3><ul>${improvements.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${errors.length?`<h3>🔎 Lỗi cần chú ý</h3>${errors.map(x=>`<div class="history-item" style="background:#fff7ed"><b>${esc(x.original||'')} → ${esc(x.correction||'')}</b><br>${esc(x.explanation||'')}</div>`).join('')}`:''}${phrases.length?`<h3>✨ Gợi ý diễn đạt tốt hơn</h3>${phrases.map(x=>`<div class="history-item"><b>${esc(x.original||'')} → ${esc(x.better||'')}</b></div>`).join('')}`:''}</div>`;
    detail.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.showHistory=showHistory;window.showHistory.__accountHistory=true;
})();
