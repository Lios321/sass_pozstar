const { PrismaClient } = require('@prisma/client');
const path = require('path');

(async () => {
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  const url = `file:${dbPath}`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  console.log('Using SQLite URL:', url);
  try {
    const byStatus = await prisma.serviceOrder.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    console.log('Group by status:', byStatus);

    let ordersByMonthRaw = [];
    try {
      ordersByMonthRaw = await prisma.$queryRaw`SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as count FROM service_orders WHERE createdAt >= date('now', '-6 months') GROUP BY strftime('%Y-%m', createdAt) ORDER BY month`;
      console.log('Orders by month (raw):', ordersByMonthRaw);
    } catch (e) {
      console.error('Error in raw month query:', e);
    }
  } catch (e) {
    console.error('Error in groupBy test:', e);
  } finally {
    await prisma.$disconnect();
  }
})();