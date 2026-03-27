#!/bin/sh
set -e

# Ensure mounted volumes are writable by appuser
if [ "$(id -u)" = "0" ]; then
    chown -R appuser:appgroup /app/Generated_Courses 2>/dev/null || true
    exec gosu appuser "$@"
fi

exec "$@"
