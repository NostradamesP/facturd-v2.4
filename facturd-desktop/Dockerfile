FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN echo 'server { \
    listen 80; \
    root /var/www/facturd; \
    index index.html; \
    client_max_body_size 20m; \
    location /api/ { \
        proxy_pass http://api:8000/api/; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ { \
        expires 30d; \
        add_header Cache-Control "public, immutable"; \
        try_files $uri =404; \
    } \
}' > /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /var/www/facturd
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
