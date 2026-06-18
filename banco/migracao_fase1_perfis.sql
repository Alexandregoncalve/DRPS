-- ============================================================
-- NeXa DRPS — Migração Fase 1: Perfis e Matriz/Filial
-- Execute no pgAdmin no banco "drps"
-- ============================================================

-- 1. TIPO e MATRIZ nas empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'matriz' CHECK (tipo IN ('matriz','filial'));
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS matriz_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- Todas as empresas existentes viram matrizes standalone
UPDATE empresas SET tipo = 'matriz' WHERE tipo IS NULL OR tipo = 'matriz';

-- 2. PERFIS nos usuários
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_papel_check
  CHECK (papel IN ('admin','psicologo','gestor_matriz','gestor_filial'));

-- Atualizar psicólogo de teste
UPDATE usuarios SET papel = 'psicologo' WHERE email = 'psi@drps.com';

-- 3. TABELA: psicólogo pode atender múltiplas empresas
CREATE TABLE IF NOT EXISTS psicologo_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psicologo_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(psicologo_id, empresa_id)
);

-- Vincular psicólogo de teste à empresa teste existente
INSERT INTO psicologo_empresa (psicologo_id, empresa_id)
SELECT u.id, e.id
FROM usuarios u, empresas e
WHERE u.email = 'psi@drps.com'
ON CONFLICT DO NOTHING;

-- 4. GESTOR vinculado a empresa (matriz ou filial)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_vinculada_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_empresas_matriz ON empresas(matriz_id);
CREATE INDEX IF NOT EXISTS idx_empresas_tipo ON empresas(tipo);
CREATE INDEX IF NOT EXISTS idx_psicologo_empresa_psi ON psicologo_empresa(psicologo_id);
CREATE INDEX IF NOT EXISTS idx_psicologo_empresa_emp ON psicologo_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_vinc ON usuarios(empresa_vinculada_id);

-- 6. VERIFICAÇÃO
SELECT
  (SELECT COUNT(*) FROM empresas WHERE tipo = 'matriz') as matrizes,
  (SELECT COUNT(*) FROM empresas WHERE tipo = 'filial') as filiais,
  (SELECT COUNT(*) FROM psicologo_empresa) as vinculos_psicologo,
  (SELECT COUNT(*) FROM usuarios) as total_usuarios;
