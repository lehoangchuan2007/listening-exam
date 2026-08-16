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

    /* Exam rows: title is the primary element; metadata sits cleanly underneath. */
    .efwin-main .efx5panel{border:1px solid #e5eaf1;border-radius:12px;overflow:hidden;background:#fff}
    .efwin-main .efx5head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;border-bottom:1px solid #e2e8f0;padding:10px 16px;background:#f8fafc;color:#475569;font-size:12px}
    .efwin-main .efx5head b{font-size:13px;color:#334155}
    .efwin-main .efx5grid{display:flex;flex-direction:column;gap:0;padding:0;background:#fff}

    /* Folder items remain compact File Explorer rows. */
    .efwin-main .efx5item[data-folder]{display:grid;grid-template-columns:46px minmax(0,1fr) 190px 34px;align-items:center;gap:12px;min-height:64px;padding:9px 14px;border:0;border-bottom:1px solid #edf1f5;border-radius:0;background:#fff}

    /* Actual exam items get a two-line hierarchy: icon | title | actions, then metadata under title. */
    .efwin-main .efx5item[data-exam]{display:grid;grid-template-columns:52px minmax(0,1fr) 36px;grid-template-rows:auto auto;align-items:center;column-gap:12px;row-gap:3px;min-height:78px;padding:10px 14px;border:0;border-bottom:1px solid #edf1f5;border-radius:0;background:#fff;transition:background .14s ease,box-shadow .14s ease}
    .efwin-main .efx5item[data-exam]:last-child{border-bottom:0}
    .efwin-main .efx5item[data-exam]:hover{background:#f8fbff;box-shadow:inset 3px 0 0 #bfdbfe}
    .efwin-main .efx5item[data-exam].sel{background:#eff6ff;box-shadow:inset 3px 0 0 #2563eb}
    .efwin-main .efx5item[data-exam] .efx5icon{grid-column:1;grid-row:1 / span 2;width:44px;height:44px;display:flex;align-items:center;justify-content:center;padding:0!important;border:1px solid #dbe5f0;border-radius:11px;background:#eaf2ff;font-size:23px;line-height:1}
    .efwin-main .efx5item[data-exam] .efx5name{grid-column:2;grid-row:1;margin:0;padding:0 6px 0 0;font-size:15px;line-height:1.35;font-weight:750;color:#172033;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;word-break:normal;min-width:0}
    .efwin-main .efx5item[data-exam] .efx5meta{grid-column:2;grid-row:2;margin:0;padding:0;color:#64748b;font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .efwin-main .efx5item[data-exam] .efx5more{grid-column:3;grid-row:1 / span 2;position:static;justify-self:end;width:32px;height:32px;border:1px solid transparent;background:transparent;border-radius:8px;opacity:.42;transition:opacity .12s,background .12s,border-color .12s;cursor:pointer}
    .efwin-main .efx5item[data-exam]:hover .efx5more,.efwin-main .efx5item[data-exam] .efx5more:focus{opacity:1;background:#f1f5f9;border-color:#e2e8f0}
    .efwin-main .efx5item[data-exam] .efx5check{position:absolute;left:8px;top:8px;width:15px;height:15px;z-index:2;accent-color:#2563eb;cursor:pointer}

    .efwin-main .efx5icon{font-size:25px}
    .efwin-main .efx5item[data-folder] .efx5icon{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:11px;background:#fff7d6}
    .efwin-main .efx5name{margin:0;padding-right:8px;font-size:14px;line-height:1.35;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .efwin-main .efx5meta{margin:0;font-size:12px;line-height:1.35;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .efwin-main .efx5empty{text-align:center;padding:56px 20px;color:#64748b}
    .efwin-results{box-shadow:0 8px 20px rgba(15,23,42,.05)}
    .efwin-result{min-height:46px}
    @media(max-width:800px){
      .efwin-main .efx5item[data-folder]{grid-template-columns:42px minmax(0,1fr) 34px}
      .efwin-main .efx5item[data-exam]{grid-template-columns:46px minmax(0,1fr) 32px;min-height:72px;padding:9px 11px;column-gap:10px}
      .efwin-main .efx5item[data-exam] .efx5icon{width:40px;height:40px;font-size:21px}
      .efwin-main .efx5item[data-exam] .efx5meta{display:block}
    }
    @media(max-width:560px){
      .efwin-main .efx5{padding:12px}
      .efwin-main .efx5bar{align-items:flex-start}
      .efwin-main .efx5panel{border-radius:9px}
      .efwin-main .efx5item[data-exam]{grid-template-columns:42px minmax(0,1fr) 30px;gap:8px;min-height:68px;padding:8px 10px}
      .efwin-main .efx5item[data-exam] .efx5icon{width:38px;height:38px;font-size:20px}
      .efwin-main .efx5item[data-exam] .efx5name{font-size:14px}
    }
  `;
  document.head.appendChild(s);
})();
