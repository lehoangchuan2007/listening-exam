-- BƯỚC 12.3
-- Chạy SAU teacher-migration.sql.
-- Tự gán owner_id khi giáo viên tạo đề mới.
-- Tài khoản đăng ký từ teacher-register.html được tạo teacher profile.

begin;

-- Tự động gán chủ sở hữu cho đề mới nếu frontend không gửi owner_id.
create or replace function public.set_exam_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_exam_owner on public.exams;
create trigger trg_set_exam_owner
before insert on public.exams
for each row
execute function public.set_exam_owner();

-- Tạo teacher profile khi một tài khoản được đăng ký với role=teacher.
create or replace function public.handle_teacher_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data->>'role','') = 'teacher' then
    insert into public.teacher_profiles(user_id, full_name, email)
    values (
      new.id,
      nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')), ''),
      new.email
    )
    on conflict (user_id) do update
      set email = excluded.email,
          full_name = coalesce(public.teacher_profiles.full_name, excluded.full_name);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_teacher_created on auth.users;
create trigger on_auth_user_teacher_created
after insert on auth.users
for each row
execute function public.handle_teacher_signup();

commit;
