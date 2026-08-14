-- English Studio - student account security migration
-- MSSV is OPTIONAL. Full name is required for submissions.
-- IMPORTANT: this migration must be run in Supabase SQL Editor.

begin;

alter table public.submissions
  add column if not exists student_user_id uuid references auth.users(id) on delete set null;

create index if not exists submissions_student_user_id_idx
  on public.submissions(student_user_id);

create or replace function public.is_student()
returns boolean
language sql security definer set search_path=public stable
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt()->'user_metadata'->>'role','student') = 'student';
$$;

revoke all on function public.is_student() from public;
grant execute on function public.is_student() to authenticated;

do $$
begin
  if to_regprocedure('public.get_published_exams_for_student()') is not null then
    revoke execute on function public.get_published_exams_for_student() from anon;
    grant execute on function public.get_published_exams_for_student() to authenticated;
  end if;
  if to_regprocedure('public.get_exam_for_student(uuid)') is not null then
    revoke execute on function public.get_exam_for_student(uuid) from anon;
    grant execute on function public.get_exam_for_student(uuid) to authenticated;
  end if;
end $$;

create or replace function public.get_reading_exam_for_student(p_exam_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; passage text;
begin
  if not public.is_student() then raise exception 'Student login required'; end if;
  select coalesce(nullif(trim(e.reading_passage), ''), e.reading_text, '') into passage
  from public.exams e where e.id=p_exam_id and e.exam_type='reading' and e.published=true
    and (e.start_at is null or now()>=e.start_at) and (e.end_at is null or now()<=e.end_at);
  if not found then return null; end if;
  select jsonb_build_object('id',e.id,'title',e.title,'description',e.description,
    'duration_minutes',e.duration_minutes,'exam_type',e.exam_type,'reading_passage',passage,
    'reading_text',e.reading_text,'questions',e.questions,'start_at',e.start_at,
    'end_at',e.end_at,'max_attempts',e.max_attempts) into result
  from public.exams e where e.id=p_exam_id;
  return result;
end;
$$;
revoke all on function public.get_reading_exam_for_student(uuid) from public;
grant execute on function public.get_reading_exam_for_student(uuid) to authenticated;

create or replace function public.get_public_exam(p_exam_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.is_student() then raise exception 'Student login required'; end if;
  select jsonb_build_object('id',e.id,'title',e.title,'description',e.description,
    'duration_minutes',e.duration_minutes,'audio_url',e.audio_url,'audio_name',e.audio_name,
    'questions',e.questions,'start_at',e.start_at,'end_at',e.end_at,'max_attempts',e.max_attempts)
  into result from public.exams e where e.id=p_exam_id and e.published=true
    and (e.start_at is null or now()>=e.start_at) and (e.end_at is null or now()<=e.end_at);
  return result;
end;
$$;
revoke all on function public.get_public_exam(uuid) from public;
grant execute on function public.get_public_exam(uuid) to authenticated;

-- Submission: full name comes from the authenticated account; MSSV is optional.
create or replace function public.submit_exam(
  p_exam_id uuid, p_student_name text, p_student_id text, p_answers jsonb
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  key jsonb; submitted_answers jsonb; total integer; correct integer:=0; i integer;
  score_value numeric(5,2); submission_id uuid; attempts integer; max_a integer;
  canonical_name text; canonical_sid text;
begin
  if not public.is_student() then raise exception 'Student login required'; end if;

  canonical_name:=trim(coalesce(auth.jwt()->'user_metadata'->>'full_name',''));
  canonical_sid:=trim(coalesce(auth.jwt()->'user_metadata'->>'student_id',''));
  if canonical_name='' then raise exception 'Student profile is incomplete'; end if;
  -- MSSV intentionally NOT required.

  select public.normalize_answer_array(answer_key),max_attempts into key,max_a
  from public.exams where id=p_exam_id and published=true
    and (start_at is null or now()>=start_at) and (end_at is null or now()<=end_at);
  if key is null then raise exception 'Exam is closed or not available'; end if;
  submitted_answers:=public.normalize_answer_array(p_answers);

  select count(*) into attempts from public.submissions
  where exam_id=p_exam_id and student_user_id=auth.uid();
  if attempts>=greatest(coalesce(max_a,1),1) then raise exception 'Maximum attempts reached'; end if;

  total:=jsonb_array_length(key);
  if jsonb_array_length(submitted_answers)<>total then raise exception 'Invalid answer count'; end if;
  if total>0 then
    for i in 0..total-1 loop
      if lower(trim((submitted_answers->i)::text))=lower(trim((key->i)::text)) then correct:=correct+1; end if;
    end loop;
  end if;
  score_value:=round((correct::numeric/greatest(total,1)::numeric)*10,2);

  insert into public.submissions(exam_id,student_user_id,student_name,student_id,answers,correct_count,total_questions,score)
  values(p_exam_id,auth.uid(),canonical_name,nullif(canonical_sid,''),submitted_answers,correct,total,score_value)
  returning id into submission_id;

  return jsonb_build_object('id',submission_id,'correct_count',correct,'total_questions',total,
    'score',score_value,'attempt',attempts+1,'max_attempts',max_a,'student_name',canonical_name,
    'student_id',nullif(canonical_sid,''),'answer_key',key);
end;
$$;
revoke all on function public.submit_exam(uuid,text,text,jsonb) from public;
grant execute on function public.submit_exam(uuid,text,text,jsonb) to authenticated;

create or replace function public.get_student_history()
returns jsonb language sql security definer set search_path=public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'exam_id',s.exam_id,
    'student_name',s.student_name,'student_id',s.student_id,'answers',s.answers,
    'correct_count',s.correct_count,'total_questions',s.total_questions,'score',s.score,
    'submitted_at',s.submitted_at,'exam_title',e.title,'exam_type',e.exam_type,
    'questions',e.questions,'answer_key',e.answer_key) order by s.submitted_at desc),'[]'::jsonb)
  from public.submissions s join public.exams e on e.id=s.exam_id
  where public.is_student() and s.student_user_id=auth.uid();
$$;
revoke all on function public.get_student_history() from public;
grant execute on function public.get_student_history() to authenticated;

commit;
