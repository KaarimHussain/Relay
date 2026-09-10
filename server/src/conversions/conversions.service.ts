import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../common/crypto.util';

const LI_API = 'https://api.linkedin.com/rest';
const LI_HEADERS = (token: string) => ({
  'Authorization':             `Bearer ${token}`,
  'LinkedIn-Version':          '202608',
  'X-Restli-Protocol-Version': '2.0.0',
  'Content-Type':              'application/json',
});

@Injectable()
export class ConversionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Rules ───────────────────────────────────────────────────────────────────

  async listRules(brandId: string) {
    return this.prisma.conversionRule.findMany({
      where: { brandId },
      include: {
        _count: { select: { events: true } },
        events: { orderBy: { occurredAt: 'desc' }, take: 30, select: { occurredAt: true, valueAmount: true, valueCurrency: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(brandId: string, dto: {
    name: string;
    conversionType: string;
    liAdAccountUrn: string;
  }) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { brandId, platform: 'LinkedIn', status: 'Active' },
    });
    if (!account) throw new BadRequestException('No active LinkedIn account connected to this brand.');

    const token = decrypt(account.accessToken);

    // Create the conversion rule in LinkedIn
    const liBody = {
      account:        dto.liAdAccountUrn,
      name:           dto.name,
      type:           dto.conversionType,
      enabled:        true,
      associatedCampaigns: [],
      attributionType: 'LAST_TOUCH_BY_CAMPAIGN',
      postClickAttributionWindowSize: 30,
      viewThroughAttributionWindowSize: 7,
      urlRules: [],
    };

    const res = await fetch(`${LI_API}/conversions`, {
      method: 'POST',
      headers: LI_HEADERS(token),
      body: JSON.stringify(liBody),
    });
    const data = await res.json() as any;
    if (!res.ok) {
      throw new BadRequestException(
        data.message ?? data.serviceErrorCode ?? `LinkedIn returned ${res.status}`,
      );
    }

    const liConversionUrn: string | undefined =
      res.headers.get('x-restli-id') ?? data.id ?? data.conversionUrn;

    return this.prisma.conversionRule.create({
      data: {
        brandId,
        name:           dto.name,
        conversionType: dto.conversionType,
        liAdAccountUrn: dto.liAdAccountUrn,
        liConversionUrn: liConversionUrn ?? null,
      },
    });
  }

  async deleteRule(brandId: string, ruleId: string) {
    const rule = await this.prisma.conversionRule.findFirst({ where: { id: ruleId, brandId } });
    if (!rule) throw new NotFoundException('Conversion rule not found');
    await this.prisma.conversionRule.delete({ where: { id: ruleId } });
    return { deleted: true };
  }

  // ─── Event ingestion (webhook) ────────────────────────────────────────────────

  async ingestEvent(ruleId: string, payload: {
    email?: string;
    valueAmount?: number;
    valueCurrency?: string;
    pageUrl?: string;
    occurredAt?: string;
  }) {
    const rule = await this.prisma.conversionRule.findUnique({ where: { id: ruleId } });
    if (!rule || !rule.isEnabled) throw new NotFoundException('Conversion rule not found or disabled');

    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
    const emailHash = payload.email
      ? createHash('sha256').update(payload.email.trim().toLowerCase()).digest('hex')
      : null;

    // Store locally
    const event = await this.prisma.conversionEvent.create({
      data: {
        ruleId,
        occurredAt,
        valueAmount:   payload.valueAmount ?? null,
        valueCurrency: payload.valueCurrency ?? null,
        emailHash,
        pageUrl:       payload.pageUrl ?? null,
      },
    });

    // Forward to LinkedIn if we have a conversion URN and a brand LinkedIn account
    if (rule.liConversionUrn) {
      try {
        const account = await this.prisma.socialAccount.findFirst({
          where: { brandId: rule.brandId, platform: 'LinkedIn', status: 'Active' },
        });
        if (account) {
          const token = decrypt(account.accessToken);
          const liEvent: Record<string, unknown> = {
            conversion:    rule.liConversionUrn,
            conversionHappenedAt: occurredAt.getTime(),
            conversionValue: payload.valueAmount != null
              ? { currencyCode: payload.valueCurrency ?? 'USD', amount: String(payload.valueAmount) }
              : undefined,
            eventId:       event.id,
            user: emailHash ? { userIds: [{ idType: 'SHA256_EMAIL', idValue: emailHash }] } : undefined,
          };
          await fetch(`${LI_API}/conversionEvents`, {
            method: 'POST',
            headers: LI_HEADERS(token),
            body: JSON.stringify({ elements: [liEvent] }),
          });
        }
      } catch { /* forward failure is non-fatal — event is stored locally */ }
    }

    return { received: true, eventId: event.id };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  async stats(brandId: string) {
    const rules = await this.prisma.conversionRule.findMany({
      where: { brandId },
      include: {
        _count: { select: { events: true } },
        events: {
          orderBy: { occurredAt: 'desc' },
          take: 90,
          select: { occurredAt: true, valueAmount: true, valueCurrency: true },
        },
      },
    });

    const totalEvents = rules.reduce((s, r) => s + r._count.events, 0);
    const totalValue  = rules.reduce((s, r) =>
      s + r.events.reduce((ev, e) => ev + (e.valueAmount ?? 0), 0), 0);

    return { rules, totalEvents, totalValue };
  }
}
