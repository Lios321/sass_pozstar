import { validationError, notFound } from '../utils/errors'
import { serviceOrderSchema } from '../validation/serviceOrdersSchemas'
import { serviceOrdersRepository } from '../repositories/serviceOrdersRepository'
import { getDb } from '@/lib/db/drizzle'
import { clients, technicians } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Serviço de regras de negócio para Ordens de Serviço
 */
export const serviceOrdersService = {
  /**
   * Valida filtros, compõe consulta e retorna lista paginada
   */
  async list(params: {
    page: number
    limit: number
    search?: string
    status?: string | null
    clientId?: string | null
    technicianId?: string | null
    sortField: string
    sortDirection: 'asc' | 'desc'
  }) {
    const { page, limit, search, status, clientId, technicianId, sortField, sortDirection } = params
    const skip = (page - 1) * limit
    
    const filters = {
        search: search || undefined,
        status: status || undefined,
        clientId: clientId || undefined,
        technicianId: technicianId || undefined
    }

    const { items, total } = await serviceOrdersRepository.list(filters, skip, limit, sortField, sortDirection)
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
  },

  /**
   * Valida payload, verifica existência de entidades e cria uma OS
   */
  async create(rawBody: unknown, createdById: string) {
    const parsed = serviceOrderSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw validationError('Dados inválidos', parsed.error.issues)
    }
    const data = parsed.data
    const db = getDb();
    
    const client = await db.query.clients.findFirst({ where: eq(clients.id, data.clientId) });
    if (!client) throw notFound('Cliente não encontrado')

    if (data.technicianId) {
      const technician = await db.query.technicians.findFirst({ where: eq(technicians.id, data.technicianId) });
      if (!technician) throw notFound('Técnico não encontrado')
    }

    const openingDate = data.openingDate ? new Date(data.openingDate) : new Date()
    const countThisYear = await serviceOrdersRepository.countInYear(openingDate)
    const orderNumber = `OS-${openingDate.getFullYear()}-${countThisYear + 1}`

    const newServiceOrder = await serviceOrdersRepository.create(data, createdById, orderNumber)
    return newServiceOrder
  },
}
