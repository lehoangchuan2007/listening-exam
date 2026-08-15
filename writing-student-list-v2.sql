-- English Studio - robust published Writing library RPC
-- Run once in Supabase SQL Editor.
begin;

create or replace function public.get_published_writing_exams_for_student()
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'description', coalesce(e.description,''),
      'exam_type', lower(coalesce(e.exam_type,'')),
      'duration_minutes', coalesce(e.duration_minutes,60),
      'max_attempts', coalesce(e.max_attempts,1),
      'start_at', e.start_at,
      'end_at', e.end_at,
      'question_count', 0,
      'writing_prompt', coalesce(e.writing_prompt,''),
      'writing_rubric', coalesce(e.writing_rubric,'[]'::jsonb)
    ) order by e.created_at desc nulls last
  ), '[]'::jsonb)
  from public.exams e
  where e.published = true
    and lower(coalesce(e.exam_type,'')) = 'writing';
$$;

revoke all on function public.get_published_writing_exams_for_student() from public;
grant execute on function public.get_published_writing_exams_for_student() to authenticated;

commit;
