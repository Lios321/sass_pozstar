const { PrismaClient } = require('@prisma/client')

async function run() {
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: 'admin@pozstar.com' } })
    console.log(JSON.stringify(user, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
