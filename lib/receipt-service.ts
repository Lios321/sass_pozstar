import { getDb } from './db/drizzle'
import { serviceOrders, clients, technicians } from './db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { generateReceipt } from './pdf-generator'
import { NotificationService } from './notifications'
import { buildTemplatePayload } from './whatsapp-templates'
import { sendTemplate } from './whatsapp'

export class ReceiptService {
  /**
   * Gera o PDF do recibo para download
   */
  static async generateReceiptForDownload(serviceOrderId: string, dbInstance?: any) {
    try {
      const db = dbInstance || getDb();
      
      const order = await db.query.serviceOrders.findFirst({
        where: eq(serviceOrders.id, serviceOrderId),
        with: {
          client: true,
          technician: true
        }
      })

      if (!order) {
        throw new Error('Ordem de serviço não encontrada')
      }

      // Se já tiver gerado recibo antes, usar a data original, senão marcar agora
      if (!order.receiptGenerated) {
        await db.update(serviceOrders)
          .set({ receiptGenerated: true })
          .where(eq(serviceOrders.id, serviceOrderId))
      }

      const pdfBytes = await generateReceipt(order)
      return pdfBytes
    } catch (error) {
      console.error('Erro ao gerar recibo:', error)
      throw error
    }
  }

  /**
   * Busca dados completos da OS para exibição do recibo em HTML
   */
  static async getServiceOrderWithRelations(serviceOrderId: string) {
    try {
      const db = getDb();
      const order = await db.query.serviceOrders.findFirst({
        where: eq(serviceOrders.id, serviceOrderId),
        with: {
          client: true,
          technician: true
        }
      })

      return order
    } catch (error) {
      console.error('Erro ao buscar OS para recibo:', error)
      throw error
    }
  }

  /**
   * Busca histórico de entregas do cliente
   */
  static async getDeliveryHistory(clientId: string) {
    try {
      const db = getDb();
      const history = await db.query.serviceOrders.findMany({
        where: and(
            eq(serviceOrders.clientId, clientId),
            // Status finalizados
            // or(eq(serviceOrders.status, 'ENTREGUE'), eq(serviceOrders.status, 'CONCLUIDO'))
        ),
        orderBy: [desc(serviceOrders.createdAt)],
        limit: 5
      })

      return history
    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
      return []
    }
  }

  /**
   * Reenvia o recibo por WhatsApp ou Email
   */
  static async resendReceipt(serviceOrderId: string, method: string, dbInstance?: any) {
    try {
      const db = dbInstance || getDb();
      const order = await db.query.serviceOrders.findFirst({
        where: eq(serviceOrders.id, serviceOrderId),
        with: {
          client: true
        }
      })

      if (!order || !order.client?.phone) {
        throw new Error('Cliente sem telefone cadastrado')
      }

      // Gerar link do recibo (exemplo)
      const receiptLink = `${process.env.NEXT_PUBLIC_APP_URL}/receipts/${order.id}`
      
      const payload = buildTemplatePayload("recibo_servico", {
        nome: order.client.name,
        link: receiptLink,
        numero_os: order.orderNumber
      })

      if (!payload) {
        throw new Error('Template não encontrado')
      }

      await sendTemplate({
        to: order.client.phone,
        name: payload.name,
        language: payload.language,
        components: payload.components
      })

      return true
    } catch (error) {
      console.error('Erro ao reenviar recibo:', error)
      throw error
    }
  }

  static async getBudgetForDownload(serviceOrderId: string, dbInstance?: any) {
     throw new Error("Budget generation not implemented");
  }

  static async generateBudgetForOrcamentar(serviceOrderId: string, dbInstance?: any) {
      // Placeholder for now
      return null;
  }
}
