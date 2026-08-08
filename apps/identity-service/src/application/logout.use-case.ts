import { InvalidRefreshTokenError } from './auth.errors';
import type { TrustedInvocationContext } from './auth.models';
import type { RefreshTokenCryptoPort } from './ports/auth-crypto.ports';
import type { LogoutSessionPort } from './ports/logout-session.port';

export interface LogoutCommand {
  readonly refreshToken: string;
}

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenCryptoPort: RefreshTokenCryptoPort,
    private readonly logoutSessionPort: LogoutSessionPort,
  ) {}

  async execute(command: LogoutCommand, _context: TrustedInvocationContext): Promise<void> {
    void _context;
    const tokenHash = this.refreshTokenCryptoPort.hashRefreshToken(command.refreshToken);
    const result = await this.logoutSessionPort.revokeFamilyAtomically({ tokenHash });

    if (result.kind === 'success' || result.kind === 'already_revoked') {
      return;
    }
    throw new InvalidRefreshTokenError();
  }
}
