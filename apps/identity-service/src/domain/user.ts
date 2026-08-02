/** Public registration creates a Customer only; callers cannot choose the initial role. */

export interface CustomerUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly ['CUSTOMER'];
}

export interface CreateCustomerUserInput {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
}

export function createCustomerUser(input: CreateCustomerUserInput): CustomerUser {
  return {
    id: input.id,
    email: input.email,
    displayName: input.displayName,
    roles: ['CUSTOMER'],
  };
}
