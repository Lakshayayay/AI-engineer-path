import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// Imported before AppModule so the env check runs before anything else starts.
import { env } from './config/env.js';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Every route lives under /api, so the web app and the API never clash.
  app.setGlobalPrefix('api');

  await app.listen(env.PORT);
  Logger.log(`OpenSwap API running at http://localhost:${env.PORT}/api`, 'Bootstrap');
}

await bootstrap();
