import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validationError, notFound } from '../utils/errors'
import { serviceOrderSchema } from '../validation/serviceOrdersSchemas'
import { serviceOrdersRepository } from '../repositories/serviceOrdersRepository'

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
    const where: Prisma.ServiceOrderWhereInput = {}

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { equipmentType: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { serialNumber: { contains: search } },
        { client: { is: { name: { contains: search } } } },
        { technician: { is: { name: { contains: search } } } }
      ]
    }
    if (status) {
      where.status = status as any
    }
    if (clientId) {
      where.clientId = clientId
    }
    if (technicianId) {
      where.technicianId = technicianId
    }

    let orderBy: Prisma.ServiceOrderOrderByWithRelationInput = { orderNumber: sortDirection }
    switch (sortField) {
      case 'openingDate': orderBy = { openingDate: sortDirection }; break
      case 'clientName': orderBy = { client: { name: sortDirection } }; break
      case 'equipmentType': orderBy = { equipmentType: sortDirection }; break
      case 'brand': orderBy = { brand: sortDirection }; break
      case 'status': orderBy = { status: sortDirection }; break
      default: orderBy = { orderNumber: sortDirection }; break
    }

    const { items, total } = await serviceOrdersRepository.list(where, skip, limit, orderBy)
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
    const client = await prisma.client.findUnique({ where: { id: data.clientId } })
    if (!client) throw notFound('Cliente não encontrado')

    if (data.technicianId) {
      const technician = await prisma.technician.findUnique({ where: { id: data.technicianId } })
      if (!technician) throw notFound('Técnico não encontrado')
    }

    const openingDate = data.openingDate ? new Date(data.openingDate) : new Date()
    const countThisYear = await serviceOrdersRepository.countInYear(openingDate)
    const orderNumber = `OS-${openingDate.getFullYear()}-${countThisYear + 1}`

    const newServiceOrder = await serviceOrdersRepository.create(data, createdById, orderNumber)
    return newServiceOrder
  },
}
