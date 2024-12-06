# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

# Copy package files first
COPY frontend/package*.json ./

# Install all dependencies including devDependencies for build
RUN npm install

# Copy frontend source files, excluding node_modules
COPY frontend/src ./src
COPY frontend/index.html ./
COPY frontend/vite.config.js ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./

# Create public directory and copy static files
RUN mkdir -p public
COPY eradia.svg ./public/eradia.svg
COPY frontend/public/robots.txt ./public/

# Download Hunspell dictionaries
RUN mkdir -p public/dictionaries/en_US && \
    wget -O public/dictionaries/en_US/index.aff https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.aff && \
    wget -O public/dictionaries/en_US/index.dic https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.dic

# Debug: List files and start build
RUN echo "Frontend files:" && \
    ls -la && \
    echo "Starting frontend build..." && \
    NODE_ENV=production npm run build && \
    echo "Build complete. Contents of dist:" && \
    ls -la dist/

# Build backend dependencies
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .

# Final stage
FROM node:20-alpine

# Install nginx
RUN apk add --no-cache nginx

# Create necessary directories with correct permissions
WORKDIR /app
RUN mkdir -p /journal /config && \
    mkdir -p /run/nginx && \
    mkdir -p /var/lib/nginx/tmp && \
    mkdir -p /var/lib/nginx/logs && \
    mkdir -p /var/lib/nginx/tmp/client_body && \
    mkdir -p /var/lib/nginx/tmp/proxy && \
    mkdir -p /var/lib/nginx/tmp/fastcgi && \
    mkdir -p /var/log/nginx && \
    chown -R 1000:1000 /app /journal /config && \
    chown -R 1000:1000 /run/nginx && \
    chown -R 1000:1000 /var/lib/nginx && \
    chown -R 1000:1000 /var/log/nginx && \
    chmod -R 755 /var/lib/nginx && \
    touch /var/run/nginx.pid && \
    chown 1000:1000 /var/run/nginx.pid

# Copy backend files
COPY --from=backend-build /app/node_modules ./node_modules/
COPY --from=backend-build /app .
RUN chown -R 1000:1000 .

# Copy frontend files
COPY --from=frontend-build /frontend/dist /usr/share/nginx/html/
RUN chown -R 1000:1000 /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/http.d/default.conf
RUN chown -R 1000:1000 /etc/nginx

# Configure nginx
RUN echo 'user nginx nginx;' > /etc/nginx/nginx.conf && \
    echo 'pid /var/run/nginx.pid;' >> /etc/nginx/nginx.conf && \
    echo 'error_log /var/lib/nginx/logs/error.log;' >> /etc/nginx/nginx.conf && \
    echo 'events { worker_connections 1024; }' >> /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '    client_body_temp_path /var/lib/nginx/tmp/client_body;' >> /etc/nginx/nginx.conf && \
    echo '    proxy_temp_path /var/lib/nginx/tmp/proxy;' >> /etc/nginx/nginx.conf && \
    echo '    fastcgi_temp_path /var/lib/nginx/tmp/fastcgi;' >> /etc/nginx/nginx.conf && \
    echo '    include /etc/nginx/mime.types;' >> /etc/nginx/nginx.conf && \
    echo '    include /etc/nginx/http.d/*.conf;' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Create startup script
RUN printf '#!/bin/sh\nnginx -g "daemon off;" &\ncd /app && npm start\n' > /app/start.sh && \
    chmod +x /app/start.sh && \
    chown 1000:1000 /app/start.sh

# Switch to non-root user
USER 1000:1000

EXPOSE 80
CMD ["/app/start.sh"]
