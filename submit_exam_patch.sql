-- English Studio: update submit_exam() so the student can review
-- the correct answers ONLY after a successful submission.
-- Run this small migration in Supabase SQL Editor.

create or replace function public.submit_exam(
  p_exam_id uuid,
  p_student_name text,
  p_student_id text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  key jsonb;
  submitted_answers jsonb;
  total integer;
  correct integer := 0;
  i integer;
  score_value numeric(5,2);
  submission_id uuid;
  attempts integer;
  max_a integer;
  s text;
begin
  s := trim(coalesce(p_student_id,''));

  if length(trim(coalesce(p_student_name,''))) < 1 then
    raise exception 'Student name is required';
  end if;

  select public.normalize_answer_array(answer_key), max_attempts
  into key, max_a
  from public.exams
  where id = p_exam_id
    and published = true
    and (start_at is null or now() >= start_at)
    and (end_at is null or now() <= end_at);

  if key is null then
    raise exception 'Exam is closed or not available';
  end if;

  submitted_answers := public.normalize_answer_array(p_answers);

  select count(*)
  into attempts
  from public.submissions
  where exam_id = p_exam_id
    and lower(trim(student_name)) = lower(trim(p_student_name))
    and lower(trim(student_id)) = lower(s);

  if attempts >= greatest(coalesce(max_a,1),1) then
    raise exception 'Maximum attempts reached';
  end if;

  total := jsonb_array_length(key);

  if jsonb_array_length(submitted_answers) <> total then
    raise exception 'Invalid answer count';
  end if;

  if total > 0 then
    for i in 0..total-1 loop
      if lower(trim((submitted_answers->i)::text)) = lower(trim((key->i)::text)) then
        correct := correct + 1;
      end if;
    end loop;
  end if;

  score_value := round((correct::numeric / greatest(total,1)::numeric) * 10, 2);

  insert into public.submissions(
    exam_id,
    student_name,
    student_id,
    answers,
    correct_count,
    total_questions,
    score
  )
  values(
    p_exam_id,
    trim(p_student_name),
    s,
    submitted_answers,
    correct,
    total,
    score_value
  )
  returning id into submission_id;

  -- answer_key is returned ONLY after the submission has been created.
  -- It is not exposed by get_public_exam(), so it remains hidden before submission.
  return jsonb_build_object(
    'id', submission_id,
    'correct_count', correct,
    'total_questions', total,
    'score', score_value,
    'attempt', attempts + 1,
    'max_attempts', max_a,
    'answer_key', key
  );
end;
$$;

revoke all on function public.submit_exam(uuid,text,text,jsonb) from public;
grant execute on function public.submit_exam(uuid,text,text,jsonb) to anon, authenticated;
