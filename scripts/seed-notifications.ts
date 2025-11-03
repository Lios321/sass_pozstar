import { PrismaClient, NotificationType } from '@prisma/client'

const prisma = new PrismaClient()

async function seedNotifications() {
  try {
    console.log('🌱 Criando notificações de exemplo...')

    // Buscar alguns usuários e clientes para criar notificações
    const users = await prisma.user.findMany({ take: 2 })
    const clients = await prisma.client.findMany({ take: 2 })
    const serviceOrders = await prisma.serviceOrder.findMany({ take: 3 })

    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado. Execute o seed principal primeiro.')
      return
    }

    if (clients.length === 0) {
      console.log('❌ Nenhum cliente encontrado. Execute o seed principal primeiro.')
      return
    }

    // Notificações para usuários (técnicos/admin)
    const userNotifications = [
      {
        title: 'Nova Ordem de Serviço',
        message: 'Uma nova ordem de serviço foi criada e precisa de atenção.',
        type: NotificationType.INFO,
        isRead: false,
        userId: users[0].id,
        serviceOrderId: serviceOrders[0]?.id || null
      },
      {
        title: 'Ordem Concluída',
        message: 'A ordem de serviço #OS-2024-001 foi concluída com sucesso.',
        type: NotificationType.SUCCESS,
        isRead: false,
        userId: users[0].id,
        serviceOrderId: serviceOrders[1]?.id || null
      },
      {
        title: 'Atenção Necessária',
        message: 'A ordem de serviço #OS-2024-002 requer atenção urgente.',
        type: NotificationType.WARNING,
        isRead: true,
        userId: users[1]?.id || users[0].id,
        serviceOrderId: serviceOrders[2]?.id || null
      },
      {
        title: 'Sistema Atualizado',
        message: 'O sistema foi atualizado com novas funcionalidades.',
        type: NotificationType.INFO,
        isRead: false,
        userId: users[0].id
      }
    ]

    // Notificações para clientes
    const clientNotifications = [
      {
        title: 'Ordem Recebida',
        message: 'Sua ordem de serviço foi recebida e está sendo analisada.',
        type: NotificationType.INFO,
        isRead: false,
        clientId: clients[0].id,
        serviceOrderId: serviceOrders[0]?.id || null
      },
      {
        title: 'Reparo Iniciado',
        message: 'O reparo do seu equipamento foi iniciado.',
        type: NotificationType.STATUS_UPDATE,
        isRead: false,
        clientId: clients[0].id,
        serviceOrderId: serviceOrders[0]?.id || null
      },
      {
        title: 'Equipamento Pronto',
        message: 'Seu equipamento está pronto para retirada!',
        type: NotificationType.SUCCESS,
        isRead: true,
        clientId: clients[1]?.id || clients[0].id,
        serviceOrderId: serviceOrders[1]?.id || null
      },
      {
        title: 'Lembrete de Retirada',
        message: 'Não se esqueça de retirar seu equipamento até sexta-feira.',
        type: NotificationType.WARNING,
        isRead: false,
        clientId: clients[1]?.id || clients[0].id,
        serviceOrderId: serviceOrders[2]?.id || null
      }
    ]

    // Criar notificações para usuários
    for (const notification of userNotifications) {
      await prisma.notification.create({
        data: notification
      })
    }

    // Criar notificações para clientes
    for (const notification of clientNotifications) {
      await prisma.notification.create({
        data: notification
      })
    }

    console.log('✅ Notificações de exemplo criadas com sucesso!')
    console.log(`📊 Criadas ${userNotifications.length} notificações para usuários`)
    console.log(`📊 Criadas ${clientNotifications.length} notificações para clientes`)

  } catch (error) {
    console.error('❌ Erro ao criar notificações:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedNotifications()
}

export default seedNotifications