-- BƯỚC 13.2 - THÊM LOẠI ĐỀ CHO ENGLISH STUDIO
-- Chạy 1 lần trong Supabase SQL Editor.
-- listening / reading / writing / mixed

alter table public.exams
  add column if not exists exam_type text not null default 'listening';

alter table public.exams
  drop constraint if exists exams_exam_type_check;

alter table public.exams
  add constraint exams_exam_type_check
  check (exam_type in ('listening','reading','writing','mixed'));

create index if not exists exams_exam_type_idx on public.exams(exam_type);
