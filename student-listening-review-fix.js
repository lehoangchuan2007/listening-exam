// Restore the original Listening history-review UI without changing the Reading flow.
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  if(window.__englishStudioListeningReviewFix) return;
  window.__englishStudioListeningReviewFix=true;

  function escLocal(value){
    return String(value??'').replace(/[&<>"']/g,m=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  window.viewHistorySubmission=function(index){
    const row=window.historyRows?.[index];
    if(!row){ alert('Không tìm thấy bài làm.'); return; }

    const e=window.historyExams?.[row.exam_id]||{};
    const questions=typeof getQuestions==='function' ? getQuestions(e) : (Array.isArray(e.questions)?e.questions:[]);
    const answers=typeof normalizeAnswers==='function' ? normalizeAnswers(row.answers||{}) : (row.answers||{});
    const key=typeof normalizeKey==='function' ? normalizeKey(e.answer_key||e.answers_key||[]) : (Array.isArray(e.answer_key)?e.answer_key:[]);

    let correctCount=0;
    questions.forEach((q,i)=>{
      const given=answers[String(i)]??answers[i];
      if(given!==undefined && key[i]!==undefined && Number(given)===Number(key[i])) correctCount++;
    });
    const total=questions.length;
    const score=total?Math.round((correctCount/total)*10*100)/100:0;

    let html=`
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <h2>📋 Bài làm: ${escLocal(e.title||'Đề thi')}</h2>
            <p class="muted">Điểm: <b>${escLocal(score)}</b> • Đúng: <b>${escLocal(correctCount)}/${escLocal(total)}</b></p>
          </div>
          <button class="btn gray" onclick="document.getElementById('historyDetail').innerHTML=''">Đóng</button>
        </div>`;

    questions.forEach((q,i)=>{
      const given=answers[String(i)]??answers[i];
      const correct=Number(key[i]);
      const ok=given!==undefined && key[i]!==undefined && Number(given)===correct;
      const options=q.options||[];
      html+=`<div class="review ${ok?'ok':'bad'}">
        <b>Câu ${i+1}. ${escLocal(q.text||q.question||'')}</b>
        <div class="answer ${ok?'correct':'wrong'}">${ok?'✅ Đúng':'❌ Sai'}</div>
        <div class="answer">Bạn chọn: <b>${escLocal(given===undefined?'Chưa trả lời':String.fromCharCode(65+Number(given))+'. '+(options[Number(given)]||''))}</b></div>
        <div class="answer">Đáp án đúng: <b>${escLocal(key[i]===undefined?'Chưa có đáp án':String.fromCharCode(65+correct)+'. '+(options[correct]||''))}</b></div>
      </div>`;
    });

    html+='</div>';
    const target=document.getElementById('historyDetail');
    if(!target) return;
    target.innerHTML=html;
    target.scrollIntoView({behavior:'smooth',block:'start'});
  };
})();
