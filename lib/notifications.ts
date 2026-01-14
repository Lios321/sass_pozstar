import { getDb } from './db/drizzle'
import { notifications, serviceOrders, clients, technicians } from './db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import {
  buildNewOsMessage,
  buildNewOsTitle,
  buildStatusUpdateMessage,
  buildStatusUpdateTitle,
  buildTechnicianAssignedMessage,
  buildTechnicianAssignedTitle,
  getStatusText,
} from './notification-format'

export interface CreateNotificationData {
  title: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'STATUS_UPDATE'
  userId?: string
  clientId?: string
  serviceOrderId?: string
  metadata?: any
}

export class NotificationService {
  // Criar uma notificação
  static async create(data: CreateNotificationData, dbInstance?: any) {
    try {
      const db = dbInstance || getDb();
      const id = uuidv4();
      const notification = await db.insert(notifications).values({
        id,
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.userId,
        clientId: data.clientId,
        serviceOrderId: data.serviceOrderId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return notification[0];
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }

  // Criar notificação para mudança de status de ordem de serviço
  static async createServiceOrderStatusNotification(
    serviceOrderId: string,
    oldStatus: string,
    newStatus: string,
    dbInstance?: any
  ) {
    try {
      const db = dbInstance || getDb();
      // Buscar dados da ordem de serviço
      const serviceOrder = await db.query.serviceOrders.findFirst({
        where: eq(serviceOrders.id, serviceOrderId),
        with: {
            client: true,
            technician: true
        }
      });

      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada')
      }

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
        }, db)
      }

      // Criar notificação para o técnico (se houver)
      if (serviceOrder.technicianId && newStatus !== 'PENDING') {
        await this.create({
          title,
          message,
          type: 'STATUS_UPDATE',
          serviceOrderId: serviceOrder.id,
          userId: serviceOrder.technicianId // Melhoria: associar ao técnico
        }, db)
      }

      return true
    } catch (error) {
      console.error('Erro ao criar notificação de status:', error)
      throw error
    }
  }

  // Criar notificação para nova ordem de serviço
  static async createNewServiceOrderNotification(serviceOrderId: string, dbInstance?: any) {
    try {
      const db = dbInstance || getDb();
      const serviceOrder = await db.query.serviceOrders.findFirst({
        where: eq(serviceOrders.id, serviceOrderId),
        with: {
            client: true
        }
      });

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
        }, db)
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
      const db = getDb();
      const serviceOrder = await db.query.serviceOrders.findFirst({
        where: eq(serviceOrders.id, serviceOrderId),
        with: {
            client: true,
            technician: true
        }
      });

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
  static async getUnreadCount(userId?: string, clientId?: string, dbInstance?: any) {
    try {
      const db = dbInstance || getDb();
      const conditions = [eq(notifications.isRead, false)];
      
      if (userId) conditions.push(eq(notifications.userId, userId));
      if (clientId) conditions.push(eq(notifications.clientId, clientId));

      const result = await db.select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...conditions));
        
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao buscar contagem de notificações:', error)
      return 0;
    }
  }
}
