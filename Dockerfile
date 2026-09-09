# syntax=docker/dockerfile:1

# Build the SPA, then serve the static output from nginx. Node is not in the
# runtime image.
FROM node:24-alpine AS build

WORKDIR /app

# Vite inlines VITE_* at build time, so the API base URL is baked into the
# bundle and cannot be changed by an environment variable on the running
# container. The default matches .env.example: same origin, proxied by nginx.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_ERROR_REPORTING_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_ERROR_REPORTING_URL=$VITE_ERROR_REPORTING_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# `npm run build` is `tsc -b && vite build`, so a type error fails the image.
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
