# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ .
RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.24-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o perfi ./cmd

# Stage 3: Runtime
FROM alpine:3.21
RUN mkdir -p /data
WORKDIR /app
COPY --from=go-builder /app/perfi .
COPY db/migrations ./db/migrations
COPY db/data/financial_instruments.csv ./db/data/financial_instruments.csv
COPY --from=frontend-builder /app/client/dist ./client/dist
ENV DATA_DIR=/data
ENV STATIC_DIR=/app/client/dist
EXPOSE 8080
CMD ["./perfi"]
