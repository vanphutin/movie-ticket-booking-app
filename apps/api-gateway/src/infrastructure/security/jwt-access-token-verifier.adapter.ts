import { createVerify } from 'node:crypto';
import type { MinimalTrustedActor } from '@movie-ticket/auth-contract';
import {
  AccessTokenVerificationError,
  type AccessTokenVerifierPort,
} from '../../application/ports/access-token-verifier.port';

export interface JwtAccessTokenVerifierAdapterOptions {
  readonly publicKeysByKid: Record<string, string>;
  readonly expectedIssuer: string;
  readonly expectedAudience: string;
}

export class JwtAccessTokenVerifierAdapter implements AccessTokenVerifierPort {
  constructor(private readonly options: JwtAccessTokenVerifierAdapterOptions) {
    if (
      !options ||
      !options.publicKeysByKid ||
      Object.keys(options.publicKeysByKid).length === 0 ||
      !options.expectedIssuer ||
      !options.expectedIssuer.trim() ||
      !options.expectedAudience ||
      !options.expectedAudience.trim()
    ) {
      throw new Error(
        'Missing required JwtAccessTokenVerifierAdapter options (publicKeysByKid, expectedIssuer, expectedAudience)',
      );
    }
  }

  async verifyAccessToken(token: string): Promise<MinimalTrustedActor> {
    await Promise.resolve();
    if (!token || typeof token !== 'string') {
      throw new AccessTokenVerificationError('INVALID_TOKEN', 'Token must be a non-empty string');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AccessTokenVerificationError(
        'INVALID_TOKEN',
        'Malformed JWT token: expected 3 parts',
      );
    }

    const headerB64 = parts[0];
    const payloadB64 = parts[1];
    const signatureB64 = parts[2];

    if (!headerB64 || !payloadB64 || !signatureB64) {
      throw new AccessTokenVerificationError('INVALID_TOKEN', 'Malformed JWT token: missing part');
    }

    let headerObj: Record<string, unknown>;
    try {
      const headerJson = Buffer.from(headerB64, 'base64url').toString('utf8');
      const parsed = JSON.parse(headerJson) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new AccessTokenVerificationError(
          'INVALID_TOKEN',
          'Malformed JWT header: expected JSON object',
        );
      }
      headerObj = parsed as Record<string, unknown>;
    } catch (err: unknown) {
      if (err instanceof AccessTokenVerificationError) {
        throw err;
      }
      throw new AccessTokenVerificationError(
        'INVALID_TOKEN',
        'Malformed JWT header: failed to parse JSON',
      );
    }

    if (headerObj.alg !== 'RS256') {
      throw new AccessTokenVerificationError(
        'ALGORITHM_MISMATCH',
        `Unsupported algorithm: expected RS256, received ${String(headerObj.alg)}`,
      );
    }

    const kid = headerObj.kid;
    if (typeof kid !== 'string' || !kid.trim()) {
      throw new AccessTokenVerificationError('UNTRUSTED_KEY', 'Token header is missing kid claim');
    }

    const publicKeyPem = this.options.publicKeysByKid[kid];
    if (!publicKeyPem) {
      throw new AccessTokenVerificationError(
        'UNTRUSTED_KEY',
        `Untrusted or unknown key ID: ${kid}`,
      );
    }

    let signatureBuffer: Buffer;
    try {
      signatureBuffer = Buffer.from(signatureB64, 'base64url');
    } catch {
      throw new AccessTokenVerificationError('INVALID_TOKEN', 'Malformed JWT signature base64');
    }

    const message = `${headerB64}.${payloadB64}`;
    try {
      const verifier = createVerify('SHA256');
      verifier.update(message);
      const isValid = verifier.verify(publicKeyPem, signatureBuffer);
      if (!isValid) {
        throw new AccessTokenVerificationError(
          'INVALID_TOKEN',
          'JWT signature verification failed',
        );
      }
    } catch (err: unknown) {
      if (err instanceof AccessTokenVerificationError) {
        throw err;
      }
      throw new AccessTokenVerificationError(
        'INVALID_TOKEN',
        `JWT signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    let payloadObj: Record<string, unknown>;
    try {
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const parsed = JSON.parse(payloadJson) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new AccessTokenVerificationError(
          'INVALID_TOKEN',
          'Malformed JWT payload: expected JSON object',
        );
      }
      payloadObj = parsed as Record<string, unknown>;
    } catch (err: unknown) {
      if (err instanceof AccessTokenVerificationError) {
        throw err;
      }
      throw new AccessTokenVerificationError(
        'INVALID_TOKEN',
        'Malformed JWT payload: failed to parse JSON',
      );
    }

    if (payloadObj.iss !== this.options.expectedIssuer) {
      throw new AccessTokenVerificationError(
        'INVALID_ISSUER_OR_AUDIENCE',
        `Issuer mismatch: expected ${this.options.expectedIssuer}, received ${String(payloadObj.iss)}`,
      );
    }

    if (payloadObj.aud !== this.options.expectedAudience) {
      throw new AccessTokenVerificationError(
        'INVALID_ISSUER_OR_AUDIENCE',
        `Audience mismatch: expected ${this.options.expectedAudience}, received ${String(payloadObj.aud)}`,
      );
    }

    const now = Math.floor(Date.now() / 1000);

    if (typeof payloadObj.exp !== 'number' || !Number.isFinite(payloadObj.exp)) {
      throw new AccessTokenVerificationError(
        'EXPIRED_TOKEN',
        'Token is missing expiration claim (exp)',
      );
    }

    if (now >= payloadObj.exp) {
      throw new AccessTokenVerificationError(
        'EXPIRED_TOKEN',
        `Token has expired (exp: ${payloadObj.exp}, now: ${now})`,
      );
    }

    if (payloadObj.nbf !== undefined) {
      if (typeof payloadObj.nbf !== 'number' || !Number.isFinite(payloadObj.nbf)) {
        throw new AccessTokenVerificationError(
          'EXPIRED_TOKEN',
          'nbf claim must be a finite number when present',
        );
      }
      if (now < payloadObj.nbf) {
        throw new AccessTokenVerificationError(
          'EXPIRED_TOKEN',
          `Token is not yet valid (nbf: ${payloadObj.nbf}, now: ${now})`,
        );
      }
    }

    const sub = payloadObj.sub;
    if (typeof sub !== 'string' || !sub.trim()) {
      throw new AccessTokenVerificationError(
        'INVALID_TOKEN',
        'Missing or empty subject claim (sub)',
      );
    }

    const roles = payloadObj.roles;
    if (!Array.isArray(roles) || !roles.every((r) => typeof r === 'string')) {
      throw new AccessTokenVerificationError(
        'INVALID_TOKEN',
        'Missing or invalid roles claim: must be an array of strings',
      );
    }

    return {
      id: sub,
      roles,
    };
  }
}
