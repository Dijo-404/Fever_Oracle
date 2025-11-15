FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose port
EXPOSE 8081

# Start development server on port 8081
CMD ["npm", "run", "dev", "--", "--port", "8081", "--host", "0.0.0.0"]

