import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
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

  await app.listen(Number(process.env.PORT));

  console.log(`API is running on http://localhost:${process.env.PORT}`);
  console.log(
    `Swagger docs available at http://localhost:${process.env.PORT}/docs`,
  );
}
void bootstrap();
