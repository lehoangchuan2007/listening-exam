/* English Studio - teacher submission deletion */
(function(){
  if(!/results\.html$/.test(location.pathname))return;

  function getClient(){
    const c=window.SUPABASE_CONFIG||{};
    return window.supabase&&c.url&&c.anonKey?window.supabase.createClient(c.url,c.anonKey):null;
  }

  async function deleteSubmission(id){
    if(!id)return alert('Không xác định được bài nộp.');
    if(!confirm('⚠️ Bạn có chắc muốn xóa bài nộp này?\n\nBài làm và kết quả này cũng sẽ không còn xuất hiện ở trang sinh viên.'))return;
    const client=getClient();
    if(!client)return alert('Không kết nối được máy chủ.');
    const {data,error}=await client.rpc('delete_submission',{p_submission_id:id});
    if(error){console.error(error);alert('❌ Không thể xóa bài nộp: '+error.message);return;}
    if(data!==true){alert('❌ Không thể xóa bài nộp hoặc bài này không thuộc đề của bạn.');return;}
    alert('✅ Đã xóa bài nộp thành công.');
    location.reload();
  }

  async function deleteAll(){
    const examId=new URLSearchParams(location.search).get('exam')||'';
    if(!examId)return alert('Không xác định được đề thi.');
    if(!confirm('⚠️ XÓA TẤT CẢ BÀI NỘP CỦA ĐỀ NÀY?\n\nToàn bộ bài đã nộp của sinh viên trong ĐỀ NÀY sẽ bị xóa.\nCác đề khác và bản thân đề này KHÔNG bị xóa.\n\nThao tác này không thể hoàn tác.'))return;
    const typed=prompt('Để xác nhận, nhập chính xác: XOA TAT CA');
    if(typed!=='XOA TAT CA')return alert('❌ Xác nhận không đúng. Chưa xóa bài nào.');
    const client=getClient();
    if(!client)return alert('Không kết nối được máy chủ.');
    const {data,error}=await client.rpc('delete_exam_submissions',{p_exam_id:examId});
    if(error){console.error(error);alert('❌ Không thể xóa các bài nộp: '+error.message);return;}
    alert(`✅ Đã xóa ${Number(data)||0} bài nộp của đề này.`);
    location.reload();
  }

  function addDeleteAllButton(){
    const title=[...document.querySelectorAll('h3')].find(h=>/Danh sách kết quả/i.test(h.textContent||''));
    if(!title)return false;
    const row=title.parentElement;
    if(!row)return false;
    if(row.querySelector('#deleteAllSubmissionsBtn'))return true;
    const btn=document.createElement('button');
    btn.id='deleteAllSubmissionsBtn';btn.className='btn';btn.type='button';
    btn.style.background='#b91c1c';btn.textContent='🗑️ Xóa tất cả';
    btn.addEventListener('click',deleteAll);row.appendChild(btn);
    return true;
  }

  function addDeleteButtons(){
    document.querySelectorAll('#tbody button').forEach(viewBtn=>{
      if(!/Xem bài/i.test(viewBtn.textContent||''))return;
      const cell=viewBtn.parentElement;
      if(!cell||cell.querySelector('.delete-submission-btn'))return;
      const onclick=viewBtn.getAttribute('onclick')||'';
      const match=onclick.match(/viewSubmission\(['"]([^'"]+)['"]\)/);
      if(!match)return;
      const del=document.createElement('button');
      del.className='btn delete-submission-btn';del.type='button';
      del.style.marginLeft='6px';del.style.background='#dc2626';
      del.textContent='🗑️ Xóa';
      del.addEventListener('click',()=>deleteSubmission(match[1]));
      cell.appendChild(del);
    });
  }

  function install(){
    window.deleteSubmission=deleteSubmission;
    window.deleteAllSubmissions=deleteAll;
    addDeleteAllButton();
    addDeleteButtons();
  }

  const observer=new MutationObserver(install);
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
