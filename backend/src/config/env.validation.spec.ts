import type { ValidationError, ValidationOptions } from 'joi';
import { EnvVars, validationSchema } from './env.validation';

const validate = (
  input: object,
  options?: ValidationOptions,
): { error?: ValidationError; value: EnvVars } => {
  const result = validationSchema.validate(input, options);
  return { error: result.error, value: result.value as EnvVars };
};

describe('validationSchema', () => {
  const minimal = {
    MONGO_URI: 'mongodb://localhost:27017',
    JWT_SECRET: 's3cret',
  };

  it('accepts the minimal required set and fills defaults', () => {
    const { error, value } = validate(minimal);

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.NODE_ENV).toBe('development');
    expect(value.MONGO_DB_NAME).toBe('passx');
    expect(value.LOG_LEVEL).toBe('info');
    expect(value.CORS_ORIGINS).toBe('');
    expect(value.METRICS_PORT).toBe(9464);
    expect(value.APP_COMMIT).toBe('unknown');
    expect(value.BREAK_READINESS).toBe(false);
    expect(value.TRUST_PROXY).toBe(0);
  });

  it('requires MONGO_URI and JWT_SECRET', () => {
    const { error } = validate({}, { abortEarly: false });

    expect(error?.message).toContain('"MONGO_URI" is required');
    expect(error?.message).toContain('"JWT_SECRET" is required');
  });

  it('rejects a non-numeric PORT', () => {
    const { error } = validate({ ...minimal, PORT: 'abc' });

    expect(error?.message).toContain('"PORT"');
  });

  it('rejects an unknown NODE_ENV', () => {
    const { error } = validate({ ...minimal, NODE_ENV: 'staging' });

    expect(error?.message).toContain('"NODE_ENV"');
  });

  it('requires a 32+ character JWT_SECRET in production', () => {
    const { error } = validate({ ...minimal, NODE_ENV: 'production' });
    expect(error?.message).toContain('"JWT_SECRET"');
    const ok = validate({
      ...minimal,
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(32),
    });
    expect(ok.error).toBeUndefined();
  });

  it('coerces BREAK_READINESS from the string "true"', () => {
    const { value } = validate({ ...minimal, BREAK_READINESS: 'true' });

    expect(value.BREAK_READINESS).toBe(true);
  });

  it('allows unknown keys so the real process env passes', () => {
    const { error } = validate(
      { ...minimal, HOME: '/home/x' },
      { allowUnknown: true },
    );

    expect(error).toBeUndefined();
  });
});
