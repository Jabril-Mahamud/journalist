FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything
COPY . .

# Set environment variable for port
ENV PORT=3001

EXPOSE 3001

# Run Next.js on the specified port
CMD ["npx", "next", "dev", "-p", "3001", "-H", "0.0.0.0"]