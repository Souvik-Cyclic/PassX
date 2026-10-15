import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('maps the token subject to userId', () => {
    const strategy = new JwtStrategy();

    expect(strategy.validate({ sub: 'u1' })).toEqual({ userId: 'u1' });
  });
});
