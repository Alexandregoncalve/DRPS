-- ============================================================
-- NeXa DRPS — Migração Fase 0: Segurança e Estabilidade
-- Execute no pgAdmin no banco "drps"
-- ============================================================

-- 1. COLUNAS QUE PODEM ESTAR FALTANDO
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS total_funcionarios INT;
ALTER TABLE setores ADD COLUMN IF NOT EXISTS total_funcionarios INT DEFAULT 0;
ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS total_respostas INT DEFAULT 0;

-- 2. IP HASH para proteção contra envio duplo
ALTER TABLE respostas ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64);

-- 3. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_token ON avaliacoes(token_anonimo);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_psicologo ON avaliacoes(psicologo_id);
CREATE INDEX IF NOT EXISTS idx_respostas_avaliacao ON respostas(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_respostas_ip ON respostas(avaliacao_id, ip_hash);
CREATE INDEX IF NOT EXISTS idx_setores_empresa ON setores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_resultados_avaliacao ON resultados(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- 4. TABELA DE AUDITORIA
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao VARCHAR(50) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  detalhes JSONB,
  ip VARCHAR(45),
  user_agent VARCHAR(200),
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_acao ON audit_log(acao);
CREATE INDEX IF NOT EXISTS idx_audit_criado ON audit_log(criado_em);

-- 5. DATA DE EXPIRAÇÃO nas avaliações
ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS data_expiracao DATE;

-- Definir expiração padrão de 2 anos para avaliações existentes
UPDATE avaliacoes
SET data_expiracao = criado_em::date + INTERVAL '2 years'
WHERE data_expiracao IS NULL;

-- 6. FUNÇÃO de exclusão automática de dados expirados
-- (Executa manualmente ou via pg_cron se instalado)
CREATE OR REPLACE FUNCTION excluir_dados_expirados()
RETURNS void AS $$
DECLARE
  aval_id UUID;
BEGIN
  FOR aval_id IN
    SELECT id FROM avaliacoes
    WHERE data_expiracao IS NOT NULL
    AND data_expiracao < CURRENT_DATE
  LOOP
    DELETE FROM respostas WHERE avaliacao_id = aval_id;
    DELETE FROM probabilidades WHERE avaliacao_id = aval_id;
    DELETE FROM resultados WHERE avaliacao_id = aval_id;
    DELETE FROM avaliacoes WHERE id = aval_id;
    RAISE NOTICE 'Avaliação % excluída por expiração', aval_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Para executar manualmente:
-- SELECT excluir_dados_expirados();

-- 7. VERIFICAÇÃO FINAL
SELECT
  (SELECT COUNT(*) FROM avaliacoes) as total_avaliacoes,
  (SELECT COUNT(*) FROM respostas) as total_respostas,
  (SELECT COUNT(*) FROM usuarios) as total_usuarios,
  (SELECT COUNT(*) FROM audit_log) as total_audit;
