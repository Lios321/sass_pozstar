const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function run() {
  const prisma = new PrismaClient()
  try {
    const hashed = await bcrypt.hash('admin123', 12)
    const user = await prisma.user.update({
      where: { email: 'admin@pozstar.com' },
      data: { password: hashed }
    })
    console.log('Updated admin password:', { id: user.id, email: user.email })
  } finally {
    await prisma.$disconnect()
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
