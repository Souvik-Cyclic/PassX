import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser, RequestWithUser } from '../types/request-with-user';

export const userFactory = (
  data: keyof AuthenticatedUser | undefined,
  ctx: ExecutionContext,
): AuthenticatedUser | string | null => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();

  const user = request.user;

  if (!user) return null;

  return data ? user[data] : user;
};

export const User = createParamDecorator(userFactory);
