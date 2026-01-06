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
          
          // Use secrets from Jenkins Credentials
          withCredentials([
            string(credentialsId: 'db-password', variable: 'DB_PASSWORD'),
            string(credentialsId: 'jwt-access-secret', variable: 'JWT_ACCESS_SECRET'),
            string(credentialsId: 'jwt-refresh-secret', variable: 'JWT_REFRESH_SECRET'),
            string(credentialsId: 'cloudinary-api-secret', variable: 'CLOUDINARY_API_SECRET'),
            string(credentialsId: 'email-password', variable: 'EMAIL_PASSWORD')
          ]) {
            sh """
              echo "========================================"
              echo "   Deploying to Docker Daemon (WSL2)"
              echo "========================================"
              echo ""
              
              echo "=== Creating secrets ==="
              mkdir -p \${WORKSPACE}/secrets
              echo '${DB_PASSWORD}' > \${WORKSPACE}/secrets/db_password.txt
              echo '${JWT_ACCESS_SECRET}' > \${WORKSPACE}/secrets/jwt_access_secret.txt
              echo '${JWT_REFRESH_SECRET}' > \${WORKSPACE}/secrets/jwt_refresh_secret.txt
              echo '${CLOUDINARY_API_SECRET}' > \${WORKSPACE}/secrets/cloudinary_api_secret.txt
              echo '${EMAIL_PASSWORD}' > \${WORKSPACE}/secrets/email_password.txt
              chmod 600 \${WORKSPACE}/secrets/*
              
              echo ""
              echo "=== Creating Docker network ==="
              docker network create app-network 2>/dev/null || echo "Network already exists"
              
              echo ""
              echo "=== Pulling images ==="
              docker pull ${FULL_WEBAPI_IMAGE}
              docker pull ${FULL_WEBAPP_IMAGE}
              docker pull ${FULL_WEBADMINS_IMAGE}
              
              echo ""
              echo "=== Deploying containers ==="
              cd \${WORKSPACE}
              WEBAPI_IMAGE=${FULL_WEBAPI_IMAGE} \
              WEBAPP_IMAGE=${FULL_WEBAPP_IMAGE} \
              WEBADMINS_IMAGE=${FULL_WEBADMINS_IMAGE} \
              docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans sqlserver webapi webapp webadmins
              
              echo ""
              echo "=== Container Status ==="
              docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
              
              echo ""
              echo "=== Deployment Completed! ==="
              echo "WebApp: http://localhost:3000"
              echo "WebAdmins: http://localhost:3001"
              echo "WebAPI: http://localhost:5000"
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
