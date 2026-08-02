/**
 * Application use case implementing refresh token rotation and access token re-issuance.
 */
import { InvalidRefreshTokenError } from './auth.errors';
import type { RefreshCommand, RefreshResult } from './auth.models';
import type { AuthTokenPort, IdGenerator, RefreshTokenCryptoPort } from './ports/auth-crypto.ports';
import type { RefreshSessionRotationPort } from './ports/refresh-session-rotation.port';

export class RefreshUseCase {
  constructor(
    private readonly cryptoPort: RefreshTokenCryptoPort,
    private readonly rotationPort: RefreshSessionRotationPort,
    private readonly tokenPort: AuthTokenPort,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: RefreshCommand): Promise<RefreshResult> {
    const oldTokenHash = this.cryptoPort.hashRefreshToken(command.refreshToken);
    const nextSessionId = this.idGenerator.generate();
    const preparedNextToken = this.cryptoPort.prepareRefreshToken();

    const rotationResult = await this.rotationPort.rotateSessionAtomically({
      oldTokenHash,
      nextSessionId,
      nextTokenHash: preparedNextToken.tokenHash,
    });

    if (rotationResult.kind === 'success') {
      const accessToken = await this.tokenPort.signAccessToken(rotationResult.user);
      return {
        accessToken,
        refreshToken: preparedNextToken.rawToken,
        user: rotationResult.user,
      };
    }

    throw new InvalidRefreshTokenError();
  }
}
