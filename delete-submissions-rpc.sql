-- Secure deletion for teacher-owned submissions.
-- Run this file once in Supabase SQL Editor.
-- It does NOT grant students DELETE access to submissions.

create or replace function public.delete_submission(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted boolean;
begin
  delete from public.submissions s
  where s.id = p_submission_id
    and public.is_teacher()
    and exists (
      select 1
      from public.exams e
      where e.id = s.exam_id
        and e.owner_id = auth.uid()
    );

  get diagnostics deleted = row_count > 0;
  return deleted;
end;
$$;

grant execute on function public.delete_submission(uuid) to authenticated;

create or replace function public.delete_exam_submissions(p_exam_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not public.is_teacher() then
    raise exception 'permission denied';
  end if;

  delete from public.submissions s
  where s.exam_id = p_exam_id
    and exists (
      select 1
      from public.exams e
      where e.id = s.exam_id
        and e.owner_id = auth.uid()
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.delete_exam_submissions(uuid) to authenticated;
