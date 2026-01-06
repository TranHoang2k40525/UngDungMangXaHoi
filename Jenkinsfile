pipeline {
  agent any

  parameters {
    string(name: 'DOCKER_NAMESPACE', defaultValue: 'minhvu0809', description: 'Docker Hub username')
    string(name: 'PROD_HOST', defaultValue: 'host.docker.internal', description: 'Production server hostname (not used in current deployment)')
    string(name: 'PROD_DIR', defaultValue: '/home/minhvu/ungdungmxh', description: 'Production deployment directory')
    string(name: 'WSL_DISTRO', defaultValue: 'Ubuntu', description: 'WSL2 distribution name')
    string(name: 'WSL_USER', defaultValue: 'minhvu', description: 'WSL2 username for SSH access')
    string(name: 'WSL_HOST', defaultValue: 'localhost', description: 'WSL2 hostname for SSH access')
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
          sh '''
            echo "========================================"
            echo "   Pushing Images with Retry Logic"
            echo "========================================"
            
            echo "Logging into Docker registry ${REGISTRY}"
            echo $DOCKER_PASS | docker login ${REGISTRY} -u $DOCKER_USER --password-stdin
            
            # Function to push with retry and exponential backoff
            push_with_retry() {
              local image=$1
              local max_attempts=3
              local attempt=1
              local wait_time=5
              
              echo ""
              echo "=== Pushing $image ==="
              
              while [ $attempt -le $max_attempts ]; do
                echo "Attempt $attempt of $max_attempts..."
                
                if timeout 300 docker push "$image"; then
                  echo "✓ Successfully pushed $image"
                  return 0
                else
                  echo "✗ Failed to push $image (attempt $attempt/$max_attempts)"
                  
                  if [ $attempt -lt $max_attempts ]; then
                    echo "Waiting ${wait_time}s before retry..."
                    sleep $wait_time
                    # Exponential backoff
                    wait_time=$((wait_time * 2))
                    attempt=$((attempt + 1))
                    
                    # Re-login to Docker registry
                    echo "Re-authenticating with Docker registry..."
                    echo $DOCKER_PASS | docker login ${REGISTRY} -u $DOCKER_USER --password-stdin
                  else
                    echo "ERROR: Failed to push $image after $max_attempts attempts"
                    return 1
                  fi
                fi
              done
            }
            
            # Push all images with retry logic
            push_with_retry "${FULL_WEBAPI_IMAGE}" || exit 1
            push_with_retry "${FULL_WEBAPP_IMAGE}" || exit 1
            push_with_retry "${FULL_WEBADMINS_IMAGE}" || exit 1
            
            docker logout ${REGISTRY}
            
            echo ""
            echo "========================================"
            echo "   All Images Pushed Successfully"
            echo "========================================"
          '''
        }
      }
    }

    stage('Deploy to production') {
      steps {
        script {
          def USE_TUNNEL = params.USE_CLOUDFLARE_TUNNEL
          
          // Compose files to use
          def COMPOSE_FILES = "-f docker-compose.yml -f docker-compose.prod.yml"
          if (USE_TUNNEL) {
            COMPOSE_FILES = "${COMPOSE_FILES} -f docker-compose.tunnel.yml"
          }
          
          echo "Deploying in WSL2"
          echo "Using Cloudflare Tunnel: ${USE_TUNNEL}"
          
          // Use SSH key for git and DB password from Jenkins Credentials
          withCredentials([
            sshUserPrivateKey(credentialsId: 'prod-ssh-key', keyFileVariable: 'SSH_KEY'),
            string(credentialsId: 'db-password', variable: 'DB_PASSWORD')
          ]) {
            sh """
              echo "========================================"
              echo "   Deploying Docker Containers in WSL2"
              echo "========================================"
              
              # Setup SSH key for git operations
              mkdir -p ~/.ssh
              chmod 700 ~/.ssh
              cp "\${SSH_KEY}" ~/.ssh/id_rsa
              chmod 600 ~/.ssh/id_rsa
              
              # Add GitHub to known hosts
              ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null || true
              
              # Configure git to use SSH
              git config --global core.sshCommand "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no"
              
              cd \${WORKSPACE}
              
              echo ""
              echo "=== Current directory ==="
              pwd
              
              echo ""
              echo "=== Pulling latest code from GitHub ==="
              git fetch origin main
              git reset --hard origin/main
              
              echo ""
              echo "=== Creating secrets ==="
              mkdir -p secrets
              
              # Create DB password from Jenkins credential
              echo '\${DB_PASSWORD}' > secrets/db_password.txt
              
              # Create other required secret files with placeholder values
              echo 'jwt-access-secret-key-placeholder-change-in-production' > secrets/jwt_access_secret.txt
              echo 'jwt-refresh-secret-key-placeholder-change-in-production' > secrets/jwt_refresh_secret.txt
              echo 'cloudinary-api-secret-placeholder-change-in-production' > secrets/cloudinary_api_secret.txt
              echo 'email-password-placeholder-change-in-production' > secrets/email_password.txt
              
              # Set permissions
              chmod 600 secrets/*.txt
              
              echo "✓ Secrets created:"
              ls -lh secrets/
              
              echo ""
              echo "=== Setting environment variables ==="
              export WEBAPI_IMAGE=${FULL_WEBAPI_IMAGE}
              export WEBAPP_IMAGE=${FULL_WEBAPP_IMAGE}
              export WEBADMINS_IMAGE=${FULL_WEBADMINS_IMAGE}
              
              echo "Images to deploy:"
              echo "  WebAPI: \${WEBAPI_IMAGE}"
              echo "  WebApp: \${WEBAPP_IMAGE}"
              echo "  WebAdmins: \${WEBADMINS_IMAGE}"
              
              echo ""
              echo "=== Creating Docker network ==="
              docker network create app-network 2>/dev/null || echo "Network app-network already exists"
              
              echo ""
              echo "=== Pulling latest images ==="
              docker pull \${WEBAPI_IMAGE}
              docker pull \${WEBAPP_IMAGE}
              docker pull \${WEBADMINS_IMAGE}
              
              echo ""
              echo "=== Stopping old containers ==="
              docker-compose ${COMPOSE_FILES} down || true
              
              echo ""
              echo "=== Starting new containers ==="
              WEBAPI_IMAGE=\${WEBAPI_IMAGE} \
              WEBAPP_IMAGE=\${WEBAPP_IMAGE} \
              WEBADMINS_IMAGE=\${WEBADMINS_IMAGE} \
              docker-compose ${COMPOSE_FILES} up -d --remove-orphans
              
              echo ""
              echo "=== Waiting for containers to stabilize (15s) ==="
              sleep 15
              
              echo ""
              echo "=== Container status ==="
              docker-compose ${COMPOSE_FILES} ps
              
              echo ""
              echo "=== Running containers ==="
              docker ps --filter name=ungdungmxh
              
              echo ""
              echo "=== Checking container logs (last 20 lines) ==="
              echo "--- WebAPI logs ---"
              docker logs ungdungmxh-webapi --tail 20 2>&1 || echo "WebAPI container not found"
              
              echo ""
              echo "--- WebApp logs ---"
              docker logs ungdungmxh-webapp --tail 20 2>&1 || echo "WebApp container not found"
              
              echo ""
              echo "--- SQL Server logs ---"
              docker logs ungdungmxh-sqlserver --tail 20 2>&1 || echo "SQL Server container not found"
              
              # Cleanup SSH key
              rm -f ~/.ssh/id_rsa
              
              echo ""
              echo "=== Deployment completed successfully! ==="
              echo "========================================"
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
