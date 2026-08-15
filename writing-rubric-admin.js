/* English Studio - Writing rubric editor for teacher manage.html */
(function(){
  if(!/manage\.html$/.test(location.pathname)) return;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient) return;
  const sb=window.__WRITING_ADMIN_SB||(window.__WRITING_ADMIN_SB=window.supabase.createClient(cfg.url,cfg.anonKey));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const defaultRubric=[
    {name:'Task Response',max:2.5,description:'Mức độ trả lời đúng trọng tâm, đầy đủ yêu cầu và phát triển ý.'},
    {name:'Coherence & Cohesion',max:2.5,description:'Bố cục, tính logic, liên kết ý và sử dụng từ nối.'},
    {name:'Vocabulary',max:2.5,description:'Độ đa dạng, chính xác và phù hợp của từ vựng.'},
    {name:'Grammar',max:2.5,description:'Độ chính xác và đa dạng của ngữ pháp, cấu trúc câu.'}
  ];
  let currentId=null, currentExisting=null;
  function getRubric(){const el=document.getElementById('writingRubricRows');if(!el)return [];return [...el.querySelectorAll('.wr-row')].map(row=>({name:row.querySelector('.wr-name')?.value.trim()||'',max:Number(row.querySelector('.wr-max')?.value||0),description:row.querySelector('.wr-desc')?.value.trim()||''})).filter(x=>x.name);}
  function renderRubric(rows){const box=document.getElementById('writingRubricRows');if(!box)return;box.innerHTML=rows.map((r,i)=>`<div class="wr-row" data-i="${i}" style="border:1px solid #dbe3ef;border-radius:12px;padding:12px;margin:9px 0;background:#f8fafc"><div class="grid"><div class="field"><label>Tiêu chí ${i+1}</label><input class="wr-name" value="${esc(r.name)}" placeholder="Ví dụ: Task Response"></div><div class="field"><label>Điểm tối đa</label><input class="wr-max" type="number" min="0.1" max="10" step="0.1" value="${Number(r.max)||0}"></div></div><div class="field"><label>Mô tả tiêu chí <span class="muted">(giúp AI chấm chính xác hơn)</span></label><textarea class="wr-desc" style="min-height:65px" placeholder="Giảng viên mô tả tiêu chí...">${esc(r.description||'')}</textarea></div><button type="button" class="btn red small wr-remove">🗑️ Xóa tiêu chí</button></div>`).join('');box.querySelectorAll('.wr-remove').forEach(b=>b.onclick=()=>{b.closest('.wr-row')?.remove();renumber()});}
  function renumber(){document.querySelectorAll('#writingRubricRows .wr-row').forEach((r,i)=>{const l=r.querySelector('label');if(l)l.textContent='Tiêu chí '+(i+1)})}
  function inject(existing){
    const notice=document.getElementById('writingNotice');if(!notice)return;
    let panel=document.getElementById('writingRubricPanel');
    if(!panel){panel=document.createElement('div');panel.id='writingRubricPanel';panel.className='card';panel.style.margin='12px 0';panel.innerHTML=`<h3 style="margin-top:0">✍️ Đề bài Writing</h3><div class="field"><label>Đề bài</label><textarea id="writingPrompt" style="min-height:170px" placeholder="Nhập đề bài Writing mà sinh viên phải thực hiện..."></textarea></div><hr style="border:0;border-top:1px solid #e2e8f0;margin:18px 0"><div class="row"><div><h3 style="margin:0">⚙️ Tiêu chí chấm AI</h3><div class="muted">Giảng viên tự nhập điểm tối đa cho từng tiêu chí. Tổng các tiêu chí phải đúng <b>10 điểm</b>.</div></div><button type="button" class="btn green" id="wrAdd">＋ Thêm tiêu chí</button></div><div id="writingRubricRows"></div><div id="writingRubricTotal" class="notice" style="margin-bottom:0"></div>`;notice.insertAdjacentElement('afterend',panel);panel.querySelector('#wrAdd').onclick=()=>{const rows=getRubric();rows.push({name:'',max:0,description:''});renderRubric(rows);const rs=panel.querySelectorAll('.wr-row');rs[rs.length-1]?.scrollIntoView({behavior:'smooth',block:'nearest'})};
      panel.addEventListener('input',e=>{if(e.target.matches('.wr-name,.wr-max,.wr-desc'))updateTotal()});
    }
    panel.style.display='block';
    document.getElementById('writingPrompt').value=existing?.writing_prompt||existing?.description||'';
    let rubric=existing?.writing_rubric; if(typeof rubric==='string'){try{rubric=JSON.parse(rubric)}catch{rubric=null}}
    if(!Array.isArray(rubric)||!rubric.length)rubric=defaultRubric.map(x=>({...x}));
    renderRubric(rubric);updateTotal();
  }
  function updateTotal(){const total=getRubric().reduce((s,r)=>s+(Number(r.max)||0),0);const el=document.getElementById('writingRubricTotal');if(!el)return;el.innerHTML=(Math.abs(total-10)<0.001?`✅ Tổng điểm: <b>${total.toFixed(1)}</b> / 10`:`⚠️ Tổng điểm hiện tại: <b>${total.toFixed(1)}</b> / 10 — cần điều chỉnh để tổng đúng 10 điểm.`);el.style.background=Math.abs(total-10)<0.001?'#ecfdf5':'#fff7ed';el.style.borderColor=Math.abs(total-10)<0.001?'#86efac':'#fed7aa';}
  async function saveWriting(){
    const title=document.getElementById('ctitle')?.value.trim();const description=document.getElementById('cdesc')?.value.trim()||'';const prompt=document.getElementById('writingPrompt')?.value.trim();const duration=Number(document.getElementById('cmin')?.value||60);const maxAttempts=Number(document.getElementById('cmax')?.value||1);const rubric=getRubric();
    if(!title)return alert('⚠️ Vui lòng nhập tên đề.');
    if(!prompt)return alert('⚠️ Vui lòng nhập đề bài Writing.');
    if(!rubric.length)return alert('⚠️ Phải có ít nhất một tiêu chí chấm.');
    if(rubric.some(r=>!r.name||!(Number(r.max)>0)))return alert('⚠️ Mỗi tiêu chí phải có tên và điểm tối đa lớn hơn 0.');
    const total=rubric.reduce((s,r)=>s+Number(r.max),0);if(Math.abs(total-10)>0.001)return alert(`⚠️ Tổng điểm các tiêu chí hiện là ${total.toFixed(1)}. Tổng phải đúng 10 điểm.`);
    const payload={title,description,duration_minutes:duration,max_attempts:maxAttempts,exam_type:'writing',writing_prompt:prompt,writing_rubric:rubric};
    let res;
    if(currentId)res=await sb.from('exams').update(payload).eq('id',currentId).select().single();
    else res=await sb.from('exams').insert({...payload,published:false,questions:[],answer_key:[]}).select().single();
    if(res.error){alert('❌ Không lưu được đề Writing: '+res.error.message);return;}
    if(typeof window.closeModal==='function')window.closeModal();
    if(typeof window.load==='function')await window.load();
    alert(currentId?'✅ Đã cập nhật đề Writing.':'✅ Đã tạo đề Writing.');
  }
  function install(){
    if(typeof window.createExam!=='function'||typeof window.saveExam!=='function')return false;
    if(window.__writingRubricAdminInstalled)return true;window.__writingRubricAdminInstalled=true;
    const originalCreate=window.createExam, originalSave=window.saveExam;
    window.createExam=function(existing=null){currentId=existing?.id||null;currentExisting=existing||null;originalCreate(existing);setTimeout(()=>{const ct=document.getElementById('ct');if(!ct)return;const apply=()=>{if(ct.value==='writing')inject(existing);else{const p=document.getElementById('writingRubricPanel');if(p)p.style.display='none';}};ct.addEventListener('change',apply);apply()},0)};
    window.saveExam=function(){if(document.getElementById('ct')?.value==='writing'){saveWriting();return}return originalSave()};
    return true;
  }
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>100)clearInterval(timer)},100);
})();
