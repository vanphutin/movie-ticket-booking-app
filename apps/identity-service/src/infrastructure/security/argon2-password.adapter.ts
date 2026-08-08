import { argon2id as hashWasmArgon2id } from 'hash-wasm';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { PasswordHasher } from '../../application/ports/auth-crypto.ports';

export interface Argon2Options {
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
  hashLength?: number;
}

export class Argon2PasswordAdapter implements PasswordHasher {
  private readonly memoryCost: number;
  private readonly timeCost: number;
  private readonly parallelism: number;
  private readonly hashLength: number;

  constructor(options?: Argon2Options) {
    this.memoryCost = options?.memoryCost ?? 65536;
    this.timeCost = options?.timeCost ?? 3;
    this.parallelism = options?.parallelism ?? 1;
    this.hashLength = options?.hashLength ?? 32;
  }

  async hash(plaintext: string): Promise<string> {
    const saltBuf = randomBytes(16);

    const encoded = await hashWasmArgon2id({
      password: plaintext,
      salt: saltBuf,
      iterations: this.timeCost,
      memorySize: this.memoryCost,
      parallelism: this.parallelism,
      hashLength: this.hashLength,
      outputType: 'encoded',
    });

    return encoded;
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    const parts = hash.split('$');
    if (parts.length !== 6) return false;

    const [, alg, vStr, paramsStr, sB64, kB64] = parts;
    if (alg !== 'argon2id' || vStr !== 'v=19' || !paramsStr || !sB64 || !kB64) {
      return false;
    }

    const paramMap = new Map<string, number>();
    for (const item of paramsStr.split(',')) {
      const [k, v] = item.split('=');
      if (k && v && /^\d+$/.test(v)) {
        paramMap.set(k, Number(v));
      }
    }

    const m = paramMap.get('m');
    const t = paramMap.get('t');
    const p = paramMap.get('p');
    if (!m || !t || !p) return false;

    try {
      const saltBuf = Buffer.from(sB64, 'base64url');
      const expectedKeyBuf = Buffer.from(kB64, 'base64url');

      const recomputedEncoded = await hashWasmArgon2id({
        password: plaintext,
        salt: saltBuf,
        iterations: t,
        memorySize: m,
        parallelism: p,
        hashLength: expectedKeyBuf.length,
        outputType: 'encoded',
      });

      const recomputedKeyB64 = recomputedEncoded.split('$')[5] ?? '';
      const recomputedKeyBuf = Buffer.from(recomputedKeyB64, 'base64url');

      if (recomputedKeyBuf.length !== expectedKeyBuf.length) {
        return false;
      }

      return timingSafeEqual(recomputedKeyBuf, expectedKeyBuf);
    } catch {
      return false;
    }
  }
}
