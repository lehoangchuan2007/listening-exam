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

    /* Folder/exam items: icon + title/meta as a real two-line file row. */
    .efwin-main .efx5panel{border:1px solid #e5eaf1;border-radius:12px;overflow:hidden;background:#fff}
    .efwin-main .efx5head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;border-bottom:1px solid #e2e8f0;padding:10px 16px;background:#f8fafc;color:#475569;font-size:12px}
    .efwin-main .efx5head b{font-size:13px;color:#334155}
    .efwin-main .efx5grid{display:flex;flex-direction:column;gap:0;padding:0;background:#fff}
    .efwin-main .efx5item{display:grid;grid-template-columns:46px minmax(0,1fr) 34px;grid-template-rows:auto auto;align-items:center;column-gap:12px;row-gap:2px;min-height:70px;padding:10px 14px;border:0;border-bottom:1px solid #edf1f5;border-radius:0;background:#fff;transition:background .12s ease,box-shadow .12s ease;box-sizing:border-box}
    .efwin-main .efx5item:last-child{border-bottom:0}
    .efwin-main .efx5item:hover{background:#f8fbff;box-shadow:inset 3px 0 0 #bfdbfe}
    .efwin-main .efx5item.sel{background:#eff6ff;box-shadow:inset 3px 0 0 #2563eb}
    .efwin-main .efx5icon{grid-column:1;grid-row:1 / span 2;width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:11px;font-size:25px;line-height:1;background:#f1f5f9}
    .efwin-main .efx5item[data-folder] .efx5icon{background:#fff7d6}
    .efwin-main .efx5item[data-exam] .efx5icon{background:#eaf2ff}
    .efwin-main .efx5name{grid-column:2;grid-row:1;margin:0;padding:0 8px 0 0;font-size:14px;line-height:1.35;font-weight:750;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .efwin-main .efx5meta{grid-column:2;grid-row:2;margin:0;font-size:12px;line-height:1.3;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .efwin-main .efx5item[data-exam] .efx5meta{display:inline-block;width:max-content;max-width:100%;padding:3px 8px;border-radius:7px;background:#f8fafc;border:1px solid #eef2f7;text-align:left;box-sizing:border-box}
    .efwin-main .efx5more{grid-column:3;grid-row:1 / span 2;position:static;justify-self:center;width:32px;height:32px;border:1px solid transparent;background:transparent;border-radius:8px;opacity:.5;transition:opacity .12s,background .12s,border-color .12s;cursor:pointer}
    .efwin-main .efx5item:hover .efx5more,.efwin-main .efx5more:focus{opacity:1;background:#f1f5f9;border-color:#e2e8f0}
    .efwin-main .efx5check{position:absolute;left:9px;top:9px;width:16px;height:16px;accent-color:#2563eb;cursor:pointer;z-index:2}
    .efwin-main .efx5item[data-exam]{padding-left:62px}
    .efwin-main .efx5item[data-exam] .efx5icon{grid-column:1;grid-row:1 / span 2}
    .efwin-main .efx5empty{text-align:center;padding:56px 20px;color:#64748b}
    .efwin-results{box-shadow:0 8px 20px rgba(15,23,42,.05)}
    .efwin-result{min-height:46px}
    @media(max-width:800px){
      .efwin-main .efx5item{grid-template-columns:42px minmax(0,1fr) 34px;min-height:64px;padding:8px 11px}
      .efwin-main .efx5item[data-exam]{padding-left:54px}
      .efwin-main .efx5item .efx5meta{display:block}
      .efwin-main .efx5icon{width:38px;height:38px;font-size:22px}
    }
    @media(max-width:560px){
      .efwin-main .efx5{padding:12px}
      .efwin-main .efx5bar{align-items:flex-start}
      .efwin-main .efx5panel{border-radius:9px}
      .efwin-main .efx5item{grid-template-columns:40px minmax(0,1fr) 32px;gap:9px}
      .efwin-main .efx5item[data-exam]{padding-left:50px}
    }
  `;
  document.head.appendChild(s);
})();
