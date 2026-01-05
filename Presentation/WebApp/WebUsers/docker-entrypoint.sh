#!/bin/sh
# Entry point to write runtime env config for the SPA
# This allows injecting VITE_API_URL at container start (from docker-compose env)

set -e

TARGET="/usr/share/nginx/html/env-config.js"

cat > "$TARGET" <<EOF
window.__ENV = {
  VITE_API_URL: "${VITE_API_URL:-/api}"
};
EOF

echo "[entrypoint] Wrote runtime config to $TARGET (VITE_API_URL=${VITE_API_URL:-/api})"

# Start nginx (keep foreground)
exec nginx -g 'daemon off;'
