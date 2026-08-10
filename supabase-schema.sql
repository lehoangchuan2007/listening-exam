-- Listening Exam Studio database
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text default '', duration_minutes integer not null default 30,
  audio_url text, audio_name text, questions jsonb not null default '[]'::jsonb, answer_key jsonb not null default '[]'::jsonb,
  published boolean not null default true, created_at timestamptz not null default now()
);
alter table public.exams add column if not exists answer_key jsonb not null default '[]'::jsonb;
alter table public.exams add column if not exists start_at timestamptz;
alter table public.exams add column if not exists end_at timestamptz;
alter table public.exams add column if not exists max_attempts integer not null default 1;
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade,
  student_name text not null, student_id text default '', answers jsonb not null default '[]'::jsonb,
  correct_count integer not null default 0, total_questions integer not null default 0, score numeric(5,2) not null default 0,
  submitted_at timestamptz not null default now()
);
alter table public.exams enable row level security; alter table public.submissions enable row level security;
drop policy if exists "owners can read exams" on public.exams; drop policy if exists "owners can insert exams" on public.exams;
drop policy if exists "owners can update exams" on public.exams; drop policy if exists "owners can delete exams" on public.exams;
drop policy if exists "owners can read submissions" on public.submissions;
create policy "owners can read exams" on public.exams for select to authenticated using (auth.uid() = owner_id);
create policy "owners can insert exams" on public.exams for insert to authenticated with check (auth.uid() = owner_id);
create policy "owners can update exams" on public.exams for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners can delete exams" on public.exams for delete to authenticated using (auth.uid() = owner_id);
create policy "owners can read submissions" on public.submissions for select to authenticated using (exists(select 1 from public.exams e where e.id=exam_id and e.owner_id=auth.uid()));
create or replace function public.get_public_exam(p_exam_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; begin select jsonb_build_object('id',e.id,'title',e.title,'description',e.description,'duration_minutes',e.duration_minutes,'audio_url',e.audio_url,'audio_name',e.audio_name,'questions',e.questions,'start_at',e.start_at,'end_at',e.end_at,'max_attempts',e.max_attempts) into result from public.exams e where e.id=p_exam_id and e.published=true and (e.start_at is null or now()>=e.start_at) and (e.end_at is null or now()<=e.end_at); return result; end; $$;
grant execute on function public.get_public_exam(uuid) to anon,authenticated;
create or replace function public.submit_exam(p_exam_id uuid,p_student_name text,p_student_id text,p_answers jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare key jsonb; total integer; correct integer:=0; i integer; score_value numeric(5,2); submission_id uuid; attempts integer; max_a integer; s text;
begin s:=trim(coalesce(p_student_id,'')); if length(trim(coalesce(p_student_name,'')))<1 then raise exception 'Student name is required'; end if;
select answer_key,max_attempts into key,max_a from public.exams where id=p_exam_id and published=true and (start_at is null or now()>=start_at) and (end_at is null or now()<=end_at);
if key is null then raise exception 'Exam is closed or not available'; end if;
select count(*) into attempts from public.submissions where exam_id=p_exam_id and lower(trim(student_name))=lower(trim(p_student_name)) and lower(trim(student_id))=lower(s);
if attempts>=greatest(coalesce(max_a,1),1) then raise exception 'Maximum attempts reached'; end if;
total:=jsonb_array_length(key); if jsonb_array_length(coalesce(p_answers,'[]'::jsonb))<>total then raise exception 'Invalid answer count'; end if;
for i in 0..greatest(total-1,0) loop if (p_answers->i)::text=(key->i)::text then correct:=correct+1; end if; end loop;
score_value:=round((correct::numeric/greatest(total,1)::numeric)*10,2);
insert into public.submissions(exam_id,student_name,student_id,answers,correct_count,total_questions,score) values(p_exam_id,trim(p_student_name),s,p_answers,correct,total,score_value) returning id into submission_id;
return jsonb_build_object('id',submission_id,'correct_count',correct,'total_questions',total,'score',score_value,'attempt',attempts+1,'max_attempts',max_a); end; $$;
grant execute on function public.submit_exam(uuid,text,text,jsonb) to anon,authenticated;
insert into storage.buckets(id,name,public) values('listening-audio','listening-audio',true) on conflict(id) do nothing;
drop policy if exists "authenticated users can upload listening audio" on storage.objects; drop policy if exists "anyone can read listening audio" on storage.objects; drop policy if exists "users can delete their listening audio" on storage.objects;
create policy "authenticated users can upload listening audio" on storage.objects for insert to authenticated with check(bucket_id='listening-audio');
create policy "anyone can read listening audio" on storage.objects for select using(bucket_id='listening-audio');
create policy "users can delete their listening audio" on storage.objects for delete to authenticated using(bucket_id='listening-audio' and owner_id=auth.uid()::text);
