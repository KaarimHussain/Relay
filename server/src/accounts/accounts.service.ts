import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { encrypt, decrypt } from '../common/crypto.util';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async connect(brandId: string, dto: ConnectAccountDto) {
    return this.prisma.socialAccount.upsert({
      where: { brandId_platform_platformUserId: { brandId, platform: dto.platform, platformUserId: dto.platformUserId } },
      update: {
        platformHandle: dto.platformHandle,
        accessToken: encrypt(dto.accessToken),
        refreshToken: dto.refreshToken ? encrypt(dto.refreshToken) : null,
        tokenExpiresAt: dto.tokenExpiresAt ? new Date(dto.tokenExpiresAt) : null,
        status: AccountStatus.Active,
      },
      create: {
        brandId,
        platform: dto.platform,
        platformUserId: dto.platformUserId,
        platformHandle: dto.platformHandle,
        accessToken: encrypt(dto.accessToken),
        refreshToken: dto.refreshToken ? encrypt(dto.refreshToken) : null,
        tokenExpiresAt: dto.tokenExpiresAt ? new Date(dto.tokenExpiresAt) : null,
      },
    });
  }

  async list(brandId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { brandId },
      select: { id: true, platform: true, platformHandle: true, status: true, tokenExpiresAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return accounts;
  }

  async disconnect(brandId: string, accountId: string) {
    const account = await this.prisma.socialAccount.findFirst({ where: { id: accountId, brandId } });
    if (!account) throw new NotFoundException('Account not found');
    return this.prisma.socialAccount.update({
      where: { id: accountId },
      data: { status: AccountStatus.Disconnected },
    });
  }

  async healthCheck(brandId: string, accountId: string) {
    const account = await this.prisma.socialAccount.findFirst({ where: { id: accountId, brandId } });
    if (!account) throw new NotFoundException('Account not found');
    // In a real implementation, call the platform API to verify token validity.
    // For now, check if token is expired.
    const expired = account.tokenExpiresAt && account.tokenExpiresAt < new Date();
    const status = expired ? AccountStatus.Expired : AccountStatus.Active;
    if (account.status !== status) {
      await this.prisma.socialAccount.update({ where: { id: accountId }, data: { status } });
    }
    return { accountId, status, platformHandle: account.platformHandle };
  }

  // Used internally by the publishing worker — returns decrypted token
  async getDecryptedAccount(accountId: string) {
    const account = await this.prisma.socialAccount.findUniqueOrThrow({ where: { id: accountId } });
    return {
      ...account,
      accessToken: decrypt(account.accessToken),
      refreshToken: account.refreshToken ? decrypt(account.refreshToken) : null,
    };
  }
}
