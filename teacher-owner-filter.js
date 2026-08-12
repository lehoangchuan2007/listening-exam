/* BƯỚC 12.4d - lọc Dashboard theo giáo viên đang đăng nhập.
   Chèn script này SAU config.js và trước script Dashboard chính.
   Script không thay thế code admin hiện tại.
*/
(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  if(!window.supabase||!cfg.url||!cfg.anonKey) return;

  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  window.TEACHER_OWNER_FILTER={client};

  // Expose the current teacher id for existing admin code.
  window.getCurrentTeacherId=async function(){
    const {data:{session},error}=await client.auth.getSession();
    if(error||!session?.user) return null;
    const {data:profile}=await client
      .from('teacher_profiles')
      .select('user_id,full_name,email')
      .eq('user_id',session.user.id)
      .maybeSingle();
    if(!profile) return null;
    return session.user.id;
  };

  // Replace the common Supabase exams query helper if the page exposes one.
  window.loadTeacherOwnedExams=async function(extraSelect='*'){
    const {data:{session},error:authError}=await client.auth.getSession();
    if(authError) throw authError;
    if(!session?.user) throw new Error('Bạn chưa đăng nhập.');

    const {data:profile,error:profileError}=await client
      .from('teacher_profiles')
      .select('user_id,full_name,email')
      .eq('user_id',session.user.id)
      .maybeSingle();

    if(profileError) throw profileError;
    if(!profile) throw new Error('Tài khoản này không có quyền giáo viên.');

    const {data,error}=await client
      .from('exams')
      .select(extraSelect)
      .eq('owner_id',session.user.id)
      .order('created_at',{ascending:false});

    if(error) throw error;
    return {data:data||[],profile};
  };
})();
