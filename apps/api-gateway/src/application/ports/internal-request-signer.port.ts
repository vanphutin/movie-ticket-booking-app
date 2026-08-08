import type { CanonicalSignedInput } from '@movie-ticket/auth-contract';

export interface InternalRequestSignerPort {
  /**
   * Tính toán chữ ký HMAC dựa trên input chuẩn hóa (canonical input).
   * @param input Các trường thông tin cần bảo vệ
   * @returns Chuỗi header chữ ký đã mã hóa
   */
  sign(input: CanonicalSignedInput): Promise<string>;
}
