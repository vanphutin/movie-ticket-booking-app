import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { IdentityClientError } from '../../application/ports/identity-auth-client.port';

@Catch()
export class PublicErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Record<string, unknown>>();
    const res = ctx.getResponse<Record<string, unknown>>();

    const requestId =
      typeof req?.requestId === 'string' && req.requestId
        ? req.requestId
        : typeof (req?.headers as Record<string, unknown>)?.['x-request-id'] === 'string'
          ? ((req.headers as Record<string, unknown>)['x-request-id'] as string)
          : '';

    let statusCode: number;
    let code: string;
    let message: string;

    if (exception instanceof IdentityClientError) {
      switch (exception.kind) {
        case 'INVALID_INPUT':
          statusCode = 400;
          code = 'INVALID_INPUT';
          message = 'Invalid input request';
          break;
        case 'UNAUTHORIZED':
          statusCode = 401;
          code = 'UNAUTHORIZED';
          message = 'Authentication required';
          break;
        case 'FORBIDDEN':
          statusCode = 403;
          code = 'FORBIDDEN';
          message = 'Access forbidden';
          break;
        case 'NOT_FOUND':
          statusCode = 404;
          code = 'NOT_FOUND';
          message = 'Resource not found';
          break;
        case 'CONFLICT':
          statusCode = 409;
          code = 'CONFLICT';
          message = 'Resource conflict';
          break;
        case 'TIMEOUT':
        case 'SERVICE_UNAVAILABLE':
        case 'UNEXPECTED_RESPONSE':
          statusCode = 503;
          code = 'SERVICE_UNAVAILABLE';
          message = 'Service temporarily unavailable';
          break;
        default:
          statusCode = 500;
          code = 'INTERNAL_SERVER_ERROR';
          message = 'An unexpected internal error occurred';
          break;
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

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
      } else if (statusCode === 503) {
        code = 'SERVICE_UNAVAILABLE';
      } else {
        code = 'INTERNAL_SERVER_ERROR';
      }

      if (statusCode >= 500) {
        message = 'An unexpected internal error occurred';
      } else {
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
      }
    } else {
      statusCode = 500;
      code = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected internal error occurred';
    }

    const payload = {
      code,
      message,
      requestId,
    };

    if (typeof res.setHeader === 'function') {
      (res as unknown as { setHeader: (name: string, val: string) => void }).setHeader(
        'x-request-id',
        requestId,
      );
    } else if (typeof res.header === 'function') {
      (res as unknown as { header: (name: string, val: string) => void }).header(
        'x-request-id',
        requestId,
      );
    }

    if (typeof res.status === 'function') {
      const statusChain = (
        res as unknown as { status: (c: number) => Record<string, unknown> }
      ).status(statusCode);
      if (typeof statusChain.json === 'function') {
        (statusChain as unknown as { json: (data: unknown) => void }).json(payload);
      } else if (typeof statusChain.send === 'function') {
        (statusChain as unknown as { send: (data: unknown) => void }).send(payload);
      }
    }
  }
}
