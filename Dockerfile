# syntax=docker/dockerfile:1.7
FROM dhi.io/bun:1-dev AS build

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM dhi.io/nginx:1 AS runtime

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=65532:65532 /app/dist/ /usr/share/nginx/html/

EXPOSE 80
STOPSIGNAL SIGQUIT
