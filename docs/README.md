# BIDA Điểm Hẹn Center - Management Staff System

Dự án quản lý nhân viên phục vụ hệ thống BIDA Điểm Hẹn Center.

## Cấu trúc thư mục (Project Structure)

```text
├── frontend/          # Mã nguồn ứng dụng Client (React + Vite)
├── backend/           # Mã nguồn ứng dụng Server (NodeJS + Express)
└── docs/              # Tài liệu hướng dẫn và đặc tả hệ thống
```

## Hướng dẫn cài đặt và khởi chạy (Getting Started)

### 1. Frontend (React)
Thư mục `frontend/` chứa ứng dụng giao diện người dùng được xây dựng bằng React và Vite.

- **Cài đặt thư viện:**
  ```bash
  cd frontend
  npm install
  ```
- **Khởi chạy chế độ phát triển (Development Mode):**
  ```bash
  npm run dev
  ```
- **Xây dựng phiên bản production:**
  ```bash
  npm run build
  ```

### 2. Backend (NodeJS + Express)
Thư mục `backend/` chứa API server phục vụ các tác vụ xử lý logic, kết nối cơ sở dữ liệu.

- **Cài đặt thư viện:**
  ```bash
  cd backend
  npm install
  ```
- **Khởi chạy server ở chế độ tự động reload (Nodemon):**
  ```bash
  npm run dev
  ```
- **Khởi chạy server ở chế độ thường:**
  ```bash
  npm start
  ```
