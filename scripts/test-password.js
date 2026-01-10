const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@pozstar.com' }, select: { password: true } });
    if (!admin) {
      console.log('No admin user');
      return;
    }
    const ok = await bcrypt.compare('admin123', admin.password);
    console.log('Password matches:', ok);
  } finally {
    await prisma.$disconnect();
  }
}

main();
