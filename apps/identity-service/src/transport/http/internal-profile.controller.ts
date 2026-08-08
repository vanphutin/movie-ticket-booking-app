import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { TrustedRequestContext } from '@movie-ticket/auth-contract';
import { InternalAuthGuard } from './internal-auth.guard';
import { InternalProfileResponseDto } from './internal-auth.dto';
import { GetProfileUseCase } from '../../application/get-profile.use-case';

@Controller('internal/auth')
@UseGuards(InternalAuthGuard)
export class InternalProfileController {
  constructor(
    @Inject(GetProfileUseCase)
    private readonly getProfileUseCase: GetProfileUseCase,
  ) {}

  @Get('me')
  @HttpCode(200)
  async getProfile(
    @Req() req: FastifyRequest & { internalContext?: TrustedRequestContext },
  ): Promise<InternalProfileResponseDto> {
    if (!req.internalContext) {
      throw new UnauthorizedException('Missing trusted request context');
    }
    if (!req.internalContext.actor?.id) {
      throw new UnauthorizedException('Missing verified actor context');
    }

    const profile = await this.getProfileUseCase.execute(req.internalContext.actor.id);

    return {
      user: {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
      },
    };
  }
}
