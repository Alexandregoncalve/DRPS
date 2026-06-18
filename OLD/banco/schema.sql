-- ============================================================
-- DRPS - Diagnóstico de Riscos Psicossociais
-- Schema PostgreSQL
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- EMPRESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SETORES
-- ============================================================
CREATE TABLE IF NOT EXISTS setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  total_trabalhadores INT DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- USUÁRIOS (psicólogos e gestores)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  papel VARCHAR(20) NOT NULL CHECK (papel IN ('admin','psicologo','gestor')),
  crp VARCHAR(30),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AVALIAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id UUID NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
  psicologo_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  token_anonimo VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE,
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta','encerrada','processada')),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- RESPOSTAS (anônimas)
-- ============================================================
CREATE TABLE IF NOT EXISTS respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
  pergunta_num INT NOT NULL CHECK (pergunta_num BETWEEN 1 AND 47),
  valor_original INT NOT NULL CHECK (valor_original BETWEEN 1 AND 5),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PROBABILIDADES (inseridas pelo psicólogo por tópico)
-- ============================================================
CREATE TABLE IF NOT EXISTS probabilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
  topico_num INT NOT NULL CHECK (topico_num BETWEEN 1 AND 13),
  valor INT NOT NULL CHECK (valor BETWEEN 1 AND 3),
  UNIQUE(avaliacao_id, topico_num)
);

-- ============================================================
-- RESULTADOS (calculados automaticamente)
-- ============================================================
CREATE TABLE IF NOT EXISTS resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
  topico_num INT NOT NULL,
  topico_nome VARCHAR(100) NOT NULL,
  media_gravidade FLOAT,
  classif_gravidade VARCHAR(10),
  media_probabilidade FLOAT,
  classif_probabilidade VARCHAR(10),
  matriz_risco VARCHAR(10),
  fonte_geradora TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(avaliacao_id, topico_num)
);

-- ============================================================
-- DADOS INICIAIS: inserir empresa e psicólogo de teste
-- ============================================================
INSERT INTO empresas (id, nome, cnpj) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Empresa Teste', '00.000.000/0001-00')
ON CONFLICT DO NOTHING;

INSERT INTO setores (empresa_id, nome, total_trabalhadores) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Administrativo', 10),
  ('00000000-0000-0000-0000-000000000001', 'Operacional', 20),
  ('00000000-0000-0000-0000-000000000001', 'Comercial', 15)
ON CONFLICT DO NOTHING;

-- Senha padrão: drps@2025 (hash bcrypt)
INSERT INTO usuarios (empresa_id, nome, email, senha_hash, papel, crp) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Psicólogo Teste',
   'psi@drps.com',
   '$2b$10$YGmxbqmVPTzixW5O3LdxqOsKDnJ5Rl2FY5hOGJl4/.UW8PGjXaRVe',
   'psicologo',
   'CRP 00/000000')
ON CONFLICT DO NOTHING;
