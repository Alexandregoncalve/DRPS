// data/nr01.js
// Dados normativos completos NR-01 / Portaria MTE 1.419/2024
// Guia MTE 2025 + Diretrizes Fundacentro 2026

// ── 13 Fatores de Risco MTE ─────────────────────────────────────────────────
// Mapeamento: fator MTE → dimensões COPSOQ II (tópicos do sistema)
const FATORES_MTE = [
  {
    num: '01',
    nome: 'Assédio de qualquer natureza no trabalho',
    descricao: 'Condutas abusivas, repetitivas e prolongadas — verbais, gestuais ou físicas — que humilham, constrangem ou ameaçam o trabalhador. Inclui assédio moral, sexual, organizacional, virtual e político/eleitoral (Cartilha Amarela MTE 2025).',
    topicos_copsoq: [1], // Assédio
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '02',
    nome: 'Má gestão de mudanças organizacionais',
    descricao: 'Mudanças impostas sem consulta, planejamento ou comunicação adequada — reestruturações, fusões, troca de chefias, mudanças de processo — gerando insegurança e perda de trabalho.',
    topicos_copsoq: [3], // Má gestão de mudanças
    possivel_agravo: 'Transtorno mental; DORT',
  },
  {
    num: '03',
    nome: 'Baixa clareza de papel/função',
    descricao: 'Falta das atribuições, objetivos, responsabilidades e limites de cargo. Trabalhador não sabe o que se espera dele nem como será avaliado.',
    topicos_copsoq: [4], // Clareza de papel
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '04',
    nome: 'Baixas recompensas e reconhecimento',
    descricao: 'Desequilíbrio entre o esforço empregado e as recompensas recebidas (salário, reconhecimento, oportunidades de desenvolvimento, estabilidade). Modelo Effort-Reward Imbalance (Siegrist).',
    topicos_copsoq: [5], // Reconhecimento
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '05',
    nome: 'Falta de suporte/apoio no trabalho',
    descricao: 'Ausência de apoio prático ou emocional de chefias e colegas, isolamento social na equipe, dificuldade de obter ajuda quando necessário.',
    topicos_copsoq: [2], // Suporte/apoio
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '06',
    nome: 'Baixo controle no trabalho / Falta de autonomia',
    descricao: 'Restrição da capacidade do trabalhador de decidir como, quando e em que ritmo executar suas atividades — controle sobre o método, ritmo e ordem das tarefas.',
    topicos_copsoq: [6], // Autonomia
    possivel_agravo: 'Transtorno mental; DORT',
  },
  {
    num: '07',
    nome: 'Baixa justiça organizacional',
    descricao: 'Percepção de que promoções, punições, sugestões e elogios são tratados de forma desigual e com favoritismo.',
    topicos_copsoq: [7], // Justiça
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '08',
    nome: 'Eventos violentos ou traumáticos',
    descricao: 'Exposição a situações de violência física ou psicológica, acidentes graves, assaltos, mortes no ambiente de trabalho ou situações de extremo estresse.',
    topicos_copsoq: [8], // Eventos traumáticos
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '09',
    nome: 'Baixa demanda no trabalho (subcarga)',
    descricao: 'Subutilização de competências, tarefas repetitivas e sem desafio, ociosidade imposta, sensação de inutilidade.',
    topicos_copsoq: [9], // Subcarga
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '10',
    nome: 'Excesso de demandas no trabalho (sobrecarga)',
    descricao: 'Volume de trabalho percebido como excessivo; sobrecarga, prazos apertados e acúmulo de tarefas em relação ao tempo disponível.',
    topicos_copsoq: [10], // Sobrecarga
    possivel_agravo: 'Transtorno mental; DORT',
  },
  {
    num: '11',
    nome: 'Más relações no local de trabalho',
    descricao: 'Frequência de conflitos e tensões entre colegas ou setores — desentendimentos, disputas e atritos no cotidiano.',
    topicos_copsoq: [11], // Relacionamentos
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '12',
    nome: 'Trabalho em condições de difícil comunicação',
    descricao: 'Dificuldades estruturais de comunicação — turnos desalinhados, distância física, falha nos meios, barreiras de idioma ou tecnologia.',
    topicos_copsoq: [12], // Comunicação difícil
    possivel_agravo: 'Transtorno mental',
  },
  {
    num: '13',
    nome: 'Trabalho remoto e isolado',
    descricao: 'Isolamento social decorrente do trabalho remoto ou de atividades realizadas sem contato regular com colegas e lideranças.',
    topicos_copsoq: [13], // Trabalho remoto
    possivel_agravo: 'Transtorno mental; Fadiga',
  },
];

