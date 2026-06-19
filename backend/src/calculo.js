// ============================================================
// Motor de Cálculo DRPS - NR-01
// ============================================================

// Definição das perguntas: lógica direta (D) ou invertida (I)
// D = quanto maior a resposta, maior o risco
// I = quanto maior a resposta, menor o risco
const LOGICA_PERGUNTAS = {
  1:'D', 2:'I', 3:'I', 4:'D', 5:'I',   // Tópico 01 - Assédio
  6:'I', 7:'I', 8:'I', 9:'I', 10:'I',  // Tópico 02 - Suporte
  11:'D', 12:'I', 13:'D', 14:'I',       // Tópico 03 - Mudanças
  15:'I', 16:'I', 17:'I', 18:'I',       // Tópico 04 - Clareza
  19:'I', 20:'I', 21:'D',               // Tópico 05 - Reconhecimento
  22:'I', 23:'I', 24:'D', 25:'D',       // Tópico 06 - Autonomia
  26:'I', 27:'I', 28:'I', 29:'D',       // Tópico 07 - Justiça
  30:'D', 31:'D', 32:'D',               // Tópico 08 - Eventos traumáticos
  33:'D', 34:'D', 35:'D', 36:'D',       // Tópico 09 - Subcarga
  37:'D', 38:'D', 39:'D', 40:'I',       // Tópico 10 - Sobrecarga
  41:'D', 42:'D', 43:'I',               // Tópico 11 - Relacionamentos
  44:'D', 45:'D', 46:'D', 47:'I',       // Tópico 12 - Comunicação difícil
  48:'D', 49:'D', 50:'D', 51:'D', 52:'I', // Tópico 13 - Trabalho remoto e isolado
};

// Perguntas por tópico
const TOPICOS = [
  { num: 1,  nome: 'Assédio de qualquer natureza no trabalho',          perguntas: [1,2,3,4,5],    fonte: 'Cultura permissiva a desrespeito; ausência de canal de denúncia; liderança despreparada.' },
  { num: 2,  nome: 'Falta de suporte/apoio no trabalho',                perguntas: [6,7,8,9,10],   fonte: 'Liderança ausente; falta de escuta; cobrança sem acompanhamento; RH pouco atuante.' },
  { num: 3,  nome: 'Má gestão de mudanças organizacionais',             perguntas: [11,12,13,14],  fonte: 'Comunicação inadequada; mudanças abruptas; falta de planejamento.' },
  { num: 4,  nome: 'Baixa clareza de papel/função',                     perguntas: [15,16,17,18],  fonte: 'Falta de definição de responsabilidades; ordens contraditórias; comunicação confusa.' },
  { num: 5,  nome: 'Baixas recompensas e reconhecimento',               perguntas: [19,20,21],     fonte: 'Ausência de feedback; foco exclusivo em metas; reconhecimento desigual.' },
  { num: 6,  nome: 'Baixo controle no trabalho / Falta de autonomia',   perguntas: [22,23,24,25],  fonte: 'Microgestão; excesso de burocracia; centralização de decisões.' },
  { num: 7,  nome: 'Baixa justiça organizacional',                      perguntas: [26,27,28,29],  fonte: 'Critérios pouco transparentes; favorecimento; desigualdade de tratamento.' },
  { num: 8,  nome: 'Eventos violentos ou traumáticos',                  perguntas: [30,31,32],     fonte: 'Falta de protocolos de segurança; ausência de treinamento; falta de suporte pós-evento.' },
  { num: 9,  nome: 'Baixa demanda no trabalho (Subcarga)',              perguntas: [33,34,35,36],  fonte: 'Subutilização de competências; ociosidade; má distribuição de tarefas.' },
  { num: 10, nome: 'Excesso de demandas no trabalho (Sobrecarga)',      perguntas: [37,38,39,40],  fonte: 'Metas irrealistas; equipe insuficiente; jornadas prolongadas; acúmulo de funções.' },
  { num: 11, nome: 'Maus relacionamentos no local de trabalho',         perguntas: [41,42,43],     fonte: 'Comunicação agressiva; rivalidade interna; conflitos mal geridos.' },
  { num: 12, nome: 'Trabalho em condições de difícil comunicação',      perguntas: [44,45,46,47],  fonte: 'Turnos desalinhados; distância física; falha nos meios de comunicação.' },
  { num: 13, nome: 'Trabalho remoto e isolado',                         perguntas: [48,49,50,51,52], fonte: 'Isolamento social; falta de acompanhamento; comunicação exclusivamente digital.' },
];

