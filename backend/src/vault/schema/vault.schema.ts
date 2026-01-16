import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class VaultItem extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  encryptedData: string;
}

export const VaultSchema = SchemaFactory.createForClass(VaultItem);