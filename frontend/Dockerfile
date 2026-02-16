FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code (this layer will rebuild when code changes)
COPY . .

# Add a build arg to bust cache when needed
ARG CACHEBUST=1

# Expose port
EXPOSE 3001

CMD ["npm", "run", "dev"]