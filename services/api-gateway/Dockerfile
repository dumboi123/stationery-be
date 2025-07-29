# ===================================
# STAGE 1: BASE
# ===================================
FROM node:24.1.0-alpine AS base
WORKDIR /app
COPY package*.json ./

# ===================================
# STAGE 2: DEVELOPMENT (cho học tập)
# ===================================
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ===================================
# STAGE 3: PRODUCTION (an toàn)
# ===================================
FROM node:24.1.0-alpine AS production

# Security: Tạo non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S apigateway -u 1001

WORKDIR /app

# Ownership và copy files
COPY --from=base --chown=apigateway:nodejs /app/package*.json ./
RUN npm ci --only=production --no-audit --no-fund && npm cache clean --force

COPY --chown=apigateway:nodejs src/ ./src/

# Switch to non-root user
USER apigateway

EXPOSE 3000
CMD ["npm", "start"]
