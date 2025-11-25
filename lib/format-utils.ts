/**
 * Format Utils
 *
 * Utility functions for formatting currency, dates, and other data
 */

/**
 * Format number as Brazilian Real (BRL) currency
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Format date string to Brazilian format (dd/MM/yyyy)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format date to ISO string (yyyy-MM-dd) for inputs
 */
export function formatDateISO(date: Date | string): string {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

/**
 * Parse Brazilian formatted currency to number
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;

  // Remove R$ and convert , to .
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  return parseFloat(cleaned) || 0;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0%';

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format competencia (YYYY-MM) to readable format
 */
export function formatCompetencia(competencia: string): string {
  if (!competencia) return '-';

  const [year, month] = competencia.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

/**
 * Get current competencia (YYYY-MM)
 */
export function getCurrentCompetencia(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format day of week in Portuguese
 */
export function getDayOfWeek(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[date.getDay()];
}

/**
 * Format phone number (Brazilian format)
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get status color class based on status string
 */
export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    'conciliado': 'bg-green-100 text-green-800',
    'não conciliado': 'bg-yellow-100 text-yellow-800',
    'duplicado': 'bg-red-100 text-red-800',
    'ativo': 'bg-green-100 text-green-800',
    'inativo': 'bg-gray-100 text-gray-800',
    'pago': 'bg-green-100 text-green-800',
    'pendente': 'bg-yellow-100 text-yellow-800',
    'cancelado': 'bg-red-100 text-red-800'
  };

  return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}
