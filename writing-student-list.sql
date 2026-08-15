-- English Studio - expose published Writing exams to the student library
-- Run once in Supabase SQL Editor.
begin;

create or replace function public.get_published_writing_exams_for_student()
returns jsonb
language plpgsql
security definer
set search_path=public
stable
as $$
declare result jsonb;
begin
  if not public.is_student() then
    raise exception 'Student login required';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'description', e.description,
      'exam_type', e.exam_type,
      'duration_minutes', e.duration_minutes,
      'max_attempts', e.max_attempts,
      'start_at', e.start_at,
      'end_at', e.end_at,
      'question_count', 0,
      'writing_prompt', e.writing_prompt,
      'writing_rubric', e.writing_rubric
    ) order by e.created_at desc nulls last
  ), '[]'::jsonb)
  into result
  from public.exams e
  where e.published = true
    and e.exam_type = 'writing'
    and (e.start_at is null or now() >= e.start_at)
    and (e.end_at is null or now() <= e.end_at);

  return result;
end;
$$;

revoke all on function public.get_published_writing_exams_for_student() from public;
grant execute on function public.get_published_writing_exams_for_student() to authenticated;

commit;
