import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('internal_request_nonces')
export class InternalRequestNonceOrmEntity {
  @PrimaryColumn({ name: 'audience', type: 'varchar', length: 50 })
  audience!: string;

  @PrimaryColumn({ name: 'nonce_hash', type: 'varchar', length: 64 })
  nonceHash!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 100 })
  requestId!: string;

  @Column({ name: 'key_id', type: 'varchar', length: 50 })
  keyId!: string;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt!: Date;

  @CreateDateColumn({ name: 'claimed_at', type: 'timestamptz' })
  claimedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
}
