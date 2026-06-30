// routes/financeiro.js
// Painel financeiro: receitas, despesas, saldo individual por sócio, retiradas

const express = require('express');
const { autenticar, exigirPapel } = require('../middleware/autenticar');

module.exports = (pool) => {
  const router = express.Router();

  // Helper: descobre se o usuário logado é sócio, e qual
  async function buscarSocioDoUsuario(usuarioId) {
    const { rows } = await pool.query('SELECT * FROM socios WHERE usuario_id=$1 AND ativo=true', [usuarioId]);
    return rows[0] || null;
  }

  // GET /api/financeiro/socios — superadmin vê todos; admin vê só ele mesmo (se for sócio)
  router.get('/socios', autenticar, exigirPapel('admin'), async (req, res) => {
    try {
      if (req.usuario.papel === 'superadmin') {
        const { rows } = await pool.query('SELECT * FROM socios WHERE ativo=true ORDER BY percentual DESC');
        return res.json(rows);
      }
      const meu = await buscarSocioDoUsuario(req.usuario.id);
      res.json(meu ? [meu] : []);
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // PUT /api/financeiro/socios/:id — só superadmin pode alterar percentual
  router.put('/socios/:id', autenticar, exigirPapel('superadmin'), async (req, res) => {
    const { percentual } = req.body;
    try {
      const { rows: [s] } = await pool.query(
        'UPDATE socios SET percentual=$1 WHERE id=$2 RETURNING *', [percentual, req.params.id]
      );
      res.json(s);
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // GET /api/financeiro/resumo/:ano/:mes
  // Superadmin: vê tudo (receita, despesa, lucro, os 3 saldos)
  // Admin sócio: vê receita total, despesa total (com quem lançou), mas só o PRÓPRIO saldo
  router.get('/resumo/:ano/:mes', autenticar, exigirPapel('admin'), async (req, res) => {
    const { ano, mes } = req.params;
    const mesRef = `${ano}-${String(mes).padStart(2,'0')}-01`;
    const ehSuperadmin = req.usuario.papel === 'superadmin';
    try {
      const { rows: receitas } = await pool.query(
        'SELECT * FROM receitas WHERE mes_referencia=$1 ORDER BY criado_em DESC', [mesRef]
      );
      const { rows: despesas } = await pool.query(`
        SELECT d.*, u.nome as lancado_por_nome
        FROM despesas d LEFT JOIN usuarios u ON u.id = d.criado_por
        WHERE d.mes_referencia=$1 ORDER BY d.criado_em DESC
      `, [mesRef]);

      const totalReceitas = receitas.reduce((acc,r) => acc + parseFloat(r.valor), 0);
      const totalDespesas = despesas.reduce((acc,d) => acc + parseFloat(d.valor), 0);
      const lucroLiquido = totalReceitas - totalDespesas;

      let meuSocio = null;
      let divisao = null;

      if (ehSuperadmin) {
        const { rows: socios } = await pool.query('SELECT * FROM socios WHERE ativo=true ORDER BY percentual DESC');
        divisao = socios.map(s => ({
          socio_id: s.id, nome: s.nome, percentual: parseFloat(s.percentual),
          valor_mes: parseFloat((lucroLiquido * (parseFloat(s.percentual)/100)).toFixed(2)),
          saldo_acumulado: parseFloat(s.saldo_acumulado),
        }));
      } else {
        meuSocio = await buscarSocioDoUsuario(req.usuario.id);
        if (meuSocio) {
          const minhaCota = lucroLiquido * (parseFloat(meuSocio.percentual)/100);
          divisao = [{
            socio_id: meuSocio.id, nome: meuSocio.nome, percentual: parseFloat(meuSocio.percentual),
            valor_mes: parseFloat(minhaCota.toFixed(2)),
            saldo_acumulado: parseFloat(meuSocio.saldo_acumulado),
          }];
        }
      }

      res.json({
        mes_referencia: mesRef,
        receitas, despesas,
        totais: { receitas: totalReceitas, despesas: totalDespesas, lucro_liquido: lucroLiquido },
        divisao,
        sou_socio: !!meuSocio || ehSuperadmin,
        eh_superadmin: ehSuperadmin,
      });
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // POST /api/financeiro/despesas — qualquer sócio/admin pode lançar (compartilhado)
  router.post('/despesas', autenticar, exigirPapel('admin'), async (req, res) => {
    const { descricao, categoria, valor, mes_referencia, recorrente } = req.body;
    if (!descricao || !valor || !mes_referencia)
      return res.status(400).json({ erro: 'Descrição, valor e mês são obrigatórios' });
    try {
      const { rows: [d] } = await pool.query(
        `INSERT INTO despesas (descricao, categoria, valor, mes_referencia, recorrente, criado_por)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [descricao, categoria || 'outro', valor, mes_referencia, recorrente || false, req.usuario.id]
      );
      res.json(d);
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // DELETE /api/financeiro/despesas/:id — só quem lançou ou superadmin pode remover
  router.delete('/despesas/:id', autenticar, exigirPapel('admin'), async (req, res) => {
    try {
      const { rows: [d] } = await pool.query('SELECT criado_por FROM despesas WHERE id=$1', [req.params.id]);
      if (!d) return res.status(404).json({ erro: 'Despesa não encontrada' });
      if (req.usuario.papel !== 'superadmin' && d.criado_por !== req.usuario.id)
        return res.status(403).json({ erro: 'Você só pode remover despesas que você mesmo lançou' });
      await pool.query('DELETE FROM despesas WHERE id=$1', [req.params.id]);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // POST /api/financeiro/receitas — manual por enquanto; superadmin lança vendas
  router.post('/receitas', autenticar, exigirPapel('superadmin'), async (req, res) => {
    const { descricao, valor, mes_referencia } = req.body;
    if (!descricao || !valor || !mes_referencia)
      return res.status(400).json({ erro: 'Descrição, valor e mês são obrigatórios' });
    try {
      const { rows: [r] } = await pool.query(
        `INSERT INTO receitas (descricao, origem, valor, mes_referencia, criado_por)
         VALUES ($1,'manual',$2,$3,$4) RETURNING *`,
        [descricao, valor, mes_referencia, req.usuario.id]
      );
      res.json(r);
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // DELETE /api/financeiro/receitas/:id — só superadmin
  router.delete('/receitas/:id', autenticar, exigirPapel('superadmin'), async (req, res) => {
    try {
      await pool.query('DELETE FROM receitas WHERE id=$1', [req.params.id]);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // POST /api/financeiro/fechar-mes/:ano/:mes — superadmin fecha o mês,
  // distribui o lucro e soma ao saldo_acumulado de cada sócio
  router.post('/fechar-mes/:ano/:mes', autenticar, exigirPapel('superadmin'), async (req, res) => {
    const { ano, mes } = req.params;
    const mesRef = `${ano}-${String(mes).padStart(2,'0')}-01`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: jaFechado } = await client.query(
        'SELECT id FROM fechamentos_mensais WHERE mes_referencia=$1', [mesRef]
      );
      if (jaFechado.length > 0) throw new Error('Este mês já foi fechado anteriormente.');

      const { rows: receitas } = await client.query('SELECT * FROM receitas WHERE mes_referencia=$1', [mesRef]);
      const { rows: despesas } = await client.query('SELECT * FROM despesas WHERE mes_referencia=$1', [mesRef]);
      const { rows: socios } = await client.query('SELECT * FROM socios WHERE ativo=true');

      const totalReceitas = receitas.reduce((acc,r) => acc + parseFloat(r.valor), 0);
      const totalDespesas = despesas.reduce((acc,d) => acc + parseFloat(d.valor), 0);
      const lucroLiquido = totalReceitas - totalDespesas;

      const divisaoSnapshot = [];
      for (const s of socios) {
        const cota = parseFloat((lucroLiquido * (parseFloat(s.percentual)/100)).toFixed(2));
        await client.query(
          'UPDATE socios SET saldo_acumulado = saldo_acumulado + $1 WHERE id=$2',
          [cota, s.id]
        );
        divisaoSnapshot.push({ socio_id: s.id, nome: s.nome, percentual: parseFloat(s.percentual), valor: cota });
      }

      await client.query(
        `INSERT INTO fechamentos_mensais (mes_referencia, total_receitas, total_despesas, lucro_liquido, divisao)
         VALUES ($1,$2,$3,$4,$5)`,
        [mesRef, totalReceitas, totalDespesas, lucroLiquido, JSON.stringify(divisaoSnapshot)]
      );

      await client.query('COMMIT');
      res.json({ ok: true, divisao: divisaoSnapshot, lucro_liquido: lucroLiquido });
    } catch(e) {
      await client.query('ROLLBACK');
      res.status(400).json({ erro: e.message });
    } finally { client.release(); }
  });

  // GET /api/financeiro/retiradas — sócio vê as próprias; superadmin vê todas
  router.get('/retiradas', autenticar, exigirPapel('admin'), async (req, res) => {
    try {
      if (req.usuario.papel === 'superadmin') {
        const { rows } = await pool.query(`
          SELECT r.*, s.nome as socio_nome FROM retiradas r
          JOIN socios s ON s.id = r.socio_id ORDER BY r.solicitado_em DESC
        `);
        return res.json(rows);
      }
      const meu = await buscarSocioDoUsuario(req.usuario.id);
      if (!meu) return res.json([]);
      const { rows } = await pool.query(
        'SELECT * FROM retiradas WHERE socio_id=$1 ORDER BY solicitado_em DESC', [meu.id]
      );
      res.json(rows);
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // POST /api/financeiro/retiradas — sócio solicita retirada do próprio saldo
  router.post('/retiradas', autenticar, exigirPapel('admin'), async (req, res) => {
    const { valor, observacao } = req.body;
    if (req.usuario.papel === 'superadmin')
      return res.status(400).json({ erro: 'Superadmin não realiza retiradas — use a conta de sócio.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const meu = await buscarSocioDoUsuario(req.usuario.id);
      if (!meu) throw new Error('Seu usuário não está vinculado a nenhum sócio.');
      if (parseFloat(valor) > parseFloat(meu.saldo_acumulado))
        throw new Error('Valor solicitado maior que o saldo disponível.');

      await client.query(
        'UPDATE socios SET saldo_acumulado = saldo_acumulado - $1 WHERE id=$2',
        [valor, meu.id]
      );
      const { rows: [retirada] } = await client.query(
        `INSERT INTO retiradas (socio_id, valor, observacao) VALUES ($1,$2,$3) RETURNING *`,
        [meu.id, valor, observacao || null]
      );
      await client.query('COMMIT');
      res.json(retirada);
    } catch(e) {
      await client.query('ROLLBACK');
      res.status(400).json({ erro: e.message });
    } finally { client.release(); }
  });

  // PUT /api/financeiro/retiradas/:id/pagar — superadmin marca retirada como paga
  router.put('/retiradas/:id/pagar', autenticar, exigirPapel('superadmin'), async (req, res) => {
    try {
      const { rows: [r] } = await pool.query(
        `UPDATE retiradas SET status='pago', pago_em=NOW() WHERE id=$1 RETURNING *`,
        [req.params.id]
      );
      res.json(r);
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  return router;
};