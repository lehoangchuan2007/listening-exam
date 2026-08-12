-- BƯỚC 12.4d - FIX CÁCH LY ĐỀ GIỮA CÁC GIÁO VIÊN
-- Chạy 1 lần trong Supabase SQL Editor.
-- Không xóa dữ liệu đề hoặc bài nộp.
-- Nguyên nhân thường gặp: policy SELECT cũ vẫn cho phép mọi authenticated user đọc toàn bộ exams.

begin;

-- Bảo đảm RLS đang bật.
alter table public.exams enable row level security;

-- Xóa các policy SELECT cũ trên exams có thể cho phép đọc quá rộng.
-- Giữ lại policy mới "teachers can read own exams".
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'exams'
      and cmd = 'SELECT'
      and policyname <> 'teachers can read own exams'
  loop
    execute format('drop policy if exists %I on public.exams', p.policyname);
  end loop;
end $$;

-- Policy duy nhất cho giáo viên đọc đề: chỉ đề của chính mình.
drop policy if exists "teachers can read own exams" on public.exams;
create policy "teachers can read own exams"
on public.exams
for select to authenticated
using (
  exists (
    select 1
    from public.teacher_profiles tp
    where tp.user_id = auth.uid()
  )
  and owner_id = auth.uid()
);

-- Giữ/thiết lập các quyền ghi đúng theo owner.
drop policy if exists "teachers can insert own exams" on public.exams;
create policy "teachers can insert own exams"
on public.exams
for insert to authenticated
with check (
  exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid()
  )
  and owner_id = auth.uid()
);

drop policy if exists "teachers can update own exams" on public.exams;
create policy "teachers can update own exams"
on public.exams
for update to authenticated
using (
  exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid()
  )
  and owner_id = auth.uid()
)
with check (
  exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid()
  )
  and owner_id = auth.uid()
);

drop policy if exists "teachers can delete own exams" on public.exams;
create policy "teachers can delete own exams"
on public.exams
for delete to authenticated
using (
  exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid()
  )
  and owner_id = auth.uid()
);

-- Bảo đảm teacher_profiles không vô tình mở toàn bộ hồ sơ.
alter table public.teacher_profiles enable row level security;
drop policy if exists "teachers can read own profile" on public.teacher_profiles;
create policy "teachers can read own profile"
on public.teacher_profiles
for select to authenticated
using (user_id = auth.uid());

commit;
