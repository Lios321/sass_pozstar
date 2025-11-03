const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function main() {
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  const url = `file:${dbPath}`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  console.log('Using SQLite URL:', url);
  try {
    const rows = await prisma.$queryRaw`SELECT DISTINCT status FROM service_orders ORDER BY status`;
    console.log('Distinct statuses in service_orders:', rows);
  } catch (e) {
    console.error('Error reading statuses:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();