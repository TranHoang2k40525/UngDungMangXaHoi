# Dockerfile for MobileApp (Expo dev server)
FROM node:20-alpine 

# Install dependencies for Expo (git needed for some npm packages)
RUN apk add --no-cache git

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install dependencies (equivalent to npm i)
RUN npm install

# Copy the rest of the app source
COPY . .

# Expo dev server ports (tunnel mode uses ngrok, but these are still exposed for local access)
EXPOSE 8081 19000 19001 19002

# Start Expo with tunnel mode (for Expo Go)
CMD ["npx", "expo", "start", "--tunnel"]
