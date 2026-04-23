FROM node:20

WORKDIR /app

# Install dependencies (skip electron-rebuild postinstall)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts
RUN yarn rebuild better-sqlite3

# Copy source
COPY . .

# Build frontend
RUN yarn build:web

# Runtime config
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

VOLUME ["/data"]
EXPOSE 3000

CMD ["npx", "tsx", "server/index.ts"]
