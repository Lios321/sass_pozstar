import { getDb } from '@/functions/utils/db';
import { serviceOrders, clients, technicians } from '@/lib/db/schema';
import { eq, and, gte, lte, like, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

const ServiceOrderStatus = {
  SEM_VER: 'SEM_VER',
  ORCAMENTAR: 'ORCAMENTAR',
  APROVADO: 'APROVADO',
  MELHORAR: 'MELHORAR',
  DEVOLVIDO: 'DEVOLVIDO',
  DESCARTE: 'DESCARTE',
  TERMINADO: 'TERMINADO',
  ESPERANDO_PECAS: 'ESPERANDO_PECAS',
  COMPRADO: 'COMPRADO',
  ESPERANDO_CLIENTE: 'ESPERANDO_CLIENTE',
} as const;

const reportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(Object.values(ServiceOrderStatus) as [string, ...string[]]).optional(),
  technicianId: z.string().optional(),
  clientId: z.string().optional(),
  equipmentType: z.string().optional(),
  format: z.enum(['json', 'pdf', 'excel']).default('json'),
});

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);

    const filters = {
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      status: (url.searchParams.get('status') as any) || undefined,
      technicianId: url.searchParams.get('technicianId') || undefined,
      clientId: url.searchParams.get('clientId') || undefined,
      equipmentType: url.searchParams.get('equipmentType') || undefined,
      format: (url.searchParams.get('format') as any) || 'json',
    };

    reportFiltersSchema.parse(filters);

    const db = getDb(context.env);
    const conditions: any[] = [];

    if (filters.startDate) conditions.push(gte(serviceOrders.createdAt, new Date(filters.startDate)));
    if (filters.endDate) conditions.push(lte(serviceOrders.createdAt, new Date(filters.endDate)));
    if (filters.status) conditions.push(eq(serviceOrders.status, filters.status));
    if (filters.technicianId) conditions.push(eq(serviceOrders.technicianId, filters.technicianId));
    if (filters.clientId) conditions.push(eq(serviceOrders.clientId, filters.clientId));
    if (filters.equipmentType) {
      conditions.push(like(serviceOrders.equipmentType, `%${filters.equipmentType}%`));
    }

    const serviceOrdersResult = await db.query.serviceOrders.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        client: {
          columns: { id: true, name: true, email: true, phone: true },
        },
        technician: {
          columns: { id: true, name: true, email: true, specializations: true },
        },
        createdBy: {
          columns: { id: true, name: true, email: true },
        },
      },
      orderBy: [desc(serviceOrders.createdAt)],
    });

    const stats = {
      total: serviceOrdersResult.length,
      byStatus: Object.values(ServiceOrderStatus).reduce((acc: Record<string, number>, status) => {
        acc[status] = serviceOrdersResult.filter((so) => so.status === status).length;
        return acc;
      }, {} as Record<string, number>),
      byEquipmentType: serviceOrdersResult.reduce((acc: Record<string, number>, so) => {
        acc[String(so.equipmentType)] = (acc[String(so.equipmentType)] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageCompletionTime: calculateAverageCompletionTime(serviceOrdersResult as any[]),
      totalRevenue: calculateTotalRevenue(serviceOrdersResult as any[]),
    };

    const techniciansResult = await db.query.technicians.findMany({
      columns: { id: true, name: true, email: true },
      orderBy: [asc(technicians.name)],
    });

    const clientsResult = await db.query.clients.findMany({
      columns: { id: true, name: true, email: true },
      orderBy: [asc(clients.name)],
    });

    const reportData = {
      filters,
      stats,
      serviceOrders: serviceOrdersResult,
      metadata: {
        technicians: techniciansResult,
        clients: clientsResult,
        generatedAt: new Date().toISOString(),
        totalRecords: serviceOrdersResult.length,
      },
    };

    if (filters.format === 'json') return Response.json(reportData);
    return Response.json({ ...reportData, downloadFormat: filters.format });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Parâmetros inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
};

function calculateAverageCompletionTime(serviceOrders: any[]): number | null {
  const completedOrders = serviceOrders.filter((so) => so.openingDate && so.completionDate);
  if (completedOrders.length === 0) return null;

  const totalDays = completedOrders.reduce((acc, so) => {
    if (!so.openingDate || !so.completionDate) return acc;
    const start = new Date(so.openingDate);
    const end = new Date(so.completionDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return acc + diffDays;
  }, 0);

  return Math.round(totalDays / completedOrders.length);
}

function calculateTotalRevenue(serviceOrders: any[]): number {
  return serviceOrders.reduce((acc, so) => {
    if (so.budgetNote && so.completionDate) {
      const match = String(so.budgetNote).match(/R\$\s*([\d.,]+)/);
      if (match) {
        const value = parseFloat(match[1].replace('.', '').replace(',', '.'));
        return acc + value;
      }
    }
    return acc;
  }, 0);
}

