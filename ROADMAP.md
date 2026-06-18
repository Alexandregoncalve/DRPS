# DRPS — Roadmap do Projeto
*Última atualização: Junho 2026*

---

## ⚠️ FASE 0 — Correções urgentes na estrutura atual (1 semana)

Antes de avançar, corrigir:

- [ ] Rate limiting nas rotas da API (evitar abuso)
- [ ] Índices no banco: `token_anonimo`, `avaliacao_id`
- [ ] Proteção contra envio duplo de respostas
- [ ] Log de auditoria (quem fez o quê e quando)
- [ ] Revogação de JWT (blacklist de tokens inválidos)
- [ ] Validação e sanitização de todos os inputs
- [ ] 🔒 Criptografia AES-256 das respostas no banco
- [ ] 🔒 Chave de criptografia separada do banco (variável de ambiente segura)

---

## ✅ FASE 1 — MVP local (Concluído)

- [x] Login do psicólogo
- [x] Cadastro de empresa e setores (com total de funcionários)
- [x] Link anônimo por avaliação
- [x] Formulário com 47 perguntas organizadas por tópico
- [x] Cálculo de gravidade direta/invertida NR-01
- [x] Matriz de risco por tópico (Gravidade × Probabilidade)
- [x] Contador de respostas por setor com barra de progresso
- [x] Banco PostgreSQL local com ngrok para acesso externo

---

## 🔵 FASE 2 — Colaboradores + token individual (2–3 semanas)

- [ ] Importar Excel/PDF: nome, e-mail, telefone, setor/departamento
- [ ] Geração de token UUID único e criptografado por colaborador
- [ ] ⏱ Token expira após prazo configurável (ex: 10 dias úteis)
- [ ] Token invalidado definitivamente ao concluir o questionário
- [ ] Envio automático do link personalizado por e-mail
- [ ] Painel mostrando quem respondeu (SEM cruzar com respostas — LGPD)
- [ ] Reenvio automático para quem não respondeu antes do prazo
- [ ] Contador real: X de Y responderam por setor
- [ ] 🔒 Dados pessoais criptografados separadamente das respostas
- [ ] Consentimento LGPD obrigatório na abertura do formulário
- [ ] ⏱ Expiração automática do link após data configurável

---

## 🟣 FASE 3 — Relatório e laudo NR-01 (2–3 semanas)

- [ ] Geração de PDF do laudo completo por setor
- [ ] Campos qualitativos preenchidos pelo psicólogo (fonte geradora, medidas)
- [ ] Assinatura digital com CRP do responsável
- [ ] Plano de ação com medidas de controle sugeridas
- [ ] Histórico completo de avaliações por empresa
- [ ] Comparativo de evolução entre avaliações ao longo do tempo
- [ ] Exportar dados para Excel
- [ ] Dashboard executivo somente leitura para o gestor
- [ ] ⏱ Retenção configurável por avaliação (padrão: 2 anos após conclusão)
- [ ] ⏱ Exclusão automática após expiração (pg_cron ou job noturno)
- [ ] ⏱ Notificação 30 dias antes da exclusão automática
- [ ] 🔒 PDF gerado com chave de assinatura única por empresa

---

## 🟡 FASE 4 — Plataforma web pública multicliente (4–6 semanas)

- [ ] Migração para nuvem (Vercel + Supabase)
- [ ] Domínio próprio com HTTPS
- [ ] Planos e cobrança (Stripe)
- [ ] Multitenancy: cada empresa completamente isolada no banco
- [ ] Painel administrativo central (você gerencia todas as empresas)
- [ ] Convite e gestão de psicólogos por empresa
- [ ] 🔒 Criptografia por tenant (chave AES separada por empresa)
- [ ] 🔒 Política de privacidade e termos de uso publicados
- [ ] ⏱ Ciclo de vida de dados configurável por empresa
- [ ] 🔒 Contrato de operação de dados (DPA) por empresa-cliente
- [ ] Backup criptografado automático diário

---

## 🟢 FASE 5 — Inteligência e automação (Contínuo)

- [ ] IA gerando rascunho do laudo automaticamente
- [ ] Alertas de risco crítico enviados por e-mail ao psicólogo
- [ ] Benchmarking anônimo entre setores do mesmo setor econômico
- [ ] Sugestões automáticas de medidas de controle por tópico
- [ ] ⏱ Agendamento automático de reavaliações periódicas
- [ ] 🔒 Auditoria completa de acesso e exportação de dados
- [ ] API para integração com sistemas de RH
- [ ] App mobile para colaboradores responderem pelo celular
- [ ] Certificação e conformidade NR-01 documentada

---

## Legenda

- 🔒 Segurança e criptografia
- ⏱ Expiração, retenção e exclusão automática de dados
- ✅ Concluído
- [ ] Pendente

---

## Considerações LGPD

A partir da Fase 2, com importação de dados pessoais (nome, e-mail, telefone), é obrigatório:

1. **Base legal**: legítimo interesse do empregador ou consentimento explícito
2. **Informação clara**: colaborador deve ser informado do uso dos dados antes de responder
3. **Separação**: dados pessoais NUNCA podem ser cruzados com as respostas do questionário
4. **Contrato**: DPA (Data Processing Agreement) entre você (operador) e cada empresa-cliente (controlador)
5. **Retenção mínima**: excluir dados quando não forem mais necessários
6. **Direitos do titular**: colaborador pode solicitar exclusão dos seus dados a qualquer momento

> Recomendado: consultar advogado especializado em LGPD antes do lançamento público.
