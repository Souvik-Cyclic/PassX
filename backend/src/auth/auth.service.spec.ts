import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let service: AuthService;
  const userService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = { sign: jest.fn().mockReturnValue('signed.jwt') };

  const signupDto = {
    email: 'user@example.com',
    authKeyHash: 'abcd',
    encryptedMasterKey: 'emk',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe('signup', () => {
    it('rejects an email that already exists', async () => {
      userService.findByEmail.mockResolvedValue({ id: 'u1' });

      await expect(service.signup(signupDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('creates the user and returns a signed token', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue({ id: 'u1' });

      const result = await service.signup(signupDto);

      expect(userService.create).toHaveBeenCalledWith({
        email: signupDto.email,
        authKeyHash: signupDto.authKeyHash,
        encryptedMasterKey: signupDto.encryptedMasterKey,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'u1' });
      expect(result).toEqual({ accessToken: 'signed.jwt' });
    });
  });

  describe('login', () => {
    const loginDto = { email: 'user@example.com', authKeyHash: 'abcd' };

    it('rejects an unknown email', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a hash of a different length without throwing a crypto error', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 'u1',
        authKeyHash: 'abc',
        encryptedMasterKey: 'emk',
      });

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a hash of the same length with different bytes', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 'u1',
        authKeyHash: 'abce',
        encryptedMasterKey: 'emk',
      });

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns a token and the encrypted master key on a matching hash', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 'u1',
        authKeyHash: 'abcd',
        encryptedMasterKey: 'emk',
      });

      const result = await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'u1' });
      expect(result).toEqual({
        accessToken: 'signed.jwt',
        encryptedMasterKey: 'emk',
      });
    });
  });
});
