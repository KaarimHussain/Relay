import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const BrandId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.params.brandId ?? req.body.brandId ?? req.headers['x-brand-id'];
});
