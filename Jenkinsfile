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
          
          // Use DB password from Jenkins Credentials
          withCredentials([
            string(credentialsId: 'db-password', variable: 'DB_PASSWORD')
          ]) {
            sh """
              echo "========================================"
              echo "   Deploying to Production via WSL2"
              echo "========================================"
              
              # Execute deployment directly in WSL2 environment
              docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v //wsl.localhost/${WSL_DISTRO}${PROD_DIR}:/workspace \
                -e "DB_PASSWORD=\${DB_PASSWORD}" \
                -e "WEBAPI_IMAGE=${FULL_WEBAPI_IMAGE}" \
                -e "WEBAPP_IMAGE=${FULL_WEBAPP_IMAGE}" \
                -e "WEBADMINS_IMAGE=${FULL_WEBADMINS_IMAGE}" \
                -e "COMPOSE_FILES=${COMPOSE_FILES}" \
                -w /workspace \
                alpine:latest sh -c '
                  set -e
                  
                  echo "=== Workspace Info ==="
                  pwd
                  ls -la
                  
                  echo "=== Installing dependencies ==="
                  apk add --no-cache git docker-cli docker-compose
                  
                  echo "=== Pulling latest code ==="
                  git config --global --add safe.directory /workspace
                  git pull origin main || echo "Warning: git pull failed, continuing..."
                  
                  echo "=== Creating secrets ==="
                  mkdir -p secrets
                  echo "\${DB_PASSWORD}" > secrets/db_password.txt
                  chmod 600 secrets/db_password.txt
                  
                  echo "=== Setting image variables ==="
                  export WEBAPI_IMAGE="\${WEBAPI_IMAGE}"
                  export WEBAPP_IMAGE="\${WEBAPP_IMAGE}"
                  export WEBADMINS_IMAGE="\${WEBADMINS_IMAGE}"
                  
                  echo "=== Images to deploy ==="
                  echo "WebAPI: \${WEBAPI_IMAGE}"
                  echo "WebApp: \${WEBAPP_IMAGE}"
                  echo "WebAdmins: \${WEBADMINS_IMAGE}"
                  
                  echo "=== Creating Docker network ==="
                  docker network create app-network 2>/dev/null || echo "Network already exists"
                  
                  echo "=== Starting containers ==="
                  docker-compose \${COMPOSE_FILES} up -d --remove-orphans sqlserver webapi webapp webadmins
                  
                  echo "=== Container status ==="
                  docker-compose \${COMPOSE_FILES} ps
                  
                  echo "=== Deployment completed! ==="
                '
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
