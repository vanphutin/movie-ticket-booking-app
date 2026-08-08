import type { ConfigService } from '@nestjs/config';

export interface ValidatedGatewayConfig {
  readonly identityServiceUrl: string;
  readonly internalSigningSecret: string;
  readonly internalKeyId: string;
  readonly identityAudience: string;
  readonly jwtPublicKey: string;
  readonly jwtKeyId: string;
  readonly jwtIssuer: string;
  readonly jwtAudience: string;
}

export function validateGatewayConfig(config: ConfigService): ValidatedGatewayConfig {
  const required = (key: string): string => {
    const value = config.get<string>(key)?.trim();
    if (!value) throw new Error(`${key} is required`);
    return value;
  };

  return {
    identityServiceUrl: required('IDENTITY_SERVICE_URL'),
    internalSigningSecret: required('GATEWAY_INTERNAL_SIGNING_SECRET'),
    internalKeyId: required('GATEWAY_INTERNAL_KEY_ID'),
    identityAudience: required('IDENTITY_INTERNAL_AUDIENCE'),
    jwtPublicKey: required('JWT_PUBLIC_KEY'),
    jwtKeyId: required('JWT_KEY_ID'),
    jwtIssuer: required('JWT_ISSUER'),
    jwtAudience: required('JWT_AUDIENCE'),
  };
}
