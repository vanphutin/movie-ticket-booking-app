import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import 'reflect-metadata';

import { IdentityModule } from './bootstrap/identity.module';
import { InternalErrorFilter } from './transport/http/internal-error.filter';

function requiredPort(name: string): number {
  const value = process.env[name];
  const port = Number(value);

  if (!value || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return port;
}

function requiredHost(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function bootstrap(): Promise<void> {
  const adapter = new FastifyAdapter();
  adapter.getInstance().addHook('preParsing', (request, _reply, payload, done) => {
    const chunks: Buffer[] = [];
    payload.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    payload.on('end', () => {
      (request as unknown as Record<string, unknown>).rawBody = Buffer.concat(chunks);
    });
    done(null, payload);
  });

  const app = await NestFactory.create<NestFastifyApplication>(IdentityModule, adapter);

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new InternalErrorFilter());

  await app.listen({
    host: requiredHost('IDENTITY_SERVICE_HOST'),
    port: requiredPort('IDENTITY_SERVICE_PORT'),
  });
}

void bootstrap();
