#!/bin/sh
# Gera o env.js com a URL da API a partir da variável de ambiente API_URL
set -e
cat > /usr/share/nginx/html/env.js <<EOT
window.__env = { apiUrl: "${API_URL:-/api}" };
EOT
echo "env.js gerado com apiUrl=${API_URL:-/api}"
