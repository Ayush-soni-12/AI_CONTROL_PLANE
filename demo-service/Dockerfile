# Use Node.js 20 LTS (Long Term Support) slim image
# Slim version is smaller and production-ready
FROM node:20-slim

# Set working directory inside the container
WORKDIR /app

# Copy package files first
# This is done separately to leverage Docker layer caching
# If package.json doesn't change, npm install is skipped
COPY package*.json ./

# Install dependencies
# --only=production skips devDependencies (smaller image)
# For development, we'll override this in docker-compose.yml
RUN npm ci --only=production

# Copy the entire application code
COPY . .

# Expose port 3001
# This is where the demo service will run
EXPOSE 3001

# Command to run the application
# In production: node server.js
# In development (docker-compose): npm run dev (with nodemon)
CMD ["node", "server.js"]
