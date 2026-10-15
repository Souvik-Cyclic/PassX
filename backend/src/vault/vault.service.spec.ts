import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { VaultItem } from './schema/vault.schema';
import { VaultService } from './vault.service';

describe('VaultService', () => {
  let service: VaultService;
  const sort = jest.fn();
  const model = {
    create: jest.fn(),
    find: jest.fn().mockReturnValue({ sort }),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    model.find.mockReturnValue({ sort });
    const module = await Test.createTestingModule({
      providers: [
        VaultService,
        { provide: getModelToken(VaultItem.name), useValue: model },
      ],
    }).compile();
    service = module.get(VaultService);
  });

  it('creates an item owned by the user', async () => {
    model.create.mockResolvedValue({
      _id: 'v1',
      userId: 'u1',
      encryptedData: 'blob',
    });

    await expect(service.create('u1', 'blob')).resolves.toMatchObject({
      _id: 'v1',
    });
    expect(model.create).toHaveBeenCalledWith({
      userId: 'u1',
      encryptedData: 'blob',
    });
  });

  it('lists only the user items, newest first', async () => {
    sort.mockResolvedValue([]);

    await expect(service.findAll('u1')).resolves.toEqual([]);
    expect(model.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(sort).toHaveBeenCalledWith({ updatedAt: -1 });
  });

  it('updates an item scoped to the owner and returns the new document', async () => {
    model.findOneAndUpdate.mockResolvedValue({
      _id: 'v1',
      encryptedData: 'new',
    });

    await expect(service.update('v1', 'u1', 'new')).resolves.toEqual({
      _id: 'v1',
      encryptedData: 'new',
    });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'v1', userId: 'u1' },
      { encryptedData: 'new' },
      { returnDocument: 'after' },
    );
  });

  it('throws NotFound when updating an item the user does not own', async () => {
    model.findOneAndUpdate.mockResolvedValue(null);

    await expect(service.update('v1', 'u2', 'new')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes an item scoped to the owner', async () => {
    model.findOneAndDelete.mockResolvedValue({ _id: 'v1' });

    await expect(service.delete('v1', 'u1')).resolves.toEqual({
      success: true,
    });
    expect(model.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'v1',
      userId: 'u1',
    });
  });

  it('throws NotFound when deleting a missing item', async () => {
    model.findOneAndDelete.mockResolvedValue(null);

    await expect(service.delete('v1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
