# Makefile

# Variables
DOCKER_COMPOSE_FILE = ./docker-compose.yml
ENV_FILE = ../.env.local
DOCKER_COMPOSE = COMPOSE_BAKE=true docker compose -f $(DOCKER_COMPOSE_FILE) --env-file $(ENV_FILE)

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make build    - Build Docker images"
	@echo "  make up       - Start containers in detached mode"
	@echo "  make down     - Stop and remove containers"
	@echo "  make logs     - View container logs"
	@echo "  make restart  - Restart containers"
	@echo "  make clean    - Remove all Docker artifacts"

# Build Docker images
.PHONY: build
build:
	$(DOCKER_COMPOSE) build

# Start containers
.PHONY: up
up:
	$(DOCKER_COMPOSE) up -d --build

# Stop and remove containers
.PHONY: down
down:
	$(DOCKER_COMPOSE) down

# View logs
.PHONY: logs
logs:
	$(DOCKER_COMPOSE) logs -f

# Rebuild and restart containers without pulling images if they exist
.PHONY: rebuild
rebuild:
	$(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d --force-recreate

# Restart containers
.PHONY: restart
restart:
	$(DOCKER_COMPOSE) restart

# Clean up Docker artifacts
.PHONY: clean
clean:
	$(DOCKER_COMPOSE) down -v --rmi all --remove-orphans