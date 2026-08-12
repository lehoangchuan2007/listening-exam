-- BƯỚC 12 - SAFE MULTI-TEACHER MIGRATION
-- Tài khoản giáo viên hiện tại: lehoangchuan2007@gmail.com
-- Chạy file này MỘT LẦN trong Supabase SQL Editor.
-- Migration tự tìm UUID từ auth.users, không hard-code UUID.
-- Không xóa đề hoặc submission.

begin;

-- 1. Hồ sơ giáo viên
create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.teacher_profiles enable row level security;

drop policy if exists "teachers can read own profile" on public.teacher_profiles;
create policy "teachers can read own profile"
on public.teacher_profiles
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "teachers can update own profile" on public.teacher_profiles;
create policy "teachers can update own profile"
on public.teacher_profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 2. Hàm xác định người dùng hiện tại có phải giáo viên hay không
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_profiles p
    where p.user_id = auth.uid()
  );
$$;

grant execute on function public.is_teacher() to authenticated;

-- 3. Tự tạo profile cho tài khoản giáo viên mới
create or replace function public.create_teacher_profile(p_full_name text default null)
returns public.teacher_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.teacher_profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.teacher_profiles(user_id, full_name, email)
  values (
    auth.uid(),
    nullif(trim(p_full_name), ''),
    (select email from auth.users where id = auth.uid())
  )
  on conflict (user_id) do update
    set full_name = coalesce(excluded.full_name, public.teacher_profiles.full_name),
        email = coalesce(excluded.email, public.teacher_profiles.email);

  select * into result
  from public.teacher_profiles
  where user_id = auth.uid();

  return result;
end;
$$;

grant execute on function public.create_teacher_profile(text) to authenticated;

-- 4. Bảo đảm tài khoản hiện tại của bạn trở thành giáo viên.
-- Nếu email không tồn tại, phần này không tạo dữ liệu giả và sẽ báo lỗi rõ ràng.
do $$
declare
  teacher_id uuid;
begin
  select id into teacher_id
  from auth.users
  where lower(email) = lower('lehoangchuan2007@gmail.com')
  limit 1;

  if teacher_id is null then
    raise exception 'Không tìm thấy tài khoản lehoangchuan2007@gmail.com trong auth.users';
  end if;

  insert into public.teacher_profiles(user_id, full_name, email)
  values (teacher_id, 'Lê Hoàng Chuẩn', 'lehoangchuan2007@gmail.com')
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(public.teacher_profiles.full_name, excluded.full_name);
end $$;

-- 5. Gắn các đề CŨ chưa có owner cho tài khoản hiện tại.
-- Không thay đổi owner_id của bất kỳ đề nào đã có owner.
do $$
declare
  teacher_id uuid;
begin
  select id into teacher_id
  from auth.users
  where lower(email) = lower('lehoangchuan2007@gmail.com')
  limit 1;

  -- Chỉ chạy nếu cột owner_id tồn tại.
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='exams'
      and column_name='owner_id'
  ) then
    execute format(
      'update public.exams set owner_id = $1 where owner_id is null'
    ) using teacher_id;
  end if;
end $$;

-- 6. RLS cho exams: giáo viên chỉ quản lý đề của chính mình.
-- Không xóa policy cũ ngoài các policy có cùng tên để tránh ảnh hưởng cấu trúc khác.
drop policy if exists "teachers can read own exams" on public.exams;
create policy "teachers can read own exams"
on public.exams
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists "teachers can insert own exams" on public.exams;
create policy "teachers can insert own exams"
on public.exams
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "teachers can update own exams" on public.exams;
create policy "teachers can update own exams"
on public.exams
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "teachers can delete own exams" on public.exams;
create policy "teachers can delete own exams"
on public.exams
for delete to authenticated
using (owner_id = auth.uid());

-- 7. Giáo viên chỉ đọc submission thuộc đề của mình.
drop policy if exists "teachers can read own submissions" on public.submissions;
create policy "teachers can read own submissions"
on public.submissions
for select to authenticated
using (
  exists (
    select 1
    from public.exams e
    where e.id = submissions.exam_id
      and e.owner_id = auth.uid()
  )
);

commit;
