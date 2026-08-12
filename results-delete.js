/* English Studio - teacher submission deletion */
(function(){
  if(!/results\.html$/.test(location.pathname))return;

  const client=(()=>{const c=window.SUPABASE_CONFIG||{};return window.supabase&&c.url&&c.anonKey?window.supabase.createClient(c.url,c.anonKey):null;})();
  if(!client)return;

  async function deleteSubmission(id){
    if(!id)return alert('Không xác định được bài nộp.');
    if(!confirm('⚠️ Bạn có chắc muốn xóa bài nộp này?\n\nBài làm và kết quả này cũng sẽ không còn xuất hiện ở trang sinh viên.'))return;

    const {data,error}=await client.rpc('delete_submission',{p_submission_id:id});
    if(error){console.error(error);alert('❌ Không thể xóa bài nộp: '+error.message);return;}
    if(data!==true){alert('❌ Không thể xóa bài nộp hoặc bài này không thuộc đề của bạn.');return;}

    if(Array.isArray(window.rows))window.rows=window.rows.filter(r=>String(r.id)!==String(id));
    if(typeof window.closeDetail==='function')window.closeDetail();
    if(typeof window.render==='function')window.render();
    else location.reload();
    alert('✅ Đã xóa bài nộp thành công.');
  }

  async function deleteAll(){
    const examId=new URLSearchParams(location.search).get('exam')||'';
    if(!examId)return alert('Không xác định được đề thi.');

    // Không dùng SELECT COUNT ở client vì quyền RLS có thể làm COUNT trả 0
    // dù danh sách kết quả đang hiển thị bình thường. RPC sẽ tự kiểm tra quyền
    // và trả về số dòng thực sự đã xóa.
    if(!confirm('⚠️ XÓA TẤT CẢ BÀI NỘP CỦA ĐỀ NÀY?\n\nToàn bộ kết quả của đề này sẽ bị xóa và sinh viên sẽ không còn thấy các bài nộp đó.\n\nThao tác này không thể hoàn tác.'))return;

    const typed=prompt('Để xác nhận, nhập chính xác: XOA TAT CA');
    if(typed!=='XOA TAT CA')return alert('❌ Xác nhận không đúng. Chưa xóa bài nào.');

    const {data,error}=await client.rpc('delete_exam_submissions',{p_exam_id:examId});
    if(error){console.error(error);alert('❌ Không thể xóa các bài nộp: '+error.message);return;}

    if(Array.isArray(window.rows))window.rows=[];
    if(typeof window.closeDetail==='function')window.closeDetail();
    if(typeof window.render==='function')window.render();
    else location.reload();
    alert(`✅ Đã xóa ${Number(data)||0} bài nộp thành công.`);
  }

  function addDeleteAllButton(){
    const title=[...document.querySelectorAll('h3')].find(h=>/Danh sách kết quả/i.test(h.textContent||''));
    if(!title)return;
    const row=title.parentElement;
    if(!row||row.querySelector('#deleteAllSubmissionsBtn'))return;
    const btn=document.createElement('button');
    btn.id='deleteAllSubmissionsBtn';btn.className='btn';btn.type='button';
    btn.style.background='#b91c1c';btn.textContent='🗑️ Xóa tất cả';
    btn.onclick=deleteAll;row.appendChild(btn);
  }

  function addDeleteButtons(){
    const buttons=[...document.querySelectorAll('#tbody button')].filter(b=>/Xem bài/i.test(b.textContent||''));
    buttons.forEach(viewBtn=>{
      const cell=viewBtn.parentElement;
      if(!cell||cell.querySelector('.delete-submission-btn'))return;
      const onclick=viewBtn.getAttribute('onclick')||'';
      const match=onclick.match(/viewSubmission\(['"]([^'"]+)['"]\)/);
      if(!match)return;
      const id=match[1];
      const del=document.createElement('button');
      del.className='btn delete-submission-btn';del.type='button';
      del.style.marginLeft='6px';del.style.background='#dc2626';
      del.textContent='🗑️ Xóa';
      del.onclick=()=>deleteSubmission(id);
      cell.appendChild(del);
    });
  }

  function install(){
    window.deleteSubmission=deleteSubmission;
    window.deleteAllSubmissions=deleteAll;
    addDeleteAllButton();
    addDeleteButtons();
  }

  const observer=new MutationObserver(()=>install());
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
