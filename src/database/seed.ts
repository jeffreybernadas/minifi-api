import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@/generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const userData: Prisma.UserCreateInput[] = [
  {
    id: '123',
    email: 'alice@prisma.io',
  },
  {
    id: '321',
    email: 'bob@prisma.io',
  },
];

export async function main() {
  for (const u of userData) {
    await prisma.user.create({ data: u });
  }
}

void main();
