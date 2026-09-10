import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../common/crypto.util';

const LI_API = 'https://api.linkedin.com/rest';
const LI_HEADERS = (token: string) => ({
  'Authorization':             `Bearer ${token}`,
  'LinkedIn-Version':          '202608',
  'X-Restli-Protocol-Version': '2.0.0',
});

export interface AdCreative {
  id: string;
  status: string;
  format: string;
  headline: string | null;
  introText: string | null;
  callToAction: string | null;
  sponsoredBy: string | null;
  startDate: string | null;
  endDate: string | null;
  previewUrl: string | null;
}

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);

  constructor(private prisma: PrismaService) {}

  async searchAdLibrary(brandId: string, query: string, start = 0, count = 12): Promise<{
    elements: AdCreative[];
    total: number;
    hasMore: boolean;
  }> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { brandId, platform: 'LinkedIn', status: 'Active' },
    });
    if (!account) {
      throw new BadRequestException('No active LinkedIn account connected to this brand.');
    }

    const token = decrypt(account.accessToken);
    const params = new URLSearchParams({
      q:                              'creative',
      'searchParams.keywords[0]':    query.trim(),
      'searchParams.dateRange.start.year': String(new Date().getFullYear() - 1),
      start:                          String(start),
      count:                          String(count),
    });

    const res = await fetch(`${LI_API}/adLibrary?${params}`, {
      headers: LI_HEADERS(token),
    });

    if (res.status === 401 || res.status === 403) {
      throw new BadRequestException(
        'LinkedIn Ad Library access denied. Make sure the "LinkedIn Ad Library" product is added to your LinkedIn app.'
      );
    }

    const data = await res.json() as any;

    if (!res.ok) {
      const msg = data.message ?? data.serviceErrorCode ?? `LinkedIn Ad Library returned ${res.status}`;
      this.logger.warn(`Ad Library error for brand ${brandId}: ${msg}`);
      throw new BadRequestException(msg);
    }

    const elements: AdCreative[] = (data.elements ?? []).map((el: any) => {
      const content = el.content ?? el.creative?.content ?? {};
      const textAd  = content.textAd ?? content.singleJob ?? content.spotlight ?? {};
      const article = content.article ?? {};
      const video   = content.video ?? {};

      return {
        id:            el.id ?? el.creative?.id ?? String(Math.random()),
        status:        el.status ?? 'ACTIVE',
        format:        el.format ?? el.creative?.format ?? 'UNKNOWN',
        headline:      textAd.headline ?? article.title ?? video.title ?? content.headline ?? null,
        introText:     textAd.description ?? article.description ?? content.introductoryText ?? null,
        callToAction:  textAd.callToAction?.type ?? content.callToAction?.type ?? null,
        sponsoredBy:   el.sponsoredBy?.name ?? el.advertiserName ?? null,
        startDate:     el.startDate
          ? `${el.startDate.year}-${String(el.startDate.month ?? 1).padStart(2, '0')}-${String(el.startDate.day ?? 1).padStart(2, '0')}`
          : null,
        endDate:       el.endDate
          ? `${el.endDate.year}-${String(el.endDate.month ?? 1).padStart(2, '0')}-${String(el.endDate.day ?? 1).padStart(2, '0')}`
          : null,
        previewUrl:    el.preview ?? content.landingPageUrl ?? null,
      };
    });

    const paging  = data.paging ?? {};
    const total   = paging.total ?? elements.length;
    const hasMore = (start + count) < total;

    return { elements, total, hasMore };
  }
}
