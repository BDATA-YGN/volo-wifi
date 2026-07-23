import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';

const prisma = PrismaDBConnection.getConnection();

async function main() {
  const org = await prisma.org.findFirst({ where: { code: 'AA' }, select: { id: true } });
  if (!org) {
    console.log('no org');
    return;
  }
  const n = await prisma.credential.count({ where: { orgId: org.id, deletedAt: null } });
  console.log(JSON.stringify({ orgId: org.id, credentials: n }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
