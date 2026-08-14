// English Studio - add "Xem lại bài làm" to the student Reading submission result.
(function(){
  if(!/reading\.html$/.test(location.pathname)) return;
  if(window.__englishStudioReadingReviewFix) return;
  window.__englishStudioReadingReviewFix=true;

  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient) return;
  const sb=window.supabase.createClient(cfg.url,cfg.anonKey);
  const examId=new URLSearchParams(location.search).get('exam')||'';
  if(!examId) return;

  let exam=null;
  let capturedAnswers=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function parse(v,fallback){
    if(typeof v!=='string') return v??fallback;
    try{return JSON.parse(v)}catch{return fallback}
  }

  function questions(){
    const q=parse(exam?.questions,[]);
    return Array.isArray(q)?q:[];
  }

  function normalize(v){
    if(v===undefined||v===null||v==='') return null;
    if(typeof v==='object') v=v.value??v.answer??v.correct_answer??v.index??v.option??v.selected;
    if(v===undefined||v===null||v==='') return null;
    const original=String(v).trim().toUpperCase();
    if(/^[A-D]$/.test(original)) return original.charCodeAt(0)-65;
    if(/^[A-D][.)]$/.test(original)) return original.charAt(0).charCodeAt(0)-65;
    if(/^\d+$/.test(original)) return Number(original);
    return null;
  }

  function getKey(){
    const qs=questions();
    const raw=parse(exam?.answer_key,[]);
    let key=[];
    if(Array.isArray(raw)) key=raw.slice();
    else if(raw&&typeof raw==='object'){
      key=Object.entries(raw).sort((a,b)=>Number(a[0])-Number(b[0])).map(x=>x[1]);
    }
    return qs.map((q,i)=>{
      const direct=q?.answer??q?.correct_answer??q?.correctAnswer;
      return normalize(key[i]??direct);
    });
  }

  function getAnswer(i){
    if(!capturedAnswers) return '';
    return capturedAnswers[String(i)]??capturedAnswers[i]??'';
  }

  function optionText(q,v){
    const n=normalize(v);
    const opts=Array.isArray(q.options)?q.options:[];
    if(n===null) return 'Chưa trả lời';
    return (opts[n]!==undefined?String.fromCharCode(65+n)+'. '+opts[n]:'Đáp án '+(n+1));
  }

  async function loadExam(){
    try{
      const r=await sb.rpc('get_reading_exam_for_student',{p_exam_id:examId});
      if(r.error) return;
      let d=Array.isArray(r.data)?r.data[0]:r.data;
      if(typeof d==='string'){try{d=JSON.parse(d)}catch{return}}
      if(d) exam=d;
    }catch(_){ }
  }

  function captureAnswers(){
    const out={};
    questions().forEach((q,i)=>{
      const checked=document.querySelector('input[name="q'+i+'"]:checked');
      const text=document.querySelector('textarea[name="q'+i+'"]');
      out[String(i)]=checked?Number(checked.value):(text?text.value:'');
    });
    capturedAnswers=out;
  }

  function addReviewButton(){
    if(!document.body.innerText.includes('Đã nộp bài thành công')) return;
    if(document.getElementById('reading-review-btn')) return;
    const buttons=Array.from(document.querySelectorAll('button'));
    const library=buttons.find(b=>/Về thư viện đề/i.test(b.textContent||''));
    if(!library) return;
    const btn=document.createElement('button');
    btn.id='reading-review-btn';
    btn.className='btn gray';
    btn.textContent='👁️ Xem lại bài làm';
    btn.style.marginLeft='8px';
    btn.onclick=showReview;
    library.parentNode.insertBefore(btn,library);
  }

  function showReview(){
    if(!exam) return;
    const qs=questions();
    const key=getKey();
    let correct=0;
    qs.forEach((q,i)=>{if(normalize(getAnswer(i))!==null&&normalize(getAnswer(i))===key[i])correct++});

    const overlay=document.createElement('div');
    overlay.id='reading-review-overlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:99999;overflow:auto;padding:24px';
    const card=document.createElement('div');
    card.style.cssText='max-width:1000px;margin:20px auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.25)';

    let html='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">'
      +'<div><h2 style="margin:0 0 6px">📋 Xem lại bài làm</h2><div style="color:#64748b">Đúng '+correct+'/'+qs.length+' câu</div></div>'
      +'<button id="close-reading-review" class="btn gray">✕ Đóng</button></div>';

    qs.forEach((q,i)=>{
      const given=normalize(getAnswer(i));
      const expected=key[i];
      const ok=given!==null&&given===expected;
      const answerDisplay=optionText(q,getAnswer(i));
      const correctDisplay=optionText(q,expected);
      html+='<div style="margin-top:16px;padding:15px;border:1px solid '+(ok?'#bbf7d0':'#fecaca')+';border-left:5px solid '+(ok?'#16a34a':'#dc2626')+';border-radius:12px;background:'+(ok?'#f0fdf4':'#fef2f2')+'">'
        +'<div style="font-weight:800">Câu '+(i+1)+'. '+esc(q.text||q.question||'')+'</div>'
        +'<div style="margin-top:9px">Bạn chọn: <b class="'+(ok?'correct':'wrong')+'">'+esc(answerDisplay)+'</b></div>'
        +(ok?'':'<div style="margin-top:6px">Đáp án đúng: <b style="color:#15803d">'+esc(correctDisplay)+'</b></div>')
        +'</div>';
    });

    card.innerHTML=html;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.getElementById('close-reading-review').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }

  document.addEventListener('click',function(e){
    const b=e.target.closest('#submit');
    if(b) captureAnswers();
  },true);

  const observer=new MutationObserver(()=>addReviewButton());
  observer.observe(document.body,{childList:true,subtree:true});

  loadExam().then(addReviewButton);
  setTimeout(addReviewButton,300);
  setTimeout(addReviewButton,1000);
})();
