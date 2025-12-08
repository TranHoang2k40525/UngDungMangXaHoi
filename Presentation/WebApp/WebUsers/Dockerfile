# ==========================================
# Dev Dockerfile for WebUsers (Static HTML/JS)
# Hot reload with nginx
# ==========================================
FROM nginx:1.26-alpine

WORKDIR /app

# Copy source code
COPY . /usr/share/nginx/html/

# Simple nginx config for dev
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
