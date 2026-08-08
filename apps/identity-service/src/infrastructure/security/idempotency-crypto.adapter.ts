import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import type {
  IdempotencyCryptoPort,
  CanonicalRegistrationRequest,
  FingerprintOutcome,
  EncryptedIdempotencyOutcome,
} from '../../application/ports/auth-crypto.ports';
import type { RegisterResult } from '../../application/auth.models';
import type { CompletedRegistrationRecord } from '../../application/ports/registration-persistence.port';

export interface IdempotencyCryptoOptions {
  encryptionKeyHex: string;
  fingerprintSecretHex: string;
  defaultKeyId?: string;
}

export class IdempotencyCryptoAdapter implements IdempotencyCryptoPort {
  private readonly encryptionKeyBuf: Buffer;
  private readonly fingerprintSecretBuf: Buffer;
  private readonly defaultKeyId: string;

  constructor(options: IdempotencyCryptoOptions) {
    if (
      !options ||
      !options.encryptionKeyHex ||
      !options.encryptionKeyHex.trim() ||
      !options.fingerprintSecretHex ||
      !options.fingerprintSecretHex.trim()
    ) {
      throw new Error(
        'Missing required IdempotencyCryptoAdapter options (encryptionKeyHex, fingerprintSecretHex)',
      );
    }
    this.encryptionKeyBuf = Buffer.from(options.encryptionKeyHex, 'hex');
    this.fingerprintSecretBuf = Buffer.from(options.fingerprintSecretHex, 'hex');
    this.defaultKeyId = options.defaultKeyId ?? 'v1';
  }

  hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async fingerprint(
    request: CanonicalRegistrationRequest,
    keyId = this.defaultKeyId,
  ): Promise<FingerprintOutcome> {
    const payload = `${request.email.toLowerCase().trim()}:${request.displayName.trim()}:${request.password}`;
    const hash = createHmac('sha256', this.fingerprintSecretBuf).update(payload).digest('hex');
    return Promise.resolve({ hash, keyId });
  }

  async encryptResult(result: RegisterResult): Promise<EncryptedIdempotencyOutcome> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKeyBuf, iv);
    const jsonStr = JSON.stringify(result);
    const ciphertext = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedResponseBuf = Buffer.concat([iv, authTag, ciphertext]);

    return Promise.resolve({
      encryptedResponse: encryptedResponseBuf.toString('base64'),
      responseKeyId: this.defaultKeyId,
      responseNonce: iv.toString('hex'),
    });
  }

  async decryptResult(record: CompletedRegistrationRecord): Promise<RegisterResult> {
    try {
      const payloadBuf = Buffer.from(record.encryptedResponse, 'base64');
      if (payloadBuf.length < 28) {
        throw new Error('Invalid encrypted response payload length');
      }

      const iv = payloadBuf.subarray(0, 12);
      const authTag = payloadBuf.subarray(12, 28);
      const ciphertext = payloadBuf.subarray(28);

      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKeyBuf, iv);
      decipher.setAuthTag(authTag);

      const decryptedBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      const result = JSON.parse(decryptedBuf.toString('utf8')) as RegisterResult;
      return Promise.resolve(result);
    } catch (error) {
      throw new Error('Failed to decrypt idempotency outcome', { cause: error });
    }
  }
}
