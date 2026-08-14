// English Studio - preserve paragraph alignment from DOCX Reading imports.
// Works alongside the existing Reading Word importer without touching Listening.
(function(){
  if(window.__ENGLISH_STUDIO_READING_ALIGNMENT_FIX__) return;
  window.__ENGLISH_STUDIO_READING_ALIGNMENT_FIX__=true;

  const $=id=>document.getElementById(id);
  let lastSignature='';

  function clean(s){return String(s??'').replace(/\u00a0/g,' ').replace(/[\u200b\ufeff]/g,'').replace(/\s+/g,' ').trim();}

  async function readDocumentXml(file){
    if(!file||typeof DecompressionStream!=='function') return null;
    const bytes=new Uint8Array(await file.arrayBuffer());
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const EOCD=0x06054b50,CENTRAL=0x02014b50,LOCAL=0x04034b50;
    let eocd=-1; const min=Math.max(0,bytes.length-0x10000-22);
    for(let i=bytes.length-22;i>=min;i--){if(view.getUint32(i,true)===EOCD){eocd=i;break;}}
    if(eocd<0) return null;
    const centralSize=view.getUint32(eocd+12,true),centralOffset=view.getUint32(eocd+16,true),centralEnd=Math.min(bytes.length,centralOffset+centralSize);
    const decoder=new TextDecoder('utf-8'); let entry=null;
    for(let pos=centralOffset;pos+46<=centralEnd;){
      if(view.getUint32(pos,true)!==CENTRAL) break;
      const method=view.getUint16(pos+10,true),compressedSize=view.getUint32(pos+20,true),nameLen=view.getUint16(pos+28,true),extraLen=view.getUint16(pos+30,true),commentLen=view.getUint16(pos+32,true),localOffset=view.getUint32(pos+42,true);
      const name=decoder.decode(bytes.slice(pos+46,pos+46+nameLen));
      if(name==='word/document.xml'){entry={method,compressedSize,localOffset};break;}
      pos+=46+nameLen+extraLen+commentLen;
    }
    if(!entry) return null;
    const lp=entry.localOffset;if(lp+30>bytes.length||view.getUint32(lp,true)!==LOCAL)return null;
    const nameLen=view.getUint16(lp+26,true),extraLen=view.getUint16(lp+28,true),start=lp+30+nameLen+extraLen,end=start+entry.compressedSize;
    if(end>bytes.length)return null;
    const compressed=bytes.slice(start,end);let output;
    if(entry.method===0) output=compressed;
    else if(entry.method===8){const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));output=new Uint8Array(await new Response(stream).arrayBuffer());}
    else return null;
    return new TextDecoder('utf-8').decode(output);
  }

  function getParagraphs(xml){
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.querySelector('parsererror')) return [];
    return Array.from(doc.getElementsByTagNameNS('*','p')).map(p=>{
      const text=clean(Array.from(p.getElementsByTagNameNS('*','t')).map(n=>n.textContent||'').join(''));
      const pPr=p.getElementsByTagNameNS('*','pPr')[0];
      const jc=pPr?.getElementsByTagNameNS('*','jc')[0];
      const raw=String(jc?.getAttribute('w:val')||jc?.getAttribute('val')||'').toLowerCase();
      const align={left:'left',center:'center',right:'right',both:'justify',distribute:'justify',justify:'justify'}[raw]||'';
      return {text,align};
    }).filter(x=>x.text);
  }

  function isQuestion(text){return /^C(?:âu|au)\s*\d+\s*[.)\-:：]?/i.test(text)||/^Question\s*\d+\s*[.)\-:：]?/i.test(text)||/^\d+\s*[.)\-:：]\s*/.test(text);}

  async function applyAlignment(){
    if(String($('ct')?.value||'').toLowerCase()!=='reading') return;
    const file=$('readingWord')?.files?.[0];
    const editor=$('readingEditor');
    if(!file||!editor) return;
    const xml=await readDocumentXml(file);if(!xml)return;
    const paragraphs=getParagraphs(xml);if(!paragraphs.length)return;
    const firstQ=paragraphs.findIndex((p,i)=>i>0&&isQuestion(p.text));
    const reading=firstQ<0?paragraphs.slice(1):paragraphs.slice(1,firstQ);
    const htmlParagraphs=Array.from(editor.querySelectorAll(':scope > p'));
    if(!htmlParagraphs.length)return;
    const signature=file.name+'|'+file.size+'|'+paragraphs.map(p=>p.align).join(',');
    if(signature===lastSignature)return;
    let changed=false;
    reading.forEach((p,i)=>{
      const target=htmlParagraphs[i];
      if(!target||!p.align)return;
      if(target.style.textAlign!==p.align){target.style.textAlign=p.align;changed=true;}
    });
    if(changed){
      const hidden=$('creading');
      if(typeof window.syncReadingEditor==='function') window.syncReadingEditor();
      else if(hidden) hidden.value=editor.innerHTML;
    }
    lastSignature=signature;
  }

  function boot(){
    const observer=new MutationObserver(()=>setTimeout(()=>applyAlignment().catch(console.error),100));
    if(document.body) observer.observe(document.body,{childList:true,subtree:true});
    setInterval(()=>applyAlignment().catch(()=>{}),700);
    setTimeout(()=>applyAlignment().catch(()=>{}),500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
