const { PrismaClient } = require('@prisma/client');
const path = require('path');

(async () => {
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  const url = `file:${dbPath}`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  console.log('Using SQLite URL:', url);
  try {
    const items = await prisma.serviceOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
    });
    console.log('Fetched serviceOrders:', items.length);
    console.log(items.map(i => ({ id: i.id, status: i.status, order: i.orderNumber })));
  } catch (e) {
    console.error('Error in findMany:', e);
  } finally {
    await prisma.$disconnect();
  }
})();