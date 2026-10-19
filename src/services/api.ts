import { API_BASE_URL } from './config';
import { storage } from './storage';
import {
  AuthResponse,
  Category,
  CategoryInput,
  DashboardData,
  DetailedReportResponse,
  FinancialGoal,
  GoalInput,
  MonthlyReportItem,
  Transaction,
  TransactionInput,
  User,
} from '../types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (requiresAuth) {
    const token = await storage.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${cleanPath}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (err) {
    console.error(`[CifraMobile API Error] Falha de conexão em ${fullUrl}:`, err);
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está ativo.',
      0
    );
  }

  if (requiresAuth && response.status === 401) {
    await storage.clear();
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || data?.error || `Erro HTTP ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  // --- AUTENTICAÇÃO ---
  async login(email: string, senha: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: senha }),
      },
      false
    );
    if (res.token) {
      await storage.setToken(res.token);
      await storage.setUser(res.user);
    }
    return res;
  },

  async register(
    nome: string,
    sobrenome: string,
    email: string,
    senha: string
  ): Promise<{ message: string; user?: User }> {
    const fullName = `${nome.trim()} ${(sobrenome || '').trim()}`.trim();
    return request<{ message: string; user?: User }>(
      '/users/register',
      {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email: email.trim().toLowerCase(),
          password: senha,
        }),
      },
      false
    );
  },

  async verifyEmail(token: string, senha: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      '/users/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({ token, password: senha }),
      },
      false
    );
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      '/users/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      },
      false
    );
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      },
      false
    );
  },

  async resetPassword(token: string, senha: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      '/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({ token, password: senha }),
      },
      false
    );
  },

  // --- DASHBOARD ---
  async getDashboard(): Promise<DashboardData> {
    return request<DashboardData>('/dashboard');
  },

  // --- TRANSAÇÕES ---
  async listTransactions(params?: {
    tipo?: 'receita' | 'despesa';
    status?: 'confirmada' | 'pendente';
    id_categoria?: number;
    data_inicio?: string;
    data_fim?: string;
    limit?: number;
    page?: number;
  }): Promise<Transaction[]> {
    const query = new URLSearchParams();
    if (params?.tipo) query.append('tipo', params.tipo);
    if (params?.status) query.append('status', params.status);
    if (params?.id_categoria) query.append('id_categoria', String(params.id_categoria));
    if (params?.data_inicio) query.append('data_inicio', params.data_inicio);
    if (params?.data_fim) query.append('data_fim', params.data_fim);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.page) query.append('page', String(params.page));

    const qs = query.toString();
    const endpoint = `/transactions${qs ? `?${qs}` : ''}`;
    return request<Transaction[]>(endpoint);
  },

  async createTransaction(data: TransactionInput): Promise<Transaction> {
    return request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTransaction(id: number, data: Partial<TransactionInput>): Promise<Transaction> {
    return request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTransaction(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  // --- CATEGORIAS ---
  async listCategories(): Promise<Category[]> {
    return request<Category[]>('/categories');
  },

  async createCategory(data: CategoryInput): Promise<Category> {
    return request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // --- METAS FINANCEIRAS ---
  async listGoals(): Promise<FinancialGoal[]> {
    return request<FinancialGoal[]>('/goals');
  },

  async createGoal(data: GoalInput): Promise<FinancialGoal> {
    return request<FinancialGoal>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async contributeGoal(id: number, valor: number): Promise<FinancialGoal> {
    return request<FinancialGoal>(`/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ valor }),
    });
  },

  async withdrawGoal(id: number, valor: number): Promise<FinancialGoal> {
    return request<FinancialGoal>(`/goals/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ valor }),
    });
  },

  async deleteGoal(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/goals/${id}`, {
      method: 'DELETE',
    });
  },

  // --- RELATÓRIOS ---
  async getMonthlyReport(ano: number): Promise<MonthlyReportItem[]> {
    return request<MonthlyReportItem[]>(`/reports/monthly?ano=${ano}`);
  },

  async getDetailedReport(dataInicio: string, dataFim: string): Promise<DetailedReportResponse> {
    const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim });
    return request<DetailedReportResponse>(`/reports/detailed?${params}`);
  },
};
