# ==============================================================================
# GXQ Studio - Makefile
# ==============================================================================
# Simplified commands for building, deploying, and managing the application
# ==============================================================================

.PHONY: help install build start stop restart logs clean test lint docker-* deploy-*

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(BLUE)GXQ Studio - Available Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm ci
	cd webapp && npm ci
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

dev: ## Start development servers (backend + webapp)
	@echo "$(BLUE)Starting development servers...$(NC)"
	@echo "Backend: http://localhost:3000"
	@echo "Webapp: http://localhost:3001"
	npm run dev:server & cd webapp && npm run dev

dev-backend: ## Start backend development server only
	@echo "$(BLUE)Starting backend development server...$(NC)"
	npm run dev:server

dev-webapp: ## Start webapp development server only
	@echo "$(BLUE)Starting webapp development server...$(NC)"
	cd webapp && npm run dev

##@ Building

build: ## Build backend and webapp for production
	@echo "$(BLUE)Building application...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

build-backend: ## Build backend only
	@echo "$(BLUE)Building backend...$(NC)"
	npm run build:backend
	@echo "$(GREEN)✓ Backend build complete$(NC)"

build-webapp: ## Build webapp only
	@echo "$(BLUE)Building webapp...$(NC)"
	npm run build:webapp
	@echo "$(GREEN)✓ Webapp build complete$(NC)"

##@ Running

start: build ## Build and start production servers
	@echo "$(BLUE)Starting production servers...$(NC)"
	npm run start:server & cd webapp && npm start

start-server: build-backend ## Start backend server only
	@echo "$(BLUE)Starting backend server...$(NC)"
	npm run start:server

start-webapp: build-webapp ## Start webapp only
	@echo "$(BLUE)Starting webapp...$(NC)"
	cd webapp && npm start

##@ Docker

docker-build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build
	@echo "$(GREEN)✓ Docker images built$(NC)"

docker-up: ## Start Docker containers
	@echo "$(BLUE)Starting Docker containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Containers started$(NC)"
	@echo "Backend: http://localhost:3000"
	@echo "Webapp: http://localhost:3001"

docker-down: ## Stop Docker containers
	@echo "$(YELLOW)Stopping Docker containers...$(NC)"
	docker-compose down

docker-restart: ## Restart Docker containers
	@echo "$(BLUE)Restarting Docker containers...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Containers restarted$(NC)"

docker-logs: ## View Docker container logs
	docker-compose logs -f

docker-clean: ## Remove Docker containers and images
	@echo "$(YELLOW)Cleaning Docker resources...$(NC)"
	docker-compose down -v --rmi all
	@echo "$(GREEN)✓ Docker resources cleaned$(NC)"

docker-dev: ## Start development Docker environment
	@echo "$(BLUE)Starting development Docker environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)✓ Development environment started$(NC)"

docker-monitoring: ## Start with monitoring (Prometheus + Grafana)
	@echo "$(BLUE)Starting with monitoring...$(NC)"
	docker-compose --profile monitoring up -d
	@echo "$(GREEN)✓ Monitoring enabled$(NC)"
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana: http://localhost:3002 (admin/admin)"

docker-full: ## Start all services (with DB, cache, monitoring)
	@echo "$(BLUE)Starting all services...$(NC)"
	docker-compose --profile with-db --profile with-cache --profile monitoring up -d
	@echo "$(GREEN)✓ All services started$(NC)"

##@ Testing & Quality

test: ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	npm test
	@echo "$(GREEN)✓ Tests complete$(NC)"

test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm run test:coverage

lint: ## Run linter
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint
	cd webapp && npm run lint
	@echo "$(GREEN)✓ Linting complete$(NC)"

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checks...$(NC)"
	npm run type-check
	cd webapp && npm run type-check
	@echo "$(GREEN)✓ Type checking complete$(NC)"

validate: lint type-check test ## Run all validation (lint + type-check + test)
	@echo "$(GREEN)✓ All validation passed$(NC)"

##@ Deployment

deploy-vps: ## Deploy to VPS using automated script
	@echo "$(BLUE)Deploying to VPS...$(NC)"
	chmod +x deployment/scripts/deploy-vps.sh
	sudo deployment/scripts/deploy-vps.sh

