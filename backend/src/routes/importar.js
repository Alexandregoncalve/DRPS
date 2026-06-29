// routes/importar.js
// POST /api/importar — fluxo completo: Excel → setores → avaliações → WhatsApp

const express = require('express');
const { autenticar, exigirPapel } = require('../middleware/autenticar');
const { sanitize } = require('../middleware/crypto');
const crypto = require('crypto');

const EVOLUTION_URL      = process.env.EVOLUTION_URL      || 'http://localhost:8081';
const EVOLUTION_KEY      = process.env.EVOLUTION_KEY      || 'drps2025';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'drps-whatsapp';
const FRONTEND_URL       = process.env.FRONTEND_URL       || 'http://localhost:8080';

async function enviarWhatsApp(telefone, mensagem) {
  try {
    const numero = telefone.replace(/\D/g, '');
    const numeroFull = numero.startsWith('55') ? numero : `55${numero}`;
    const resp = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: numeroFull, text: mensagem }),
    });
    return { ok: resp.ok, data: await resp.json() };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
}

module.exports = (pool) => {
  const router = express.Router();

  // POST /api/importar
  // Body: {
  //   empresa_id: UUID,           ← empresa já cadastrada
  //   colaboradores: [{telefone, setor}],
  //   dias_expiracao: 10,
  //   data_fim: '2026-07-10',     ← opcional
  //   mensagem_custom: ''         ← opcional
  // }
  router.post('/', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { empresa_id, colaboradores, dias_expiracao = 10, data_fim, mensagem_custom } = req.body;

    if (!empresa_id) return res.status(400).json({ erro: 'Empresa obrigatória' });
    if (!Array.isArray(colaboradores) || colaboradores.length === 0)
      return res.status(400).json({ erro: 'Lista de colaboradores vazia' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca empresa
      const { rows: [empresa] } = await client.query(
        'SELECT * FROM empresas WHERE id = $1', [empresa_id]
      );
      if (!empresa) throw new Error('Empresa não encontrada');

      // 2. Agrupa colaboradores por setor
      const porSetor = {};
      colaboradores.forEach(c => {
        const setor = sanitize(c.setor || 'Geral').trim();
        const tel = String(c.telefone || '').replace(/\D/g, '');
        if (tel.length < 10) return;
        if (!porSetor[setor]) porSetor[setor] = [];
        porSetor[setor].push(tel);
      });

      if (Object.keys(porSetor).length === 0)
        throw new Error('Nenhum colaborador válido encontrado');

      const expira = new Date();
      expira.setDate(expira.getDate() + parseInt(dias_expiracao));

      const resultados = [];
      let totalEnviados = 0;
      let totalErros = 0;

      // 3. Para cada setor: cria setor + avaliação + colaboradores + envia WhatsApp
      for (const [nomeSetor, telefones] of Object.entries(porSetor)) {

        // 3a. Cria ou reutiliza setor
        let setorId;
        const { rows: setoresExist } = await client.query(
          'SELECT id FROM setores WHERE empresa_id=$1 AND LOWER(nome)=LOWER($2)',
          [empresa_id, nomeSetor]
        );
        if (setoresExist.length > 0) {
          setorId = setoresExist[0].id;
          // Atualiza total de funcionários
          await client.query(
            'UPDATE setores SET total_funcionarios=$1 WHERE id=$2',
            [telefones.length, setorId]
          );
        } else {
          const { rows: [novoSetor] } = await client.query(
            `INSERT INTO setores (empresa_id, nome, total_funcionarios, total_trabalhadores)
             VALUES ($1,$2,$3,$3) RETURNING id`,
            [empresa_id, nomeSetor, telefones.length]
          );
          setorId = novoSetor.id;
        }

        // 3b. Cria avaliação para o setor
        const dataFimAval = data_fim || expira.toISOString().slice(0,10);
        const { rows: [aval] } = await client.query(
          `INSERT INTO avaliacoes (setor_id, psicologo_id, data_fim)
           VALUES ($1,$2,$3) RETURNING *`,
          [setorId, req.usuario.id, dataFimAval]
        );

        // 3c. Para cada telefone: gera token + salva colaborador + envia WhatsApp
        for (const telefone of telefones) {
          const token = crypto.randomBytes(32).toString('hex');

          await client.query(
            `INSERT INTO colaboradores (avaliacao_id, telefone, setor, token_unico, expira_em)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
            [aval.id, telefone, nomeSetor, token, expira]
          );

          // Monta mensagem
          const link = `${FRONTEND_URL}/responder/${token}`;
          const msg = mensagem_custom
            ? mensagem_custom.replace('{link}', link).replace('{empresa}', empresa.nome)
            : `Olá! 👋\n\n*${empresa.nome}* convida você a participar de uma avaliação anônima de saúde no trabalho.\n\n⏱️ Leva apenas 5 minutos\n🔒 Suas respostas são totalmente anônimas\n📅 Prazo: ${expira.toLocaleDateString('pt-BR')}\n\n👉 Acesse aqui:\n${link}\n\n_Este link é pessoal e de uso único._`;

          // Envia WhatsApp (fora da transação para não bloquear)
          await client.query('SAVEPOINT antes_envio');
          try {
            const resultado = await enviarWhatsApp(telefone, msg);
            if (resultado.ok) {
              await client.query(
                `UPDATE colaboradores SET enviado=true, enviado_em=NOW() WHERE token_unico=$1`,
                [token]
              );
              totalEnviados++;
              resultados.push({ telefone, setor: nomeSetor, status: 'enviado' });
            } else {
              totalErros++;
              resultados.push({ telefone, setor: nomeSetor, status: 'erro_whatsapp' });
            }
          } catch(e) {
            totalErros++;
            resultados.push({ telefone, setor: nomeSetor, status: 'erro', detalhe: e.message });
          }

          // Delay entre envios
          await new Promise(r => setTimeout(r, 800));
        }

        resultados.push({
          setor: nomeSetor,
          avaliacao_id: aval.id,
          token_anonimo: aval.token_anonimo,
          total: telefones.length,
        });
      }

      await client.query('COMMIT');

      res.json({
        ok: true,
        empresa: empresa.nome,
        setores_criados: Object.keys(porSetor).length,
        total_colaboradores: colaboradores.length,
        enviados: totalEnviados,
        erros: totalErros,
        resultados,
      });

    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[importar]', e);
      res.status(500).json({ erro: e.message });
    } finally {
      client.release();
    }
  });

  return router;
};