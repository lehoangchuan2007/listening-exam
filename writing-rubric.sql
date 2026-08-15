-- English Studio - dynamic Writing rubric
-- Run this once in Supabase SQL Editor.
-- Each Writing exam stores its own teacher-defined rubric as JSONB.

alter table public.exams
  add column if not exists writing_rubric jsonb not null default '[]'::jsonb;

create index if not exists exams_writing_rubric_gin_idx
  on public.exams using gin (writing_rubric);

-- Optional helper: validate that a Writing rubric totals exactly 10 points.
create or replace function public.validate_writing_rubric(p_rubric jsonb)
returns boolean
language plpgsql immutable
as $$
declare total numeric := 0; item jsonb;
begin
  if jsonb_typeof(p_rubric) <> 'array' or jsonb_array_length(p_rubric)=0 then return false; end if;
  for item in select value from jsonb_array_elements(p_rubric) loop
    if trim(coalesce(item->>'name',''))='' then return false; end if;
    if coalesce((item->>'max')::numeric,0)<=0 then return false; end if;
    total := total + (item->>'max')::numeric;
  end loop;
  return abs(total-10) < 0.001;
exception when others then return false;
end;
$$;

revoke all on function public.validate_writing_rubric(jsonb) from public;
grant execute on function public.validate_writing_rubric(jsonb) to authenticated;
