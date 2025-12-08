# Jenkins CI/CD Setup Guide

## Overview

This guide explains how to configure Jenkins for the UngDungMangXaHoi project's CI/CD pipeline. The pipeline automates building, testing, containerization, and deployment of both the .NET backend API and React admin frontend.

## Prerequisites

### Jenkins Server Requirements

- Jenkins 2.4+ with Pipeline plugin
- Installed plugins:
  - Pipeline
  - Git
  - Docker Pipeline
  - SSH Agent
  - Credentials Binding
  - Timestamper

### Build Agent Requirements

- Docker Engine 24.0+
- Docker Compose 2.20+
- .NET SDK 8.0+
- Node.js 20+
- Git 2.40+

## Jenkins Configuration

### 1. Install Required Plugins

Navigate to **Manage Jenkins** > **Manage Plugins** > **Available**

Install these plugins:
- Pipeline
- Docker Pipeline
- Git
- SSH Agent Plugin
- Credentials Binding Plugin
- Timestamper

### 2. Configure Credentials

Go to **Manage Jenkins** > **Manage Credentials** > **Global** > **Add Credentials**

#### GitHub Username (String)
- **ID**: `github-username`
- **Kind**: Secret text
- **Secret**: Your GitHub username
- **Description**: GitHub username for container registry

#### GitHub Container Registry Token
- **ID**: `github-container-registry`
- **Kind**: Username with password
- **Username**: Your GitHub username
- **Password**: GitHub Personal Access Token with `write:packages` scope
- **Description**: GitHub Container Registry authentication

To create GitHub PAT:
1. Go to GitHub Settings > Developer Settings > Personal Access Tokens
2. Generate new token (classic)
3. Select scopes: `write:packages`, `read:packages`, `delete:packages`
4. Copy the token

#### Production Server SSH Key
- **ID**: `prod-ssh-key`
- **Kind**: SSH Username with private key
- **Username**: Your production server SSH username (e.g., `ubuntu`, `root`)
- **Private Key**: Enter directly or from file
- **Description**: SSH key for production server deployment

### 3. Configure Environment Variables

Go to **Manage Jenkins** > **Configure System** > **Global properties** > **Environment variables**

Add these variables:
- `PROD_HOST`: Production server hostname or IP (e.g., `prod.ungdungmxh.com`)
- `PROD_DIR`: Deployment directory on production server (e.g., `/opt/ungdungmxh`)

### 4. Create Pipeline Job

1. Go to Jenkins Dashboard > **New Item**
2. Enter name: `UngDungMangXaHoi-Pipeline`
3. Select **Pipeline**
4. Click **OK**

#### Configure Job

**General:**
- Description: `CI/CD pipeline for UngDungMangXaHoi social network application`
- ☑ GitHub project: `https://github.com/your-username/UngDungMangXaHoi`

**Build Triggers:**
- ☑ GitHub hook trigger for GITScm polling
- OR ☑ Poll SCM: `H/5 * * * *` (every 5 minutes)

**Pipeline:**
- Definition: **Pipeline script from SCM**
- SCM: **Git**
- Repository URL: `https://github.com/your-username/UngDungMangXaHoi.git`
- Credentials: Select your GitHub credentials
- Branch: `*/main`
- Script Path: `Jenkinsfile`

Click **Save**

## Production Server Setup

### 1. Prepare Production Server

SSH into your production server:

```bash
ssh user@your.prod.host
```

Install Docker and Docker Compose:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone Repository

```bash
sudo mkdir -p /opt/ungdungmxh
sudo chown $USER:$USER /opt/ungdungmxh
cd /opt/ungdungmxh
git clone https://github.com/your-username/UngDungMangXaHoi.git .
```

### 3. Configure Secrets

Create and populate secret files:

