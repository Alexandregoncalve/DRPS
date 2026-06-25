// routes/laudo.js
// GET /api/laudo/:avaliacao_id — retorna todos os dados para o laudo completo NR-01

const express = require('express');
const { autenticar } = require('../middleware/autenticar');
const {
  FATORES_MTE,
  INVENTARIO_FONTES,
  GLOSSARIO,
  calcularNivelAIHA,
  copsoqParaSeveridade,
  copsoqParaProbabilidadeAIHA,
  LABELS_SEVERIDADE,
  LABELS_PROBABILIDADE,
} = require('../data/nr01');

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/laudo/:avaliacao_id
  router.get('/:avaliacao_id', autenticar, async (req, res) => {
    try {
      const { avaliacao_id } = req.params;

      // 1. Dados da avaliação
      const { rows: [aval] } = await pool.query(`
        SELECT a.*, s.nome AS setor_nome, s.total_funcionarios AS setor_total,
               e.nome AS empresa_nome, e.cnpj AS empresa_cnpj,
               u.nome AS psicologo_nome, u.crp AS psicologo_crp, u.email AS psicologo_email
        FROM avaliacoes a
        JOIN setores  s ON s.id = a.setor_id
        JOIN empresas e ON e.id = s.empresa_id
        JOIN usuarios u ON u.id = a.psicologo_id
        WHERE a.id = $1
      `, [avaliacao_id]);

      if (!aval) return res.status(404).json({ erro: 'Avaliação não encontrada' });

      // 2. Resultados por tópico
      const { rows: resultados } = await pool.query(`
        SELECT * FROM resultados WHERE avaliacao_id = $1 ORDER BY topico_num
      `, [avaliacao_id]);

      if (!resultados.length) return res.status(404).json({ erro: 'Nenhum resultado calculado. Processe a avaliação primeiro.' });

      // 3. Configuração do relatório
      const { rows: [config] } = await pool.query(`
        SELECT * FROM config_relatorio WHERE avaliacao_id = $1
      `, [avaliacao_id]);

      // 4. Controles implantados
      const { rows: controles } = await pool.query(`
        SELECT * FROM controles_implantados WHERE avaliacao_id = $1 ORDER BY categoria, nome
      `, [avaliacao_id]);

      // 5. Contagem por zona
      const contagem = { Baixo: 0, Médio: 0, Alto: 0, Crítico: 0 };
      resultados.forEach(r => { if (contagem[r.matriz_risco] !== undefined) contagem[r.matriz_risco]++; });

      // 6. Top 5 riscos prioritários
      const ordemRisco = { Crítico: 4, Alto: 3, Médio: 2, Baixo: 1 };
      const top5 = [...resultados]
        .sort((a, b) => (ordemRisco[b.matriz_risco] || 0) - (ordemRisco[a.matriz_risco] || 0))
        .slice(0, 5);

      // 7. Inventário de riscos MTE — status automático
      const inventarioMTE = FATORES_MTE.map(fator => {
        const topicosAssociados = fator.topicos_copsoq;
        const resultadosAssociados = resultados.filter(r => topicosAssociados.includes(r.topico_num));
        const temRisco = resultadosAssociados.some(r => r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico');
        const temAtencao = resultadosAssociados.some(r => r.matriz_risco === 'Médio');
        const status = temRisco ? 'Indícios' : (temAtencao ? 'Monitoramento' : 'Não identificado');
        return {
          ...fator,
          status,
          dimensoes_associadas: resultadosAssociados.map(r => ({
            nome: r.topico_nome,
            score: r.media_gravidade,
            classif: r.classif_gravidade,
            matriz: r.matriz_risco,
          })),
        };
      });

      // 8. Inventário de fontes e circunstâncias (dimensões em atenção/risco)
      const inventarioFontes = resultados
        .filter(r => r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico' || r.matriz_risco === 'Médio')
        .map(r => ({
          topico_num: r.topico_num,
          topico_nome: r.topico_nome,
          matriz_risco: r.matriz_risco,
          score: r.media_gravidade,
          ...(INVENTARIO_FONTES[r.topico_num] || {
            fontes_geradoras: [],
            circunstancias_exposicao: [],
            possiveis_agravos: [],
          }),
        }));

      // 9. Matriz AIHA 5×5
      const matrizAIHA = resultados
        .filter(r => r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico' || r.matriz_risco === 'Médio')
        .map(r => {
          const severidade = copsoqParaSeveridade(parseFloat(r.media_gravidade));
          const probabilidade = copsoqParaProbabilidadeAIHA(r.media_probabilidade);
          const pxs = severidade * probabilidade;
          const nivelAIHA = calcularNivelAIHA(pxs);
          return {
            topico_num: r.topico_num,
            fator_pgr: INVENTARIO_FONTES[r.topico_num]?.fator_pgr || r.topico_nome,
            score: parseFloat(r.media_gravidade),
            severidade,
            severidade_label: LABELS_SEVERIDADE[severidade],
            probabilidade,
            probabilidade_label: LABELS_PROBABILIDADE[probabilidade],
            pxs,
            nivel_risco: nivelAIHA.nivel,
            cor: nivelAIHA.cor,
          };
        })
        .sort((a, b) => b.pxs - a.pxs);

      // 10. Dados para radar
      const radarData = resultados.map(r => ({
        topico: r.topico_nome.replace(/^(Baixa |Baixo |Má |Maus |Excesso de |Falta de |Trabalho |Eventos )/i, '').slice(0, 24),
        topico_completo: r.topico_nome,
        valor: parseFloat(r.media_gravidade) || 0,
        zona: r.matriz_risco,
      }));

      // 11. Taxa de adesão
      const totalColab = config?.total_colaboradores || aval.setor_total || null;
      const taxaAdesao = totalColab ? Math.round((aval.total_respostas / totalColab) * 100) : null;

      // 12. Periodicidade recomendada
      const totalRisco = contagem.Alto + contagem.Crítico;
      const periodoRecomendado = totalRisco > 0 ? 6 : 12; // meses
      const dataProxima = new Date();
      dataProxima.setMonth(dataProxima.getMonth() + periodoRecomendado);

      // 13. Comparativo por setor (se houver múltiplas avaliações da mesma empresa)
      const { rows: comparativo } = await pool.query(`
        SELECT s.nome AS setor_nome, r.topico_num, r.topico_nome,
               r.media_gravidade, r.matriz_risco
        FROM resultados r
        JOIN avaliacoes a ON a.id = r.avaliacao_id
        JOIN setores s ON s.id = a.setor_id
        WHERE s.empresa_id = (
          SELECT s2.empresa_id FROM avaliacoes a2
          JOIN setores s2 ON s2.id = a2.setor_id
          WHERE a2.id = $1
        )
        AND a.status IN ('processada','coletada')
        ORDER BY s.nome, r.topico_num
      `, [avaliacao_id]);

      res.json({
        avaliacao: {
          ...aval,
          taxa_adesao: taxaAdesao,
        },
        config: config || {},
        resultados,
        contagem,
        top5,
        radarData,
        inventarioMTE,
        inventarioFontes,
        matrizAIHA,
        controles,
        glossario: GLOSSARIO,
        periodicidade: {
          meses: periodoRecomendado,
          proxima_avaliacao: dataProxima.toISOString().slice(0, 10),
          justificativa: totalRisco > 0
            ? `${totalRisco} dimensão(ões) em risco relevante requerem reavaliação em ${periodoRecomendado} meses.`
            : 'Reavaliação anual recomendada conforme NR-01 itens 1.5.4.1 e 1.5.4.2.',
        },
      });
    } catch (err) {
      console.error('[laudo GET]', err);
      res.status(500).json({ erro: 'Erro interno ao gerar laudo' });
    }
  });

  return router;
};
