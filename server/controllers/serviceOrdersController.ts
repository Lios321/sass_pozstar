import { NextRequest } from 'next/server'
import { ok } from '../utils/apiResponse'
import { serviceOrdersService } from '../services/serviceOrdersService'
import { requireAuth } from '../middlewares/authMiddleware'
import { ApiError, internalError } from '../utils/errors'
import { logger } from '@/lib/logger'
import { NotificationService } from '@/lib/notifications'
import { ReceiptService } from '@/lib/receipt-service'

/**
 * Controller de Ordens de Serviço
 * Responsável por orquestrar entrada/saída e delegar ao serviço.
 */
export const serviceOrdersController = {
  /**
   * GET /api/service-orders
   * Lista ordens paginadas conforme filtros e ordenação
   */
  async list(request: NextRequest) {
    await requireAuth(request as unknown as Request)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const technicianId = searchParams.get('technicianId')
    const sortField = (searchParams.get('sortField') || 'orderNumber') as string
    const sortDirection = (searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

    const result = await serviceOrdersService.list({
      page, limit, search, status, clientId, technicianId, sortField, sortDirection
    })
    return ok({ serviceOrders: result.items, pagination: result.pagination })
  },

  /**
   * POST /api/service-orders
   * Cria uma OS após validação e regras de negócio
   */
  async create(request: NextRequest) {
    const session = await requireAuth(request as unknown as Request)
    const body = await request.json()
    const serviceOrder = await serviceOrdersService.create(body, session.user.id as string)

    try {
      await NotificationService.createNewServiceOrderNotification(serviceOrder.id)
    } catch (notificationError) {
      logger.warn('Erro ao criar notificação', notificationError as unknown)
    }

    try {
      setImmediate(() => {
        ReceiptService.generateReceiptForDownload(serviceOrder.id).catch((err) => {
          logger.error('Erro na geração do comprovante', err as unknown)
        })
      })
    } catch (receiptError) {
      logger.warn('Falha ao agendar geração do comprovante', receiptError as unknown)
    }

    return ok({ message: 'Ordem de serviço criada com sucesso', serviceOrder }, 201)
  },
}