```bash
cd /opt/ungdungmxh/secrets

# Database password
echo "YourSecureDbPassword123!" > db_password.txt

# JWT secrets
openssl rand -base64 32 > jwt_access_secret.txt
openssl rand -base64 32 > jwt_refresh_secret.txt

# Email password (Gmail App Password)
echo "your-gmail-app-password" > email_password.txt

# Cloudinary secret
echo "your-cloudinary-api-secret" > cloudinary_api_secret.txt

# Set proper permissions
chmod 600 *.txt
```

### 4. Initialize Database

First deployment requires database initialization:

```bash
cd /opt/ungdungmxh

# Start only SQL Server
docker-compose -f docker-compose.prod.yml up -d sqlserver

# Wait for SQL Server to be ready
sleep 30

# Apply migrations (after first deployment)
# The WebAPI container will auto-apply migrations on startup
```

## Pipeline Stages Explained

### 1. Checkout
Clones the source code from Git repository.

### 2. Validate Environment
Checks that all required tools (Docker, .NET, etc.) are available.

### 3. Restore & Build Backend
- Restores NuGet packages for the solution
- Builds the WebAPI project in Release configuration

### 4. Build Frontend
- Installs npm dependencies for React WebAdmins
- Runs production build (`npm run build`)

### 5. Build Docker Images (Parallel)
Creates production Docker images:
- **WebAPI**: Uses `Dockerfile.production` with multi-stage build
- **WebAdmins**: Uses `Dockerfile.production` with NGINX serving

Both images are tagged with:
- Git commit hash (first 8 chars)
- `latest` tag

### 6. Security Scan
Runs Trivy vulnerability scanner on Docker images (optional, continues on failure).

### 7. Push Images to Registry
Pushes both Docker images to GitHub Container Registry (`ghcr.io`).

### 8. Deploy to Production
- SSHs into production server
- Pulls latest code from Git
- Pulls latest Docker images
- Validates secrets exist
- Creates backup of current deployment
- Deploys new containers using `docker-compose.prod.yml`
- Waits for health checks to pass
- Rolls back on failure

### 9. Health Check
Verifies deployed services are responding:
- Backend API: `http://localhost:5297/health`
- WebAdmins: `http://localhost:3000/health`

## Troubleshooting

### Pipeline Fails at "Build Docker Images"

**Error**: `Cannot connect to Docker daemon`

**Solution**: Ensure Jenkins user is in docker group:
```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### Pipeline Fails at "Push Images to Registry"

**Error**: `unauthorized: authentication required`

**Solution**: 
1. Verify GitHub PAT has `write:packages` scope
2. Check `github-container-registry` credentials in Jenkins
3. Ensure GitHub username is correct in `github-username` credential

### Deployment Fails - Services Unhealthy

**Error**: `Services failed to become healthy`

**Solution**:
1. SSH into production server
2. Check logs:
   ```bash
   cd /opt/ungdungmxh
   docker-compose -f docker-compose.prod.yml logs webapi
   docker-compose -f docker-compose.prod.yml logs webadmins
   ```
3. Common issues:
   - Missing or incorrect secrets
   - Database not running
   - Port conflicts (5297, 3000, 1434)

### Database Connection Failed

**Error**: `A connection was successfully established with the server, but then an error occurred`

**Solution**:
1. Verify `secrets/db_password.txt` contains correct password
2. Ensure SQL Server container is running:
   ```bash
   docker-compose -f docker-compose.prod.yml ps sqlserver
   ```
3. Check connection string in `docker-compose.prod.yml`:
   ```yaml
   ConnectionStrings__DefaultConnection: "Server=sqlserver,1433;Database=UngDungMangXaHoi;..."
   ```

### SSH Connection Failed

**Error**: `Permission denied (publickey)`

**Solution**:
1. Verify SSH key is added to production server's `~/.ssh/authorized_keys`
2. Check Jenkins credential `prod-ssh-key` has correct private key
3. Test SSH connection manually:
   ```bash
   ssh -i /path/to/key user@prod-server
   ```

### Frontend 502 Bad Gateway

**Error**: NGINX returns 502 when accessing WebAdmins

**Solution**:
1. Check if backend is running:
   ```bash
   curl http://localhost:5297/health
   ```
2. Verify NGINX configuration in `nginx.conf`:
   ```nginx
   location /api {
     proxy_pass http://host.docker.internal:5297;
   }
   ```
3. Check WebAdmins logs:
   ```bash
   docker-compose -f docker-compose.prod.yml logs webadmins
   ```

## Manual Deployment

If you need to deploy manually without Jenkins:

```bash
# On development machine
docker build -f Presentation/WebAPI/Dockerfile.production -t ghcr.io/username/ungdungmxh-webapi:manual .
docker build -f Presentation/WebApp/WebAdmins/Dockerfile.production -t ghcr.io/username/ungdungmxh-webadmins:manual Presentation/WebApp/WebAdmins

