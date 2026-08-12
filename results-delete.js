/* English Studio - teacher submission deletion */
(function(){
  if(!/results\.html$/.test(location.pathname))return;

  function getClient(){
    const c=window.SUPABASE_CONFIG||{};
    if(!window.supabase||!c.url||!c.anonKey)return null;
    return window.supabase.createClient(c.url,c.anonKey);
  }

  async function deleteSubmission(id){
    if(!id){alert('Không xác định được bài nộp.');return;}
    const row=(window.rows||[]).find(r=>String(r.id)===String(id));
    const name=row?.student_name||row?.full_name||row?.name||row?.student_email||'sinh viên này';
    if(!confirm(`⚠️ Bạn có chắc muốn xóa bài nộp của ${name}?\n\nBài làm và kết quả này cũng sẽ không còn xuất hiện ở trang sinh viên.`))return;

    const client=getClient();
    if(!client){alert('Không kết nối được máy chủ.');return;}

    const {data,error}=await client.rpc('delete_submission',{p_submission_id:id});
    if(error){
      console.error('Delete submission failed:',error);
      alert('❌ Không thể xóa bài nộp: '+error.message);
      return;
    }
    if(data!==true){alert('❌ Không thể xóa bài nộp hoặc bài này không thuộc đề của bạn.');return;}

    window.rows=(window.rows||[]).filter(r=>String(r.id)!==String(id));
    if(typeof window.closeDetail==='function')window.closeDetail();
    window.render();
    alert('✅ Đã xóa bài nộp thành công.');
  }

  async function deleteAll(){
    const examId=new URLSearchParams(location.search).get('exam')||'';
    if(!examId){alert('Không xác định được đề thi.');return;}
    const count=(window.rows||[]).length;
    if(!count){alert('📋 Hiện không có bài nộp để xóa.');return;}

    if(!confirm(`⚠️ XÓA TẤT CẢ ${count} BÀI NỘP?\n\nToàn bộ kết quả của đề này sẽ bị xóa và sinh viên sẽ không còn thấy các bài nộp đó.\n\nThao tác này không thể hoàn tác.`))return;

    const typed=prompt(`Để xác nhận, nhập chính xác: XOA ${count}`);
    if(typed!==`XOA ${count}`){alert('❌ Xác nhận không đúng. Chưa xóa bài nào.');return;}

    const client=getClient();
    if(!client){alert('Không kết nối được máy chủ.');return;}

    const {data,error}=await client.rpc('delete_exam_submissions',{p_exam_id:examId});
    if(error){
      console.error('Delete all submissions failed:',error);
      alert('❌ Không thể xóa các bài nộp: '+error.message);
      return;
    }

    window.rows=[];
    if(typeof window.closeDetail==='function')window.closeDetail();
    window.render();
    alert(`✅ Đã xóa ${Number(data)||0} bài nộp thành công.`);
  }

  function addDeleteAllButton(){
    const headings=Array.from(document.querySelectorAll('h3'));
    const title=headings.find(h=>/Danh sách kết quả/i.test(h.textContent||''));
    if(!title)return false;
    const card=title.closest('.card');
    if(!card||card.querySelector('#deleteAllSubmissionsBtn'))return true;
    const row=title.parentElement;
    if(!row||!row.classList.contains('row'))return false;

    const btn=document.createElement('button');
    btn.id='deleteAllSubmissionsBtn';
    btn.className='btn';
    btn.type='button';
    btn.style.background='#b91c1c';
    btn.textContent='🗑️ Xóa tất cả';
    btn.addEventListener('click',deleteAll);
    row.appendChild(btn);
    return true;
  }

  function install(){
    if(typeof window.render!=='function')return false;
    window.deleteSubmission=deleteSubmission;
    window.deleteAllSubmissions=deleteAll;

    if(!window.__resultsDeleteRenderWrapped){
      const originalRender=window.render;
      window.render=function(){
        const result=originalRender.apply(this,arguments);
        const tbody=document.getElementById('tbody');
        if(tbody){
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
            del.addEventListener('click',()=>deleteSubmission(id));
            cell.appendChild(del);
          });
        }
        addDeleteAllButton();
        return result;
      };
      window.__resultsDeleteRenderWrapped=true;
    }
    addDeleteAllButton();
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
