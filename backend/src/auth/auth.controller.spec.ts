import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    signup: jest.fn().mockResolvedValue({ accessToken: 't' }),
    login: jest
      .fn()
      .mockResolvedValue({ accessToken: 't', encryptedMasterKey: 'k' }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get(AuthController);
  });

  it('delegates signup to the service', async () => {
    const dto = { email: 'a@b.com', authKeyHash: 'h', encryptedMasterKey: 'k' };

    await expect(controller.signup(dto)).resolves.toEqual({ accessToken: 't' });
    expect(authService.signup).toHaveBeenCalledWith(dto);
  });

  it('delegates login to the service', async () => {
    const dto = { email: 'a@b.com', authKeyHash: 'h' };

    await expect(controller.login(dto)).resolves.toEqual({
      accessToken: 't',
      encryptedMasterKey: 'k',
    });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });
});
