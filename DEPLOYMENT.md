# 🚀 Deployment Guide - UngDungMangXaHoi

Hướng dẫn triển khai ứng dụng cho các môi trường khác nhau.

---

## 📋 Mục lục

1. [Tổng quan môi trường](#tổng-quan-môi-trường)
2. [Development (Dev)](#development-dev)
3. [Production (Prod)](#production-prod)
4. [Staging (Optional)](#staging-optional)
5. [Secrets Management](#secrets-management)
6. [Troubleshooting](#troubleshooting)

---

## 🏗️ Tổng quan môi trường

### Cấu trúc files:

```
├── docker-compose.yml              # Base config (shared)
├── docker-compose.override.yml     # Dev overrides (auto-loaded)
├── docker-compose.prod.yml         # Production config
├── .env                            # Dev environment variables
├── .env.example                    # Dev template (commit to git)
├── .env.production                 # Prod environment variables
├── .env.production.example         # Prod template (commit to git)
├── secrets/                        # Production secrets
│   ├── *.txt.example              # Example secrets (commit)
│   └── *.txt                      # Actual secrets (DO NOT commit)
└── Presentation/WebAPI/
    ├── Dockerfile                 # Dev dockerfile (hot-reload)
    └── Dockerfile.production      # Prod dockerfile (optimized)
```

---

## 💻 Development (Dev)

### Đặc điểm:
- Hot-reload (tự động restart khi code thay đổi)
- Debug ports exposed
- Volume mounts cho source code
- Detailed logging
- SQL Server port exposed (1434)

### Setup lần đầu:

```powershell
# 1. Clone repository
git clone <repo-url>
cd UngDungMangXaHoi

# 2. Tạo .env từ template
cp .env.example .env

# 3. Cập nhật .env với giá trị dev của bạn
# (Có thể dùng giá trị mặc định trong .env.example)

# 4. Start Docker Desktop

# 5. Chạy development stack
docker-compose up -d

# 6. Xem logs
docker-compose logs -f webapi
```

### Lệnh thường dùng:

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild sau khi sửa Dockerfile
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Exec vào container
docker-compose exec webapi bash

# Restart service
docker-compose restart webapi

# Xóa volumes (CẢNH BÁO: Mất dữ liệu!)
docker-compose down -v
```

### Hot-reload:

Code thay đổi → tự động rebuild → container restart → app chạy version mới ✅

Không cần build lại Docker image!

---

## 🏭 Production (Prod)

### Đặc điểm:
- Optimized multi-stage build
- No dev tools, no hot-reload
- Resource limits (CPU, Memory)
- High availability (2 replicas)
- Docker secrets cho sensitive data
- Health checks
- No source code volume mounts

### Setup lần đầu:

```powershell
# 1. Tạo .env.production
cp .env.production.example .env.production

# 2. CẬP NHẬT .env.production với secrets THẬT
# QUAN TRỌNG: Đừng dùng giá trị example!

# 3. Tạo secrets files
cd secrets
cp db_password.txt.example db_password.txt
cp jwt_access_secret.txt.example jwt_access_secret.txt
cp jwt_refresh_secret.txt.example jwt_refresh_secret.txt
cp cloudinary_api_secret.txt.example cloudinary_api_secret.txt
cp email_password.txt.example email_password.txt

# 4. CẬP NHẬT từng file .txt với secret THẬT

# 5. Set permissions (Linux/Mac)
chmod 600 *.txt

# 6. Quay về root directory
cd ..
```

### Deploy Production:

```powershell
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Xem logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Scale WebAPI (increase replicas)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale webapi=3
```

### Production Checklist:

- [ ] Đã thay tất cả secrets bằng giá trị mới (không dùng example)
- [ ] Đã set strong password cho SQL Server (min 8 chars, mixed case, digits, special)
- [ ] Đã tạo JWT secrets mới (64+ characters random)
- [ ] Đã cấu hình Cloudinary production account
- [ ] Đã cấu hình email production (SendGrid/AWS SES thay vì Gmail)
- [ ] Đã set CORS origins đúng với domain production
- [ ] Đã test health checks
- [ ] Đã setup backup cho database volume
- [ ] Đã setup monitoring (Application Insights/Sentry)
- [ ] Đã setup reverse proxy (nginx/Traefik) với SSL

---

## 🧪 Staging (Optional)

Môi trường giống production nhưng cho testing:

```powershell
# 1. Tạo .env.staging
cp .env.production.example .env.staging

# 2. Tạo docker-compose.staging.yml
# (Copy từ docker-compose.prod.yml và sửa tên container, volumes)

# 3. Deploy staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

---

## 🔐 Secrets Management

### Development:
- Secrets trong `.env` file
- Chia sẻ `.env` trong team (không có production data)

### Production:
- **NEVER** commit `.env.production` hoặc `secrets/*.txt`
- Dùng Docker secrets (mounted as files trong container)
- Hoặc dùng cloud secret managers:
  - Azure Key Vault
  - AWS Secrets Manager
  - HashiCorp Vault

### Generate Strong Secrets:

#### PowerShell (Windows):
```powershell
# Random 64-character string
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Base64 64-byte secret
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

#### Linux/Mac:
```bash
# Random 64-character string
openssl rand -base64 64

# Hex string
openssl rand -hex 32
```

### Rotate Secrets:

Thay đổi secrets định kỳ (recommended: mỗi 90 ngày):

```powershell
# 1. Generate new secrets
# 2. Update secrets/*.txt files
# 3. Update .env.production
# 4. Recreate containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
```

---

## 🔍 Troubleshooting

### Container không start:

```powershell
# Xem logs
docker-compose logs webapi

# Xem chi tiết container
docker inspect ungdungmxh-webapi

# Test connection vào SQL Server
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "<password>" -Q "SELECT 1"
```

### Database connection failed:

- Check `DB_PASSWORD` trong `.env` khớp với password trong container
- Check SQL Server đã start: `docker-compose ps`
- Check health check: `docker-compose ps` (should show "healthy")

### Secrets không đọc được:

```powershell
# Check secrets files tồn tại
ls secrets/*.txt

# Check Docker có mount secrets không
docker-compose exec webapi ls /run/secrets/

# Read secret trong container
docker-compose exec webapi cat /run/secrets/db_password
```

### Port conflict:

```powershell
# Xem process đang dùng port
netstat -ano | findstr :1433
netstat -ano | findstr :5297

# Kill process (Windows)
taskkill /PID <PID> /F
```

### Rebuild sau khi sửa code (Production):

```powershell
# QUAN TRỌNG: Production không có hot-reload!
# Cần rebuild image sau mỗi code change

# 1. Stop containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# 2. Rebuild images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# 3. Start lại
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring & Health Checks

### Health Check Endpoints:

- **WebAPI**: `http://localhost:5297/health`
- **SQL Server**: Tự động check bằng `sqlcmd` trong healthcheck

### Xem health status:

```powershell
docker-compose ps

# Output:
# NAME                    STATUS
# ungdungmxh-sqlserver   Up (healthy)
# ungdungmxh-webapi      Up (healthy)
```

### Test health manually:

```powershell
# WebAPI health
curl http://localhost:5297/health

# SQL Server health
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "<password>" -Q "SELECT @@VERSION"
```

---

## 🔄 CI/CD Integration

Khi setup Jenkins/GitHub Actions, sử dụng:

### Development Branch → Auto Deploy Dev:
```yaml
docker-compose up -d --build
```

### Main Branch → Auto Deploy Staging:
```yaml
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

### Release Tag → Manual Deploy Production:
```yaml
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📝 Best Practices

1. ✅ **Luôn dùng `.env` files** - Không hardcode secrets
2. ✅ **Commit `.example` files** - Template cho team
3. ✅ **NEVER commit actual `.env` hoặc `secrets/*.txt`**
4. ✅ **Use Docker secrets cho production** - An toàn hơn env vars
5. ✅ **Generate strong secrets** - Min 32 characters random
6. ✅ **Rotate secrets định kỳ** - Mỗi 90 ngày
7. ✅ **Test ở staging trước khi production**
8. ✅ **Monitor health checks** - Alert khi down
9. ✅ **Backup database volumes** - Định kỳ hàng ngày
10. ✅ **Use reverse proxy với SSL** - nginx/Traefik + Let's Encrypt

---

## 🆘 Support

Gặp vấn đề? Check:
1. Logs: `docker-compose logs -f`
2. Container status: `docker-compose ps`
3. Health checks: `docker inspect <container>`
4. Network: `docker network inspect ungdungmangxahoi_app-network`

---

**Happy Deploying! 🚀**
