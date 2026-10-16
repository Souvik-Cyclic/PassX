import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { VaultModule } from './vault/vault.module';
import { HealthModule } from './health/health.module';
import { VersionModule } from './version/version.module';
import { EnvVars, validationSchema } from './config/env.validation';
import { buildPinoHttpOptions } from './logging/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        pinoHttp: buildPinoHttpOptions(config),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        uri: config.get('MONGO_URI', { infer: true }),
        dbName: config.get('MONGO_DB_NAME', { infer: true }),
        serverSelectionTimeoutMS: 5000,
        // Start serving (liveness, /version) before Mongo is reachable;
        // readiness reports the real database state.
        lazyConnection: true,
      }),
    }),
    AuthModule,
    UserModule,
    VaultModule,
    HealthModule,
    VersionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
