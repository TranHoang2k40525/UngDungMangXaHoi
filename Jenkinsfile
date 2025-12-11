pipeline {
  agent any

  environment {
    // Registry and image name pieces. Configure DOCKER_NAMESPACE in Jenkins or set below.
    REGISTRY = 'docker.io'
    DOCKER_NAMESPACE = "your-docker-namespace" // replace or set via Jenkins credentials/params
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

    stage('Restore & Build (WebAPI)') {
      steps {
        echo 'Restoring and building .NET WebAPI (Release)'
        sh 'dotnet --version || true'
        sh 'dotnet restore UngDungMangXaHoi.sln'
        sh 'dotnet build Presentation/WebAPI -c Release'
        // Optional: run tests if present
        // sh 'dotnet test --no-build'
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
            sh "docker build -f Presentation/WebApp/WebUsers/Dockerfile.prod -t ${FULL_WEBAPP_IMAGE} Presentation/WebApp/WebUsers"
          }
        }
        
        stage('Build WebAdmins') {
          steps {
            script {
              env.FULL_WEBADMINS_IMAGE = "${REGISTRY}/${WEBADMINS_IMAGE_NAME}:${TAG}"
            }
            echo "Building WebAdmins image ${FULL_WEBADMINS_IMAGE}"
            sh "docker build -f Presentation/WebApp/WebAdmins/Dockerfile.prod -t ${FULL_WEBADMINS_IMAGE} Presentation/WebApp/WebAdmins"
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
        // Two common deployment options are described below. The pipeline uses SSH to run commands on the prod host.
        withCredentials([sshUserPrivateKey(credentialsId: 'prod-ssh-key', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')]) {
          script {
            // These target variables should be configured in Jenkins (or set as pipeline params)
            def PROD_HOST = env.PROD_HOST ?: 'your.prod.host'
            def PROD_DIR = env.PROD_DIR ?: '/opt/ungdungmxh' // path on prod host where docker-compose files live

            // Option A: If repository is already present on prod host, do a git pull then docker-compose pull/up
            sh "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SSH_USER}@${PROD_HOST} \"cd ${PROD_DIR} && git reset --hard && git pull origin main && export WEBAPI_IMAGE=${FULL_WEBAPI_IMAGE} && export WEBAPP_IMAGE=${FULL_WEBAPP_IMAGE} && export WEBADMINS_IMAGE=${FULL_WEBADMINS_IMAGE} && docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d\""

            // Option B (alternative): scp compose files to host and run docker-compose there. Uncomment and adapt if preferred.
            // sh "scp -i ${SSH_KEY} docker-compose.yml ${SSH_USER}@${PROD_HOST}:${PROD_DIR}/docker-compose.yml"
            // sh "scp -i ${SSH_KEY} docker-compose.prod.yml ${SSH_USER}@${PROD_HOST}:${PROD_DIR}/docker-compose.prod.yml"
            // sh "ssh -i ${SSH_KEY} ${SSH_USER}@${PROD_HOST} 'cd ${PROD_DIR} && docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d'"
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
