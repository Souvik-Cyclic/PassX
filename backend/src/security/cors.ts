import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Translates the CORS_ORIGINS setting into Nest CORS options.
 *
 * - empty            → false (CORS disabled, no headers emitted)
 * - "*"              → allow any origin, development only
 * - "a.com, b.com"   → explicit allowlist
 */
export function buildCorsOptions(
  origins: string,
  nodeEnv: string,
): CorsOptions | false {
  const trimmed = origins.trim();

  if (trimmed === '') {
    return false;
  }

  if (trimmed === '*') {
    if (nodeEnv !== 'development') {
      throw new Error('CORS_ORIGINS="*" is not allowed outside development');
    }
    return { origin: true };
  }

  const allowlist = trimmed
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return { origin: allowlist, credentials: false };
}
