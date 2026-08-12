-- BƯỚC 12: Multi-teacher account support
-- Run once in Supabase SQL Editor.
-- Uses Supabase Auth users as the teacher accounts.

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

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_profiles p
    where p.user_id = auth.uid()
  );
$$;

grant execute on function public.is_teacher() to authenticated;

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
  values (auth.uid(), nullif(trim(p_full_name), ''), (select email from auth.users where id = auth.uid()))
  on conflict (user_id) do update
    set full_name = coalesce(excluded.full_name, public.teacher_profiles.full_name),
        email = coalesce(excluded.email, public.teacher_profiles.email);

  select * into result from public.teacher_profiles where user_id = auth.uid();
  return result;
end;
$$;

grant execute on function public.create_teacher_profile(text) to authenticated;

-- Ownership policies for exams.
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

-- Submission visibility for teachers: only submissions from their own exams.
drop policy if exists "teachers can read own submissions" on public.submissions;
create policy "teachers can read own submissions"
on public.submissions
for select to authenticated
using (
  exists (
    select 1 from public.exams e
    where e.id = submissions.exam_id
      and e.owner_id = auth.uid()
  )
);

-- IMPORTANT: do not grant students direct DELETE access.
