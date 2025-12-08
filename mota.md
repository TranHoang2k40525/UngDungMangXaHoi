# Mô tả Hoàn Chỉnh Cho AI: Docker + CI/CD cho Dự Án Web + Mobile + Backend (.NET) + SQL Server

Tài liệu này dùng để cung cấp mô tả rõ ràng để AI có thể tự động sinh ra Dockerfile, docker-compose, cũng như pipeline CI/CD hoàn chỉnh. Mục tiêu ưu tiên:

1. **Chạy được dự án ổn định trước**
2. **Sau đó mới tăng cường bảo mật**
3. **Cấu trúc rõ ràng, tách biệt Dev và Prod**
4. **Không build mobile app trong Docker (mobile build tách riêng CI/CD)**
5. **Frontend web và admin có thể tách container để dễ scale**
6. **Sử dụng .env và secrets đúng chuẩn**

---

# 1. Cấu trúc dự án đề xuất

```
project-root/
│  docker-compose.yml
│  docker-compose.dev.yml
│  docker-compose.prod.yml
│  .env                     # env dùng khi chạy local/dev
│  .env.example            # chứa giá trị giả để đẩy lên git
│  .env.production         # env thật (không đẩy lên git)
│  .env.production.example # bản giả (đẩy lên git)
│
├─ backend/ (.NET API)
│   Dockerfile
│   Dockerfile.production
│
├─ webapp/       (React web user)
│   Dockerfile
│   Dockerfile.production
│
├─ admin/        (React Admin)
│   Dockerfile
│   Dockerfile.production
│
├─ mobile-app/   (React Native App)   ❗ **Không dockerize**
│   (Build qua CI/CD riêng, thường là Expo/EAS hoặc Fastlane)
│
└─ secrets/
    db_password.txt
    jwt_secret.txt
    db_password.example.txt
    jwt_secret.example.txt
```

---

# 2. Nguyên tắc xử lý secrets + env

## ✔ Đúng chuẩn

* `secrets/*.txt` chứa dữ liệu thật → **KHÔNG đẩy lên Git**
* `secrets/*.example.txt` chứa dữ liệu giả → **ĐƯỢC đẩy lên Git**
* `.env.production` chứa dữ liệu thật → **KHÔNG đẩy lên Git**
* `.env.production.example` chứa dữ liệu giả → **ĐƯỢC đẩy lên Git**
* `.env.example` chỉ dùng để người khác hiểu cấu hình env

## ✔ Docker đọc secrets qua:

* **Docker secrets (Swarm / CI/CD)**
* Hoặc bind mount file txt

Ví dụ trong compose prod:

```yaml
environment:
  - ConnectionStrings__Default=Server=sqlserver;User=sa;Password=/run/secrets/db_password
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

# 3. Backend (.NET) build và chạy qua Docker

## Dev

* Hot reload
* Dùng port local (**5297 như bạn đang chạy**)
* Không dùng secrets → dùng `.env`

## Prod

* Multi-stage build
* Chạy user non-root
* Đọc secrets từ file

---

# 4. Frontend Web (React): build dist và serve qua NGINX

## Dev

* Chạy `npm start`, hot reload
* Không docker hóa cho dev nếu muốn nhanh

## Prod

* Docker build ra thư mục `/usr/share/nginx/html`
* Config Nginx tối ưu
* Web user và Web admin nên tách **2 container riêng** để dễ scale

---

# 5. Mobile App (React Native / Expo)

⚠ **Không đưa mobile app vào Docker** vì:

* Build Android/iOS cần máy riêng hoặc CI runners có SDK
* Docker không phù hợp để build mobile

## ✔ Cách thực tế người ta làm

* Backend + Web chạy trong Docker
* Mobile build qua **EAS, Fastlane, Github Actions**, không liên quan Docker

---

# 6. Docker Compose Tổng Thể

## Dev (`docker-compose.dev.yml`)

* sqlserver
* backend
* webapp (tùy chọn)
* admin (tùy chọn)

## Prod (`docker-compose.prod.yml`)

* sqlserver
* backend
* webapp
* admin
* secrets mapping
* env từ `.env.production`

---

# 7. CI/CD Pipeline (GitHub Actions hoặc Jenkins)

## Dev pipeline

* Kiểm tra code
* Build backend
* Build web (nếu cần)
* Không push image

## Prod pipeline

* Build backend image
* Build webapp + admin images
* Push lên Docker Registry
* Deploy lên server qua ssh/docker compose pull

---

# 8. Yêu cầu từ AI khi triển khai

## AI phải sinh ra:

1. **Dockerfile dev + prod cho backend (.NET)**
2. **Dockerfile dev + prod cho webapp/admin (React)**
3. **docker-compose.yml**
4. **docker-compose.dev.yml**
5. **docker-compose.prod.yml**
6. **CI/CD pipeline (GitHub Actions hoặc Jenkins)**
7. **File README hướng dẫn chạy local/dev/prod**
8. **Cấu hình secrets bảo mật**

## AI cần tuân thủ:

* Ưu tiên chạy được trước
* Sau đó mới thêm bảo mật (non-root user, secrets, hạn chế expose port)
* Backend đọc env đúng chuẩn .NET
* SQL Server chạy ổn định
* Không build mobile trong docker

---

# 9. Mô tả chính để AI hiểu và làm đúng

> **Dự án của tôi gồm backend (.NET), webapp (React), admin (React) và mobile app (React Native). Tôi muốn AI tạo toàn bộ Dockerfile, docker-compose dev/prod, và CI/CD hoàn chỉnh. Prod cần dùng secrets file và .env.production. Dev chỉ cần .env. Webapp và admin chạy 2 container riêng. Mobile app không đưa vào Docker. SQL Server chạy trong container. Ưu tiên chạy được trước, sau đó mới tăng cường bảo mật. Port local backend hiện đang chạy là 5297.**

---

# 10. Kết luận

Tài liệu này mô tả đầy đủ yêu cầu để AI có thể tự động sinh ra hệ thống Docker + CI/CD hoàn chỉnh, chạy tốt ở Local Dev và Production, đồng thời đảm bảo bảo mật tiêu chuẩn.