// ── Fontes, Circunstâncias e Agravos por tópico ─────────────────────────────
// NR-01 item 1.5.4.4.6.1 — Portaria MTE 1.419/2024
const INVENTARIO_FONTES = {
  1: {
    fator_pgr: 'Assédio de qualquer natureza no trabalho',
    fontes_geradoras: [
      'Cultura permissiva a desrespeito e condutas abusivas',
      'Ausência de canal de denúncia efetivo e confidencial',
      'Liderança despreparada para lidar com conflitos interpessoais',
      'Hierarquia rígida com concentração de poder',
      'Ausência de política formal de conduta e ética',
    ],
    circunstancias_exposicao: [
      'Em interações cotidianas entre colegas, especialmente em situações de competição por recurso/promoção',
      'Em comunicação de erros e em projetos de colaboração inter-equipes',
      'Durante reuniões formais e informais com presença de hierarquia',
      'Em ambientes de trabalho com alta rotatividade de lideranças',
    ],
    possiveis_agravos: [
      'Ansiedade interpessoal e queda de cooperação',
      'Sintomas depressivos e deterioração do clima organizacional',
      'Queda de produtividade e aumento de absenteísmo',
      'Transtorno de estresse pós-traumático (TEPT)',
    ],
  },
  2: {
    fator_pgr: 'Falta de suporte/apoio no trabalho',
    fontes_geradoras: [
      'Liderança ausente ou inacessível',
      'Falta de escuta ativa dos gestores',
      'Cobrança de resultados sem acompanhamento ou recursos adequados',
      'RH pouco atuante nas questões do cotidiano de trabalho',
      'Isolamento de trabalhadores em funções especializadas',
    ],
    circunstancias_exposicao: [
      'Durante situações de sobrecarga sem respaldo do gestor',
      'Em momentos de dificuldade técnica sem acesso a suporte especializado',
      'Quando o trabalhador enfrenta conflitos interpessoais sem mediação',
      'Em períodos de mudanças organizacionais sem comunicação adequada',
    ],
    possiveis_agravos: [
      'Estresse, desmotivação e queda de engajamento',
      'Sintomas depressivos e burnout',
      'Doenças cardiovasculares (literatura associa baixa autonomia + alta exigência ao risco cardíaco)',
      'Aumento de erros e acidentes de trabalho',
    ],
  },
  3: {
    fator_pgr: 'Má gestão de mudanças organizacionais',
    fontes_geradoras: [
      'Reestruturações impostas sem consulta prévia aos trabalhadores',
      'Comunicação insuficiente sobre objetivos e impactos das mudanças',
      'Fusões e aquisições sem plano de integração de equipes',
      'Troca frequente de lideranças sem transição planejada',
    ],
    circunstancias_exposicao: [
      'Durante implementação de novos processos ou sistemas sem treinamento adequado',
      'Em períodos de reestruturação com ameaça de demissões',
      'Quando há mudança de chefia sem alinhamento de expectativas',
      'Durante fusões ou incorporações de empresas',
    ],
    possiveis_agravos: [
      'Insegurança laboral e ansiedade antecipatória',
      'Resistência ao trabalho e queda de produtividade',
      'Transtornos mentais relacionados à incerteza',
      'DORT decorrente de adaptação a novos métodos de trabalho',
    ],
  },
  4: {
    fator_pgr: 'Baixa clareza de papel/função',
    fontes_geradoras: [
      'Ausência de descrição formal e atualizada de cargos',
      'Ordens contraditórias de múltiplos superiores',
      'Sobreposição de funções entre cargos diferentes',
      'Falta de alinhamento entre expectativas e responsabilidades reais',
    ],
    circunstancias_exposicao: [
      'Ao receber demandas conflitantes de diferentes lideranças',
      'Em situações de avaliação de desempenho sem critérios claros',
      'Quando o trabalhador assume responsabilidades não previstas no cargo',
      'Em ambientes com alta rotatividade onde procedimentos não são documentados',
    ],
    possiveis_agravos: [
      'Ansiedade por incerteza sobre expectativas',
      'Conflitos interpessoais por sobreposição de responsabilidades',
      'Desmotivação e queda de engajamento',
      'Transtornos de adaptação ao trabalho',
    ],
  },
  5: {
    fator_pgr: 'Baixas recompensas e reconhecimento',
    fontes_geradoras: [
      'Ausência de feedback estruturado e regular',
      'Foco exclusivo em métricas de resultado sem reconhecimento de esforço',
      'Reconhecimento desigual ou percebido como injusto',
      'Remuneração abaixo do mercado ou sem progressão clara',
    ],
    circunstancias_exposicao: [
      'Após entregas relevantes sem reconhecimento formal ou informal',
      'Em processos de promoção percebidos como injustos',
      'Quando há disparidade salarial entre colegas em funções equivalentes',
      'Em ambientes de alta competição interna sem critérios transparentes',
    ],
    possiveis_agravos: [
      'Desmotivação crônica e queda de engajamento',
      'Síndrome de burnout por esforço sem recompensa',
      'Intenção de desligamento e turnover elevado',
      'Sintomas depressivos relacionados à desvalorização percebida',
    ],
  },
  6: {
    fator_pgr: 'Baixo controle no trabalho / Falta de autonomia',
    fontes_geradoras: [
      'Estrutura hierárquica rígida que centraliza decisões',
      'Ausência de mecanismos formais de consulta à equipe',
      'Processos engessados sem espaço para adaptação local',
      'Monitoramento excessivo de produtividade (microgestão)',
    ],
    circunstancias_exposicao: [
      'Durante toda a jornada de trabalho, especialmente em decisões sobre como executar a própria atividade',
      'Na escolha de ferramentas, ordenação de tarefas e mudanças de processo impostas sem consulta',
      'Em ambientes de call center, linha de produção ou atividades altamente padronizadas',
    ],
    possiveis_agravos: [
      'Estresse, desmotivação e sintomas depressivos',
      'Queda de engajamento e sentimento de impotência',
      'Doenças cardiovasculares (literatura associa baixa autonomia + alta exigência ao risco cardíaco)',
      'DORT em funções com alto controle externo do ritmo de trabalho',
    ],
  },
  7: {
    fator_pgr: 'Baixa justiça organizacional',
    fontes_geradoras: [
      'Critérios de promoção e avaliação não transparentes',
      'Favorecimento de determinados grupos ou indivíduos',
      'Processos disciplinares percebidos como desiguais',
      'Falta de canal seguro para questionar decisões',
    ],
    circunstancias_exposicao: [
      'Em processos de promoção interna sem critérios divulgados',
      'Durante avaliações de desempenho sem devolutiva estruturada',
      'Em situações de aplicação desigual de regras e políticas',
      'Quando sugestões dos trabalhadores são sistematicamente ignoradas',
    ],
    possiveis_agravos: [
      'Ressentimento e conflitos interpessoais',
      'Queda de comprometimento organizacional',
      'Sintomas ansiosos e depressivos',
      'Comportamentos contraproducentes no trabalho',
    ],
  },
  8: {
    fator_pgr: 'Eventos violentos ou traumáticos',
    fontes_geradoras: [
      'Falta de protocolos de segurança para situações de crise',
      'Ausência de treinamento em gestão de situações críticas',
      'Exposição a acidentes graves ou mortes no ambiente de trabalho',
      'Falta de suporte psicológico pós-evento',
    ],
    circunstancias_exposicao: [
      'Em atividades com risco de assalto ou violência de terceiros',
      'Durante ou após acidentes de trabalho com vítimas',
      'Em funções de atendimento de emergência ou alta tensão social',
      'Em ambientes de trabalho em zonas de conflito ou vulnerabilidade social',
    ],
    possiveis_agravos: [
      'Transtorno de Estresse Pós-Traumático (TEPT)',
      'Fobias e esquiva comportamental',
      'Sintomas dissociativos e flashbacks',
      'Depressão e ansiedade crônica',
    ],
  },
  9: {
    fator_pgr: 'Baixa demanda no trabalho (subcarga)',
    fontes_geradoras: [
      'Má distribuição de tarefas e responsabilidades',
      'Subutilização de competências dos trabalhadores',
      'Automação sem requalificação dos trabalhadores',
      'Funções com baixo nível de complexidade e desafio',
    ],
    circunstancias_exposicao: [
      'Em atividades monotonamente repetitivas sem variação',
      'Quando o trabalhador possui qualificação superior às exigências do cargo',
      'Em períodos de baixa demanda do negócio sem redirecionamento de tarefas',
      'Em funções de vigilância passiva com longos períodos de inatividade',
    ],
    possiveis_agravos: [
      'Tédio crônico e deterioração de habilidades',
      'Desmotivação e queda de autoestima profissional',
      'Sintomas depressivos por falta de senso de propósito',
      'Propensão a comportamentos de risco por falta de ocupação',
    ],
  },
  10: {
    fator_pgr: 'Excesso de demandas no trabalho (sobrecarga)',
    fontes_geradoras: [
      'Metas irrealistas sem adequação à capacidade da equipe',
      'Equipe insuficiente para o volume de trabalho existente',
      'Acúmulo de funções sem aumento de recursos',
      'Cultura organizacional que valoriza horas extras como dedicação',
    ],
    circunstancias_exposicao: [
      'Em períodos de pico de demanda sem contratação temporária',
      'Quando há redução de equipe sem redução proporcional de tarefas',
      'Em funções com múltiplos interlocutores e demandas simultâneas',
      'Durante implementação de projetos com prazos curtos e recursos limitados',
    ],
    possiveis_agravos: [
      'Fadiga mental e física crônica',
      'Burnout e esgotamento profissional',
      'Doenças cardiovasculares associadas a jornadas prolongadas',
      'DORT por execução de tarefas além da capacidade ergonômica',
    ],
  },
  11: {
    fator_pgr: 'Más relações no local de trabalho',
    fontes_geradoras: [
      'Comunicação agressiva ou passivo-agressiva entre pares',
      'Rivalidade interna por recursos, espaço ou reconhecimento',
      'Conflitos mal geridos pela liderança',
      'Ausência de normas de convivência e respeito mútuo',
    ],
    circunstancias_exposicao: [
      'Em ambientes de alta competição interna entre colegas',
      'Durante trabalhos em equipe com histórico de conflitos não resolvidos',
      'Em setores com alta pressão e metas individuais excludentes',
      'Quando há divisão de grupos (panelinhas) que excluem outros',
    ],
    possiveis_agravos: [
      'Estresse interpessoal e ansiedade social no trabalho',
      'Isolamento voluntário e queda de colaboração',
      'Sintomas depressivos e burnout de relacionamento',
      'Aumento de conflitos e comportamentos agressivos',
    ],
  },
  12: {
    fator_pgr: 'Trabalho em condições de difícil comunicação',
    fontes_geradoras: [
      'Turnos desalinhados sem sobreposição para repasse de informações',
      'Distância física entre equipes sem canais adequados',
      'Falha ou ausência de ferramentas de comunicação adequadas',
      'Barreiras de idioma em equipes multiculturais',
    ],
    circunstancias_exposicao: [
      'Em trabalhos por turnos sem protocolo formal de passagem de informações',
      'Em operações distribuídas geograficamente sem sistema integrado',
      'Quando há mudança de liderança sem transferência de conhecimento',
      'Em ambientes com ruído físico intenso que impede comunicação verbal',
    ],
    possiveis_agravos: [
      'Erros operacionais por falha de comunicação',
      'Frustração e conflitos por mal-entendidos recorrentes',
      'Sensação de isolamento mesmo em equipe presencial',
      'Ansiedade por falta de informação sobre decisões que afetam o trabalho',
    ],
  },
  13: {
    fator_pgr: 'Trabalho remoto e isolado',
    fontes_geradoras: [
      'Falta de acompanhamento regular do gestor ao trabalhador remoto',
      'Comunicação exclusivamente digital sem interação humana presencial',
      'Ausência de política clara de home office e limites de jornada',
      'Dificuldade de separação entre vida profissional e pessoal',
    ],
    circunstancias_exposicao: [
      'Durante toda a jornada de trabalho em regime home office integral',
      'Em funções de campo isoladas com baixo contato com a equipe',
      'Em atividades noturnas ou em fins de semana sem suporte disponível',
      'Quando o trabalhador mora sozinho e o trabalho é o único contato social',
    ],
    possiveis_agravos: [
      'Isolamento social e solidão profissional',
      'Síndrome de burnout por falta de desconexão',
      'Transtornos ansiosos e depressivos por ausência de vínculos',
      'Fadiga crônica por ausência de ritmo e estrutura do trabalho presencial',
    ],
  },
};

