/**
 * Behavioral port for atomic refresh token rotation and replay detection in PostgreSQL.
 */
import type { CustomerUser } from '../../domain/user';

export type RefreshRotationResult =
  | {
      readonly kind: 'success';
      readonly user: CustomerUser;
    }
  | { readonly kind: 'session_not_found' }
  | { readonly kind: 'session_revoked' }
  | { readonly kind: 'replay_detected'; readonly familyId: string };

export interface RotateSessionInput {
  readonly oldTokenHash: string;
  readonly nextSessionId: string;
  readonly nextTokenHash: string;
}

export interface RefreshSessionRotationPort {
  readonly rotateSessionAtomically: (input: RotateSessionInput) => Promise<RefreshRotationResult>;
}
