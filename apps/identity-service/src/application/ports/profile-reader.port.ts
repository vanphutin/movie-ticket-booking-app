export interface UserProfile {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
}

export interface ProfileReaderPort {
  readonly findProfileById: (id: string) => Promise<UserProfile | null>;
}
