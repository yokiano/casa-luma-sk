export interface SecondLoyverseConfig {
  accessToken: string;
  storeId: string;
  mirrorEnabled: boolean;
}

export interface SecondLoyverseConfigInput {
  LOYVERSE_2_ACCESS_TOKEN?: string;
  LOYVERSE_2_STORE_ID?: string;
  LOYVERSE_2_MIRROR_ENABLED?: string;
}

export class SecondLoyverseConfigError extends Error {
  readonly code: 'CONFIG_MISSING' | 'MIRROR_DISABLED';

  constructor(code: 'CONFIG_MISSING' | 'MIRROR_DISABLED', message: string) {
    super(message);
    this.name = 'SecondLoyverseConfigError';
    this.code = code;
  }
}

const trim = (value?: string | null) => value?.trim() || '';

const parseEnabled = (value?: string | null): boolean => {
  const normalized = trim(value).toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const readFromProcess = (key: keyof SecondLoyverseConfigInput): string => {
  if (typeof process === 'undefined' || !process.env) return '';
  return trim(process.env[key]);
};

/**
 * Resolve second-account config from an explicit env bag (SvelteKit dynamic env /
 * dotenv process.env) without ever logging token values.
 */
export const loadSecondLoyverseConfig = (
  envSource?: SecondLoyverseConfigInput,
  options?: { requireEnabled?: boolean; requireCredentials?: boolean }
): SecondLoyverseConfig => {
  const accessToken = trim(envSource?.LOYVERSE_2_ACCESS_TOKEN) || readFromProcess('LOYVERSE_2_ACCESS_TOKEN');
  const storeId = trim(envSource?.LOYVERSE_2_STORE_ID) || readFromProcess('LOYVERSE_2_STORE_ID');
  const mirrorEnabled =
    parseEnabled(envSource?.LOYVERSE_2_MIRROR_ENABLED) || parseEnabled(readFromProcess('LOYVERSE_2_MIRROR_ENABLED'));

  if (options?.requireEnabled && !mirrorEnabled) {
    throw new SecondLoyverseConfigError('MIRROR_DISABLED', 'LOYVERSE_2_MIRROR_ENABLED is not enabled');
  }

  if (options?.requireCredentials !== false) {
    if (!accessToken) {
      throw new SecondLoyverseConfigError(
        'CONFIG_MISSING',
        'LOYVERSE_2_ACCESS_TOKEN is required for second-account operations'
      );
    }
    if (!storeId) {
      throw new SecondLoyverseConfigError(
        'CONFIG_MISSING',
        'LOYVERSE_2_STORE_ID is required for second-account operations'
      );
    }
  }

  return { accessToken, storeId, mirrorEnabled };
};

export const isMirrorEnabledFromEnv = (envSource?: SecondLoyverseConfigInput): boolean => {
  try {
    return loadSecondLoyverseConfig(envSource, { requireCredentials: false }).mirrorEnabled;
  } catch {
    return false;
  }
};
