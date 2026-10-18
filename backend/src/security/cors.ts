import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Maps CORS_ORIGINS to Nest CORS options: empty disables CORS, "*" allows any
 * origin (development only), "a.com, b.com" is an allowlist.
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
