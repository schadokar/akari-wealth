IMAGE   := perfi
CONTAINER := perfi-test
PORT    := 8080
HEALTH  := http://localhost:$(PORT)/api/health
TIMEOUT := 30

.PHONY: build run stop logs health check clean

## Build the Docker image identical to Railway
build:
	docker build -f deploy/Dockerfile -t $(IMAGE) .

## Run the container (detached)
run: stop
	docker run -d \
		--name $(CONTAINER) \
		-p $(PORT):$(PORT) \
		-e JWT_SECRET=dev-secret \
		$(IMAGE)
	@echo "Container started. Waiting for health check..."

## Stop and remove the test container
stop:
	@docker rm -f $(CONTAINER) 2>/dev/null || true

## Tail container logs
logs:
	docker logs -f $(CONTAINER)

## Poll /api/health until OK or timeout (mirrors Railway healthcheckTimeout=30)
health:
	@echo "Polling $(HEALTH) for up to $(TIMEOUT)s..."
	@elapsed=0; \
	while [ $$elapsed -lt $(TIMEOUT) ]; do \
		status=$$(curl -s -o /dev/null -w "%{http_code}" $(HEALTH) 2>/dev/null); \
		if [ "$$status" = "200" ]; then \
			echo "Health check passed (HTTP 200)"; \
			exit 0; \
		fi; \
		echo "  [$$elapsed s] HTTP $$status — retrying..."; \
		sleep 2; \
		elapsed=$$((elapsed + 2)); \
	done; \
	echo "Health check FAILED after $(TIMEOUT)s"; \
	docker logs $(CONTAINER); \
	exit 1

## Full Railway-equivalent deploy test: build → run → health → cleanup
check: build run health
	@echo ""
	@echo "Build + health check OK — safe to push"
	$(MAKE) stop

## Remove the image
clean: stop
	docker rmi -f $(IMAGE) 2>/dev/null || true
