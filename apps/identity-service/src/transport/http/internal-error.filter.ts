import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  RegistrationConflictError,
  IdempotencyKeyConflictError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  UnauthorizedError,
} from '../../application/auth.errors';

@Catch()
export class InternalErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    void request;

    let statusCode = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal error occurred';

    if (exception instanceof RegistrationConflictError) {
      statusCode = 409;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof IdempotencyKeyConflictError) {
      statusCode = 409;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof InvalidCredentialsError) {
      statusCode = 401;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof InvalidRefreshTokenError) {
      statusCode = 401;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof UnauthorizedError) {
      statusCode = 401;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'message' in responseBody
      ) {
        const resMsg = (responseBody as Record<string, unknown>).message;
        if (Array.isArray(resMsg)) {
          message = resMsg.join(', ');
        } else if (typeof resMsg === 'string') {
          message = resMsg;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }

      if (statusCode === 400) {
        code = 'INVALID_INPUT';
      } else if (statusCode === 401) {
        code = 'UNAUTHORIZED';
      } else if (statusCode === 403) {
        code = 'FORBIDDEN';
      } else if (statusCode === 404) {
        code = 'NOT_FOUND';
      } else if (statusCode === 409) {
        code = 'CONFLICT';
      } else {
        code = 'HTTP_ERROR';
      }
    }

    void reply.status(statusCode).send({
      code,
      message,
    });
  }
}
