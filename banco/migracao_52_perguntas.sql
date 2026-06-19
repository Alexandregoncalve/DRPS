-- ============================================================
-- NeXa DRPS — Migração: Expandir questionário para 52 perguntas
-- Adiciona o tópico 13 (Trabalho remoto e isolado) com perguntas próprias
-- Execute no pgAdmin no banco "drps"
-- ============================================================

-- Remover constraint antiga que limitava a 47 perguntas
ALTER TABLE respostas DROP CONSTRAINT IF EXISTS respostas_pergunta_num_check;

-- Nova constraint permitindo até 52 perguntas
ALTER TABLE respostas ADD CONSTRAINT respostas_pergunta_num_check
  CHECK (pergunta_num BETWEEN 1 AND 52);

-- Verificação
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'respostas'::regclass;
