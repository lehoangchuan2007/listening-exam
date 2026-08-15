-- English Studio - definitive Writing student data RPC
-- Run once in Supabase SQL Editor.
create or replace function public.get_writing_exam_for_student_v2(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r jsonb;
begin
  if auth.uid() is null then raise exception 'Student login required'; end if;
  select jsonb_build_object(
    'id',e.id,
    'title',e.title,
    'description',e.description,
    'duration_minutes',e.duration_minutes,
    'exam_type',e.exam_type,
    'start_at',e.start_at,
    'end_at',e.end_at,
    'max_attempts',e.max_attempts,
    'questions',coalesce(e.questions,'[]'::jsonb),
    'writing_prompt',coalesce(nullif(e.writing_prompt,''),nullif(e.description,''),''),
    'writing_rubric',coalesce(e.writing_rubric,'[]'::jsonb)
  ) into r
  from public.exams e
  where e.id=p_exam_id
    and e.exam_type='writing'
    and e.published=true
    and (e.start_at is null or now()>=e.start_at)
    and (e.end_at is null or now()<=e.end_at);
  return r;
end;
$$;
revoke all on function public.get_writing_exam_for_student_v2(uuid) from public;
grant execute on function public.get_writing_exam_for_student_v2(uuid) to authenticated;
