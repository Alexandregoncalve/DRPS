const express = require('express');
const bcrypt = require('bcrypt');
const { rateLimit } = require('../middleware/rateLimit');
const { audit } = require('../middleware/auditoria');
const { sanitize } = require('../middleware/crypto');
const { senhaForte } = require('../middleware/senhaForte');

module.exports = (pool) => {
  const router = express.Router();

  // POST /api/organizacoes/cadastro — rota PÚBLICA (sem autenticação)
  router.post('/cadastro', rateLimit(5, 60 * 60 * 1000), async (req, res) => {
    const { nome_org, nome_responsavel, email, senha, telefone } = req.body;

    if (!nome_org || !nome_responsavel || !email || !senha) {
      return res.status(400).json({ erro: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    const validacao = senhaForte(senha);
    if (!validacao.valido) return res.status(400).json({ erro: validacao.erro });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verificar se email já existe
      const { rows: emailExiste } = await client.query(
        'SELECT id FROM usuarios WHERE email = $1', [sanitize(email)]
      );
      if (emailExiste.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ erro: 'Este e-mail já está cadastrado no sistema' });
      }

      // 2. Criar organização
      const { rows: orgRows } = await client.query(
        `INSERT INTO organizacoes (nome, plano, status, email_contato)
         VALUES ($1, 'basico', 'ativo', $2) RETURNING id, nome`,
        [sanitize(nome_org), sanitize(email)]
      );
      const org = orgRows[0];

      // 3. Criar usuário admin da organização
      const hash = await bcrypt.hash(senha, 10);
      const { rows: userRows } = await client.query(
        `INSERT INTO usuarios (nome, email, senha_hash, papel, organizacao_id, precisa_trocar_senha, ativo)
         VALUES ($1, $2, $3, 'admin', $4, false, true) RETURNING id, nome, email, papel`,
        [sanitize(nome_responsavel), sanitize(email), hash, org.id]
      );
      const usuario = userRows[0];

      await client.query('COMMIT');

      await audit(pool, 'ORGANIZACAO_CADASTRADA', usuario.id, {
        org_id: org.id, org_nome: org.nome, email
      }, req);

      res.status(201).json({
        ok: true,
        mensagem: `Organização "${org.nome}" criada com sucesso! Faça login para começar.`,
        organizacao: { id: org.id, nome: org.nome },
        usuario: { nome: usuario.nome, email: usuario.email }
      });

    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ erro: 'Erro interno ao criar organização' });
    } finally {
      client.release();
    }
  });

  // GET /api/organizacoes/cadastro — verificar se email já existe (para UX em tempo real)
  router.get('/verificar-email', rateLimit(20, 60 * 1000), async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });
    try {
      const { rows } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [sanitize(email)]);
      res.json({ disponivel: rows.length === 0 });
    } catch (e) {
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  return router;
};
