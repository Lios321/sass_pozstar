const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const prisma = new PrismaClient()
  try {
    const adminPassword = await bcrypt.hash('admin123', 12)
    const admin = await prisma.user.upsert({
      where: { email: 'admin@pozstar.com' },
      update: { name: 'Administrador', password: adminPassword, role: 'ADMIN' },
      create: { email: 'admin@pozstar.com', name: 'Administrador', password: adminPassword, role: 'ADMIN' }
    })

    const clientsData = [
      {
        name: 'Maria Silva',
        email: 'maria.silva@example.com',
        phone: '11999999999',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01001000',
        complement: 'Apto 12',
        country: 'Brasil',
        document: '12345678909',
        documentType: 'CPF',
        clientType: 'Residencial',
        latitude: -23.55052,
        longitude: -46.633308
      },
      {
        name: 'Empresa Tech LTDA',
        email: 'contato@empresa-tech.com',
        phone: '1122223333',
        address: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01311000',
        complement: 'Conj. 100',
        country: 'Brasil',
        document: '12345678000199',
        documentType: 'CNPJ',
        clientType: 'Empresarial',
        latitude: -23.561414,
        longitude: -46.655881
      },
      {
        name: 'João Pereira',
        email: 'joao.pereira@example.com',
        phone: '21988887777',
        address: 'Rua do Mercado, 45',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20010020',
        complement: '',
        country: 'Brasil',
        document: '98765432100',
        documentType: 'CPF',
        clientType: 'Residencial',
        latitude: -22.903539,
        longitude: -43.209587
      }
    ]

    const clients = []
    for (const data of clientsData) {
      const c = await prisma.client.upsert({
        where: { email: data.email },
        update: data,
        create: data
      })
      clients.push(c)
    }

    const techniciansData = [
      {
        name: 'Carlos Andrade',
        email: 'carlos.andrade@tech.com',
        phone: '11911112222',
        specializations: JSON.stringify(['Notebook', 'Desktop', 'Impressora']),
        isAvailable: true
      },
      {
        name: 'Ana Rocha',
        email: 'ana.rocha@tech.com',
        phone: '21933334444',
        specializations: JSON.stringify(['Smartphone', 'Tablet']),
        isAvailable: true
      }
    ]

    const technicians = []
    for (const data of techniciansData) {
      const t = await prisma.technician.upsert({
        where: { email: data.email },
        update: data,
        create: data
      })
      technicians.push(t)
    }

    const now = new Date()
    const year = now.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)
    let countThisYear = await prisma.serviceOrder.count({
      where: { openingDate: { gte: startOfYear, lte: endOfYear } }
    })
    const nextOrderNumber = () => {
      countThisYear += 1
      return `OS-${year}-${countThisYear}`
    }

    const osA = await prisma.serviceOrder.create({
      data: {
        orderNumber: nextOrderNumber(),
        clientId: clients[0].id,
        equipmentType: 'Notebook',
        brand: 'Dell',
        model: 'Inspiron 15',
        serialNumber: 'SN-A123',
        reportedDefect: 'Não liga',
        arrivalDate: new Date(),
        openingDate: new Date(),
        status: 'SEM_VER',
        createdById: admin.id
      }
    })

    const osB = await prisma.serviceOrder.create({
      data: {
        orderNumber: nextOrderNumber(),
        clientId: clients[1].id,
        equipmentType: 'Impressora',
        brand: 'HP',
        model: 'LaserJet 1020',
        serialNumber: 'SN-B456',
        reportedDefect: 'Papel atolado frequente',
        arrivalDate: new Date(),
        openingDate: new Date(),
        status: 'ORCAMENTAR',
        budgetItems: [
          { type: 'PECA', description: 'Rolo de tração', quantity: 1, unitCost: 120.5 },
          { type: 'SERVICO', description: 'Limpeza interna', quantity: 1, unitCost: 80.0, estimatedHours: 2 }
        ],
        budgetNote: 'Troca necessária do rolo e limpeza geral',
        createdById: admin.id
      }
    })

    const osC = await prisma.serviceOrder.create({
      data: {
        orderNumber: nextOrderNumber(),
        clientId: clients[2].id,
        technicianId: technicians[0].id,
        equipmentType: 'Smartphone',
        brand: 'Samsung',
        model: 'Galaxy S21',
        serialNumber: 'SN-C789',
        reportedDefect: 'Tela quebrada',
        arrivalDate: new Date(),
        openingDate: new Date(),
        status: 'APROVADO',
        price: 900,
        cost: 600,
        createdById: admin.id
      }
    })

    const osD = await prisma.serviceOrder.create({
      data: {
        orderNumber: nextOrderNumber(),
        clientId: clients[0].id,
        technicianId: technicians[1].id,
        equipmentType: 'Tablet',
        brand: 'Apple',
        model: 'iPad 9',
        serialNumber: 'SN-D010',
        reportedDefect: 'Bateria descarregando rápido',
        arrivalDate: new Date(),
        openingDate: new Date(),
        status: 'MELHORAR',
        createdById: admin.id
      }
    })

    const osE = await prisma.serviceOrder.create({
      data: {
        orderNumber: nextOrderNumber(),
        clientId: clients[1].id,
        equipmentType: 'Desktop',
        brand: 'Lenovo',
        model: 'ThinkCentre',
        serialNumber: 'SN-E111',
        reportedDefect: 'Barulho na ventoinha',
        arrivalDate: new Date(),
        openingDate: new Date(),
        completionDate: new Date(),
        deliveryDate: new Date(),
        status: 'DEVOLVIDO',
        createdById: admin.id
      }
    })

    return { admin, clients, technicians, orders: [osA, osB, osC, osD, osE] }
  } finally {
    await prisma.$disconnect()
  }
}

main().then(() => {
  process.exit(0)
}).catch((e) => {
  process.exit(1)
})
