import type { CanonicalSignedInput } from '@movie-ticket/auth-contract';
import type { InternalRequestSignerPort } from '../../application/ports/internal-request-signer.port';
import { createHmac } from 'node:crypto';

export class InternalRequestHmacSignerAdapter implements InternalRequestSignerPort {
  constructor(private readonly secretKey: string) {
    if (!secretKey?.trim()) throw new Error('Internal signing secret is required');
  }

  async sign(input: CanonicalSignedInput): Promise<string> {
    await Promise.resolve();
    const field = (name: string, value: string): string =>
      `${name}:${Buffer.byteLength(value, 'utf8')}:${value}`;

    const method = input.method.toUpperCase();
    const path = input.path;
    const query = input.canonicalQuery;
    const audience = input.audience;
    const actorId = input.actor ? input.actor.id : 'none';
    const actorRoles =
      input.actor && input.actor.roles.length > 0
        ? Array.from(new Set(input.actor.roles)).sort().join(',')
        : 'none';
    const requestId = input.requestId;
    const bodySha256 = input.bodySha256;
    const iat = String(input.issuedAt);
    const nonce = input.nonce;
    const keyId = input.keyId;

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
      field('iat', iat),
      field('nonce', nonce),
      field('kid', keyId),
    ].join('\n');

    const signature = createHmac('sha256', this.secretKey)
      .update(canonicalPayload, 'utf8')
      .digest('base64url');

    return `v=1;kid=${keyId};iat=${input.issuedAt};nonce=${nonce};sig=${signature}`;
  }
}
