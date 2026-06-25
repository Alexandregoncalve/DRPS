// routes/relatorio.js
// Rotas: GET/POST /api/relatorio/:avaliacao_id
//        GET/POST /api/relatorio/:avaliacao_id/controles

const express = require('express');
const { autenticar, exigirPapel } = require('../middleware/autenticar');

module.exports = (pool) => {
  const router = express.Router();

  // ── GET /api/relatorio/:avaliacao_id ─────────────────────────────────────
  router.get('/:avaliacao_id', autenticar, async (req, res) => {
    try {
      const { avaliacao_id } = req.params;

      // Verifica acesso
      await verificarAcesso(pool, avaliacao_id, req.usuario);

      const r = await pool.query(
        'SELECT * FROM config_relatorio WHERE avaliacao_id = $1',
        [avaliacao_id]
      );

      // Se não existe ainda, retorna defaults com dados da avaliação
      if (!r.rows.length) {
        const aval = await pool.query(`
          SELECT a.*, s.nome as setor_nome, e.nome as empresa_nome, e.cnpj,
                 e.total_funcionarios,
                 u.nome as psicologo_nome, u.crp as psicologo_crp
          FROM avaliacoes a
          JOIN setores  s ON s.id = a.setor_id
          JOIN empresas e ON e.id = s.empresa_id
          JOIN usuarios u ON u.id = a.psicologo_id
          WHERE a.id = $1
        `, [avaliacao_id]);

        if (!aval.rows.length) return res.status(404).json({ erro: 'Avaliação não encontrada' });
        const av = aval.rows[0];

        return res.json({
          avaliacao_id,
          nome_empresa:         av.empresa_nome,
          cnpj:                 av.cnpj || '',
          total_colaboradores:  av.total_funcionarios || null,
          responsavel_nome:     av.psicologo_nome || '',
          responsavel_registro: av.psicologo_crp  || '',
          responsavel_cargo:    'Psicólogo(a)',
          taxa_adesao_minima:   60,
          aplicar_meta_adesao:  true,
          limiar_aiha:          'padrao',
          cor_laudo:            '#FF8317',
          titulo_tecnico:       'DRPS',
          incluir_plano_acao:   true,
          // campos vazios
          logo_empresa: null, setor_economico: '', descricao_atividades: '',
          periodo_avaliacao: '', titulo_personalizado: '',
          absenteismo_pct: null, afastamentos_cidf_pct: null,
          turnover_pct: null, horas_perdidas: null,
        });
      }

      res.json(r.rows[0]);
    } catch (err) {
      console.error('[relatorio GET]', err);
      res.status(err.status || 500).json({ erro: err.message || 'Erro interno' });
    }
  });

  // ── POST /api/relatorio/:avaliacao_id ────────────────────────────────────
  router.post('/:avaliacao_id', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    try {
      const { avaliacao_id } = req.params;
      await verificarAcesso(pool, avaliacao_id, req.usuario);

      const {
        logo_empresa, nome_empresa, cnpj, setor_economico, descricao_atividades,
        responsavel_nome, responsavel_cargo, responsavel_registro, periodo_avaliacao,
        total_colaboradores, taxa_adesao_minima, aplicar_meta_adesao,
        absenteismo_pct, afastamentos_cidf_pct, turnover_pct, horas_perdidas,
        limiar_aiha, cor_laudo, titulo_tecnico, titulo_personalizado, incluir_plano_acao,
      } = req.body;

      // Valida tamanho do logo (max ~500KB em base64 ≈ ~680KB string)
      if (logo_empresa && logo_empresa.length > 700000) {
        return res.status(400).json({ erro: 'Logo muito grande. Máximo 500KB.' });
      }

      const r = await pool.query(`
        INSERT INTO config_relatorio (
          avaliacao_id, logo_empresa, nome_empresa, cnpj, setor_economico, descricao_atividades,
          responsavel_nome, responsavel_cargo, responsavel_registro, periodo_avaliacao,
          total_colaboradores, taxa_adesao_minima, aplicar_meta_adesao,
          absenteismo_pct, afastamentos_cidf_pct, turnover_pct, horas_perdidas,
          limiar_aiha, cor_laudo, titulo_tecnico, titulo_personalizado, incluir_plano_acao,
          atualizado_em
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NOW())
        ON CONFLICT (avaliacao_id) DO UPDATE SET
          logo_empresa=$2, nome_empresa=$3, cnpj=$4, setor_economico=$5,
          descricao_atividades=$6, responsavel_nome=$7, responsavel_cargo=$8,
          responsavel_registro=$9, periodo_avaliacao=$10, total_colaboradores=$11,
          taxa_adesao_minima=$12, aplicar_meta_adesao=$13, absenteismo_pct=$14,
          afastamentos_cidf_pct=$15, turnover_pct=$16, horas_perdidas=$17,
          limiar_aiha=$18, cor_laudo=$19, titulo_tecnico=$20, titulo_personalizado=$21,
          incluir_plano_acao=$22, atualizado_em=NOW()
        RETURNING *
      `, [
        avaliacao_id, logo_empresa || null, nome_empresa || null, cnpj || null,
        setor_economico || null, descricao_atividades || null,
        responsavel_nome || null, responsavel_cargo || null, responsavel_registro || null,
        periodo_avaliacao || null, total_colaboradores || null,
        taxa_adesao_minima ?? 60, aplicar_meta_adesao ?? true,
        absenteismo_pct || null, afastamentos_cidf_pct || null,
        turnover_pct || null, horas_perdidas || null,
        limiar_aiha || 'padrao', cor_laudo || '#FF8317',
        titulo_tecnico || 'DRPS', titulo_personalizado || null,
        incluir_plano_acao ?? true,
      ]);

      res.json(r.rows[0]);
    } catch (err) {
      console.error('[relatorio POST]', err);
      res.status(err.status || 500).json({ erro: err.message || 'Erro interno' });
    }
  });

  // ── GET /api/relatorio/:avaliacao_id/controles ───────────────────────────
  router.get('/:avaliacao_id/controles', autenticar, async (req, res) => {
    try {
      await verificarAcesso(pool, req.params.avaliacao_id, req.usuario);
      const r = await pool.query(
        'SELECT * FROM controles_implantados WHERE avaliacao_id = $1 ORDER BY categoria, nome',
        [req.params.avaliacao_id]
      );
      res.json(r.rows);
    } catch (err) {
      console.error('[controles GET]', err);
      res.status(err.status || 500).json({ erro: err.message || 'Erro interno' });
    }
  });

  // ── POST /api/relatorio/:avaliacao_id/controles ──────────────────────────
  // Recebe array com todos os controles marcados (substitui tudo)
  router.post('/:avaliacao_id/controles', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    try {
      const { avaliacao_id } = req.params;
      await verificarAcesso(pool, avaliacao_id, req.usuario);

      const { controles } = req.body; // [{ categoria, codigo, nome, descricao, personalizado }]
      if (!Array.isArray(controles)) return res.status(400).json({ erro: 'controles deve ser array' });

      // Apaga os existentes e reinsere
      await pool.query('DELETE FROM controles_implantados WHERE avaliacao_id = $1', [avaliacao_id]);

      for (const c of controles) {
        if (!c.categoria || !c.codigo || !c.nome) continue;
        await pool.query(`
          INSERT INTO controles_implantados (avaliacao_id, categoria, codigo, nome, descricao, personalizado)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (avaliacao_id, codigo) DO NOTHING
        `, [avaliacao_id, c.categoria, c.codigo, c.nome, c.descricao || null, c.personalizado || false]);
      }

      const r = await pool.query(
        'SELECT * FROM controles_implantados WHERE avaliacao_id = $1 ORDER BY categoria, nome',
        [avaliacao_id]
      );
      res.json(r.rows);
    } catch (err) {
      console.error('[controles POST]', err);
      res.status(err.status || 500).json({ erro: err.message || 'Erro interno' });
    }
  });

  // ── Helper: verifica se o usuário tem acesso à avaliação ─────────────────
  async function verificarAcesso(pool, avaliacao_id, usuario) {
    const r = await pool.query(
      'SELECT psicologo_id FROM avaliacoes WHERE id = $1', [avaliacao_id]
    );
    if (!r.rows.length) {
      const err = new Error('Avaliação não encontrada'); err.status = 404; throw err;
    }
    if (usuario.papel === 'admin') return; // admin vê tudo
    if (usuario.papel === 'psicologo' && r.rows[0].psicologo_id !== usuario.id) {
      const err = new Error('Acesso negado'); err.status = 403; throw err;
    }
  }

  return router;
};
