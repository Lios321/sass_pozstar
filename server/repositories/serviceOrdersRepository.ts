import { getDb } from '@/lib/db/drizzle'
import { serviceOrders } from '@/lib/db/schema'
import { eq, and, or, like, desc, asc, count, gte, lte } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export type ServiceOrderFilters = {
    search?: string;
    status?: string;
    clientId?: string;
    technicianId?: string;
}

/**
 * Repositório de acesso a dados de Ordens de Serviço
 */
export const serviceOrdersRepository = {
  /**
   * Lista ordens de serviço com paginação, filtros e ordenação
   */
  async list(filters: ServiceOrderFilters, skip: number, take: number, sortField: string, sortDirection: 'asc' | 'desc') {
    const db = getDb();
    const conditions = [];

    if (filters.search) {
      const searchLike = `%${filters.search}%`;
      conditions.push(or(
        like(serviceOrders.orderNumber, searchLike),
        like(serviceOrders.equipmentType, searchLike),
        like(serviceOrders.brand, searchLike),
        like(serviceOrders.model, searchLike),
        like(serviceOrders.serialNumber, searchLike)
      ));
    }
    if (filters.status) conditions.push(eq(serviceOrders.status, filters.status));
    if (filters.clientId) conditions.push(eq(serviceOrders.clientId, filters.clientId));
    if (filters.technicianId) conditions.push(eq(serviceOrders.technicianId, filters.technicianId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Sort
    let orderBy: any = desc(serviceOrders.orderNumber);
    const dir = sortDirection === 'asc' ? asc : desc;
    
    if (sortField === 'openingDate') orderBy = dir(serviceOrders.openingDate);
    else if (sortField === 'status') orderBy = dir(serviceOrders.status);
    else if (sortField === 'equipmentType') orderBy = dir(serviceOrders.equipmentType);
    else if (sortField === 'brand') orderBy = dir(serviceOrders.brand);
    else orderBy = dir(serviceOrders.orderNumber);

    const items = await db.query.serviceOrders.findMany({
      where,
      limit: take,
      offset: skip,
      with: {
        client: {
             columns: { id: true, name: true, email: true, phone: true }
        },
        technician: {
             columns: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: orderBy
    });

    const totalResult = await db.select({ count: count() }).from(serviceOrders).where(where);
    const total = totalResult[0]?.count || 0;

    return { items, total };
  },

  /**
   * Cria uma nova ordem de serviço
   */
  async create(data: any, createdById: string, orderNumber: string) {
    const db = getDb();
    const id = uuidv4();
    
    const newServiceOrder = await db.insert(serviceOrders).values({
        id,
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
        budgetItems: data.budgetItems ? JSON.stringify(data.budgetItems) : null,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        openingDate: data.openingDate ? new Date(data.openingDate) : new Date(),
        completionDate: data.completionDate ? new Date(data.completionDate) : null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        status: 'SEM_VER',
        createdById,
        receiptGenerated: false
    }).returning();
    
    return newServiceOrder[0];
  },

  /**
   * Conta ordens no ano para gerar número sequencial
   */
  async countInYear(openingDate: Date) {
    const db = getDb();
    const year = openingDate.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    
    const result = await db.select({ count: count() })
        .from(serviceOrders)
        .where(and(
            gte(serviceOrders.openingDate, startOfYear),
            lte(serviceOrders.openingDate, endOfYear)
        ));
        
    return result[0]?.count || 0;
  }
}