deploy-azure: ## Deploy to Azure
	@echo "$(BLUE)Deploying to Azure...$(NC)"
	chmod +x deployment/scripts/deploy-azure.sh
	deployment/scripts/deploy-azure.sh

deploy-railway: ## Deploy to Railway
	@echo "$(BLUE)Deploying to Railway...$(NC)"
	railway up

deploy-vercel: ## Deploy to Vercel
	@echo "$(BLUE)Deploying to Vercel...$(NC)"
	vercel --prod

##@ Maintenance

clean: ## Clean build artifacts and dependencies
	@echo "$(YELLOW)Cleaning...$(NC)"
	rm -rf dist
	rm -rf webapp/.next
	rm -rf webapp/out
	rm -rf node_modules
	rm -rf webapp/node_modules
	@echo "$(GREEN)✓ Cleaned$(NC)"

logs: ## View application logs
	@echo "$(BLUE)Viewing logs...$(NC)"
	tail -f logs/*.log

health: ## Check application health
	@echo "$(BLUE)Checking health...$(NC)"
	@curl -s http://localhost:3000/api/health | jq . || echo "$(RED)Backend not responding$(NC)"
	@curl -s http://localhost:3001 > /dev/null && echo "$(GREEN)Webapp is healthy$(NC)" || echo "$(RED)Webapp not responding$(NC)"

env-example: ## Create .env from .env.example
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env from .env.example$(NC)"; \
		echo "$(YELLOW)⚠ Please edit .env with your configuration$(NC)"; \
	else \
		echo "$(YELLOW).env already exists$(NC)"; \
	fi

##@ PM2 Management (VPS)

pm2-start: build ## Start with PM2
	@echo "$(BLUE)Starting with PM2...$(NC)"
	pm2 start dist/src/server.js --name gxq-studio
	pm2 save
	@echo "$(GREEN)✓ Started with PM2$(NC)"

pm2-stop: ## Stop PM2 process
	pm2 stop gxq-studio

pm2-restart: ## Restart PM2 process
	pm2 restart gxq-studio

pm2-logs: ## View PM2 logs
	pm2 logs gxq-studio

pm2-status: ## Check PM2 status
	pm2 status

pm2-delete: ## Delete PM2 process
	pm2 delete gxq-studio

##@ Information

info: ## Display project information
	@echo "$(BLUE)GXQ Studio - Project Information$(NC)"
	@echo ""
	@echo "$(YELLOW)Repository:$(NC) https://github.com/SMSDAO/reimagined-jupiter"
	@echo "$(YELLOW)Documentation:$(NC) See DEPLOYMENT.md"
	@echo ""
	@echo "$(YELLOW)Platforms Supported:$(NC)"
	@echo "  • Vercel (Serverless)"
	@echo "  • Railway (Container)"
	@echo "  • AWS (Amplify, App Runner, ECS)"
	@echo "  • Azure (App Service)"
	@echo "  • Alibaba Cloud (ECS, ACK)"
	@echo "  • Coolify (Self-hosted)"
	@echo "  • aaPanel (Control panel)"
	@echo "  • VPS (PM2/Docker)"
	@echo "  • Localhost (Dev/Prod)"
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  1. make env-example  # Create .env file"
	@echo "  2. make install      # Install dependencies"
	@echo "  3. make dev          # Start development"
	@echo ""
	@echo "$(YELLOW)Docker:$(NC)"
	@echo "  1. make env-example  # Create .env file"
	@echo "  2. make docker-up    # Start containers"
	@echo ""

version: ## Display versions
	@echo "$(BLUE)Version Information$(NC)"
	@echo ""
	@echo "$(YELLOW)Node.js:$(NC) $$(node --version)"
	@echo "$(YELLOW)npm:$(NC) $$(npm --version)"
	@echo "$(YELLOW)Docker:$(NC) $$(docker --version 2>/dev/null || echo 'Not installed')"
	@echo "$(YELLOW)Docker Compose:$(NC) $$(docker-compose --version 2>/dev/null || echo 'Not installed')"
