// English Studio - Show child folders inside the selected folder
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_CHILD_FOLDER_FIX__)return;
  window.__ENGLISH_STUDIO_CHILD_FOLDER_FIX__=true;
  const cfg=window.SUPABASE_CONFIG||{};
  const db=supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let folders=[];
  let observer=null;
  let injecting=false;
  let lastSignature='';
  const getActive=()=>document.querySelector('.ef-folder.active')?.dataset?.id||'__all__';
  function inject(){
    if(injecting)return;
    const section=document.querySelector('.ef-shell section');
    const toolbar=section?.querySelector('.ef-toolbar');
    const list=document.getElementById('ef-list');
    if(!section||!toolbar||!list)return;
    const active=getActive();
    const kids=(active==='__all__'||active==='__uncategorized__')?[]:folders.filter(f=>String(f.parent_id||'')===String(active)).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    const signature=active+'|'+kids.map(f=>f.id+':'+f.name).join(',');
    if(signature===lastSignature)return;
    lastSignature=signature;
    injecting=true;
    if(observer)observer.disconnect();
    try{
      document.getElementById('ef-child-folders')?.remove();
      if(!kids.length)return;
      const box=document.createElement('div');
      box.id='ef-child-folders';
      box.innerHTML=`<div class="ef-child-title">📁 Thư mục con</div><div class="ef-child-grid">${kids.map(f=>`<button class="ef-child-card" data-child-id="${esc(f.id)}"><span>📁</span><strong>${esc(f.name)}</strong><small>Thư mục con</small></button>`).join('')}</div>`;
      toolbar.insertAdjacentElement('afterend',box);
      box.querySelectorAll('[data-child-id]').forEach(btn=>btn.addEventListener('click',()=>{
        const target=document.querySelector(`.ef-folder[data-id="${btn.dataset.childId}"]`);
        if(target)target.click();
      }));
    }finally{
      injecting=false;
      if(observer)observer.observe(document.body,{childList:true,subtree:true});
    }
  }
  function style(){
    if(document.getElementById('ef-child-style'))return;
    const s=document.createElement('style');s.id='ef-child-style';s.textContent=`
      #ef-child-folders{margin-bottom:12px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;box-shadow:0 5px 20px #0f172a0a}
      .ef-child-title{font-weight:800;margin-bottom:10px}
      .ef-child-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
      .ef-child-card{border:1px solid #dbe3ef;background:#f8fafc;border-radius:12px;padding:14px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:4px;transition:.15s}
      .ef-child-card:hover{background:#eff6ff;border-color:#93c5fd;transform:translateY(-1px)}
      .ef-child-card span{font-size:24px}.ef-child-card strong{font-size:15px;color:#0f172a}.ef-child-card small{font-size:12px;color:#64748b}
    `;document.head.appendChild(s);
  }
  async function load(){
    const session=await db.auth.getSession();if(!session.data?.session)return;
    const r=await db.from('exam_folders').select('id,name,parent_id').order('name',{ascending:true});
    if(!r.error){folders=r.data||[];lastSignature='';inject();}
  }
  style();
  observer=new MutationObserver(()=>{if(!injecting)inject();});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(load,300);
  setTimeout(load,1200);
})();
