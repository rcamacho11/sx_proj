FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
COPY web/nginx/nginx.conf /etc/nginx/nginx.conf
COPY web/nginx/html/index.html /usr/share/nginx/html/index.html
EXPOSE 8080
