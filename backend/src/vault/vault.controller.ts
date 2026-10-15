import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VaultService } from './vault.service';
import { CreateVaultDto } from './dto/create-vault.dto';
import { UpdateVaultDto } from './dto/update-vault.dto';
import { User } from 'src/common/decorators/user.decorator';

@ApiTags('Vault')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vault item' })
  @ApiResponse({
    status: 201,
    description: 'Vault item created',
    schema: { example: { id: 'vaultId', encryptedData: '...' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@User('userId') userId: string, @Body() dto: CreateVaultDto) {
    return this.vaultService.create(userId, dto.encryptedData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vault items for the user' })
  @ApiResponse({
    status: 200,
    description: 'List all vault items',
    schema: {
      example: [{ id: 'vaultId', encryptedData: '...', type: 'password' }],
    },
  })
  findAll(@User('userId') userId: string) {
    return this.vaultService.findAll(userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a vault item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vault item updated',
    schema: {
      example: { id: 'vaultId', encryptedData: '...', type: 'password' },
    },
  })
  @ApiResponse({ status: 404, description: 'Vault item not found' })
  update(
    @User('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVaultDto,
  ) {
    return this.vaultService.update(id, userId, dto.encryptedData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vault item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Vault item deleted',
    schema: { example: { success: true } },
  })
  @ApiResponse({ status: 404, description: 'Vault item not found' })
  delete(@User('userId') userId: string, @Param('id') id: string) {
    return this.vaultService.delete(id, userId);
  }
}
