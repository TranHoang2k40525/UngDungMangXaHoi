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
              # Setup SSH for git clone
              mkdir -p ~/.ssh
              chmod 700 ~/.ssh
              cp \${SSH_KEY} ~/.ssh/id_rsa
              chmod 600 ~/.ssh/id_rsa
              ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
              
              # Deploy directly to WSL2 path (Docker-accessible)
              cd /home/minhvu/ungdungmxh
              git reset --hard
              GIT_SSH_COMMAND='ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no' \
                git pull origin main
              
              # Create secrets directory with db_password from Jenkins Credentials
              # Note: SQL Server container 'ungdungmxh-sqlserver-prod' already running in WSL2
              # Only deploying application containers: webapi, webapp, webadmins
              echo "Creating db_password secret for deployment..."
              mkdir -p secrets
              echo "\${DB_PASSWORD}" > secrets/db_password.txt
              chmod 600 secrets/db_password.txt
              
              # Verify secret file was created (without exposing password)
              if [ -f "secrets/db_password.txt" ]; then
                echo "✓ db_password.txt created (size: \$(wc -c < secrets/db_password.txt) bytes)"
              else
                echo "✗ ERROR: Failed to create db_password.txt"
                exit 1
              fi
              
              # Deploy with docker-compose (V1 syntax for compatibility)
              export WEBAPI_IMAGE=${FULL_WEBAPI_IMAGE}
              export WEBAPP_IMAGE=${FULL_WEBAPP_IMAGE}
              export WEBADMINS_IMAGE=${FULL_WEBADMINS_IMAGE}
              
              # Create network if not exists
              docker network create app-network 2>/dev/null || true
              
              # Deploy only application containers (exclude SQL Server - already running)
              docker-compose ${COMPOSE_FILES} pull webapi webapp webadmins cloudflared
              docker-compose ${COMPOSE_FILES} up -d --remove-orphans webapi webapp webadmins cloudflared
              docker-compose ${COMPOSE_FILES} ps
              
              # Cleanup
              cd /tmp
              rm -rf deploy-temp ~/.ssh/id_rsa
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
