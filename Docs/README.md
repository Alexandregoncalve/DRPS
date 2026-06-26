# NeXa DRPS

Diagnóstico de Riscos Psicossociais — NR-01

## Stack
- **Backend:** Node.js + Express
- **Frontend:** React + Vite + Tailwind
- **Banco:** PostgreSQL 18

## Estrutura
```
drps/
├── banco/          → Schemas e migrações SQL
├── backend/
│   └── src/
│       ├── server.js         → Inicialização
│       ├── calculo.js        → Motor NR-01
│       ├── routes/           → Rotas por domínio
│       └── middleware/       → Auth, rate limit, audit
└── frontend/
    └── src/
        ├── App.jsx           → Roteamento
        ├── contexts/         → AuthContext
        ├── components/       → UI reutilizável, Layout
        └── pages/            → Login, Formulario, gestor/, psicologo/
```

## Configuração

### 1. Banco
```sql
-- No pgAdmin, banco "drps":
\i banco/schema.sql
\i banco/migracao_fase0.sql
\i banco/migracao_fase1_perfis.sql
```

### 2. Backend
```bash
cd backend
npm install
# Copie .env.example para .env e preencha as variáveis
npm start
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Perfis de acesso
| Perfil | Acesso |
|---|---|
| `admin` | Tudo |
| `psicologo` | Suas empresas, avaliações, laudos |
| `gestor_matriz` | Dashboard da matriz + todas filiais (somente leitura) |
| `gestor_filial` | Dashboard da sua filial (somente leitura) |

## Variáveis de ambiente (backend/.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drps
DB_USER=postgres
DB_PASS=sua_senha
JWT_SECRET=gere_uma_chave_aleatoria
CRYPTO_KEY=gere_uma_chave_hex_64_chars
FRONTEND_URL=https://seu-dominio.com
PORT=3001
```
