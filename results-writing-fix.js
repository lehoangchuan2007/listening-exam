/* English Studio - robust Writing results loader */
(function(){
  if(!/results\.html$/.test(location.pathname))return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const parse=v=>{if(typeof v!=='string')return v??{};try{return JSON.parse(v)}catch{return{}}};
  const examId=new URLSearchParams(location.search).get('exam')||'';
  async function load(){
    if(!examId)return;
    const {data:{session}}=await client.auth.getSession();
    if(!session)return;
    const er=await client.from('exams').select('id,title,exam_type,writing_rubric').eq('id',examId).single();
    if(er.error||String(er.data?.exam_type||'').toLowerCase()!=='writing')return;
    const r=await client.rpc('get_teacher_writing_submissions_v2',{p_exam_id:examId});
    if(r.error)return showError('Không tải được bài Writing: '+r.error.message);
    let rows=r.data;if(typeof rows==='string'){try{rows=JSON.parse(rows)}catch{rows=[]}}if(!Array.isArray(rows))rows=[];
    render(er.data,rows);
  }
  function rubricRows(exam,row){
    const rub=Array.isArray(exam.writing_rubric)?exam.writing_rubric:parse(exam.writing_rubric,[]),scores=parse(row.rubric_scores||'{}');
    return rub.map(x=>{const name=String(x?.name||x?.title||'').trim(),key=name.toLowerCase();let value=scores?.[name];if(value===undefined){if(key.includes('task response'))value=row.task_response;else if(key.includes('coherence')||key.includes('cohesion'))value=row.coherence;else if(key.includes('vocabulary'))value=row.vocabulary;else if(key.includes('grammar'))value=row.grammar}return{name,max:Number(x?.max??x?.max_score??0),value:Number(value??0)}}).filter(x=>x.name);
  }
  function render(exam,rows){
    const search=document.getElementById('search'),pass=document.getElementById('pass'),sort=document.getElementById('sort'),tbody=document.getElementById('tbody');
    if(!tbody)return;
    const apply=()=>{
      const q=String(search?.value||'').toLowerCase().trim(),p=pass?.value||'all',s=sort?.value||'new';
      let filtered=rows.filter(r=>{const n=String(r.student_name||'').toLowerCase(),score=Number(r.total_score)||0;return (!q||n.includes(q))&&(p==='all'||(p==='pass'&&score>=5)||(p==='fail'&&score<5))});
      filtered.sort((a,b)=>s==='high'?Number(b.total_score||0)-Number(a.total_score||0):s==='low'?Number(a.total_score||0)-Number(b.total_score||0):new Date(b.created_at)-new Date(a.created_at));
      const scores=filtered.map(r=>Number(r.total_score)||0),unique=new Set(filtered.map(r=>r.student_user_id||r.student_name));
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
      set('sStudents',unique.size);set('sSubs',filtered.length);set('sAvg',scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2):'0');set('sHigh',scores.length?Math.max(...scores).toFixed(2):'0');set('sPass',scores.length?Math.round(scores.filter(x=>x>=5).length/scores.length*100)+'%':'0%');
      tbody.innerHTML=filtered.length?filtered.map((r,i)=>{const rr=rubricRows(exam,r);return '<tr><td>'+(i+1)+'</td><td>'+esc(r.student_name||'—')+'</td><td><b>'+esc(r.total_score)+'/10</b></td><td>'+rr.map(x=>esc(x.name)+': '+esc(x.value)+'/'+esc(x.max)).join('<br>')+'</td><td>'+esc(new Date(r.created_at).toLocaleString('vi-VN'))+'</td><td><button class="btn" type="button" data-writing-index="'+i+'">👁 Xem bài</button></td></tr>'}).join(''):'<tr><td colspan="6">Không có bài Writing.</td></tr>';
      tbody.querySelectorAll('[data-writing-index]').forEach(btn=>btn.onclick=()=>view(filtered[Number(btn.dataset.writingIndex)],exam));
    };
    if(search)search.oninput=apply;if(pass)pass.onchange=apply;if(sort)sort.onchange=apply;apply();
  }
  function view(r,exam){
    const detail=document.getElementById('detail');if(!detail)return;const rr=rubricRows(exam,r),arr=v=>Array.isArray(v)?v:parse(v)||[],strengths=arr(r.strengths),improvements=arr(r.improvements),errors=arr(r.grammar_errors),phrases=arr(r.better_phrases);
    detail.innerHTML='<div class="card"><div class="row"><h2>✍️ '+esc(r.student_name||'Bài Writing')+'</h2><button class="btn gray" type="button" onclick="document.getElementById(\'detail\').innerHTML=\'\'">Đóng</button></div><p class="muted">'+esc(r.word_count)+' từ • '+esc(r.total_score)+'/10 • '+new Date(r.created_at).toLocaleString('vi-VN')+'</p><div class="rubric">'+rr.map(x=>'<span>'+esc(x.name)+': <b>'+esc(x.value)+'</b>/'+esc(x.max)+'</span>').join('')+'</div><h3>📝 Bài viết</h3><div class="essay">'+esc(r.essay)+'</div><div class="feedback"><b>💬 Nhận xét tổng quan</b><p>'+esc(r.overall_comment||'')+'</p></div><div class="feedback ok"><b>💪 Điểm mạnh</b><ul>'+strengths.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div><div class="feedback"><b>🎯 Cần cải thiện</b><ul>'+improvements.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'+(errors.length?'<div class="feedback bad"><b>🔎 Lỗi cần chú ý</b>'+errors.map(x=>'<p><b>'+esc(x.original)+' → '+esc(x.correction)+'</b><br>'+esc(x.explanation)+'</p>').join('')+'</div>':'')+(phrases.length?'<div class="feedback"><b>✨ Gợi ý diễn đạt tốt hơn</b>'+phrases.map(x=>'<p>'+esc(x.original)+' → <b>'+esc(x.better)+'</b></p>').join('')+'</div>':'')+'</div>';
    detail.scrollIntoView({behavior:'smooth'});
  }
  function showError(t){const tbody=document.getElementById('tbody');if(tbody)tbody.innerHTML='<tr><td colspan="6" style="color:#b91c1c">'+esc(t)+'</td></tr>';}
  let tries=0;const timer=setInterval(()=>{tries++;if(document.getElementById('tbody')){clearInterval(timer);load().catch(e=>showError(e?.message||'Lỗi không xác định'));}else if(tries>40)clearInterval(timer)},250);
})();
