FROM node:24-alpine

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/

# Install dependencies
ENV NODE_ENV=development
RUN npm install

# Copy source code
COPY . .

# Move into frontend
WORKDIR /app/apps/frontend

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]
