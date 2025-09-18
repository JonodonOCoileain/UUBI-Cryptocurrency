# Use Node.js 18 LTS with full Ubuntu instead of Alpine for better compatibility
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Ubuntu
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    build-essential \
    libjpeg-turbo8-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies with rebuild
RUN npm ci --omit=dev && npm rebuild

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p data uploads

# Set proper permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
