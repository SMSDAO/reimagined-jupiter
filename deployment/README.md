# Deployment Resources

This directory contains deployment scripts, configurations, and monitoring setups for various platforms.

## Directory Structure

```
deployment/
├── configs/          # Platform-specific configuration files
│   ├── alibaba-cloud.conf
│   ├── azure-app-service.conf
│   └── gxq-studio.service (systemd)
├── scripts/          # Deployment automation scripts
│   ├── deploy-aapanel.sh
│   ├── deploy-azure.sh
│   ├── deploy-coolify.sh
│   └── deploy-vps.sh
├── prometheus/       # Prometheus monitoring configuration
│   └── prometheus.yml
└── grafana/          # Grafana dashboards and datasources
    ├── dashboards/
    └── datasources/
```

## Quick Reference

### Scripts

All scripts are executable and include detailed instructions:

- **deploy-vps.sh**: Automated VPS deployment (Ubuntu/Debian/CentOS)
- **deploy-azure.sh**: Azure App Service deployment via Azure CLI
- **deploy-coolify.sh**: Coolify deployment guide
- **deploy-aapanel.sh**: aaPanel deployment instructions

### Usage

```bash
# Make scripts executable
chmod +x deployment/scripts/*.sh

# Run VPS deployment
sudo ./deployment/scripts/deploy-vps.sh

# Run Azure deployment
./deployment/scripts/deploy-azure.sh
```

### Configuration Files

- **alibaba-cloud.conf**: Guidance for Alibaba Cloud deployments
- **azure-app-service.conf**: Azure App Service configuration
- **gxq-studio.service**: Systemd service file for Linux servers

### Monitoring

Prometheus and Grafana configurations for monitoring backend services.

Enable with:
```bash
docker-compose --profile monitoring up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)

## Platform Support

See [DEPLOYMENT.md](../DEPLOYMENT.md) for comprehensive deployment guides:

- ✅ Vercel (Serverless)
- ✅ Railway (Container)
- ✅ AWS (Amplify, App Runner, ECS)
- ✅ Azure (App Service, Container Instances)
- ✅ Alibaba Cloud (ECS, ACK, Function Compute)
- ✅ Coolify (Self-hosted)
- ✅ aaPanel (Control panel)
- ✅ VPS (Manual/PM2/Docker)
- ✅ Localhost (Dev/Prod)

## Security Notes

- Never commit `.env` files or secrets to version control
- Review and update security settings in configs before deployment
- Use environment variables for all sensitive configuration
- Enable firewalls and restrict access to necessary ports only
- Keep all systems and dependencies updated

## Support

For issues or questions:
- GitHub Issues: https://github.com/SMSDAO/reimagined-jupiter/issues
- Documentation: See [DEPLOYMENT.md](../DEPLOYMENT.md)
- Security: See [SECURITY.md](../SECURITY.md)
