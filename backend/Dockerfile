# Build stage
FROM node:18-alpine AS build
WORKDIR /app
# Copy backend files
COPY backend/package*.json backend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY backend/ .
# Copy database migrations (build context is project root)
COPY database/migrations /migrations
RUN yarn build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/yarn.lock ./
COPY --from=build /app/scripts ./scripts
# Copy migrations to a known location in the app
COPY --from=build /migrations ./database/migrations
# Install production dependencies plus ts-node for running migration script
RUN yarn install --production --frozen-lockfile && \
    yarn add --dev ts-node typescript @types/node && \
    chmod +x ./scripts/start.sh
EXPOSE 4000

# For production - run migrations then start server
CMD ["./scripts/start.sh"]