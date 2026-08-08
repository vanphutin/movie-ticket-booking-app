import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProxyAuthUseCase } from '../application/proxy-auth.use-case';
import { IdentityHttpAdapter } from '../infrastructure/http/identity-http.adapter';
import { InternalRequestHmacSignerAdapter } from '../infrastructure/security/internal-request-hmac-signer.adapter';
import { JwtAccessTokenVerifierAdapter } from '../infrastructure/security/jwt-access-token-verifier.adapter';
import { AccessTokenGuard } from '../transport/http/access-token.guard';
import { AuthController } from '../transport/http/auth.controller';
import { MeController } from '../transport/http/me.controller';
import { validateGatewayConfig } from './gateway-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [
    {
      provide: InternalRequestHmacSignerAdapter,
      useFactory: (config: ConfigService) =>
        new InternalRequestHmacSignerAdapter(validateGatewayConfig(config).internalSigningSecret),
      inject: [ConfigService],
    },
    {
      provide: IdentityHttpAdapter,
      useFactory: (config: ConfigService, signer: InternalRequestHmacSignerAdapter) => {
        const values = validateGatewayConfig(config);
        return new IdentityHttpAdapter({
          baseUrl: values.identityServiceUrl,
          signer,
          keyId: values.internalKeyId,
          audience: values.identityAudience,
        });
      },
      inject: [ConfigService, InternalRequestHmacSignerAdapter],
    },
    {
      provide: ProxyAuthUseCase,
      useFactory: (client: IdentityHttpAdapter) => new ProxyAuthUseCase(client),
      inject: [IdentityHttpAdapter],
    },
    {
      provide: 'AccessTokenVerifierPort',
      useFactory: (config: ConfigService) => {
        const values = validateGatewayConfig(config);
        return new JwtAccessTokenVerifierAdapter({
          publicKeysByKid: { [values.jwtKeyId]: values.jwtPublicKey },
          expectedIssuer: values.jwtIssuer,
          expectedAudience: values.jwtAudience,
        });
      },
      inject: [ConfigService],
    },
    AccessTokenGuard,
  ],
})
export class ApiGatewayModule {}
