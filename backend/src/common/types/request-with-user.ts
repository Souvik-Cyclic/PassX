import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}
