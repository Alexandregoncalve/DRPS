async function audit(pool, acao, usuarioId, detalhes, req) {
  try {
    await pool.query(
      'INSERT INTO audit_log (acao, usuario_id, detalhes, ip, user_agent) VALUES ($1,$2,$3,$4,$5)',
      [acao, usuarioId || null, JSON.stringify(detalhes),
       req?.ip || null, req?.headers?.['user-agent']?.slice(0, 200) || null]
    );
  } catch (e) {
    console.error('Audit log falhou:', e.message);
  }
}

module.exports = { audit };
