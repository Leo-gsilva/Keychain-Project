// Configuração em tempo de execução. No Docker este arquivo é substituído na subida do container
// (frontend/docker/gerar-env.sh) por: window.__env = { apiUrl: "/api" };
// Vazio aqui: rodando com ng serve, o environment.ts usa http://localhost:5432
window.__env = {};
