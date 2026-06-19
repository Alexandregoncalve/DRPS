// ============================================================
// Critérios de Probabilidade — baseado na planilha original NeXa
// Cada critério tem opções com peso de 1 a 4/5, calculando uma
// sugestão de probabilidade final (1-Baixa, 2-Média, 3-Alta)
// ============================================================

const CRITERIOS_PROBABILIDADE = [
  {
    codigo: 'frequencia',
    categoria: 'Frequência',
    pergunta: 'Com que regularidade o risco psicossocial ocorre no ambiente de trabalho?',
    opcoes: [
      { valor: 1, label: 'Nunca' },
      { valor: 2, label: 'Raramente' },
      { valor: 3, label: 'Ocasionalmente' },
      { valor: 4, label: 'Frequentemente' },
      { valor: 5, label: 'Sempre' },
    ],
  },
  {
    codigo: 'duracao',
    categoria: 'Frequência',
    pergunta: 'Qual é a duração típica dos episódios desse risco?',
    opcoes: [
      { valor: 1, label: 'Menos de uma hora' },
      { valor: 2, label: 'Algumas horas' },
      { valor: 3, label: 'Um dia inteiro' },
      { valor: 4, label: 'Vários dias consecutivos' },
    ],
  },
  {
    codigo: 'abrangencia',
    categoria: 'Frequência',
    pergunta: 'Quantos colaboradores são afetados simultaneamente quando o risco ocorre?',
    opcoes: [
      { valor: 1, label: 'Nenhum' },
      { valor: 2, label: '1-2 colaboradores' },
      { valor: 3, label: '3-5 colaboradores' },
      { valor: 4, label: 'Mais de 5 colaboradores' },
    ],
  },
  {
    codigo: 'historico_registros',
    categoria: 'Histórico do Risco no Setor',
    pergunta: 'Há registros anteriores de incidentes relacionados a esse risco no setor?',
    opcoes: [
      { valor: 1, label: 'Não há registros' },
      { valor: 2, label: 'Registros esporádicos' },
      { valor: 3, label: 'Registros ocasionais' },
      { valor: 4, label: 'Registros frequentes' },
      { valor: 5, label: 'Registros constantes' },
    ],
  },
  {
    codigo: 'historico_gravidade',
    categoria: 'Histórico do Risco no Setor',
    pergunta: 'Qual foi a gravidade dos incidentes anteriores relacionados a esse risco?',
    opcoes: [
      { valor: 1, label: 'Nenhum impacto' },
      { valor: 2, label: 'Impacto leve' },
      { valor: 3, label: 'Impacto moderado' },
      { valor: 4, label: 'Impacto significativo' },
      { valor: 5, label: 'Impacto severo' },
    ],
  },
  {
    codigo: 'historico_causas',
    categoria: 'Histórico do Risco no Setor',
    pergunta: 'As causas desses incidentes foram identificadas e abordadas de forma eficaz?',
    opcoes: [
      { valor: 4, label: 'Não identificadas' },
      { valor: 3, label: 'Identificadas, mas não abordadas' },
      { valor: 2, label: 'Identificadas e parcialmente abordadas' },
      { valor: 1, label: 'Identificadas e totalmente abordadas' },
    ],
  },
  {
    codigo: 'recursos_medidas',
    categoria: 'Recursos Disponíveis',
    pergunta: 'Quais medidas preventivas estão atualmente implementadas para mitigar esse risco?',
    opcoes: [
      { valor: 5, label: 'Nenhuma medida' },
      { valor: 4, label: 'Medidas informais' },
      { valor: 3, label: 'Procedimentos formais documentados' },
      { valor: 2, label: 'Treinamentos regulares' },
      { valor: 1, label: 'Suporte psicológico disponível' },
    ],
  },
  {
    codigo: 'recursos_revisao',
    categoria: 'Recursos Disponíveis',
    pergunta: 'Com que frequência as medidas preventivas existentes são revisadas ou atualizadas?',
    opcoes: [
      { valor: 5, label: 'Nunca' },
      { valor: 4, label: 'Raramente' },
      { valor: 3, label: 'Anualmente' },
      { valor: 2, label: 'Semestralmente' },
      { valor: 1, label: 'Trimestralmente ou mais frequentemente' },
    ],
  },
  {
    codigo: 'recursos_conhecimento',
    categoria: 'Recursos Disponíveis',
    pergunta: 'Qual é o nível de conhecimento e treinamento dos gestores e colaboradores sobre as medidas de mitigação disponíveis?',
    opcoes: [
      { valor: 4, label: 'Nenhum conhecimento' },
      { valor: 3, label: 'Conhecimento básico' },
      { valor: 2, label: 'Conhecimento intermediário' },
      { valor: 1, label: 'Alto nível de conhecimento' },
    ],
  },
  {
    codigo: 'recursos_dedicados',
    categoria: 'Recursos Disponíveis',
    pergunta: 'Existem recursos dedicados para apoiar a implementação e monitoramento das medidas de mitigação?',
    opcoes: [
      { valor: 4, label: 'Não existem recursos dedicados' },
      { valor: 3, label: 'Recursos limitados disponíveis' },
      { valor: 2, label: 'Recursos adequados disponíveis' },
      { valor: 1, label: 'Recursos amplamente disponíveis e acessíveis' },
    ],
  },
];

// Calcula a sugestão de probabilidade (1, 2 ou 3) a partir das respostas
// respostas: { frequencia: 3, duracao: 2, ... }
function calcularSugestaoProbabilidade(respostas) {
  const codigos = CRITERIOS_PROBABILIDADE.map(c => c.codigo);
  const valores = codigos
    .filter(cod => respostas[cod] !== undefined && respostas[cod] !== null)
    .map(cod => respostas[cod]);

  if (valores.length === 0) return null;

  // Normaliza cada resposta para uma escala de 0 a 1 (já que as opções têm tamanhos diferentes)
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;

  // Faixas baseadas na média das pontuações (escala mista de 1-4/5)
  // Calibrado para gerar distribuição equilibrada entre Baixa/Média/Alta
  if (media <= 2) return 1;      // Baixa
  if (media <= 3.2) return 2;    // Média
  return 3;                       // Alta
}

module.exports = { CRITERIOS_PROBABILIDADE, calcularSugestaoProbabilidade };
