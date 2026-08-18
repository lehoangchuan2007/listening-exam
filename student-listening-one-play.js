/* English Studio - Listening one-play mode
   Keeps the existing exam flow intact and only controls the Listening audio.
*/
(function(){
  if(!/student\.html$/.test(location.pathname)) return;
  if(window.__ENGLISH_STUDIO_LISTENING_ONE_PLAY__) return;
  window.__ENGLISH_STUDIO_LISTENING_ONE_PLAY__=true;

  const KEY_PREFIX='english_studio_listening_played_v1:';
  let boundAudio=null;
  let examId='';
  let identity='guest';
  let active=false;
  let completed=false;
  let startOverlay=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const isListening=()=>{
    const t=String(window.exam?.exam_type||window.exam?.type||'').toLowerCase();
    return t==='listening' || !!document.querySelector('audio');
  };
  const getExamId=()=>String(window.exam?.id||new URLSearchParams(location.search).get('exam')||location.hash.replace(/^#exam=/,'')||'').trim();

  async function getIdentity(){
    try{
      const client=window.STUDENT_AUTH_CLIENT;
      if(client){
        const r=await client.auth.getSession();
        const u=r.data?.session?.user;
        if(u) return String(u.id||u.email||u.user_metadata?.student_id||'user');
      }
    }catch(e){ console.warn('Listening one-play identity:',e); }
    return String(localStorage.getItem('english_studio_student_id')||'guest');
  }

  function storageKey(){return KEY_PREFIX+examId+':'+identity;}
  function wasPlayed(){try{return localStorage.getItem(storageKey())==='1'}catch{return false}}
  function markPlayed(){try{localStorage.setItem(storageKey(),'1')}catch(e){console.warn('Listening one-play storage:',e)}}

  function style(){
    if(document.getElementById('esListeningOnePlayStyle')) return;
    const s=document.createElement('style');
    s.id='esListeningOnePlayStyle';
    s.textContent=`
      .es-listening-gate{position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)}
      .es-listening-gate-card{width:min(480px,100%);background:#fff;border-radius:20px;padding:28px;box-shadow:0 24px 70px rgba(15,23,42,.3);text-align:center}
      .es-listening-gate-icon{font-size:46px;margin-bottom:8px}.es-listening-gate-card h2{margin:0 0 10px;color:#0f172a}.es-listening-gate-card p{color:#64748b;line-height:1.6;margin:8px 0 18px}.es-listening-start{border:0;border-radius:12px;padding:13px 20px;background:#2563eb;color:#fff;font-weight:900;font-size:16px;cursor:pointer}.es-listening-start:disabled{opacity:.55;cursor:not-allowed}
      .es-listening-once{margin:8px 0;padding:10px 12px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:10px;font-size:13px;font-weight:750}
      .es-listening-locked{margin:8px 0;padding:10px 12px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:10px;font-size:13px;font-weight:800}
    `;
    document.head.appendChild(s);
  }

  function removeGate(){startOverlay?.remove();startOverlay=null}

  function createGate(audio){
    style();
    removeGate();
    startOverlay=document.createElement('div');
    startOverlay.className='es-listening-gate';
    startOverlay.innerHTML=`<div class="es-listening-gate-card"><div class="es-listening-gate-icon">🎧</div><h2>Bắt đầu bài Listening</h2><p>Audio sẽ tự động phát sau khi bạn bấm bắt đầu và <b>chỉ được nghe một lần</b>.</p><button type="button" class="es-listening-start">▶️ Bắt đầu nghe</button></div>`;
    document.body.appendChild(startOverlay);
    const btn=startOverlay.querySelector('.es-listening-start');
    btn.onclick=async()=>{
      btn.disabled=true;
      markPlayed();
      active=true;
      try{
        audio.currentTime=0;
        await audio.play();
        removeGate();
      }catch(e){
        active=false;
        btn.disabled=false;
        alert('Trình duyệt chưa cho phép phát audio. Hãy bấm lại “Bắt đầu nghe”.');
      }
    };
  }

  function lockAudio(audio){
    audio.controls=false;
    audio.autoplay=false;
    audio.preload='auto';
    audio.removeAttribute('controlslist');
    audio.setAttribute('aria-label','Audio Listening - chỉ nghe một lần');
    audio.addEventListener('play',()=>{
      if(!active){
        audio.pause();
        audio.currentTime=0;
        return;
      }
      if(!completed) markPlayed();
    },true);
    audio.addEventListener('playing',()=>{if(!active){audio.pause();return}},{capture:true});
    audio.addEventListener('pause',()=>{
      if(active && !completed){
        // Do not allow manual pause during the one allowed playback.
        setTimeout(()=>{if(active&&!completed){try{audio.play().catch(()=>{})}catch{}}},0);
      }
    },true);
    audio.addEventListener('seeking',()=>{
      if(!active){audio.currentTime=0;return}
      if(audio.currentTime>audio.dataset.esLastTime*1+0.5) audio.currentTime=Number(audio.dataset.esLastTime||0);
    },true);
    audio.addEventListener('timeupdate',()=>{
      if(active&&!completed) audio.dataset.esLastTime=String(audio.currentTime||0);
    },true);
    audio.addEventListener('ended',()=>{
      completed=true;
      active=false;
      markPlayed();
      audio.pause();
      audio.controls=false;
      const msg=document.createElement('div');
      msg.className='es-listening-once';
      msg.textContent='✅ Đã nghe xong. Audio này không thể phát lại.';
      audio.insertAdjacentElement('afterend',msg);
    },true);
    audio.addEventListener('contextmenu',e=>e.preventDefault());
    audio.addEventListener('volumechange',()=>{},true);
  }

  async function bind(){
    if(!isListening()) return;
    const audio=document.querySelector('audio');
    const id=getExamId();
    if(!audio||!id) return;
    if(audio===boundAudio && examId===id) return;
    boundAudio=audio;
    examId=id;
    identity=await getIdentity();
    completed=false;
    active=false;
    lockAudio(audio);

    if(wasPlayed()){
      completed=true;
      audio.controls=false;
      audio.autoplay=false;
      audio.pause();
      audio.currentTime=0;
      style();
      const msg=document.createElement('div');
      msg.className='es-listening-locked';
      msg.textContent='🔒 Bạn đã sử dụng lượt nghe của bài này. Audio không thể phát lại.';
      audio.insertAdjacentElement('afterend',msg);
      return;
    }
    createGate(audio);
  }

  function start(){
    bind();
    const observer=new MutationObserver(()=>bind());
    if(document.body) observer.observe(document.body,{childList:true,subtree:true});
    setInterval(bind,700);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
