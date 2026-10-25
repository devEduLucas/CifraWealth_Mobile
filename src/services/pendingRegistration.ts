// Dados do cadastro em andamento, guardados só em memória.
// Não passe a senha por parâmetros de navegação: no web eles viram parte da URL.
export interface PendingRegistration {
  nome: string;
  sobrenome: string;
  email: string;
  senha: string;
}

let pending: PendingRegistration | null = null;

export const pendingRegistration = {
  set(data: PendingRegistration) {
    pending = data;
  },
  get(): PendingRegistration | null {
    return pending;
  },
  clear() {
    pending = null;
  },
};
