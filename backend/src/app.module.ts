import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI!, {
      dbName: process.env.MONGO_DB_NAME!,
    }),
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
