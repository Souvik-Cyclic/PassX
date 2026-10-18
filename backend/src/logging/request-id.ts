import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Accept only ids that are safe to echo into headers and log lines. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/** Returns the incoming request id if well-formed, else a fresh UUID. */
export function resolveRequestId(
  incoming: string | string[] | undefined,
): string {
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;

  if (typeof candidate === 'string' && SAFE_REQUEST_ID.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}
