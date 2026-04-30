// prisma/seed.ts
// Seed para crear el usuario general unico de GCX Dashboard

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.AUTH_USERNAME || 'admin';
  const password = process.env.AUTH_PASSWORD || 'gcx_2024_admin';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`[SEED] Usuario '${username}' ya existe, omitiendo.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { username, passwordHash } });
  console.log(`[SEED] Usuario '${username}' creado.`);
}

main()
  .catch((e) => { console.error('[SEED] Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
