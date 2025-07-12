FROM node:18-alpine AS base

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# RUN npm ci --only=production && npm cache clean --force
RUN npm ci --omit=dev && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
COPY . .
USER node
EXPOSE 3000
CMD ["npm", "start"]
