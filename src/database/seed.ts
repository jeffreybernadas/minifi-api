import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { generateShortCode } from '@/utils/shortcode/shortcode.util';
import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SEED_USER_IDS =
  process.env.SEED_USER_IDS?.split(',')
    .map((id) => id.trim())
    .filter(Boolean) ?? [];

const TAGS = [
  { name: 'Work', backgroundColor: '#3B82F6', textColor: '#FFFFFF' },
  { name: 'Personal', backgroundColor: '#10B981', textColor: '#FFFFFF' },
  { name: 'Marketing', backgroundColor: '#F59E0B', textColor: '#000000' },
  { name: 'Social', backgroundColor: '#8B5CF6', textColor: '#FFFFFF' },
  { name: 'Important', backgroundColor: '#EF4444', textColor: '#FFFFFF' },
];

const URLS = [
  'https://github.com/features',
  'https://docs.google.com/document/d/example',
  'https://www.notion.so/workspace/project-docs',
  'https://figma.com/file/abc123/design-system',
  'https://stackoverflow.com/questions/12345678/example',
  'https://medium.com/@author/article-title',
  'https://dev.to/username/post-title',
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://twitter.com/username/status/123456789',
  'https://linkedin.com/posts/company_topic',
  'https://reddit.com/r/programming/comments/abc123',
  'https://hackernews.com/item?id=12345678',
  'https://producthunt.com/posts/product-name',
  'https://dribbble.com/shots/12345678-design',
  'https://behance.net/gallery/12345678/project',
];

