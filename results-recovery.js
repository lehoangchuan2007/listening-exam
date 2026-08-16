// English Studio - Results recovery / timeout-safe loader
(function(){
  if(!/results\.html$/.test(location.pathname)||window.__RESULTS_RECOVERY__)return;
  window.__RESULTS_RECOVERY__=true;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const parse=(v,f)=>{if(v==null)return f;if(typeof v!=='string')return v;try{return JSON.parse(v)}catch{return f}};
  const list=v=>{const x=parse(v,[]);return Array.isArray(x)?x:(x&&typeof x==='object'?Object.values(x):[])};
  const score=r=>Number(r?.total_score!=null?r.total_score:r?.score)||0;
  const norm=v=>{if(v==null||v==='')return null;if(typeof v==='object')v=v.value??v.answer??v.selected??v.index??v.option;if(v==null||v==='')return null;const s=String(v).trim().toUpperCase();if(/^[A-D]$/.test(s))return s.charCodeAt(0)-65;if(/^\d+$/.test(s))return Number(s);return null};
  let recoveryExam=null,recoveryRows=[],recoveryMode='',recoveryKey=[];
  function showError(t){const b=document.getElementById('errorBox'),tb=document.getElementById('tbody');if(b)b.innerHTML='<div class="error">❌ '+esc(t)+'</div>';if(tb)tb.innerHTML='<tr><td colspan="8">'+esc(t)+'</td></tr>'}
  function questions(){const q=parse(recoveryExam?.questions,[]);return Array.isArray(q)?q:[]}
  function answerAt(a,i){if(Array.isArray(a))return a[i];if(!a||typeof a!=='object')return undefined;for(const k of [String(i),String(i+1),'q'+i,'q'+(i+1),'question'+i,'question'+(i+1)])if(Object.prototype.hasOwnProperty.call(a,k))return a[k];return undefined}
  function rubricRows(r){const rub=list(recoveryExam?.writing_rubric),scores=parse(r?.rubric_scores,{});return rub.map(x=>{const name=String(x?.name||x?.title||'').trim(),key=name.toLowerCase();let value=scores?.[name];if(value==null){if(key.includes('task response'))value=r?.task_response;else if(key.includes('coherence')||key.includes('cohesion'))value=r?.coherence;else if(key.includes('vocabulary'))value=r?.vocabulary;else if(key.includes('grammar'))value=r?.grammar}return{name,max:Number(x?.max??x?.max_score??0),value:value==null?'—':Number(value)}}).filter(x=>x.name)}
  function feedbackBlock(title,items,empty='Không có dữ liệu.'){const a=list(items);return '<div class="feedback"><b>'+title+'</b>'+(a.length?'<ul>'+a.map(x=>'<li>'+esc(typeof x==='string'?x:(x?.text||x?.error||x?.suggestion||JSON.stringify(x)))+'</li>').join('')+'</ul>':'<div class="muted">'+empty+'</div>')+'</div>'}
  function renderDetail(r){
    const detail=document.getElementById('detail');if(!detail)return;
    if(recoveryMode==='writing'){
      const rr=rubricRows(r),overall=r?.overall_comment||r?.feedback||r?.ai_feedback||'';
      const model=r?.ai_model||'AI';
      detail.innerHTML='<div class="card"><div class="row"><h3>👁 Chi tiết bài làm — '+esc(r.student_name||'Sinh viên')+'</h3><button class="btn gray" onclick="document.getElementById(\'detail\').innerHTML=\'\'">Đóng</button></div>'+
        '<div class="row"><div><b>Điểm tổng: '+esc(r.total_score??r.score??0)+'/10</b></div><div class="muted">🤖 Chấm bởi '+esc(model)+'</div></div>'+
        (rr.length?'<div class="rubric">'+rr.map(x=>'<span><b>'+esc(x.name)+'</b>: '+esc(x.value)+'/'+esc(x.max)+'</span>').join('')+'</div>':'')+
        '<h4>📝 Bài làm</h4><div class="essay">'+esc(r.essay||r.answer||r.content||'Chưa có bài viết.')+'</div>'+
        '<h4>🤖 Nhận xét của AI</h4><div class="feedback">'+(overall?'<div>'+esc(overall)+'</div>':'<div class="muted">Chưa có nhận xét tổng quan.</div>')+'</div>'+
        feedbackBlock('💪 Điểm mạnh',r.strengths)+feedbackBlock('🛠️ Điểm cần cải thiện',r.improvements)+feedbackBlock('🔤 Lỗi ngữ pháp',r.grammar_errors)+feedbackBlock('💡 Cách diễn đạt tốt hơn',r.better_phrases)+
        '</div>';
    }else{
      const qs=questions(),a=parse(r.answers??r.student_answers,{}),html=['<div class="card"><div class="row"><h3>👁 Chi tiết bài làm — '+esc(r.student_name||r.full_name||r.name||'Sinh viên')+'</h3><button class="btn gray" onclick="document.getElementById(\'detail\').innerHTML=\'\'">Đóng</button></div>'];
      qs.forEach((q,i)=>{const given=norm(answerAt(a,i)),expected=norm(recoveryKey[i]),ok=given!==null&&expected!==null&&given===expected,opts=Array.isArray(q?.options)?q.options:[],letter=x=>x===null?'':String.fromCharCode(65+x);html.push('<div class="review '+(ok?'ok':'bad')+'"><b>Câu '+(i+1)+'.</b> '+esc(q?.text||q?.question||'')+'<div class="'+(ok?'correct':'wrong')+'">'+(ok?'✅ Đúng':'❌ Sai')+'</div><div class="answer">Đáp án sinh viên: <b>'+esc(given===null?'Chưa chọn':letter(given)+(opts[given]!=null?'. '+opts[given]:''))+'</b></div><div class="answer">Đáp án đúng: <b>'+esc(expected===null?'—':letter(expected)+(opts[expected]!=null?'. '+opts[expected]:''))+'</b></div></div>')});html.push('</div>');detail.innerHTML=html.join('');
    }
    detail.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderFallback(){
    const thead=document.getElementById('thead'),tbody=document.getElementById('tbody');if(!thead||!tbody)return;
    thead.innerHTML=recoveryMode==='writing'?'<tr><th>#</th><th>Sinh viên</th><th>Điểm</th><th>Thời gian</th><th>Thao tác</th></tr>':'<tr><th>#</th><th>Sinh viên</th><th>MSSV</th><th>Điểm</th><th>Đúng</th><th>Thời gian nộp</th><th>Thao tác</th></tr>';
    tbody.innerHTML=recoveryRows.length?recoveryRows.map((r,i)=>{const t=r.created_at||r.submitted_at,action='<button class="btn" onclick="window.__resultsRecoveryView('+i+')">👁 Xem bài làm</button>';if(recoveryMode==='writing')return '<tr><td>'+(i+1)+'</td><td>'+esc(r.student_name||'—')+'</td><td><b>'+score(r).toFixed(2)+'/10</b></td><td>'+esc(t?new Date(t).toLocaleString('vi-VN'):'—')+'</td><td>'+action+'</td></tr>';const qs=questions(),a=parse(r.answers??r.student_answers,{});let correct=0;for(let n=0;n<qs.length;n++)if(norm(answerAt(a,n))!==null&&norm(recoveryKey[n])!==null&&norm(answerAt(a,n))===norm(recoveryKey[n]))correct++;return '<tr><td>'+(i+1)+'</td><td>'+esc(r.student_name||r.full_name||r.name||'—')+'</td><td>'+esc(r.student_id||r.mssv||'—')+'</td><td><b>'+score(r).toFixed(2)+'</b></td><td>'+correct+'/'+(r.total_questions??qs.length)+'</td><td>'+esc(t?new Date(t).toLocaleString('vi-VN'):'—')+'</td><td>'+action+'</td></tr>'}).join(''):'<tr><td colspan="8">Không có bài làm.</td></tr>';
    window.__resultsRecoveryView=i=>renderDetail(recoveryRows[i]);
    document.getElementById('sSubs').textContent=recoveryRows.length;document.getElementById('sStudents').textContent=new Set(recoveryRows.map(r=>r.student_user_id||r.student_id||r.student_name||r.id)).size;const ss=recoveryRows.map(score);document.getElementById('sAvg').textContent=ss.length?(ss.reduce((a,b)=>a+b,0)/ss.length).toFixed(2):'0';document.getElementById('sHigh').textContent=ss.length?Math.max(...ss).toFixed(2):'0';document.getElementById('sPass').textContent=ss.length?Math.round(ss.filter(x=>x>=5).length/ss.length*100)+'%':'0%';
  }
  async function fallback(){
    const cfg=window.SUPABASE_CONFIG||{};if(!window.supabase||!cfg.url||!cfg.anonKey){showError('Không khởi tạo được kết nối Supabase.');return}
    const sb=window.supabase.createClient(cfg.url,cfg.anonKey),eid=new URLSearchParams(location.search).get('exam');if(!eid){showError('Thiếu mã đề.');return}
    const {data:{session},error:authError}=await sb.auth.getSession();if(authError){showError('Không đọc được phiên đăng nhập: '+authError.message);return}if(!session){location.href='./admin.html';return}
    const {data,error}=await sb.rpc('get_teacher_exam_results',{p_exam_id:eid});if(error){showError('Không tải được kết quả: '+error.message);return}
    let p=data;if(typeof p==='string')p=parse(p,null);if(!p?.exam){showError('Không tìm thấy đề hoặc bạn không có quyền xem kết quả đề này.');return}
    recoveryExam=p.exam;recoveryRows=Array.isArray(p.rows)?p.rows:[];recoveryMode=String(recoveryExam.exam_type||'').toLowerCase();const qs=questions(),raw=parse(recoveryExam.answer_key,[]);recoveryKey=Array.isArray(raw)?raw.slice():raw&&typeof raw==='object'?Object.entries(raw).sort((a,b)=>Number(a[0])-Number(b[0])).map(x=>x[1]):[];recoveryKey=qs.map((q,i)=>recoveryKey[i]??q?.answer??q?.correct_answer??q?.correctAnswer);document.getElementById('examTitle').textContent='📊 '+(recoveryExam.title||'Kết quả');document.getElementById('examInfo').textContent=recoveryMode==='writing'?'✍️ Writing':recoveryMode==='reading'?'📖 Reading':'🎧 Listening';renderFallback();
  }
  async function start(){await wait(400);let done=false;try{if(typeof window.init==='function'){await Promise.race([window.init(),wait(3500).then(()=>{throw new Error('RESULTS_INIT_TIMEOUT')})]);done=true}}catch(e){console.warn('[results-recovery]',e)}if(!done)await fallback()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
