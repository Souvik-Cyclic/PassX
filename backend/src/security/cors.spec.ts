import { buildCorsOptions } from './cors';

describe('buildCorsOptions', () => {
  it('disables CORS when no origins are configured', () => {
    expect(buildCorsOptions('', 'production')).toBe(false);
    expect(buildCorsOptions('   ', 'production')).toBe(false);
  });

  it('allows any origin only in development', () => {
    expect(buildCorsOptions('*', 'development')).toEqual({ origin: true });
  });

  it('refuses a wildcard outside development', () => {
    expect(() => buildCorsOptions('*', 'production')).toThrow(
      'CORS_ORIGINS="*" is not allowed outside development',
    );
    expect(() => buildCorsOptions('*', 'test')).toThrow();
  });

  it('builds a trimmed allowlist from a comma-separated list', () => {
    expect(
      buildCorsOptions(
        ' https://app.example.com, https://passx.local ',
        'production',
      ),
    ).toEqual({
      origin: ['https://app.example.com', 'https://passx.local'],
      credentials: false,
    });
  });

  it('drops empty entries from the list', () => {
    expect(buildCorsOptions('https://a.example,,', 'production')).toEqual({
      origin: ['https://a.example'],
      credentials: false,
    });
  });
});
