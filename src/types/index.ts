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
  id_usuario: number;
  id_categoria: number;
  tipo: CategoryType;
  valor: number;
  data_transacao: string;
  descricao: string;
  status: TransactionStatus;
  categoria?: Category;
}

export interface TransactionInput {
  descricao: string;
  valor: number;
  tipo: CategoryType;
  id_categoria: number;
  data: string; // ISO date YYYY-MM-DD
  status: TransactionStatus;
}

export interface FinancialGoal {
  id_meta: number;
  id_usuario: number;
  titulo: string;
  valor_alvo: number;
  valor_atual: number;
  data_limite: string;
  categoria: string | null;
  descricao: string | null;
  created_at: string;
  progresso_percentual?: number;
}

export interface GoalInput {
  titulo: string;
  valor_alvo: number;
  data_limite: string;
  categoria?: string;
  descricao?: string;
}

export interface MonthlyReportItem {
  mes: string; // YYYY-MM
  total_receitas: number;
  total_despesas: number;
  saldo_mes: number;
}

export interface DetailedReportCategoryGroup {
  id_categoria: number;
  nome_categoria: string;
  tipo: CategoryType;
  cor: string | null;
  total: number;
  percentual_total: number;
  quantidade: number;
}

export interface DetailedReportResponse {
  mes: string;
  total_receitas: number;
  total_despesas: number;
  saldo_liquido: number;
  taxa_poupanca_percentual: number;
  despesas_por_categoria: DetailedReportCategoryGroup[];
  receitas_por_categoria: DetailedReportCategoryGroup[];
}
