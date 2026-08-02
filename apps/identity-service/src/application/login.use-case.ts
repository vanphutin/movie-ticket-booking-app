import { InvalidCredentialsError } from './auth.errors';
import type { LoginCommand, LoginResult } from './auth.models';
import type { AuthTokenPort, PasswordHasher } from './ports/auth-crypto.ports';
import type { CredentialReaderPort, LoginSessionPort } from './ports/login-session.port';

export class LoginUseCase {
  constructor(
    private readonly credentialReader: CredentialReaderPort,
    private readonly passwordHasher: PasswordHasher,
    private readonly loginSession: LoginSessionPort,
    private readonly authToken: AuthTokenPort,
  ) {}

  async execute(_command: LoginCommand): Promise<LoginResult> {
    const normalizedEmail = _command.email.trim().toLowerCase();

    const credential = await this.credentialReader.findCredentialByEmail(normalizedEmail);
    if (!credential || credential.status !== 'ACTIVE') {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await this.passwordHasher.verify(
      _command.password,
      credential.passwordHash,
    );
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    const sessionResult = await this.loginSession.issueForActiveUserAtomically(credential.user);
    if (!sessionResult) {
      throw new InvalidCredentialsError();
    }
    const accessToken = await this.authToken.signAccessToken(credential.user);
    return {
      accessToken,
      refreshToken: sessionResult.refreshToken,
      user: credential.user,
    };
  }
}
