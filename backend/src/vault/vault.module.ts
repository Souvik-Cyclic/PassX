import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { VaultItem, VaultSchema } from './schema/vault.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VaultItem.name, schema: VaultSchema }]),
  ],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
