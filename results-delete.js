/* English Studio - teacher submission deletion compatibility layer */
/*
   The current results.html renders its own delete controls and calls the
   unified Supabase RPCs directly. This file intentionally does not inject
   extra buttons, otherwise the page would show duplicate "Xóa tất cả" buttons.
*/
(function(){
  if(!/results\.html$/.test(location.pathname)) return;

  // Keep legacy global names available for older cached pages, but do not
  // inject any UI. The current page owns all delete buttons.
  window.deleteSubmission = window.deleteSubmission || (async function(id){
    if(!id) return alert('Không xác định được bài nộp.');
    const c=window.SUPABASE_CONFIG||{};
    if(!window.supabase||!c.url||!c.anonKey) return alert('Không kết nối được máy chủ.');
    const client=window.supabase.createClient(c.url,c.anonKey);
    const {data,error}=await client.rpc('delete_submission',{p_submission_id:id});
    if(error) return alert('❌ Không thể xóa bài nộp: '+error.message);
    if(data!==true) return alert('❌ Không thể xóa bài nộp.');
    location.reload();
  });
})();
