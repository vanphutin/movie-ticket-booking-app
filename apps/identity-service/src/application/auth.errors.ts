export class RegistrationConflictError extends Error {
  readonly code = 'REGISTRATION_CONFLICT' as const;
  constructor(message = 'User registration conflict') {
    super(message);
    this.name = 'RegistrationConflictError';
  }
}

export class IdempotencyKeyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_KEY_CONFLICT' as const;
  constructor(message = 'Idempotency key reused with different payload') {
    super(message);
    this.name = 'IdempotencyKeyConflictError';
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS' as const;
  constructor(message = 'Invalid email or password') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}
