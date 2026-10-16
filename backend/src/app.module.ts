import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { VaultModule } from './vault/vault.module';
import { HealthModule } from './health/health.module';
import { VersionModule } from './version/version.module';
import { EnvVars, validationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        uri: config.get('MONGO_URI', { infer: true }),
        dbName: config.get('MONGO_DB_NAME', { infer: true }),
        serverSelectionTimeoutMS: 5000,
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
