/**
 * Environment Variables Configuration
 *
 * Validates and exports environment variables with type safety
 */

import { z } from 'zod';

const envSchema = z.object({
  // Supabase configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1, 'NEXT_PUBLIC_SUPABASE_URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Feature flags
  ENABLE_CONCILIACAO: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val === 'true'),

  // Optional configurations
  ADMIN_EMAILS: z
    .string()
    .optional()
    .default('')
    .transform((val) => val.split(',').map((email) => email.trim()).filter(Boolean)),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ENABLE_CONCILIACAO: process.env.ENABLE_CONCILIACAO,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  });

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();

export function isConciliacaoEnabled(): boolean {
  return env.ENABLE_CONCILIACAO;
}

export function isAdminEmail(email: string): boolean {
  return env.ADMIN_EMAILS.includes(email);
}
