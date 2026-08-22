# 🚀 Hướng Dẫn Deploy Website WordFight & Cấu Hình Supabase Database

Tài liệu này hướng dẫn chi tiết từng bước để bạn đưa website **WordFight** lên môi trường Production (Vercel, Render, Railway, VPS) và kết nối cơ sở dữ liệu **Supabase**.

---

## 🗄️ Bước 1: Tạo Database Trên Supabase (1-Click SQL Match)

1. Đăng nhập vào [Supabase.com](https://supabase.com) và tạo một **New Project**.
2. Sau khi tạo xong, vào mục **SQL Editor** ở thanh menu bên trái.
3. Mở file [supabase/schema.sql](file:///Users/t/Downloads/ai-website-cloner-template-master/supabase/schema.sql) trong project này, copy toàn bộ nội dung và paste vào SQL Editor.
4. Bấm nút **RUN** (Ctrl + Enter) để tạo toàn bộ bảng:
   - `profiles`: Lưu tài khoản người chơi, avatar, kim cương, cấp độ.
   - `levels_progress`: Lưu tiến độ các màn (Màn 1, Màn 2, Màn 3...).
   - `ai_vocabulary`: **Kho từ vựng AI tự động mở rộng liên tục** (Lưu trữ từ mới + giải nghĩa từ Gemini).
   - `rooms`: Quản lý phòng đấu Multiplayer.
5. Vào mục **Project Settings ➔ API** để lấy 2 thông tin:
   - **Project URL** (VD: `https://xyzabc.supabase.co`)
   - **Project API Anon Key** (VD: `eyJhbGci...`)

---

## ⚙️ Bước 2: Cấu Hình Biến Môi Trường (Environment Variables)

Khi Deploy lên Vercel, Railway hoặc Render, bạn chỉ cần cấu hình các biến môi trường sau:

| Tên Biến | Giá Trị Mẫu | Mô Tả |
|---|---|---|
| `GEMINI_API_KEY` | `your-gemini-api-key` | Key Gemini AI của bạn |
| `NEXT_PUBLIC_GEMINI_API_KEY` | `your-gemini-api-key` | Client-side Gemini Key |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | URL dự án Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Anon public key của Supabase |
| `PORT` | `3000` | Cổng chạy server (tự động) |

*(Trên máy local, bạn có thể điền các biến này trực tiếp vào file `.env.local`)*.

---

## 🌐 Bước 3: Deploy Website

### Cách 1: Deploy Lên Vercel (Khuyên dùng cho Frontend & Static API)
1. Đẩy mã nguồn lên GitHub:
   ```bash
   git add .
   git commit -m "Deploy WordFight with Gemini AI & Supabase"
   git push origin main
   ```
2. Vào [Vercel.com](https://vercel.com) ➔ **Add New Project** ➔ Chọn repository vừa tạo.
3. Điền các biến môi trường ở Bước 2 vào mục **Environment Variables**.
4. Bấm **Deploy**!

---

### Cách 2: Deploy Full-Stack Real-time (Render / Railway / VPS / Docker)
Do website có hệ thống Socket.IO Real-time cho phòng đấu bạn bè, bạn có thể deploy nguyên bản bằng Node.js Server:

#### Chạy với PM2 trên VPS:
```bash
# Cài đặt dependencies
npm install

# Build dự án
npm run build

# Chạy server chạy ngầm với PM2
npm install -g pm2
pm2 start server.mjs --name "wordfight"
```

#### Chạy với Docker:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.mjs"]
```

---

## ✅ Kiểm Tra Sau Khi Deploy
1. Truy cập trang web vừa deploy.
2. Thử chơi **Nối từ Tiếng Việt (Màn 1 -> Màn 4)**:
   - Màn 1: Hoàn thành 3 cặp từ.
   - Màn 2: Hoàn thành 5 cặp từ.
   - Màn 4: Nối từ chữ mồi `nói kháy` ➔ `kháy ...`.
   - Xem phần giải nghĩa dưới mỗi từ và hiệu ứng `Đang suy nghĩ...`.
3. Kiểm tra Supabase Dashboard ➔ Xem dữ liệu mới tự động lưu vào bảng `profiles` và `ai_vocabulary`!
