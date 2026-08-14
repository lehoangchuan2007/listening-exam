-- BƯỚC 13.3 - FIX DỮ LIỆU READING CHO TRANG SINH VIÊN
-- Chạy 1 lần trong Supabase SQL Editor.
-- Không ảnh hưởng giao diện hoặc dữ liệu Listening.

begin;

-- Một số phiên bản manage.html cũ lưu nội dung vào reading_text.
-- Giữ cả hai cột để tương thích dữ liệu cũ và mới.
alter table public.exams
  add column if not exists reading_passage text not null default '';

alter table public.exams
  add column if not exists reading_text text not null default '';

-- Đồng bộ dữ liệu Reading cũ sang reading_passage nếu passage đang trống.
update public.exams
set reading_passage = reading_text
where exam_type = 'reading'
  and coalesce(trim(reading_passage), '') = ''
  and coalesce(trim(reading_text), '') <> '';

-- RPC dành riêng cho học sinh.
-- Chỉ trả đề Reading đã publish và đang trong thời gian cho phép.
create or replace function public.get_reading_exam_for_student(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  passage text;
begin
  select coalesce(nullif(trim(e.reading_passage), ''), e.reading_text, '')
    into passage
  from public.exams e
  where e.id = p_exam_id
    and e.exam_type = 'reading'
    and e.published = true
    and (e.start_at is null or now() >= e.start_at)
    and (e.end_at is null or now() <= e.end_at);

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'duration_minutes', e.duration_minutes,
    'exam_type', e.exam_type,
    'reading_passage', passage,
    'reading_text', e.reading_text,
    'questions', e.questions,
    'start_at', e.start_at,
    'end_at', e.end_at,
    'max_attempts', e.max_attempts
  )
  into result
  from public.exams e
  where e.id = p_exam_id;

  return result;
end;
$$;

revoke all on function public.get_reading_exam_for_student(uuid) from public;
grant execute on function public.get_reading_exam_for_student(uuid) to anon, authenticated;

commit;
