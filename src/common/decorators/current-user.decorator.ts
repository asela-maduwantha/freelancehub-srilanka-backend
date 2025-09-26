import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../database/schemas/user.schema';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
