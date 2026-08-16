/* English Studio - teacher submission deletion compatibility layer */
(function(){
  if(!/results\.html$/.test(location.pathname)) return;

  const getClient=()=>{
    const c=window.SUPABASE_CONFIG||{};
    if(!window.supabase||!c.url||!c.anonKey) throw new Error('Không kết nối được máy chủ.');
    return window.supabase.createClient(c.url,c.anonKey);
  };

  window.deleteSubmission=window.deleteSubmission||async function(id){
    if(!id) return alert('Không xác định được bài nộp.');
    try{
      const client=getClient();
      const {data,error}=await client.rpc('delete_submission',{p_submission_id:id});
      if(error) throw error;
      if(data!==true) throw new Error('Không thể xóa bài nộp hoặc bạn không có quyền.');
      location.reload();
    }catch(e){alert('❌ Không thể xóa bài nộp: '+(e?.message||e));}
  };

  // The current results.html button calls this global function.
  // Delete only submissions belonging to the currently opened exam.
  window.deleteAllSubmissions=async function(){
    const examId=new URLSearchParams(location.search).get('exam');
    if(!examId) return alert('❌ Không xác định được mã đề.');
    const client=getClient();
    if(!confirm('⚠️ Bạn chắc chắn muốn xóa TẤT CẢ kết quả của đề này?\n\nHành động này không thể hoàn tác.')) return;
    const btn=[...document.querySelectorAll('button')].find(b=>String(b.textContent||'').includes('Xóa tất cả'));
    const old=btn?.textContent;
    try{
      if(btn){btn.disabled=true;btn.textContent='⏳ Đang xóa...';}
      const {data,error}=await client.rpc('delete_exam_submissions',{p_exam_id:examId});
      if(error) throw error;
      const deleted=Number(data||0);
      alert('✅ Đã xóa '+deleted+' bài nộp của đề này.');
      location.reload();
    }catch(e){
      console.error('[results-delete] delete all failed',e);
      alert('❌ Không thể xóa kết quả: '+(e?.message||e));
      if(btn){btn.disabled=false;btn.textContent=old||'🗑️ Xóa tất cả';}
    }
  };

  // Compatibility for cached results pages that still call this name.
  window.deleteSubmissionByIndex=window.deleteSubmissionByIndex||async function(index){
    try{
      const examId=new URLSearchParams(location.search).get('exam');
      if(!examId) return alert('❌ Không xác định được mã đề.');
      const client=getClient();
      const {data,error}=await client.rpc('get_teacher_exam_results',{p_exam_id:examId});
      if(error) throw error;
      const payload=typeof data==='string'?JSON.parse(data):data;
      const row=Array.isArray(payload?.rows)?payload.rows[index]:null;
      if(!row?.id) return alert('❌ Không xác định được bài nộp.');
      await window.deleteSubmission(row.id);
    }catch(e){alert('❌ Không thể xóa bài nộp: '+(e?.message||e));}
  };
})();
