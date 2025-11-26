import { supabase } from './supabase';
import { format, getDay } from 'date-fns';

export interface Holiday {
  id: string;
  data: string;
  nome: string;
  tipo: 'nacional' | 'estadual' | 'municipal';
  recorrente: boolean;
  observacao?: string;
}

export async function isBusinessDay(date: Date): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('is_business_day', { check_date: format(date, 'yyyy-MM-dd') });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao verificar dia útil:', error);
    const dayOfWeek = getDay(date);
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }
}

export async function adjustToBusinessDay(
  date: Date,
  direction: 'before' | 'after' = 'before'
): Promise<Date> {
  const { data, error } = await supabase
    .rpc('adjust_to_business_day', {
      original_date: format(date, 'yyyy-MM-dd'),
      direction
    });

  if (error) {
    console.error('Erro ao ajustar data para dia útil:', error);
    throw error;
  }

  return new Date(data);
}

export async function getPaymentDate(
  year: number,
  month: number,
  day: number,
  type: 'SALARIO_5' | 'VALE_20' | 'VT_ULTIMO_DIA' | 'VR_ULTIMO_DIA'
): Promise<Date> {
  let originalDate: Date;

  if (type === 'VT_ULTIMO_DIA' || type === 'VR_ULTIMO_DIA') {
    originalDate = new Date(year, month, 0);
  } else {
    originalDate = new Date(year, month - 1, day);
  }

  return await adjustToBusinessDay(originalDate, 'before');
}

export async function getHolidays(
  startDate: Date,
  endDate: Date
): Promise<Holiday[]> {
  try {
    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .gte('data', format(startDate, 'yyyy-MM-dd'))
      .lte('data', format(endDate, 'yyyy-MM-dd'))
      .order('data');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar feriados:', error);
    return [];
  }
}

export async function addHoliday(
  date: Date,
  nome: string,
  tipo: 'nacional' | 'estadual' | 'municipal' = 'municipal',
  observacao?: string
): Promise<Holiday | null> {
  try {
    const { data, error } = await supabase
      .from('feriados')
      .insert([{
        data: format(date, 'yyyy-MM-dd'),
        nome,
        tipo,
        recorrente: false,
        observacao
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao adicionar feriado:', error);
    return null;
  }
}

export async function removeHoliday(holidayId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('feriados')
      .delete()
      .eq('id', holidayId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao remover feriado:', error);
    return false;
  }
}

export function formatPaymentDateInfo(
  originalDate: Date,
  adjustedDate: Date
): string {
  if (originalDate.getTime() === adjustedDate.getTime()) {
    return format(adjustedDate, 'dd/MM/yyyy');
  }

  const dayOfWeek = getDay(originalDate);
  let reason = '';

  if (dayOfWeek === 6) {
    reason = '(ajustado: sábado → sexta-feira)';
  } else if (dayOfWeek === 0) {
    reason = '(ajustado: domingo → segunda-feira)';
  } else {
    reason = '(ajustado: feriado → dia útil anterior)';
  }

  return `${format(adjustedDate, 'dd/MM/yyyy')} ${reason}`;
}
