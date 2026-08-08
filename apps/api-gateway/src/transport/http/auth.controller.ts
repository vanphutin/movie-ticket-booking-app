import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ProxyAuthUseCase } from '../../application/proxy-auth.use-case';
import {
  RegisterRequestDto,
  LoginRequestDto,
  RefreshRequestDto,
  LogoutRequestDto,
} from './auth.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly proxyAuthUseCase: ProxyAuthUseCase) {
    if (!proxyAuthUseCase) {
      throw new Error('Missing required AuthController dependencies');
    }
  }

  private getTrustedRequestId(req: FastifyRequest & { requestId?: string }): string {
    const requestId = req?.requestId;
    if (!requestId || requestId.trim().length === 0) {
      throw new BadRequestException('Missing trusted request ID in request context');
    }
    return requestId;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: FastifyRequest & { requestId?: string },
  ): Promise<unknown> {
    const requestId = this.getTrustedRequestId(req);

    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header is required for registration');
    }
    if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      throw new BadRequestException('Idempotency-Key header must be between 16 and 128 characters');
    }

    const result = await this.proxyAuthUseCase.register(
      {
        email: body.email,
        password: body.password,
        displayName: body.displayName,
        idempotencyKey,
      },
      {
        requestId,
      },
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: 'Bearer',
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginRequestDto,
    @Req() req: FastifyRequest & { requestId?: string },
  ): Promise<unknown> {
    const requestId = this.getTrustedRequestId(req);

    const result = await this.proxyAuthUseCase.login(
      {
        email: body.email,
        password: body.password,
      },
      {
        requestId,
      },
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: 'Bearer',
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshRequestDto,
    @Req() req: FastifyRequest & { requestId?: string },
  ): Promise<unknown> {
    const requestId = this.getTrustedRequestId(req);

    const result = await this.proxyAuthUseCase.refresh(
      {
        refreshToken: body.refreshToken,
      },
      {
        requestId,
      },
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: 'Bearer',
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() body: LogoutRequestDto,
    @Req() req: FastifyRequest & { requestId?: string },
  ): Promise<void> {
    const requestId = this.getTrustedRequestId(req);

    await this.proxyAuthUseCase.logout(
      {
        refreshToken: body.refreshToken,
      },
      {
        requestId,
      },
    );
  }
}
