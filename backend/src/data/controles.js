// data/controles.js
// Catálogo completo de controles implantados conforme as imagens (Fig_12, Fig_13)

const CONTROLES = [
  // ── GOVERNANÇA E POLÍTICAS ──────────────────────────────────────────────
  {
    categoria: 'GOVERNANCA',
    codigo: 'canal_denuncias',
    nome: 'Canal de denúncias / ouvidoria',
    descricao: 'Canal formal, confidencial e com tratamento estruturado para denúncias de assédio, discriminação e violações éficas.',
  },
  {
    categoria: 'GOVERNANCA',
    codigo: 'politica_assedio',
    nome: 'Política antiassédio formalizada',
    descricao: 'Documento formal com regras, procedimentos de apuração e sanções para assédio moral e sexual.',
  },
  {
    categoria: 'GOVERNANCA',
    codigo: 'codigo_etica',
    nome: 'Código de ética / conduta',
    descricao: 'Documento com princípios éticos, comportamentos esperados e sanções, amplamente divulgado.',
  },
  {
    categoria: 'GOVERNANCA',
    codigo: 'comite_diversidade',
    nome: 'Comitê de diversidade e inclusão',
    descricao: 'Grupo formal dedicado a promover inclusão, combater vieses e garantir equidade.',
  },
  {
    categoria: 'GOVERNANCA',
    codigo: 'cipa_psicossocial',
    nome: 'CIPA com pauta psicossocial ativa',
    descricao: 'CIPA ou comissão similar que discute regularmente riscos psicossociais, não apenas físicos.',
  },

  // ── COMUNICAÇÃO E RELACIONAMENTO ────────────────────────────────────────
  {
    categoria: 'COMUNICACAO',
    codigo: 'pesquisa_clima',
    nome: 'Pesquisa de clima organizacional periódica',
    descricao: 'Aplicação regular (anual ou semestral) de pesquisa de clima com plano de ação consequente.',
  },
  {
    categoria: 'COMUNICACAO',
    codigo: 'reunioes_estruturadas',
    nome: 'Reuniões de equipe estruturadas',
    descricao: 'Rotina formal de reuniões de equipe com pauta, feedback e alinhamento de expectativas.',
  },
  {
    categoria: 'COMUNICACAO',
    codigo: 'comunicacao_transparente',
    nome: 'Política de comunicação transparente',
    descricao: 'Comunicação aberta da diretoria sobre decisões estratégicas, saúde financeira e mudanças.',
  },
  {
    categoria: 'COMUNICACAO',
    codigo: 'endomarketing',
    nome: 'Programa de endomarketing',
    descricao: 'Ações estruturadas para engajamento interno, divulgação de conquistas e cultura organizacional.',
  },
  {
    categoria: 'COMUNICACAO',
    codigo: 'mediacao_conflitos',
    nome: 'Processo formal de mediação de conflitos',
    descricao: 'Procedimento estruturado para mediação de conflitos interpessoais e entre equipes.',
  },

  // ── SAÚDE E BEM-ESTAR ────────────────────────────────────────────────────
  {
    categoria: 'SAUDE',
    codigo: 'eap',
    nome: 'EAP — Programa de Apoio ao Empregado',
    descricao: 'Programa de apoio psicológico confidencial com profissionais externos, disponível aos colaboradores e familiares.',
  },
  {
    categoria: 'SAUDE',
    codigo: 'promocao_saude',
    nome: 'Programa de promoção à saúde e bem-estar',
    descricao: 'Campanhas regulares de saúde, check-ups, ginástica laboral, nutrição, atividade física.',
  },

  // ── DESENVOLVIMENTO E CARREIRA ──────────────────────────────────────────
  {
    categoria: 'DESENVOLVIMENTO',
    codigo: 'pccs',
    nome: 'Plano de cargos, carreiras e salários (PCCS)',
    descricao: 'Estrutura formal com critérios transparentes de progressão e remuneração.',
  },
  {
    categoria: 'DESENVOLVIMENTO',
    codigo: 'pdi',
    nome: 'Plano de Desenvolvimento Individual (PDI)',
    descricao: 'Acompanhamento individual de metas de desenvolvimento com revisão periódica.',
  },
  {
    categoria: 'DESENVOLVIMENTO',
    codigo: 'capacitacao_tecnica',
    nome: 'Programa de capacitação técnica contínua',
    descricao: 'Acesso regular a treinamentos técnicos, cursos e certificações.',
  },
  {
    categoria: 'DESENVOLVIMENTO',
    codigo: 'reconhecimento',
    nome: 'Programa estruturado de reconhecimento',
    descricao: 'Sistema formal de reconhecimento por desempenho, bonificação e premiações.',
  },

  // ── ORGANIZAÇÃO DO TRABALHO ──────────────────────────────────────────────
  {
    categoria: 'ORGANIZACAO',
    codigo: 'descricao_cargos',
    nome: 'Descrição formal de cargos e responsabilidades',
    descricao: 'Documento formal e atualizado descrevendo atribuições, competências e entregas esperadas.',
  },
  {
    categoria: 'ORGANIZACAO',
    codigo: 'flexibilidade_jornada',
    nome: 'Flexibilidade de jornada / home office formal',
    descricao: 'Política formal de home office, banco de horas, horário flexível ou jornada híbrida.',
  },
  {
    categoria: 'ORGANIZACAO',
    codigo: 'rodizio_tarefas',
    nome: 'Rodízio formal de tarefas / funções',
    descricao: 'Sistema estruturado de rotação de atividades para evitar monotonia e sobrecarga.',
  },
  {
    categoria: 'ORGANIZACAO',
    codigo: 'gestao_participativa',
    nome: 'Gestão participativa / comitês de melhoria',
    descricao: 'Mecanismos formais de participação dos colaboradores em decisões e melhorias de processo.',
  },
  {
    categoria: 'ORGANIZACAO',
    codigo: 'mapeamento_processos',
    nome: 'Programa de simplificação/mapeamento de processos',
    descricao: 'Iniciativas regulares de revisão e simplificação de processos de trabalho.',
  },
];

const CATEGORIAS_LABEL = {
  GOVERNANCA:    'Governança e Políticas',
  COMUNICACAO:   'Comunicação e Relacionamento',
  SAUDE:         'Saúde e Bem-estar',
  DESENVOLVIMENTO: 'Desenvolvimento e Carreira',
  ORGANIZACAO:   'Organização do Trabalho',
  PERSONALIZADO: 'Controles Personalizados',
};

module.exports = { CONTROLES, CATEGORIAS_LABEL };
