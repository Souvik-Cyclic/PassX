import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Connection } from 'mongoose';
import { LoggerModule } from 'nestjs-pino';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { VaultModule } from './vault/vault.module';
import { HealthModule } from './health/health.module';
import { VersionModule } from './version/version.module';
import { MetricsModule } from './metrics/metrics.module';
import { isThrottleExempt } from './security/throttling';
import { EnvVars, validationSchema } from './config/env.validation';
import { buildPinoHttpOptions } from './logging/logger.config';
import { attachMongoReconnect } from './config/mongo-reconnect';

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
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
        skipIf: isThrottleExempt,
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => {
        const uri = config.get('MONGO_URI', { infer: true });
        return {
          uri,
          dbName: config.get('MONGO_DB_NAME', { infer: true }),
          serverSelectionTimeoutMS: 5000,
          // Serve liveness and /version before Mongo is up; readiness shows DB state.
          lazyConnection: true,
          connectionFactory: (connection: Connection) =>
            attachMongoReconnect(connection, uri),
        };
      },
    }),
    AuthModule,
    UserModule,
    VaultModule,
    HealthModule,
    VersionModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
