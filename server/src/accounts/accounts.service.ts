import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { encrypt, decrypt } from '../common/crypto.util';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) { }

  async connect(brandId: string, dto: ConnectAccountDto) {
    if (!brandId) throw new BadRequestException('No brand selected — please create a brand first.');
    const brandExists = await this.prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brandExists) throw new NotFoundException(`Brand not found (id: ${brandId}). It may have been deleted.`);

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
      select: { id: true, platform: true, platformUserId: true, platformHandle: true, status: true, tokenExpiresAt: true, createdAt: true },
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

  // Manual LinkedIn company page connection (workaround for Community Management API restriction).
  // Reuses the personal LinkedIn account's token since posting to a company page uses the
  // member token with an org author URN — no separate token needed.
  async connectLinkedInPage(brandId: string, pageIdentifier: string) {
    if (!brandId) throw new BadRequestException('No brand selected.');

    // pageIdentifier can be a full URL or just a slug/numeric ID
    // e.g. "https://www.linkedin.com/company/my-company/" → "my-company"
    // or "12345" → "12345"
    const raw = pageIdentifier.trim();
    const slugMatch = raw.match(/linkedin\.com\/company\/([^/?#]+)/i);
    const slug = slugMatch ? slugMatch[1] : raw.replace(/\/$/, '');
    if (!slug) throw new BadRequestException('Could not extract a page identifier from the URL you provided.');

    // Find the brand's active personal LinkedIn account to borrow its token
    const personalAccount = await this.prisma.socialAccount.findFirst({
      where: {
        brandId,
        platform: 'LinkedIn',
        platformUserId: { not: { startsWith: 'org:' } },
        status: AccountStatus.Active,
      },
    });
    if (!personalAccount) {
      throw new BadRequestException(
        'Connect your personal LinkedIn account first — Relay uses it to post to your company page.',
      );
    }

    const accessToken = decrypt(personalAccount.accessToken);

    // Try to fetch the page display name from LinkedIn
    let pageName = slug;
    try {
      const res = await fetch(
        `https://api.linkedin.com/v2/organizations/${encodeURIComponent(slug)}?fields=localizedName`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202408',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        },
      );
      if (res.ok) {
        const data = await res.json() as any;
        pageName = data.localizedName ?? slug;
      }
    } catch { /* use slug as fallback name */ }

    return this.connect(brandId, {
      platform: 'LinkedIn',
      platformUserId: `org:${slug}`,
      platformHandle: pageName,
      accessToken,
      tokenExpiresAt: personalAccount.tokenExpiresAt?.toISOString(),
    });
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
