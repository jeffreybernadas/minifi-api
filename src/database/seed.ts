import { PrismaClient, Prisma } from '../generated/prisma';

const prisma = new PrismaClient();

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
