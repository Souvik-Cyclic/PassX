import { ExecutionContext } from '@nestjs/common';
import { userFactory } from './user.decorator';

const contextWithRequest = (request: object): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('userFactory', () => {
  const ctx = contextWithRequest({ user: { userId: 'u1' } });

  it('returns a single field when a key is given', () => {
    expect(userFactory('userId', ctx)).toBe('u1');
  });

  it('returns the whole user when no key is given', () => {
    expect(userFactory(undefined, ctx)).toEqual({ userId: 'u1' });
  });

  it('returns null when the request has no user', () => {
    expect(userFactory('userId', contextWithRequest({}))).toBeNull();
  });
});
