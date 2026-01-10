const { PrismaClient, ServiceOrderStatus } = require('@prisma/client')

async function run() {
  const prisma = new PrismaClient()
  try {
    const users = await prisma.user.count()
    const clients = await prisma.client.count()
    const technicians = await prisma.technician.count()
    const orders = await prisma.serviceOrder.count()
    const statuses = Object.values(ServiceOrderStatus)
    const byStatus = {}
    for (const s of statuses) {
      byStatus[s] = await prisma.serviceOrder.count({ where: { status: s } })
    }
    console.log(JSON.stringify({ users, clients, technicians, orders, byStatus }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

run().then(() => process.exit(0)).catch(() => process.exit(1))
