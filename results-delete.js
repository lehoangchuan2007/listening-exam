/* English Studio - teacher submission deletion */
(function(){
  const path=location.pathname;
  if(!/results\.html$/.test(path))return;

  function getClient(){
    const c=window.SUPABASE_CONFIG||{};
    if(!window.supabase||!c.url||!c.anonKey)return null;
    return window.supabase.createClient(c.url,c.anonKey);
  }

  function install(){
    if(typeof window.render!=='function')return false;
    if(typeof window.deleteSubmission==='function')return true;

    window.deleteSubmission=async function(id){
      if(!id){alert('Không xác định được bài nộp.');return;}
      const row=(window.rows||[]).find(r=>String(r.id)===String(id));
      const name=row?.student_name||row?.full_name||row?.name||row?.student_email||'sinh viên này';
      const ok=confirm(`⚠️ Bạn có chắc muốn xóa bài nộp của ${name}?\n\nThao tác này sẽ xóa kết quả khỏi hệ thống và sinh viên cũng sẽ không còn thấy bài nộp này.`);
      if(!ok)return;

      const sbClient=getClient();
      if(!sbClient){alert('Không kết nối được máy chủ.');return;}

      const {error}=await sbClient.from('submissions').delete().eq('id',id);
      if(error){
        console.error('Delete submission failed:',error);
        alert('❌ Không thể xóa bài nộp: '+error.message);
        return;
      }

      window.rows=(window.rows||[]).filter(r=>String(r.id)!==String(id));
      if(typeof window.closeDetail==='function')window.closeDetail();
      window.render();
      alert('✅ Đã xóa bài nộp thành công.');
    };

    // Add a delete button to every result row after the existing Xem bài button.
    const originalRender=window.render;
    window.render=function(){
      const result=originalRender.apply(this,arguments);
      const tbody=document.getElementById('tbody');
      if(!tbody)return result;
      tbody.querySelectorAll('tr').forEach(tr=>{
        const viewBtn=tr.querySelector('button[onclick*="viewSubmission"]');
        if(!viewBtn||tr.querySelector('.delete-submission-btn'))return;
        const match=(viewBtn.getAttribute('onclick')||'').match(/viewSubmission\(['"]([^'"]+)['"]\)/);
        if(!match)return;
        const id=match[1];
        const cell=viewBtn.parentElement;
        const del=document.createElement('button');
        del.className='btn delete-submission-btn';
        del.style.marginLeft='6px';
        del.style.background='#dc2626';
        del.textContent='🗑️ Xóa';
        del.type='button';
        del.addEventListener('click',()=>window.deleteSubmission(id));
        cell.appendChild(del);
      });
      return result;
    };
    return true;
  }

  function start(){
    if(install())return;
    const timer=setInterval(()=>{if(install())clearInterval(timer);},100);
    setTimeout(()=>clearInterval(timer),10000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
