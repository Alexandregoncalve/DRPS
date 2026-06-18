# DRPS — Guia de Instalação (Windows)

## O que você vai ter ao final
- Sistema rodando na sua máquina
- Colaboradores acessam pelo link do ngrok (internet)
- Psicólogo faz login e vê os resultados

---

## PASSO 1 — Criar o banco de dados PostgreSQL

Abra o pgAdmin (instalado com o PostgreSQL) ou o terminal e execute:

```sql
-- No pgAdmin: clique com botão direito em "Databases" > "Create" > "Database"
-- Nome: drps
```

Ou pelo terminal (CMD):
```
psql -U postgres
CREATE DATABASE drps;
\q
```

Depois, execute o arquivo de schema:
```
psql -U postgres -d drps -f C:\drps\banco\schema.sql
```

---

## PASSO 2 — Configurar e iniciar o Backend

Abra o CMD ou PowerShell e execute:

```
cd C:\drps\backend
npm install
```

Edite o arquivo `.env` com a senha do seu PostgreSQL:
```
DB_PASS=sua_senha_do_postgres
```

Inicie o backend:
```
npm start
```

Você deve ver:
```
✅ DRPS Backend rodando em http://localhost:3001
```

Teste abrindo no navegador: http://localhost:3001/api/health
Deve aparecer: {"ok":true,"versao":"1.0.0"}

---

## PASSO 3 — Configurar e iniciar o Frontend

Abra outro CMD (deixe o backend rodando) e execute:

```
cd C:\drps\frontend
npm install
npm run dev
```

Você deve ver:
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Acesse http://localhost:5173 no navegador.

Login de teste:
- E-mail: psi@drps.com
- Senha: drps@2025

---

## PASSO 4 — Expor para a internet com ngrok

Abra um terceiro CMD e execute:

```
ngrok http 5173
```

O ngrok vai mostrar algo como:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:5173
```

Essa URL (https://abc123.ngrok-free.app) é o link que você envia para colaboradores.

IMPORTANTE: Atualize o .env do backend com a URL do ngrok:
```
FRONTEND_URL=https://abc123.ngrok-free.app
```

E reinicie o backend (Ctrl+C e npm start novamente).

---

## PASSO 5 — Fluxo de uso

1. Psicólogo faz login em http://localhost:5173 (ou pela URL do ngrok)
2. Cadastra a empresa e os setores
3. Cria uma avaliação → sistema gera um link anônimo
4. Envia o link para os colaboradores do setor
5. Colaboradores respondem as 47 perguntas pelo celular ou computador
6. Psicólogo acessa "Ver resultados", define a probabilidade por tópico
7. Clica em "Processar" → sistema calcula a matriz de risco NR-01

---

## Estrutura de arquivos

```
C:\drps\
├── banco\
│   └── schema.sql          ← Executar no PostgreSQL
├── backend\
│   ├── src\
│   │   ├── server.js       ← API Express
│   │   └── calculo.js      ← Motor NR-01
│   ├── .env                ← Configurações (senha do banco)
│   └── package.json
└── frontend\
    ├── src\
    │   ├── App.jsx         ← Toda a interface
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

---

## Problemas comuns

**"Cannot connect to database"**
→ Verifique se o PostgreSQL está rodando e se a senha no .env está correta

**"npm não é reconhecido"**
→ Reinstale o Node.js de https://nodejs.org e marque "Add to PATH"

**Ngrok pede autenticação**
→ Crie conta gratuita em https://ngrok.com e execute: ngrok config add-authtoken SEU_TOKEN

**Frontend não aparece no ngrok**
→ Certifique-se que o Vite está rodando (npm run dev) antes de iniciar o ngrok