const COUNTRIES = [
  { name: 'United States', code: 'US' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Germany', code: 'DE' },
  { name: 'France', code: 'FR' },
  { name: 'Canada', code: 'CA' },
  { name: 'Australia', code: 'AU' },
  { name: 'Japan', code: 'JP' },
  { name: 'Brazil', code: 'BR' },
  { name: 'India', code: 'IN' },
  { name: 'Mexico', code: 'MX' },
];

const DEVICES = [
  { value: 'Desktop', weight: 60 },
  { value: 'Mobile', weight: 35 },
  { value: 'Tablet', weight: 5 },
];

const BROWSERS = [
  { value: 'Chrome', weight: 65 },
  { value: 'Safari', weight: 20 },
  { value: 'Firefox', weight: 10 },
  { value: 'Edge', weight: 5 },
];

const REFERRERS = [
  'google.com',
  'twitter.com',
  'linkedin.com',
  'facebook.com',
  null,
];

interface LinkConfig {
  url: string;
  title: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'DISABLED';
  scanStatus: 'SAFE' | 'SUSPICIOUS' | 'PENDING';
  password: string | null;
  scheduledAt: Date | null;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function weightedRandom(
  items: readonly { value: string; weight: number }[],
): string {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let random = Math.random() * total;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.value;
  }
  return items[0]!.value;
}

function getRandomTags(tagIds: string[], min: number, max: number): string[] {
  const count = randomInt(min, max);
  const shuffled = [...tagIds].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateLinkConfigs(): LinkConfig[] {
  const configs: LinkConfig[] = [];
  const shuffledUrls = [...URLS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < 10; i++) {
    configs.push({
      url: shuffledUrls[i % shuffledUrls.length]!,
      title: `Link ${i + 1}`,
      status: 'ACTIVE',
      scanStatus: 'SAFE',
      password: null,
      scheduledAt: null,
    });
  }

  for (let i = 0; i < 2; i++) {
    configs.push({
      url: shuffledUrls[(10 + i) % shuffledUrls.length]!,
      title: `Suspicious Link ${i + 1}`,
      status: 'ACTIVE',
      scanStatus: 'SUSPICIOUS',
      password: null,
      scheduledAt: null,
    });
  }

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  configs.push({
    url: shuffledUrls[12 % shuffledUrls.length]!,
    title: 'Scheduled Link',
    status: 'SCHEDULED',
    scanStatus: 'PENDING',
    password: null,
    scheduledAt: futureDate,
  });

  configs.push({
    url: shuffledUrls[13 % shuffledUrls.length]!,
    title: 'Disabled Link',
    status: 'DISABLED',
    scanStatus: 'SAFE',
    password: null,
    scheduledAt: null,
  });

  configs.push({
    url: shuffledUrls[14 % shuffledUrls.length]!,
    title: 'Protected Link',
    status: 'ACTIVE',
    scanStatus: 'SAFE',
    password: 'password123',
    scheduledAt: null,
  });

  return configs;
}

async function generateAnalytics(
  linkId: string,
  count: number,
): Promise<{ total: number; unique: number; lastClick: Date }> {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const visitors = new Set<string>();
  const records: {
    id: string;
    linkId: string;
    clickedAt: Date;
    visitorId: string;
    isUnique: boolean;
    ipAddress: string;
    country: string;
    countryCode: string;
    device: string;
    browser: string;
    referrerDomain: string | null;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const clickedAt = new Date(now - randomInt(0, thirtyDaysMs));
    const ip = `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`;
    const visitorId = createHash('sha256').update(ip).digest('hex');
    const isUnique = !visitors.has(visitorId);
    visitors.add(visitorId);

    const country = randomItem(COUNTRIES);

    records.push({
      id: randomUUID(),
      linkId,
      clickedAt,
      visitorId,
      isUnique,
      ipAddress: ip,
      country: country.name,
      countryCode: country.code,
      device: weightedRandom(DEVICES),
      browser: weightedRandom(BROWSERS),
      referrerDomain: randomItem(REFERRERS),
    });
  }

  await prisma.linkAnalytics.createMany({ data: records });

  records.sort((a, b) => b.clickedAt.getTime() - a.clickedAt.getTime());

  return {
    total: count,
    unique: visitors.size,
    lastClick: records[0]!.clickedAt,
  };
}

async function seedUserData(userId: string): Promise<void> {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `user-${userId.slice(0, 8)}@seed.local`,
      username: `seed_${userId.slice(0, 8)}`,
      emailVerified: true,
    },
  });

  await prisma.subscription.upsert({
    where: { userId },
    update: {},
    create: {
      id: randomUUID(),
      userId,
      tier: 'FREE',
      status: 'ACTIVE',
    },
  });

  const tagIds: string[] = [];
  for (const tag of TAGS) {
    const created = await prisma.tag.upsert({
      where: { userId_name: { userId, name: tag.name } },
      update: {},
      create: {
        id: randomUUID(),
        userId,
        ...tag,
      },
    });
    tagIds.push(created.id);
  }

  const linkConfigs = generateLinkConfigs();
  for (const config of linkConfigs) {
    const linkId = randomUUID();
    const assignedTags = getRandomTags(tagIds, 0, 3);

    await prisma.link.create({
      data: {
        id: linkId,
        userId,
        originalUrl: config.url,
        shortCode: generateShortCode(),
        title: config.title,
        status: config.status,
        scanStatus: config.scanStatus,
        password: config.password
          ? await bcrypt.hash(config.password, 10)
          : null,
        scheduledAt: config.scheduledAt,
        clickCount: 0,
        uniqueClickCount: 0,
        isGuest: false,
        tags: {
          create: assignedTags.map((tagId) => ({
            id: randomUUID(),
            tagId,
          })),
        },
      },
    });

    const analyticsCount = randomInt(30, 60);
    const stats = await generateAnalytics(linkId, analyticsCount);

    await prisma.link.update({
      where: { id: linkId },
      data: {
        clickCount: stats.total,
        uniqueClickCount: stats.unique,
        lastClickedAt: stats.lastClick,
      },
    });
  }

  console.log(
    `User ${userId.slice(0, 8)}: ${TAGS.length} tags, ${linkConfigs.length} links`,
  );
}

async function main(): Promise<void> {
  if (SEED_USER_IDS.length === 0) {
    console.log(
      'SEED_USER_IDS not set. Provide comma-separated Keycloak UUIDs.',
    );
    return;
  }

  console.log(`Seeding for ${SEED_USER_IDS.length} user(s)`);

  for (const userId of SEED_USER_IDS) {
    await seedUserData(userId);
  }

  console.log('Done');
}

void main()
  .catch(console.error)
  .finally(() => void prisma.$disconnect());
