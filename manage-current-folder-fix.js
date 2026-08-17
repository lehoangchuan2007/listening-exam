/* English Studio - preserve current folder during exam creation */
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_CURRENT_FOLDER_BRIDGE__)return;
  window.__ENGLISH_STUDIO_CURRENT_FOLDER_BRIDGE__=true;
  let originalGetState=null;
  function captureFromState(){const api=window.__ENGLISH_STUDIO_EXPLORER_API__;const state=api?.getState?.();window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER=state?.active?String(state.active):null;return window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER}
  function captureFromButton(button){const raw=button?.dataset?.winFolder;if(raw!==undefined){window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER=raw==='root'?null:String(raw);return window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER}const crumb=button?.dataset?.crumb;if(crumb!==undefined){window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER=crumb==='root'?null:String(crumb);return window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER}return captureFromState()}
  function installStateBridge(){const api=window.__ENGLISH_STUDIO_EXPLORER_API__;if(!api||typeof api.getState!=='function'||api.__currentFolderBridgeInstalled)return;if(api.__currentFolderBridgeInstalled)return;originalGetState=api.getState;api.getState=function(){const state=originalGetState();const captured=window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER;return captured!==undefined?{...state,active:captured}:state};api.__currentFolderBridgeInstalled=true;captureFromState()}
  document.addEventListener('click',e=>{const sidebar=e.target.closest('.efwin-tree [data-win-folder]');if(sidebar){captureFromButton(sidebar);return}const crumb=e.target.closest('.efx5crumb [data-crumb]');if(crumb){captureFromButton(crumb);return}const create=e.target.closest('#fx-new,#fx-empty');if(create)captureFromState()},true);
  window.addEventListener('beforeunload',()=>{window.__ENGLISH_STUDIO_NEW_EXAM_FOLDER=undefined});
  const timer=setInterval(()=>{installStateBridge();if(window.__ENGLISH_STUDIO_EXPLORER_API__?.__currentFolderBridgeInstalled)clearInterval(timer)},100);
  installStateBridge();window.__englishStudioFolderCapture=captureFromState;
})();
