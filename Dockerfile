FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# The built files in /app/dist will be mounted into nginx
FROM scratch
COPY --from=builder /app/dist /dist
