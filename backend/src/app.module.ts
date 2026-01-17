import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { VaultModule } from './vault/vault.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI!, {
      dbName: process.env.MONGO_DB_NAME!,
    }),
    AuthModule,
    UserModule,
    VaultModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
