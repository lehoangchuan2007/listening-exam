# Listening Exam Studio — cài đặt online

## 1. Tạo Supabase

Vào https://supabase.com/ và tạo một project mới.

## 2. Tạo database + Storage

Mở **SQL Editor** trong Supabase, mở file `supabase-schema.sql` trong repository, copy toàn bộ nội dung và chạy.

Script tạo:
- bảng đề thi `exams`
- bảng bài nộp `submissions`
- RPC lấy đề công khai không lộ đáp án
- RPC chấm bài phía server
- Storage bucket `listening-audio`
- Row Level Security

## 3. Kết nối website

Trong Supabase mở **Project Settings → API**. Lấy:
- Project URL
- anon / public key

Mở `config.js` trên GitHub và thay:

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_ANON_PUBLIC_KEY"
};
```

**Không đưa `service_role` key vào website.**

## 4. Bật tài khoản sinh viên

Sau khi chạy schema ban đầu, mở file `student-auth-security.sql` trong repository và chạy **một lần** trong Supabase SQL Editor.

Migration này:
- bắt buộc đăng nhập Supabase Auth trước khi gọi các RPC lấy đề;
- gắn bài nộp mới với `auth.uid()` của tài khoản sinh viên;
- lấy Họ tên + MSSV từ metadata tài khoản thay vì tin dữ liệu sinh viên tự nhập;
- giới hạn số lần làm bài theo đúng tài khoản;
- cho phép sinh viên chỉ xem lịch sử bài làm của chính tài khoản đó;
- giữ đáp án đúng không bị lộ trước khi nộp bài.

Trang sinh viên đã có sẵn giao diện **Đăng nhập / Đăng ký**. Khi đăng ký, tài khoản lưu:
- Họ và tên
- MSSV
- Email
- Mật khẩu

Nếu Supabase bật xác nhận email, sinh viên cần xác nhận email trước khi đăng nhập.

## 5. GitHub Pages

Commit các file trên GitHub. GitHub Pages sẽ tự build lại. Sau đó mở:

`https://lehoangchuan2007.github.io/listening-exam/`

## 6. Luồng sử dụng

### Giáo viên
1. Tạo tài khoản/đăng nhập.
2. Import `.docx` hoặc nhập câu hỏi.
3. Chọn `.mp3` từ máy.
4. Bấm **Lưu & tạo link**.
5. Copy link gửi sinh viên.
6. Vào **Kết quả** để xem điểm và xuất CSV mở bằng Excel.

### Sinh viên
1. Mở trang sinh viên.
2. Đăng ký tài khoản nếu chưa có.
3. Đăng nhập.
4. Chỉ sau khi đăng nhập mới xem được thư viện đề và truy cập bài kiểm tra.
5. Họ tên/MSSV được lấy từ tài khoản, không cần nhập lại khi nộp bài.
6. Làm bài trong thời gian quy định.
7. Nộp bài; server tự chấm và lưu kết quả gắn với tài khoản.
8. Mở **Lịch sử làm bài** để xem các lượt đã làm và xem lại chi tiết.

## Mẫu Word

```text
Câu 1. What does the man want to buy?
A. A book
B. A phone
C. A laptop
D. A ticket

Câu 2. Where will they meet?
A. At school
B. At the station
C. At the library
D. At home

Đáp án 1: C
Đáp án 2: B
```

Có thể dùng `Đáp án: A` sau từng câu nếu muốn.
