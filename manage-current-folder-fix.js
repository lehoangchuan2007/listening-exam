/* English Studio - preserve current folder during exam creation */
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  function capture(){
    const crumb=document.querySelector('.efx5crumb');
    if(!crumb){window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER=null;return}
    const buttons=[...crumb.querySelectorAll('button[data-crumb]')];
    const last=buttons[buttons.length-1];
    const id=last?.dataset?.crumb;
    window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER=id&&id!=='root'?id:null;
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('#fx-new,#fx-empty');
    if(b)capture();
  },true);
  window.addEventListener('beforeunload',()=>{window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER=null});
  setTimeout(capture,300);
  window.__englishStudioFolderCapture=capture;
})();
