require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { Pool }   = require('pg');

const app = express();
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '500kb' })); // 500kb para uploads de logo base64

// ── Rate limiting global ──────────────────────────────────────────────────────
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // max 10 tentativas de login por 15min
  message: { erro: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

app.use(limiterGlobal);

// ── Pool PostgreSQL ───────────────────────────────────────────────────────────
const pool = new Pool({
  host:             process.env.DB_HOST     || 'localhost',
  port:             process.env.DB_PORT     || 5432,
  database:         process.env.DB_NAME     || 'drps',
  user:             process.env.DB_USER     || 'postgres',
  password:         process.env.DB_PASS     || '',
  max:              10,
  idleTimeoutMillis: 30000,
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, versao: '3.0.0' }));

// ── Limpeza periódica de JWT blacklist expirados (a cada hora) ────────────────
setInterval(async () => {
  try {
    const r = await pool.query(
      `DELETE FROM jwt_blacklist WHERE expira_em < NOW()`
    );
    if (r.rowCount > 0) {
      console.log(`[jwt_blacklist] ${r.rowCount} tokens expirados removidos`);
    }
  } catch (err) {
    console.error('[jwt_blacklist cleanup]', err.message);
  }
}, 60 * 60 * 1000);

// ── Rotas existentes ──────────────────────────────────────────────────────────
app.use('/api/auth',         limiterLogin, require('./routes/auth')(pool));
app.use('/api/organizacoes',              require('./routes/organizacoes')(pool));
app.use('/api/empresas',                  require('./routes/empresas')(pool));
app.use('/api/avaliacoes',                require('./routes/avaliacoes')(pool));
app.use('/api/responder',                 require('./routes/responder')(pool));
app.use('/api/usuarios',                  require('./routes/usuarios')(pool));
app.use('/api/laudo',      require('./routes/laudo')(pool));
app.use('/api/relatorio',     require('./routes/relatorio')(pool));
app.use('/api/colaboradores', require('./routes/colaboradores')(pool));
app.use('/api/importar',      require('./routes/importar')(pool));


// ── Rotas Super Admin ─────────────────────────────────────────────────────────
app.use('/api/superadmin/auth',       limiterLogin, require('./routes/superadmin/auth')(pool));
app.use('/api/superadmin/dashboard',               require('./routes/superadmin/dashboard')(pool));
app.use('/api/superadmin/psicologos',              require('./routes/superadmin/psicologos')(pool));
app.use('/api/superadmin/empresas',                require('./routes/superadmin/empresas')(pool));
app.use('/api/superadmin/auditoria',               require('./routes/superadmin/auditoria')(pool));

// ── Handler de erros globais ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[erro global]', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ NeXa DRPS Backend v3.0 rodando em http://localhost:${PORT}`);
  console.log(`🔒 Criptografia: ${process.env.CRYPTO_KEY ? 'ATIVA' : 'FALLBACK'}`);
  console.log(`🛡️  Rate limiting: ATIVO`);
  console.log(`👑 Super Admin: /api/superadmin/*`);
});