// Aplica lógica direta ou invertida
function calcularPontuacaoCorrigida(perguntaNum, valorOriginal) {
  const logica = LOGICA_PERGUNTAS[perguntaNum];
  if (logica === 'D') return valorOriginal;
  // Invertida: 1→5, 2→4, 3→3, 4→2, 5→1
  return 6 - valorOriginal;
}

// Classifica gravidade com base na pontuação corrigida
// Escala de respostas: 1 a 5 (Nunca/Raramente/Às vezes/Frequentemente/Sempre)
// Cortes em terços iguais da escala, mesma proporção da planilha original (que usava 1-3):
// 1.00–2.33 Baixa | 2.34–3.66 Média | 3.67–5.00 Alta
function classificarGravidade(media) {
  if (media >= 3.67) return 'Alta';
  if (media >= 2.34) return 'Média';
  return 'Baixa';
}

function classificarProbabilidade(valor) {
  if (valor >= 3) return 'Alta';
  if (valor >= 2) return 'Média';
  return 'Baixa';
}

// Matriz de risco NR-01: Gravidade x Probabilidade
function calcularMatriz(gravidade, probabilidade) {
  const g = gravidade;
  const p = probabilidade;
  if (g === 'Baixa' && p === 'Baixa') return 'Baixo';
  if (g === 'Baixa' && p === 'Média') return 'Baixo';
  if (g === 'Baixa' && p === 'Alta')  return 'Médio';
  if (g === 'Média' && p === 'Baixa') return 'Baixo';
  if (g === 'Média' && p === 'Média') return 'Médio';
  if (g === 'Média' && p === 'Alta')  return 'Alto';
  if (g === 'Alta'  && p === 'Baixa') return 'Médio';
  if (g === 'Alta'  && p === 'Média') return 'Alto';
  if (g === 'Alta'  && p === 'Alta')  return 'Crítico';
  return 'Não calculado';
}

// Função principal: recebe array de respostas e probabilidades
// respostas: [{ pergunta_num: 1, valor_original: 3 }, ...]
// probabilidades: [{ topico_num: 1, valor: 2 }, ...]
function calcularResultados(respostas, probabilidades) {
  const mapProb = {};
  probabilidades.forEach(p => { mapProb[p.topico_num] = p.valor; });

  return TOPICOS.map(topico => {
    const perguntasDoTopico = respostas.filter(r =>
      topico.perguntas.includes(r.pergunta_num)
    );

    let mediaGravidade = null;
    let classifGravidade = 'Não avaliado';

    if (perguntasDoTopico.length > 0) {
      const soma = perguntasDoTopico.reduce((acc, r) => {
        return acc + calcularPontuacaoCorrigida(r.pergunta_num, r.valor_original);
      }, 0);
      mediaGravidade = parseFloat((soma / perguntasDoTopico.length).toFixed(2));
      classifGravidade = classificarGravidade(mediaGravidade);
    }

    const probValor = mapProb[topico.num] || null;
    const mediaProb = probValor;
    const classifProb = probValor ? classificarProbabilidade(probValor) : 'Não informado';

    const matrizRisco = (classifGravidade !== 'Não avaliado' && classifProb !== 'Não informado')
      ? calcularMatriz(classifGravidade, classifProb)
      : 'Pendente';

    return {
      topico_num: topico.num,
      topico_nome: topico.nome,
      media_gravidade: mediaGravidade,
      classif_gravidade: classifGravidade,
      media_probabilidade: mediaProb,
      classif_probabilidade: classifProb,
      matriz_risco: matrizRisco,
      fonte_geradora: topico.fonte,
    };
  });
}

module.exports = { calcularResultados, calcularPontuacaoCorrigida, TOPICOS };