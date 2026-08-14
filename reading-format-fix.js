// English Studio - Reading rich-text import + student 2-column layout.
// Keeps Listening unchanged and restores the formatting saved by the Reading editor/importer.
(function(){
  'use strict';
  if(window.__englishStudioReadingFormatFixV3)return;
  window.__englishStudioReadingFormatFixV3=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const attr=(el,n)=>String(el?.getAttribute('w:'+n)||el?.getAttribute(n)||'');
  const has=(r,t)=>!!r?.getElementsByTagNameNS('*',t)[0];

  function sanitize(html){
    const s=String(html??'');
    if(!/<[a-z][\s\S]*>/i.test(s)){
      return esc(s).replace(/\r\n?/g,'\n').replace(/\n/g,'<br>');
    }
    const d=new DOMParser().parseFromString(s,'text/html');
    const allowed=new Set(['P','DIV','BR','SPAN','B','STRONG','I','EM','U','S','STRIKE','UL','OL','LI','H1','H2','H3','H4','H5','H6','FONT','MARK','SUB','SUP']);
    const css=new Set(['font-family','font-size','text-align','font-weight','font-style','text-decoration','color','line-height','background-color']);
    function clean(root){
      Array.from(root.children).forEach(el=>{
        if(!allowed.has(el.tagName)){
          const p=el.parentNode;
          while(el.firstChild)p.insertBefore(el.firstChild,el);
          el.remove();
          return;
        }
        Array.from(el.attributes).forEach(a=>{
          const n=a.name.toLowerCase();
          if(n==='style'){
            const keep=[];
            String(a.value).split(';').forEach(rule=>{
              const [p0,...rest]=rule.split(':');
              const p=String(p0||'').trim().toLowerCase();
              const v=rest.join(':').trim();
              if(!css.has(p)||!v||/[<>]/.test(v)||/javascript\s*:/i.test(v))return;
              if(p==='font-family'&&!/^[a-z0-9 ,"'_-]+$/i.test(v))return;
              if(p==='font-size'&&!/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/.test(v))return;
              if(p==='text-align'&&!/^(left|center|right|justify)$/.test(v))return;
              if(p==='font-weight'&&!/^(normal|bold|[1-9]00)$/.test(v))return;
              if(p==='font-style'&&!/^(normal|italic|oblique)$/.test(v))return;
              if(p==='color'&&!/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(v))return;
              if(p==='background-color'&&!/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(v))return;
              if(p==='text-decoration'&&!/^[a-z -]+$/i.test(v))return;
              if(p==='line-height'&&!/^[0-9.]+(?:px|pt|em|rem|%)?$/.test(v))return;
              keep.push(p+':'+v);
            });
            if(keep.length)el.setAttribute('style',keep.join(';'));else el.removeAttribute('style');
          }else if(n==='face'&&el.tagName==='FONT'){
            if(!/^[a-z0-9 ,"'_-]+$/i.test(a.value))el.removeAttribute(a.name);
          }else if(n==='size'&&el.tagName==='FONT'){
            if(!/^[1-7]$/.test(a.value))el.removeAttribute(a.name);
          }else if(n==='color'&&el.tagName==='FONT'){
            if(!/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(a.value))el.removeAttribute(a.name);
          }else{
            el.removeAttribute(a.name);
          }
        });
        clean(el);
      });
    }
    clean(d.body);
    return d.body.innerHTML||'<p><br></p>';
  }

  function runHtml(run){
    const r=run.getElementsByTagNameNS('*','rPr')[0];
    const c=attr(r?.getElementsByTagNameNS('*','color')[0],'val').replace('#','');
    const sz=Number(attr(r?.getElementsByTagNameNS('*','sz')[0],'val'));
    const f=r?.getElementsByTagNameNS('*','rFonts')[0];
    const font=attr(f,'ascii')||attr(f,'hAnsi')||attr(f,'cs');
    const st=[];
    if(has(r,'b'))st.push('font-weight:700');
    if(has(r,'i'))st.push('font-style:italic');
    if(has(r,'u'))st.push('text-decoration:underline');
    if(has(r,'strike'))st.push('text-decoration:line-through');
    if(/^[0-9a-f]{6}$/i.test(c)&&c.toLowerCase()!=='000000')st.push('color:#'+c);
    if(sz>=10&&sz<=96)st.push('font-size:'+(sz/2)+'pt');
    if(font&&/^[a-z0-9 ,"'_-]+$/i.test(font))st.push('font-family:'+JSON.stringify(font));
    let text='';
    for(const x of Array.from(run.childNodes)){
      const n=x.localName;
      if(n==='t'||n==='instrText')text+=x.textContent||'';
      else if(n==='tab')text+='\t';
      else if(n==='br'||n==='cr')text+='\n';
    }
    if(!text)return'';
    const safe=esc(text.replace(/\u00a0/g,' ')).replace(/\n/g,'<br>').replace(/\t/g,'&emsp;');
    return st.length?'<span style="'+st.join(';')+'">'+safe+'</span>':safe;
  }

  function paraHtml(p){
    const pp=p.getElementsByTagNameNS('*','pPr')[0];
    const jc=pp?.getElementsByTagNameNS('*','jc')[0];
    const a=attr(jc,'val');
    const map={both:'justify',left:'left',center:'center',right:'right',distribute:'justify'};
    const style=map[a]?' style="text-align:'+map[a]+'"':'';
    return '<p'+style+'>'+Array.from(p.getElementsByTagNameNS('*','r')).map(runHtml).join('')+'</p>';
  }

  async function docXml(file){
    if(typeof DecompressionStream!=='function')throw new Error('Trình duyệt không hỗ trợ đọc DOCX trực tiếp.');
    const b=new Uint8Array(await file.arrayBuffer());
    const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
    const EOCD=0x06054b50,C=0x02014b50;
    let e=-1;
    const min=Math.max(0,b.length-0x10000-22);
    for(let i=b.length-22;i>=min;i--){if(v.getUint32(i,true)===EOCD){e=i;break;}}
    if(e<0)throw new Error('File Word không phải DOCX hợp lệ.');
    const cs=v.getUint32(e+12,true),co=v.getUint32(e+16,true),ce=Math.min(b.length,co+cs);
    const dec=new TextDecoder('utf-8');
    let ent=null;
    for(let p=co;p+46<=ce;){
      if(v.getUint32(p,true)!==C)break;
      const m=v.getUint16(p+10,true),size=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true),name=dec.decode(b.slice(p+46,p+46+nl));
      if(name==='word/document.xml'){ent={m,size,lo};break;}
      p+=46+nl+el+cl;
    }
    if(!ent)throw new Error('Không tìm thấy word/document.xml.');
    const lp=ent.lo,nl=v.getUint16(lp+26,true),el=v.getUint16(lp+28,true),start=lp+30+nl+el,compressed=b.slice(start,start+ent.size);
    let out;
    if(ent.m===0)out=compressed;
    else if(ent.m===8){const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));out=new Uint8Array(await new Response(stream).arrayBuffer());}
    else throw new Error('Kiểu nén DOCX không được hỗ trợ.');
    return dec.decode(out);
  }

  function readingHtml(xml){
    const d=new DOMParser().parseFromString(xml,'application/xml');
    if(d.querySelector('parsererror'))throw new Error('File Word không hợp lệ.');
    const ps=Array.from(d.getElementsByTagNameNS('*','p'));
    const q=/^(?:C(?:âu|au)|Question)\s*\d+\s*[.)\-:：]?/i;
    let first=-1;
    for(let i=1;i<ps.length;i++){
      const t=(ps[i].textContent||'').replace(/\u00a0/g,' ').trim();
      if(q.test(t)){first=i;break;}
    }
    if(first<0)return'';
    return ps.slice(1,first).map(paraHtml).join('');
  }

  function studentFix(){
    if(!/student\.html$/.test(location.pathname))return;
    const node=document.querySelector('.reading-text');
    if(!node)return;
    const t=document.createElement('textarea');
    t.innerHTML=node.innerHTML;
    const value=t.value||node.textContent||'';
    if(node.dataset.readingFormatSource===value&&node.dataset.readingFormatDone==='1')return;
    node.innerHTML=sanitize(value);
    node.dataset.readingFormatSource=value;
    node.dataset.readingFormatDone='1';
    node.dataset.richSource=node.textContent||value;
    node.dataset.richRendered='1';
  }

  function studentCss(){
    if(!/student\.html$/.test(location.pathname)||document.getElementById('reading-format-layout-style'))return;
    const s=document.createElement('style');
    s.id='reading-format-layout-style';
    s.textContent=`
      .reading-layout{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(360px,.85fr)!important;gap:16px!important;align-items:stretch!important}
      .reading-pane,.reading-questions{min-width:0!important;height:calc(100vh - 210px)!important;max-height:calc(100vh - 210px)!important;min-height:420px!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}
      .reading-pane{padding:20px 24px!important}.reading-questions{padding:20px!important}
      .reading-text{white-space:normal!important;line-height:1.9!important;font-size:16px!important;overflow-wrap:anywhere!important}
      .reading-text p{margin:0 0 14px!important}.reading-text div{margin:0 0 10px!important}
      .reading-text strong,.reading-text b{font-weight:700!important}.reading-text em,.reading-text i{font-style:italic!important}.reading-text u{text-decoration:underline!important}
      .reading-text ul,.reading-text ol{padding-left:30px!important;margin:8px 0 14px!important}
      .reading-text h1,.reading-text h2,.reading-text h3,.reading-text h4,.reading-text h5,.reading-text h6{margin:0 0 14px!important;line-height:1.35!important}
      .reading-text mark{padding:0 2px!important}.reading-title{font-size:21px!important}
      @media(max-width:850px){.reading-layout{grid-template-columns:1fr!important;gap:12px!important}.reading-pane,.reading-questions{height:55vh!important;max-height:55vh!important;min-height:360px!important;padding:16px!important}.reading-text{font-size:15px!important;line-height:1.8!important}.reading-title{font-size:19px!important}}
      @media(max-width:520px){.reading-pane,.reading-questions{height:58vh!important;max-height:58vh!important;min-height:320px!important}.reading-text{font-size:14px!important;line-height:1.75!important}}
    `;
    document.head.appendChild(s);
  }

  function manageFix(){
    if(!/manage\.html$/.test(location.pathname))return;
    const bind=()=>{
      const b=document.getElementById('readReadingWordBtn');
      if(!b||b.dataset.richWordBound==='1')return;
      b.dataset.richWordBound='1';
      b.addEventListener('click',async e=>{
        e.preventDefault();e.stopImmediatePropagation();
        const f=document.getElementById('readingWord')?.files?.[0];if(!f)return;
        try{
          if(typeof window.readingWordImportHandler==='function')await window.readingWordImportHandler();
          const h=readingHtml(await docXml(f));if(!h)return;
          const t=document.getElementById('creading'),ed=document.getElementById('readingEditor');
          if(t)t.value=sanitize(h);if(ed)ed.innerHTML=sanitize(h);
          if(ed&&t&&typeof window.syncReadingEditor==='function')window.syncReadingEditor();
        }catch(err){console.error('[reading-format-fix]',err)}
      },true);
    };
    bind();
    if(document.body){const o=new MutationObserver(bind);o.observe(document.body,{childList:true,subtree:true});}
  }

  function boot(){
    studentCss();studentFix();manageFix();
    if(document.body){const o=new MutationObserver(()=>{studentFix();manageFix()});o.observe(document.body,{childList:true,subtree:true});}
    setInterval(studentFix,250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
