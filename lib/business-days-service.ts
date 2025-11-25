/**
 * Business Days Service
 *
 * Handles Brazilian banking calendar calculations
 * Considers weekends and holidays (feriados table)
 * Uses America/Sao_Paulo timezone
 */

import { supabase } from './supabase';

export interface Feriado {
  id: string;
  data: string;
  nome: string;
  tipo?: string;
  recorrente?: boolean;
  observacao?: string;
}

// Cache for holidays to avoid repeated queries
let feriadosCache: Map<string, boolean> | null = null;
let cacheDate: Date | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Load holidays from database and cache
 * @returns Map of date strings to boolean
 */
async function loadFeriados(): Promise<Map<string, boolean>> {
  const now = new Date();

  // Return cached data if still valid
  if (feriadosCache && cacheDate && (now.getTime() - cacheDate.getTime()) < CACHE_DURATION) {
    return feriadosCache;
  }

  // Fetch all holidays
  const { data: feriados, error } = await supabase
    .from('feriados')
    .select('data');

  if (error) {
    console.error('Error loading holidays:', error);
    return new Map();
  }

  // Build cache
  const cache = new Map<string, boolean>();
  if (feriados) {
    for (const feriado of feriados) {
      cache.set(feriado.data, true);
    }
  }

  feriadosCache = cache;
  cacheDate = now;

  return cache;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param date - Date to check
 * @returns true if weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a date is a holiday
 * @param date - Date to check
 * @returns true if holiday
 */
export async function isFeriado(date: Date): Promise<boolean> {
  const feriados = await loadFeriados();
  const dateStr = date.toISOString().split('T')[0];
  return feriados.has(dateStr);
}

/**
 * Check if a date is a business day (not weekend, not holiday)
 * @param date - Date to check
 * @returns true if business day
 */
export async function isDiaUtil(date: Date): Promise<boolean> {
  if (isWeekend(date)) {
    return false;
  }
  const holiday = await isFeriado(date);
  return !holiday;
}

/**
 * Adjust date to next business day if it falls on weekend or holiday
 * Uses Brazilian banking calendar
 *
 * @param date - Original date (string or Date)
 * @param tipo_operacao - Operation type ('pagamento' or 'recebimento')
 * @returns Adjusted date string (YYYY-MM-DD)
 */
export async function ajustarDataUtil(
  date: string | Date,
  tipo_operacao: 'pagamento' | 'recebimento' = 'pagamento'
): Promise<string> {
  // Parse date in America/Sao_Paulo timezone
  let currentDate = typeof date === 'string' ? new Date(date + 'T12:00:00-03:00') : new Date(date);

  // Load holidays cache
  await loadFeriados();

  let maxIterations = 10; // Prevent infinite loop
  while (maxIterations > 0) {
    const isUtil = await isDiaUtil(currentDate);

    if (isUtil) {
      // Found business day
      break;
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    maxIterations--;
  }

  if (maxIterations === 0) {
    console.error('Failed to find business day within 10 iterations');
  }

  return currentDate.toISOString().split('T')[0];
}

/**
 * Calculate number of business days between two dates
 * @param dataInicio - Start date
 * @param dataFim - End date
 * @returns Number of business days
 */
export async function calcularDiasUteis(
  dataInicio: string | Date,
  dataFim: string | Date
): Promise<number> {
  const inicio = typeof dataInicio === 'string' ? new Date(dataInicio + 'T12:00:00-03:00') : new Date(dataInicio);
  const fim = typeof dataFim === 'string' ? new Date(dataFim + 'T12:00:00-03:00') : new Date(dataFim);

  // Load holidays cache
  await loadFeriados();

  let count = 0;
  const current = new Date(inicio);

  while (current <= fim) {
    const isUtil = await isDiaUtil(current);
    if (isUtil) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get the next business day after a given date
 * @param date - Reference date
 * @returns Next business day
 */
export async function getProximoDiaUtil(date: string | Date): Promise<string> {
  const current = typeof date === 'string' ? new Date(date + 'T12:00:00-03:00') : new Date(date);
  current.setDate(current.getDate() + 1);
  return await ajustarDataUtil(current);
}

/**
 * Get the previous business day before a given date
 * @param date - Reference date
 * @returns Previous business day
 */
export async function getDiaUtilAnterior(date: string | Date): Promise<string> {
  let current = typeof date === 'string' ? new Date(date + 'T12:00:00-03:00') : new Date(date);

  // Load holidays cache
  await loadFeriados();

  let maxIterations = 10;
  while (maxIterations > 0) {
    current.setDate(current.getDate() - 1);
    const isUtil = await isDiaUtil(current);

    if (isUtil) {
      break;
    }

    maxIterations--;
  }

  return current.toISOString().split('T')[0];
}

/**
 * Get the last business day of a month
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Last business day of the month
 */
export async function getUltimoDiaUtilMes(year: number, month: number): Promise<string> {
  // Get last day of month
  const lastDay = new Date(year, month, 0);

  // Load holidays cache
  await loadFeriados();

  let current = new Date(lastDay);
  let maxIterations = 10;

  while (maxIterations > 0) {
    const isUtil = await isDiaUtil(current);

    if (isUtil) {
      break;
    }

    current.setDate(current.getDate() - 1);
    maxIterations--;
  }

  return current.toISOString().split('T')[0];
}

/**
 * Add business days to a date
 * @param date - Starting date
 * @param diasUteis - Number of business days to add
 * @returns Resulting date
 */
export async function adicionarDiasUteis(
  date: string | Date,
  diasUteis: number
): Promise<string> {
  let current = typeof date === 'string' ? new Date(date + 'T12:00:00-03:00') : new Date(date);

  // Load holidays cache
  await loadFeriados();

  let added = 0;
  let maxIterations = diasUteis * 3; // Safety limit

  while (added < diasUteis && maxIterations > 0) {
    current.setDate(current.getDate() + 1);
    const isUtil = await isDiaUtil(current);

    if (isUtil) {
      added++;
    }

    maxIterations--;
  }

  return current.toISOString().split('T')[0];
}

/**
 * Clear holidays cache
 * Call this when holidays are updated in the database
 */
export function clearFeriadosCache(): void {
  feriadosCache = null;
  cacheDate = null;
}
