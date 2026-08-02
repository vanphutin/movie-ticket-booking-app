/**
 * Integration tests for RegistrationPersistencePort adapter with PostgreSQL verifying
 * atomic registration, concurrent idempotency-key race conditions, transaction rollbacks,
 * garbage data absence, and winner completed record retrieval.
 */
import type {
  RegisterAtomicallyInput,
  RegistrationPersistencePort,
} from '../../src/application/ports/registration-persistence.port';
import type { CustomerUser } from '../../src/domain/user';
import { seedIdentity } from '../../seeds/seed-identity';
import { AuthPersistenceAdapter } from '../../src/infrastructure/database/auth-persistence.adapter';
import { createIdentityDataSource } from '../../src/infrastructure/database/typeorm.config';
import type { DataSource } from 'typeorm';

describe('RegistrationPersistencePort (PostgreSQL Integration)', () => {
  let adapter!: RegistrationPersistencePort;
  let dataSource!: DataSource;

  beforeAll(async () => {
    dataSource = createIdentityDataSource(
      process.env.IDENTITY_TEST_DATABASE_URL ??
        'postgres://movie_ticket_test:movie_ticket_test@127.0.0.1:55432/movie_ticket_test',
    );
    await dataSource.initialize();
    await dataSource.runMigrations();
    await seedIdentity(dataSource);
    adapter = new AuthPersistenceAdapter(dataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE registration_idempotency_records, user_roles, users CASCADE');
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Concurrent idempotency-key registration race', () => {
    it('ensures exactly one winner creates user/idempotency record, loser receives idempotency_key_exists, leaves no garbage data, and replays winner record', async () => {
      const keyHash = 'hash_concurrent_race_key_999';

      const winnerUser: CustomerUser = {
        id: 'f1111111-1111-4111-8111-111111111111',
        email: 'winner@example.com',
        displayName: 'Winner User',
        roles: ['CUSTOMER'],
      };

      const loserUser: CustomerUser = {
        id: 'f2222222-2222-4222-8222-222222222222',
        email: 'loser@example.com',
        displayName: 'Loser User',
        roles: ['CUSTOMER'],
      };

      const inputWinner: RegisterAtomicallyInput = {
        user: winnerUser,
        passwordHash: '$argon2id$winner',
        idempotencyRecord: {
          keyHash,
          fingerprintHash: 'fp_winner_hash',
          fingerprintKeyId: 'v1',
          encryptedResponse: 'enc_winner_response',
          responseKeyId: 'key_v1',
          responseNonce: 'nonce_v1',
        },
      };

      const inputLoser: RegisterAtomicallyInput = {
        user: loserUser,
        passwordHash: '$argon2id$loser',
        idempotencyRecord: {
          keyHash, // SAME keyHash causes PostgreSQL UNIQUE constraint race condition
          fingerprintHash: 'fp_loser_hash',
          fingerprintKeyId: 'v1',
          encryptedResponse: 'enc_loser_response',
          responseKeyId: 'key_v1',
          responseNonce: 'nonce_v1',
        },
      };

      // Concurrent execution of registerAtomically with identical Idempotency-Key
      const [resultA, resultB] = await Promise.all([
        adapter.registerAtomically(inputWinner),
        adapter.registerAtomically(inputLoser),
      ]);

      const results = [resultA, resultB];
      const createdResults = results.filter((r) => r.kind === 'created');
      const raceConflictResults = results.filter((r) => r.kind === 'idempotency_key_exists');

      // 1. Race condition boundary: Exactly ONE winner succeeds, ONE loser receives idempotency_key_exists
      expect(createdResults).toHaveLength(1);
      expect(raceConflictResults).toHaveLength(1);

      // 2. Winner created user successfully
      const winnerResult = createdResults[0];
      expect(winnerResult?.kind).toBe('created');

      // 3. Replay winner record boundary: Loser queries findCompletedByKey and reads winner's completed record
      const winnerRecord = await adapter.findCompletedByKey('REGISTER', keyHash);

      expect(winnerRecord).not.toBeNull();
      expect(winnerRecord?.fingerprintHash).toBe('fp_winner_hash');
      expect(winnerRecord?.encryptedResponse).toBe('enc_winner_response');
      expect(winnerRecord?.responseKeyId).toBe('key_v1');
      expect(winnerRecord?.responseNonce).toBe('nonce_v1');

      const loserUsers = await dataSource.query<{ count: string }[]>(
        'SELECT COUNT(*)::text AS count FROM users WHERE id = $1',
        [loserUser.id],
      );
      const loserRoleAssignments = await dataSource.query<{ count: string }[]>(
        'SELECT COUNT(*)::text AS count FROM user_roles WHERE user_id = $1',
        [loserUser.id],
      );
      expect(loserUsers[0]?.count).toBe('0');
      expect(loserRoleAssignments[0]?.count).toBe('0');
    });
  });

  describe('Duplicate email rollback', () => {
    it('does not create a role assignment or idempotency record for the rejected registration', async () => {
      const firstUser: CustomerUser = {
        id: 'f3333333-3333-4333-8333-333333333333',
        email: 'duplicate@example.com',
        displayName: 'First User',
        roles: ['CUSTOMER'],
      };
      const rejectedUser: CustomerUser = {
        id: 'f4444444-4444-4444-8444-444444444444',
        email: 'duplicate@example.com',
        displayName: 'Rejected User',
        roles: ['CUSTOMER'],
      };
      const createInput = (user: CustomerUser, keyHash: string): RegisterAtomicallyInput => ({
        user,
        passwordHash: '$argon2id$test',
        idempotencyRecord: {
          keyHash,
          fingerprintHash: `fp_${keyHash}`,
          fingerprintKeyId: 'v1',
          encryptedResponse: `enc_${keyHash}`,
          responseKeyId: 'k1',
          responseNonce: `nonce_${keyHash}`,
        },
      });

      await expect(
        adapter.registerAtomically(createInput(firstUser, 'hash_duplicate_first')),
      ).resolves.toMatchObject({ kind: 'created' });
      await expect(
        adapter.registerAtomically(createInput(rejectedUser, 'hash_duplicate_rejected')),
      ).resolves.toEqual({ kind: 'email_already_exists' });

      const rejectedUsers = await dataSource.query<{ count: string }[]>(
        'SELECT COUNT(*)::text AS count FROM users WHERE id = $1',
        [rejectedUser.id],
      );
      const rejectedRoles = await dataSource.query<{ count: string }[]>(
        'SELECT COUNT(*)::text AS count FROM user_roles WHERE user_id = $1',
        [rejectedUser.id],
      );
      const rejectedRecords = await dataSource.query<{ count: string }[]>(
        'SELECT COUNT(*)::text AS count FROM registration_idempotency_records WHERE key_hash = $1',
        ['hash_duplicate_rejected'],
      );
      expect(rejectedUsers[0]?.count).toBe('0');
      expect(rejectedRoles[0]?.count).toBe('0');
      expect(rejectedRecords[0]?.count).toBe('0');
    });
  });
});
