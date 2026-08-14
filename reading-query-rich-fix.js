// English Studio - render the teacher's Reading HTML on reading.html query links.
(function(){
  if(!/reading\.html$/.test(location.pathname))return;
  if(window.__englishStudioReadingQueryRichFix)return;
  window.__englishStudioReadingQueryRichFix=true;
  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient)return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  const examId=new URLSearchParams(location.search).get('exam')||'';
  if(!examId)return;

  function unwrap(v){
    if(Array.isArray(v))return v[0]||null;
    if(v&&Array.isArray(v.data))return v.data[0]||null;
    if(typeof v==='string'){try{return unwrap(JSON.parse(v))}catch{return null}}
    return v&&typeof v==='object'?v:null;
  }

  function decode(v){
    let s=String(v??'');
    if(/&lt;\/?[a-z][\s\S]*&gt;/i.test(s)){
      const t=document.createElement('textarea');t.innerHTML=s;s=t.value;
    }
    return s;
  }

  function sanitize(html){
    let source=decode(html);
    if(!/<[a-z][\s\S]*>/i.test(source))return '<p>'+source.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])).replace(/\r\n?/g,'\n').replace(/\n/g,'<br>')+'</p>';
    const doc=new DOMParser().parseFromString(source,'text/html');
    const allowed=new Set(['P','DIV','BR','SPAN','B','STRONG','I','EM','U','S','STRIKE','UL','OL','LI','H1','H2','H3','H4','H5','H6','FONT','MARK','SUB','SUP']);
    const safeCss=new Set(['font-family','font-size','text-align','font-weight','font-style','text-decoration','color','line-height','background-color']);
    function clean(root){Array.from(root.children).forEach(el=>{
      if(!allowed.has(el.tagName)){const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);el.remove();return;}
      Array.from(el.attributes).forEach(a=>{
        const n=a.name.toLowerCase();
        if(n==='style'){
          const keep=[];
          String(a.value).split(';').forEach(rule=>{
            const [p0,...rest]=rule.split(':');const p=String(p0||'').trim().toLowerCase(),v=rest.join(':').trim();
            if(!safeCss.has(p)||!v||/[<>]/.test(v)||/javascript\s*:/i.test(v))return;
            if(p==='text-align'&&!/^(left|center|right|justify)$/i.test(v))return;
            if(p==='font-size'&&!/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(v))return;
            if(p==='font-weight'&&!/^(normal|bold|[1-9]00)$/i.test(v))return;
            keep.push(p+':'+v);
          });
          if(keep.length)el.setAttribute('style',keep.join(';'));else el.removeAttribute('style');
        }else if(n==='face'&&el.tagName==='FONT'){if(!/^[a-z0-9 ,"'_-]+$/i.test(a.value))el.removeAttribute(a.name)}
        else if(n==='size'&&el.tagName==='FONT'){if(!/^[1-7]$/.test(a.value))el.removeAttribute(a.name)}
        else if(n==='color'&&el.tagName==='FONT'){if(!/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(a.value))el.removeAttribute(a.name)}
        else el.removeAttribute(a.name);
      });
      clean(el);
    });}
    clean(doc.body);return doc.body.innerHTML||'<p><br></p>';
  }

  async function apply(){
    try{
      const r=await client.rpc('get_reading_exam_for_student',{p_exam_id:examId});
      if(r.error)return;
      const d=unwrap(r.data);const html=d?.reading_passage||d?.reading_text||d?.passage||d?.content||'';
      if(!html)return;
      const node=document.querySelector('.passage');
      if(!node){setTimeout(apply,100);return;}
      node.classList.add('reading-rich-passage');
      node.style.whiteSpace='normal';
      node.innerHTML=sanitize(html);
      node.querySelectorAll('[style]').forEach(el=>{el.style.setProperty('white-space','normal','important')});
    }catch(_){ }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  setTimeout(apply,400);
})();
