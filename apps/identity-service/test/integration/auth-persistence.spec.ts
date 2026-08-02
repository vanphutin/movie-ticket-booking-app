/**
 * Integration tests verifying AuthPersistenceAdapter against real PostgreSQL
 * database transactions, idempotency atomicity, and login session persistence boundaries.
 */
import type { DataSource } from 'typeorm';
import type { CustomerUser } from '../../src/domain/user';
import type { RegisterAtomicallyInput } from '../../src/application/ports/registration-persistence.port';
import { seedIdentity } from '../../seeds/seed-identity';
import { AuthPersistenceAdapter } from '../../src/infrastructure/database/auth-persistence.adapter';
import { createIdentityDataSource } from '../../src/infrastructure/database/typeorm.config';

const TEST_DATABASE_URL =
  process.env.IDENTITY_TEST_DATABASE_URL ||
  'postgresql://movie_ticket_test:movie_ticket_test@127.0.0.1:55432/movie_ticket_test';

describe('AuthPersistenceAdapter (Integration)', () => {
  let testDataSource: DataSource;
  let adapter: AuthPersistenceAdapter;

  beforeAll(async () => {
    testDataSource = createIdentityDataSource(TEST_DATABASE_URL);
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
    await testDataSource.runMigrations();
    adapter = new AuthPersistenceAdapter(testDataSource);
  });

  afterAll(async () => {
    if (testDataSource?.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDataSource.query(
      'TRUNCATE TABLE refresh_sessions, registration_idempotency_records, user_roles, users, roles RESTART IDENTITY CASCADE;',
    );
    await seedIdentity(testDataSource);
  });

  it('handles concurrent registration with the same Idempotency-Key: exactly one winner succeeds and loser leaves no orphan records', async () => {
    const sharedKeyHash = 'hash_idem_concurrent_001';

    const winnerInput: RegisterAtomicallyInput = {
      user: {
        id: '11111111-1111-4111-a111-111111111111',
        email: 'winner@example.com',
        displayName: 'Winner User',
        roles: ['CUSTOMER'],
      },
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$winnerhash',
      idempotencyRecord: {
        keyHash: sharedKeyHash,
        fingerprintHash: 'fp_winner_hash',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_winner_result',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_winner',
      },
    };

    const loserInput: RegisterAtomicallyInput = {
      user: {
        id: '22222222-2222-4222-a222-222222222222',
        email: 'loser@example.com',
        displayName: 'Loser User',
        roles: ['CUSTOMER'],
      },
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$loserhash',
      idempotencyRecord: {
        keyHash: sharedKeyHash,
        fingerprintHash: 'fp_loser_hash',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_loser_result',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_loser',
      },
    };

    const [result1, result2] = await Promise.all([
      adapter.registerAtomically(winnerInput),
      adapter.registerAtomically(loserInput),
    ]);

    const createdResults = [result1, result2].filter((r) => r.kind === 'created');
    expect(createdResults).toHaveLength(1);

    const usersResult = await testDataSource.query<Array<{ id: string; email: string }>>(
      'SELECT id, email_normalized AS email FROM users;',
    );
    expect(usersResult).toHaveLength(1);
    expect(usersResult[0]?.email).toBe('winner@example.com');

    const userRolesResult = await testDataSource.query<Array<{ user_id: string }>>(
      'SELECT user_id FROM user_roles;',
    );
    expect(userRolesResult).toHaveLength(1);
    expect(userRolesResult[0]?.user_id).toBe('11111111-1111-4111-a111-111111111111');

    const idempotencyResult = await testDataSource.query<
      Array<{ key_hash: string; encrypted_response: string }>
    >('SELECT key_hash, encrypted_response FROM registration_idempotency_records;');
    expect(idempotencyResult).toHaveLength(1);
    expect(idempotencyResult[0]?.key_hash).toBe(sharedKeyHash);
    expect(idempotencyResult[0]?.encrypted_response).toBe('enc_winner_result');

    const completedRecord = await adapter.findCompletedByKey('REGISTER', sharedKeyHash);
    expect(completedRecord).not.toBeNull();
    expect(completedRecord?.encryptedResponse).toBe('enc_winner_result');
  });

  it('rejects registration with duplicate email in atomic transaction and leaves no orphan idempotency record or role data', async () => {
    const userAInput: RegisterAtomicallyInput = {
      user: {
        id: '11111111-1111-4111-a111-111111111111',
        email: 'duplicate@example.com',
        displayName: 'User A',
        roles: ['CUSTOMER'],
      },
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$userAhash',
      idempotencyRecord: {
        keyHash: 'hash_idem_user_a',
        fingerprintHash: 'fp_user_a',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_user_a',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_a',
      },
    };

    const resultA = await adapter.registerAtomically(userAInput);
    expect(resultA.kind).toBe('created');

    const userBInput: RegisterAtomicallyInput = {
      user: {
        id: '22222222-2222-4222-a222-222222222222',
        email: 'duplicate@example.com',
        displayName: 'User B',
        roles: ['CUSTOMER'],
      },
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$userBhash',
      idempotencyRecord: {
        keyHash: 'hash_idem_user_b',
        fingerprintHash: 'fp_user_b',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_user_b',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_b',
      },
    };

    const resultB = await adapter.registerAtomically(userBInput);
    expect(resultB.kind).toBe('email_already_exists');

    const usersResult = await testDataSource.query<Array<{ id: string; email: string }>>(
      'SELECT id, email_normalized AS email FROM users;',
    );
    expect(usersResult).toHaveLength(1);
    expect(usersResult[0]?.id).toBe('11111111-1111-4111-a111-111111111111');

    const userRolesResult = await testDataSource.query<Array<{ user_id: string }>>(
      'SELECT user_id FROM user_roles;',
    );
    expect(userRolesResult).toHaveLength(1);
    expect(userRolesResult[0]?.user_id).toBe('11111111-1111-4111-a111-111111111111');

    const idempotencyResult = await testDataSource.query<Array<{ key_hash: string }>>(
      'SELECT key_hash FROM registration_idempotency_records;',
    );
    expect(idempotencyResult).toHaveLength(1);
    expect(idempotencyResult[0]?.key_hash).toBe('hash_idem_user_a');
  });

  it('findCredentialByEmail retrieves minimal credential record for active user', async () => {
    await adapter.registerAtomically({
      user: {
        id: '11111111-1111-4111-a111-111111111111',
        email: 'active@example.com',
        displayName: 'Active User',
        roles: ['CUSTOMER'],
      },
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$validhash',
      idempotencyRecord: {
        keyHash: 'hash_login_active_001',
        fingerprintHash: 'fp_active',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_active',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_active',
      },
    });

    const credential = await adapter.findCredentialByEmail('active@example.com');

    expect(credential).not.toBeNull();
    expect(credential?.user.id).toBe('11111111-1111-4111-a111-111111111111');
    expect(credential?.user.email).toBe('active@example.com');
    expect(credential?.passwordHash).toBe('$argon2id$v=19$m=65536,t=3,p=4$validhash');
    expect(credential?.status).toBe('ACTIVE');
    expect(credential).not.toHaveProperty('displayName');
    expect(credential).not.toHaveProperty('roles');
  });

  it('issueForActiveUserAtomically issues session for active user and rolls back for non-existent user', async () => {
    const activeUser: CustomerUser = {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'active_session@example.com',
      displayName: 'Active User Session',
      roles: ['CUSTOMER'],
    };

    await adapter.registerAtomically({
      user: activeUser,
      passwordHash: '$argon2id$hash',
      idempotencyRecord: {
        keyHash: 'hash_login_session_001',
        fingerprintHash: 'fp_session',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_session',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_session',
      },
    });

    const activeSession = await adapter.issueForActiveUserAtomically(activeUser);
    expect(activeSession).not.toBeNull();
    expect(activeSession?.refreshToken).toBeDefined();

    const nonExistentUser: CustomerUser = {
      id: '99999999-9999-4999-a999-999999999999',
      email: 'nonexistent@example.com',
      displayName: 'Non Existent',
      roles: ['CUSTOMER'],
    };

    const invalidSession = await adapter.issueForActiveUserAtomically(nonExistentUser);
    expect(invalidSession).toBeNull();

    const invalidDbRows = await testDataSource.query<Array<{ id: string }>>(
      'SELECT id FROM refresh_sessions WHERE user_id = $1;',
      [nonExistentUser.id],
    );
    expect(invalidDbRows).toHaveLength(0);
  });

  it('issueForActiveUserAtomically rejects session issuance and rolls back when user is disabled', async () => {
    const disabledUser: CustomerUser = {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'disabled@example.com',
      displayName: 'Disabled User',
      roles: ['CUSTOMER'],
    };

    await adapter.registerAtomically({
      user: disabledUser,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$disabledhash',
      idempotencyRecord: {
        keyHash: 'hash_login_disabled_001',
        fingerprintHash: 'fp_disabled',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_disabled',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_disabled',
      },
    });

    await testDataSource.query("UPDATE users SET status = 'DISABLED' WHERE id = $1;", [
      disabledUser.id,
    ]);

    const disabledSession = await adapter.issueForActiveUserAtomically(disabledUser);
    expect(disabledSession).toBeNull();

    const dbRows = await testDataSource.query<Array<{ id: string }>>(
      'SELECT id FROM refresh_sessions WHERE user_id = $1;',
      [disabledUser.id],
    );
    expect(dbRows).toHaveLength(0);
  });
});
