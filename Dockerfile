FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files (Except .dockerignore files)
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose the port (Hugging Face expects an exposed port 7860 to confirm the app is alive)
EXPOSE 7860

# We set the environment variable PORT for our dummy node server
ENV PORT=7860

# Start the application
CMD ["npm", "start"]
