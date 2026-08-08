import type { CanonicalSignedInput } from '@movie-ticket/auth-contract';
import { InternalRequestHmacSignerAdapter } from '../../src/infrastructure/security/internal-request-hmac-signer.adapter';

describe('InternalRequestHmacSignerAdapter (Integration)', () => {
  let signer: InternalRequestHmacSignerAdapter;
  const baseInput: CanonicalSignedInput = {
    method: 'POST',
    path: '/api/v1/auth/refresh',
    canonicalQuery: 'grant_type=refresh_token',
    bodySha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    audience: 'identity-service',
    actor: {
      id: 'usr_12345',
      roles: ['CUSTOMER'],
    },
    requestId: 'req_abc123',
    issuedAt: 1700000000,
    nonce: 'nonce_99999',
    keyId: 'v1',
  };

  beforeEach(() => {
    signer = new InternalRequestHmacSignerAdapter('secret-key-32-chars-long-for-test!!');
  });

  it('1. DETERMINISTIC: Cùng canonical request input phải tạo ra chữ ký giống hệt nhau', async () => {
    const sig1 = await signer.sign(baseInput);
    const sig2 = await signer.sign({ ...baseInput });
    expect(sig1).toBe(sig2);
  });

  it('2. BOUND: Ràng buộc đầy đủ 10 trường trong canonical input', async () => {
    const sigBase = await signer.sign(baseInput);
    // Kiểm tra từng trường thay đổi -> chữ ký phải thay đổi
    const fieldsToTamper: Array<Partial<CanonicalSignedInput>> = [
      { method: 'GET' },
      { path: '/api/v1/auth/logout' },
      { canonicalQuery: 'grant_type=other' },
      { bodySha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
      { audience: 'other-service' },
      { actor: { id: 'usr_tampered', roles: ['CUSTOMER'] } },
      { actor: null },
      { requestId: 'req_different' },
      { issuedAt: 1700000001 },
      { nonce: 'nonce_tampered' },
      { keyId: 'v2' },
    ];

    for (const tamper of fieldsToTamper) {
      const tamperedInput: CanonicalSignedInput = { ...baseInput, ...tamper };
      const tamperedSig = await signer.sign(tamperedInput);
      expect(tamperedSig).not.toBe(sigBase);
    }
  });

  it('3. NON-EXPOSURE: Không làm lộ secret hoặc raw body trong output header', async () => {
    const rawSecret = 'secret-key-32-chars-long-for-test!!';
    const sig = await signer.sign(baseInput);
    expect(sig).not.toContain(rawSecret);
  });

  it('4. KNOWN-GOOD: Chữ ký khớp chính xác với giá trị canonical mẫu D03', async () => {
    const sig = await signer.sign(baseInput);
    expect(sig).toBe(
      'v=1;kid=v1;iat=1700000000;nonce=nonce_99999;sig=tqM8PpZeHYRRPeFd-mECZ40xG8X67Sv_W2-oCfAlObQ',
    );
  });
});
