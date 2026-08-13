-- BƯỚC 13 - HỆ THỐNG ĐỀ READING
-- Chạy 1 lần trong Supabase SQL Editor.
-- Không xóa dữ liệu Listening hiện có.

alter table public.exams add column if not exists exam_type text not null default 'listening';
alter table public.exams add column if not exists reading_passage text not null default '';

create or replace function public.get_reading_exam_for_student(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'duration_minutes', e.duration_minutes,
    'exam_type', e.exam_type,
    'reading_passage', e.reading_passage,
    'questions', e.questions,
    'start_at', e.start_at,
    'end_at', e.end_at,
    'max_attempts', e.max_attempts
  ) into result
  from public.exams e
  where e.id=p_exam_id
    and e.exam_type='reading'
    and e.published=true
    and (e.start_at is null or now()>=e.start_at)
    and (e.end_at is null or now()<=e.end_at);
  return result;
end;
$$;

revoke all on function public.get_reading_exam_for_student(uuid) from public;
grant execute on function public.get_reading_exam_for_student(uuid) to anon,authenticated;
