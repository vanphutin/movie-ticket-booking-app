import type { DataSource } from 'typeorm';

export const seedIdentity = async (dataSource: DataSource): Promise<void> => {
  await dataSource.query(
    `INSERT INTO roles (code, description)
     VALUES ('CUSTOMER', 'Default role for public registration')
     ON CONFLICT (code) DO NOTHING;`,
  );
};
