import { PrismaClient, ServiceOrderStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...')

    // Limpar dados existentes
    await prisma.notification.deleteMany()
    await prisma.serviceOrder.deleteMany()
    await prisma.technician.deleteMany()
    await prisma.client.deleteMany()
    await prisma.user.deleteMany()

    console.log('🧹 Dados existentes removidos')

    // Criar usuários (técnicos e admin)
    const hashedPassword = await bcrypt.hash('123456', 10)

    const admin = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@pozstar.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    await prisma.user.create({
      data: {
        name: 'João Silva',
        email: 'joao@pozstar.com',
        password: hashedPassword,
        role: 'TECHNICIAN'
      }
    })

    await prisma.user.create({
      data: {
        name: 'Maria Santos',
        email: 'maria@pozstar.com',
        password: hashedPassword,
        role: 'TECHNICIAN'
      }
    })

    console.log('👥 Usuários criados')

    // Criar clientes
    const client1 = await prisma.client.create({
      data: {
        name: 'Carlos Oliveira',
        email: 'carlos@email.com',
        phone: '(11) 96666-6666',
        address: 'Rua das Flores, 123 - São Paulo, SP'
      }
    })

    const client2 = await prisma.client.create({
      data: {
        name: 'Ana Costa',
        email: 'ana@email.com',
        phone: '(11) 95555-5555',
        address: 'Av. Paulista, 456 - São Paulo, SP'
      }
    })

    const client3 = await prisma.client.create({
      data: {
        name: 'Pedro Ferreira',
        email: 'pedro@email.com',
        phone: '(11) 94444-4444',
        address: 'Rua Augusta, 789 - São Paulo, SP'
      }
    })

    console.log('👤 Clientes criados')

    // Primeiro, criar técnicos na tabela Technician
    const tech1 = await prisma.technician.create({
      data: {
        name: 'João Silva',
        email: 'joao.tech@pozstar.com',
        phone: '(11) 98888-8888',
        specializations: JSON.stringify(['Smartphones', 'Tablets', 'Notebooks'])
      }
    })

    const tech2 = await prisma.technician.create({
      data: {
        name: 'Maria Santos',
        email: 'maria.tech@pozstar.com',
        phone: '(11) 97777-7777',
        specializations: JSON.stringify(['Desktops', 'Impressoras', 'Monitores'])
      }
    })

    // Criar ordens de serviço
    await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-2024-001',
        equipmentType: 'Smartphone',
        brand: 'Samsung',
        model: 'Galaxy S21',
        serialNumber: 'SN123456789',
        reportedDefect: 'Tela quebrada e não liga',
        receivedAccessories: 'Carregador, cabo USB',
        status: ServiceOrderStatus.IN_ANALYSIS,
        clientId: client1.id,
        technicianId: tech1.id,
        createdById: admin.id,
        arrivalDate: new Date('2024-01-15'),
        openingDate: new Date('2024-01-16')
      }
    })

    await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-2024-002',
        equipmentType: 'Notebook',
        brand: 'Dell',
        model: 'Inspiron 15',
        serialNumber: 'SN987654321',
        reportedDefect: 'Não liga, possível problema na fonte',
        receivedAccessories: 'Carregador original',
        status: ServiceOrderStatus.MELHORAR,
        clientId: client2.id,
        technicianId: tech2.id,
        createdById: admin.id,
        arrivalDate: new Date('2024-01-10'),
        openingDate: new Date('2024-01-11'),
        budgetNote: 'Orçamento aprovado: R$ 250,00'
      }
    })

    await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-2024-003',
        equipmentType: 'Tablet',
        brand: 'Apple',
        model: 'iPad Air',
        serialNumber: 'SN456789123',
        reportedDefect: 'Touch screen não responde',
        receivedAccessories: 'Carregador, capa protetora',
        status: ServiceOrderStatus.TERMINADO,
        clientId: client3.id,
        technicianId: tech1.id,
        createdById: admin.id,
        arrivalDate: new Date('2024-01-05'),
        openingDate: new Date('2024-01-06'),
        completionDate: new Date('2024-01-12'),
        budgetNote: 'Reparo concluído: R$ 180,00'
      }
    })

    await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-2024-004',
        equipmentType: 'Smartphone',
        brand: 'iPhone',
        model: '13 Pro',
        serialNumber: 'SN789123456',
        reportedDefect: 'Bateria viciada, descarrega rápido',
        receivedAccessories: 'Carregador wireless',
        status: ServiceOrderStatus.PENDING,
        clientId: client1.id,
        createdById: admin.id,
        arrivalDate: new Date('2024-01-20')
      }
    })

    console.log('📋 Ordens de serviço criadas')

    console.log('✅ Seed concluído com sucesso!')
    console.log(`📊 Criados:`)
    console.log(`   - 3 usuários (1 admin, 2 técnicos)`)
    console.log(`   - 3 clientes`)
    console.log(`   - 4 ordens de serviço`)
    console.log(``)
    console.log(`🔑 Credenciais de acesso:`)
    console.log(`   Admin: admin@pozstar.com / 123456`)
    console.log(`   Técnico 1: joao@pozstar.com / 123456`)
    console.log(`   Técnico 2: maria@pozstar.com / 123456`)

  } catch (error) {
    console.error('❌ Erro durante o seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })