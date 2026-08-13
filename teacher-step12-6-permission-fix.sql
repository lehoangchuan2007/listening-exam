-- BƯỚC 12.6 - FIX permission denied for table teacher_profiles
-- Chạy 1 lần trong Supabase SQL Editor.
-- Không xóa tài khoản, đề thi hoặc bài nộp.
-- Nguyên nhân: RLS policy đã có nhưng role authenticated chưa có quyền SELECT cấp bảng.

begin;

-- Cho giáo viên đã đăng nhập được SELECT bảng teacher_profiles.
-- RLS vẫn giới hạn chỉ đọc được hồ sơ có user_id = auth.uid().
grant select on table public.teacher_profiles to authenticated;

-- Không cho người chưa đăng nhập đọc bảng này.
revoke all on table public.teacher_profiles from anon;

-- Đảm bảo RLS bật.
alter table public.teacher_profiles enable row level security;

-- Chỉ được đọc hồ sơ của chính tài khoản đang đăng nhập.
drop policy if exists "teachers can read own profile" on public.teacher_profiles;
create policy "teachers can read own profile"
on public.teacher_profiles
for select to authenticated
using (user_id = auth.uid());

commit;
