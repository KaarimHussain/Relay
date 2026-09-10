import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type TokenRecord = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
};

@Injectable()
export class McpAccessTokenService {
  constructor(private prisma: PrismaService) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private serialize(token: TokenRecord) {
    return {
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
    };
  }

  async listForUser(userId: string) {
    const tokens = await this.prisma.mcpAccessToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return tokens.map((token) => this.serialize(token));
  }

  async create(userId: string, name: string, expiresAt?: string) {
    const rawToken = `relay_mcp_${randomBytes(32).toString('base64url')}`;
    const token = await this.prisma.mcpAccessToken.create({
      data: {
        userId,
        name: name.trim(),
        tokenHash: this.hash(rawToken),
        tokenPrefix: rawToken.slice(0, 18),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    return { ...this.serialize(token), token: rawToken };
  }

  async revoke(userId: string, tokenId: string) {
    await this.prisma.mcpAccessToken.deleteMany({ where: { id: tokenId, userId } });
  }

  async authenticate(rawToken: string): Promise<string | null> {
    const token = await this.prisma.mcpAccessToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (!token || (token.expiresAt && token.expiresAt <= new Date())) return null;
    await this.prisma.mcpAccessToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });
    return token.userId;
  }
}
