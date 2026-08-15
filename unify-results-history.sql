-- English Studio: unified student history + teacher results
-- Applied to Supabase project lllxrjqwmsrapuwkgxdy on 2026-08-15.
-- Browser pages now use these RPCs instead of direct table reads.

create or replace function public.get_student_history_all()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
  from (
    select 'quiz'::text as kind,s.id,s.exam_id,e.title as exam_title,e.exam_type,
      s.student_name,s.student_id,s.answers,s.correct_count,s.total_questions,s.score,
      s.submitted_at as created_at,e.questions,e.answer_key,
      null::text as prompt,null::text as essay,null::integer as word_count,
      null::numeric as task_response,null::numeric as coherence,null::numeric as vocabulary,
      null::numeric as grammar,null::numeric as total_score,null::text as overall_comment,
      null::jsonb as strengths,null::jsonb as improvements,null::jsonb as grammar_errors,
      null::jsonb as better_phrases,null::jsonb as rubric_scores,null::jsonb as writing_rubric
    from public.submissions s join public.exams e on e.id=s.exam_id
    where auth.uid() is not null and s.student_user_id=auth.uid()
    union all
    select 'writing'::text as kind,w.id,w.exam_id,e.title as exam_title,e.exam_type,
      w.student_name,null::text as student_id,null::jsonb as answers,null::integer as correct_count,
      null::integer as total_questions,null::numeric as score,w.created_at,e.questions,e.answer_key,
      w.prompt,w.essay,w.word_count,w.task_response,w.coherence,w.vocabulary,w.grammar,
      w.total_score,w.overall_comment,w.strengths,w.improvements,w.grammar_errors,w.better_phrases,
      w.rubric_scores,coalesce(e.writing_rubric,'[]'::jsonb)
    from public.writing_submissions w join public.exams e on e.id=w.exam_id
    where auth.uid() is not null and w.student_user_id=auth.uid()
  ) x;
$$;
revoke all on function public.get_student_history_all() from public, anon;
grant execute on function public.get_student_history_all() to authenticated;

create or replace function public.get_teacher_exam_results(p_exam_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare ex public.exams; result_rows jsonb;
begin
  if auth.uid() is null then raise exception 'Teacher login required'; end if;
  if not exists (select 1 from public.teacher_profiles tp where tp.user_id=auth.uid()) then
    raise exception 'Teacher access denied';
  end if;
  select * into ex from public.exams e where e.id=p_exam_id and e.owner_id=auth.uid();
  if ex.id is null then raise exception 'Exam not found or not owned by this teacher'; end if;

  if lower(coalesce(ex.exam_type,''))='writing' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result_rows
    from (
      select w.id,w.exam_id,w.student_user_id,w.student_name,w.prompt,w.essay,w.word_count,
        w.task_response,w.coherence,w.vocabulary,w.grammar,w.total_score,w.overall_comment,
        w.strengths,w.improvements,w.grammar_errors,w.better_phrases,w.ai_model,w.ai_request_id,
        w.created_at,w.rubric_scores,e.title as exam_title,e.exam_type
      from public.writing_submissions w join public.exams e on e.id=w.exam_id
      where w.exam_id=p_exam_id
    ) x;
  else
    select coalesce(jsonb_agg(to_jsonb(x) order by x.submitted_at desc),'[]'::jsonb) into result_rows
    from (
      select s.id,s.exam_id,s.student_name,s.student_id,s.answers,s.correct_count,s.total_questions,
        s.score,s.submitted_at,e.title as exam_title,e.exam_type,e.questions,e.answer_key
      from public.submissions s join public.exams e on e.id=s.exam_id
      where s.exam_id=p_exam_id
    ) x;
  end if;

  return jsonb_build_object('exam',jsonb_build_object('id',ex.id,'title',ex.title,
    'exam_type',ex.exam_type,'writing_rubric',coalesce(ex.writing_rubric,'[]'::jsonb)),
    'rows',coalesce(result_rows,'[]'::jsonb));
end;
$$;
revoke all on function public.get_teacher_exam_results(uuid) from public, anon;
grant execute on function public.get_teacher_exam_results(uuid) to authenticated;
