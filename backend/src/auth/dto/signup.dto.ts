import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'auth_key_hash' })
  @IsString()
  authKeyHash: string;

  @ApiProperty({ example: 'encrypted_master_key_blob' })
  @IsString()
  encryptedMasterKey: string;
}