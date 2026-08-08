import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import 'reflect-metadata';

import { ApiGatewayModule } from './bootstrap/api-gateway.module';
import { PublicErrorFilter } from './transport/http/public-error.filter';
import { requestContextHook } from './transport/http/request-context.hook';

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
  const app = await NestFactory.create<NestFastifyApplication>(
    ApiGatewayModule,
    new FastifyAdapter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new PublicErrorFilter());
  app.getHttpAdapter().getInstance().addHook('onRequest', requestContextHook);

  await app.listen({
    host: requiredHost('API_GATEWAY_HOST'),
    port: requiredPort('API_GATEWAY_PORT'),
  });
}

void bootstrap();
