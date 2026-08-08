import { randomUUID } from 'node:crypto';

export interface GatewayHttpRequest {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
}

export interface GatewayHttpResponse {
  header(name: string, value: string): void;
}

const UNTRUSTED_HEADERS = [
  'x-request-id',
  'x-correlation-id',
  'x-user-id',
  'x-user-roles',
  'x-internal-gateway-auth',
] as const;

export async function requestContextHook(
  req: GatewayHttpRequest,
  res: GatewayHttpResponse,
): Promise<void> {
  await Promise.resolve();

  if (req.headers) {
    const keys = Object.keys(req.headers);
    for (const key of keys) {
      if (UNTRUSTED_HEADERS.includes(key.toLowerCase() as (typeof UNTRUSTED_HEADERS)[number])) {
        delete req.headers[key];
      }
    }
  }

  const requestId = randomUUID();
  req.requestId = requestId;
  res.header('X-Request-Id', requestId);
}
