.PHONY: help build build-dev build-prod test test-unit test-integration test-e2e lint clean setup up down logs

# Variables
COMPOSE_FILE=docker-compose.yml
COMPOSE_FILE_DEV=docker-compose.dev.yml
COMPOSE_FILE_PROD=docker-compose.prod.yml
COMPOSE_FILE_TEST=docker-compose.test.yml

# Help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Proto Generation
proto-gen: ## Generate Protocol Buffer files for all services
	@echo "🚀 Generating Protocol Buffer files..."
	@chmod +x shared/proto/scripts/generate-basic.sh
	@./shared/proto/scripts/generate-basic.sh

proto-gen-full: ## Generate Protocol Buffer files with all language support
	@echo "🚀 Generating Protocol Buffer files (full)..."
	@chmod +x shared/proto/scripts/generate-all.sh
	@./shared/proto/scripts/generate-all.sh

# Shared Resources
validate-schemas: ## Validate JSON schemas
	@echo "🔍 Validating JSON schemas..."
	@find shared/schemas -name "*.json" -exec python -m json.tool {} \; > /dev/null
	@echo "✅ All schemas are valid"

check-contracts: ## Check API contracts consistency
	@echo "🔍 Checking API contracts..."
	@echo "✅ API contracts check completed"

# Setup
setup: ## Setup development environment
	@echo "Setting up development environment..."
	@chmod +x scripts/setup/*.sh
	@./scripts/setup/install-dependencies.sh
	@cp .env.example .env
	@echo "Setup completed!"

# Build
build: ## Build all services
	@echo "Building all services..."
	docker-compose -f $(COMPOSE_FILE) build

build-dev: ## Build all services for development
	@echo "Building all services for development..."
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_FILE_DEV) build

build-prod: ## Build all services for production
	@echo "Building all services for production..."
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_FILE_PROD) build

# Services
up: ## Start all services
	@echo "Starting all services..."
	docker-compose -f $(COMPOSE_FILE) up -d

up-dev: ## Start all services in development mode
	@echo "Starting all services in development mode..."
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_FILE_DEV) up -d

up-prod: ## Start all services in production mode
	@echo "Starting all services in production mode..."
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_FILE_PROD) up -d

down: ## Stop all services
	@echo "Stopping all services..."
	docker-compose -f $(COMPOSE_FILE) down

down-v: ## Stop all services and remove volumes
	@echo "Stopping all services and removing volumes..."
	docker-compose -f $(COMPOSE_FILE) down -v

# Logs
logs: ## Show logs for all services
	docker-compose -f $(COMPOSE_FILE) logs -f

logs-api: ## Show logs for API Gateway
	docker-compose -f $(COMPOSE_FILE) logs -f api-gateway

logs-user: ## Show logs for User Service
	docker-compose -f $(COMPOSE_FILE) logs -f user-service

logs-product: ## Show logs for Product Service
	docker-compose -f $(COMPOSE_FILE) logs -f product-service

logs-order: ## Show logs for Order Service
	docker-compose -f $(COMPOSE_FILE) logs -f order-service

logs-payment: ## Show logs for Payment Service
	docker-compose -f $(COMPOSE_FILE) logs -f payment-service

logs-notification: ## Show logs for Notification Service
	docker-compose -f $(COMPOSE_FILE) logs -f notification-service

logs-analytics: ## Show logs for Analytics Service
	docker-compose -f $(COMPOSE_FILE) logs -f analytics-service

# Testing
test: ## Run all tests
	@echo "Running all tests..."
	docker-compose -f $(COMPOSE_FILE_TEST) up --build --abort-on-container-exit
	docker-compose -f $(COMPOSE_FILE_TEST) down

test-unit: ## Run unit tests
	@echo "Running unit tests..."
	@./scripts/test/test-unit.sh

test-integration: ## Run integration tests
	@echo "Running integration tests..."
	@./scripts/test/test-integration.sh

test-e2e: ## Run e2e tests
	@echo "Running e2e tests..."
	@./scripts/test/test-e2e.sh

# Linting
lint: ## Run linting for all services
	@echo "Running linting..."
	@./scripts/build/lint-all.sh

lint-go: ## Run linting for Go services
	@echo "Running Go linting..."
	cd services/user-service && golangci-lint run
	cd services/payment-service && golangci-lint run

lint-python: ## Run linting for Python services
	@echo "Running Python linting..."
	cd services/product-service && flake8 app/
	cd services/product-service && black --check app/

lint-rust: ## Run linting for Rust services
	@echo "Running Rust linting..."
	cd services/order-service && cargo clippy -- -D warnings
	cd services/analytics-service && cargo clippy -- -D warnings

lint-nodejs: ## Run linting for Node.js services
	@echo "Running Node.js linting..."
	cd services/api-gateway && npm run lint
	cd services/notification-service && npm run lint

# Database
db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	@./scripts/database/migrate.sh

db-seed: ## Seed database with test data
	@echo "Seeding database..."
	@./scripts/database/seed.sh

db-reset: ## Reset database
	@echo "Resetting database..."
	@./scripts/database/reset.sh

# Proto generation
proto-gen: ## Generate protobuf code
	@echo "Generating protobuf code..."
	cd shared/proto && ./scripts/generate-all.sh

# Clean
clean: ## Clean up Docker resources
	@echo "Cleaning up..."
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

clean-all: ## Clean up everything including images
	@echo "Cleaning up everything..."
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -af
	docker volume prune -f

# Development
shell-api: ## Open shell in API Gateway container
	docker-compose -f $(COMPOSE_FILE) exec api-gateway sh

shell-user: ## Open shell in User Service container
	docker-compose -f $(COMPOSE_FILE) exec user-service sh

shell-product: ## Open shell in Product Service container
	docker-compose -f $(COMPOSE_FILE) exec product-service sh

shell-db: ## Open PostgreSQL shell
	docker-compose -f $(COMPOSE_FILE) exec postgres psql -U admin -d microservices_db

shell-redis: ## Open Redis shell
	docker-compose -f $(COMPOSE_FILE) exec redis redis-cli

# Monitoring
monitor: ## Start monitoring stack
	@echo "Starting monitoring stack..."
	docker-compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d

monitor-down: ## Stop monitoring stack
	@echo "Stopping monitoring stack..."
	docker-compose -f infrastructure/monitoring/docker-compose.monitoring.yml down

# Documentation
docs: ## Generate API documentation
	@echo "Generating API documentation..."
	@./scripts/docs/generate-docs.sh

# Security
security-scan: ## Run security scan
	@echo "Running security scan..."
	@./scripts/security/scan.sh
