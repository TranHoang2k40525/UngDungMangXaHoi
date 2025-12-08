# 🐳 Docker & CI/CD Setup Guide

Complete Docker and CI/CD configuration for UngDungMangXaHoi project.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Secrets Management](#secrets-management)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux) ≥ 20.10
- **Docker Compose** ≥ 2.0
- **Git** ≥ 2.30
- **Node.js** ≥ 20.x (for local development)
- **.NET SDK** ≥ 8.0 (for local development)

### Required Accounts
- GitHub account (for CI/CD)
- Docker Hub or GitHub Container Registry (for production images)
- Production server with SSH access

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-org/UngDungMangXaHoi.git
cd UngDungMangXaHoi
```

### 2. Setup Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
# nano .env  # or use your favorite editor
```

### 3. Run Development Environment
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

### 4. Access Services
- **Backend API**: http://localhost:5297
- **WebAdmins**: http://localhost:3000
- **SQL Server**: localhost:1434

---

## 💻 Development Setup

### Option 1: Full Docker Development

```bash
# Start services with hot reload
docker-compose -f docker-compose.dev.yml up

# Rebuild specific service
docker-compose -f docker-compose.dev.yml up --build backend

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f webadmin
```

**Hot Reload:**
- ✅ Backend: Automatic via `dotnet watch`
- ✅ WebAdmins: Automatic via Vite HMR
- ✅ Changes in source code reflect immediately

### Option 2: Hybrid Development

Run database in Docker, run code locally:

```bash
# Start only database
docker-compose -f docker-compose.dev.yml up sqlserver -d

# Run backend locally
cd Presentation/WebAPI
dotnet run

# Run webadmin locally (separate terminal)
cd Presentation/WebApp/WebAdmins
npm install
npm run dev
```

### Development Tips

**View container stats:**
```bash
docker stats
```

**Execute commands in container:**
```bash
# Backend bash
docker exec -it mxh-backend-dev /bin/bash

# SQL Server query
docker exec -it mxh-sqlserver-dev /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourPassword'
```

**Reset everything:**
```bash
docker-compose -f docker-compose.dev.yml down -v
docker system prune -af
```

---

## 🏭 Production Deployment

### Prerequisites

1. **Prepare Secrets**
```bash
# Create secrets directory
mkdir -p secrets

# Create secret files (NEVER commit these!)
echo "YourProductionPassword" > secrets/db_password.txt
echo "YourJWTSecret" > secrets/jwt_access_secret.txt
echo "YourRefreshSecret" > secrets/jwt_refresh_secret.txt
echo "YourCloudinarySecret" > secrets/cloudinary_api_secret.txt
echo "YourEmailPassword" > secrets/email_password.txt
```

2. **Configure Environment**
```bash
# Copy production env example
cp .env.production.example .env.production

# Edit with your production values
nano .env.production
```

### Manual Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Push to registry (if using external registry)
docker-compose -f docker-compose.prod.yml push

# Deploy on production server
docker-compose -f docker-compose.prod.yml up -d

# Check health
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

### Production Best Practices

**Security:**
- ✅ Secrets stored in files (not environment variables)
- ✅ Non-root user in containers
- ✅ TLS/SSL enabled via NGINX
- ✅ Network isolation between services
- ✅ Resource limits configured

**Monitoring:**
```bash
# View logs
docker-compose -f docker-compose.prod.yml logs --tail=100 -f

# Check resource usage
docker stats

# Health checks
curl http://your-domain.com/health
```

**Backup Database:**
```bash
# Manual backup
docker exec mxh-sqlserver-prod /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P $(cat secrets/db_password.txt) \
  -Q "BACKUP DATABASE ungdungmangxahoiv_2 TO DISK='/var/opt/mssql/backups/backup.bak'"

# Copy backup to host
docker cp mxh-sqlserver-prod:/var/opt/mssql/backups/backup.bak ./backups/
```

---

## 🔄 CI/CD Pipeline

### Jenkins Pipeline

The project uses Jenkins for automated CI/CD. The pipeline is defined in `Jenkinsfile` at the project root.

**Pipeline Stages:**
1. **Checkout** - Clone source code from Git
2. **Validate Environment** - Check Docker, .NET, Node.js versions
3. **Restore & Build Backend** - Build .NET WebAPI in Release mode
4. **Build Frontend** - Build React WebAdmins with npm
5. **Build Docker Images** - Create production images (parallel)
6. **Security Scan** - Scan images with Trivy (optional)
7. **Push Images to Registry** - Push to GitHub Container Registry
8. **Deploy to Production** - Deploy via SSH to production server
9. **Health Check** - Verify services are responding

**See detailed setup instructions in [JENKINS_SETUP.md](./JENKINS_SETUP.md)**

### Quick Jenkins Setup

1. **Configure Jenkins Credentials:**
   - `github-username` - GitHub username (secret text)
   - `github-container-registry` - GitHub username + PAT token
   - `prod-ssh-key` - SSH private key for production server

2. **Set Environment Variables:**
   - `PROD_HOST` - Production server hostname/IP
   - `PROD_DIR` - Deployment directory (e.g., `/opt/ungdungmxh`)

3. **Create Pipeline Job:**
   - New Item > Pipeline
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: `https://github.com/your-org/UngDungMangXaHoi.git`
   - Script Path: `Jenkinsfile`

4. **Trigger Build:**
   - Push to `main` branch
   - Or manually click "Build Now" in Jenkins

### Monitor Pipeline

- View builds in Jenkins dashboard
- Check console output for each stage
- Review deployment logs on production server

### GitHub Container Registry Setup

Create GitHub Personal Access Token:
```bash
# Go to GitHub Settings > Developer Settings > Personal Access Tokens
# Generate new token (classic)
# Select scopes: write:packages, read:packages, delete:packages
````

---

## 🔐 Secrets Management

### Development (.env)
```dotenv
DB_PASSWORD=YourDevPassword
JWT_ACCESS_SECRET=dev_secret_key
# ... other dev secrets
```

### Production (secrets files)
```
secrets/
├── db_password.txt
├── jwt_access_secret.txt
├── jwt_refresh_secret.txt
├── cloudinary_api_secret.txt
└── email_password.txt
```

**⚠️ IMPORTANT:**
- `.env` is in `.gitignore` - NEVER commit it
- `secrets/*.txt` are in `.gitignore` - NEVER commit them
- Use `.env.example` and `secrets/*.example.txt` as templates
- Rotate secrets regularly

### Reading Secrets in Code

**Backend (.NET):**
```csharp
// From environment variable
var jwtSecret = Environment.GetEnvironmentVariable("JWT_ACCESS_SECRET");

// From Docker secret file
var jwtSecret = File.ReadAllText("/run/secrets/jwt_access_secret");
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Port already in use**
```bash
# Windows
netstat -ano | findstr :5297
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5297 | xargs kill -9
```

**2. Database connection failed**
```bash
# Check if SQL Server is running
docker ps | grep sqlserver

# Check connection
docker exec -it mxh-sqlserver-dev /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourPassword' -Q 'SELECT 1'

# View SQL Server logs
docker logs mxh-sqlserver-dev
```

**3. Container keeps restarting**
```bash
# View logs
docker logs mxh-backend-dev --tail=100

# Check health status
docker inspect mxh-backend-dev | grep -A 10 "Health"

# Restart with fresh state
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up
```

**4. Hot reload not working**
```bash
# Windows: Enable polling file watcher
# Set in docker-compose.dev.yml:
environment:
  - DOTNET_USE_POLLING_FILE_WATCHER=1

# Rebuild container
docker-compose -f docker-compose.dev.yml up --build
```

**5. Out of disk space**
```bash
# Clean up Docker
docker system prune -af --volumes

# Check disk usage
docker system df
```

### Debug Mode

**Enable debug logging:**
```bash
# docker-compose.dev.yml
environment:
  - ASPNETCORE_ENVIRONMENT=Development
  - Logging__LogLevel__Default=Debug
  - Logging__LogLevel__Microsoft=Information
```

**Enter container for debugging:**
```bash
docker exec -it mxh-backend-dev /bin/bash
```

---

## 📊 Monitoring & Logs

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 webadmin
```

### Resource Monitoring

```bash
# Real-time stats
docker stats

# Disk usage
docker system df

# Network info
docker network inspect app-network
```

### Health Checks

```bash
# Backend API
curl http://localhost:5297/health

# WebAdmins
curl http://localhost:3000/health

# Database
docker exec mxh-sqlserver-prod /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P $(cat secrets/db_password.txt) -Q 'SELECT @@VERSION'
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [.NET Docker Documentation](https://learn.microsoft.com/en-us/dotnet/core/docker/)
- [NGINX Documentation](https://nginx.org/en/docs/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

