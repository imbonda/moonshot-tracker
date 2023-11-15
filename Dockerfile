#
# Stage 1: Build TypeScript code.
#
FROM node:18-alpine AS builder

# Install rsync.
RUN apk add --no-cache rsync

# Set working directory.
WORKDIR /moonshot-tracker

# Install dependencies.
COPY package*.json ./
RUN npm ci

# Copy source code.
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript code.
RUN npm run build

#
# Stage 2: Create production image.
#
FROM node:18-alpine

# Installs latest Chromium (100) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory.
WORKDIR /moonshot-tracker

# Copy production dependencies.
COPY --from=builder /moonshot-tracker/package*.json ./
RUN npm ci --production

# Copy built TypeScript code.
COPY --from=builder /moonshot-tracker/build ./build

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /moonshot-tracker \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /moonshot-tracker

# Run everything after as non-privileged user.
USER pptruser
