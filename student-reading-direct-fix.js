// English Studio - direct Reading rich-text renderer for students.
// Reads the Reading RPC directly, so it does not depend on student.html's private `exam` variable.
(function(){
  if(window.__ENGLISH_STUDIO_READING_DIRECT_FIX__) return;
  window.__ENGLISH_STUDIO_READING_DIRECT_FIX__=true;

  const cfg=window.SUPABASE_CONFIG||{};
  if(!cfg.url||!cfg.anonKey||!window.supabase?.createClient) return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  let rich='';
  let rendered='';

  function examId(){
    const m=String(location.hash||'').match(/^#exam=([^&]+)/);
    return m?decodeURIComponent(m[1]):'';
  }
  function decode(v){
    let s=String(v??'');
    if(/&lt;\/?[a-z][\s\S]*&gt;/i.test(s)){const t=document.createElement('textarea');t.innerHTML=s;s=t.value;}
    return s;
  }
  function safe(html){
    const raw=decode(html);
    if(!/<[a-z][\s\S]*>/i.test(raw)) return raw.replace(/\r\n?/g,'\n').split(/\n\n+/).map(p=>'<p>'+p.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])).replace(/\n/g,'<br>')+'</p>').join('');
    const doc=new DOMParser().parseFromString(raw,'text/html');
    const allowed=new Set(['P','DIV','BR','SPAN','B','STRONG','I','EM','U','S','STRIKE','UL','OL','LI','H1','H2','H3','H4','H5','H6','FONT','MARK','SUB','SUP']);
    const css=new Set(['font-family','font-size','text-align','font-weight','font-style','text-decoration','color','line-height','background-color']);
    function clean(root){Array.from(root.children).forEach(el=>{if(!allowed.has(el.tagName)){const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);el.remove();return;}Array.from(el.attributes).forEach(a=>{const n=a.name.toLowerCase();if(n==='style'){const keep=[];String(a.value).split(';').forEach(r=>{const [p0,...rest]=r.split(':');const p=String(p0||'').trim().toLowerCase(),v=rest.join(':').trim();if(!css.has(p)||!v||/[<>]/.test(v)||/javascript\s*:/i.test(v))return;if(p==='text-align'&&!/^(left|center|right|justify)$/i.test(v))return;if(p==='font-size'&&!/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(v))return;if(p==='font-weight'&&!/^(normal|bold|[1-9]00)$/.test(v))return;keep.push(p+':'+v)});if(keep.length)el.setAttribute('style',keep.join(';'));else el.removeAttribute('style');}else if(n==='face'&&el.tagName==='FONT'){if(!/^[a-z0-9 ,"'_-]+$/i.test(a.value))el.removeAttribute(a.name);}else if(n==='size'&&el.tagName==='FONT'){if(!/^[1-7]$/.test(a.value))el.removeAttribute(a.name);}else if(n==='color'&&el.tagName==='FONT'){if(!/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(a.value))el.removeAttribute(a.name);}else el.removeAttribute(a.name);});clean(el);});}
    clean(doc.body);return doc.body.innerHTML||'';
  }
  function render(){
    if(!rich) return;
    const node=document.querySelector('.reading-text');
    if(!node)return;
    const html=safe(rich);
    if(rendered===html && node.dataset.directReadingFix==='1')return;
    node.innerHTML=html;
    node.dataset.directReadingFix='1';
    rendered=html;
  }
  async function load(){
    const id=examId();if(!id)return;
    try{
      const r=await client.rpc('get_reading_exam_for_student',{p_exam_id:id});
      if(r.error) return;
      let d=r.data;if(Array.isArray(d))d=d[0];if(d?.data&&Array.isArray(d.data))d=d.data[0];if(typeof d==='string'){try{d=JSON.parse(d)}catch{}}
      rich=d?.reading_text||d?.reading_passage||d?.passage||d?.reading_content||d?.content||'';
      if(rich)render();
    }catch(e){console.error('Reading direct fix:',e)}
  }
  function boot(){
    const style=document.createElement('style');style.textContent='.reading-text{white-space:normal!important;line-height:1.9}.reading-text p{margin:0 0 14px}.reading-text strong,.reading-text b{font-weight:700!important}.reading-text em,.reading-text i{font-style:italic!important}.reading-text u{text-decoration:underline!important}';document.head.appendChild(style);
    const observer=new MutationObserver(()=>render());if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    load();setInterval(render,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
