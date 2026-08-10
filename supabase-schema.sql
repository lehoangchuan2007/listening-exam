-- Listening Exam Studio database
-- Run this entire script in Supabase SQL Editor.

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  duration_minutes integer not null default 30,
  audio_url text,
  audio_name text,
  questions jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_name text not null,
  student_id text default '',
  answers jsonb not null default '[]'::jsonb,
  correct_count integer not null default 0,
  total_questions integer not null default 0,
  score numeric(5,2) not null default 0,
  submitted_at timestamptz not null default now()
);

alter table public.exams enable row level security;
alter table public.submissions enable row level security;

create policy "owners can read exams" on public.exams for select using (auth.uid() = owner_id);
create policy "owners can insert exams" on public.exams for insert with check (auth.uid() = owner_id);
create policy "owners can update exams" on public.exams for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners can delete exams" on public.exams for delete using (auth.uid() = owner_id);
create policy "public can read published exams" on public.exams for select using (published = true);

create policy "anyone can submit" on public.submissions for insert with check (true);
create policy "owners can read submissions" on public.submissions for select using (
  exists (select 1 from public.exams e where e.id = exam_id and e.owner_id = auth.uid())
);

-- Storage bucket for listening audio.
insert into storage.buckets (id, name, public)
values ('listening-audio', 'listening-audio', true)
on conflict (id) do nothing;

create policy "authenticated users can upload listening audio"
on storage.objects for insert to authenticated
with check (bucket_id = 'listening-audio');

create policy "anyone can read listening audio"
on storage.objects for select
using (bucket_id = 'listening-audio');

create policy "users can delete their listening audio"
on storage.objects for delete to authenticated
using (bucket_id = 'listening-audio' and owner_id = auth.uid());
