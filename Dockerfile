FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and gogcli
RUN apk add --no-cache curl \
    && curl -L https://github.com/steipete/gogcli/releases/download/v0.12.0/gogcli_0.12.0_linux_amd64.tar.gz -o gogcli.tar.gz \
    && tar -xzf gogcli.tar.gz \
    && mv gogcli /usr/local/bin/gog \
    && rm gogcli.tar.gz \
    && mkdir -p /root/.config/gogcli \
    && ln -s /app/gog-config.json /root/.config/gogcli/config.json \
    && npm install

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
