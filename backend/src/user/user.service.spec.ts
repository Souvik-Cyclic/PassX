import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { User } from './schema/user.schema';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  const model = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: model },
      ],
    }).compile();
    service = module.get(UserService);
  });

  it('creates a user with the given data', async () => {
    const data = {
      email: 'a@b.com',
      authKeyHash: 'h',
      encryptedMasterKey: 'k',
    };
    model.create.mockResolvedValue({ id: 'u1', ...data });

    await expect(service.create(data)).resolves.toMatchObject({ id: 'u1' });
    expect(model.create).toHaveBeenCalledWith(data);
  });

  it('looks up emails case-insensitively', async () => {
    model.findOne.mockResolvedValue(null);

    await service.findByEmail('A@B.com');

    expect(model.findOne).toHaveBeenCalledWith({ email: 'a@b.com' });
  });

  it('finds a user by id', async () => {
    model.findById.mockResolvedValue({ id: 'u1' });

    await expect(service.findById('u1')).resolves.toEqual({ id: 'u1' });
    expect(model.findById).toHaveBeenCalledWith('u1');
  });
});
