require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:8080', credentials: true }));
app.use(express.json({ limit: '100kb' }));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drps',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  max: 10,
  idleTimeoutMillis: 30000,
});

app.get('/api/health', (req, res) => res.json({ ok: true, versao: '2.1.0' }));
app.use('/api/auth',       require('./routes/auth')(pool));
app.use('/api/empresas',   require('./routes/empresas')(pool));
app.use('/api/avaliacoes', require('./routes/avaliacoes')(pool));
app.use('/api/responder',  require('./routes/responder')(pool));
app.use('/api/usuarios',   require('./routes/usuarios')(pool));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ NeXa DRPS Backend v2.1 rodando em http://localhost:${PORT}`);
  console.log(`🔒 Criptografia: ${process.env.CRYPTO_KEY ? 'ATIVA' : 'FALLBACK'}`);
});
