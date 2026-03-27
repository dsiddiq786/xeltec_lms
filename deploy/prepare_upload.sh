#!/bin/bash
set -e

echo "Creating deployment package..."
tar -czf deploy/project.tar.gz \
    --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='.git' \
    --exclude='Generated_Courses' \
    --exclude='__pycache__' \
    --exclude='coverage' \
    --exclude='.DS_Store' \
    --exclude='sshkeys' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='*.pem' \
    --exclude='*.key' \
    --exclude='deploy/certbot' \
    --exclude='deploy/project.tar.gz' \
    --exclude='designs' \
    --exclude='lms-backend/uploads' \
    --exclude='lms-backend/dist' \
    --exclude='lms-frontend/dist' \
    --exclude='ui' \
    .

SIZE=$(du -sh deploy/project.tar.gz | cut -f1)
echo "Package created at deploy/project.tar.gz ($SIZE)"
