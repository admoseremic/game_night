# --- build client ---
FROM node:20-bookworm-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- server runtime ---
FROM node:20-bookworm-slim
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
ENV PORT=3000 DB_PATH=/data/gamenight.db CLIENT_DIR=/app/client/dist
EXPOSE 3000
CMD ["node", "src/index.js"]
