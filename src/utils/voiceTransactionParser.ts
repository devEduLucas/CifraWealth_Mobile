import type { CategoryType } from '../types';

export interface VoiceTransactionDraft {
  descricao: string;
  valor: number;
  tipo: CategoryType;
}

export type VoiceTransactionParseResult =
  | { success: true; value: VoiceTransactionDraft }
  | { success: false; message: string };

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const NUMBER_VALUES: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
};

const NUMBER_WORDS = new Set([...Object.keys(NUMBER_VALUES), 'mil', 'milhao', 'milhoes']);

const EXPENSE_ACTIONS = [
  'gastei',
  'paguei',
  'comprei',
  'desembolsei',
  'saquei',
  'retirei',
  'enviei',
  'transferi',
  'pix enviado',
  'despesa',
  'compra',
];

const INCOME_ACTIONS = [
  'recebi',
  'ganhei',
  'entrou',
  'depositaram',
  'pix recebido',
  'transferencia recebida',
  'receita',
  'salario',
  'rendimento',
  'vendi',
];

const COMMAND_WORDS = new Set([
  'eu', 'gastei', 'paguei', 'comprei', 'desembolsei', 'saquei', 'retirei',
  'enviei', 'transferi', 'recebi', 'ganhei', 'entrou', 'depositaram',
  'vendi', 'fiz', 'foi', 'lance', 'lancar', 'registrar', 'registra',
  'despesa', 'receita', 'compra', 'pix', 'transferencia',
  'real', 'reais', 'r$', 'centavo', 'centavos',
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas',
  'em', 'com', 'para', 'pra', 'por', 'a', 'o', 'as', 'os',
  'um', 'uma', 'uns', 'umas', 'hoje', 'ontem', 'anteontem',
  'mil', 'milhao', 'milhoes', 'e',
  ...NUMBER_WORDS,
]);

function parseBrazilianNumber(raw: string, scaleWord?: string): number | null {
  let normalized = raw.trim().replace(/[R$\s]/gi, '');
  if (!normalized) return null;

  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;

  const scale = scaleWord === 'mil' ? 1000 : scaleWord === 'milhao' || scaleWord === 'milhoes' ? 1_000_000 : 1;
  const rounded = Math.round(amount * scale * 100) / 100;
  return rounded > 0 ? rounded : null;
}

function parsePortugueseNumberWords(tokens: string[]): number | null {
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;

  for (const token of tokens) {
    if (token === 'e') continue;
    if (token === 'mil') {
      total += Math.max(current, 1) * 1000;
      current = 0;
      continue;
    }
    if (token === 'milhao' || token === 'milhoes') {
      total += Math.max(current, 1) * 1_000_000;
      current = 0;
      continue;
    }

    const value = NUMBER_VALUES[token];
    if (value === undefined) return null;
    current += value;
  }

  const amount = Math.round((total + current) * 100) / 100;
  return amount > 0 ? amount : null;
}

function findAmount(transcript: string): number | null {
  const numericMatch = transcript.match(/\b(\d+(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(milhao|milhoes|mil)?\b/);
  if (numericMatch?.[1]) {
    const amount = parseBrazilianNumber(numericMatch[1], numericMatch[2]);
    if (amount !== null) return amount;
  }

  const tokens = transcript.split(/\s+/);
  const currencyIndex = tokens.findIndex((token) => token === 'real' || token === 'reais');
  if (currencyIndex < 0) return null;

  const beforeCurrency = tokens.slice(0, currencyIndex);
  let start = beforeCurrency.length;
  while (
    start > 0 &&
    (NUMBER_WORDS.has(beforeCurrency[start - 1] ?? '') || beforeCurrency[start - 1] === 'e')
  ) {
    start -= 1;
  }

  const amountTokens = beforeCurrency.slice(start);
  return parsePortugueseNumberWords(amountTokens);
}

function findActionIndex(transcript: string, actions: string[]): number {
  const positions = actions
    .map((action) => transcript.indexOf(action))
    .filter((position) => position >= 0);
  return positions.length > 0 ? Math.min(...positions) : -1;
}

function extractDescription(rawTranscript: string): string {
  const rawWords = rawTranscript
    .replace(/[.,!?;:]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const kept = rawWords.filter((word) => {
    const token = normalize(word).replace(/[.,!?;:]/g, '');
    if (!token || COMMAND_WORDS.has(token)) return false;
    if (/^\d+(?:[.,]\d+)?$/.test(token)) return false;
    if (token === 'r$') return false;
    return true;
  });

  const description = kept.join(' ').replace(/\s+/g, ' ').trim().slice(0, 190);
  if (!description) return '';
  return description.charAt(0).toLocaleUpperCase('pt-BR') + description.slice(1);
}

/**
 * Interpreta uma frase curta em português brasileiro. O resultado é apenas um
 * rascunho: a tela de transações continua exigindo revisão e confirmação manual.
 */
export function parseVoiceTransactionCommand(rawTranscript: string): VoiceTransactionParseResult {
  const raw = rawTranscript.trim();
  if (!raw) {
    return { success: false, message: 'Não recebemos uma frase para interpretar. Tente falar novamente.' };
  }

  const transcript = normalize(raw).replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
  const expenseIndex = findActionIndex(transcript, EXPENSE_ACTIONS);
  const incomeIndex = findActionIndex(transcript, INCOME_ACTIONS);

  if (expenseIndex >= 0 && incomeIndex >= 0) {
    return { success: false, message: 'Dite apenas uma movimentação por vez, indicando receita ou despesa.' };
  }
  if (expenseIndex < 0 && incomeIndex < 0) {
    return { success: false, message: 'Não identifiquei se a movimentação é uma receita ou uma despesa. Ex.: “gastei 32 reais no almoço”.' };
  }

  const amount = findAmount(transcript);
  if (amount === null) {
    return { success: false, message: 'Não consegui identificar o valor. Diga o valor em números ou por extenso, seguido de “reais”.' };
  }

  const description = extractDescription(raw);
  if (!description) {
    return { success: false, message: 'Não consegui identificar a descrição. Inclua onde ou com o que foi a movimentação.' };
  }

  return {
    success: true,
    value: {
      descricao: description,
      valor: amount,
      tipo: expenseIndex >= 0 ? 'despesa' : 'receita',
    },
  };
}
