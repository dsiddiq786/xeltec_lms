# brickSkill LMS — Production Deployment Guide

## Architecture Overview

```
Internet → Nginx (SSL/TLS) → ┬→ React SPA (static files)
                              ├→ NestJS Backend API (/api/*)
                              ├→ Python FastAPI AI Service (/api/course-generator/*)
                              └→ Static Assets (/static/*, /uploads/*)

Databases: PostgreSQL 15, MongoDB 7, Redis 7
```

## Prerequisites

- **Server**: Ubuntu 22.04+ (or Debian 12+), 2+ vCPUs, 4GB+ RAM
- **Domain**: DNS A record pointing to server IP
- **Docker**: Will be auto-installed by setup script

## Quick Deploy

### 1. Prepare the package locally

```bash
chmod +x deploy/prepare_upload.sh
./deploy/prepare_upload.sh
```

### 2. Upload to server

```bash
scp deploy/project.tar.gz root@YOUR_SERVER_IP:/tmp/
scp deploy/remote_setup.sh root@YOUR_SERVER_IP:/tmp/
```

### 3. Run setup on server

```bash
ssh root@YOUR_SERVER_IP
chmod +x /tmp/remote_setup.sh
/tmp/remote_setup.sh
```

### 4. Configure environment

```bash
cd /opt/lms
cp .env.example .env
nano .env  # Fill in ALL production values
```

**Critical variables to set:**

| Variable | How to generate |
|----------|----------------|
| `POSTGRES_PASSWORD` | `openssl rand -hex 16` |
| `REDIS_PASSWORD` | `openssl rand -hex 16` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | From Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Webhook settings |
| `SENDGRID_API_KEY` | From SendGrid account |
| `OPENAI_API_KEY` | From OpenAI platform |

### 5. Start services

```bash
docker compose up -d --build
```

### 6. Setup SSL (first time only)

```bash
chmod +x deploy/init-letsencrypt.sh
./deploy/init-letsencrypt.sh
```

### 7. Seed the database (first time only)

```bash
docker compose exec lms-backend npx prisma db seed
```

## Monitoring

```bash
# All service logs
docker compose logs -f

# Specific service
docker compose logs -f lms-backend

# Health checks
curl https://lms.xeltecdev.com/api/health
curl https://lms.xeltecdev.com/health  # AI service

# Resource usage
docker stats
```

## Updates

```bash
cd /opt/lms

# Option A: Upload new package
# (run prepare_upload.sh locally, scp to server)
tar -xzf /tmp/project.tar.gz -C /opt/lms

# Option B: Git pull
git pull origin main

# Rebuild and restart
docker compose up -d --build --remove-orphans

# Run any new migrations
docker compose exec lms-backend npx prisma migrate deploy
```

## Backup

```bash
# PostgreSQL
docker compose exec postgres pg_dump -U postgres lms_db > backup_$(date +%Y%m%d).sql

# MongoDB
docker compose exec mongo mongodump --out /data/backup_$(date +%Y%m%d)

# Uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz -C /opt/lms uploads_data/
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Container won't start | `docker compose logs <service>` |
| Database connection refused | Check `POSTGRES_PASSWORD` matches in `.env` |
| SSL certificate error | Re-run `./deploy/init-letsencrypt.sh` |
| 502 Bad Gateway | Backend not ready yet, wait or check logs |
| Stripe webhooks failing | Verify `STRIPE_WEBHOOK_SECRET` and webhook URL |

## Security Checklist

- [ ] All default passwords changed in `.env`
- [ ] `JWT_SECRET` is at least 64 hex characters
- [ ] `NODE_ENV=production` is set
- [ ] Stripe is using **live** keys (not test)
- [ ] SendGrid is configured for production email
- [ ] SSH keys rotated from dev defaults
- [ ] Firewall allows only ports 80, 443, and 22
- [ ] SSL certificate is valid and auto-renewing
