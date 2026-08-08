import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { TrustedRequestContext } from '@movie-ticket/auth-contract';
import { InternalAuthGuard } from './internal-auth.guard';
import {
  InternalRegisterRequestDto,
  InternalRegisterResponseDto,
  InternalLoginRequestDto,
  InternalLoginResponseDto,
  InternalRefreshRequestDto,
  InternalRefreshResponseDto,
  InternalLogoutRequestDto,
} from './internal-auth.dto';
import { RegisterUseCase } from '../../application/register.use-case';
import { LoginUseCase } from '../../application/login.use-case';
import { RefreshUseCase } from '../../application/refresh.use-case';
import { LogoutUseCase } from '../../application/logout.use-case';

@Controller('internal/auth')
@UseGuards(InternalAuthGuard)
export class InternalAuthController {
  constructor(
    @Inject(RegisterUseCase)
    private readonly registerUseCase: RegisterUseCase,
    @Inject(LoginUseCase)
    private readonly loginUseCase: LoginUseCase,
    @Inject(RefreshUseCase)
    private readonly refreshUseCase: RefreshUseCase,
    @Inject(LogoutUseCase)
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: FastifyRequest & { internalContext?: TrustedRequestContext },
    @Body() dto: InternalRegisterRequestDto,
  ): Promise<InternalRegisterResponseDto> {
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
      throw new BadRequestException('Missing or invalid Idempotency-Key header');
    }

    if (!req.internalContext) {
      throw new UnauthorizedException('Missing trusted request context');
    }

    const result = await this.registerUseCase.execute(
      {
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName,
        idempotencyKey: idempotencyKey.trim(),
      },
      req.internalContext,
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Req() req: FastifyRequest & { internalContext?: TrustedRequestContext },
    @Body() dto: InternalLoginRequestDto,
  ): Promise<InternalLoginResponseDto> {
    if (!req.internalContext) {
      throw new UnauthorizedException('Missing trusted request context');
    }

    const result = await this.loginUseCase.execute(
      {
        email: dto.email,
        password: dto.password,
      },
      req.internalContext,
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: FastifyRequest & { internalContext?: TrustedRequestContext },
    @Body() dto: InternalRefreshRequestDto,
  ): Promise<InternalRefreshResponseDto> {
    if (!req.internalContext) {
      throw new UnauthorizedException('Missing trusted request context');
    }

    const result = await this.refreshUseCase.execute(
      {
        refreshToken: dto.refreshToken,
      },
      req.internalContext,
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
    };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: FastifyRequest & { internalContext?: TrustedRequestContext },
    @Body() dto: InternalLogoutRequestDto,
  ): Promise<void> {
    if (!req.internalContext) {
      throw new UnauthorizedException('Missing trusted request context');
    }

    await this.logoutUseCase.execute(
      {
        refreshToken: dto.refreshToken,
      },
      req.internalContext,
    );
  }
}
