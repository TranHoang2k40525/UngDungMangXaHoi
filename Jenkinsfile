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
          
          // Production deployment needs db_password and cloudflare_tunnel_token
          // JWT secret is read from repo's secrets/jwt_access_secret.txt (already in workspace)
          withCredentials([
            string(credentialsId: 'db-password', variable: 'DB_PASSWORD'),
            string(credentialsId: 'cloudflare-tunnel-token', variable: 'CLOUDFLARE_TOKEN')
          ]) {
            sh """
              echo "========================================"
              echo "   Deploying to Production"
              echo "========================================"
              
              echo "=== Creating secrets using Docker volume ==="
              # Use Docker to create files in a way that Docker daemon can access
              # This solves the issue where Docker daemon can't access Jenkins workspace
              
              # Create a temporary container with workspace volume
              docker run --rm -v "\$(pwd):/workspace" -w /workspace alpine sh -c '
                mkdir -p secrets
                
                # Copy JWT secret from repo if exists, otherwise create default
                if [ -f secrets/jwt_access_secret.txt ]; then
                  echo "✓ Using JWT secret from repository"
                  chmod 644 secrets/jwt_access_secret.txt
                else
                  echo "⚠ No JWT secret found in repo, using default"
                  printf "%s" "DEFAULT-JWT-SECRET-PLEASE-CHANGE" > secrets/jwt_access_secret.txt
                  chmod 644 secrets/jwt_access_secret.txt
                fi
                
                # Create other secrets from Jenkins credentials
                printf "%s" "'\${DB_PASSWORD}'" > secrets/db_password.txt
                printf "%s" "'\${CLOUDFLARE_TOKEN}'" > secrets/cloudflare_tunnel_token.txt
                chmod 644 secrets/*.txt
                ls -la secrets/
              '
              
              echo "=== Setting image variables ==="
              export WEBAPI_IMAGE="${FULL_WEBAPI_IMAGE}"
              export WEBAPP_IMAGE="${FULL_WEBAPP_IMAGE}"
              export WEBADMINS_IMAGE="${FULL_WEBADMINS_IMAGE}"
              
              echo "=== Images to deploy ==="
              echo "  WebAPI: \${WEBAPI_IMAGE}"
              echo "  WebApp: \${WEBAPP_IMAGE}"
              echo "  WebAdmins: \${WEBADMINS_IMAGE}"
              
              echo "=== Creating Docker network ==="
              docker network create app-network 2>/dev/null || echo "  Network already exists"
              
              echo "=== Stopping old containers ==="
              docker-compose ${COMPOSE_FILES} down --remove-orphans || true
              
              echo "=== Starting containers ==="
              docker-compose ${COMPOSE_FILES} up -d sqlserver webapi webapp webadmins
              
              echo "=== Waiting for SQL Server to be ready (up to 5 minutes) ==="
              RETRY_COUNT=0
              MAX_RETRIES=60
              
              until docker exec ungdungmxh-sqlserver-prod sh -c 'PASSWORD=\$(cat /run/secrets/db_password) && /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "\$PASSWORD" -C -Q "SELECT 1"' > /dev/null 2>&1 || [ \$RETRY_COUNT -eq \$MAX_RETRIES ]; do
                RETRY_COUNT=\$((RETRY_COUNT+1))
                echo "  Waiting for SQL Server... attempt \$RETRY_COUNT/\$MAX_RETRIES"
                
                if [ \$((RETRY_COUNT % 10)) -eq 0 ]; then
                  echo "  Checking SQL Server logs:"
                  docker logs ungdungmxh-sqlserver-prod --tail=20
                fi
                
                sleep 5
              done
              
              if [ \$RETRY_COUNT -eq \$MAX_RETRIES ]; then
                echo "ERROR: SQL Server failed to start after \$MAX_RETRIES attempts"
                echo "=== SQL Server logs ==="
                docker logs ungdungmxh-sqlserver-prod
                echo "=== Container inspect ==="
                docker inspect ungdungmxh-sqlserver-prod
                exit 1
              fi
              
              echo "✓ SQL Server is ready!"
              
              echo "=== Container status ==="
              docker-compose ${COMPOSE_FILES} ps
              
              echo "=== Checking application logs ==="
              echo "--- WebAPI logs ---"
              docker logs ungdungmxh-webapi-prod --tail=30 || true
              
              echo "=== Verifying services ==="
              docker ps --filter name=ungdungmxh --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
              
              echo "=== Deployment completed! ==="
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
