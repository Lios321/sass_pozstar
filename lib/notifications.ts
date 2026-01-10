import { PrismaClient } from '@prisma/client'
import {
  buildNewOsMessage,
  buildNewOsTitle,
  buildStatusUpdateMessage,
  buildStatusUpdateTitle,
  buildTechnicianAssignedMessage,
  buildTechnicianAssignedTitle,
  getStatusText,
} from './notification-format'

const prisma = new PrismaClient()

export interface CreateNotificationData {
  title: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'STATUS_UPDATE'
  userId?: string
  clientId?: string
  serviceOrderId?: string
}

export class NotificationService {
  // Criar uma notificação
  static async create(data: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          serviceOrder: {
            select: {
              id: true,
              orderNumber: true,
              status: true
            }
          }
        }
      })

      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }

  // Criar notificação para mudança de status de ordem de serviço
  static async createServiceOrderStatusNotification(
    serviceOrderId: string,
    oldStatus: string,
    newStatus: string
  ) {
    try {
      // Buscar dados da ordem de serviço
      const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: {
          client: true,
          technician: true
        }
      })

      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada')
      }

      // Mensagens específicas removidas (não utilizadas)

      const title = buildStatusUpdateTitle(serviceOrder.orderNumber)
      const message = buildStatusUpdateMessage(oldStatus, newStatus)

      // Criar notificação para o cliente
      if (serviceOrder.clientId) {
        await this.create({
          title,
          message,
          type: 'STATUS_UPDATE',
          clientId: serviceOrder.clientId,
          serviceOrderId: serviceOrder.id
        })
      }

      // Criar notificação para o técnico (se houver)
      if (serviceOrder.technicianId && newStatus !== 'PENDING') {
        await this.create({
          title,
          message,
          type: 'STATUS_UPDATE',
          serviceOrderId: serviceOrder.id
        })
      }

      return true
    } catch (error) {
      console.error('Erro ao criar notificação de status:', error)
      throw error
    }
  }

  // Criar notificação para nova ordem de serviço
  static async createNewServiceOrderNotification(serviceOrderId: string) {
    try {
      const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: {
          client: true
        }
      })

      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada')
      }

      const title = buildNewOsTitle(serviceOrder.orderNumber)
      const message = buildNewOsMessage(serviceOrder.brand || undefined, serviceOrder.model || undefined)

      // Notificar cliente
      if (serviceOrder.clientId) {
        await this.create({
          title,
          message,
          type: 'INFO',
          clientId: serviceOrder.clientId,
          serviceOrderId: serviceOrder.id
        })
      }

      return true
    } catch (error) {
      console.error('Erro ao criar notificação de nova OS:', error)
      throw error
    }
  }

  // Criar notificação para técnico atribuído
  static async createTechnicianAssignedNotification(
    serviceOrderId: string
  ) {
    try {
      const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: {
          client: true,
          technician: true
        }
      })

      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada')
      }

      const title = buildTechnicianAssignedTitle(serviceOrder.orderNumber)
      const message = buildTechnicianAssignedMessage(serviceOrder.technician?.name || undefined)

      // Notificar cliente
      if (serviceOrder.clientId) {
        await this.create({
          title,
          message,
          type: 'INFO',
          clientId: serviceOrder.clientId,
          serviceOrderId: serviceOrder.id
        })
      }

      return true
    } catch (error) {
      console.error('Erro ao criar notificação de técnico atribuído:', error)
      throw error
    }
  }

  // Buscar notificações não lidas
  static async getUnreadCount(userId?: string, clientId?: string) {
    try {
      const where: { isRead: boolean; userId?: string; clientId?: string } = {
        isRead: false
      }

      if (userId) where.userId = userId
      if (clientId) where.clientId = clientId

      const count = await prisma.notification.count({ where })
      return count
    } catch (error) {
      console.error('Erro ao buscar contagem de notificações:', error)
      return 0
    }
  }

  // Utilitário público para obter texto de status
  static getStatusText(status: string): string {
    return getStatusText(status)
  }
}

export default NotificationService
