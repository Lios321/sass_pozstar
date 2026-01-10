import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ServiceOrderStatus } from '@prisma/client'

/**
 * Repositório de acesso a dados de Ordens de Serviço
 */
export const serviceOrdersRepository = {
  /**
   * Lista ordens de serviço com paginação, filtros e ordenação
   * @param where Filtros Prisma
   * @param skip Quantidade de itens a pular
   * @param take Quantidade de itens a retornar
   * @param orderBy Campo de ordenação
   */
  async list(where: Prisma.ServiceOrderWhereInput, skip: number, take: number, orderBy: Prisma.ServiceOrderOrderByWithRelationInput) {
    const [items, total] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
          technician: { select: { id: true, name: true, email: true, phone: true } }
        }
      }),
      prisma.serviceOrder.count({ where })
    ])
    return { items, total }
  },

  /**
   * Cria uma nova ordem de serviço
   * @param data Dados validados para criação
   * @param createdById ID do usuário criador
   * @param orderNumber Número sequencial OS-YYYY-N
   */
  async create(data: any, createdById: string, orderNumber: string) {
    const newServiceOrder = await prisma.serviceOrder.create({
      data: {
        orderNumber,
        clientId: data.clientId,
        technicianId: data.technicianId || null,
        equipmentType: data.equipmentType,
        brand: data.brand || '',
        model: data.model || '',
        serialNumber: data.serialNumber || null,
        reportedDefect: data.reportedDefect,
        receivedAccessories: data.receivedAccessories || null,
        budgetNote: data.budgetNote || null,
        technicalExplanation: data.technicalExplanation || null,
        price: data.price ?? null,
        cost: data.cost ?? null,
        budgetItems: data.budgetItems ?? null,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        openingDate: data.openingDate ? new Date(data.openingDate) : new Date(),
        completionDate: data.completionDate ? new Date(data.completionDate) : null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        status: ServiceOrderStatus.SEM_VER,
        createdById,
      }
    })
    return newServiceOrder
  },

  /**
   * Conta ordens no ano para gerar número sequencial
   * @param openingDate Data de abertura
   */
  async countInYear(openingDate: Date) {
    const year = openingDate.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)
    const countThisYear = await prisma.serviceOrder.count({
      where: {
        openingDate: { gte: startOfYear, lte: endOfYear }
      }
    })
    return countThisYear
  },
}
