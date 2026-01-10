const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function run() {
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: 'admin@pozstar.com' } })
    const p1 = await bcrypt.compare('admin123', user.password)
    const p2 = await bcrypt.compare('123456', user.password)
    console.log({ p1, p2 })
  } finally {
    await prisma.$disconnect()
  }
}

run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
