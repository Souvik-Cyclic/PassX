import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { VaultItem } from './schema/vault.schema';

@Injectable()
export class VaultService {
  constructor(
    @InjectModel(VaultItem.name)
    private readonly vaultModel: Model<VaultItem>,
  ) {}

  create(userId: string, encryptedData: string) {
    return this.vaultModel.create({
      userId,
      encryptedData,
    });
  }

  findAll(userId: string) {
    return this.vaultModel.find({ userId }).sort({ updatedAt: -1 });
  }

  async update(id: string, userId: string, encryptedData: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Vault item not found');
    }

    const item = await this.vaultModel.findOneAndUpdate(
      { _id: id, userId },
      { encryptedData },
      { returnDocument: 'after' },
    );

    if (!item) {
      throw new NotFoundException('Vault item not found');
    }

    return item;
  }

  async delete(id: string, userId: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Vault item not found');
    }

    const result = await this.vaultModel.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!result) {
      throw new NotFoundException('Vault item not found');
    }

    return { success: true };
  }
}
