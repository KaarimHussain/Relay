import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { McpAccessTokenService } from './mcp-access-token.service';

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private accessTokens: McpAccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : '';

    if (!token) throw new UnauthorizedException('A bearer token is required');

    if (token.startsWith('relay_mcp_')) {
      const userId = await this.accessTokens.authenticate(token);
      if (!userId) throw new UnauthorizedException('This MCP access token is invalid, expired, or revoked');
      request.user = { id: userId, authType: 'mcp_access_token' };
      return true;
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }
}
