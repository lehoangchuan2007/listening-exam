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

## 4. GitHub Pages

Commit `config.js`. GitHub Pages sẽ tự build lại. Sau đó mở:

`https://lehoangchuan2007.github.io/listening-exam/`

## 5. Luồng sử dụng

### Giáo viên
1. Tạo tài khoản/đăng nhập.
2. Import `.docx` hoặc nhập câu hỏi.
3. Chọn `.mp3` từ máy.
4. Bấm **Lưu & tạo link**.
5. Copy link gửi sinh viên.
6. Vào **Kết quả** để xem điểm và xuất CSV mở bằng Excel.

### Sinh viên
1. Mở link đề.
2. Nhập họ tên/MSSV.
3. Nghe MP3 online.
4. Làm bài trong thời gian quy định.
5. Nộp bài; server tự chấm và lưu kết quả.

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
