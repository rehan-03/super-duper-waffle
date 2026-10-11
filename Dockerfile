FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY apps apps
COPY packages packages
RUN DATABASE_URL=postgresql://build:unused@localhost:5432/algolearn npm run db:generate && npm run build

FROM build AS migrations
ENTRYPOINT ["npm", "run", "db:migrate"]

FROM build AS runtime
RUN npm prune --omit=dev && chown -R node:node /app
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
