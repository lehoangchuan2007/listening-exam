// English Studio - Explorer visual polish only.
// No data, routing, CRUD, or controller logic lives here.
(function(){
  if(!/manage\.html$/.test(location.pathname)||window.__ENGLISH_STUDIO_UI_POLISH__)return;
  window.__ENGLISH_STUDIO_UI_POLISH__=true;
  const s=document.createElement('style');
  s.id='efwin-polish-css';
  s.textContent=`
    .efwin-shell{border-color:#dbe3ee;box-shadow:0 8px 28px rgba(15,23,42,.06);background:#fff}
    .efwin-side{padding:12px 8px;background:#f8fafc}
    .efwin-side-title{display:flex;align-items:center;gap:6px;padding:10px 12px 9px;font-size:11px;letter-spacing:.08em;color:#64748b}
    .efwin-tree button{min-height:36px;padding-top:8px;padding-bottom:8px;font-size:13.5px}
    .efwin-tree button.active{box-shadow:inset 3px 0 0 #2563eb}
    .efwin-main .efx5{padding:16px 18px}
    .efwin-main .efx5bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0 4px}
    .efwin-main .efx5bar h2{margin:0;font-size:19px;line-height:1.3;font-weight:750;color:#0f172a}
    .efwin-search{margin-bottom:9px}
    .efwin-search input{height:40px;padding-top:9px;padding-bottom:9px;border-color:#dbe3ee;border-radius:10px;background:#fbfdff}
    .efwin-sortbar{min-height:36px;margin-bottom:10px;padding:0 1px}
    .efwin-sortbar label{color:#64748b;font-size:12px}
    .efwin-sortbar select{height:34px;border-color:#dbe3ee;border-radius:8px}
    .efwin-main .efx5panel{border:1px solid #e5eaf1;border-radius:10px;overflow:hidden;background:#fff}
    .efwin-main .efx5head{display:grid;grid-template-columns:34px minmax(0,1fr) 190px 34px;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0;padding:9px 12px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.04em}
    .efwin-main .efx5item{min-height:60px;padding:9px 12px}
    .efwin-main .efx5icon{font-size:25px}
    .efwin-main .efx5name{font-size:14px;color:#1e293b}
    .efwin-main .efx5meta{font-size:12px;color:#64748b}
    .efwin-main .efx5item:hover{background:#f8fbff}
    .efwin-main .efx5item.sel{background:#eff6ff;box-shadow:inset 3px 0 0 #3b82f6}
    .efwin-main .efx5more{opacity:.55}
    .efwin-results{box-shadow:0 8px 20px rgba(15,23,42,.05)}
    .efwin-result{min-height:46px}
    @media(max-width:800px){.efwin-main .efx5head{grid-template-columns:30px minmax(0,1fr) 30px}.efwin-main .efx5item{min-height:56px}}
    @media(max-width:560px){.efwin-main .efx5{padding:12px}.efwin-main .efx5bar{align-items:flex-start}.efwin-main .efx5panel{border-radius:8px}}
  `;
  document.head.appendChild(s);
})();
