// English Studio - Results page recovery
(function(){
  if(!/results\.html$/.test(location.pathname)||window.__RESULTS_RECOVERY__)return;
  window.__RESULTS_RECOVERY__=true;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const parse=(v,f)=>{if(v==null)return f;if(typeof v!=='string')return v;try{return JSON.parse(v)}catch{return f}};
  const score=r=>Number(r?.total_score!=null?r.total_score:r?.score)||0;
  async function fallback(){
    const cfg=window.SUPABASE_CONFIG||{};
    if(!window.supabase||!cfg.url||!cfg.anonKey){showError('Không khởi tạo được kết nối Supabase.');return}
    const sb=window.supabase.createClient(cfg.url,cfg.anonKey);
    const eid=new URLSearchParams(location.search).get('exam');
    if(!eid){showError('Thiếu mã đề.');return}
    const {data:{session},error:authError}=await sb.auth.getSession();
    if(authError){showError('Không đọc được phiên đăng nhập: '+authError.message);return}
    if(!session){showError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');return}
    const {data,error}=await sb.rpc('get_teacher_exam_results',{p_exam_id:eid});
    if(error){showError('Không tải được kết quả: '+error.message);return}
    let p=data;if(typeof p==='string')p=parse(p,null);
    if(!p?.exam){showError('Không tìm thấy đề hoặc bạn không có quyền xem kết quả đề này.');return}
    const exam=p.exam, rows=Array.isArray(p.rows)?p.rows:[], mode=String(exam.exam_type||'').toLowerCase();
    document.getElementById('examTitle').textContent='📊 '+(exam.title||'Kết quả');
    document.getElementById('examInfo').textContent=mode==='writing'?'✍️ Writing':mode==='reading'?'📖 Reading':'🎧 Listening';
    const qs=parse(exam.questions,[]); const keyRaw=parse(exam.answer_key,[]);
    const key=Array.isArray(keyRaw)?keyRaw:(keyRaw&&typeof keyRaw==='object'?Object.entries(keyRaw).sort((a,b)=>Number(a[0])-Number(b[0])).map(x=>x[1]):[]);
    const norm=v=>{if(v==null||v==='')return null;if(typeof v==='object')v=v.value??v.answer??v.selected??v.index??v.option;if(v==null||v==='')return null;const s=String(v).trim().toUpperCase();if(/^[A-D]$/.test(s))return s.charCodeAt(0)-65;if(/^\d+$/.test(s))return Number(s);return null};
    const correct=r=>{const a=parse(r.answers??r.student_answers,{});let n=0;for(let i=0;i<(Array.isArray(qs)?qs.length:0);i++){let v=Array.isArray(a)?a[i]:a?.[String(i)]??a?.[String(i+1)]??a?.['q'+i]??a?.['q'+(i+1)];if(norm(v)!==null&&norm(key[i])!==null&&norm(v)===norm(key[i]))n++}return n};
    const tbody=document.getElementById('tbody'),thead=document.getElementById('thead');
    thead.innerHTML=mode==='writing'?'<tr><th>#</th><th>Sinh viên</th><th>Điểm</th><th>Thời gian</th></tr>':'<tr><th>#</th><th>Sinh viên</th><th>MSSV</th><th>Điểm</th><th>Đúng</th><th>Thời gian nộp</th></tr>';
    tbody.innerHTML=rows.length?rows.map((r,i)=>{const t=r.created_at||r.submitted_at;return mode==='writing'?'<tr><td>'+(i+1)+'</td><td>'+esc(r.student_name||'—')+'</td><td><b>'+score(r).toFixed(2)+'/10</b></td><td>'+esc(t?new Date(t).toLocaleString('vi-VN'):'—')+'</td></tr>':'<tr><td>'+(i+1)+'</td><td>'+esc(r.student_name||r.full_name||r.name||'—')+'</td><td>'+esc(r.student_id||r.mssv||'—')+'</td><td><b>'+score(r).toFixed(2)+'</b></td><td>'+correct(r)+'/'+(r.total_questions??(Array.isArray(qs)?qs.length:0))+'</td><td>'+esc(t?new Date(t).toLocaleString('vi-VN'):'—')+'</td></tr>'}).join(''):'<tr><td colspan="8">Chưa có bài làm.</td></tr>';
    document.getElementById('sSubs').textContent=rows.length;
    document.getElementById('sStudents').textContent=new Set(rows.map(r=>r.student_user_id||r.student_id||r.student_name||r.id)).size;
    const ss=rows.map(score);document.getElementById('sAvg').textContent=ss.length?(ss.reduce((a,b)=>a+b,0)/ss.length).toFixed(2):'0';document.getElementById('sHigh').textContent=ss.length?Math.max(...ss).toFixed(2):'0';document.getElementById('sPass').textContent=ss.length?Math.round(ss.filter(x=>x>=5).length/ss.length*100)+'%':'0%';
  }
  function showError(t){const b=document.getElementById('errorBox'),tb=document.getElementById('tbody');if(b)b.innerHTML='<div class="error">❌ '+esc(t)+'</div>';if(tb)tb.innerHTML='<tr><td colspan="8">'+esc(t)+'</td></tr>'}
  async function start(){await wait(250);try{if(typeof window.init==='function'){await window.init();return}}catch(e){console.error('[results-recovery] init failed',e)}await wait(500);const tb=document.getElementById('tbody');if(tb&&tb.textContent.includes('Đang tải'))await fallback()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
