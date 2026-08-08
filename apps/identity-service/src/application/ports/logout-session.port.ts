export type LogoutSessionResult =
  | { readonly kind: 'success' }
  | { readonly kind: 'already_revoked' }
  | { readonly kind: 'session_not_found' }
  | { readonly kind: 'expired' };

export interface RevokeFamilyInput {
  readonly tokenHash: string;
}

export interface LogoutSessionPort {
  revokeFamilyAtomically(input: RevokeFamilyInput): Promise<LogoutSessionResult>;
}
