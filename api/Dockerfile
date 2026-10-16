FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
# Pre-create the local media dir so a mounted volume inherits node ownership (on-prem mode).
RUN mkdir -p /data/media && chown node:node /data/media
USER node
EXPOSE 3000
# Same image runs the worker with: docker run ... node src/worker.js
CMD ["node", "src/server.js"]