docker push ghcr.io/username/ungdungmxh-webapi:manual
docker push ghcr.io/username/ungdungmxh-webadmins:manual

# On production server
cd /opt/ungdungmxh
export WEBAPI_IMAGE=ghcr.io/username/ungdungmxh-webapi:manual
export WEBADMINS_IMAGE=ghcr.io/username/ungdungmxh-webadmins:manual

docker-compose -f docker-compose.prod.yml pull webapi webadmins
docker-compose -f docker-compose.prod.yml up -d webapi webadmins
```

## Rollback Procedure

If deployment fails and auto-rollback doesn't work:

```bash
# SSH into production server
ssh user@prod-server
cd /opt/ungdungmxh

# View deployment backups
ls -la deployment_backup_*.txt

# Stop current deployment
docker-compose -f docker-compose.prod.yml down webapi webadmins

# Pull previous image version
export WEBAPI_IMAGE=ghcr.io/username/ungdungmxh-webapi:<previous-commit>
export WEBADMINS_IMAGE=ghcr.io/username/ungdungmxh-webadmins:<previous-commit>

docker-compose -f docker-compose.prod.yml pull webapi webadmins
docker-compose -f docker-compose.prod.yml up -d webapi webadmins
```

## Performance Optimization

### Parallel Builds

The pipeline builds WebAPI and WebAdmins Docker images in parallel to reduce build time.

### Docker Layer Caching

Dockerfiles are optimized with proper layer ordering:
1. Copy only dependency files (csproj, package.json)
2. Restore/install dependencies
3. Copy source code
4. Build application

This ensures dependency layers are cached and only rebuilt when dependencies change.

### Image Size Optimization

- Multi-stage builds remove build tools from final images
- Production images use minimal base images (`mcr.microsoft.com/dotnet/aspnet`, `nginx:alpine`)
- Static assets are built during image creation, not at runtime

## Monitoring and Logs

### View Pipeline Logs

In Jenkins:
1. Go to job page
2. Click on build number
3. Click **Console Output**

### View Container Logs

On production server:

```bash
# All services
docker-compose -f docker-compose.prod.yml logs

# Specific service
docker-compose -f docker-compose.prod.yml logs -f webapi
docker-compose -f docker-compose.prod.yml logs -f webadmins

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Monitor Resources

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Security Best Practices

1. **Never commit secrets**: Use Jenkins credentials and Docker secrets
2. **Use SSH keys**: Not passwords for production access
3. **Scan images**: Pipeline includes Trivy vulnerability scanning
4. **Update regularly**: Keep Docker, Jenkins, and dependencies updated
5. **Non-root containers**: All containers run as non-root users
6. **Network isolation**: Use Docker networks to isolate services
7. **Read-only filesystems**: Where possible in production

## Next Steps

1. Configure webhook in GitHub repository to trigger Jenkins builds
2. Set up monitoring with Prometheus + Grafana
3. Configure SSL/TLS certificates for HTTPS
4. Implement automated testing in pipeline
5. Add staging environment for testing before production
6. Set up log aggregation (ELK stack or similar)

## Support

For issues or questions:
- Check Jenkins console output
- Review container logs on production server
- Verify all credentials and environment variables
- Ensure production server meets requirements
