import { PrismaClient, MemberRole, Platform, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@relay.app' },
    update: {},
    create: { email: 'demo@relay.app', name: 'Demo User', passwordHash },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: 'acme-co' },
    update: {},
    create: {
      name: 'Acme Co.',
      slug: 'acme-co',
      colorHex: '#F97316',
      voiceTone: 'Professional yet approachable. Confident, clear, and never corporate-speak.',
      pillars: 'Product updates, Industry insights, Behind the scenes, Customer stories',
      memberships: { create: { userId: user.id, role: MemberRole.Owner } },
    },
  });

  await prisma.socialAccount.upsert({
    where: { brandId_platform_platformUserId: { brandId: brand.id, platform: Platform.Instagram, platformUserId: 'mock_ig_001' } },
    update: {},
    create: {
      brandId: brand.id,
      platform: Platform.Instagram,
      platformUserId: 'mock_ig_001',
      platformHandle: '@acmeco',
      accessToken: 'mock_encrypted_token',
      status: AccountStatus.Active,
    },
  });

  console.log(`User: ${user.email} (password: password123)`);
  console.log(`Brand: ${brand.name} (id: ${brand.id})`);
  console.log('Seeding complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