// ── Glossário de dimensões COPSOQ II ────────────────────────────────────────
const GLOSSARIO = [
  {
    tema: 'Exigências do trabalho',
    dimensoes: [
      { nome: 'Excesso de demandas (sobrecarga)', def: 'Volume de trabalho percebido; sobrecarga, prazos apertados e acúmulo de tarefas em relação ao tempo disponível.' },
      { nome: 'Subcarga de trabalho', def: 'Subutilização de competências; tarefas aquém da qualificação do trabalhador.' },
      { nome: 'Trabalho em condições de difícil comunicação', def: 'Dificuldades estruturais de comunicação entre equipes, turnos ou locais de trabalho.' },
    ],
  },
  {
    tema: 'Organização e gestão',
    dimensoes: [
      { nome: 'Autonomia / Controle no trabalho', def: 'Capacidade de decidir como, quando e em que ritmo executar as próprias tarefas.' },
      { nome: 'Clareza de papel/função', def: 'Clareza sobre o que é esperado do colaborador: responsabilidades, prioridades e limites do cargo.' },
      { nome: 'Má gestão de mudanças', def: 'Mudanças organizacionais impostas sem consulta, comunicação ou planejamento adequados.' },
    ],
  },
  {
    tema: 'Relações sociais e liderança',
    dimensoes: [
      { nome: 'Assédio de qualquer natureza', def: 'Condutas abusivas, repetitivas e prolongadas que humilham, constrangem ou ameaçam o trabalhador.' },
      { nome: 'Suporte/apoio no trabalho', def: 'Disponibilidade de apoio prático e emocional de colegas e lideranças quando o trabalhador precisa.' },
      { nome: 'Justiça organizacional', def: 'Percepção de que conflitos, promoções, sugestões e elogios são tratados de forma equânime e sem favoritismo.' },
      { nome: 'Recompensas e reconhecimento', def: 'Reconhecimento recebido pelo esforço — inclui feedback, valorização e tratamento justo.' },
      { nome: 'Relações interpessoais', def: 'Frequência de conflitos e tensões entre colegas ou setores.' },
    ],
  },
  {
    tema: 'Interface trabalho-vida',
    dimensoes: [
      { nome: 'Trabalho remoto e isolado', def: 'Isolamento social decorrente do trabalho remoto ou de atividades realizadas sem contato regular com colegas.' },
      { nome: 'Eventos violentos ou traumáticos', def: 'Exposição a situações de violência, acidentes graves ou situações de extremo estresse no trabalho.' },
    ],
  },
];

