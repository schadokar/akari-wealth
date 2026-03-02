FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o perfi ./cmd

FROM alpine:3.21

WORKDIR /app
COPY --from=builder /app/perfi .
COPY db/migrations ./db/migrations

EXPOSE 8080
CMD ["./perfi"]
