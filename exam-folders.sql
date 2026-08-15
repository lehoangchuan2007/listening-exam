-- English Studio: exam folders / library organization
-- Run this ONCE in Supabase SQL Editor after reviewing it.
-- Existing exams are preserved; folder_id starts NULL (Chưa phân loại).

create table if not exists public.exam_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.exam_folders(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exams
  add column if not exists folder_id uuid references public.exam_folders(id) on delete set null;

create index if not exists idx_exam_folders_owner_parent
  on public.exam_folders(owner_id,parent_id);
create index if not exists idx_exams_folder_id
  on public.exams(folder_id);

alter table public.exam_folders enable row level security;

drop policy if exists "teachers can read own exam folders" on public.exam_folders;
drop policy if exists "teachers can insert own exam folders" on public.exam_folders;
drop policy if exists "teachers can update own exam folders" on public.exam_folders;
drop policy if exists "teachers can delete own exam folders" on public.exam_folders;

create policy "teachers can read own exam folders"
  on public.exam_folders for select to authenticated
  using (public.is_teacher() and owner_id=auth.uid());

create policy "teachers can insert own exam folders"
  on public.exam_folders for insert to authenticated
  with check (public.is_teacher() and owner_id=auth.uid());

create policy "teachers can update own exam folders"
  on public.exam_folders for update to authenticated
  using (public.is_teacher() and owner_id=auth.uid())
  with check (public.is_teacher() and owner_id=auth.uid());

create policy "teachers can delete own exam folders"
  on public.exam_folders for delete to authenticated
  using (public.is_teacher() and owner_id=auth.uid());

-- Keep folder_id safe: a teacher can only assign an exam to one of their own folders.
drop policy if exists "teachers can update own exams" on public.exams;
create policy "teachers can update own exams" on public.exams
  for update to authenticated
  using (public.is_teacher() and auth.uid()=owner_id)
  with check (
    public.is_teacher()
    and auth.uid()=owner_id
    and (
      folder_id is null
      or exists (
        select 1 from public.exam_folders f
        where f.id=folder_id and f.owner_id=auth.uid()
      )
    )
  );

-- Helpful view for the teacher UI.
create or replace view public.teacher_exam_library
with (security_invoker=true) as
select
  e.*,
  f.name as folder_name,
  f.parent_id as folder_parent_id
from public.exams e
left join public.exam_folders f on f.id=e.folder_id;

-- Make sure the view is usable by authenticated teachers under the existing RLS policies.
grant select on public.teacher_exam_library to authenticated;