// ── Matriz AIHA 5×5 — níveis de risco ───────────────────────────────────────
// Conversão automática COPSOQ → AIHA
// Severidade: derivada do percentual da zona (score COPSOQ)
// Probabilidade: estimada percentualmente (do score na zona de risco)
const NIVEIS_AIHA = [
  { pxs_min: 1,  pxs_max: 2,  nivel: 'Trivial',      cor: '#4ade80', texto: '#14532d' },
  { pxs_min: 3,  pxs_max: 3,  nivel: 'Tolerável',    cor: '#86efac', texto: '#14532d' },
  { pxs_min: 4,  pxs_max: 8,  nivel: 'Moderado',     cor: '#fbbf24', texto: '#78350f' },
  { pxs_min: 9,  pxs_max: 14, nivel: 'Substancial',  cor: '#f97316', texto: '#7c2d12' },
  { pxs_min: 15, pxs_max: 25, nivel: 'Intolerável',  cor: '#ef4444', texto: '#7f1d1d' },
];

function calcularNivelAIHA(pxs) {
  const n = NIVEIS_AIHA.find(n => pxs >= n.pxs_min && pxs <= n.pxs_max);
  return n || { nivel: '—', cor: '#94a3b8', texto: '#1e293b' };
}

// Converte score COPSOQ (1-5) → Severidade AIHA (1-5)
// Score alto = risco alto = severidade alta
function copsoqParaSeveridade(mediaGravidade) {
  if (!mediaGravidade) return 3;
  if (mediaGravidade >= 4.0) return 5;
  if (mediaGravidade >= 3.5) return 4;
  if (mediaGravidade >= 2.5) return 3;
  if (mediaGravidade >= 1.5) return 2;
  return 1;
}

// Converte probabilidade COPSOQ (1-3) → Probabilidade AIHA (1-5)
function copsoqParaProbabilidadeAIHA(probCopsoq) {
  if (!probCopsoq) return 2;
  if (probCopsoq >= 3) return 4; // Alta → Provável
  if (probCopsoq >= 2) return 3; // Média → Possível
  return 2;                       // Baixa → Pouco provável
}

const LABELS_SEVERIDADE = ['', 'Leve', 'Baixa', 'Moderada', 'Alta', 'Extrema'];
const LABELS_PROBABILIDADE = ['', 'Rara', 'Pouco Provável', 'Possível', 'Provável', 'Muito Provável'];

module.exports = {
  FATORES_MTE,
  INVENTARIO_FONTES,
  GLOSSARIO,
  NIVEIS_AIHA,
  NIVEIS_AIHA,
  calcularNivelAIHA,
  copsoqParaSeveridade,
  copsoqParaProbabilidadeAIHA,
  LABELS_SEVERIDADE,
  LABELS_PROBABILIDADE,
};
