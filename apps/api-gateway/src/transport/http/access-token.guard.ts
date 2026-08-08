import {
  Injectable,
  Inject,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { MinimalTrustedActor } from '@movie-ticket/auth-contract';
import type { AccessTokenVerifierPort } from '../../application/ports/access-token-verifier.port';

interface RequestWithActor {
  headers?: Record<string, string | string[] | undefined>;
  actor?: MinimalTrustedActor;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject('AccessTokenVerifierPort')
    private readonly verifier: AccessTokenVerifierPort,
  ) {
    if (!verifier) {
      throw new Error('Missing required AccessTokenGuard dependency (AccessTokenVerifierPort)');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithActor>();

    const rawAuthHeader =
      request?.headers?.['authorization'] ?? request?.headers?.['Authorization'];

    if (!rawAuthHeader || Array.isArray(rawAuthHeader) || typeof rawAuthHeader !== 'string') {
      throw new UnauthorizedException(
        'Unauthorized access: Invalid or missing authorization header',
      );
    }

    if (rawAuthHeader.includes(',')) {
      throw new UnauthorizedException(
        'Unauthorized access: Multiple authorization credentials rejected',
      );
    }

    const parts = rawAuthHeader.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Unauthorized access: Invalid authorization scheme');
    }

    const token = parts[1];
    if (!token || !token.trim()) {
      throw new UnauthorizedException('Unauthorized access: Empty bearer token');
    }

    let actor: MinimalTrustedActor;
    try {
      actor = await this.verifier.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Unauthorized access: Invalid or expired access token');
    }

    request.actor = actor;
    return true;
  }
}
