import { DataSource } from 'typeorm';

export const createIdentityDataSource = (databaseUrl: string): DataSource =>
  new DataSource({
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    migrations: [__dirname + '/../../../migrations/*.{js,ts}'],
  });
