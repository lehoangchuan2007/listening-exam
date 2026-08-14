(function(){
  if(window.__ENGLISH_STUDIO_AUDIO_UI_FIX__) return;
  window.__ENGLISH_STUDIO_AUDIO_UI_FIX__=true;

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,m=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  function bind(){
    if(!/manage\.html$/.test(location.pathname)) return true;
    const input=document.getElementById('audioFile');
    const status=document.getElementById('audioStatus');
    const preview=document.getElementById('audioPreview');
    if(!input||!status) return false;
    if(input.dataset.audioUiFixBound==='1') return true;
    input.dataset.audioUiFixBound='1';

    const update=()=>{
      const file=input.files?.[0];
      if(!file){
        status.textContent='Chưa chọn file';
        if(preview) preview.classList.add('hidden');
        return;
      }
      status.innerHTML='✅ Đã chọn: <b>'+esc(file.name)+'</b> • '+(file.size/1024/1024).toFixed(2)+' MB • sẵn sàng upload';
      if(preview){
        try{
          if(preview.dataset.audioFixUrl) URL.revokeObjectURL(preview.dataset.audioFixUrl);
          const url=URL.createObjectURL(file);
          preview.dataset.audioFixUrl=url;
          preview.src=url;
          preview.classList.remove('hidden');
        }catch(e){ console.warn('Không tạo được audio preview',e); }
      }
    };

    input.addEventListener('change',update,true);
    input.addEventListener('input',update,true);
    return true;
  }

  function start(){
    bind();
    const observer=new MutationObserver(()=>bind());
    if(document.body) observer.observe(document.body,{childList:true,subtree:true});
    setInterval(bind,500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
