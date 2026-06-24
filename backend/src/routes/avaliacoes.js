const express = require('express');
const crypto = require('crypto');
const { autenticar, exigirPapel } = require('../middleware/autenticar');
const { rateLimit } = require('../middleware/rateLimit');
const { audit } = require('../middleware/auditoria');
const { sanitize } = require('../middleware/crypto');
const { calcularResultados } = require('../calculo');
const { CRITERIOS_PROBABILIDADE, calcularSugestaoProbabilidade } = require('../criteriosProbabilidade');

module.exports = (pool) => {
  const router = express.Router();

  // POST /api/avaliacoes
  router.post('/', autenticar, exigirPapel('admin', 'psicologo'), rateLimit(20, 60000), async (req, res) => {
    const { setor_id, data_fim } = req.body;
    if (!setor_id) return res.status(400).json({ erro: 'Setor obrigatório' });
    try {
      const { rows } = await pool.query(
        'INSERT INTO avaliacoes (setor_id, psicologo_id, data_fim) VALUES ($1,$2,$3) RETURNING *',
        [setor_id, req.usuario.id, data_fim || null]
      );
      const avaliacao = rows[0];
      const link = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/responder/${avaliacao.token_anonimo}`;
      await audit(pool, 'AVALIACAO_CRIADA', req.usuario.id, { setor_id, avaliacao_id: avaliacao.id }, req);
      res.json({ ...avaliacao, link_anonimo: link });
    } catch (e) { console.error('ERRO:', e); res.status(500).json({ erro: e.message }); }
  });

  // GET /api/avaliacoes
  router.get('/', autenticar, async (req, res) => {
    const { papel, id: userId, empresa_vinculada_id } = req.usuario;
    try {
      const base = `
        SELECT a.*, s.nome as setor_nome, s.total_funcionarios as setor_total_funcionarios,
          e.nome as empresa_nome, e.tipo as empresa_tipo,
          a.total_respostas as respostas_coletadas,
          GREATEST(0, COALESCE(s.total_funcionarios,0) - COALESCE(a.total_respostas,0)) as vagas_restantes
        FROM avaliacoes a
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id`;

      let query, params = [];
      if (papel === 'admin') { query = base + ' ORDER BY a.criado_em DESC'; }
      else if (papel === 'psicologo') { query = base + ' WHERE a.psicologo_id = $1 ORDER BY a.criado_em DESC'; params = [userId]; }
      else if (papel === 'gestor_matriz') { query = base + ' WHERE (e.id = $1 OR e.matriz_id = $1) ORDER BY a.criado_em DESC'; params = [empresa_vinculada_id]; }
      else if (papel === 'gestor_filial') { query = base + ' WHERE e.id = $1 ORDER BY a.criado_em DESC'; params = [empresa_vinculada_id]; }

      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (e) { console.error('ERRO:', e); res.status(500).json({ erro: e.message }); }
  });

  // POST /api/avaliacoes/:id/probabilidades
  router.post('/:id/probabilidades', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { probabilidades } = req.body;
    try {
      for (const p of probabilidades) {
        if (p.topico_num < 1 || p.topico_num > 13 || p.valor < 1 || p.valor > 3) continue;
        await pool.query(
          'INSERT INTO probabilidades (avaliacao_id, topico_num, valor) VALUES ($1,$2,$3) ON CONFLICT (avaliacao_id, topico_num) DO UPDATE SET valor=$3',
          [req.params.id, p.topico_num, p.valor]
        );
      }
      res.json({ ok: true });
    } catch (e) { console.error('ERRO:', e); res.status(500).json({ erro: e.message }); }
  });

  // POST /api/avaliacoes/:id/processar
  router.post('/:id/processar', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const id = req.params.id;
    try {
      const { rows: respostas } = await pool.query('SELECT pergunta_num, valor_original FROM respostas WHERE avaliacao_id=$1', [id]);
      const { rows: probabilidades } = await pool.query('SELECT topico_num, valor FROM probabilidades WHERE avaliacao_id=$1', [id]);
      if (!respostas.length) return res.status(400).json({ erro: 'Nenhuma resposta encontrada' });

      const resultados = calcularResultados(respostas, probabilidades);
      for (const r of resultados) {
        await pool.query(
          `INSERT INTO resultados (avaliacao_id, topico_num, topico_nome, media_gravidade, classif_gravidade, media_probabilidade, classif_probabilidade, matriz_risco, fonte_geradora)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (avaliacao_id, topico_num) DO UPDATE SET
             media_gravidade=$4, classif_gravidade=$5, media_probabilidade=$6, classif_probabilidade=$7, matriz_risco=$8`,
          [id, r.topico_num, r.topico_nome, r.media_gravidade, r.classif_gravidade, r.media_probabilidade, r.classif_probabilidade, r.matriz_risco, r.fonte_geradora]
        );
      }
      await pool.query("UPDATE avaliacoes SET status='processada' WHERE id=$1", [id]);
      await audit(pool, 'AVALIACAO_PROCESSADA', req.usuario.id, { avaliacao_id: id }, req);
      res.json(resultados);
    } catch (e) { console.error('ERRO:', e); res.status(500).json({ erro: e.message }); }
  });

  // GET /api/avaliacoes/consolidado/matriz — dashboard consolidado por filial (gestor_matriz e admin)
  router.get('/consolidado/matriz', autenticar, exigirPapel('admin','psicologo','gestor_matriz'), async (req, res) => {
    const { papel, empresa_vinculada_id } = req.usuario;
    try {
      // Busca todas as avaliações processadas das filiais da matriz
      let empresaFiltro = '';
      let params = [];
      if (papel === 'gestor_matriz') {
        empresaFiltro = 'WHERE (e.id = $1 OR e.matriz_id = $1) AND a.status IN (\'processada\', \'coletada\')';
        params = [empresa_vinculada_id];
      } else {
        empresaFiltro = 'WHERE a.status IN (\'processada\', \'coletada\')';
      }

      const { rows: avaliacoes } = await pool.query(`
        SELECT a.id, a.criado_em, a.total_respostas,
          s.nome as setor_nome, s.total_funcionarios,
          e.id as empresa_id, e.nome as empresa_nome, e.tipo as empresa_tipo,
          em.nome as matriz_nome
        FROM avaliacoes a
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        LEFT JOIN empresas em ON e.matriz_id = em.id
        ${empresaFiltro}
        ORDER BY e.nome, a.criado_em DESC
      `, params);

      // Para cada avaliação, busca contagem de riscos
      const resultado = [];
      for (const aval of avaliacoes) {
        const { rows: conts } = await pool.query(`
          SELECT matriz_risco, COUNT(*) as total
          FROM resultados WHERE avaliacao_id = $1
          GROUP BY matriz_risco
        `, [aval.id]);
        const contagem = { Baixo: 0, Médio: 0, Alto: 0, Crítico: 0 };
        conts.forEach(c => { if (contagem[c.matriz_risco] !== undefined) contagem[c.matriz_risco] = parseInt(c.total); });
        resultado.push({ ...aval, contagem });
      }

      // Agrupa por empresa
      const porEmpresa = {};
      resultado.forEach(a => {
        if (!porEmpresa[a.empresa_id]) {
          porEmpresa[a.empresa_id] = {
            empresa_id: a.empresa_id, empresa_nome: a.empresa_nome,
            empresa_tipo: a.empresa_tipo, matriz_nome: a.matriz_nome,
            avaliacoes: [], totais: { Baixo:0, Médio:0, Alto:0, Crítico:0 }
          };
        }
        porEmpresa[a.empresa_id].avaliacoes.push(a);
        ['Baixo','Médio','Alto','Crítico'].forEach(k => {
          porEmpresa[a.empresa_id].totais[k] += a.contagem[k]||0;
        });
      });

      // Calcula totais_geral usando PIOR resultado por tópico (não soma)
      const ordemRisco = { 'Crítico':4, 'Alto':3, 'Médio':2, 'Baixo':1 };

      // Busca todos os resultados de todas as avaliações filtradas
      const todasAvalIds = resultado.map(a => a.id);
      let piorPorTopico = {};
      if (todasAvalIds.length > 0) {
        const placeholders = todasAvalIds.map((_,i)=>`$${i+1}`).join(',');
        const { rows: todosResultados } = await pool.query(
          `SELECT topico_num, matriz_risco FROM resultados WHERE avaliacao_id IN (${placeholders})`,
          todasAvalIds
        );
        todosResultados.forEach(r => {
          const atual = piorPorTopico[r.topico_num];
          if (!atual || (ordemRisco[r.matriz_risco]||0) > (ordemRisco[atual]||0)) {
            piorPorTopico[r.topico_num] = r.matriz_risco;
          }
        });
      }

      const totais_geral = { Baixo:0, Médio:0, Alto:0, Crítico:0 };
      Object.values(piorPorTopico).forEach(risco => {
        if (totais_geral[risco] !== undefined) totais_geral[risco]++;
      });

      // Também corrigir totais por empresa usando pior resultado por tópico
      for (const emp of Object.values(porEmpresa)) {
        const empAvalIds = emp.avaliacoes.map(a => a.id);
        let piorEmp = {};
        if (empAvalIds.length > 0) {
          const ph = empAvalIds.map((_,i)=>`$${i+1}`).join(',');
          const { rows: rEmp } = await pool.query(
            `SELECT topico_num, matriz_risco FROM resultados WHERE avaliacao_id IN (${ph})`,
            empAvalIds
          );
          rEmp.forEach(r => {
            const atual = piorEmp[r.topico_num];
            if (!atual || (ordemRisco[r.matriz_risco]||0) > (ordemRisco[atual]||0)) {
              piorEmp[r.topico_num] = r.matriz_risco;
            }
          });
        }
        emp.totais = { Baixo:0, Médio:0, Alto:0, Crítico:0 };
        Object.values(piorEmp).forEach(risco => {
          if (emp.totais[risco] !== undefined) emp.totais[risco]++;
        });
      }

      res.json({
        empresas: Object.values(porEmpresa),
        totais_geral,
        totais_ocorrencias: resultado.reduce((acc, a) => {
          ['Baixo','Médio','Alto','Crítico'].forEach(k => acc[k] = (acc[k]||0) + (a.contagem[k]||0));
          return acc;
        }, { Baixo:0, Médio:0, Alto:0, Crítico:0 })
      });
    } catch (e) { console.error(e); res.status(500).json({ erro: e.message }); }
  });

  // GET /api/avaliacoes/consolidado/filial — dashboard da filial (gestor_filial)
  router.get('/consolidado/filial', autenticar, exigirPapel('gestor_filial','admin'), async (req, res) => {
    const { empresa_vinculada_id } = req.usuario;
    try {
      const { rows: avaliacoes } = await pool.query(`
        SELECT a.id, a.criado_em, a.total_respostas, a.data_fim, a.status,
          s.nome as setor_nome, s.total_funcionarios,
          e.nome as empresa_nome
        FROM avaliacoes a
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        WHERE e.id = $1
        ORDER BY a.criado_em DESC
      `, [empresa_vinculada_id]);

      const resultado = [];
      for (const aval of avaliacoes) {
        const { rows: riscos } = await pool.query(`
          SELECT topico_nome, classif_gravidade, classif_probabilidade, matriz_risco
          FROM resultados WHERE avaliacao_id = $1 AND matriz_risco IN ('Alto','Crítico')
          ORDER BY CASE matriz_risco WHEN 'Crítico' THEN 1 WHEN 'Alto' THEN 2 END
          LIMIT 5
        `, [aval.id]);
        const { rows: conts } = await pool.query(`
          SELECT matriz_risco, COUNT(*) as total
          FROM resultados WHERE avaliacao_id = $1
          GROUP BY matriz_risco
        `, [aval.id]);
        const contagem = { Baixo:0, Médio:0, Alto:0, Crítico:0 };
        conts.forEach(c => { if (contagem[c.matriz_risco] !== undefined) contagem[c.matriz_risco] = parseInt(c.total); });
        resultado.push({ ...aval, contagem, top_riscos: riscos });
      }

      res.json(resultado);
    } catch (e) { console.error(e); res.status(500).json({ erro: e.message }); }
  });

  // GET /api/avaliacoes/consolidado/laudo-empresa/:empresa_id — laudo consolidado de todos os setores de uma empresa
  router.get('/consolidado/laudo-empresa/:empresa_id', autenticar, exigirPapel('admin','psicologo','gestor_matriz','gestor_filial'), async (req, res) => {
    try {
      const { empresa_id } = req.params;
      const { rows } = await pool.query(`
        SELECT r.topico_num, r.topico_nome, r.fonte_geradora,
          r.media_gravidade, r.classif_gravidade,
          r.media_probabilidade, r.classif_probabilidade, r.matriz_risco,
          s.nome as setor_nome, e.nome as empresa_nome
        FROM resultados r
        JOIN avaliacoes a ON r.avaliacao_id = a.id
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        WHERE e.id = $1 AND a.status IN ('processada', 'coletada')
        ORDER BY r.topico_num
      `, [empresa_id]);

      if (!rows.length) return res.status(404).json({ erro: 'Nenhum resultado encontrado para esta empresa' });

      // Ordena por risco (pior primeiro) para pegar o pior resultado por tópico
      const ordemRisco = { 'Crítico': 4, 'Alto': 3, 'Médio': 2, 'Baixo': 1, 'Pendente': 0 };
      const ordemGrav  = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      const ordemProb  = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };

      const porTopico = {};
      rows.forEach(r => {
        const atual = porTopico[r.topico_num];
        const novoRisco = ordemRisco[r.matriz_risco] || 0;
        // Guarda o pior resultado deste tópico entre todos os setores
        if (!atual || novoRisco > (ordemRisco[atual.matriz_risco] || 0)) {
          porTopico[r.topico_num] = { ...r, setores_alto: [], setores_todos: [] };
        }
        if (!porTopico[r.topico_num].setores_todos) porTopico[r.topico_num].setores_todos = [];
        porTopico[r.topico_num].setores_todos.push(r.setor_nome);
        if (r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico') {
          if (!porTopico[r.topico_num].setores_alto) porTopico[r.topico_num].setores_alto = [];
          porTopico[r.topico_num].setores_alto.push(r.setor_nome);
        }
      });

      // Monta resultado final com info de quantos setores afetados
      const resultados = Object.values(porTopico).map(t => ({
        topico_num: t.topico_num,
        topico_nome: t.topico_nome,
        fonte_geradora: t.fonte_geradora,
        empresa_nome: t.empresa_nome,
        media_gravidade: parseFloat(t.media_gravidade) || null,
        classif_gravidade: t.classif_gravidade,
        media_probabilidade: parseFloat(t.media_probabilidade) || null,
        classif_probabilidade: t.classif_probabilidade,
        matriz_risco: t.matriz_risco,
        setores_incluidos: [...new Set(t.setores_todos || [])],
        setores_em_risco: [...new Set(t.setores_alto || [])],
        acoes_sugeridas: [],
      }));

      const contagem = { Baixo:0, Médio:0, Alto:0, Crítico:0 };
      resultados.forEach(r => { if (contagem[r.matriz_risco]!==undefined) contagem[r.matriz_risco]++; });

      res.json({
        empresa_nome: rows[0].empresa_nome,
        total_setores: new Set(rows.map(r=>r.setor_nome)).size,
        resultados, contagem
      });
    } catch(e) { console.error(e); res.status(500).json({ erro: e.message }); }
  });

  // GET /api/avaliacoes/consolidado/laudo-rede — laudo geral de toda a rede (pior resultado por tópico)
  router.get('/consolidado/laudo-rede', autenticar, exigirPapel('admin','psicologo','gestor_matriz'), async (req, res) => {
    const { papel, empresa_vinculada_id } = req.usuario;
    try {
      let filtro = 'WHERE a.status IN (\'processada\', \'coletada\')';
      let params = [];
      if (papel === 'gestor_matriz') {
        filtro = 'WHERE a.status IN (\'processada\', \'coletada\') AND (e.id = $1 OR e.matriz_id = $1)';
        params = [empresa_vinculada_id];
      }

      const { rows } = await pool.query(`
        SELECT r.topico_num, r.topico_nome, r.fonte_geradora,
          r.media_gravidade, r.classif_gravidade,
          r.media_probabilidade, r.classif_probabilidade, r.matriz_risco,
          s.nome as setor_nome, e.nome as empresa_nome, e.id as empresa_id
        FROM resultados r
        JOIN avaliacoes a ON r.avaliacao_id = a.id
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id
        ${filtro}
        ORDER BY r.topico_num
      `, params);

      if (!rows.length) return res.status(404).json({ erro: 'Nenhum resultado encontrado' });

      const ordemRisco = { 'Crítico': 4, 'Alto': 3, 'Médio': 2, 'Baixo': 1, 'Pendente': 0 };

      const porTopico = {};
      rows.forEach(r => {
        const atual = porTopico[r.topico_num];
        const novoRisco = ordemRisco[r.matriz_risco] || 0;
        if (!atual || novoRisco > (ordemRisco[atual.matriz_risco] || 0)) {
          porTopico[r.topico_num] = { ...r, setores_em_risco: [], empresas_incluidas: [] };
        }
        if (!porTopico[r.topico_num].empresas_incluidas) porTopico[r.topico_num].empresas_incluidas = [];
        porTopico[r.topico_num].empresas_incluidas.push(`${r.empresa_nome} — ${r.setor_nome}`);
        if (r.matriz_risco === 'Alto' || r.matriz_risco === 'Crítico') {
          if (!porTopico[r.topico_num].setores_em_risco) porTopico[r.topico_num].setores_em_risco = [];
          porTopico[r.topico_num].setores_em_risco.push(`${r.empresa_nome} — ${r.setor_nome}`);
        }
      });

      const resultados = Object.values(porTopico).map(t => ({
        topico_num: t.topico_num,
        topico_nome: t.topico_nome,
        fonte_geradora: t.fonte_geradora,
        media_gravidade: parseFloat(t.media_gravidade) || null,
        classif_gravidade: t.classif_gravidade,
        media_probabilidade: parseFloat(t.media_probabilidade) || null,
        classif_probabilidade: t.classif_probabilidade,
        matriz_risco: t.matriz_risco,
        empresas_incluidas: [...new Set(t.empresas_incluidas || [])],
        setores_em_risco: [...new Set(t.setores_em_risco || [])],
        acoes_sugeridas: [],
      }));

      const contagem = { Baixo:0, Médio:0, Alto:0, Crítico:0 };
      resultados.forEach(r => { if (contagem[r.matriz_risco]!==undefined) contagem[r.matriz_risco]++; });

      const empresas = [...new Set(rows.map(r=>r.empresa_nome))];
      res.json({ empresas, total_empresas: empresas.length, resultados, contagem });
    } catch(e) { console.error(e); res.status(500).json({ erro: e.message }); }
  });

  // GET /api/avaliacoes/:id/resultados
  router.get('/:id/resultados', autenticar, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM resultados WHERE avaliacao_id=$1 ORDER BY topico_num', [req.params.id]);
      const contagem = { Baixo: 0, Médio: 0, Alto: 0, Crítico: 0 };
      rows.forEach(r => { if (contagem[r.matriz_risco] !== undefined) contagem[r.matriz_risco]++; });
      res.json({ resultados: rows, contagem });
    } catch (e) { console.error('ERRO:', e); res.status(500).json({ erro: e.message }); }
  });

  // GET /api/avaliacoes/criterios-probabilidade — lista as perguntas guiadas
  router.get('/criterios-probabilidade', autenticar, (req, res) => {
    res.json(CRITERIOS_PROBABILIDADE);
  });

  // GET /api/avaliacoes/:id/criterios — busca respostas salvas dos critérios por tópico
  router.get('/:id/criterios', autenticar, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT topico_num, criterio_codigo, resposta_valor FROM criterios_probabilidade WHERE avaliacao_id=$1',
        [req.params.id]
      );
      // Agrupar por tópico: { 1: { frequencia: 3, duracao: 2 }, 2: {...} }
      const agrupado = {};
      rows.forEach(r => {
        if (!agrupado[r.topico_num]) agrupado[r.topico_num] = {};
        agrupado[r.topico_num][r.criterio_codigo] = r.resposta_valor;
      });
      res.json(agrupado);
    } catch (e) { console.error('ERRO:', e); res.status(500).json({ erro: e.message }); }
  });

  // POST /api/avaliacoes/:id/criterios — salva respostas dos critérios e retorna sugestão
  router.post('/:id/criterios', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { topico_num, respostas } = req.body; // respostas: { frequencia: 3, duracao: 2, ... }
    if (!topico_num || !respostas) return res.status(400).json({ erro: 'Dados incompletos' });
    try {
      for (const [codigo, valor] of Object.entries(respostas)) {
        await pool.query(
          `INSERT INTO criterios_probabilidade (avaliacao_id, topico_num, criterio_codigo, resposta_valor)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (avaliacao_id, topico_num, criterio_codigo) DO UPDATE SET resposta_valor=$4`,
          [req.params.id, topico_num, codigo, valor]
        );
      }
      const sugestao = calcularSugestaoProbabilidade(respostas);
      res.json({ ok: true, sugestao });
    } catch (e) { console.error('ERRO:', e); res.status(500).json({ erro: e.message }); }
  });

  return router;
};
