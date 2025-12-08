# WebAdmin Configuration Guide

## Các Thay Đổi Đã Thực Hiện

### 1. Environment Variables
Đã thêm hỗ trợ environment variables cho việc cấu hình API URL:

- **`.env.development`**: Dùng cho môi trường development (localhost)
- **`.env.production`**: Dùng cho môi trường production (Docker)
- **`.env.example`**: Template cho các file env

### 2. API Configuration
**File**: `src/services/api.js`

Thay đổi:
```javascript
// Trước
const API_BASE_URL = 'http://localhost:5297';

// Sau
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5297';
```

### 3. NGINX Proxy Configuration
**File**: `nginx.conf`

Đã thêm proxy configuration để forward API requests:
```nginx
location /api {
    proxy_pass http://webapi:8080;
    # ... proxy headers và timeouts
}
```

### 4. Production Build
**File**: `Dockerfile.production`

Đã thêm build argument để truyền environment variables vào build time:
```dockerfile
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
```

### 5. Settings Page
**File**: `src/pages/settings/Settings.js`

Cập nhật hiển thị API URL động từ environment variable.

## Cách Sử Dụng

### Development Mode

```bash
cd Presentation/WebApp/WebAdmins

# Cài đặt dependencies
npm install

# Chạy dev server (sử dụng .env.development)
npm run dev
```

Truy cập: http://localhost:3000

API sẽ gọi trực tiếp đến: http://localhost:5297

### Production Mode (Docker)

```bash
# Build Docker image
docker build -f Dockerfile.production -t webadmins:prod .

# Hoặc sử dụng docker-compose
docker-compose -f docker-compose.prod.yml up webadmins
```

Trong production:
- WebAdmin chạy trên port **3000**
- NGINX sẽ proxy `/api/*` đến `webapi:8080`
- Frontend gọi API qua `/api` (relative path)

### Custom API URL

Nếu muốn thay đổi API URL, có 2 cách:

**Cách 1: Thay đổi file .env**
```bash
# .env.production
VITE_API_URL=/api
```

**Cách 2: Build argument trong Docker**
```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  -f Dockerfile.production \
  -t webadmins:prod .
```

## Lưu Ý Quan Trọng

### 1. CORS Configuration
Đảm bảo backend (WebAPI) có cấu hình CORS cho phép requests từ WebAdmin:

```csharp
// In Program.cs
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://yourdomain.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
```

### 2. Docker Networking
Trong docker-compose, đảm bảo:
- WebAdmin và WebAPI cùng network
- Service name phải khớp với proxy_pass trong nginx.conf
- Port mapping đúng

```yaml
services:
  webapi:
    ports:
      - "5297:8080"
    networks:
      - app-network

  webadmins:
    ports:
      - "3000:80"
    networks:
      - app-network
    depends_on:
      - webapi

networks:
  app-network:
    driver: bridge
```

### 3. Environment Variables trong Vite
Vite chỉ expose các biến có prefix `VITE_`:
- ✅ `VITE_API_URL` - Được expose
- ❌ `API_URL` - KHÔNG được expose

Truy cập trong code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

### 4. Build Time vs Runtime
Vite inject environment variables vào code **lúc build time**, không phải runtime.
- Nếu thay đổi `.env.production`, cần rebuild lại
- Không thể thay đổi env variables sau khi container đã build

## Testing

### Test Local Development
```bash
npm run dev
# Kiểm tra http://localhost:3000
# API calls đến http://localhost:5297
```

### Test Production Build
```bash
npm run build
npm run preview
# Kiểm tra http://localhost:4173
```

### Test Docker
```bash
docker-compose -f docker-compose.prod.yml up webadmins
# Kiểm tra http://localhost:3000
# API calls proxy qua NGINX đến webapi:8080
```

## Troubleshooting

### Lỗi: API calls failed with CORS error
**Nguyên nhân**: Backend chưa cấu hình CORS đúng
**Giải pháp**: Thêm origin của WebAdmin vào CORS policy

### Lỗi: 502 Bad Gateway từ NGINX
**Nguyên nhân**: NGINX không connect được tới backend
**Kiểm tra**:
1. Backend container có đang chạy không?
2. Service name trong proxy_pass có đúng không?
3. Port mapping có đúng không?

### Lỗi: Environment variable undefined
**Nguyên nhân**: Thiếu prefix `VITE_` hoặc chưa rebuild
**Giải pháp**: 
1. Đổi tên biến với prefix `VITE_`
2. Rebuild lại: `npm run build`

### Lỗi: Cannot read file .env
**Nguyên nhân**: File .env không tồn tại
**Giải pháp**: Copy từ `.env.example` và điền giá trị

## Production Checklist

- [ ] Cập nhật `.env.production` với giá trị production
- [ ] Kiểm tra CORS configuration trên backend
- [ ] Test API proxy qua NGINX
- [ ] Verify health check endpoint: `/health`
- [ ] Kiểm tra Docker network configuration
- [ ] Test đăng nhập và các API calls
- [ ] Verify static assets được cache đúng
- [ ] Kiểm tra security headers trong NGINX response

## References

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [NGINX Proxy Configuration](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
