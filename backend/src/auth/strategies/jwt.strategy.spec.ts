import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = { get: () => 'test-secret' } as unknown as ConfigService;

  it('maps the token subject to userId', () => {
    const strategy = new JwtStrategy(config);

    expect(strategy.validate({ sub: 'u1' })).toEqual({ userId: 'u1' });
  });
});
