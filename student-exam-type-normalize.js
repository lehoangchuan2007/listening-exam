// Student library: normalize exam_type before presentation so icon, badge and filters stay consistent.
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  const normalize=(value)=>String(value??'').trim().toLowerCase();
  const install=()=>{
    if(typeof window.typeIcon==='function'){
      window.typeIcon=(type)=>{const t=normalize(type);return t==='reading'?'📖':t==='writing'?'✍️':t==='mixed'?'🧩':'🎧'};
    }
    if(typeof window.typeName==='function'){
      window.typeName=(type)=>{const t=normalize(type);return ({listening:'🎧 Listening',reading:'📖 Reading',writing:'✍️ Writing',mixed:'🧩 Kết hợp'})[t]||'📄 Không xác định'};
    }
    if(typeof window.typeClass==='function'){
      window.typeClass=(type)=>{const t=normalize(type);return t==='reading'?'reading':t==='writing'?'writing':t==='mixed'?'mixed':'listening'};
    }
    if(typeof window.renderList==='function') window.renderList();
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
