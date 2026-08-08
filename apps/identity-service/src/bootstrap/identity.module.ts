import { Module, Injectable } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { InternalAuthController } from '../transport/http/internal-auth.controller';
import { InternalProfileController } from '../transport/http/internal-profile.controller';
import { InternalAuthGuard } from '../transport/http/internal-auth.guard';
import { InternalRequestVerifierAdapter } from '../infrastructure/security/internal-request-verifier.adapter';
import { InternalNonceStoreAdapter } from '../infrastructure/database/internal-nonce-store.adapter';
import { AuthPersistenceAdapter } from '../infrastructure/database/auth-persistence.adapter';
import { Argon2PasswordAdapter } from '../infrastructure/security/argon2-password.adapter';
import { AuthTokenAdapter } from '../infrastructure/security/auth-token.adapter';
import { IdempotencyCryptoAdapter } from '../infrastructure/security/idempotency-crypto.adapter';
import { createIdentityDataSource } from '../infrastructure/database/typeorm.config';
import { seedIdentity } from '../../seeds/seed-identity';
import { validateIdentityConfig } from './identity-config';

import { RegisterUseCase } from '../application/register.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshUseCase } from '../application/refresh.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { GetProfileUseCase } from '../application/get-profile.use-case';

import type {
  IdGenerator,
  RefreshTokenCryptoPort,
  PreparedRefreshToken,
} from '../application/ports/auth-crypto.ports';

@Injectable()
export class DefaultIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}

@Injectable()
export class DefaultRefreshTokenCrypto implements RefreshTokenCryptoPort {
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  prepareRefreshToken(): PreparedRefreshToken {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashRefreshToken(rawToken);
    return { rawToken, tokenHash };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
  ],
  controllers: [InternalAuthController, InternalProfileController],
  providers: [
    InternalAuthGuard,
    DefaultIdGenerator,
    DefaultRefreshTokenCrypto,
    {
      provide: DataSource,
      useFactory: async (configService: ConfigService) => {
        const validatedConfig = validateIdentityConfig(configService);
        const dataSource = createIdentityDataSource(validatedConfig.databaseUrl);
        if (!dataSource.isInitialized) {
          await dataSource.initialize();
        }
        await seedIdentity(dataSource);
        return dataSource;
      },
      inject: [ConfigService],
    },
    {
      provide: InternalRequestVerifierAdapter,
      useFactory: (configService: ConfigService) => {
        const validatedConfig = validateIdentityConfig(configService);
        return new InternalRequestVerifierAdapter(validatedConfig.gatewayInternalSigningSecret);
      },
      inject: [ConfigService],
    },
    {
      provide: Argon2PasswordAdapter,
      useFactory: () => new Argon2PasswordAdapter(),
    },
    {
      provide: AuthTokenAdapter,
      useFactory: (configService: ConfigService) => {
        const validatedConfig = validateIdentityConfig(configService);
        return new AuthTokenAdapter({
          privateKey: validatedConfig.jwtPrivateKey,
          publicKey: validatedConfig.jwtPublicKey,
          keyId: validatedConfig.jwtKeyId,
          issuer: validatedConfig.jwtIssuer,
          audience: validatedConfig.jwtAudience,
          expiresInSeconds: validatedConfig.accessTokenTtlSeconds,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: IdempotencyCryptoAdapter,
      useFactory: (configService: ConfigService) => {
        const validatedConfig = validateIdentityConfig(configService);
        return new IdempotencyCryptoAdapter({
          encryptionKeyHex: validatedConfig.idempotencyEncryptionKeyHex,
          fingerprintSecretHex: validatedConfig.fingerprintSecretHex,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'InternalNonceStorePort',
      useFactory: (dataSource: DataSource) => new InternalNonceStoreAdapter(dataSource),
      inject: [DataSource],
    },
    {
      provide: AuthPersistenceAdapter,
      useFactory: (dataSource: DataSource) => new AuthPersistenceAdapter(dataSource),
      inject: [DataSource],
    },
    {
      provide: RegisterUseCase,
      useFactory: (
        hasher: Argon2PasswordAdapter,
        idGen: DefaultIdGenerator,
        persistence: AuthPersistenceAdapter,
        idempCrypto: IdempotencyCryptoAdapter,
        refreshTokenCrypto: DefaultRefreshTokenCrypto,
        authToken: AuthTokenAdapter,
      ) =>
        new RegisterUseCase(hasher, idGen, persistence, idempCrypto, refreshTokenCrypto, authToken),
      inject: [
        Argon2PasswordAdapter,
        DefaultIdGenerator,
        AuthPersistenceAdapter,
        IdempotencyCryptoAdapter,
        DefaultRefreshTokenCrypto,
        AuthTokenAdapter,
      ],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        persistence: AuthPersistenceAdapter,
        hasher: Argon2PasswordAdapter,
        authToken: AuthTokenAdapter,
      ) => new LoginUseCase(persistence, hasher, persistence, authToken),
      inject: [AuthPersistenceAdapter, Argon2PasswordAdapter, AuthTokenAdapter],
    },
    {
      provide: RefreshUseCase,
      useFactory: (
        refreshCrypto: DefaultRefreshTokenCrypto,
        persistence: AuthPersistenceAdapter,
        authToken: AuthTokenAdapter,
        idGen: DefaultIdGenerator,
      ) => new RefreshUseCase(refreshCrypto, persistence, authToken, idGen),
      inject: [
        DefaultRefreshTokenCrypto,
        AuthPersistenceAdapter,
        AuthTokenAdapter,
        DefaultIdGenerator,
      ],
    },
    {
      provide: LogoutUseCase,
      useFactory: (refreshCrypto: DefaultRefreshTokenCrypto, persistence: AuthPersistenceAdapter) =>
        new LogoutUseCase(refreshCrypto, persistence),
      inject: [DefaultRefreshTokenCrypto, AuthPersistenceAdapter],
    },
    {
      provide: GetProfileUseCase,
      useFactory: (persistence: AuthPersistenceAdapter) => new GetProfileUseCase(persistence),
      inject: [AuthPersistenceAdapter],
    },
  ],
})
export class IdentityModule {}
