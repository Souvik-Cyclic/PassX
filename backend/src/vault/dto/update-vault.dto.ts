import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateVaultDto {
  @ApiProperty({ example: 'updated_encrypted_blob' })
  @IsString()
  encryptedData: string;
}
