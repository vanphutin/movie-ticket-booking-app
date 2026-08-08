import { type ArgumentsHost, BadRequestException } from '@nestjs/common';
import { InternalErrorFilter } from '../../src/transport/http/internal-error.filter';
import {
  RegistrationConflictError,
  IdempotencyKeyConflictError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  UnauthorizedError,
} from '../../src/application/auth.errors';

describe('InternalErrorFilter Unit Tests', () => {
  let filter: InternalErrorFilter;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new InternalErrorFilter();
    mockSend = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ send: mockSend });

    const mockReply = {
      status: mockStatus,
    };
    const mockRequest = {};

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockReply,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('maps RegistrationConflictError to HTTP 409 Conflict', () => {
    const error = new RegistrationConflictError('User registration conflict');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockSend).toHaveBeenCalledWith({
      code: 'REGISTRATION_CONFLICT',
      message: 'User registration conflict',
    });
  });

  it('maps IdempotencyKeyConflictError to HTTP 409 Conflict', () => {
    const error = new IdempotencyKeyConflictError('Idempotency key reused with different payload');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockSend).toHaveBeenCalledWith({
      code: 'IDEMPOTENCY_KEY_CONFLICT',
      message: 'Idempotency key reused with different payload',
    });
  });

  it('maps InvalidCredentialsError to HTTP 401 Unauthorized', () => {
    const error = new InvalidCredentialsError('Invalid email or password');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockSend).toHaveBeenCalledWith({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  });

  it('maps InvalidRefreshTokenError to HTTP 401 Unauthorized', () => {
    const error = new InvalidRefreshTokenError('Invalid or expired refresh token');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockSend).toHaveBeenCalledWith({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid or expired refresh token',
    });
  });

  it('maps UnauthorizedError to HTTP 401 Unauthorized', () => {
    const error = new UnauthorizedError('Unauthorized');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockSend).toHaveBeenCalledWith({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  });

  it('passes through NestJS BadRequestException as HTTP 400 INVALID_INPUT', () => {
    const error = new BadRequestException('Validation failed');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockSend).toHaveBeenCalledWith({
      code: 'INVALID_INPUT',
      message: 'Validation failed',
    });
  });

  it('handles generic unhandled Error as HTTP 500 INTERNAL_SERVER_ERROR', () => {
    const error = new Error('Database connection failed');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockSend).toHaveBeenCalledWith({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
    });
  });
});
