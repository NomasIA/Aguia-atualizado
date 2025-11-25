/**
 * Feature Flags
 *
 * Client-side utilities for checking feature availability
 */

import { env } from './env';

export interface FeatureFlags {
  conciliacaoEnabled: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    conciliacaoEnabled: env.ENABLE_CONCILIACAO,
  };
}

export function isConciliacaoEnabled(): boolean {
  return env.ENABLE_CONCILIACAO;
}
