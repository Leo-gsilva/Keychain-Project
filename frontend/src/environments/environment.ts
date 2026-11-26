// Em produção (Docker) a URL vem do env.js gerado na subida do container (frontend/docker/gerar-env.sh).
// Rodando local (ng serve), o public/env.js vem vazio e cai no localhost.
const env = (window as { __env?: { apiUrl?: string } }).__env ?? {};

export const environment = {
    production: true,
    apiUrl: env.apiUrl ?? 'http://localhost:5432'
}
