/* English Studio - Writing admin editor v2
   - Writing does not show the MCQ question builder.
   - Create/update use the same Writing save flow.
   - Keeps the teacher-defined rubric and prompt when editing.
*/
(function(){
  if(!/manage\.html$/.test(location.pathname)) return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient) return;
  const sb=window.__WRITING_ADMIN_SB||window.supabase.createClient(cfg.url,cfg.anonKey);
  window.__WRITING_ADMIN_SB=sb;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const parse=v=>{if(Array.isArray(v))return v;if(typeof v==='string'){try{return JSON.parse(v)}catch{return []}}return []};
  const defaults=()=>[
    {name:'Task Response',max:2.5,description:'Đánh giá mức độ trả lời đúng trọng tâm, đầy đủ và phát triển ý.'},
    {name:'Coherence & Cohesion',max:2.5,description:'Đánh giá bố cục, tính mạch lạc và liên kết giữa các ý.'},
    {name:'Vocabulary',max:2.5,description:'Đánh giá độ đa dạng, chính xác và phù hợp của từ vựng.'},
    {name:'Grammar',max:2.5,description:'Đánh giá độ chính xác và đa dạng của ngữ pháp.'}
  ];
  let wrapped=false;

  function getRows(){
    return [...document.querySelectorAll('#writingRubric .wr-row')]
      .map(r=>({name:r.querySelector('.wr-name')?.value.trim()||'',max:Number(r.querySelector('.wr-max')?.value)||0,description:r.querySelector('.wr-desc')?.value.trim()||''}))
      .filter(x=>x.name||x.max||x.description);
  }
  function renderTotal(){
    const total=getRows().reduce((a,x)=>a+(Number(x.max)||0),0);
    const el=document.getElementById('wrTotal');
    if(el){el.textContent=total.toFixed(2).replace(/\.00$/,'')+' / 10';el.style.color=Math.abs(total-10)<.001?'#166534':'#b91c1c';}
  }
  function addRow(data={name:'',max:'',description:''}){
    const box=document.getElementById('writingRubric');if(!box)return;
    const row=document.createElement('div');row.className='wr-row';
    row.style.cssText='border:1px solid #dbe3ef;border-radius:12px;padding:12px;margin:9px 0;background:#fff';
    row.innerHTML=`<div style="display:grid;grid-template-columns:minmax(180px,1.1fr)120px minmax(220px,2fr)auto;gap:8px;align-items:start"><input class="wr-name" placeholder="Tên tiêu chí" value="${esc(data.name)}"><input class="wr-max" type="number" min="0" step="0.5" placeholder="Điểm" value="${data.max??''}"><input class="wr-desc" placeholder="Mô tả để AI hiểu tiêu chí" value="${esc(data.description)}"><button type="button" class="btn red small wr-del">🗑️</button></div>`;
    row.querySelectorAll('input').forEach(i=>i.addEventListener('input',renderTotal));
    row.querySelector('.wr-del').onclick=()=>{row.remove();renderTotal()};
    box.appendChild(row);renderTotal();
  }
  function buildRubric(existing){
    return `<div class="card" style="margin:12px 0;padding:15px;background:#f8fbff"><div class="row"><div><h3 style="margin:0">⚙️ Tiêu chí chấm AI</h3><div class="muted">Giảng viên tự nhập điểm tối đa cho từng tiêu chí. Tổng phải đúng 10 điểm.</div></div><b id="wrTotal">0 / 10</b></div><div id="writingRubric"></div><button type="button" class="btn green small" id="wrAdd">＋ Thêm tiêu chí</button></div>`;
  }
  function hideMCQ(){
    // In Writing, the generic multiple-choice question builder is irrelevant.
    const heading=[...document.querySelectorAll('.modal h3')].find(h=>(h.textContent||'').includes('Câu hỏi'));
    if(heading){
      const row=heading.closest('.row'); if(row) row.style.display='none';
    }
    const qs=document.getElementById('qs'); if(qs) qs.style.display='none';
  }
  function writingUI(){
    if(document.getElementById('ct')?.value!=='writing')return;
    const notice=document.getElementById('writingNotice');if(!notice)return;
    notice.style.display='none';
    hideMCQ();
    if(!document.getElementById('writingPromptField')){
      const wrap=document.createElement('div');wrap.id='writingPromptField';
      const existing=parse(window.__editingWritingRubric||'');
      wrap.innerHTML='<div class="field"><label>✍️ Đề bài Writing</label><textarea id="cwriting" style="min-height:220px" placeholder="Nhập đề bài Writing cho sinh viên...">'+esc(window.__editingWritingPrompt||'')+'</textarea></div>'+buildRubric(existing);
      notice.insertAdjacentElement('afterend',wrap);
      const rows=existing.length?existing:defaults();rows.forEach(addRow);
      document.getElementById('wrAdd').onclick=()=>addRow();renderTotal();
    }
    const save=[...document.querySelectorAll('.modal .btn')].find(b=>/Tạo đề|Lưu thay đổi/.test(b.textContent||''));
    if(save)save.onclick=saveWritingExam;
  }
  async function saveWritingExam(){
    const {data,error}=await sb.auth.getUser();
    if(error||!data?.user)return alert('❌ Phiên đăng nhập đã hết.');
    const title=document.getElementById('ctitle')?.value.trim();
    if(!title)return alert('Tên đề không được trống.');
    const prompt=document.getElementById('cwriting')?.value.trim();
    if(!prompt)return alert('Đề bài Writing không được trống.');
    const rubric=getRows();
    if(!rubric.length)return alert('Hãy thêm ít nhất một tiêu chí chấm.');
    if(rubric.some(x=>!x.name||x.max<=0))return alert('Mỗi tiêu chí phải có tên và điểm tối đa lớn hơn 0.');
    const total=rubric.reduce((a,x)=>a+x.max,0);
    if(Math.abs(total-10)>.001)return alert('⚠️ Tổng điểm các tiêu chí phải bằng 10. Hiện tại: '+total);
    const payload={
      owner_id:data.user.id,exam_type:'writing',title,
      description:document.getElementById('cdesc')?.value||'',
      duration_minutes:Math.max(1,Number(document.getElementById('cmin')?.value)||60),
      max_attempts:Number(document.getElementById('cmax')?.value)||1,
      questions:[],answer_key:[],writing_prompt:prompt,writing_rubric:rubric
    };
    const editing=window.__WRITING_EDITING_ID||null;
    let result;
    if(editing) result=await sb.from('exams').update(payload).eq('id',editing);
    else {payload.published=false;result=await sb.from('exams').insert(payload);}
    if(result.error)return alert('❌ '+result.error.message);
    window.__WRITING_EDITING_ID=null;window.__editingWritingPrompt='';window.__editingWritingRubric=[];
    if(typeof window.closeModal==='function')window.closeModal();else document.getElementById('modal').innerHTML='';
    if(typeof window.load==='function')await window.load();
    alert(editing?'✅ Đã cập nhật đề Writing.':'✅ Đã tạo đề Writing.');
  }
  function hookWrappers(){
    if(wrapped)return;
    if(typeof window.createExam==='function'){
      const originalCreate=window.createExam;
      window.createExam=function(existing=null){
        window.__WRITING_EDITING_ID=existing?.id||null;
        window.__editingWritingPrompt=existing?.writing_prompt||'';
        window.__editingWritingRubric=existing?.writing_rubric||[];
        const out=originalCreate.apply(this,arguments);
        setTimeout(()=>{writingUI();},30);
        return out;
      };
      if(typeof window.edit==='function){
        const originalEdit=window.edit;
        window.edit=function(id){
          const exam=(window.exams||[]).find(e=>String(e.id)===String(id));
          window.__WRITING_EDITING_ID=exam?.id||id;
          window.__editingWritingPrompt=exam?.writing_prompt||'';
          window.__editingWritingRubric=exam?.writing_rubric||[];
          return originalEdit.apply(this,arguments);
        };
      }
      wrapped=true;
    }
  }
  const mo=new MutationObserver(()=>{hookWrappers();if(document.getElementById('ct'))writingUI();});
  mo.observe(document.body,{childList:true,subtree:true});
  const timer=setInterval(()=>{hookWrappers();if(document.getElementById('ct')?.value==='writing')writingUI();if(wrapped)clearInterval(timer);},100);
  window.__writingAdminFix={writingUI,saveWritingExam,addRow};
})();
