import { createLoyverseClient, type LoyverseClient } from '$lib/server/loyverse-client';
import { loadSecondLoyverseConfig, type SecondLoyverseConfig, type SecondLoyverseConfigInput } from './config';

export interface SecondLoyverseClients {
  source: LoyverseClient;
  target: LoyverseClient;
  config: SecondLoyverseConfig;
}

const readSourceToken = (override?: string, env?: SecondLoyverseConfigInput & { LOYVERSE_ACCESS_TOKEN?: string }) => {
  const fromOverride = override?.trim();
  if (fromOverride) return fromOverride;
  const fromEnvBag = env && 'LOYVERSE_ACCESS_TOKEN' in env ? String(env.LOYVERSE_ACCESS_TOKEN ?? '').trim() : '';
  if (fromEnvBag) return fromEnvBag;
  return typeof process !== 'undefined' ? (process.env.LOYVERSE_ACCESS_TOKEN ?? '').trim() : '';
};

export const createSecondLoyverseClients = (options?: {
  env?: SecondLoyverseConfigInput & { LOYVERSE_ACCESS_TOKEN?: string };
  sourceToken?: string;
  fetch?: typeof fetch;
  config?: SecondLoyverseConfig;
}): SecondLoyverseClients => {
  const config = options?.config ?? loadSecondLoyverseConfig(options?.env, { requireCredentials: true });
  const sourceToken = readSourceToken(options?.sourceToken, options?.env);
  if (!sourceToken) {
    throw new Error('LOYVERSE_ACCESS_TOKEN is required for source-account reads');
  }

  return {
    source: createLoyverseClient({ accessToken: sourceToken, fetch: options?.fetch }),
    target: createLoyverseClient({ accessToken: config.accessToken, fetch: options?.fetch }),
    config
  };
};
