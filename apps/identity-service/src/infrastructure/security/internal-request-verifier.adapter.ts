import type { CanonicalSignedInput, TrustedRequestContext } from '@movie-ticket/auth-contract';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface VerifyInternalRequestInput {
  readonly authHeader: string;
  readonly requestInput: Omit<CanonicalSignedInput, 'nonce' | 'keyId' | 'issuedAt'>;
  readonly expectedAudience: string;
  readonly allowedKeyIds?: readonly string[];
  readonly nowInSeconds?: number;
  readonly maxClockSkewSeconds?: number;
}

export class InternalRequestVerifierAdapter {
  constructor(private readonly secretKey: string = 'test-signing-secret') {}

  async verify(input: VerifyInternalRequestInput): Promise<TrustedRequestContext> {
    const { authHeader, requestInput, expectedAudience, allowedKeyIds } = input;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new Error('Missing or invalid X-Internal-Gateway-Auth header');
    }

    // Step 1: Parse Header X-Internal-Gateway-Auth strictly
    const KNOWN_KEYS = new Set(['v', 'kid', 'iat', 'nonce', 'sig']);
    const params = new Map<string, string>();
    const rawSegments = authHeader
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawSegments.length === 0) {
      throw new Error('Missing or invalid X-Internal-Gateway-Auth header');
    }

    for (const segment of rawSegments) {
      const idx = segment.indexOf('=');
      if (idx === -1) {
        throw new Error('Malformed segment in auth header');
      }

      const k = segment.substring(0, idx).trim();
      const v = segment.substring(idx + 1).trim();

      if (!k || !KNOWN_KEYS.has(k)) {
        throw new Error(`Unknown or invalid parameter key in auth header`);
      }

      if (params.has(k)) {
        throw new Error(`Duplicate parameter in auth header`);
      }

      params.set(k, v);
    }

    const version = params.get('v');
    const kid = params.get('kid');
    const iatStr = params.get('iat');
    const nonce = params.get('nonce');
    const sig = params.get('sig');

    // Step 2: Initial validation checks
    if (version !== '1') {
      throw new Error('Unsupported or missing version in auth header');
    }

    if (!kid || !iatStr || !nonce || !sig) {
      throw new Error('Missing required fields in auth header (kid, iat, nonce, sig)');
    }

    if (!/^\d+$/.test(iatStr)) {
      throw new Error('Invalid iat value in auth header');
    }

    const iat = Number(iatStr);
    if (!Number.isSafeInteger(iat)) {
      throw new Error('Invalid iat value in auth header');
    }

    // Step 3: Clock skew freshness check (iat)
    const nowInSeconds = input.nowInSeconds ?? Math.floor(Date.now() / 1000);
    const maxClockSkewSeconds = input.maxClockSkewSeconds ?? 300;

    if (Math.abs(nowInSeconds - iat) > maxClockSkewSeconds) {
      throw new Error('Timestamp out of allowed clock skew window');
    }

    // Step 4: Audience and Key ID policy check
    if (requestInput.audience !== expectedAudience) {
      throw new Error('Audience mismatch in internal request input');
    }

    const effectiveAllowedKeyIds = allowedKeyIds ?? ['v1'];
    if (!effectiveAllowedKeyIds.includes(kid)) {
      throw new Error('KeyId not allowed in internal request input');
    }

    // Step 5: Construct Canonical Payload (matching Gateway signing algorithm)
    const field = (name: string, value: string): string =>
      `${name}:${Buffer.byteLength(value, 'utf8')}:${value}`;

    const method = requestInput.method.toUpperCase();
    const path = requestInput.path;
    const query = requestInput.canonicalQuery;
    const audience = requestInput.audience;
    const actorId = requestInput.actor ? requestInput.actor.id : 'none';
    const actorRoles =
      requestInput.actor && requestInput.actor.roles.length > 0
        ? Array.from(new Set(requestInput.actor.roles)).sort().join(',')
        : 'none';
    const requestId = requestInput.requestId;
    const bodySha256 = requestInput.bodySha256;

    const canonicalPayload = [
      'v1',
      field('method', method),
      field('path', path),
      field('query', query),
      field('aud', audience),
      field('sub', actorId),
      field('roles', actorRoles),
      field('requestId', requestId),
      field('bodySha256', bodySha256),
      field('iat', iatStr),
      field('nonce', nonce),
      field('kid', kid),
    ].join('\n');

    // Step 6: Compute & Constant-time compare signature
    const computedSig = createHmac('sha256', this.secretKey)
      .update(canonicalPayload, 'utf8')
      .digest('base64url');

    const sigBuf = Buffer.from(sig);
    const computedBuf = Buffer.from(computedSig);

    if (sigBuf.length !== computedBuf.length || !timingSafeEqual(sigBuf, computedBuf)) {
      throw new Error('Invalid internal request signature');
    }

    // Step 7: Return TrustedRequestContext
    return Promise.resolve({
      actor: requestInput.actor,
      requestId: requestInput.requestId,
      correlationId: requestInput.requestId,
      issuedAt: iat,
    });
  }
}
