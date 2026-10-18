import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';

describe('VaultController', () => {
  let controller: VaultController;
  const vaultService = {
    create: jest.fn().mockResolvedValue({ _id: 'v1' }),
    findAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ _id: 'v1' }),
    delete: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [VaultController],
      providers: [{ provide: VaultService, useValue: vaultService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(VaultController);
  });

  it('creates with the caller userId and body', async () => {
    await controller.create('u1', { encryptedData: 'blob' });

    expect(vaultService.create).toHaveBeenCalledWith('u1', 'blob');
  });

  it('lists for the caller', async () => {
    await expect(controller.findAll('u1')).resolves.toEqual([]);
    expect(vaultService.findAll).toHaveBeenCalledWith('u1');
  });

  it('updates with id, caller userId and body', async () => {
    await controller.update('u1', 'v1', { encryptedData: 'new' });

    expect(vaultService.update).toHaveBeenCalledWith('v1', 'u1', 'new');
  });

  it('deletes with id and caller userId', async () => {
    await expect(controller.delete('u1', 'v1')).resolves.toEqual({
      success: true,
    });
    expect(vaultService.delete).toHaveBeenCalledWith('v1', 'u1');
  });
});
