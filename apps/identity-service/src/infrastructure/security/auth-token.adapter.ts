import { createSign, createVerify } from 'node:crypto';
import type { AuthTokenPort } from '../../application/ports/auth-crypto.ports';
import type { LoginResult } from '../../application/auth.models';

export interface AuthTokenAdapterOptions {
  privateKey: string;
  publicKey: string;
  keyId: string;
  issuer: string;
  audience: string;
  expiresInSeconds: number;
  algorithm?: 'RS256' | 'EdDSA' | 'ES256';
}

export class AuthTokenAdapter implements AuthTokenPort {
  private readonly algorithm: 'RS256';
  private readonly expiresInSeconds: number;

  constructor(private readonly options: AuthTokenAdapterOptions) {
    if (
      !options ||
      !options.privateKey ||
      !options.privateKey.trim() ||
      !options.publicKey ||
      !options.publicKey.trim() ||
      !options.keyId ||
      !options.keyId.trim() ||
      !options.issuer ||
      !options.issuer.trim() ||
      !options.audience ||
      !options.audience.trim() ||
      !Number.isSafeInteger(options.expiresInSeconds) ||
      options.expiresInSeconds <= 0
    ) {
      throw new Error(
        'Missing required AuthTokenAdapter options (privateKey, publicKey, keyId, issuer, audience)',
      );
    }

    const requestedAlg = options.algorithm ?? 'RS256';
    if (requestedAlg !== 'RS256') {
      throw new Error(`Unsupported JWT algorithm: ${requestedAlg}`);
    }
    this.algorithm = 'RS256';
    this.expiresInSeconds = options.expiresInSeconds;
  }

  async signAccessToken(
    user: LoginResult['user'],
  ): Promise<Readonly<{ accessToken: string; expiresIn: number }>> {
    const header = Buffer.from(
      JSON.stringify({
        alg: this.algorithm,
        kid: this.options.keyId,
        typ: 'JWT',
      }),
    ).toString('base64url');

    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        iss: this.options.issuer,
        aud: this.options.audience,
        iat: now,
        exp: now + this.expiresInSeconds,
      }),
    ).toString('base64url');

    const dataToSign = `${header}.${payload}`;

    const signer = createSign('RSA-SHA256');
    signer.update(dataToSign);
    const signature = signer.sign(this.options.privateKey, 'base64url');

    return Promise.resolve({
      accessToken: `${dataToSign}.${signature}`,
      expiresIn: this.expiresInSeconds,
    });
  }

  verifyAccessToken(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signature] = parts;
    if (!headerB64 || !payloadB64 || !signature) return false;

    try {
      const verifier = createVerify('RSA-SHA256');
      verifier.update(`${headerB64}.${payloadB64}`);
      return verifier.verify(this.options.publicKey, signature, 'base64url');
    } catch {
      return false;
    }
  }
}
