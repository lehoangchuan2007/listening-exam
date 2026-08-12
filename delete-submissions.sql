-- Bước bổ sung: giáo viên được xóa bài nộp thuộc đề của chính mình.
-- Sinh viên không có quyền DELETE trực tiếp.

drop policy if exists "teachers can delete own submissions" on public.submissions;

create policy "teachers can delete own submissions"
on public.submissions
for delete
to authenticated
using (
  public.is_teacher()
  and exists (
    select 1
    from public.exams e
    where e.id = submissions.exam_id
      and e.owner_id = auth.uid()
  )
);
