import { LOYVERSE_ACCESS_TOKEN } from '$env/static/private';
import { createLoyverseClient } from './loyverse-client';

export * from './loyverse-client';

/** Primary production Loyverse account client. */
export const loyverse = createLoyverseClient({ accessToken: LOYVERSE_ACCESS_TOKEN });
