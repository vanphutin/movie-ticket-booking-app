import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { MinimalTrustedActor } from '@movie-ticket/auth-contract';
import { ProxyAuthUseCase } from '../../application/proxy-auth.use-case';
import { AccessTokenGuard } from './access-token.guard';

@Controller('api/v1')
@UseGuards(AccessTokenGuard)
export class MeController {
  constructor(private readonly proxyAuthUseCase: ProxyAuthUseCase) {
    if (!proxyAuthUseCase) {
      throw new Error('Missing required MeController dependencies');
    }
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @Req() req: FastifyRequest & { requestId?: string; actor?: MinimalTrustedActor },
  ): Promise<unknown> {
    const requestId = req?.requestId;
    if (!requestId || requestId.trim().length === 0) {
      throw new BadRequestException('Missing trusted request ID in request context');
    }

    const actor = req?.actor;
    if (
      !actor ||
      !actor.id ||
      actor.id.trim().length === 0 ||
      !Array.isArray(actor.roles) ||
      actor.roles.some((role) => typeof role !== 'string' || role.trim().length === 0)
    ) {
      throw new UnauthorizedException('Missing or invalid verified actor context');
    }

    const result = await this.proxyAuthUseCase.getProfile({ requestId, actor });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        ...(result.user.roles ? { roles: result.user.roles } : {}),
      },
    };
  }
}
