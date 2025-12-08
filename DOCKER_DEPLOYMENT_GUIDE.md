# 🚀 Docker + CI/CD Deployment Guide

Hướng dẫn chi tiết để chạy dự án UngDungMangXaHoi với Docker và CI/CD.

## 📋 Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Setup ban đầu](#setup-ban-đầu)
- [Chạy Local Development](#chạy-local-development)
- [Chạy Production](#chạy-production)
- [CI/CD Pipeline](#cicd-pipeline)
- [Xử lý sự cố](#xử-lý-sự-cố)

---

## 🔧 Yêu cầu hệ thống

- **Docker**: >= 24.0.0
- **Docker Compose**: >= 2.20.0
- **.NET SDK**: 8.0 (cho local build)
- **Node.js**: >= 20.x (cho build frontend)
- **Git**: Để clone và quản lý mã nguồn

---

## 📁 Cấu trúc dự án

```
UngDungMangXaHoi/
├── docker-compose.yml              # Base configuration
├── docker-compose.dev.yml          # Development overrides
├── docker-compose.prod.yml         # Production overrides
├── .env                            # Development environment (KHÔNG commit)
├── .env.example                    # Template cho .env
├── .env.production                 # Production environment (KHÔNG commit)
├── .env.production.example         # Template cho .env.production
├── Jenkinsfile                     # CI/CD pipeline
├── Presentation/
│   ├── WebAPI/
│   │   ├── Dockerfile              # Dev Dockerfile
│   │   └── Dockerfile.production   # Prod Dockerfile
│   └── WebApp/
│       ├── WebUsers/
│       │   ├── Dockerfile
│       │   └── Dockerfile.production
│       └── WebAdmins/
│           ├── Dockerfile
│           └── Dockerfile.production
└── secrets/
    ├── db_password.txt             # KHÔNG commit
    ├── jwt_access_secret.txt       # KHÔNG commit
    ├── jwt_refresh_secret.txt      # KHÔNG commit
    ├── cloudinary_api_secret.txt   # KHÔNG commit
    ├── email_password.txt          # KHÔNG commit
    └── *.txt.example               # Templates (commit được)
```

---

## 🎯 Setup ban đầu

### 1. Clone repository

```bash
git clone https://github.com/your-username/UngDungMangXaHoi.git
cd UngDungMangXaHoi
```

### 2. Tạo file môi trường

#### Development (.env)

```bash
# Copy từ example
cp .env.example .env

# Chỉnh sửa .env với editor
notepad .env  # Windows
nano .env     # Linux/Mac
```

#### Production (.env.production)

```bash
# Copy từ example
cp .env.production.example .env.production

# Chỉnh sửa .env.production với giá trị thực
notepad .env.production  # Windows
```

### 3. Tạo secrets files

```bash
cd secrets

# Copy từ examples
cp db_password.txt.example db_password.txt
cp jwt_access_secret.txt.example jwt_access_secret.txt
cp jwt_refresh_secret.txt.example jwt_refresh_secret.txt
cp cloudinary_api_secret.txt.example cloudinary_api_secret.txt
cp email_password.txt.example email_password.txt

# Chỉnh sửa từng file với giá trị thực
notepad db_password.txt
notepad jwt_access_secret.txt
# ... (tương tự cho các file còn lại)

cd ..
```

**⚠️ QUAN TRỌNG:** Không bao giờ commit các file sau vào git:
- `.env`
- `.env.production`
- `secrets/*.txt` (chỉ commit `*.txt.example`)

---

## 💻 Chạy Local Development

### Khởi động tất cả services

```bash
# Chạy với docker-compose.dev.yml
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Kiểm tra logs

```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs của một service cụ thể
docker-compose logs -f webapi
docker-compose logs -f webapp
docker-compose logs -f webadmins
docker-compose logs -f sqlserver
```

### Truy cập ứng dụng

- **Backend API**: http://localhost:5297
- **Web User**: http://localhost:5173
- **Web Admin**: http://localhost:3000
- **SQL Server**: `localhost,1434`

### Hot reload

- **Backend**: Code sẽ tự động rebuild khi thay đổi file `.cs`
- **WebAdmins**: Vite hot reload khi thay đổi file React
- **WebUsers**: Nginx serve static files (cần rebuild nếu thay đổi)

### Dừng services

```bash
# Dừng nhưng giữ data
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Dừng và xóa volumes (⚠️ mất data)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

---

## 🏭 Chạy Production

### 1. Build images (local test)

```bash
# Build WebAPI
docker build -f Presentation/WebAPI/Dockerfile.production -t ungdungmxh-webapi:latest .

# Build WebApp
docker build -f Presentation/WebApp/WebUsers/Dockerfile.production -t ungdungmxh-webapp:latest ./Presentation/WebApp/WebUsers

# Build WebAdmins
docker build -f Presentation/WebApp/WebAdmins/Dockerfile.production -t ungdungmxh-webadmins:latest ./Presentation/WebApp/WebAdmins
```

### 2. Chạy Production stack (local test)

```bash
# Load environment từ .env.production
export $(cat .env.production | xargs)

# Khởi động với prod config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Kiểm tra health

```bash
# Backend health
curl http://localhost:5297/health

# WebApp health
curl http://localhost:5173/health

# WebAdmins health
curl http://localhost:3000/health
```

### 4. Scale services

```bash
# Scale backend lên 3 instances
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale webapi=3

# Scale frontend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale webapp=2 --scale webadmins=2
```

---

## 🔄 CI/CD Pipeline

### Jenkins Setup

#### 1. Cài đặt Jenkins plugins

- Docker Pipeline
- GitHub Integration
- SSH Agent

#### 2. Cấu hình Credentials

Thêm các credentials sau trong Jenkins:

1. **github-username**: Username GitHub của bạn
2. **github-container-registry**: 
   - Username: GitHub username
   - Password: GitHub Personal Access Token (với quyền `write:packages`)
3. **prod-ssh-key**: SSH private key để deploy lên server production

#### 3. Cấu hình Environment Variables

Trong Jenkins pipeline configuration, thêm:

```bash
PROD_HOST=your-production-server.com
PROD_DIR=/opt/ungdungmxh
```

### GitHub Actions (Alternative)

Nếu dùng GitHub Actions thay vì Jenkins, tạo file `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Login to GitHub Container Registry
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push WebAPI
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./Presentation/WebAPI/Dockerfile.production
        push: true
        tags: ghcr.io/${{ github.repository }}/webapi:latest
    
    - name: Build and push WebApp
      uses: docker/build-push-action@v4
      with:
        context: ./Presentation/WebApp/WebUsers
        file: ./Presentation/WebApp/WebUsers/Dockerfile.production
        push: true
        tags: ghcr.io/${{ github.repository }}/webapp:latest
    
    - name: Build and push WebAdmins
      uses: docker/build-push-action@v4
      with:
        context: ./Presentation/WebApp/WebAdmins
        file: ./Presentation/WebApp/WebAdmins/Dockerfile.production
        push: true
        tags: ghcr.io/${{ github.repository }}/webadmins:latest
```

### Production Server Setup

#### 1. Cài đặt Docker trên server

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER
```

#### 2. Clone repository trên server

```bash
cd /opt
sudo git clone https://github.com/your-username/UngDungMangXaHoi.git
cd UngDungMangXaHoi
```

#### 3. Setup secrets trên server

```bash
# Tạo secrets files với giá trị production thực
cd secrets
sudo nano db_password.txt
sudo nano jwt_access_secret.txt
# ... (các file còn lại)
```

#### 4. Setup .env.production

```bash
sudo nano .env.production
# Điền các giá trị production
```

#### 5. Deploy

```bash
# Pull images từ registry
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Khởi động
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Kiểm tra logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

---

## 🔍 Xử lý sự cố

### Container không khởi động

```bash
# Kiểm tra logs
docker-compose logs [service-name]

# Kiểm tra container status
docker-compose ps

# Restart service
docker-compose restart [service-name]
```

### SQL Server không kết nối

```bash
# Kiểm tra SQL Server container
docker-compose logs sqlserver

# Test connection từ host
docker exec -it ungdungmxh-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourPassword

# Kiểm tra network
docker network inspect ungdungmangxahoi_app-network
```

### Backend không kết nối database

```bash
# Kiểm tra connection string trong logs
docker-compose logs webapi | grep "Connection"

# Restart backend
docker-compose restart webapi
```

### Frontend không gọi được API

```bash
# Kiểm tra nginx config
docker exec ungdungmxh-webapp cat /etc/nginx/conf.d/default.conf

# Kiểm tra network connectivity
docker exec ungdungmxh-webapp ping webapi
```

### Port conflicts

```bash
# Kiểm tra port đang sử dụng
netstat -ano | findstr :5297  # Windows
lsof -i :5297                 # Linux/Mac

# Thay đổi port trong docker-compose.yml
ports:
  - "5298:5297"  # Host:Container
```

### Xóa tất cả và bắt đầu lại

```bash
# Dừng tất cả
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Xóa images
docker rmi $(docker images 'ungdungmxh*' -q)

# Rebuild và start
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

---

## 📚 Tài liệu bổ sung

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Chi tiết về deployment
- [DOCKER_README.md](./DOCKER_README.md) - Chi tiết về Docker setup
- [JENKINS_SETUP.md](./JENKINS_SETUP.md) - Chi tiết về Jenkins configuration
- [mota.md](./mota.md) - Mô tả yêu cầu chi tiết

---

## 🤝 Đóng góp

Nếu gặp vấn đề hoặc có đề xuất cải thiện, vui lòng tạo issue hoặc pull request.

---

## 📝 License

[Thêm license của bạn ở đây]
