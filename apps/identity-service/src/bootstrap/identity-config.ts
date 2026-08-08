import type { ConfigService } from '@nestjs/config';

export interface ValidatedIdentityConfig {
  gatewayInternalSigningSecret: string;
  jwtPrivateKey: string;
  jwtPublicKey: string;
  jwtKeyId: string;
  jwtIssuer: string;
  jwtAudience: string;
  idempotencyEncryptionKeyHex: string;
  fingerprintSecretHex: string;
  databaseUrl: string;
  accessTokenTtlSeconds: number;
}

export function validateIdentityConfig(configService: ConfigService): ValidatedIdentityConfig {
  const getRequired = (key: string): string => {
    const val = configService.get<string>(key);
    if (!val || typeof val !== 'string' || !val.trim()) {
      throw new Error(`Missing required configuration key: ${key}`);
    }
    return val.trim();
  };
  const ttlRaw = getRequired('JWT_ACCESS_TOKEN_TTL_SECONDS');
  const accessTokenTtlSeconds = Number(ttlRaw);
  if (
    !/^\d+$/.test(ttlRaw) ||
    !Number.isSafeInteger(accessTokenTtlSeconds) ||
    accessTokenTtlSeconds <= 0
  ) {
    throw new Error('JWT_ACCESS_TOKEN_TTL_SECONDS must be a positive integer');
  }

  return {
    gatewayInternalSigningSecret: getRequired('GATEWAY_INTERNAL_SIGNING_SECRET'),
    jwtPrivateKey: getRequired('JWT_PRIVATE_KEY'),
    jwtPublicKey: getRequired('JWT_PUBLIC_KEY'),
    jwtKeyId: getRequired('JWT_KEY_ID'),
    jwtIssuer: getRequired('JWT_ISSUER'),
    jwtAudience: getRequired('JWT_AUDIENCE'),
    idempotencyEncryptionKeyHex: getRequired('IDEMPOTENCY_ENCRYPTION_KEY'),
    fingerprintSecretHex: getRequired('FINGERPRINT_HMAC_SECRET'),
    databaseUrl: getRequired('DATABASE_URL'),
    accessTokenTtlSeconds,
  };
}
