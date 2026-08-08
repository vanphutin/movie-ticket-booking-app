import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  INTERNAL_AUTH_HEADER,
  CORRELATION_ID_HEADER,
  type TrustedRequestContext,
} from '@movie-ticket/auth-contract';
import type { FastifyRequest } from 'fastify';
import { InternalRequestVerifierAdapter } from '../../infrastructure/security/internal-request-verifier.adapter';
import { InternalNonceStorePort } from '../../infrastructure/database/internal-nonce-store.adapter';

function parseAuthHeader(authHeader: string): Map<string, string> {
  const params = new Map<string, string>();
  const rawSegments = authHeader
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const segment of rawSegments) {
    const idx = segment.indexOf('=');
    if (idx !== -1) {
      const k = segment.substring(0, idx).trim();
      const v = segment.substring(idx + 1).trim();
      params.set(k, v);
    }
  }
  return params;
}

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(
    @Inject(InternalRequestVerifierAdapter)
    private readonly verifier: InternalRequestVerifierAdapter,
    @Inject('InternalNonceStorePort')
    private readonly nonceStore: InternalNonceStorePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { internalContext?: TrustedRequestContext }>();

    // Safety: purge untrusted client-supplied context
    delete request.internalContext;

    const rawAuthHeader = request.headers[INTERNAL_AUTH_HEADER];
    const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.trim()) {
      throw new UnauthorizedException('Missing or invalid internal authentication header');
    }

    const rawCorrelation = request.headers[CORRELATION_ID_HEADER];
    const correlationId = Array.isArray(rawCorrelation) ? rawCorrelation[0] : rawCorrelation;

    if (!correlationId || typeof correlationId !== 'string' || !correlationId.trim()) {
      throw new UnauthorizedException('Missing or invalid correlation ID header');
    }

    // 1. Calculate bodySha256 from rawBody buffer
    const rawBodyBuffer = (request as unknown as { rawBody?: Buffer }).rawBody;
    let bodyBuffer: Buffer;
    if (rawBodyBuffer && Buffer.isBuffer(rawBodyBuffer)) {
      bodyBuffer = rawBodyBuffer;
    } else if (request.body) {
      if (Buffer.isBuffer(request.body)) {
        bodyBuffer = request.body;
      } else if (typeof request.body === 'string') {
        bodyBuffer = Buffer.from(request.body, 'utf8');
      } else {
        bodyBuffer = Buffer.from(JSON.stringify(request.body), 'utf8');
      }
    } else {
      bodyBuffer = Buffer.from('');
    }

    const bodySha256 = createHash('sha256').update(bodyBuffer).digest('hex');

    // 2. Extract Gateway actor claims strictly using canonical D03 headers (X-User-Id, X-User-Roles)
    const rawUserId = request.headers['x-user-id'];
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    const rawUserRoles = request.headers['x-user-roles'];
    const userRolesStr = Array.isArray(rawUserRoles) ? rawUserRoles[0] : rawUserRoles;

    const actor =
      typeof userId === 'string' && userId.trim()
        ? {
            id: userId.trim(),
            roles:
              typeof userRolesStr === 'string' && userRolesStr.trim()
                ? userRolesStr
                    .split(',')
                    .map((r) => r.trim())
                    .filter((r) => r.length > 0)
                : [],
          }
        : null;

    const rawUrl = request.url || '/';
    const [urlPath, rawQuery] = rawUrl.split('?');

    let trustedContext: TrustedRequestContext;
    try {
      trustedContext = await this.verifier.verify({
        authHeader,
        requestInput: {
          method: request.method || 'GET',
          path: urlPath || '/',
          canonicalQuery: rawQuery || '',
          bodySha256,
          audience: 'identity-service',
          actor,
          requestId: correlationId.trim(),
        },
        expectedAudience: 'identity-service',
      });
    } catch (error) {
      throw new UnauthorizedException('Internal request verification failed', { cause: error });
    }

    const params = parseAuthHeader(authHeader);
    const nonce = params.get('nonce');
    const keyId = params.get('kid') || 'gateway-key-1';
    const iatStr = params.get('iat');
    const issuedAtInSeconds = iatStr ? Number(iatStr) : trustedContext.issuedAt;

    if (!nonce) {
      throw new UnauthorizedException('Missing nonce in internal authentication header');
    }

    let claimed = false;
    try {
      claimed = await this.nonceStore.claim({
        audience: 'identity-service',
        nonce,
        requestId: trustedContext.requestId,
        keyId,
        issuedAtInSeconds,
      });
    } catch (error) {
      throw new UnauthorizedException('Internal nonce store error', { cause: error });
    }

    if (!claimed) {
      throw new UnauthorizedException('Replayed internal request nonce');
    }

    request.internalContext = trustedContext;
    return true;
  }
}
