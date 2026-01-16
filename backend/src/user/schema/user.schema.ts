import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class User extends Document {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ required: true })
  authKeyHash: string;

  @Prop({ required: true })
  encryptedMasterKey: string;
}

export const UserSchema = SchemaFactory.createForClass(User);