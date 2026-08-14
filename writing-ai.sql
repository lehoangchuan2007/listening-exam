-- English Studio - Writing + AI grading
-- Run once in Supabase SQL Editor.

alter table public.exams add column if not exists writing_prompt text;

create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  prompt text not null,
  essay text not null,
  word_count integer not null default 0,
  task_response numeric(4,2), coherence numeric(4,2), vocabulary numeric(4,2), grammar numeric(4,2),
  total_score numeric(4,2), overall_comment text,
  strengths jsonb not null default '[]'::jsonb, improvements jsonb not null default '[]'::jsonb,
  grammar_errors jsonb not null default '[]'::jsonb, better_phrases jsonb not null default '[]'::jsonb,
  ai_model text, ai_request_id text, created_at timestamptz not null default now()
);
create index if not exists writing_submissions_student_idx on public.writing_submissions(student_user_id,created_at desc);
create index if not exists writing_submissions_exam_idx on public.writing_submissions(exam_id,created_at desc);
alter table public.writing_submissions enable row level security;
drop policy if exists writing_student_select_own on public.writing_submissions;
create policy writing_student_select_own on public.writing_submissions for select to authenticated using (student_user_id=auth.uid());

create or replace function public.get_writing_exam_for_student(p_exam_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if auth.uid() is null then raise exception 'Student login required'; end if;
  select jsonb_build_object('id',e.id,'title',e.title,'description',e.description,'duration_minutes',e.duration_minutes,
    'exam_type',e.exam_type,'start_at',e.start_at,'end_at',e.end_at,'max_attempts',e.max_attempts,
    'questions',e.questions,'writing_prompt',coalesce(nullif(e.writing_prompt,''),nullif(e.description,''),e.title)) into r
  from public.exams e where e.id=p_exam_id and e.exam_type='writing' and e.published=true
    and (e.start_at is null or now()>=e.start_at) and (e.end_at is null or now()<=e.end_at);
  return r;
end; $$;
revoke all on function public.get_writing_exam_for_student(uuid) from public;
grant execute on function public.get_writing_exam_for_student(uuid) to authenticated;

create or replace function public.get_my_writing_history()
returns jsonb language sql security definer set search_path=public stable as $$
select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'exam_id',w.exam_id,'exam_title',e.title,'student_name',w.student_name,
'prompt',w.prompt,'essay',w.essay,'word_count',w.word_count,'task_response',w.task_response,'coherence',w.coherence,
'vocabulary',w.vocabulary,'grammar',w.grammar,'total_score',w.total_score,'overall_comment',w.overall_comment,
'strengths',w.strengths,'improvements',w.improvements,'grammar_errors',w.grammar_errors,'better_phrases',w.better_phrases,
'ai_model',w.ai_model,'created_at',w.created_at) order by w.created_at desc),'[]'::jsonb)
from public.writing_submissions w join public.exams e on e.id=w.exam_id where w.student_user_id=auth.uid(); $$;
revoke all on function public.get_my_writing_history() from public;
grant execute on function public.get_my_writing_history() to authenticated;
