import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateVaultDto {
  @ApiProperty({ example: 'encrypted_blob' })
  @IsString()
  encryptedData: string;
}