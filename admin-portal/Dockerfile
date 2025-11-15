FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including react-leaflet and leaflet)
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose port
EXPOSE 7000

# Start development server on port 7000
CMD ["npm", "run", "dev", "--", "--port", "7000", "--host", "0.0.0.0"]

