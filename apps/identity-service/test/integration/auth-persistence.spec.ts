/**
 * Integration tests verifying AuthPersistenceAdapter against real PostgreSQL
 * database transactions, idempotency atomicity, and login session persistence boundaries.
 */
import { createHash } from 'node:crypto';
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

  it('rotateSessionAtomically rotates valid session atomically: revokes old token, creates exactly one successor in same family without storing plaintext token', async () => {
    const activeUser: CustomerUser = {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'rotate_user@example.com',
      displayName: 'Rotate User',
      roles: ['CUSTOMER'],
    };

    await adapter.registerAtomically({
      user: activeUser,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$rotatehash',
      idempotencyRecord: {
        keyHash: 'hash_rotate_001',
        fingerprintHash: 'fp_rotate',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_rotate',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_rotate',
      },
    });

    const initialSession = await adapter.issueForActiveUserAtomically(activeUser);
    expect(initialSession).not.toBeNull();
    const oldRawToken = initialSession!.refreshToken;
    const oldTokenHash = createHash('sha256').update(oldRawToken).digest('hex');

    const initialRows = await testDataSource.query<
      Array<{ id: string; family_id: string; revoked_at: Date | null }>
    >('SELECT id, family_id, revoked_at FROM refresh_sessions WHERE token_hash = $1;', [
      oldTokenHash,
    ]);
    expect(initialRows).toHaveLength(1);
    const initialSessionId = initialRows[0]!.id;
    const familyId = initialRows[0]!.family_id;
    expect(initialRows[0]!.revoked_at).toBeNull();

    const nextSessionId = '33333333-3333-4333-a333-333333333333';
    const nextRawToken = 'new_raw_opaque_token_123';
    const nextTokenHash = createHash('sha256').update(nextRawToken).digest('hex');

    const rotationResult = await adapter.rotateSessionAtomically({
      oldTokenHash,
      nextSessionId,
      nextTokenHash,
    });

    expect(rotationResult.kind).toBe('success');
    if (rotationResult.kind === 'success') {
      expect(rotationResult.user.id).toBe(activeUser.id);
      expect(rotationResult.user.email).toBe(activeUser.email);

      const oldSessionRows = await testDataSource.query<
        Array<{ revoked_at: Date | null; revocation_reason: string | null }>
      >('SELECT revoked_at, revocation_reason FROM refresh_sessions WHERE id = $1;', [
        initialSessionId,
      ]);
      expect(oldSessionRows[0]!.revoked_at).not.toBeNull();
      expect(oldSessionRows[0]!.revocation_reason).toBe('ROTATED');

      const familyRows = await testDataSource.query<
        Array<{ id: string; token_hash: string; revoked_at: Date | null }>
      >(
        'SELECT id, token_hash, revoked_at FROM refresh_sessions WHERE family_id = $1 ORDER BY created_at ASC;',
        [familyId],
      );
      expect(familyRows).toHaveLength(2);

      const successor = familyRows[1]!;
      expect(successor.id).toBe(nextSessionId);
      expect(successor.token_hash).toBe(nextTokenHash);
      expect(successor.revoked_at).toBeNull();
      expect(successor.token_hash).not.toBe(nextRawToken);
    }
  });

  it('handles concurrent refresh with the same token: revokes entire session family and leaves no active successor', async () => {
    const activeUser: CustomerUser = {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'concurrent_user@example.com',
      displayName: 'Concurrent User',
      roles: ['CUSTOMER'],
    };

    await adapter.registerAtomically({
      user: activeUser,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$concurrent',
      idempotencyRecord: {
        keyHash: 'hash_concurrent_001',
        fingerprintHash: 'fp_concurrent',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_concurrent',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_concurrent',
      },
    });

    const initialSession = await adapter.issueForActiveUserAtomically(activeUser);
    expect(initialSession).not.toBeNull();
    const oldRawToken = initialSession!.refreshToken;
    const oldTokenHash = createHash('sha256').update(oldRawToken).digest('hex');

    const initialRows = await testDataSource.query<Array<{ family_id: string }>>(
      'SELECT family_id FROM refresh_sessions WHERE token_hash = $1;',
      [oldTokenHash],
    );
    const familyId = initialRows[0]!.family_id;

    const req1Input = {
      oldTokenHash,
      nextSessionId: '44444444-4444-4444-a444-444444444444',
      nextTokenHash: createHash('sha256').update('token_req_1').digest('hex'),
    };

    const req2Input = {
      oldTokenHash,
      nextSessionId: '55555555-5555-4555-a555-555555555555',
      nextTokenHash: createHash('sha256').update('token_req_2').digest('hex'),
    };

    const [res1, res2] = await Promise.all([
      adapter.rotateSessionAtomically(req1Input),
      adapter.rotateSessionAtomically(req2Input),
    ]);

    const results = [res1, res2];
    const successResults = results.filter((result) => result.kind === 'success');
    const replayResults = results.filter((result) => result.kind === 'replay_detected');

    expect(successResults).toHaveLength(1);
    expect(replayResults).toHaveLength(1);
    expect(replayResults[0]).toMatchObject({
      kind: 'replay_detected',
      familyId,
    });

    const activeFamilySessions = await testDataSource.query<Array<{ id: string }>>(
      'SELECT id FROM refresh_sessions WHERE family_id = $1 AND revoked_at IS NULL;',
      [familyId],
    );

    expect(activeFamilySessions).toHaveLength(0);
  });

  it('rotateSessionAtomically returns session_not_found for random/non-existent token hash and creates no successor', async () => {
    const randomTokenHash = createHash('sha256').update('non_existent_token').digest('hex');
    const nextSessionId = '66666666-6666-4666-a666-666666666666';
    const nextTokenHash = createHash('sha256').update('next_token').digest('hex');

    const result = await adapter.rotateSessionAtomically({
      oldTokenHash: randomTokenHash,
      nextSessionId,
      nextTokenHash,
    });

    expect(result).toEqual({ kind: 'session_not_found' });

    const rows = await testDataSource.query<Array<{ id: string }>>(
      'SELECT id FROM refresh_sessions WHERE id = $1;',
      [nextSessionId],
    );
    expect(rows).toHaveLength(0);
  });

  it('rotateSessionAtomically returns session_revoked for expired session and creates no successor', async () => {
    const activeUser: CustomerUser = {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'expired_user@example.com',
      displayName: 'Expired User',
      roles: ['CUSTOMER'],
    };

    await adapter.registerAtomically({
      user: activeUser,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$expired',
      idempotencyRecord: {
        keyHash: 'hash_expired_001',
        fingerprintHash: 'fp_expired',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_expired',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_expired',
      },
    });

    const initialSession = await adapter.issueForActiveUserAtomically(activeUser);
    expect(initialSession).not.toBeNull();
    const oldTokenHash = createHash('sha256').update(initialSession!.refreshToken).digest('hex');

    await testDataSource.query(
      "UPDATE refresh_sessions SET created_at = NOW() - INTERVAL '2 hours', expires_at = NOW() - INTERVAL '1 hour' WHERE token_hash = $1;",
      [oldTokenHash],
    );

    const nextSessionId = '77777777-7777-4777-a777-777777777777';
    const nextTokenHash = createHash('sha256').update('next_expired_token').digest('hex');

    const result = await adapter.rotateSessionAtomically({
      oldTokenHash,
      nextSessionId,
      nextTokenHash,
    });

    expect(result).toEqual({ kind: 'session_revoked' });

    const rows = await testDataSource.query<Array<{ id: string }>>(
      'SELECT id FROM refresh_sessions WHERE id = $1;',
      [nextSessionId],
    );
    expect(rows).toHaveLength(0);
  });

  it('rotateSessionAtomically returns session_revoked for manually revoked session and creates no successor', async () => {
    const activeUser: CustomerUser = {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'revoked_user@example.com',
      displayName: 'Revoked User',
      roles: ['CUSTOMER'],
    };

    await adapter.registerAtomically({
      user: activeUser,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$revoked',
      idempotencyRecord: {
        keyHash: 'hash_revoked_001',
        fingerprintHash: 'fp_revoked',
        fingerprintKeyId: 'k1',
        encryptedResponse: 'enc_revoked',
        responseKeyId: 'rk1',
        responseNonce: 'nonce_revoked',
      },
    });

    const initialSession = await adapter.issueForActiveUserAtomically(activeUser);
    expect(initialSession).not.toBeNull();
    const oldTokenHash = createHash('sha256').update(initialSession!.refreshToken).digest('hex');

    await testDataSource.query(
      "UPDATE refresh_sessions SET revoked_at = NOW(), revocation_reason = 'MANUAL_LOGOUT' WHERE token_hash = $1;",
      [oldTokenHash],
    );

    const nextSessionId = '88888888-8888-4888-a888-888888888888';
    const nextTokenHash = createHash('sha256').update('next_revoked_token').digest('hex');

    const result = await adapter.rotateSessionAtomically({
      oldTokenHash,
      nextSessionId,
      nextTokenHash,
    });

    expect(result).toEqual({ kind: 'session_revoked' });

    const rows = await testDataSource.query<Array<{ id: string }>>(
      'SELECT id FROM refresh_sessions WHERE id = $1;',
      [nextSessionId],
    );
    expect(rows).toHaveLength(0);
  });
});
