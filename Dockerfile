##
# Production Dockerfile
##

###
# Base image declaration
###
FROM node:18.10-alpine AS base

ENV APPDIR /app

WORKDIR ${APPDIR}/shared

COPY shared/package*.json ./
RUN npm ci

COPY shared ./
RUN npm run build

###
# Client build stage
###
FROM base AS client-build

WORKDIR ${APPDIR}/client

COPY client/package*.json ./
RUN npm ci

COPY client ./
RUN npm run build

###
# Server build stage
###
FROM base AS server-build

WORKDIR ${APPDIR}/server

COPY server/package*.json ./
RUN npm ci

RUN npm install tsconfig-paths tsc-alias

COPY server ./
RUN npm run build
RUN rm -r src

###
# Main image build
###
FROM node:18.10-alpine AS main

ENV APPDIR /app
ENV NODE_ENV=production
ENV SERVER_PORT=8080
ENV TZ=Europe/Helsinki

WORKDIR ${APPDIR}/server

# Copy package.json and install only production dependencies
COPY --from=server-build ${APPDIR}/server/package*.json ./
RUN npm ci --only=production

# Copy built applications
COPY --from=server-build ${APPDIR}/server ./
COPY --from=client-build ${APPDIR}/client/dist ./static

# After copying server files, also copy shared files
COPY --from=base ${APPDIR}/shared/dist /app/shared/dist

# Install shared module dependencies
COPY --from=base ${APPDIR}/shared/package*.json /app/shared/
WORKDIR /app/shared
RUN npm ci --only=production

# Return to server directory
WORKDIR ${APPDIR}/server

# Install tsconfig-paths in production
RUN npm install -g tsconfig-paths

# Create a runtime tsconfig paths file
RUN echo '{\
  "compilerOptions": {\
    "baseUrl": ".",\
    "paths": {\
      "@shared/*": ["/app/shared/dist/*"]\
    }\
  }\
}' > /app/server/tsconfig.paths.json

# Expose the port that Azure App Service expects
EXPOSE 8080

# Add health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/health || exit 1

# Add script to create DB if it doesn't exist
RUN apk add --no-cache postgresql-client
COPY server/start.sh /app/server/start.sh
RUN chmod +x /app/server/start.sh

# Update CMD to use the paths
CMD ["/bin/sh", "-c", "/app/server/start.sh"]
