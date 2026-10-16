import './instrument';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { EnvVars } from './config/env.validation';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('PassX API')
    .setDescription(
      'API for PassX: securely create, store, update, and retrieve encrypted credentials.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = app
    .get(ConfigService<EnvVars, true>)
    .get('PORT', { infer: true });
  await app.listen(port);

  app.get(Logger).log(`API listening on port ${port}, docs at /docs`);
}
void bootstrap();
