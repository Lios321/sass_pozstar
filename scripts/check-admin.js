const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@pozstar.com' },
      select: { id: true, email: true, name: true, role: true, password: true, createdAt: true, updatedAt: true },
    });
    if (!admin) {
      console.log('Admin not found');
    } else {
      console.log('Admin user:', admin);
    }
  } catch (e) {
    console.error('Error querying admin:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
