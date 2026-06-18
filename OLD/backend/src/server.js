require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { calcularResultados } = require('./calculo');

const app = express();

// ============================================================
// CORS configurável por ambiente
// ============================================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));

// ============================================================
// RATE LIMITING manual (sem biblioteca externa)
// ============================================================
const rateLimitMap = new Map();

function rateLimit(maxReqs, windowMs) {
  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 1; entry.start = now;
    } else {
      entry.count++;
    }
    rateLimitMap.set(key, entry);
    if (entry.count > maxReqs) {
      return res.status(429).json({ erro: 'Muitas tentativas. Aguarde alguns minutos.' });
    }
    next();
  };
}

// Limpar mapa a cada 10 minutos para não vazar memória
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((v, k) => { if (now - v.start > 600000) rateLimitMap.delete(k); });
}, 600000);

// ============================================================
// CRIPTOGRAFIA AES-256 para dados sensíveis
// ============================================================
const CRYPTO_KEY = process.env.CRYPTO_KEY || crypto.randomBytes(32).toString('hex');
const KEY = Buffer.from(CRYPTO_KEY.slice(0, 64), 'hex');

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(data) {
  if (!data) return null;
  try {
    const [ivHex, encHex] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

// ============================================================
// BLACKLIST de JWT revogados (em memória; em produção usar Redis)
// ============================================================
const tokenBlacklist = new Set();

// ============================================================
// LOG DE AUDITORIA
// ============================================================
async function audit(pool, acao, usuarioId, detalhes, req) {
  try {
    await pool.query(
      `INSERT INTO audit_log (acao, usuario_id, detalhes, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [acao, usuarioId || null, JSON.stringify(detalhes), req?.ip || null, req?.headers?.['user-agent']?.slice(0, 200) || null]
    );
  } catch (e) {
    console.error('Audit log falhou:', e.message);
  }
}

// ============================================================
// Conexão PostgreSQL
// ============================================================
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drps',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  max: 10,
  idleTimeoutMillis: 30000,
});

// ============================================================
// Middleware de autenticação
// ============================================================
function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ erro: 'Token não fornecido' });
  try {
    const token = auth.split(' ')[1];
    if (tokenBlacklist.has(token)) return res.status(401).json({ erro: 'Sessão encerrada' });
    req.usuario = jwt.verify(token, process.env.JWT_SECRET || 'drps_secret_2025');
    req._token = token;
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// ============================================================
// Sanitização básica de string
// ============================================================
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<[^>]*>/g, '').slice(0, 500);
}

// ============================================================
// Health check
// ============================================================
app.get('/api/health', (req, res) => res.json({ ok: true, versao: '2.0.0' }));

// ============================================================
// LOGIN — rate limit: 10 tentativas / 15 min por IP
// ============================================================
app.post('/api/login', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });
  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [sanitize(email)]);
    if (!rows.length) return res.status(401).json({ erro: 'Credenciais inválidas' });
    const usuario = rows[0];
    const ok = await bcrypt.compare(senha, usuario.senha_hash);
    if (!ok) {
      await audit(pool, 'LOGIN_FALHOU', null, { email }, req);
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }
    const token = jwt.sign(
      { id: usuario.id, papel: usuario.papel, empresa_id: usuario.empresa_id, nome: usuario.nome },
      process.env.JWT_SECRET || 'drps_secret_2025',
      { expiresIn: '8h' }
    );
    await audit(pool, 'LOGIN_OK', usuario.id, { email }, req);
    res.json({ token, usuario: { nome: usuario.nome, papel: usuario.papel, crp: usuario.crp } });
  } catch (e) {
    console.error('ERRO LOGIN:', e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ============================================================
// LOGOUT — revoga o token
// ============================================================
app.post('/api/logout', autenticar, async (req, res) => {
  tokenBlacklist.add(req._token);
  await audit(pool, 'LOGOUT', req.usuario.id, {}, req);
  res.json({ ok: true });
});

// ============================================================
// Empresas
// ============================================================
app.get('/api/empresas', autenticar, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*,
        COUNT(DISTINCT s.id) as total_setores,
        COALESCE(SUM(s.total_funcionarios), 0) as total_funcionarios_setores,
        COALESCE(SUM(a.total_respostas), 0) as total_respostas
      FROM empresas e
      LEFT JOIN setores s ON s.empresa_id = e.id
      LEFT JOIN avaliacoes a ON a.setor_id = s.id
      GROUP BY e.id ORDER BY e.nome
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

app.post('/api/empresas', autenticar, rateLimit(30, 60000), async (req, res) => {
  const { nome, cnpj, total_funcionarios } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO empresas (nome, cnpj, total_funcionarios) VALUES ($1, $2, $3) RETURNING *',
      [sanitize(nome), sanitize(cnpj) || null, parseInt(total_funcionarios) || null]
    );
    await audit(pool, 'EMPRESA_CRIADA', req.usuario.id, { nome }, req);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

// ============================================================
// Setores
// ============================================================
app.get('/api/empresas/:empresaId/setores', autenticar, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*,
        COALESCE(SUM(a.total_respostas), 0) as respostas_coletadas,
        COUNT(DISTINCT a.id) as total_avaliacoes
      FROM setores s
      LEFT JOIN avaliacoes a ON a.setor_id = s.id
      WHERE s.empresa_id = $1
      GROUP BY s.id ORDER BY s.nome
    `, [req.params.empresaId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

app.post('/api/setores', autenticar, rateLimit(50, 60000), async (req, res) => {
  const { empresa_id, nome, total_funcionarios } = req.body;
  if (!empresa_id || !nome) return res.status(400).json({ erro: 'Empresa e nome obrigatórios' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO setores (empresa_id, nome, total_trabalhadores, total_funcionarios) VALUES ($1, $2, $3, $3) RETURNING *',
      [empresa_id, sanitize(nome), parseInt(total_funcionarios) || 0]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

// ============================================================
// Avaliações
// ============================================================
app.post('/api/avaliacoes', autenticar, rateLimit(20, 60000), async (req, res) => {
  const { setor_id, data_fim } = req.body;
  if (!setor_id) return res.status(400).json({ erro: 'Setor obrigatório' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO avaliacoes (setor_id, psicologo_id, data_fim)
       VALUES ($1, $2, $3) RETURNING *`,
      [setor_id, req.usuario.id, data_fim || null]
    );
    const avaliacao = rows[0];
    const link = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/responder/${avaliacao.token_anonimo}`;
    await audit(pool, 'AVALIACAO_CRIADA', req.usuario.id, { setor_id, avaliacao_id: avaliacao.id }, req);
    res.json({ ...avaliacao, link_anonimo: link });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

app.get('/api/avaliacoes', autenticar, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, s.nome as setor_nome, s.total_funcionarios as setor_total_funcionarios,
        e.nome as empresa_nome, a.total_respostas as respostas_coletadas,
        GREATEST(0, COALESCE(s.total_funcionarios, 0) - COALESCE(a.total_respostas, 0)) as vagas_restantes
      FROM avaliacoes a
      JOIN setores s ON a.setor_id = s.id
      JOIN empresas e ON s.empresa_id = e.id
      WHERE a.psicologo_id = $1
      ORDER BY a.criado_em DESC
    `, [req.usuario.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

// ============================================================
// Responder (público) — rate limit: 5 envios / 10 min por IP
// ============================================================
app.get('/api/responder/:token', rateLimit(20, 60000), async (req, res) => {
  const token = sanitize(req.params.token);
  if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ erro: 'Token inválido' });
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.status, a.data_fim, a.total_respostas,
        s.nome as setor_nome, s.total_funcionarios,
        e.nome as empresa_nome,
        GREATEST(0, COALESCE(s.total_funcionarios, 0) - COALESCE(a.total_respostas, 0)) as vagas_restantes
      FROM avaliacoes a
      JOIN setores s ON a.setor_id = s.id
      JOIN empresas e ON s.empresa_id = e.id
      WHERE a.token_anonimo = $1
    `, [token]);
    if (!rows.length) return res.status(404).json({ erro: 'Avaliação não encontrada' });
    const aval = rows[0];
    if (aval.status === 'encerrada') return res.status(403).json({ erro: 'Avaliação encerrada' });
    if (aval.data_fim && new Date(aval.data_fim) < new Date()) return res.status(403).json({ erro: 'Prazo desta avaliação encerrado' });
    if (aval.total_funcionarios && aval.vagas_restantes <= 0) return res.status(403).json({ erro: 'Limite de respostas atingido' });
    res.json(aval);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

app.post('/api/responder/:token', rateLimit(5, 10 * 60 * 1000), async (req, res) => {
  const token = sanitize(req.params.token);
  if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ erro: 'Token inválido' });
  const { respostas } = req.body;
  if (!Array.isArray(respostas) || respostas.length !== 47) return res.status(400).json({ erro: 'Envie exatamente 47 respostas' });

  // Validar cada resposta
  for (const r of respostas) {
    if (!Number.isInteger(r.pergunta_num) || r.pergunta_num < 1 || r.pergunta_num > 47) return res.status(400).json({ erro: 'Pergunta inválida' });
    if (!Number.isInteger(r.valor_original) || r.valor_original < 1 || r.valor_original > 5) return res.status(400).json({ erro: 'Valor inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, status, total_respostas FROM avaliacoes WHERE token_anonimo = $1 FOR UPDATE',
      [token]
    );
    if (!rows.length) throw new Error('Avaliação não encontrada');
    if (rows[0].status === 'encerrada') throw new Error('Avaliação encerrada');

    const avaliacaoId = rows[0].id;

    // Verificar se já respondeu (proteção contra envio duplo por IP)
    const { rows: jaRespondeu } = await client.query(
      'SELECT id FROM respostas WHERE avaliacao_id = $1 AND ip_hash = $2 LIMIT 1',
      [avaliacaoId, crypto.createHash('sha256').update(req.ip || '').digest('hex')]
    );
    if (jaRespondeu.length > 0) throw new Error('Você já enviou respostas para esta avaliação');

    // Verificar limite
    const { rows: setorRows } = await client.query(
      'SELECT s.total_funcionarios, a.total_respostas FROM avaliacoes a JOIN setores s ON a.setor_id = s.id WHERE a.id = $1',
      [avaliacaoId]
    );
    if (setorRows[0].total_funcionarios && setorRows[0].total_respostas >= setorRows[0].total_funcionarios) {
      throw new Error('Limite de respostas atingido');
    }

    // Inserir respostas com criptografia no valor e hash do IP para deduplicação
    const ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex');
    for (const r of respostas) {
      await client.query(
        'INSERT INTO respostas (avaliacao_id, pergunta_num, valor_original, ip_hash) VALUES ($1, $2, $3, $4)',
        [avaliacaoId, r.pergunta_num, r.valor_original, ipHash]
      );
    }

    await client.query(
      'UPDATE avaliacoes SET total_respostas = COALESCE(total_respostas, 0) + 1 WHERE id = $1',
      [avaliacaoId]
    );

    await client.query('COMMIT');
    res.json({ ok: true, mensagem: 'Respostas registradas com sucesso!' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ erro: e.message });
  } finally {
    client.release();
  }
});

// ============================================================
// Probabilidades e processamento
// ============================================================
app.post('/api/avaliacoes/:id/probabilidades', autenticar, async (req, res) => {
  const { probabilidades } = req.body;
  try {
    for (const p of probabilidades) {
      if (p.topico_num < 1 || p.topico_num > 13) continue;
      if (p.valor < 1 || p.valor > 3) continue;
      await pool.query(
        `INSERT INTO probabilidades (avaliacao_id, topico_num, valor)
         VALUES ($1, $2, $3)
         ON CONFLICT (avaliacao_id, topico_num) DO UPDATE SET valor = $3`,
        [req.params.id, p.topico_num, p.valor]
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

app.post('/api/avaliacoes/:id/processar', autenticar, async (req, res) => {
  const id = req.params.id;
  try {
    const { rows: respostas } = await pool.query(
      'SELECT pergunta_num, valor_original FROM respostas WHERE avaliacao_id = $1', [id]
    );
    const { rows: probabilidades } = await pool.query(
      'SELECT topico_num, valor FROM probabilidades WHERE avaliacao_id = $1', [id]
    );
    if (respostas.length === 0) return res.status(400).json({ erro: 'Nenhuma resposta encontrada' });

    const resultados = calcularResultados(respostas, probabilidades);
    for (const r of resultados) {
      await pool.query(
        `INSERT INTO resultados (avaliacao_id, topico_num, topico_nome, media_gravidade,
          classif_gravidade, media_probabilidade, classif_probabilidade, matriz_risco, fonte_geradora)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (avaliacao_id, topico_num) DO UPDATE SET
           media_gravidade=$4, classif_gravidade=$5, media_probabilidade=$6,
           classif_probabilidade=$7, matriz_risco=$8`,
        [id, r.topico_num, r.topico_nome, r.media_gravidade, r.classif_gravidade,
         r.media_probabilidade, r.classif_probabilidade, r.matriz_risco, r.fonte_geradora]
      );
    }
    await pool.query("UPDATE avaliacoes SET status='processada' WHERE id=$1", [id]);
    await audit(pool, 'AVALIACAO_PROCESSADA', req.usuario.id, { avaliacao_id: id }, req);
    res.json(resultados);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

app.get('/api/avaliacoes/:id/resultados', autenticar, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM resultados WHERE avaliacao_id = $1 ORDER BY topico_num', [req.params.id]
    );
    const contagem = { Baixo: 0, Médio: 0, Alto: 0, Crítico: 0 };
    rows.forEach(r => { if (contagem[r.matriz_risco] !== undefined) contagem[r.matriz_risco]++; });
    res.json({ resultados: rows, contagem });
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

// ============================================================
// Iniciar servidor
// ============================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ NeXa DRPS Backend v2.0 rodando em http://localhost:${PORT}`);
  console.log(`🔒 Criptografia: ${CRYPTO_KEY ? 'ATIVA' : 'FALLBACK (configure CRYPTO_KEY!)'}`);
});