// routes/laudo.js
// GET /api/laudo/consolidado — laudo consolidado de toda a rede
// GET /api/laudo/:avaliacao_id — laudo individual

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

  router.get('/consolidado', autenticar, async (req, res) => {
    const { papel, empresa_vinculada_id, organizacao_id } = req.usuario;
    try {
      let filtro, params = [];
      if (papel === 'gestor_matriz') {
        filtro = `WHERE a.status IN ('processada','coletada') AND (e.id = $1 OR e.matriz_id = $1)`;
        params = [empresa_vinculada_id];
      } else {
        filtro = `WHERE a.status IN ('processada','coletada') AND e.organizacao_id = $1`;
        params = [organizacao_id];
      }

      // Busca todos os resultados de todas as avaliações processadas
      const { rows } = await pool.query(`
        SELECT r.*, s.nome AS setor_nome, e.nome AS empresa_nome, e.cnpj AS empresa_cnpj,
               a.total_respostas, a.criado_em
        FROM resultados r
        JOIN avaliacoes a ON r.avaliacao_id = a.id
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        ${filtro}
        ORDER BY r.topico_num
      `, params);

      if (!rows.length) return res.status(404).json({ erro: 'Nenhum resultado encontrado' });

      // Busca responsável técnico (primeiro psicólogo das avaliações)
      const { rows: [resp] } = await pool.query(`
        SELECT u.nome AS psicologo_nome, u.crp AS psicologo_crp
        FROM avaliacoes a
        JOIN usuarios u ON u.id = a.psicologo_id
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        ${filtro}
        LIMIT 1
      `, params);

      const empresasNomes = [...new Set(rows.map(r => r.empresa_nome))];
      const totalRespostas = rows.reduce((acc, r) => {
        if (!acc.seen) acc.seen = new Set();
        if (!acc.seen.has(r.avaliacao_id)) { acc.seen.add(r.avaliacao_id); acc.total += (r.total_respostas || 0); }
        return acc;
      }, { total: 0, seen: new Set() }).total;

      // Calcula média real por tópico entre todas as avaliações
      const porTopico = {};
      rows.forEach(r => {
        if (!porTopico[r.topico_num]) {
          porTopico[r.topico_num] = {
            topico_num: r.topico_num, topico_nome: r.topico_nome,
            fonte_geradora: r.fonte_geradora,
            soma: 0, count: 0,
            contagem_risco: { Crítico:0, Alto:0, Médio:0, Baixo:0 },
            setores_em_risco: [], media_probabilidade: r.media_probabilidade,
          };
        }
        const t = porTopico[r.topico_num];
        t.soma += parseFloat(r.media_gravidade) || 0;
        t.count++;
        if (t.contagem_risco[r.matriz_risco] !== undefined) t.contagem_risco[r.matriz_risco]++;
        if (r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico') {
          t.setores_em_risco.push(`${r.empresa_nome} — ${r.setor_nome}`);
        }
      });

      // Monta resultados — usa pior caso entre setores para cada tópico
      // E conta ocorrências somadas (igual ao painel)
      const resultados = Object.values(porTopico).map(t => {
        const media = t.count > 0 ? t.soma / t.count : 0;
        // Usa pior zona que ocorreu em qualquer setor
        const ordemZ = { Crítico:4, Alto:3, Médio:2, Baixo:1 };
        const piorZona = Object.entries(t.contagem_risco)
          .filter(([,v]) => v > 0)
          .sort((a,b) => (ordemZ[b[0]]||0) - (ordemZ[a[0]]||0))[0]?.[0] || 'Baixo';
        let classif;
        if (piorZona === 'Crítico' || piorZona === 'Alto') classif = 'Alta';
        else if (piorZona === 'Médio') classif = 'Média';
        else classif = 'Baixa';
        return {
          topico_num: t.topico_num, topico_nome: t.topico_nome,
          fonte_geradora: t.fonte_geradora,
          media_gravidade: parseFloat(media.toFixed(2)),
          classif_gravidade: classif,
          media_probabilidade: t.media_probabilidade || 2,
          classif_probabilidade: 'Média',
          matriz_risco: piorZona,
          setores_em_risco: [...new Set(t.setores_em_risco)],
          acoes_sugeridas: [],
          contagem_por_setor: t.contagem_risco,
        };
      }).sort((a, b) => a.topico_num - b.topico_num);

      // Contagem consolidada = soma de ocorrências brutas (igual ao semáforo do painel)
      const contagem = { Crítico:0, Alto:0, Médio:0, Baixo:0 };
      rows.forEach(r => { if (contagem[r.matriz_risco] !== undefined) contagem[r.matriz_risco]++; });

      // Monta top5, radar, inventários — igual ao laudo individual
      const ordemRisco = { Crítico:4, Alto:3, Médio:2, Baixo:1 };
      const top5 = [...resultados].sort((a,b) => (ordemRisco[b.matriz_risco]||0)-(ordemRisco[a.matriz_risco]||0)).slice(0,5);

      const radarData = resultados.map(r => ({
        topico: r.topico_nome.replace(/^(Baixa |Baixo |Má |Maus |Excesso de |Falta de |Trabalho |Eventos )/i,'').slice(0,24),
        topico_completo: r.topico_nome,
        valor: parseFloat(r.media_gravidade) || 0,
        zona: r.matriz_risco,
      }));

      const inventarioMTE = FATORES_MTE.map(fator => {
        const assoc = resultados.filter(r => fator.topicos_copsoq.includes(r.topico_num));
        const temRisco = assoc.some(r => r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico');
        const temAtencao = assoc.some(r => r.matriz_risco === 'Médio');
        return {
          ...fator, status: temRisco ? 'Indícios' : temAtencao ? 'Monitoramento' : 'Não identificado',
          dimensoes_associadas: assoc.map(r => ({ nome: r.topico_nome, score: r.media_gravidade, classif: r.classif_gravidade, matriz: r.matriz_risco })),
        };
      });

      const inventarioFontes = resultados
        .filter(r => r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico' || r.matriz_risco === 'Médio')
        .map(r => ({
          topico_num: r.topico_num, topico_nome: r.topico_nome, matriz_risco: r.matriz_risco, score: r.media_gravidade,
          ...(INVENTARIO_FONTES[r.topico_num] || { fontes_geradoras:[], circunstancias_exposicao:[], possiveis_agravos:[] }),
        }));

      const matrizAIHA = resultados
        .filter(r => r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico' || r.matriz_risco === 'Médio')
        .map(r => {
          const sev = copsoqParaSeveridade(parseFloat(r.media_gravidade));
          const prob = copsoqParaProbabilidadeAIHA(r.media_probabilidade);
          const pxs = sev * prob;
          const nivel = calcularNivelAIHA(pxs);
          return {
            topico_num: r.topico_num, fator_pgr: INVENTARIO_FONTES[r.topico_num]?.fator_pgr || r.topico_nome,
            score: parseFloat(r.media_gravidade), severidade: sev, severidade_label: LABELS_SEVERIDADE[sev],
            probabilidade: prob, probabilidade_label: LABELS_PROBABILIDADE[prob], pxs,
            nivel_risco: nivel.nivel, cor: nivel.cor,
          };
        }).sort((a,b) => b.pxs - a.pxs);

      const totalRisco = contagem.Alto + contagem.Crítico;
      const periodoRecomendado = totalRisco > 0 ? 6 : 12;
      const dataProxima = new Date();
      dataProxima.setMonth(dataProxima.getMonth() + periodoRecomendado);

      res.json({
        avaliacao: {
          id: 'consolidado', empresa_nome: empresasNomes.join(' · '),
          empresa_cnpj: null, setor_nome: `Consolidado — ${empresasNomes.length} empresa(s)`,
          total_respostas: totalRespostas, taxa_adesao: null,
          criado_em: new Date().toISOString(),
          psicologo_nome: resp?.psicologo_nome || '', psicologo_crp: resp?.psicologo_crp || '',
        },
        config: {},
        resultados, contagem, top5, radarData,
        inventarioMTE, inventarioFontes, matrizAIHA,
        controles: [], glossario: GLOSSARIO,
        periodicidade: {
          meses: periodoRecomendado,
          proxima_avaliacao: dataProxima.toISOString().slice(0,10),
          justificativa: totalRisco > 0
            ? `${totalRisco} dimensão(ões) em risco requerem reavaliação em ${periodoRecomendado} meses.`
            : 'Reavaliação anual recomendada conforme NR-01.',
        },
      });
    } catch (err) {
      console.error('[laudo consolidado]', err);
      res.status(500).json({ erro: 'Erro interno ao gerar laudo consolidado' });
    }
  });

  // GET /api/laudo/:avaliacao_id — laudo individual
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