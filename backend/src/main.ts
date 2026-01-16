import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  await app.listen(Number(process.env.PORT));

  console.log(`API is running on http://localhost:${process.env.PORT}`);
}
bootstrap();
