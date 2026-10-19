export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('T')[0].split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthIndex = parseInt(month, 10) - 1;
    return `${day} ${months[monthIndex] || month}`;
  } catch {
    return dateString;
  }
}
