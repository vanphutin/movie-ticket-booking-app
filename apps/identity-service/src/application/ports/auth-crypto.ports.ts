export interface PasswordHasher {
  readonly hash: (plaintext: string) => Promise<string>;
}

export interface IdGenerator {
  readonly generate: () => string;
}
