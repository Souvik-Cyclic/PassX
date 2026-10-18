import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const user = await this.usersService.create({
      email: dto.email,
      authKeyHash: dto.authKeyHash,
      encryptedMasterKey: dto.encryptedMasterKey,
    });

    return {
      accessToken: this.signToken(user.id),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const stored = Buffer.from(user.authKeyHash);
    const incoming = Buffer.from(dto.authKeyHash);

    if (stored.length !== incoming.length) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = timingSafeEqual(stored, incoming);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      accessToken: this.signToken(user.id),
      encryptedMasterKey: user.encryptedMasterKey,
    };
  }

  private signToken(userId: string) {
    return this.jwtService.sign({
      sub: userId,
    });
  }
}
