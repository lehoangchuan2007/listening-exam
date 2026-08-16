// English Studio - File Explorer v5 move dialog click fix
(function(){
  if(!/manage\.html$/.test(location.pathname))return;
  const cfg=window.SUPABASE_CONFIG||{};
  const db=supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let busy=false;

  document.addEventListener('click',async function(e){
    const btn=e.target.closest('.efx5modal .efx5tree button[data-tree]');
    if(!btn||busy)return;

    const modal=btn.closest('.efx5modal');
    const title=modal?.querySelector('h3')?.textContent||'';
    // The v5 chooseFolder() creates folder buttons with data-tree,
    // but its click handler only listens for data-pick. Therefore
    // clicking a real destination folder previously did nothing.
    if(!/Di chuyển/.test(title))return;

    const ids=[...document.querySelectorAll('.efx5item[data-exam] input[data-check]:checked')]
      .map(x=>x.dataset.check).filter(Boolean);
    if(!ids.length)return; // Folder movement is still handled by v5 itself.

    e.preventDefault();
    e.stopPropagation();
    busy=true;
    btn.disabled=true;

    try{
      const session=await db.auth.getSession();
      const uid=session.data?.session?.user?.id;
      if(!uid)throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');

      const folderId=btn.dataset.tree||null;
      const result=await db.from('exams')
        .update({folder_id:folderId})
        .in('id',ids)
        .eq('owner_id',uid)
        .select('id,folder_id');

      if(result.error)throw result.error;
      const moved=result.data?.length||0;
      if(moved!==ids.length){
        throw new Error(`Chỉ di chuyển được ${moved}/${ids.length} đề. Có thể đề không thuộc tài khoản giáo viên hiện tại hoặc RLS đang chặn cập nhật.`);
      }

      modal.remove();
      location.reload();
    }catch(err){
      alert('❌ Di chuyển thất bại: '+(err?.message||err));
      btn.disabled=false;
      busy=false;
    }
  },true);
})();
