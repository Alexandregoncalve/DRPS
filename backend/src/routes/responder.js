const express = require('express');
const crypto = require('crypto');
const { rateLimit } = require('../middleware/rateLimit');
const { sanitize } = require('../middleware/crypto');
const { calcularResultados } = require('../calculo');

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/responder/:token — token pode ser token_anonimo da avaliação OU token_unico do colaborador
  router.get('/:token', rateLimit(20, 60000), async (req, res) => {
    const token = sanitize(req.params.token);
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ erro: 'Token inválido' });
    try {
      // Tenta primeiro pelo token_unico do colaborador
      const { rows: colabRows } = await pool.query(`
        SELECT c.avaliacao_id, c.respondeu, c.expira_em
        FROM colaboradores c WHERE c.token_unico = $1
      `, [token]);

      let avaliacaoToken = token;
      if (colabRows.length > 0) {
        if (colabRows[0].respondeu) return res.status(403).json({ erro: 'jaRespondido', mensagem: 'Este link já foi utilizado.' });
        if (colabRows[0].expira_em && new Date(colabRows[0].expira_em) < new Date())
          return res.status(403).json({ erro: 'linkExpirado', mensagem: 'Link expirado. Solicite um novo ao responsável.' });
        const { rows: avalRows } = await pool.query(
          'SELECT token_anonimo FROM avaliacoes WHERE id=$1', [colabRows[0].avaliacao_id]
        );
        if (avalRows.length > 0) avaliacaoToken = avalRows[0].token_anonimo;
      }

      const { rows } = await pool.query(`
        SELECT a.id, a.status, a.data_fim, a.total_respostas,
          s.nome as setor_nome, s.total_funcionarios,
          e.nome as empresa_nome,
          GREATEST(0, COALESCE(s.total_funcionarios,0) - COALESCE(a.total_respostas,0)) as vagas_restantes
        FROM avaliacoes a
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        WHERE a.token_anonimo = $1
      `, [avaliacaoToken]);
      if (!rows.length) return res.status(404).json({ erro: 'Avaliação não encontrada' });
      const aval = rows[0];
      if (aval.status === 'encerrada') return res.status(403).json({ erro: 'Avaliação encerrada' });
      if (aval.data_fim && new Date(aval.data_fim) < new Date()) return res.status(403).json({ erro: 'Prazo encerrado' });
      if (aval.total_funcionarios && aval.vagas_restantes <= 0) return res.status(403).json({ erro: 'Limite atingido' });
      // Passa o token original para o POST usar na marcação do colaborador
      res.json({ ...aval, _token_original: token });
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // POST /api/responder/:token
  router.post('/:token', rateLimit(5, 10 * 60 * 1000), async (req, res) => {
    const token = sanitize(req.params.token);
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ erro: 'Token inválido' });
    const { respostas } = req.body;
    if (!Array.isArray(respostas) || respostas.length !== 52)
      return res.status(400).json({ erro: 'Envie exatamente 52 respostas' });
    for (const r of respostas) {
      if (!Number.isInteger(r.pergunta_num) || r.pergunta_num < 1 || r.pergunta_num > 52)
        return res.status(400).json({ erro: 'Pergunta inválida' });
      if (!Number.isInteger(r.valor_original) || r.valor_original < 1 || r.valor_original > 5)
        return res.status(400).json({ erro: 'Valor inválido' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Resolve token — pode ser token_unico do colaborador ou token_anonimo da avaliação
      let avaliacaoToken = token;
      const { rows: colabRows } = await client.query(
        'SELECT avaliacao_id, respondeu FROM colaboradores WHERE token_unico=$1', [token]
      );
      if (colabRows.length > 0) {
        if (colabRows[0].respondeu) throw new Error('Este link já foi utilizado.');
        const { rows: avalRows } = await client.query(
          'SELECT token_anonimo FROM avaliacoes WHERE id=$1', [colabRows[0].avaliacao_id]
        );
        if (avalRows.length > 0) avaliacaoToken = avalRows[0].token_anonimo;
      }

      const { rows } = await client.query(
        'SELECT id, status, total_respostas FROM avaliacoes WHERE token_anonimo=$1 FOR UPDATE', [avaliacaoToken]
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

      // Marca colaborador correto como respondeu — pelo token_unico enviado no link
      await client.query(
        `UPDATE colaboradores SET respondeu=true WHERE token_unico=$1`,
        [token]
      );

      // Se atingiu 100% das respostas esperadas, muda status para 'coletada'
      const { rows: checkRows } = await client.query(
        'SELECT a.total_respostas, s.total_funcionarios FROM avaliacoes a JOIN setores s ON a.setor_id=s.id WHERE a.id=$1',
        [avaliacaoId]
      );
      if (checkRows[0]?.total_funcionarios && checkRows[0]?.total_respostas >= checkRows[0]?.total_funcionarios) {
        await client.query("UPDATE avaliacoes SET status='coletada' WHERE id=$1 AND status='aberta'", [avaliacaoId]);
      }

      await client.query('COMMIT');

      // ── PROCESSAMENTO AUTOMÁTICO ──────────────────────────────────────────
      try {
        const { rows: respostasAval } = await pool.query(
          'SELECT pergunta_num, valor_original FROM respostas WHERE avaliacao_id=$1',
          [avaliacaoId]
        );
        const { rows: probabilidades } = await pool.query(
          'SELECT topico_num, valor FROM probabilidades WHERE avaliacao_id=$1',
          [avaliacaoId]
        );
        if (respostasAval.length > 0) {
          // Usa probabilidade 2 (Média) como padrão quando não definida
          const probComDefault = Array.from({length:13},(_,i)=>({
            topico_num: i+1,
            valor: probabilidades.find(p=>p.topico_num===i+1)?.valor || 2
          }));
          const resultados = calcularResultados(respostasAval, probComDefault);
          for (const r of resultados) {
            await pool.query(
              `INSERT INTO resultados
                (avaliacao_id, topico_num, topico_nome, media_gravidade, classif_gravidade,
                 media_probabilidade, classif_probabilidade, matriz_risco, fonte_geradora)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
               ON CONFLICT (avaliacao_id, topico_num) DO UPDATE SET
                 media_gravidade=$4, classif_gravidade=$5, media_probabilidade=$6,
                 classif_probabilidade=$7, matriz_risco=$8, fonte_geradora=$9`,
              [avaliacaoId, r.topico_num, r.topico_nome, r.media_gravidade, r.classif_gravidade,
               r.media_probabilidade, r.classif_probabilidade, r.matriz_risco, r.fonte_geradora]
            );
          }
          await pool.query(
            "UPDATE avaliacoes SET status='processada' WHERE id=$1", [avaliacaoId]
          );
          console.log(`[auto-processar] ${avaliacaoId} processada`);
        }
      } catch (procErr) {
        console.error('[auto-processar]', procErr.message);
      }

      res.json({ ok: true, mensagem: 'Respostas registradas com sucesso!' });
    } catch (e) {
      await client.query('ROLLBACK');
      res.status(400).json({ erro: e.message });
    } finally { client.release(); }
  });

  return router;
};