-- BƯỚC 12.4 - Tự tạo teacher_profile khi đăng ký giáo viên
-- Chạy file này MỘT LẦN trong Supabase SQL Editor.
-- Chỉ user đăng ký với metadata role=teacher mới được tạo profile giáo viên.

create or replace function public.handle_new_teacher_signup()
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
      set full_name = coalesce(public.teacher_profiles.full_name, excluded.full_name),
          email = coalesce(excluded.email, public.teacher_profiles.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_teacher on auth.users;
create trigger on_auth_user_created_teacher
after insert on auth.users
for each row execute function public.handle_new_teacher_signup();
