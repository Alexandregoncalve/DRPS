// audit_log real: id, acao, usuario_id, detalhes, ip, user_agent, criado_em
// + colunas novas adicionadas na migration v3: usuario_email, entidade, entidade_id

async function registrarAuditoria(pool, { usuarioId, usuarioEmail, acao, entidade, entidadeId, detalhes, ip, userAgent }) {
  try {
    await pool.query(
      `INSERT INTO audit_log
         (acao, usuario_id, usuario_email, entidade, entidade_id, detalhes, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        acao,
        usuarioId    || null,
        usuarioEmail || null,
        entidade     || null,
        entidadeId   ? String(entidadeId) : null,
        detalhes     ? JSON.stringify(detalhes) : null,
        ip           || null,
        userAgent    || null,
      ]
    );
  } catch (err) {
    console.error('[audit]', err.message);
  }
}

module.exports = { registrarAuditoria };
