pipeline {
  agent any

  parameters {
    string(name: 'DOCKER_NAMESPACE', defaultValue: 'minhvu0809', description: 'Docker Hub username')
    string(name: 'PROD_HOST', defaultValue: 'host.docker.internal', description: 'Production server hostname (not used in current deployment)')
    string(name: 'PROD_DIR', defaultValue: '/home/minhvu/ungdungmxh', description: 'Production deployment directory (for reference only)')
    string(name: 'WSL_DISTRO', defaultValue: 'Ubuntu', description: 'WSL2 distribution name (not used in current deployment)')
    booleanParam(name: 'USE_CLOUDFLARE_TUNNEL', defaultValue: true, description: 'Deploy with Cloudflare Tunnel')
  }

  environment {
    // Registry and image name pieces
    REGISTRY = 'docker.io'
    DOCKER_NAMESPACE = "${params.DOCKER_NAMESPACE}"
    WEBAPI_IMAGE_NAME = "${DOCKER_NAMESPACE}/ungdungmxh-webapi"
    WEBAPP_IMAGE_NAME = "${DOCKER_NAMESPACE}/ungdungmxh-webapp"
    WEBADMINS_IMAGE_NAME = "${DOCKER_NAMESPACE}/ungdungmxh-webadmins"
    TAG = "${env.GIT_COMMIT?.substring(0,8) ?: 'latest'}"
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Docker Images') {
      parallel {
        stage('Build WebAPI') {
          steps {
            script {
              env.FULL_WEBAPI_IMAGE = "${REGISTRY}/${WEBAPI_IMAGE_NAME}:${TAG}"
            }
            echo "Building WebAPI image ${FULL_WEBAPI_IMAGE}"
            sh "docker build -f Presentation/WebAPI/Dockerfile.production -t ${FULL_WEBAPI_IMAGE} ."
          }
        }
        
        stage('Build WebApp (Users)') {
          steps {
            script {
              env.FULL_WEBAPP_IMAGE = "${REGISTRY}/${WEBAPP_IMAGE_NAME}:${TAG}"
            }
            echo "Building WebApp (Users) image ${FULL_WEBAPP_IMAGE}"
            sh "docker build -f Presentation/WebApp/WebUsers/Dockerfile.production -t ${FULL_WEBAPP_IMAGE} Presentation/WebApp/WebUsers"
          }
        }
        
        stage('Build WebAdmins') {
          steps {
            script {
              env.FULL_WEBADMINS_IMAGE = "${REGISTRY}/${WEBADMINS_IMAGE_NAME}:${TAG}"
            }
            echo "Building WebAdmins image ${FULL_WEBADMINS_IMAGE}"
            sh "docker build -f Presentation/WebApp/WebAdmins/Dockerfile.production -t ${FULL_WEBADMINS_IMAGE} Presentation/WebApp/WebAdmins"
          }
        }
      }
    }

    stage('Push images to registry') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'docker-registry-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh 'echo "Logging into Docker registry ${REGISTRY}"'
          sh 'echo $DOCKER_PASS | docker login ${REGISTRY} -u $DOCKER_USER --password-stdin'
          sh 'docker push ${FULL_WEBAPI_IMAGE}'
          sh 'docker push ${FULL_WEBAPP_IMAGE}'
          sh 'docker push ${FULL_WEBADMINS_IMAGE}'
          sh 'docker logout ${REGISTRY}'
        }
      }
    }

    stage('Deploy to production') {
      steps {
        script {
          def PROD_DIR = params.PROD_DIR
          def USE_TUNNEL = params.USE_CLOUDFLARE_TUNNEL
          
          // Compose files to use
          def COMPOSE_FILES = "-f docker-compose.yml -f docker-compose.prod.yml"
          if (USE_TUNNEL) {
            COMPOSE_FILES = "${COMPOSE_FILES} -f docker-compose.tunnel.yml"
          }
          
          echo "Deploying to WSL2:${PROD_DIR}"
          echo "Using Cloudflare Tunnel: ${USE_TUNNEL}"
          
          // Use SSH key and DB password from Jenkins Credentials
          withCredentials([
            sshUserPrivateKey(credentialsId: 'prod-ssh-key', keyFileVariable: 'SSH_KEY'),
            string(credentialsId: 'db-password', variable: 'DB_PASSWORD')
          ]) {
            sh """
              # Setup SSH key for container
              mkdir -p ~/.ssh
              chmod 700 ~/.ssh
              cp "\${SSH_KEY}" ~/.ssh/id_rsa
              chmod 600 ~/.ssh/id_rsa
              
              # Create deployment script that will run inside container
              cat > /tmp/deploy-wsl2.sh << 'DEPLOY_SCRIPT_EOF'
#!/bin/bash
set -e

echo "=== Starting deployment to WSL2 ==="

# Setup SSH for git
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cp /tmp/ssh_key ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null || true

# Configure git to use SSH
git config --global core.sshCommand "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no"

cd /workspace

# Update repository
echo "Pulling latest code from GitHub..."
git reset --hard
git pull origin main

# Create secrets directory with db_password
echo "Creating database password secret..."
mkdir -p secrets
echo "\${DB_PASSWORD}" > secrets/db_password.txt
chmod 600 secrets/db_password.txt

# Verify secret file
if [ -f secrets/db_password.txt ]; then
  SIZE=\$(stat -c%s secrets/db_password.txt 2>/dev/null || stat -f%z secrets/db_password.txt 2>/dev/null || echo "unknown")
  echo "✓ db_password.txt created (size: \${SIZE} bytes)"
else
  echo "✗ ERROR: Failed to create db_password.txt"
  exit 1
fi

# Set image environment variables
export WEBAPI_IMAGE="\${WEBAPI_IMG}"
export WEBAPP_IMAGE="\${WEBAPP_IMG}"
export WEBADMINS_IMAGE="\${WEBADMINS_IMG}"

echo "Images to deploy:"
echo "  WebAPI: \${WEBAPI_IMAGE}"
echo "  WebApp: \${WEBAPP_IMAGE}"
echo "  WebAdmins: \${WEBADMINS_IMAGE}"

# Create Docker network if not exists
echo "Ensuring Docker network exists..."
docker network create app-network 2>/dev/null || echo "Network app-network already exists"

# Deploy all services
echo "Pulling latest images..."
docker-compose \${COMPOSE_FILES} pull sqlserver webapi webapp webadmins cloudflared

echo "Starting containers..."
docker-compose \${COMPOSE_FILES} up -d --remove-orphans sqlserver webapi webapp webadmins cloudflared

echo "Container status:"
docker-compose \${COMPOSE_FILES} ps

echo "=== Deployment completed successfully! ==="
DEPLOY_SCRIPT_EOF

              chmod +x /tmp/deploy-wsl2.sh
              
              # Copy SSH key for container to use
              cp ~/.ssh/id_rsa /tmp/ssh_key
              chmod 644 /tmp/ssh_key
              
              # Run deployment via Docker container with WSL2 path mounted
              # This works because Docker Desktop can access WSL2 via //wsl.localhost
              docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v //wsl.localhost/${WSL_DISTRO}${PROD_DIR}:/workspace \
                -v /tmp/deploy-wsl2.sh:/deploy.sh \
                -v /tmp/ssh_key:/tmp/ssh_key \
                -e "DB_PASSWORD=\${DB_PASSWORD}" \
                -e "WEBAPI_IMG=${FULL_WEBAPI_IMAGE}" \
                -e "WEBAPP_IMG=${FULL_WEBAPP_IMAGE}" \
                -e "WEBADMINS_IMG=${FULL_WEBADMINS_IMAGE}" \
                -e "COMPOSE_FILES=${COMPOSE_FILES}" \
                -w /workspace \
                docker/compose:debian-1.29.2 \
                sh /deploy.sh
              
              # Cleanup sensitive files
              rm -f /tmp/deploy-wsl2.sh /tmp/ssh_key ~/.ssh/id_rsa
            """
          }
        }
      }
    }
  }

  post {
    success {
      echo 'Pipeline finished successfully.'
    }
    failure {
      echo 'Pipeline failed. Check console output and fix errors.'
    }
  }
}
