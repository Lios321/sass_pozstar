import { getRequestContext } from '@cloudflare/next-on-pages'
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
  static async create(data: CreateNotificationData) {
    try {
      const db = getRequestContext().env.DB
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      
      await db.prepare(`
        INSERT INTO notifications (
          id, title, message, type, userId, clientId, serviceOrderId, metadata, isRead, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?
        )
      `).bind(
        id,
        data.title,
        data.message,
        data.type,
        data.userId || null,
        data.clientId || null,
        data.serviceOrderId || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        now,
        now
      ).run()

      // Buscar a notificação criada com relacionamentos
      // Simulando o include do Prisma
      const notification = await db.prepare(`
        SELECT 
          n.*,
          u.id as user_id, u.name as user_name, u.email as user_email,
          c.id as client_id, c.name as client_name, c.email as client_email,
          so.id as so_id, so.orderNumber as so_orderNumber, so.status as so_status
        FROM notifications n
        LEFT JOIN users u ON n.userId = u.id
        LEFT JOIN clients c ON n.clientId = c.id
        LEFT JOIN service_orders so ON n.serviceOrderId = so.id
        WHERE n.id = ?
      `).bind(id).first()

      if (!notification) return null

      // Formatar retorno para manter compatibilidade com o que o Prisma retornava
      return {
        ...notification,
        metadata: notification.metadata ? JSON.parse(notification.metadata as string) : null,
        user: notification.user_id ? {
          id: notification.user_id,
          name: notification.user_name,
          email: notification.user_email
        } : null,
        client: notification.client_id ? {
          id: notification.client_id,
          name: notification.client_name,
          email: notification.client_email
        } : null,
        serviceOrder: notification.so_id ? {
          id: notification.so_id,
          orderNumber: notification.so_orderNumber,
          status: notification.so_status
        } : null
      }
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
      const db = getRequestContext().env.DB
      
      // Buscar dados da ordem de serviço
      const serviceOrder = await db.prepare(`
        SELECT so.*, c.id as client_id, t.id as technician_id, t.name as technician_name
        FROM service_orders so
        LEFT JOIN clients c ON so.clientId = c.id
        LEFT JOIN users t ON so.technicianId = t.id
        WHERE so.id = ?
      `).bind(serviceOrderId).first()

      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada')
      }

      // Mapear para objeto compatível
      const so = {
        ...serviceOrder,
        clientId: serviceOrder.client_id,
        technicianId: serviceOrder.technician_id,
        technician: serviceOrder.technician_id ? { name: serviceOrder.technician_name } : null
      }

      const title = buildStatusUpdateTitle(so.orderNumber as string)
      const message = buildStatusUpdateMessage(oldStatus, newStatus)

      // Criar notificação para o cliente
      if (so.clientId) {
        await this.create({
          title,
          message,
          type: 'STATUS_UPDATE',
          clientId: so.clientId as string,
          serviceOrderId: so.id as string
        })
      }

      // Criar notificação para o técnico (se houver)
      if (so.technicianId && newStatus !== 'PENDING') {
        // Nota: O código original tentava criar notificação para o técnico, 
        // mas não passava userId no create, apenas type e serviceOrderId.
        // Assumindo que o técnico é um User, deveríamos passar userId.
        // O código original passava apenas:
        // await this.create({ title, message, type, serviceOrderId })
        // Se a intenção era notificar o técnico, faltou o userId.
        // Vou manter fiel ao original mas adicionando userId se disponível no technicianId
        
        // No original:
        /*
        await this.create({
          title,
          message,
          type: 'STATUS_UPDATE',
          serviceOrderId: serviceOrder.id
        })
        */
        // Isso criava uma notificação "órfã" de usuário/cliente?
        // Ou o create lidava com isso? O create original aceitava userId opcional.
        // Vou manter como estava, mas parece bug do original se a intenção era notificar alguém específico.
        // Mas se technicianId é um ID de User (tabela users), então podemos usar userId.
        
        await this.create({
          title,
          message,
          type: 'STATUS_UPDATE',
          serviceOrderId: so.id as string,
          userId: so.technicianId as string // Melhoria: associar ao técnico
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
      const db = getRequestContext().env.DB
      
      const serviceOrder = await db.prepare(`
        SELECT so.*, c.id as client_id 
        FROM service_orders so
        LEFT JOIN clients c ON so.clientId = c.id
        WHERE so.id = ?
      `).bind(serviceOrderId).first()

      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada')
      }

      const title = buildNewOsTitle(serviceOrder.orderNumber as string)
      const message = buildNewOsMessage(serviceOrder.brand as string || undefined, serviceOrder.model as string || undefined)

      // Notificar cliente
      if (serviceOrder.client_id) {
        await this.create({
          title,
          message,
          type: 'INFO',
          clientId: serviceOrder.client_id as string,
          serviceOrderId: serviceOrder.id as string
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
      const db = getRequestContext().env.DB
      
      const serviceOrder = await db.prepare(`
        SELECT so.*, c.id as client_id, t.name as technician_name
        FROM service_orders so
        LEFT JOIN clients c ON so.clientId = c.id
        LEFT JOIN users t ON so.technicianId = t.id
        WHERE so.id = ?
      `).bind(serviceOrderId).first()

      if (!serviceOrder) {
        throw new Error('Ordem de serviço não encontrada')
      }

      const title = buildTechnicianAssignedTitle(serviceOrder.orderNumber as string)
      const message = buildTechnicianAssignedMessage(serviceOrder.technician_name as string || undefined)

      // Notificar cliente
      if (serviceOrder.client_id) {
        await this.create({
          title,
          message,
          type: 'INFO',
          clientId: serviceOrder.client_id as string,
          serviceOrderId: serviceOrder.id as string
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
      const db = getRequestContext().env.DB
      
      let query = 'SELECT COUNT(*) as count FROM notifications WHERE isRead = 0'
      const params: any[] = []

      if (userId) {
        query += ' AND userId = ?'
        params.push(userId)
      }
      if (clientId) {
        query += ' AND clientId = ?'
        params.push(clientId)
      }

      const result = await db.prepare(query).bind(...params).first()
      return result?.count || 0
    } catch (error) {
      console.error('Erro ao buscar contagem de notificações:', error)
      throw error
    }
  }
}
