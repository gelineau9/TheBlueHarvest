FROM node:24-alpine

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/

# Install dependencies
ENV NODE_ENV=development
RUN npm install

# Copy source code
COPY . .

# Move into app
WORKDIR /app/apps/backend

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "run", "dev"]
