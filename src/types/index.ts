export type CategoryType = 'receita' | 'despesa';

export type TransactionStatus = 'confirmada' | 'pendente';

export interface User {
  id_usuario: number;
  nome: string;
  sobrenome: string | null;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CategoryBreakdownItem {
  id_categoria: number;
  nome: string;
  tipo: CategoryType;
  total: number;
}

export interface DashboardData {
  saldo: number;
  total_receitas: number;
  total_despesas: number;
  por_categoria: CategoryBreakdownItem[];
}

export interface Category {
  id_categoria: number;
  nome: string;
  tipo: CategoryType;
  icone: string | null;
  cor: string | null;
}

export interface CategoryInput {
  nome: string;
  tipo: CategoryType;
  icone?: string;
  cor?: string;
}

export interface Transaction {
  id_transacao: number;
  id_categoria: number;
  tipo: CategoryType;
  valor: number;
  data_transacao: string;
  descricao: string;
  status: TransactionStatus;
}

export interface TransactionInput {
  descricao: string;
  valor: number;
  tipo: CategoryType;
  id_categoria: number;
  data_transacao: string; // YYYY-MM-DD
  status?: TransactionStatus;
}

export type GoalStatus = 'em_andamento' | 'concluida' | 'cancelada';

export interface FinancialGoal {
  id_meta: number;
  titulo: string;
  descricao: string | null;
  valor_objetivo: number;
  valor_atual: number;
  status: GoalStatus;
  data_inicio: string | null;
  data_fim: string | null;
}

export interface GoalInput {
  titulo: string;
  descricao?: string | null;
  valor_objetivo: number;
  data_inicio?: string | null;
  data_fim?: string | null;
}

export interface MonthlyReportItem {
  mes: string;
  total_receitas: number;
  total_despesas: number;
  saldo: number;
}

export interface DetailedReportResponse {
  dataInicio: string;
  dataFim: string;
  summary: {
    receitas: number;
    despesas: number;
    saldo: number;
    taxaEconomiaPercentual: number;
    variacaoReceitas: number | null;
    variacaoDespesas: number | null;
    variacaoSaldo: number | null;
    variacaoTaxaEconomia: number | null;
  };
  evolution: Array<{ mes: string; receitas: number; despesas: number; saldo: number }>;
  categoryBreakdown: Array<{ id: number; nome: string; percentual: number; total: number; cor: string }>;
  monthlyComparison: Array<{ mes: string; receitas: number; despesas: number }>;
  insights: Array<{ id: string; tipo: 'positivo' | 'negativo' | 'neutro'; mensagem: string }>;
  goals: Array<{ id: number; nome: string; valorAtual: number; valorAlvo: number }>;
  history: Array<{
    id: string;
    periodo: string;
    receitas: number;
    despesas: number;
    saldo: number;
    variacaoPercentual: number | null;
  }>;
  transactions: Array<{
    id: number;
    data: string;
    descricao: string;
    categoria: string;
    tipo: CategoryType;
    valor: number;
  }>;
}
