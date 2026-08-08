/**
 * Application use case implementing refresh token rotation and access token re-issuance.
 */
import { InvalidRefreshTokenError } from './auth.errors';
import type { RefreshCommand, RefreshResult, TrustedInvocationContext } from './auth.models';
import type { AuthTokenPort, IdGenerator, RefreshTokenCryptoPort } from './ports/auth-crypto.ports';
import type { RefreshSessionRotationPort } from './ports/refresh-session-rotation.port';

export class RefreshUseCase {
  constructor(
    private readonly cryptoPort: RefreshTokenCryptoPort,
    private readonly rotationPort: RefreshSessionRotationPort,
    private readonly tokenPort: AuthTokenPort,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(
    command: RefreshCommand,
    _context: TrustedInvocationContext,
  ): Promise<RefreshResult> {
    void _context;
    const oldTokenHash = this.cryptoPort.hashRefreshToken(command.refreshToken);
    const nextSessionId = this.idGenerator.generate();
    const preparedNextToken = this.cryptoPort.prepareRefreshToken();

    const rotationResult = await this.rotationPort.rotateSessionAtomically({
      oldTokenHash,
      nextSessionId,
      nextTokenHash: preparedNextToken.tokenHash,
    });

    if (rotationResult.kind === 'success') {
      const token = await this.tokenPort.signAccessToken(rotationResult.user);
      return {
        accessToken: token.accessToken,
        refreshToken: preparedNextToken.rawToken,
        expiresIn: token.expiresIn,
        user: rotationResult.user,
      };
    }

    throw new InvalidRefreshTokenError();
  }
}
