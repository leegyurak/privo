# Privo Backend Makefile

.PHONY: help build test run clean docker-up docker-down docker-test docker-logs docker-app docker-build

# Default target
help:
	@echo "Available commands:"
	@echo "  build         - Build the application"
	@echo "  test          - Run all tests"
	@echo "  test-unit     - Run unit tests only"
	@echo "  test-integration - Run integration tests only"
	@echo "  run           - Run the application in development mode"
	@echo "  run-prod      - Run the application in production mode"
	@echo "  clean         - Clean build artifacts"
	@echo "  docker-up     - Start all services (MySQL, Redis)"
	@echo "  docker-up-dev - Start services with dev tools (Adminer, Redis Commander)"
	@echo "  docker-down   - Stop all services"
	@echo "  docker-test   - Start test services (MySQL, Redis for testing)"
	@echo "  docker-logs   - Show logs from all services"
	@echo "  docker-clean  - Remove all containers and volumes"
	@echo "  docker-build  - Build the application Docker image"
	@echo "  docker-app    - Start the application with dependencies"
	@echo "  setup         - Initial project setup"
	@echo "  db-migrate    - Run database migrations"
	@echo "  db-info       - Show database migration info"
	@echo "  db-validate   - Validate database migrations"
	@echo "  db-clean      - Clean database (DANGER: removes all data)"
	@echo "  db-reset      - Reset database and run migrations"
	@echo "  lint          - Run code linting"
	@echo "  format        - Format code"

# Build the application
build:
	./gradlew build -x test

# Run all tests
test:
	./gradlew test

# Run unit tests only
test-unit:
	./gradlew test --tests "*.unit.*" --tests "*Test" --exclude-tests "*.integration.*"

# Run integration tests only
test-integration:
	./gradlew test --tests "*.integration.*"

# Run the application in development mode
run:
	./gradlew bootRun --args='--spring.profiles.active=dev'

# Run the application in production mode
run-prod:
	./gradlew bootRun --args='--spring.profiles.active=prod'

# Clean build artifacts
clean:
	./gradlew clean

# Start all services (MySQL, Redis)
docker-up:
	docker-compose up -d mysql redis

# Start services with development tools
docker-up-dev:
	docker-compose --profile dev up -d

# Stop all services
docker-down:
	docker-compose down

# Start test services
docker-test:
	docker-compose --profile test up -d mysql-test redis-test

# Show logs from all services
docker-logs:
	docker-compose logs -f

# Remove all containers and volumes
docker-clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Build the application Docker image
docker-build:
	docker-compose build app

# Start the application with dependencies
docker-app:
	docker-compose --profile app up -d

# Initial project setup
setup: db-setup-dev
	@echo "Setup complete!"

# Run code linting (if ktlint is configured)
lint:
	./gradlew ktlintCheck || echo "Ktlint not configured"

# Format code (if ktlint is configured)
format:
	./gradlew ktlintFormat || echo "Ktlint not configured"

# Development workflow
dev-setup: docker-up-dev setup
	@echo "Development environment ready!"
	@echo "Services available at:"
	@echo "  MySQL: localhost:3306 (user: privo, password: privo123)"
	@echo "  Redis: localhost:6379"
	@echo "  Adminer: http://localhost:8081"
	@echo "  Redis Commander: http://localhost:8082"

# Test workflow with test databases
test-full: docker-test
	@echo "Waiting for test databases to be ready..."
	@sleep 15
	@echo "Running tests..."
	DATABASE_URL=jdbc:mysql://localhost:3307/privo_test \
	DATABASE_USERNAME=privo \
	DATABASE_PASSWORD=privo123 \
	REDIS_HOST=localhost \
	REDIS_PORT=6380 \
	./gradlew test
	@echo "Stopping test services..."
	docker-compose --profile test down

# CI/CD workflow
ci: clean build test

# Production deployment preparation
prod-build:
	./gradlew bootJar
	@echo "Production JAR built: build/libs/privo-backend-*.jar"

# Database operations
db-migrate:
	@echo "Running database migrations..."
	./gradlew flywayMigrate

db-info:
	@echo "Database migration information:"
	./gradlew flywayInfo

db-validate:
	@echo "Validating database migrations..."
	./gradlew flywayValidate

db-clean:
	@echo "WARNING: This will remove all data from the database!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	./gradlew flywayClean

db-baseline:
	@echo "Creating baseline for existing database..."
	./gradlew flywayBaseline

db-repair:
	@echo "Repairing database migration metadata..."
	./gradlew flywayRepair

db-reset: docker-down docker-clean docker-up
	@echo "Waiting for MySQL to be ready..."
	@sleep 30
	@echo "Running database migrations..."
	./gradlew flywayMigrate
	@echo "Database reset complete"

# Database setup for different environments
db-setup-dev: docker-up
	@echo "Setting up development database..."
	@sleep 30
	./gradlew flywayMigrate
	@echo "Development database ready!"

db-setup-test: docker-test
	@echo "Setting up test database..."
	@sleep 15
	DATABASE_URL=jdbc:mysql://localhost:3307/privo_test \
	DATABASE_USERNAME=privo \
	DATABASE_PASSWORD=privo123 \
	./gradlew flywayMigrate
	@echo "Test database ready!"

# Health check
health-check:
	@curl -f http://localhost:8080/actuator/health || echo "Application not running"

# Quick development cycle
dev: docker-up build test run

# Monitor logs during development
dev-logs:
	docker-compose logs -f mysql redis &
	./gradlew bootRun --args='--spring.profiles.active=dev'