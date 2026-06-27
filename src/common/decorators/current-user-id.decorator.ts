import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * MVP helper: đọc user hiện tại từ header `x-user-id`.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const value = request.headers['x-user-id'];
    const userId = Array.isArray(value) ? value[0] : value;

    if (!userId) {
      throw new BadRequestException('Thiếu header x-user-id');
    }

    return userId;
  },
);
