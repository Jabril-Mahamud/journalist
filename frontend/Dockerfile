FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything
COPY . .

# Set default port
ENV PORT=3001
# Optional: you can define NEXT_PUBLIC_API_URL here if you want a different default
# ENV NEXT_PUBLIC_API_URL=http://localhost:8001

EXPOSE 3001

# Run Next.js in dev mode and bind to all interfaces
CMD ["npx", "next", "dev", "-p", "3001", "-H", "0.0.0.0"]
