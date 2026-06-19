const express = require('express');
const crypto = require('crypto');
const { rateLimit } = require('../middleware/rateLimit');
const { sanitize } = require('../middleware/crypto');

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/responder/:token
  router.get('/:token', rateLimit(20, 60000), async (req, res) => {
    const token = sanitize(req.params.token);
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ erro: 'Token inválido' });
    try {
      const { rows } = await pool.query(`
        SELECT a.id, a.status, a.data_fim, a.total_respostas,
          s.nome as setor_nome, s.total_funcionarios,
          e.nome as empresa_nome,
          GREATEST(0, COALESCE(s.total_funcionarios,0) - COALESCE(a.total_respostas,0)) as vagas_restantes
        FROM avaliacoes a
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        WHERE a.token_anonimo = $1
      `, [token]);
      if (!rows.length) return res.status(404).json({ erro: 'Avaliação não encontrada' });
      const aval = rows[0];
      if (aval.status === 'encerrada') return res.status(403).json({ erro: 'Avaliação encerrada' });
      if (aval.data_fim && new Date(aval.data_fim) < new Date()) return res.status(403).json({ erro: 'Prazo encerrado' });
      if (aval.total_funcionarios && aval.vagas_restantes <= 0) return res.status(403).json({ erro: 'Limite atingido' });
      res.json(aval);
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // POST /api/responder/:token
  router.post('/:token', rateLimit(5, 10 * 60 * 1000), async (req, res) => {
    const token = sanitize(req.params.token);
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ erro: 'Token inválido' });
    const { respostas } = req.body;
    if (!Array.isArray(respostas) || respostas.length !== 47)
      return res.status(400).json({ erro: 'Envie exatamente 47 respostas' });
    for (const r of respostas) {
      if (!Number.isInteger(r.pergunta_num) || r.pergunta_num < 1 || r.pergunta_num > 47)
        return res.status(400).json({ erro: 'Pergunta inválida' });
      if (!Number.isInteger(r.valor_original) || r.valor_original < 1 || r.valor_original > 5)
        return res.status(400).json({ erro: 'Valor inválido' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT id, status, total_respostas FROM avaliacoes WHERE token_anonimo=$1 FOR UPDATE', [token]
      );
      if (!rows.length) throw new Error('Avaliação não encontrada');
      if (rows[0].status === 'encerrada') throw new Error('Avaliação encerrada');
      const avaliacaoId = rows[0].id;

      // Fingerprint: IP + user-agent + idioma do navegador (não bloqueia colegas na mesma rede Wi-Fi)
      const userAgent = req.headers['user-agent'] || '';
      const idioma = req.headers['accept-language'] || '';
      const fingerprintBase = `${req.ip || ''}|${userAgent}|${idioma}`;
      const ipHash = crypto.createHash('sha256').update(fingerprintBase).digest('hex');

      const { rows: jaResp } = await client.query(
        'SELECT id FROM respostas WHERE avaliacao_id=$1 AND ip_hash=$2 LIMIT 1', [avaliacaoId, ipHash]
      );
      if (jaResp.length > 0) throw new Error('Este dispositivo já respondeu esta avaliação. Se você compartilha o computador/celular com um colega, peça para ele usar o próprio aparelho.');
      const { rows: setorRows } = await client.query(
        'SELECT s.total_funcionarios, a.total_respostas FROM avaliacoes a JOIN setores s ON a.setor_id=s.id WHERE a.id=$1', [avaliacaoId]
      );
      if (setorRows[0].total_funcionarios && setorRows[0].total_respostas >= setorRows[0].total_funcionarios)
        throw new Error('Limite de respostas atingido');
      for (const r of respostas) {
        await client.query(
          'INSERT INTO respostas (avaliacao_id, pergunta_num, valor_original, ip_hash) VALUES ($1,$2,$3,$4)',
          [avaliacaoId, r.pergunta_num, r.valor_original, ipHash]
        );
      }
      await client.query('UPDATE avaliacoes SET total_respostas=COALESCE(total_respostas,0)+1 WHERE id=$1', [avaliacaoId]);
      await client.query('COMMIT');
      res.json({ ok: true, mensagem: 'Respostas registradas com sucesso!' });
    } catch (e) {
      await client.query('ROLLBACK');
      res.status(400).json({ erro: e.message });
    } finally { client.release(); }
  });

  return router;
};