#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GXQ Smart Brain: Docker Deployment
# ==============================================================================
# Docker containerization and deployment with local testing
# ==============================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step() {
  echo ""
  echo "======================================================================"
  echo -e "${BLUE}▶ $1${NC}"
  echo "======================================================================"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

abort() {
  echo ""
  log_error "DOCKER DEPLOYMENT FAILED: $1"
  exit 1
}

echo ""
echo "======================================================================"
echo "🐳 GXQ SMART BRAIN: DOCKER DEPLOYMENT"
echo "======================================================================"
echo "Building and deploying Docker containers"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================================"

# Step 1: Validate Docker installation
log_step "Step 1/6: Docker Validation"

if command -v docker &> /dev/null; then
  log_success "Docker is installed"
  docker --version
else
  abort "Docker is not installed. Install from https://docker.com"
fi

if docker info &> /dev/null; then
  log_success "Docker daemon is running"
else
  abort "Docker daemon is not running. Start Docker and try again."
fi

# Step 2: Validate configuration files
log_step "Step 2/6: Configuration Validation"

if [ -f "Dockerfile" ]; then
  log_success "Dockerfile exists"
else
  abort "Dockerfile not found"
fi

if [ -f "docker-compose.yml" ]; then
  log_success "docker-compose.yml exists"
else
  log_info "docker-compose.yml not found (optional)"
fi

# Step 3: Build Docker image
log_step "Step 3/6: Build Docker Image"

IMAGE_NAME="gxq-studio:latest"
IMAGE_TAG="gxq-studio:$(date '+%Y%m%d-%H%M%S')"

log_info "Building Docker image: $IMAGE_NAME"
if docker build -t "$IMAGE_NAME" -t "$IMAGE_TAG" . 2>&1 | tail -30; then
  log_success "Docker image built successfully"
else
  abort "Docker image build failed"
fi

# Get image size
IMAGE_SIZE=$(docker images "$IMAGE_NAME" --format "{{.Size}}" | head -1)
log_info "Image size: $IMAGE_SIZE"

# Step 4: Test container locally (optional)
log_step "Step 4/6: Local Container Test"

log_info "Testing container locally..."
echo ""
echo "Starting container on port 3000..."
echo "Press Ctrl+C to stop the test and continue to deployment"
echo ""

# Run container in background for testing
CONTAINER_ID=$(docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  "$IMAGE_NAME" 2>&1)

if [ -n "$CONTAINER_ID" ]; then
  log_success "Container started: ${CONTAINER_ID:0:12}"
  
  log_info "Waiting for container to be ready..."
  sleep 5
  
  # Check if container is still running
  if docker ps | grep -q "${CONTAINER_ID:0:12}"; then
    log_success "Container is running"
    
    # Try to access health endpoint
    if curl -f -s http://localhost:3000/health &> /dev/null; then
      log_success "Health check passed"
    else
      log_info "Health endpoint not responding (may need more time)"
    fi
    
    # Show logs
    log_info "Container logs (last 10 lines):"
    docker logs "$CONTAINER_ID" 2>&1 | tail -10
    
    # Stop test container
    log_info "Stopping test container..."
    docker stop "$CONTAINER_ID" &> /dev/null || true
    docker rm "$CONTAINER_ID" &> /dev/null || true
    log_success "Test container stopped and removed"
  else
    log_error "Container failed to stay running"
    docker logs "$CONTAINER_ID" 2>&1 | tail -20
    docker rm "$CONTAINER_ID" &> /dev/null || true
  fi
else
  log_error "Failed to start test container"
fi

# Step 5: Docker Compose (if available)
log_step "Step 5/6: Docker Compose"

if [ -f "docker-compose.yml" ]; then
  log_info "Starting services with Docker Compose..."
  
  if docker-compose up -d 2>&1 | tail -20; then
    log_success "Docker Compose services started"
    
    log_info "Running services:"
    docker-compose ps
  else
    log_error "Docker Compose failed to start services"
  fi
else
  log_info "Skipping Docker Compose (docker-compose.yml not found)"
fi

# Step 6: Push to registry (optional)
log_step "Step 6/6: Push to Registry (Optional)"

DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
if [ -n "$DOCKER_REGISTRY" ]; then
  log_info "Pushing to registry: $DOCKER_REGISTRY"
  
  REGISTRY_IMAGE="$DOCKER_REGISTRY/gxq-studio:latest"
  
  docker tag "$IMAGE_NAME" "$REGISTRY_IMAGE"
  
  if docker push "$REGISTRY_IMAGE" 2>&1 | tail -20; then
    log_success "Image pushed to registry: $REGISTRY_IMAGE"
  else
    log_error "Failed to push to registry"
  fi
else
  log_info "DOCKER_REGISTRY not set - skipping push to registry"
  echo ""
  echo "💡 To push to a registry:"
  echo "   1. Set DOCKER_REGISTRY: export DOCKER_REGISTRY=your-registry.com/your-org"
  echo "   2. Login: docker login your-registry.com"
  echo "   3. Run this script again"
  echo ""
fi

# Summary
echo ""
echo "======================================================================"
echo "🎉 DOCKER DEPLOYMENT COMPLETED"
echo "======================================================================"
echo ""
echo "📊 Deployment Summary:"
echo "  • Image: $IMAGE_NAME"
echo "  • Tagged: $IMAGE_TAG"
echo "  • Size: $IMAGE_SIZE"
echo "  • Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "💡 Useful commands:"
echo "   - Run container: docker run -p 3000:3000 $IMAGE_NAME"
echo "   - View images: docker images | grep gxq-studio"
echo "   - Compose up: docker-compose up -d"
echo "   - Compose down: docker-compose down"
echo "   - View logs: docker logs <container-id>"
echo ""
echo "💡 Next steps:"
echo "   - Deploy to cloud: Push image to registry and deploy"
echo "   - Local test: docker run -p 3000:3000 $IMAGE_NAME"
echo "   - Check health: curl http://localhost:3000/health"
echo ""
echo "======================================================================"

exit 0
