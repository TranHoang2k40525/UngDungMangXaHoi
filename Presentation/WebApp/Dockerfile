# Dockerfile để serve WebApp tĩnh bằng nginx
FROM nginx:1.26-alpine

# Remove default content
RUN rm -rf /usr/share/nginx/html/*

# Copy WebUsers as site root and WebAdmins into /admin
COPY WebUsers/ /usr/share/nginx/html/
COPY WebAdmins/ /usr/share/nginx/html/admin/

# Copy custom nginx config
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
