# GXQ Studio - Multi-Platform Deployment Guide

This comprehensive guide covers deployment across all major platforms including Vercel, Railway, AWS, Azure, Alibaba Cloud, Coolify, aaPanel, VPS, and localhost environments.

> **🧠 Smart Brain Integration**: This project includes the [GXQ Smart Brain Operator](docs/SMART_BRAIN_OPERATOR.md) for automated orchestration and deployment. See also [CI/CD Guide](docs/CI_CD_GUIDE.md).

## Quick Deploy with Smart Brain

For the fastest deployment experience using automated orchestration:

```bash
# 1. Validate and prepare system
npm run master

# 2. Deploy to Vercel (webapp)
npm run deploy:vercel

# 3. Deploy to Railway (backend)
npm run deploy:railway

# 4. Verify health
npm run health
```

For detailed manual deployment procedures, see sections below.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Platform-Specific Deployments](#platform-specific-deployments)
   - [Vercel (Serverless)](#vercel-serverless)
   - [Railway (Container)](#railway-container)
   - [AWS](#aws)
   - [Azure](#azure)
   - [Alibaba Cloud](#alibaba-cloud)
   - [Coolify](#coolify)
   - [aaPanel](#aapanel)
   - [VPS (Manual)](#vps-manual)
   - [Localhost](#localhost)
4. [WebSocket Configuration](#websocket-configuration)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required for All Deployments

- **Node.js**: Version 20.x or higher
- **npm**: Version 10.x or higher
- **Git**: For version control and deployment
- **Solana RPC**: QuickNode, Helius, or Triton recommended for production

### Platform-Specific Requirements

- **Vercel**: Vercel account and CLI
- **Railway**: Railway account
- **AWS**: AWS account, AWS CLI
- **Azure**: Azure account, Azure CLI
- **Docker**: For containerized deployments (Railway, AWS ECS, Azure, VPS)
- **Domain**: Optional but recommended for production

---

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Required Variables

Edit `.env` with your configuration:

```bash
# ===== REQUIRED =====
SOLANA_RPC_URL=https://your-rpc-url.com
WALLET_PRIVATE_KEY=your_base58_private_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_32_character_secret

# ===== RECOMMENDED =====
MINIMUM_PROFIT_SOL=0.01
MAX_SLIPPAGE=0.01
LOG_LEVEL=info
```

### 3. Platform-Specific Variables

Add these based on your deployment platform:

```bash
# Deployment identification
DEPLOYMENT_PLATFORM=vercel|railway|aws|azure|alibaba|docker|vps|localhost

# Auto-start behavior (for persistent deployments)
AUTO_START=true

# Scan interval (milliseconds, for backend server)
SCAN_INTERVAL_MS=5000

# WebSocket configuration
SOLANA_WS_URL=wss://your-websocket-url.com
```

---

## Platform-Specific Deployments

### Vercel (Serverless)

**Best for**: Next.js webapp frontend, serverless API routes

**Limitations**: Not suitable for continuous arbitrage monitoring

#### Setup Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure Project**
   
   The `vercel.json` is already configured. Key settings:
   - Root directory: `webapp`
   - Framework: Next.js
   - Output directory: `webapp/.next`

3. **Set Environment Variables**
   
   In Vercel Dashboard or via CLI:
   ```bash
   vercel env add NEXT_PUBLIC_RPC_URL
   vercel env add NEXT_PUBLIC_BACKEND_URL
   ```

4. **Deploy**
   ```bash
   # Preview deployment
   vercel

   # Production deployment
   vercel --prod
   ```

#### Automatic Deployments

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

#### Custom Domain

1. Go to Vercel Dashboard > Project > Settings > Domains
2. Add your domain
3. Configure DNS records as instructed

---

### Railway (Container)

**Best for**: Backend server with continuous arbitrage monitoring

**Recommended**: For production backend deployment

#### Setup Steps

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Configure Environment**
   
   Set all required environment variables in Railway Dashboard:
   - Project > Variables > Add Variable
   - Or bulk upload from `.env` file

5. **Deploy**
   ```bash
   railway up
   ```

#### Configuration

The `railway.json` file is already configured with:
- Build command: `npm install && npm run build`
- Start command: `npm run start:railway`
- Health check: `/api/health`
- Auto-restart enabled

#### Using the Unified Server

To use the new unified `server.ts` instead of `index-railway.ts`:

1. Update `railway.json`:
   ```json
   "deploy": {
     "startCommand": "npm run start:server"
   }
   ```

2. Redeploy:
   ```bash
   railway up
   ```

---

### AWS

AWS offers multiple deployment options. Choose based on your needs:

#### Option 1: AWS Amplify (Webapp Only)

**Best for**: Frontend deployment with CI/CD

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect in AWS Amplify Console**
   - Go to AWS Amplify Console
   - New app > Host web app
   - Connect repository (GitHub)
   - Select `main` branch

3. **Configure Build**
   
   The `amplify.yml` file is already configured. Review and adjust if needed.

4. **Set Environment Variables**
   - In Amplify Console > App settings > Environment variables
   - Add all `NEXT_PUBLIC_*` variables

5. **Deploy**
   
   Amplify automatically builds and deploys on push.

#### Option 2: AWS App Runner (Backend)

**Best for**: Containerized backend with auto-scaling

1. **Build and Push Docker Image**
   ```bash
   # Build backend image
   docker build --target backend -t gxq-backend .

   # Tag for ECR
   docker tag gxq-backend:latest [AWS_ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/gxq-backend:latest

   # Push to ECR
   aws ecr get-login-password --region [REGION] | docker login --username AWS --password-stdin [AWS_ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com
   docker push [AWS_ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/gxq-backend:latest
   ```

2. **Create App Runner Service**
   ```bash
   aws apprunner create-service \
     --service-name gxq-studio \
     --source-configuration '{
       "ImageRepository": {
         "ImageIdentifier": "[AWS_ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/gxq-backend:latest",
         "ImageRepositoryType": "ECR"
       },
       "AutoDeploymentsEnabled": true
     }' \
     --instance-configuration '{
       "Cpu": "1024",
       "Memory": "2048"
     }'
   ```

3. **Configure Environment Variables**
   
   In App Runner Console > Configuration > Environment variables

4. **Set Health Check**
   - Path: `/api/health`
   - Interval: 30 seconds
   - Timeout: 10 seconds

#### Option 3: AWS ECS (Production)

**Best for**: Full control, high availability, auto-scaling

1. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name gxq-studio-cluster
   ```

2. **Create Task Definition**
   ```bash
   aws ecs register-task-definition --cli-input-json file://deployment/configs/ecs-task-definition.json
   ```

3. **Create Service**
   ```bash
   aws ecs create-service \
     --cluster gxq-studio-cluster \
     --service-name gxq-studio-service \
     --task-definition gxq-studio-task \
     --desired-count 1 \
     --launch-type FARGATE
   ```

4. **Configure Load Balancer**
   - Create Application Load Balancer
   - Configure target group with health check `/api/health`
   - Associate with ECS service

---

### Azure

#### Option 1: Azure App Service

**Best for**: Managed platform with easy scaling

1. **Install Azure CLI**
   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Run Deployment Script**
   ```bash
   chmod +x deployment/scripts/deploy-azure.sh
   ./deployment/scripts/deploy-azure.sh
   ```

   Or manually:

3. **Create Resources**
   ```bash
   # Login
   az login

   # Create resource group
   az group create --name gxq-studio-rg --location eastus

   # Create App Service Plan
   az appservice plan create \
     --name gxq-studio-plan \
     --resource-group gxq-studio-rg \
     --sku B1 \
     --is-linux

   # Create Web App
   az webapp create \
     --name gxq-studio \
     --resource-group gxq-studio-rg \
     --plan gxq-studio-plan \
     --runtime "NODE:20-lts"
   ```

4. **Configure Application**
   ```bash
   # Set startup command
   az webapp config set \
     --name gxq-studio \
     --resource-group gxq-studio-rg \
     --startup-file "node dist/src/server.js"

   # Configure health check
   az webapp config set \
     --name gxq-studio \
     --resource-group gxq-studio-rg \
     --health-check-path "/api/health"
   ```

5. **Deploy Code**
   ```bash
   # From GitHub
   az webapp deployment source config \
     --name gxq-studio \
     --resource-group gxq-studio-rg \
     --repo-url https://github.com/SMSDAO/reimagined-jupiter \
     --branch main \
     --manual-integration
   ```

6. **Set Environment Variables**
   
   In Azure Portal > App Service > Configuration > Application settings

#### Option 2: Azure Container Instances

**Best for**: Simple container deployment

```bash
az container create \
  --name gxq-studio \
  --resource-group gxq-studio-rg \
  --image [YOUR_DOCKER_IMAGE] \
  --ports 3000 \
  --environment-variables \
    NODE_ENV=production \
    SOLANA_RPC_URL=[YOUR_RPC] \
  --secure-environment-variables \
    WALLET_PRIVATE_KEY=[YOUR_KEY]
```

---

### Alibaba Cloud

Alibaba Cloud supports multiple deployment methods. See `deployment/configs/alibaba-cloud.conf` for detailed configuration.

#### Option 1: ECS (Elastic Compute Service)

**Best for**: Full control, traditional VM deployment

1. **Create ECS Instance**
   - OS: Ubuntu 20.04 or CentOS 8
   - Instance Type: ecs.c6.xlarge (4 vCPU, 8 GB RAM) recommended
   - Storage: 40 GB SSD minimum

2. **Deploy Using VPS Script**
   ```bash
   ssh root@your-ecs-ip
   wget https://raw.githubusercontent.com/SMSDAO/reimagined-jupiter/main/deployment/scripts/deploy-vps.sh
   chmod +x deploy-vps.sh
   sudo ./deploy-vps.sh
   ```

3. **Configure Security Group**
   - Inbound: SSH (22), Backend (3000), Webapp (3001)
   - Outbound: Allow all

#### Option 2: Container Service (ACK)

**Best for**: Kubernetes-based deployment

1. **Create ACK Cluster** in Alibaba Cloud Console

2. **Configure kubectl**
   ```bash
   aliyun cs GET /k8s/[cluster-id]/user_config | tee ~/.kube/config
   ```

3. **Deploy with Helm** (convert docker-compose.yml to Helm charts)

#### Option 3: Function Compute

**Best for**: Webapp only (serverless)

Not recommended for backend due to continuous monitoring requirements.

---

### Coolify

**Best for**: Self-hosted, Docker Compose-based deployment

Coolify is a self-hostable alternative to Heroku/Railway.

#### Setup Steps

1. **Install Coolify** on your server
   ```bash
   curl -fsSL https://get.coolify.io | bash
   ```

2. **Access Coolify Dashboard**
   - Navigate to `http://your-server-ip:8000`
   - Complete initial setup

3. **Create New Service**
   - Click "New Service"
   - Select "Docker Compose"

4. **Configure Service**
   - **Name**: GXQ Studio
   - **Repository**: https://github.com/SMSDAO/reimagined-jupiter
   - **Branch**: main
   - **Docker Compose File**: docker-compose.yml

5. **Set Environment Variables**
   - Copy all variables from `.env.example`
   - Set in Coolify Dashboard > Service > Environment

6. **Deploy**
   - Click "Deploy"
   - Coolify will build and start services

#### Service Profiles

Enable optional services using profiles:

```bash
# With database
docker-compose --profile with-db up -d

# With caching
docker-compose --profile with-cache up -d

# With monitoring
docker-compose --profile monitoring up -d

# All services
docker-compose --profile with-db --profile with-cache --profile monitoring up -d
```

#### Access Services

- Backend: `http://your-server:3000`
- Webapp: `http://your-server:3001`
- Grafana: `http://your-server:3002` (if monitoring enabled)

---

### aaPanel

**Best for**: Managed server with web-based control panel

aaPanel is a free hosting control panel similar to cPanel.

#### Setup Steps

1. **Install aaPanel**
   ```bash
   # Ubuntu/Debian
   wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh aapanel

   # CentOS
   wget -O install.sh http://www.aapanel.com/script/install_6.0_en.sh && sudo bash install.sh aapanel
   ```

2. **Access aaPanel**
   - Note the URL, username, and password from installation output
   - Login to web interface

3. **Install Docker**
   - App Store > Docker > Install
   - App Store > Docker Compose > Install

4. **Create Website**
   - Website > Add Site
   - Domain: your-domain.com
   - No FTP, No Database needed
   - PHP: Pure Static

5. **Upload Files**
   ```bash
   # Via Terminal in aaPanel
   cd /www/wwwroot/your-domain.com
   git clone https://github.com/SMSDAO/reimagined-jupiter.git .
   ```

6. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your settings
   ```

7. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

8. **Configure Reverse Proxy**
   - Website > your-domain.com > Reverse Proxy
   - Add proxy:
     - Name: webapp
     - Target URL: `http://127.0.0.1:3001`
     - Path: `/`
   - Add another proxy:
     - Name: api
     - Target URL: `http://127.0.0.1:3000`
     - Path: `/api`

9. **Setup SSL**
   - Website > your-domain.com > SSL
   - Let's Encrypt > Apply
   - Enable Force HTTPS

#### Management

Use aaPanel web interface or terminal:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart
```

---

### VPS (Manual)

**Best for**: Full control, any Linux VPS provider

Supports: DigitalOcean, Linode, Vultr, Hetzner, OVH, etc.

#### Automated Setup

1. **Run Deployment Script**
   ```bash
   wget https://raw.githubusercontent.com/SMSDAO/reimagined-jupiter/main/deployment/scripts/deploy-vps.sh
   chmod +x deploy-vps.sh
   sudo ./deploy-vps.sh
   ```

   This script:
   - Updates system
   - Installs Node.js 20
   - Installs PM2
   - Creates application user
   - Clones repository
   - Builds application
   - Configures PM2
   - Sets up firewall
   - Configures log rotation

2. **Configure Environment**
   ```bash
   sudo nano /home/gxq/reimagined-jupiter/.env
   ```

3. **Restart Service**
   ```bash
   sudo -u gxq pm2 restart gxq-studio
   ```

#### Manual Setup

If you prefer manual setup:

1. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js 20**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
   sudo apt install -y nodejs
   ```

3. **Install PM2**
   ```bash
   sudo npm install -g pm2
   ```

4. **Clone Repository**
   ```bash
   git clone https://github.com/SMSDAO/reimagined-jupiter.git
   cd reimagined-jupiter
   ```

5. **Install Dependencies and Build**
   ```bash
   npm ci
   npm run build:backend
   ```

6. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env
   ```

7. **Start with PM2**
   ```bash
   pm2 start dist/src/server.js --name gxq-studio
   pm2 save
   pm2 startup
   ```

#### Using Docker Instead

Alternative approach using Docker:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Deploy with Docker Compose
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter
cp .env.example .env
nano .env  # Edit configuration

docker-compose up -d
```

#### Firewall Configuration

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw enable

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

#### Process Management

```bash
# PM2 commands
pm2 status                    # View status
pm2 logs gxq-studio          # View logs
pm2 restart gxq-studio       # Restart
pm2 stop gxq-studio          # Stop
pm2 delete gxq-studio        # Remove

# Docker Compose commands
docker-compose ps            # View status
docker-compose logs -f       # View logs
docker-compose restart       # Restart
docker-compose down          # Stop all
```

---

### Localhost

**Development and Production Modes**

#### Development Mode

**For CLI/Backend**:

```bash
# Clone repository
git clone https://github.com/SMSDAO/reimagined-jupiter.git
cd reimagined-jupiter

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Run in development mode
npm run dev

# Or run unified server
npm run dev:server
```

**For Webapp**:

```bash
cd webapp
npm install
cp .env.example .env.local
nano .env.local  # Edit with your settings
npm run dev
```

Access:
- Backend: http://localhost:3000
- Webapp: http://localhost:3000 (in webapp directory)

#### Production Mode (Local)

**Backend**:

```bash
# Build
npm run build:backend

# Start production server
npm run start:server
```

**Webapp**:

```bash
cd webapp
npm run build
npm start
```

#### Docker Compose (Local)

```bash
# Configure environment
cp .env.example .env
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access:
- Backend: http://localhost:3000
- Webapp: http://localhost:3001
- Grafana: http://localhost:3002 (if monitoring profile enabled)

---

## WebSocket Configuration

### Solana RPC WebSocket

For real-time updates and continuous monitoring:

1. **Configure WebSocket URL**
   ```bash
   # In .env
   SOLANA_WS_URL=wss://your-websocket-endpoint.com
   ```

2. **RPC Providers with WebSocket Support**
   - **QuickNode**: Included with HTTP endpoint
   - **Helius**: Dedicated WebSocket endpoint
   - **Triton**: Available in all tiers
   - **Alchemy**: Included with API key

3. **Connection Management**

   The unified server (`src/server.ts`) includes:
   - Automatic reconnection logic
   - Connection health monitoring
   - Exponential backoff on failures
   - Graceful degradation

4. **WebSocket Stability Features**

   ```typescript
   // Automatic reconnection with retry logic
   const connection = new Connection(rpcUrl, {
     commitment: 'confirmed',
     wsEndpoint: wsUrl,
   });
   ```

### Application WebSocket (Optional)

For real-time dashboard updates:

1. **Backend WebSocket Server** (future enhancement)
   - Broadcasts arbitrage opportunities
   - Real-time trade execution updates
   - System status updates

2. **Frontend WebSocket Client** (future enhancement)
   - Real-time price feeds
   - Live opportunity updates
   - Trading notifications

---

## Monitoring & Maintenance

### Health Checks

All deployments include health check endpoints:

- **Backend**: `GET /api/health`
  ```json
  {
    "status": "healthy",
    "uptime": 3600,
    "memory": {
      "heapUsed": 128,
      "heapTotal": 256,
      "rss": 384
    },
    "bot": {
      "running": true,
      "paused": false,
      "scanCount": 720,
      "opportunitiesFound": 15,
      "tradesExecuted": 3,
      "totalProfit": 0.045
    }
  }
  ```

- **Webapp**: `GET /`
- **Kubernetes**: `GET /healthz` (liveness), `GET /ready` (readiness)

### Metrics

Access metrics at:
- **Prometheus format**: `GET /api/metrics`
- **Grafana dashboard**: Port 3002 (if monitoring enabled)

### Logging

Logs are available in multiple locations depending on deployment:

- **Railway**: Railway Dashboard > Logs
- **Vercel**: Vercel Dashboard > Logs
- **AWS**: CloudWatch Logs
- **Azure**: App Service Logs
- **Docker**: `docker-compose logs -f`
- **PM2**: `pm2 logs gxq-studio`
- **Files**: `./logs/` directory

### Log Levels

Configure via `LOG_LEVEL` environment variable:
- `debug`: Detailed debugging information
- `info`: General informational messages (default)
- `warn`: Warning messages
- `error`: Error messages only

### Backup

Regular backups for persistent data:

```bash
# Backup data directory
tar -czf backup-$(date +%Y%m%d).tar.gz ./data ./logs

# Database backup (if using PostgreSQL)
docker-compose exec postgres pg_dump -U postgres gxq_studio > backup-$(date +%Y%m%d).sql
```

### Updates

**For Docker deployments**:
```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

**For PM2 deployments**:
```bash
cd /home/gxq/reimagined-jupiter
git pull
npm ci
npm run build:backend
pm2 restart gxq-studio
```

**For platform deployments**:
- Most platforms auto-deploy on git push
- Check platform-specific documentation

---

## Troubleshooting

### Common Issues

#### 1. Connection Issues

**Problem**: Cannot connect to Solana RPC

**Solutions**:
- Verify `SOLANA_RPC_URL` is correct
- Check RPC provider status
- Test with curl: `curl -X POST [RPC_URL] -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`
- Switch to backup RPC if available

#### 2. Wallet Issues

**Problem**: Wallet not loading or invalid key

**Solutions**:
- Verify `WALLET_PRIVATE_KEY` is in base58 format
- Check key has no spaces or line breaks
- Test key with Solana CLI: `solana-keygen pubkey [KEY_FILE]`
- Ensure wallet has sufficient SOL for transactions

#### 3. Build Failures

**Problem**: Build fails during deployment

**Solutions**:
- Check Node.js version: `node --version` (should be 20.x)
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check for TypeScript errors: `npm run type-check`
- Review build logs for specific errors

#### 4. Health Check Failures

**Problem**: Health checks failing on deployment platform

**Solutions**:
- Verify application is listening on correct port
- Check `PORT` environment variable
- Ensure health check path is `/api/health`
- Increase health check timeout (default: 10s)
- Check application logs for startup errors

#### 5. Memory Issues

**Problem**: Out of memory errors

**Solutions**:
- Increase container/instance memory
- Monitor with: `GET /api/health` (memory section)
- Review scan interval (lower = more memory usage)
- Enable garbage collection: `NODE_OPTIONS="--max-old-space-size=2048"`

#### 6. WebSocket Disconnections

**Problem**: Frequent WebSocket disconnections

**Solutions**:
- Verify `SOLANA_WS_URL` is correct
- Check RPC provider WebSocket limits
- Implement reconnection logic (already included)
- Use dedicated WebSocket endpoint
- Monitor connection stability in logs

#### 7. Permission Denied

**Problem**: Permission errors when running scripts

**Solutions**:
```bash
# Make scripts executable
chmod +x deployment/scripts/*.sh

# Fix ownership
sudo chown -R $USER:$USER .
```

#### 8. Port Already in Use

**Problem**: Port 3000 or 3001 already occupied

**Solutions**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 [PID]

# Or use different port
export PORT=3002
```

### Platform-Specific Issues

#### Vercel

- **Issue**: 404 on API routes
  - **Solution**: Verify `vercel.json` configuration, check root directory setting

- **Issue**: Function timeout
  - **Solution**: Increase `maxDuration` in `vercel.json`, optimize code, consider Railway for backend

#### Railway

- **Issue**: Deployment fails
  - **Solution**: Check Railway logs, verify `railway.json`, ensure all env vars are set

- **Issue**: Service crashes after deployment
  - **Solution**: Check health check configuration, review application logs

#### Docker

- **Issue**: Container won't start
  - **Solution**: Check `docker logs [container]`, verify .env file, ensure ports aren't occupied

- **Issue**: Image build fails
  - **Solution**: Clear build cache: `docker-compose build --no-cache`

#### AWS

- **Issue**: ECR push fails
  - **Solution**: Authenticate: `aws ecr get-login-password | docker login ...`

- **Issue**: ECS task fails to start
  - **Solution**: Check task definition, verify IAM roles, review CloudWatch logs

### Getting Help

1. **Check Logs**: Always start by reviewing application logs
2. **Documentation**: Review this guide and platform-specific docs
3. **GitHub Issues**: Search existing issues or create new one
4. **Community**: Join our Discord/Telegram for support
5. **Professional Support**: Contact for enterprise support options

### Useful Commands

```bash
# Check application status
curl http://localhost:3000/api/health

# View real-time logs
tail -f logs/application.log

# Test RPC connection
curl -X POST $SOLANA_RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Monitor resource usage
docker stats

# Check disk space
df -h

# Check memory usage
free -h

# Monitor network
netstat -tuln | grep 3000
```

---

## Security Best Practices

1. **Never commit** `.env` file or private keys to version control
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** for all production deployments
4. **Implement rate limiting** on public endpoints
5. **Regular updates**: Keep dependencies up to date
6. **Backup regularly**: Automated daily backups recommended
7. **Monitor logs**: Set up alerts for errors and unusual activity
8. **Firewall rules**: Restrict access to necessary ports only
9. **Use dedicated wallet**: Separate trading wallet from main funds
10. **Enable 2FA**: On all platform accounts

---

## Performance Optimization

1. **RPC Selection**: Use premium RPC providers (QuickNode, Helius, Triton)
2. **Scan Interval**: Balance between opportunity detection and resource usage
3. **Memory Management**: Monitor and adjust based on usage patterns
4. **Caching**: Enable Redis for frequently accessed data
5. **Database**: Use PostgreSQL for historical data and analytics
6. **CDN**: Use CDN for webapp static assets
7. **Load Balancing**: Implement for high-traffic deployments
8. **Auto-scaling**: Configure based on load patterns

---

## Compliance & Legal

- **Regulations**: Ensure compliance with local cryptocurrency regulations
- **Terms of Service**: Review and comply with RPC provider terms
- **Data Privacy**: Implement appropriate data protection measures
- **Audit Logs**: Maintain logs for security and compliance
- **Liability**: Understand and accept risks of automated trading

---

## Support & Resources

- **GitHub Repository**: https://github.com/SMSDAO/reimagined-jupiter
- **Documentation**: See `docs/` directory
- **Issues**: https://github.com/SMSDAO/reimagined-jupiter/issues
- **Security**: See `SECURITY.md` for security policy
- **Contributing**: See `CONTRIBUTING.md` for contribution guidelines

---

## License

This project is licensed under the MIT License. See `LICENSE` file for details.

---

**Last Updated**: December 2024

**Version**: 1.0.0

**Maintainer**: GXQ STUDIO / SMSDAO
